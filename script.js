
/* Ultimate dashboard logic (fast & stable) */
const $ = (id) => document.getElementById(id);

const gradeInput = $("grade5");
const selUni = $("uni");
const selType = $("type");
const selMajor = $("major");

const vBusan = $("v-busan");
const vDaejin = $("v-daejin");
const vCombined = $("v-combined");
const btnPDF = $("btn-pdf");

const tblBody = document.querySelector("#tbl tbody");

let compareChart = null;
let boxChart = null;
let scatterChart = null;

const YEAR_LABELS = ["2023", "2024", "2025"];
const YEAR_KEYS = ["y2023", "y2024", "y2025"];
const YEAR_X = [0, 1, 2];

function fmt(x){
  if (x === null || x === undefined || Number.isNaN(x)) return "-";
  return (Math.round(x * 100) / 100).toFixed(2);
}

function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }

function snapTo005(v){
  // snap to nearest 0.05
  const s = Math.round(v / 0.05) * 0.05;
  return Math.round(s * 100) / 100;
}

function getConv(grade5){
  // grade5 is already snapped to 0.05
  const key = grade5.toFixed(2);
  return CONV[key] || null;
}

function buildFilters(){
  // UNI
  selUni.innerHTML = "";
  for (let i=0;i<AD.UNI.length;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = AD.UNI[i];
    selUni.appendChild(opt);
  }
  selUni.selectedIndex = 0;
  buildTypes();
}

function buildTypes(){
  const ui = Number(selUni.value);
  selType.innerHTML = "";
  const types = AD.TYPES[ui] || [];
  for (let i=0;i<types.length;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = types[i];
    selType.appendChild(opt);
  }
  selType.selectedIndex = 0;
  buildMajors();
}

function buildMajors(){
  const ui = Number(selUni.value);
  const ti = Number(selType.value);
  selMajor.innerHTML = "";
  const majors = (AD.MAJORS[ui] && AD.MAJORS[ui][ti]) ? AD.MAJORS[ui][ti] : [];
  for (let i=0;i<majors.length;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = majors[i];
    selMajor.appendChild(opt);
  }
  selMajor.selectedIndex = 0;
  updateAll();
}

function collectUnitDist(yearKey, ui, ti){
  const arr = (AD.CUTS[yearKey] && AD.CUTS[yearKey][ui] && AD.CUTS[yearKey][ui][ti]) ? AD.CUTS[yearKey][ui][ti] : [];
  const out = [];
  for (let i=0;i<arr.length;i++){
    const v = arr[i];
    if (typeof v === "number" && v > 0) out.push(v);
  }
  return out;
}

function getMajorCut(yearKey, ui, ti, mi){
  const v = (AD.CUTS[yearKey] && AD.CUTS[yearKey][ui] && AD.CUTS[yearKey][ui][ti]) ? AD.CUTS[yearKey][ui][ti][mi] : null;
  return (typeof v === "number" && v > 0) ? v : null;
}

function mean(arr){
  if (!arr || arr.length === 0) return null;
  let s=0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function drawCompare(b, d, c){
  const ctx = $("compareChart").getContext("2d");
  if (compareChart) compareChart.destroy();

  compareChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["부산", "대진", "50:50"],
      datasets: [{
        label: "환산 9등급",
        data: [b, d, c],
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79,70,229,.18)",
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed.y)}` }
        }
      },
      scales: {
        y: {
          reverse: true,
          min: 1,
          max: 9,
          ticks: { font: { weight: "700" } },
          grid: { color: "rgba(226,232,240,.9)" }
        },
        x: {
          ticks: { font: { weight: "800" } },
          grid: { display: false }
        }
      }
    }
  });
}

function drawBoxplot(ui, ti, mi, userC){
  const ctx = $("boxChart").getContext("2d");
  if (boxChart) boxChart.destroy();

  // distributions per year for selected uni+type
  const dist = YEAR_KEYS.map(y => collectUnitDist(y, ui, ti));
  const means = dist.map(d => mean(d));

  // selected major cut per year (black)
  const majorCuts = YEAR_KEYS.map(y => getMajorCut(y, ui, ti, mi));

  // user points per year (same y repeated, x mapped to year index)
  const userPoints = userC !== null ? YEAR_X.map((x, idx) => ({x, y: userC})) : [];

  const majorPoints = [];
  for (let i=0;i<3;i++){
    if (majorCuts[i] !== null){
      majorPoints.push({x: YEAR_X[i], y: majorCuts[i]});
    }
  }

  boxChart = new Chart(ctx, {
    data: {
      labels: YEAR_LABELS,
      datasets: [
        {
          type: "boxplot",
          label: "분포(70%cut)",
          data: dist,
          backgroundColor: ["rgba(37,99,235,.18)","rgba(22,163,74,.16)","rgba(99,102,241,.16)"],
          borderColor: ["#2563eb","#16a34a","#6366f1"],
          borderWidth: 2,
          itemRadius: 0,
          outlierRadius: 2,
          outlierColor: "rgba(15,23,42,.25)"
        },
        {
          type: "line",
          label: "평균선",
          data: means,
          borderColor: "#f59e0b",
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.35
        },
        {
          type: "scatter",
          label: "선택 모집단위",
          data: majorPoints,
          backgroundColor: "#0f172a",
          pointStyle: "rectRot",
          pointRadius: 7,
          pointHoverRadius: 8
        },
        {
          type: "scatter",
          label: "사용자(50:50)",
          data: userPoints,
          backgroundColor: "#ef4444",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 9,
          pointHoverRadius: 10
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { font: { weight: "800" } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const ds = ctx.dataset;
              if (ds.type === "boxplot"){
                const v = ctx.raw;
                if (v && typeof v === "object"){
                  // Chart.BoxPlot uses {min, q1, median, q3, max} internally
                  const min = v.min ?? v[0];
                  const q1 = v.q1 ?? v[1];
                  const med = v.median ?? v[2];
                  const q3 = v.q3 ?? v[3];
                  const max = v.max ?? v[4];
                  return ` ${ctx.label} | min ${fmt(min)} / Q1 ${fmt(q1)} / med ${fmt(med)} / Q3 ${fmt(q3)} / max ${fmt(max)}`;
                }
              }
              return ` ${ds.label}: ${fmt(ctx.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          reverse: true,
          min: 1,
          max: 9,
          ticks: { font: { weight: "800" } },
          grid: { color: "rgba(226,232,240,.9)" }
        },
        x: {
          ticks: { font: { weight: "900" } },
          grid: { display: false }
        }
      }
    }
  });
}

