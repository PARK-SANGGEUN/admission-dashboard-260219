/* ===== 색상/연도 ===== */
const YEAR_COLOR = { 2023: "#dc2626", 2024: "#1d4ed8", 2025: "#16a34a" };
const YEARS = [2023, 2024, 2025];
const DEFAULT_MODE = "mix"; // mix | busan | daejin

/* ===== DOM ===== */
const TOOLTIP = document.getElementById("tooltip");
const fatalBox = document.getElementById("fatal");

const collegeSelect = document.getElementById("collegeSelect");
const typeSelect = document.getElementById("typeSelect");
const addTypeBtn = document.getElementById("addTypeBtn");
const clearTypeBtn = document.getElementById("clearTypeBtn");
const chipsEl = document.getElementById("chips");

const g5Slider = document.getElementById("g5Slider");
const g5Input = document.getElementById("g5Input");

const busanValEl = document.getElementById("busanVal");
const daejinValEl = document.getElementById("daejinVal");
const mixValEl = document.getElementById("mixVal");

const heroTitle = document.getElementById("heroTitle");
const heroDesc = document.getElementById("heroDesc");
const railsEl = document.getElementById("rails");

const tableBody = document.querySelector("#dataTable tbody");

const modeBtns = Array.from(document.querySelectorAll(".modeBtn"));

/* ===== 상태 ===== */
let ADMISSION = [];
let CONVERT = [];
let mode = DEFAULT_MODE;
let selectedTypes = []; // mainType 최대 3개
let currentCollege = "";
let currentG5 = 3.0;

