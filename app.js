// =====================
// Paths (GitHub Pages OK)
// =====================
const ADMISSION_URL = "./data/admission_full.json";
const CONVERT_URL   = "./data/convert_full.json";

// Years (시트: 2025, 2024, 2023)
const YEARS = [2023, 2024, 2025];
const YEAR_COLOR = {2023:"#dc2626", 2024:"#1d4ed8", 2025:"#16a34a"};

// DOM
const $college = document.getElementById("collegeSelect");
const $rails = document.getElementById("rails");
const $tooltip = document.getElementById("tooltip");

const $gradeSlider = document.getElementById("gradeSlider");
const $gradeInput = document.getElementById("gradeInput");

const $busanVal = document.getElementById("busanVal");
const $daejinVal = document.getElementById("daejinVal");
const $mixVal = document.getElementById("mixVal");

const $heroTitle = document.getElementById("heroTitle");
const $heroDesc = document.getElementById("heroDesc");

// Data holders
let ADMISSION = null;   // 원본 row 배열
let CONVERT = null;     // 변환표 row 배열 or object
let COLLEGE_MAP = null; // {대학명: rows[]}

// =====================
// Utilities
// =====================
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmt(n){
  if(!Number.isFinite(n)) return "-";
  const s = (Math.round(n*100)/100).toFixed(2);
  return s.replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
}
function mean(arr){
  const a = arr.filter(v=>Number.isFinite(v));
  if(!a.length) return NaN;
  return a.reduce((p,c)=>p+c,0)/a.length;
}
function median(arr){
  const a = arr.filter(v=>Number.isFinite(v)).slice().sort((x,y)=>x-y);
  if(!a.length) return NaN;
  const m = Math.floor(a.length/2);
  return a.length%2 ? a[m] : (a[m-1]+a[m])/2;
}
function quantile(arr, q){
  const a = arr.filter(v=>Number.isFinite(v)).slice().sort((x,y)=>x-y);
  if(!a.length) return NaN;
  const pos = (a.length-1)*q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if(a[base+1] === undefined) return a[base];
  return a[base] + rest*(a[base+1]-a[base]);
}

// =====================
// Convert table: robust interpolation
// convert_full.json 이 어떤 형태든 처리
// - (1) 배열 rows: [{five:"3", busan:"5.03", daejin:"4.94", mix:"4.99"}...]
// - (2) 객체 mapping: { "3.00": {busan:..., daejin:..., mix:...}, ... }
// =====================
function buildConvertGetter(convertRaw){
  // case: mapping object
  if(convertRaw && !Array.isArray(convertRaw) && typeof convertRaw === "object"){
    // try to detect { "3": {...} }
    return (five)=>{
      const key1 = five.toFixed(2);
      const key2 = String(Number(five.toFixed(2))); // "3"
      const v = convertRaw[key1] || convertRaw[key2] || null;
      if(!v) return {busan:NaN, daejin:NaN, mix:NaN};
      return {
        busan: Number(v.busan ?? v["부산 9등급"] ?? v.busan9 ?? NaN),
        daejin: Number(v.daejin ?? v["대진대 9등급(평균)"] ?? v.daejin9 ?? NaN),
        mix: Number(v.mix ?? v["50:50 통합"] ?? v.mix5050 ?? NaN),
      };
    };
  }

  // case: array
  const rows = Array.isArray(convertRaw) ? convertRaw : [];
  // normalize
  const norm = rows.map(r=>{
    const five = Number(r.five ?? r["5등급 평균"] ?? r["5등급평균"] ?? r[0]);
    const busan = Number(r.busan ?? r["부산 9등급"] ?? r[1]);
    const daejin = Number(r.daejin ?? r["대진대 9등급(평균)"] ?? r[2]);
    const mix = Number(r.mix ?? r["50:50 통합"] ?? r[3]);
    return {five, busan, daejin, mix};
  }).filter(r=>Number.isFinite(r.five)).sort((a,b)=>a.five-b.five);

  return (five)=>{
    if(!norm.length) return {busan:NaN, daejin:NaN, mix:NaN};

    // clamp
    if(five <= norm[0].five) return {busan:norm[0].busan, daejin:norm[0].daejin, mix:norm[0].mix};
    if(five >= norm[norm.length-1].five) {
      const last = norm[norm.length-1];
      return {busan:last.busan, daejin:last.daejin, mix:last.mix};
    }

    // interpolate between neighbors
    for(let i=0;i<norm.length-1;i++){
      const a = norm[i], b = norm[i+1];
      if(five >= a.five && five <= b.five){
        const t = (five - a.five) / (b.five - a.five);
        const lerp = (x,y)=> x + t*(y-x);
        return {
          busan: lerp(a.busan, b.busan),
          daejin: lerp(a.daejin, b.daejin),
          mix: lerp(a.mix, b.mix),
        };
      }
    }
    return {busan:NaN, daejin:NaN, mix:NaN};
  };
}

