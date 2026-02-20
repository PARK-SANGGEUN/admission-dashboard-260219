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
let selectedTypes = [];
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

/* 표시값 선택 */
function pickValue(row){
  const v70 = toNum(row.cut70);
  if(Number.isFinite(v70) && v70>0) return v70;
  const v50 = toNum(row.cut50);
  if(Number.isFinite(v50) && v50>0) return v50;
  return NaN;
}

/* ===== convert ===== */
function convertFromG5(g5){
  if(!Array.isArray(CONVERT) || !CONVERT.length) return {busan:NaN, daejin:NaN, mix:NaN};
  const x = clamp(g5, 1, 5);
  const rows = CONVERT.slice().sort((a,b)=>a.g5-b.g5);

  const exact = rows.find(r => Number(r.g5) === Number(Math.round(x*100)/100));
  if(exact){
    return { busan: toNum(exact.busan), daejin: toNum(exact.daejin), mix: toNum(exact.mix) };
  }

  let lo = rows[0], hi = rows[rows.length-1];
  for(let i=0;i<rows.length-1;i++){
    const a = rows[i], b = rows[i+1];
    if(x>=a.g5 && x<=b.g5){ lo=a; hi=b; break; }
  }

  const t = (hi.g5===lo.g5) ? 0 : (x - lo.g5) / (hi.g5 - lo.g5);
  const lerp = (p,q)=> p + (q-p)*t;

  return {
    busan: lerp(toNum(lo.busan), toNum(hi.busan)),
    daejin: lerp(toNum(lo.daejin), toNum(hi.daejin)),
    mix: lerp(toNum(lo.mix), toNum(hi.mix))
  };
}

/* ===== 로딩 ===== */
async function loadJSON(url){
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok){
    throw new Error(`GET ${url} 실패 (${r.status})`);
  }
  const text = await r.text();

  if(text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")){
    throw new Error(`GET ${url} 응답이 JSON이 아니라 HTML입니다 (경로 확인 필요)`);
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

    // 🔥 3개년 분리 로딩 (안정 순차 방식)
    for(const y of [2025, 2024, 2023]){
      const data = await loadJSON(`data/admission_${y}.json`);
      if(Array.isArray(data)){
        ADMISSION.push(...data);
      }else{
        throw new Error(`admission_${y}.json 형식 오류 (배열 아님)`);
      }
    }

    CONVERT = await loadJSON("data/convert.json");

    if(!Array.isArray(CONVERT)){
      throw new Error("convert.json 형식 오류 (배열 아님)");
    }

    const colleges = Array.from(new Set(ADMISSION.map(r => r.univ).filter(Boolean)))
      .sort((a,b)=>String(a).localeCompare(String(b),"ko"));

    collegeSelect.innerHTML = colleges.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    currentCollege = colleges[0] || "";
    collegeSelect.value = currentCollege;

    collegeSelect.addEventListener("change", ()=>{
      currentCollege = collegeSelect.value;
      selectedTypes = [];
      renderAll();
    });

    function setG5(v){
      const x = clamp(toNum(v), 1, 5);
      currentG5 = Number.isFinite(x) ? x : 3.0;
      g5Slider.value = String(currentG5);
      g5Input.value = String(Math.round(currentG5*100)/100);
      updateConversionCards();
      renderRails();
    }

    g5Slider.addEventListener("input", ()=>setG5(g5Slider.value));
    g5Input.addEventListener("input", ()=>setG5(g5Input.value));
    setG5(3.0);

    modeBtns.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        mode = btn.dataset.mode;
        modeBtns.forEach(b=>b.classList.toggle("active", b===btn));
        renderAll();
      });
    });

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
    showFatal(String(err?.message || err));
    console.error(err);
  }
})();