/* ===== 유틸 ===== */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function isFiniteNum(x){ return Number.isFinite(x); }
function toNum(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}
function fmt(n){
  if(!Number.isFinite(n)) return "-";
  const s = (Math.round(n*100)/100).toFixed(2);
  return s.replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function mean(arr){
  const a = arr.filter(Number.isFinite);
  if(!a.length) return NaN;
  return a.reduce((p,c)=>p+c,0)/a.length;
}
function median(arr){
  const a = arr.filter(Number.isFinite).slice().sort((x,y)=>x-y);
  if(!a.length) return NaN;
  const m = Math.floor(a.length/2);
  return a.length%2 ? a[m] : (a[m-1]+a[m])/2;
}
function hashHue(str){
  let h=0;
  for(let i=0;i<str.length;i++) h = (h*31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

/* 표시값: 70%컷 우선, 없으면 50%컷 */
function pickValue(row){
  const v70 = toNum(row.cut70);
  if(Number.isFinite(v70) && v70>0) return v70;
  const v50 = toNum(row.cut50);
  if(Number.isFinite(v50) && v50>0) return v50;
  return NaN;
}

/* ===== convert: 5등급(연속) -> 부산/대진/통합(선형보간) ===== */
function convertFromG5(g5){
  if(!Array.isArray(CONVERT) || !CONVERT.length) return {busan:NaN, daejin:NaN, mix:NaN};
  const x = clamp(g5, 1, 5);
  const rows = CONVERT.slice().sort((a,b)=>a.g5-b.g5);

  // 정확히 일치
  const exact = rows.find(r => Number(r.g5) === Number(Math.round(x*100)/100));
  if(exact){
    return { busan: toNum(exact.busan), daejin: toNum(exact.daejin), mix: toNum(exact.mix) };
  }

  // 구간 찾기
  let lo = rows[0], hi = rows[rows.length-1];
  for(let i=0;i<rows.length-1;i++){
    const a = rows[i], b = rows[i+1];
    if(x>=a.g5 && x<=b.g5){ lo=a; hi=b; break; }
  }
  const t = (hi.g5===lo.g5) ? 0 : (x - lo.g5) / (hi.g5 - lo.g5);

  const lerp = (p,q)=> p + (q-p)*t;

  const busan = lerp(toNum(lo.busan), toNum(hi.busan));
  const daejin = lerp(toNum(lo.daejin), toNum(hi.daejin));
  const mix = lerp(toNum(lo.mix), toNum(hi.mix));

  return { busan, daejin, mix };
}

/* ===== 로딩 ===== */
async function loadJSON(url){
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok){
    throw new Error(`GET ${url} 실패 (${r.status})\n- GitHub Pages에서 파일 경로/대소문자 확인\n- data 폴더에 실제 존재하는지 확인`);
  }
  const text = await r.text();

  // JSON인데 HTML이 온 경우(대부분 404 페이지)
  if(text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")){
    throw new Error(`GET ${url} 응답이 JSON이 아니라 HTML입니다.\n(대부분 404 페이지가 내려온 경우)\n경로를 다시 확인하세요: ${url}`);
  }
  return JSON.parse(text);
}

function showFatal(msg){
  fatalBox.hidden = false;
  fatalBox.textContent = msg;
}
function hideFatal(){
  fatalBox.hidden = true;
  fatalBox.textContent = "";
}

/* ===== 초기화 ===== */
(async function init(){
  try{
    hideFatal();

    // ⭐ 여기 경로가 핵심입니다.
    // repo 루트 기준: /data/admission.json, /data/convert.json
    // 🔥 3개년 분리 로딩 방식
const admissionPromises = [
  loadJSON("data/admission_2025.json"),
  loadJSON("data/admission_2024.json"),
  loadJSON("data/admission_2023.json")
];

const admissionData = await Promise.all(admissionPromises);
ADMISSION = admissionData.flat();

// convert는 그대로
CONVERT = await loadJSON("data/convert.json");

    if(!Array.isArray(ADMISSION)) throw new Error("admission.json 형식이 배열(list of rows)이어야 합니다.");
    if(!Array.isArray(CONVERT)) throw new Error("convert.json 형식이 배열(list of rows)이어야 합니다.");

    // 대학 목록
    const colleges = Array.from(new Set(ADMISSION.map(r => r.univ).filter(Boolean)))
      .sort((a,b)=>String(a).localeCompare(String(b),"ko"));
    collegeSelect.innerHTML = colleges.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    currentCollege = colleges[0] || "";
    collegeSelect.value = currentCollege;

    // 전형(중심전형: mainType) 목록은 대학 선택에 따라 갱신
    collegeSelect.addEventListener("change", ()=>{
      currentCollege = collegeSelect.value;
      selectedTypes = []; // 대학 바꾸면 비교 초기화(원하면 유지 가능하지만 데이터 꼬임 방지)
      renderAll();
    });

    // 5등급 입력
    function setG5(v){
      const x = clamp(toNum(v), 1, 5);
      currentG5 = Number.isFinite(x) ? x : 3.0;
      g5Slider.value = String(currentG5);
      g5Input.value = String(Math.round(currentG5*100)/100);
      updateConversionCards();
      renderRails(); // 빨간선/통계 갱신
    }
    g5Slider.addEventListener("input", ()=>setG5(g5Slider.value));
    g5Input.addEventListener("input", ()=>setG5(g5Input.value));
    setG5(3.0);

    // 모드 버튼
    modeBtns.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        mode = btn.dataset.mode;
        modeBtns.forEach(b=>b.classList.toggle("active", b===btn));
        renderAll();
      });
    });

    // 전형 비교
    addTypeBtn.addEventListener("click", ()=>{
      const t = typeSelect.value;
      if(!t) return;
      if(selectedTypes.includes(t)) return;
      if(selectedTypes.length >= 3) return;
      selectedTypes.push(t);
      renderAll();
    });
    clearTypeBtn.addEventListener("click", ()=>{
      selectedTypes = [];
      renderAll();
    });

    renderAll();

  }catch(err){
    showFatal(String(err && err.message ? err.message : err));
    console.error(err);
  }
})();

/* ===== 변환 카드 ===== */
function updateConversionCards(){
  const c = convertFromG5(currentG5);
  busanValEl.textContent = fmt(c.busan);
  daejinValEl.textContent = fmt(c.daejin);
  mixValEl.textContent = fmt(c.mix);
}

/* ===== 렌더 전체 ===== */
function renderAll(){
  updateConversionCards();
  renderHero();
  renderTypeOptions();
  renderChips();
  renderRails();
  renderTable();
}

