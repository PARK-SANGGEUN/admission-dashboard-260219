/* ================= 기본 ================= */

const YEARS = [2023,2024,2025];
let ADMISSION = [];
let CONVERT = [];
let currentCollege = "";
let currentG5 = 3;

/* ================= DOM ================= */

const collegeSelect = document.getElementById("collegeSelect");
const tableBody = document.querySelector("#dataTable tbody");
const railsEl = document.getElementById("rails");

const g5Slider = document.getElementById("g5Slider");
const g5Input = document.getElementById("g5Input");

const busanValEl = document.getElementById("busanVal");
const daejinValEl = document.getElementById("daejinVal");
const mixValEl = document.getElementById("mixVal");

/* ================= 유틸 ================= */

function fmt(n){
  if(!Number.isFinite(n)) return "-";
  return (Math.round(n*100)/100).toFixed(2).replace(/\.00$/,'');
}

/* ================= 변환 ================= */

function convertFromG5(g5){
  const x = Number(g5);
  for(let i=0;i<CONVERT.length-1;i++){
    const a = CONVERT[i];
    const b = CONVERT[i+1];
    if(x>=a.g5 && x<=b.g5){
      const t=(x-a.g5)/(b.g5-a.g5);
      const lerp=(p,q)=>p+(q-p)*t;
      return {
        busan: lerp(a.busan,b.busan),
        daejin: lerp(a.daejin,b.daejin),
        mix: lerp(a.mix,b.mix)
      };
    }
  }
  return CONVERT[CONVERT.length-1];
}

function updateCards(){
  const c = convertFromG5(currentG5);
  busanValEl.textContent = fmt(c.busan);
  daejinValEl.textContent = fmt(c.daejin);
  mixValEl.textContent = fmt(c.mix);
}

/* ================= 로딩 ================= */

async function loadJSON(url){
  const r = await fetch(url,{cache:"no-store"});
  return await r.json();
}

(async function init(){

  for(const y of [2025,2024,2023]){
    const d = await loadJSON(`data/admission_${y}.json`);
    ADMISSION.push(...d);
  }

  CONVERT = await loadJSON("data/convert.json");

  // 🔥 대학명 필드: "대학명"
  const colleges = [...new Set(ADMISSION.map(r=>r["대학명"]))];
  collegeSelect.innerHTML = colleges.map(c=>`<option>${c}</option>`).join("");

  currentCollege = colleges[0];

  collegeSelect.addEventListener("change",()=>{
    currentCollege = collegeSelect.value;
    renderTable();
  });

  g5Slider.addEventListener("input",()=>{
    currentG5 = Number(g5Slider.value);
    g5Input.value = currentG5;
    updateCards();
  });

  g5Input.addEventListener("input",()=>{
    currentG5 = Number(g5Input.value);
    g5Slider.value = currentG5;
    updateCards();
  });

  updateCards();
  renderTable();

})();

/* ================= 테이블 ================= */

function renderTable(){

  tableBody.innerHTML = "";

  const rows = ADMISSION.filter(r=>r["대학명"]===currentCollege);

  rows.forEach(r=>{

    const tr = document.createElement("tr");

    const cut50 = r["50%cut"];
    const cut70 = r["70%cut"];
    const 표시값 = cut70 || cut50;

    tr.innerHTML = `
      <td>${r["연도"]}</td>
      <td>${r["중심전형"]}</td>
      <td>${r["전형명"]}</td>
      <td>${r["모집단위"]}</td>
      <td>${r["모집인원"]}</td>
      <td>${r["경쟁률"]}</td>
      <td>${r["충원순위"]}</td>
      <td>${fmt(Number(cut50))}</td>
      <td>${fmt(Number(cut70))}</td>
      <td><b>${fmt(Number(표시값))}</b></td>
    `;

    tableBody.appendChild(tr);
  });
}