let getConverted = null;

// =====================
// Load JSON safely (404 HTML 방지)
// =====================
async function loadJson(url){
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok){
    throw new Error(`FETCH_FAIL ${url} ${r.status}`);
  }
  const txt = await r.text();
  // if HTML came back, it contains "<!doctype"
  if(txt.trim().startsWith("<")){
    throw new Error(`NOT_JSON ${url} (HTML returned)`);
  }
  return JSON.parse(txt);
}

// =====================
// Admission normalization
// admission_full.json: row 배열이라고 가정
// 컬럼: 대학명 중심전형 전형명 모집단위 모집인원 경쟁률 충원순위 50%cut 70%cut + year
// =====================
function normalizeAdmission(rows){
  // year 키가 없는 경우: 파일 만들 때 year 넣었다고 했으니 우선 year 기대
  return rows.map(r=>{
    const year = Number(r.year ?? r["연도"] ?? r["년도"]);
    return {
      year,
      college: r["대학명"] ?? r.college ?? r.univ ?? "",
      center: r["중심전형"] ?? r.center ?? "",
      type: r["전형명"] ?? r.type ?? "",
      unit: r["모집단위"] ?? r.unit ?? "",
      quota: num(r["모집인원"] ?? r.quota),
      comp: num(r["경쟁률"] ?? r.comp),
      fill: num(r["충원순위"] ?? r.fill),
      cut50: num(r["50%cut"] ?? r.cut50),
      cut70: num(r["70%cut"] ?? r.cut70),
    };
  }).filter(r=>r.college && Number.isFinite(r.year));
}

// metric selector: 70 -> 50 -> (없으면) mean of cut50/cut70? (입결 기반이면 cut50가 등록자 평균 대신 대체가 어려움)
// 여기서는 요청대로: 70 없으면 50, 둘 다 없으면 제외
function pickMetricValue(row){
  if(Number.isFinite(row.cut70)) return row.cut70;
  if(Number.isFinite(row.cut50)) return row.cut50;
  return null;
}

// =====================
// Build college->tracks structure
// tracks = 중심전형 단위로 rail 생성(이미지와 동일)
// 각 track 안 points: {year, value, unit, type, center}
// =====================
function buildCollegeMap(rows){
  const map = {};
  for(const r of rows){
    if(!map[r.college]) map[r.college] = [];
    map[r.college].push(r);
  }
  return map;
}

function buildTracks(rowsForCollege){
  const byCenter = new Map();
  for(const r of rowsForCollege){
    const key = r.center || "(미분류)";
    if(!byCenter.has(key)) byCenter.set(key, []);
    byCenter.get(key).push(r);
  }

  const tracks = [];
  for(const [center, rows] of byCenter.entries()){
    const points = [];
    for(const r of rows){
      const v = pickMetricValue(r);
      if(v==null) continue;
      points.push({
        year: r.year,
        value: v,
        unit: r.unit,
        type: r.type,
        center: r.center
      });
    }
    // 표시 기준은 70%컷 우선이라고 명시
    tracks.push({ name:center, metric:"70%컷(없으면 50%컷)", points });
  }

  // 안정적 정렬
  tracks.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  return tracks;
}

