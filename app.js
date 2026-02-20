/* ================= 기본 설정 ================= */

const YEAR_COLOR = { 2023: "#dc2626", 2024: "#1d4ed8", 2025: "#16a34a" };
const YEARS = [2023, 2024, 2025];
const DEFAULT_MODE = "mix";

/* ================= DOM ================= */

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

/* ================= 상태 ================= */

let ADMISSION = [];
let CONVERT = [];
let mode = DEFAULT_MODE;
let selectedTypes = [];
let currentCollege = "";
let currentG5 = 3.0;

/* ================= 유틸 ================= */

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function toNum(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n){
  if(!Number.isFinite(n)) return "-";
  return (Math.round(n*100)/100).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
}

function clamp(v,min,max){
  return Math.max(min, Math.min(max, v));
}

/* ================= convert ================= */

function convertFromG5(g5){
  if(!Array.isArray(CONVERT) || !CONVERT.length){
    return {busan:NaN, daejin:NaN, mix:NaN};
  }

  const x = clamp(g5,1,5);
  const rows = CONVERT.slice().sort((a,b)=>a.g5-b.g5);

  for(let i=0;i<rows.length-1;i++){
    const a = rows[i];
    const b = rows[i+1];

    if(x>=a.g5 && x<=b.g5){
      const t = (x-a.g5)/(b.g5-a.g5);
      const lerp = (p,q)=>p+(q-p)*t;

      return {
        busan: lerp(a.busan,b.busan),
        daejin: lerp(a.daejin,b.daejin),
        mix: lerp(a.mix,b.mix)
      };
    }
  }

  return {
    busan: rows[rows.length-1].busan,
    daejin: rows[rows.length-1].daejin,
    mix: rows[rows.length-1].mix
  };
}

/* ================= 카드 갱신 ================= */

function updateConversionCards(){
  const c = convertFromG5(currentG5);

  if(busanValEl) busanValEl.textContent = fmt(c.busan);
  if(daejinValEl) daejinValEl.textContent = fmt(c.daejin);
  if(mixValEl) mixValEl.textContent = fmt(c.mix);
}

/* ================= 데이터 로딩 ================= */

async function loadJSON(url){
  const r = await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`${url} 로딩 실패 (${r.status})`);

  const text = await r.text();
  if(text.trim().startsWith("<!DOCTYPE"))
    throw new Error(`${url} 가 JSON이 아님 (경로 확인)`);

  return JSON.parse(text);
}

/* ================= 초기화 ================= */

(async function init(){

  try{

    // 3개년 순차 로딩
    for(const y of [2025,2024,2023]){
      const data = await loadJSON(`data/admission_${y}.json`);
      ADMISSION.push(...data);
    }

    CONVERT = await loadJSON("data/convert.json");

    // 대학 목록
    const colleges = [...new Set(ADMISSION.map(r=>r.univ).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,"ko"));

    collegeSelect.innerHTML = colleges.map(c=>
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join("");

    currentCollege = colleges[0] || "";
    collegeSelect.value = currentCollege;

    collegeSelect.addEventListener("change",()=>{
      currentCollege = collegeSelect.value;
      renderAll();
    });

    // 등급 입력
    function setG5(v){
      const x = clamp(toNum(v),1,5);
      currentG5 = Number.isFinite(x)?x:3.0;
      g5Slider.value = currentG5;
      g5Input.value = currentG5;
      updateConversionCards();
      renderAll();
    }

    g5Slider.addEventListener("input",()=>setG5(g5Slider.value));
    g5Input.addEventListener("input",()=>setG5(g5Input.value));

    setG5(3.0);

    renderAll();

  }catch(err){
    fatalBox.hidden=false;
    fatalBox.textContent=err.message;
    console.error(err);
  }

})();

/* ================= 전체 렌더 ================= */

function renderAll(){
  updateConversionCards();
  renderTable();
}

/* ================= 테이블 ================= */

function renderTable(){

  tableBody.innerHTML="";

  const rows = ADMISSION.filter(r=>r.univ===currentCollege);

  rows.forEach(r=>{
    const tr=document.createElement("tr");

    tr.innerHTML=`
      <td>${escapeHtml(r.year)}</td>
      <td>${escapeHtml(r.mainType)}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>${escapeHtml(r.major)}</td>
      <td>${escapeHtml(r.capacity)}</td>
      <td>${escapeHtml(r.competition)}</td>
      <td>${escapeHtml(r.extraRank)}</td>
      <td>${fmt(toNum(r.cut50))}</td>
      <td>${fmt(toNum(r.cut70))}</td>
      <td><b>${fmt(toNum(r.cut70)||toNum(r.cut50))}</b></td>
    `;

    tableBody.appendChild(tr);
  });
}