function decodeKey(key){
  const ui = (key >> 16) & 0xffff;
  const ti = (key >> 12) & 0x0f;
  const mi = key & 0x0fff;
  const uni = AD.UNI[ui] || "";
  const typ = (AD.TYPES[ui] && AD.TYPES[ui][ti]) ? AD.TYPES[ui][ti] : "";
  const maj = (AD.MAJORS[ui] && AD.MAJORS[ui][ti] && AD.MAJORS[ui][ti][mi]) ? AD.MAJORS[ui][ti][mi] : "";
  return {uni, typ, maj};
}

function buildScatterDataset(yearKey, yearIndex, color){
  const y = AD.SCATTER[yearKey].y;
  const k = AD.SCATTER[yearKey].k;
  const pts = new Array(y.length);
  for (let i=0;i<y.length;i++){
    const jitter = (Math.random() - 0.5) * 0.18; // small spread
    pts[i] = { x: yearIndex + jitter, y: y[i], _k: k[i] };
  }
  return {
    type: "scatter",
    label: yearKey.replace("y",""),
    data: pts,
    backgroundColor: color,
    pointRadius: 2.2,
    pointHoverRadius: 5,
    borderWidth: 0
  };
}

function drawScatter(userC){
  const ctx = $("scatterChart").getContext("2d");
  if (scatterChart) scatterChart.destroy();

  const ds2023 = buildScatterDataset("y2023", 0, "rgba(37,99,235,.55)");
  const ds2024 = buildScatterDataset("y2024", 1, "rgba(22,163,74,.55)");
  const ds2025 = buildScatterDataset("y2025", 2, "rgba(99,102,241,.55)");

  const userPts = userC !== null ? [
    {x: 0, y: userC},
    {x: 1, y: userC},
    {x: 2, y: userC},
  ] : [];

  scatterChart = new Chart(ctx, {
    data: {
      labels: YEAR_LABELS,
      datasets: [
        ds2023, ds2024, ds2025,
        {
          type:"scatter",
          label:"사용자(50:50)",
          data: userPts,
          backgroundColor:"#ef4444",
          pointBorderColor:"#ffffff",
          pointBorderWidth:2,
          pointRadius:8,
          pointHoverRadius:10
        }
      ]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{ position:"top", labels:{ font:{ weight:"800" } } },
        tooltip:{
          callbacks:{
            title:(items)=>{
              const it = items[0];
              const ds = it.dataset;
              if (ds.label === "사용자(50:50)") return "사용자 환산값";
              return `연도 ${YEAR_LABELS[Math.round(it.parsed.x)]}`;
            },
            label:(ctx)=>{
              const ds = ctx.dataset;
              if (ds.label === "사용자(50:50)"){
                return ` 50:50 = ${fmt(ctx.parsed.y)}`;
              }
              const raw = ctx.raw;
              const meta = raw && raw._k !== undefined ? decodeKey(raw._k) : null;
              if (meta){
                return ` ${meta.uni} | ${meta.typ} | ${meta.maj} : ${fmt(ctx.parsed.y)}`;
              }
              return ` ${fmt(ctx.parsed.y)}`;
            }
          }
        }
      },
      scales:{
        x:{
          min:-0.5, max:2.5,
          ticks:{
            callback:(v)=> YEAR_LABELS[Math.round(v)] ?? "",
            font:{ weight:"900" }
          },
          grid:{ display:false }
        },
        y:{
          reverse:true,
          min:1, max:9,
          ticks:{ font:{ weight:"800" } },
          grid:{ color:"rgba(226,232,240,.9)" }
        }
      }
    }
  });
}

