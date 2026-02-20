/* ================= 기본 ================= */

const YEARS = [2025, 2024, 2023];
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

  for(const y of YEARS){
    const d = await loadJSON(`data/admission_${y}.json`);
    
    // 🔥 year 강제 주입
    d.forEach(row => row.year = y);

    ADMISSION.push(...d);
  }

  CONVERT = await loadJSON("data/convert.json");

  const colleges = [...new Set(ADMISSION.map(r=>r["대학명"]))];
  collegeSelect.innerHTML = colleges.map(c=>`<option>${c}</option>`).join("");

  currentCollege = colleges[0];

  collegeSelect.addEventListener("change",()=>{
    currentCollege = collegeSelect.value;
    renderAll();
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
  renderAll();

})();

/* ================= 전체 렌더 ================= */

function renderAll(){
  renderTable();
  renderRails();
}

/* ================= 테이블 ================= */

function renderTable(){

  tableBody.innerHTML = "";

  const rows = ADMISSION
    .filter(r=>r["대학명"]===currentCollege)
    .sort((a,b)=>b.year - a.year); // 🔥 연도 내림차순

  rows.forEach(r=>{

    const cut50 = r["50%cut"];
    const cut70 = r["70%cut"];
    const 표시값 = cut70 || cut50;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.year}</td>
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

/* ================= 레일 ================= */

function renderRails(){

  railsEl.innerHTML = "";

  const rows = ADMISSION.filter(r=>r["대학명"]===currentCollege);

  if(!rows.length) return;

  const groups = {};

  rows.forEach(r=>{
    const key = r["중심전형"];
    if(!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  Object.keys(groups).forEach(groupName=>{

    const card = document.createElement("div");
    card.className = "railCard";
    card.innerHTML = `
      <div class="railHeader">
        <div class="railTitle">${groupName}</div>
      </div>
      <div class="railBody"></div>
    `;

    const body = card.querySelector(".railBody");

    groups[groupName].forEach(r=>{
      const cut = r["70%cut"] || r["50%cut"];
      const div = document.createElement("div");
      div.style.margin = "4px 0";
      div.innerHTML = `<b>${r.year}</b> - ${r["모집단위"]} : ${fmt(cut)}`;
      body.appendChild(div);
    });

    railsEl.appendChild(card);
  });
}