// =====================
// Rail render (이미지와 같은 레일: 3개년을 세 줄로)
// + 사용자 등급 세로 빨간선 (50:50 통합이 기본 기준)
// + 상/중/하 3개 라벨 고정 + hover tooltip
// =====================
function hashHue(str){
  let h=0;
  for(let i=0;i<str.length;i++) h = (h*31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function makeSvg(tag){
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function mkLine(x1,y1,x2,y2,cls){
  const el = makeSvg("line");
  el.setAttribute("x1",x1); el.setAttribute("y1",y1);
  el.setAttribute("x2",x2); el.setAttribute("y2",y2);
  if(cls) el.setAttribute("class", cls);
  return el;
}
function mkCircle(cx,cy,r,fill){
  const el = makeSvg("circle");
  el.setAttribute("cx",cx); el.setAttribute("cy",cy);
  el.setAttribute("r",r);
  el.setAttribute("fill",fill);
  el.setAttribute("opacity","0.95");
  el.setAttribute("class","dot");
  return el;
}
function mkText(txt,x,y,cls){
  const el = makeSvg("text");
  el.textContent = txt;
  el.setAttribute("x",x); el.setAttribute("y",y);
  if(cls) el.setAttribute("class", cls);
  return el;
}
function statBox(k,v){
  const d = document.createElement("div");
  d.className="stat";
  d.innerHTML = `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div>`;
  return d;
}
function keyOf(p){
  return `${p.unit}__${p.year}__${p.value}`;
}

function showTip(ev, html){
  $tooltip.style.display="block";
  $tooltip.style.left = (ev.clientX + 12) + "px";
  $tooltip.style.top  = (ev.clientY - 12) + "px";
  $tooltip.innerHTML = html;
}
function hideTip(){
  $tooltip.style.display="none";
}

function renderRails(college, tracks, userXValue){
  $rails.innerHTML = "";

  $heroTitle.textContent = `${college} 전형별 모집단위 산포도 레일 (3개년 비교)`;
  $heroDesc.textContent =
    `전형별 기준 성적 자동 선택: 70%컷 → (없으면) 50%컷. ` +
    `라벨은 상·중·하 각 3개만 고정 표시(나머지는 점에 마우스 올리면 표시).`;

  for(const tr of tracks){
    const accentHue = hashHue(tr.name);
    const accent = `hsl(${accentHue} 90% 70%)`;

    const card = document.createElement("section");
    card.className="railCard";
    card.style.setProperty("--accent", accent);

    const accentBar = document.createElement("div");
    accentBar.className="railAccent";

    const header = document.createElement("div");
    header.className="railHeader";

    const title = document.createElement("div");
    title.className="railTitle";
    title.textContent = tr.name;

    const meta = document.createElement("div");
    meta.className="railMeta";
    meta.textContent = `표시 기준: ${tr.metric} (2023·2024·2025)`;

    header.appendChild(title);
    header.appendChild(meta);

    const viewport = document.createElement("div");
    viewport.className="railViewport";

    // SVG sizing
    const svg = makeSvg("svg");
    const W = 1600;
    const left = 120, right = 60;
    const innerW = W - left - right;
    const laneY = {2023:70, 2024:150, 2025:230};
    const H = 280;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", String(H));

    const pts = tr.points || [];
    const validPts = pts.filter(p=>YEARS.includes(p.year) && Number.isFinite(p.value));
    const allValues = validPts.map(p=>p.value);

    if(!allValues.length){
      card.appendChild(accentBar);
      card.appendChild(header);
      const empty = document.createElement("div");
      empty.className="railMeta";
      empty.style.padding = "8px 6px 0";
      empty.textContent = "데이터가 없습니다.";
      card.appendChild(empty);
      $rails.appendChild(card);
      continue;
    }

    let vmin = Math.min(...allValues);
    let vmax = Math.max(...allValues);
    if(vmin===vmax){ vmin -= 0.5; vmax += 0.5; }
    const pad = (vmax-vmin)*0.08;
    vmin -= pad; vmax += pad;

    const xScale = (v)=> left + ( (v - vmin) / (vmax - vmin) ) * innerW;

    // ticks
    const TICKS = 8;
    for(let i=0;i<=TICKS;i++){
      const x = left + innerW*(i/TICKS);
      svg.appendChild(mkLine(x, 34, x, H-26, "axisLine"));
      const tv = vmin + (vmax-vmin)*(i/TICKS);
      const t = mkText(fmt(tv), x, 26, "tickText");
      t.setAttribute("text-anchor","middle");
      svg.appendChild(t);
    }

    // lanes + labels
    for(const y of YEARS){
      const y0 = laneY[y];
      svg.appendChild(mkLine(left, y0, W-right, y0, "laneLine"));
      const yt = mkText(String(y), 22, y0+6, "yearText");
      yt.setAttribute("fill", YEAR_COLOR[y]);
      svg.appendChild(yt);
    }

    // user line (세로 빨간선): 기본은 50:50 통합 기준 값
    if(Number.isFinite(userXValue)){
      const ux = xScale(userXValue);
      const ul = mkLine(ux, 40, ux, H-20, null);
      ul.setAttribute("stroke", "#ef4444");
      ul.setAttribute("stroke-width", "4");
      ul.setAttribute("stroke-dasharray", "10,8");
      svg.appendChild(ul);
    }

    // group by year
    const byYear = {};
    for(const y of YEARS) byYear[y] = validPts.filter(p=>p.year===y).slice().sort((a,b)=>a.value-b.value);

    // label target: top3 + mid3 + bottom3
    const labelKey = new Set();
    for(const y of YEARS){
      const list = byYear[y];
      const n = list.length;
      if(!n) continue;
      const top = list.slice(0, Math.min(3,n));
      const bottom = list.slice(Math.max(0,n-3), n);
      const midStart = Math.max(0, Math.floor(n/2)-1);
      const mid = list.slice(midStart, Math.min(n, midStart+3));
      for(const p of [...top, ...mid, ...bottom]) labelKey.add(keyOf(p));
    }

    // dots + store label candidates
    const labels = {2023:[], 2024:[], 2025:[]};

    for(const y of YEARS){
      for(const p of byYear[y]){
        const x = xScale(p.value);
        const y0 = laneY[y];

        const dot = mkCircle(x, y0, 9, YEAR_COLOR[y]);

        dot.addEventListener("mousemove", (ev)=>{
          showTip(ev, `<div>${escapeHtml(p.unit)}</div>
            <div style="opacity:.85;margin-top:4px">전형명: <b>${escapeHtml(p.type||"-")}</b></div>
            <div style="opacity:.85">값: <b>${fmt(p.value)}</b> (${y})</div>`);
        });
        dot.addEventListener("mouseleave", hideTip);

        svg.appendChild(dot);

        if(labelKey.has(keyOf(p))){
          labels[y].push({x, y:y0, unit:p.unit, value:p.value, type:p.type});
        }
      }
    }

    // label collision simple stagger (겹침 완화)
    for(const y of YEARS){
      const items = labels[y].slice().sort((a,b)=>a.x-b.x);
      let lastX = -1e9;
      let flip = 1;
      for(const it of items){
        let dy = -18;
        if(it.x - lastX < 140){
          dy = (-18) + flip*18;
          flip *= -1;
        }
        lastX = it.x;

        const text = mkText(`${it.unit} ${fmt(it.value)}`, it.x, it.y + dy, "label");
        text.setAttribute("text-anchor","middle");
        svg.appendChild(text);
      }
    }

    viewport.appendChild(svg);

    // stats
    const best = Math.min(...allValues);
    const worst = Math.max(...allValues);
    const avg = mean(allValues);
    const n = allValues.length;

    const stats = document.createElement("div");
    stats.className="statsRow";
    stats.appendChild(statBox("최고(가장 우수)", fmt(best)));
    stats.appendChild(statBox("중앙값", fmt(median(allValues))));
    stats.appendChild(statBox("최저(가장 불리)", fmt(worst)));
    stats.appendChild(statBox("표본수(연도합)", String(n)));

    card.appendChild(accentBar);
    card.appendChild(header);
    card.appendChild(viewport);
    card.appendChild(stats);

    $rails.appendChild(card);
  }
}

// =====================
// Table render
// =====================
function renderTable(rows){
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  // 기본: 연도 내림차순, 중심전형, 전형명, 모집단위
  const sorted = rows.slice().sort((a,b)=>{
    if(b.year !== a.year) return b.year - a.year;
    const c1 = (a.center||"").localeCompare(b.center||"",'ko');
    if(c1!==0) return c1;
    const c2 = (a.type||"").localeCompare(b.type||"",'ko');
    if(c2!==0) return c2;
    return (a.unit||"").localeCompare(b.unit||"",'ko');
  });

  for(const r of sorted){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.year)}</td>
      <td>${escapeHtml(r.center||"-")}</td>
      <td>${escapeHtml(r.type||"-")}</td>
      <td>${escapeHtml(r.unit||"-")}</td>
      <td>${r.quota ?? "-"}</td>
      <td>${r.comp ?? "-"}</td>
      <td>${r.fill ?? "-"}</td>
      <td>${r.cut50 ?? "-"}</td>
      <td>${r.cut70 ?? "-"}</td>
    `;
    tbody.appendChild(tr);
  }
}

// =====================
// Main flow
// =====================
function setGradeUI(v){
  const vv = Number(v);
  if(!Number.isFinite(vv)) return;
  const clamped = Math.min(5, Math.max(1, vv));
  const s = clamped.toFixed(2);
  $gradeInput.value = s;
  $gradeSlider.value = s;
}

function applyConvertedCards(){
  if(!getConverted) return;
  const five = Number($gradeInput.value);
  const {busan, daejin, mix} = getConverted(five);

  $busanVal.textContent = fmt(busan);
  $daejinVal.textContent = fmt(daejin);
  $mixVal.textContent = fmt(mix);

  return mix; // user line 기준값
}

function refresh(){
  if(!$college.value || !COLLEGE_MAP) return;

  const college = $college.value;
  const rows = COLLEGE_MAP[college] || [];
  const tracks = buildTracks(rows);

  const userMix = applyConvertedCards(); // 50:50 통합을 사용자선으로 사용
  renderRails(college, tracks, userMix);
  renderTable(rows);
}

async function boot(){
  try{
    const [rawAdmission, rawConvert] = await Promise.all([
      loadJson(ADMISSION_URL),
      loadJson(CONVERT_URL)
    ]);

    ADMISSION = normalizeAdmission(rawAdmission);
    CONVERT = rawConvert;
    getConverted = buildConvertGetter(CONVERT);

    COLLEGE_MAP = buildCollegeMap(ADMISSION);

    // fill colleges
    const colleges = Object.keys(COLLEGE_MAP).sort((a,b)=>a.localeCompare(b,'ko'));
    $college.innerHTML = colleges.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    $college.value = colleges[0] || "";

    // events
    $college.addEventListener("change", refresh);

    $gradeSlider.addEventListener("input", ()=>{
      setGradeUI($gradeSlider.value);
      refresh();
    });
    $gradeInput.addEventListener("input", ()=>{
      setGradeUI($gradeInput.value);
      refresh();
    });

    // init
    setGradeUI(3.00);
    refresh();
  }catch(e){
    console.error(e);
    $rails.innerHTML = `
      <div class="railCard" style="padding:18px">
        <div style="font-weight:950;font-size:16px">데이터 로딩 실패</div>
        <div style="margin-top:8px;color:#ef4444;font-weight:900">
          ${escapeHtml(String(e.message||e))}
        </div>
        <div style="margin-top:10px;color:#64748b;font-weight:900;line-height:1.5">
          ✅ 확인: <b>${escapeHtml(ADMISSION_URL)}</b> 와 <b>${escapeHtml(CONVERT_URL)}</b> 경로에 파일이 실제로 존재해야 합니다.<br/>
          ✅ GitHub Pages에서는 대소문자/폴더명이 1글자라도 다르면 404가 납니다.
        </div>
      </div>
    `;
  }
}

boot();