/* ===== Hero ===== */
function renderHero(){
  const col = currentCollege || "-";
  heroTitle.textContent = `${col} 전형별 모집단위 산포도 레일 (3개년 비교)`;
  heroDesc.textContent =
    `전형별 기준 성적 자동 선택: 70%컷 → (없으면) 50%컷. ` +
    `라벨은 상·중·하 각 3개만 고정 표시(겹침 최소화), 나머지는 점에 마우스 올리면 확인. ` +
    `사용자 등급(선택 모드: ${mode==="mix"?"50:50 통합":mode==="busan"?"부산 9등급":"대진대 9등급"})은 레일 위 붉은 점선으로 표시됩니다.`;
}

/* ===== 전형 옵션 ===== */
function renderTypeOptions(){
  const rows = ADMISSION.filter(r => r.univ === currentCollege);
  const types = Array.from(new Set(rows.map(r => r.mainType).filter(Boolean)))
    .sort((a,b)=>String(a).localeCompare(String(b),"ko"));
  typeSelect.innerHTML = `<option value="">전형 선택</option>` + types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
}

/* ===== Chips ===== */
function renderChips(){
  chipsEl.innerHTML = "";
  selectedTypes.forEach(t=>{
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${escapeHtml(t)}</span>`;
    const x = document.createElement("button");
    x.className = "x";
    x.type = "button";
    x.textContent = "×";
    x.addEventListener("click", ()=>{
      selectedTypes = selectedTypes.filter(s=>s!==t);
      renderAll();
    });
    chip.appendChild(x);
    chipsEl.appendChild(chip);
  });
}

/* ===== Rails ===== */
function renderRails(){
  railsEl.innerHTML = "";

  const rowsAll = ADMISSION.filter(r => r.univ === currentCollege);
  const rows = (selectedTypes.length ? rowsAll.filter(r => selectedTypes.includes(r.mainType)) : rowsAll);

  // mainType(중심전형)으로 그룹
  const groups = new Map();
  rows.forEach(r=>{
    const k = r.mainType || "기타";
    if(!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  });

  const groupNames = Array.from(groups.keys()).sort((a,b)=>String(a).localeCompare(String(b),"ko"));

  // 사용자 표시값(모드에 따라)
  const conv = convertFromG5(currentG5);
  const userValue = (mode==="busan") ? conv.busan : (mode==="daejin") ? conv.daejin : conv.mix;

  groupNames.forEach(name=>{
    const gRows = groups.get(name);

    // points: {year, unit, value, typeName, mainType}
    const pts = gRows.map(r=>{
      const v = pickValue(r);
      return {
        year: toNum(r.year),
        unit: r.major || "-",
        value: v,
        cut50: toNum(r.cut50),
        cut70: toNum(r.cut70),
        typeName: r.type || "-",
        mainType: r.mainType || "-",
      };
    }).filter(p => YEARS.includes(p.year) && Number.isFinite(p.value) && p.value>0);

    if(!pts.length) return;

    const accentHue = hashHue(name);
    const accent = `hsl(${accentHue} 90% 70%)`;

    const card = document.createElement("section");
    card.className = "railCard";
    card.style.setProperty("--accent", accent);

    const accentBar = document.createElement("div");
    accentBar.className="railAccent";

    const header = document.createElement("div");
    header.className="railHeader";

    const title = document.createElement("div");
    title.className="railTitle";
    title.textContent = name;

    const meta = document.createElement("div");
    meta.className="railMeta";
    meta.textContent = `표시 기준: 70%컷(없으면 50%컷) · 2023·2024·2025`;

    header.appendChild(title);
    header.appendChild(meta);

    const viewport = document.createElement("div");
    viewport.className="railViewport";

    // SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    const W = 1600;
    const left = 140, right = 70;
    const innerW = W - left - right;
    const laneY = {2023:70, 2024:150, 2025:230};
    const H = 280;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", String(H));

    const allValues = pts.map(p=>p.value).filter(Number.isFinite);
    let vmin = Math.min(...allValues);
    let vmax = Math.max(...allValues);
    if(vmin===vmax){ vmin -= 0.5; vmax += 0.5; }
    const pad = (vmax-vmin)*0.08;
    vmin -= pad; vmax += pad;

    const xScale = (v)=> left + ((v - vmin) / (vmax - vmin)) * innerW;

    // axis ticks
    const TICKS = 9;
    for(let i=0;i<TICKS;i++){
      const t = i/(TICKS-1);
      const x = left + innerW*t;
      svg.appendChild(mkLine(x, 34, x, H-26, "axisLine"));
      const tv = vmin + (vmax-vmin)*t;
      const tx = mkText(fmt(tv), x, 26, "tickText");
      tx.setAttribute("text-anchor","middle");
      svg.appendChild(tx);
    }

    // lanes + year labels
    YEARS.forEach(y=>{
      const y0 = laneY[y];
      svg.appendChild(mkLine(left, y0, W-right, y0, "laneLine"));
      const yt = mkText(String(y), 30, y0+6, "yearText");
      yt.setAttribute("fill", YEAR_COLOR[y]);
      svg.appendChild(yt);
    });

    // 사용자 등급 붉은선(모드값)
    if(Number.isFinite(userValue)){
      // 범위 밖이면 선이 너무 튀지 않게 클램프
      const ux = clamp(xScale(userValue), left, W-right);
      const uLine = mkLine(ux, 44, ux, H-30, "userLine");
      svg.appendChild(uLine);
    }

    // year별 배열
    const byYear = {};
    YEARS.forEach(y => byYear[y] = pts.filter(p=>p.year===y).slice().sort((a,b)=>a.value-b.value));

    // 상/중/하 3개 라벨 대상
    const labelKey = new Set();
    YEARS.forEach(y=>{
      const list = byYear[y];
      const n = list.length;
      if(!n) return;

      const top = list.slice(0, Math.min(3,n));
      const bottom = list.slice(Math.max(0,n-3), n);

      const midStart = Math.max(0, Math.floor(n/2)-1);
      const mid = list.slice(midStart, Math.min(n, midStart+3));

      [...top, ...mid, ...bottom].forEach(p=> labelKey.add(keyOf(p)));
    });

    // 점 찍기 + 라벨 후보 저장
    const labels = {2023:[], 2024:[], 2025:[]};

    YEARS.forEach(y=>{
      const list = byYear[y];
      list.forEach(p=>{
        const x = xScale(p.value);
        const y0 = laneY[y];

        const dot = mkCircle(x, y0, 9, YEAR_COLOR[y]);
        dot.setAttribute("class","dot");
        dot.style.cursor = "default";

        dot.addEventListener("mousemove", (ev)=>{
          showTip(ev, p, name);
        });
        dot.addEventListener("mouseleave", hideTip);

        svg.appendChild(dot);

        if(labelKey.has(keyOf(p))){
          labels[y].push({
            x, y:y0, unit:p.unit, value:p.value,
            typeName: p.typeName, mainType: p.mainType,
            year: y
          });
        }
      });
    });

    // 라벨 배치(겹침 최소화): x 간격 좁으면 위/아래 교차 + 추가 오프셋
    YEARS.forEach(y=>{
      const items = labels[y].slice().sort((a,b)=>a.x-b.x);
      let lastX = -1e9;
      let flip = 1;
      let bump = 0;

      items.forEach(it=>{
        let dy = -18;
        const minGap = 130;
        if(it.x - lastX < minGap){
          dy = (-18) + flip*18;
          flip *= -1;
          bump += 1;
        }else{
          bump = 0;
        }
        lastX = it.x;

        // bump가 누적되면 더 띄우기
        dy += (bump>2 ? (-10*(bump-2)) : 0);

        const text = mkText(`${it.unit} ${fmt(it.value)}`, it.x, it.y + dy, "label");
        text.setAttribute("text-anchor","middle");
        svg.appendChild(text);
      });
    });

    viewport.appendChild(svg);

    // 통계(해당 전형그룹 전체, 3개년 합)
    const values = allValues;
    const best = Math.min(...values);
    const worst = Math.max(...values);
    const med = median(values);
    const n = values.length;

    const stats = document.createElement("div");
    stats.className="statsRow";
    stats.appendChild(statBox("최고(가장 우수)", fmt(best)));
    stats.appendChild(statBox("중앙값", fmt(med)));
    stats.appendChild(statBox("최저(가장 불리)", fmt(worst)));
    stats.appendChild(statBox("표본수(연도합)", String(n)));

    card.appendChild(accentBar);
    card.appendChild(header);
    card.appendChild(viewport);
    card.appendChild(stats);

    railsEl.appendChild(card);
  });
}

/* ===== Tooltip ===== */
function showTip(ev, p, groupName){
  if(!TOOLTIP) return;
  TOOLTIP.style.display="block";
  TOOLTIP.style.left = (ev.clientX + 12) + "px";
  TOOLTIP.style.top  = (ev.clientY - 12) + "px";

  TOOLTIP.innerHTML = `
    <div><b>${escapeHtml(p.unit || "-")}</b></div>
    <div class="t">${escapeHtml(groupName)} · ${escapeHtml(p.typeName || "-")}</div>
    <div class="t">${p.year} 표시값: <b>${fmt(p.value)}</b> (70%:${fmt(toNum(p.cut70))} / 50%:${fmt(toNum(p.cut50))})</div>
  `;
}
function hideTip(){
  if(!TOOLTIP) return;
  TOOLTIP.style.display="none";
}

/* ===== Table ===== */
function renderTable(){
  tableBody.innerHTML = "";

  const rowsAll = ADMISSION.filter(r => r.univ === currentCollege);
  const rows = (selectedTypes.length ? rowsAll.filter(r => selectedTypes.includes(r.mainType)) : rowsAll);

  // 연도 desc, mainType asc, type asc
  const sorted = rows.slice().sort((a,b)=>{
    const ya = toNum(a.year), yb = toNum(b.year);
    if(ya!==yb) return yb-ya;
    const ma = String(a.mainType||""), mb = String(b.mainType||"");
    const ta = String(a.type||""), tb = String(b.type||"");
    const c1 = ma.localeCompare(mb,"ko"); if(c1) return c1;
    return ta.localeCompare(tb,"ko");
  });

  const frag = document.createDocumentFragment();
  sorted.forEach(r=>{
    const tr = document.createElement("tr");
    const v = pickValue(r);
    tr.innerHTML = `
      <td>${escapeHtml(r.year)}</td>
      <td>${escapeHtml(r.mainType || "-")}</td>
      <td>${escapeHtml(r.type || "-")}</td>
      <td>${escapeHtml(r.major || "-")}</td>
      <td>${escapeHtml(r.capacity ?? "-")}</td>
      <td>${escapeHtml(r.competition ?? "-")}</td>
      <td>${escapeHtml(r.extraRank ?? "-")}</td>
      <td>${escapeHtml(fmt(toNum(r.cut50)))}</td>
      <td>${escapeHtml(fmt(toNum(r.cut70)))}</td>
      <td><b>${escapeHtml(fmt(v))}</b></td>
    `;
    frag.appendChild(tr);
  });
  tableBody.appendChild(frag);
}

/* ===== SVG Helpers ===== */
function mkLine(x1,y1,x2,y2,cls){
  const el = document.createElementNS("http://www.w3.org/2000/svg","line");
  el.setAttribute("x1", x1); el.setAttribute("y1", y1);
  el.setAttribute("x2", x2); el.setAttribute("y2", y2);
  if(cls) el.setAttribute("class", cls);
  return el;
}
function mkCircle(cx,cy,r,fill){
  const el = document.createElementNS("http://www.w3.org/2000/svg","circle");
  el.setAttribute("cx", cx); el.setAttribute("cy", cy);
  el.setAttribute("r", r);
  el.setAttribute("fill", fill);
  el.setAttribute("opacity","0.95");
  return el;
}
function mkText(txt,x,y,cls){
  const el = document.createElementNS("http://www.w3.org/2000/svg","text");
  el.textContent = txt;
  el.setAttribute("x", x); el.setAttribute("y", y);
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