function renderTable(ui, ti, mi, userC){
  const rows = [];
  const cuts = YEAR_KEYS.map(y => getMajorCut(y, ui, ti, mi));
  for (let i=0;i<3;i++){
    const year = YEAR_LABELS[i];
    const cut = cuts[i];
    let diffPrev = null;
    if (i>0 && cuts[i-1] !== null && cut !== null){
      diffPrev = cut - cuts[i-1];
    }
    let diffUser = null;
    if (userC !== null && cut !== null){
      diffUser = userC - cut;
    }
    rows.push({year, cut, diffPrev, diffUser});
  }

  tblBody.innerHTML = "";
  for (const r of rows){
    const tr = document.createElement("tr");

    const tdY = document.createElement("td");
    tdY.textContent = r.year;

    const tdC = document.createElement("td");
    tdC.textContent = fmt(r.cut);

    const tdD = document.createElement("td");
    if (r.diffPrev === null){
      tdD.textContent = "-";
      tdD.className = "badge-flat";
    } else if (r.diffPrev > 0.00001){
      tdD.textContent = `▲ ${fmt(Math.abs(r.diffPrev))}`;
      tdD.className = "badge-down"; // higher grade number = worse (down)
    } else if (r.diffPrev < -0.00001){
      tdD.textContent = `▼ ${fmt(Math.abs(r.diffPrev))}`;
      tdD.className = "badge-up"; // lower grade number = better (up)
    } else {
      tdD.textContent = "—";
      tdD.className = "badge-flat";
    }

    const tdU = document.createElement("td");
    if (r.diffUser === null){
      tdU.textContent = "-";
      tdU.className = "badge-flat";
    } else if (r.diffUser > 0.00001){
      tdU.textContent = `사용자 +${fmt(Math.abs(r.diffUser))}`;
      tdU.className = "badge-down";
    } else if (r.diffUser < -0.00001){
      tdU.textContent = `사용자 -${fmt(Math.abs(r.diffUser))}`;
      tdU.className = "badge-up";
    } else {
      tdU.textContent = "동일";
      tdU.className = "badge-flat";
    }

    tr.appendChild(tdY);
    tr.appendChild(tdC);
    tr.appendChild(tdD);
    tr.appendChild(tdU);
    tblBody.appendChild(tr);
  }
}

let debounceTimer = null;
function updateAll(){
  // compute conversion (always show all three)
  const raw = parseFloat(gradeInput.value);
  if (Number.isNaN(raw)){
    vBusan.textContent = "-";
    vDaejin.textContent = "-";
    vCombined.textContent = "-";
    drawCompare(null, null, null);
    return;
  }
  const cl = clamp(raw, 1, 5);
  const snapped = snapTo005(cl);
  // update input display only if different enough (avoid cursor jumps for typing)
  // We won't overwrite while typing; but if user leaves, it is ok. We'll show snapped via hint in cards only.
  const c = getConv(snapped);
  if (!c) return;

  const b = c.b, d = c.d, comb = c.c;

  vBusan.textContent = fmt(b);
  vDaejin.textContent = fmt(d);
  vCombined.textContent = fmt(comb);

  const ui = Number(selUni.value);
  const ti = Number(selType.value);
  const mi = Number(selMajor.value);

  drawCompare(b, d, comb);
  drawBoxplot(ui, ti, mi, comb);
  drawScatter(comb);
  renderTable(ui, ti, mi, comb);
}

function updateAllDebounced(){
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updateAll, 180);
}

btnPDF.addEventListener("click", () => window.print());
gradeInput.addEventListener("input", updateAllDebounced);
selUni.addEventListener("change", () => { buildTypes(); });
selType.addEventListener("change", () => { buildMajors(); });
selMajor.addEventListener("change", updateAllDebounced);

window.addEventListener("load", () => {
  buildFilters();
  // initial charts with no user value yet
  drawScatter(null);
  // ensure boxplot drawn for default selection (with null user)
  const ui = Number(selUni.value);
  const ti = Number(selType.value);
  const mi = Number(selMajor.value);
  drawBoxplot(ui, ti, mi, null);
  renderTable(ui, ti, mi, null);
});
