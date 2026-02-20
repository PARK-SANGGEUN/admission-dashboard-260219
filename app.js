Promise.all([
  fetch("data/admission.json").then(r=>r.json()),
  fetch("data/convert.json").then(r=>r.json())
]).then(([admission, convert])=>{

const input = document.getElementById("g5");
const busanKpi = document.querySelector("#busanKpi .kpi-value");
const daejinKpi = document.querySelector("#daejinKpi .kpi-value");
const mixKpi = document.querySelector("#mixKpi .kpi-value");

input.addEventListener("input",()=>{
  const val = parseFloat(input.value);
  if(isNaN(val)) return;

  const b = convert.busan[val];
  const d = convert.daejin[val];
  if(!b||!d) return;

  const m = ((b+d)/2).toFixed(2);
  busanKpi.textContent = b;
  daejinKpi.textContent = d;
  mixKpi.textContent = m;

  drawBox(m);
});

const univSelect = document.getElementById("univ");
const addBtn = document.getElementById("addType");
const typeCards = document.getElementById("typeCards");

[...new Set(admission.map(d=>d.university))]
.forEach(u=>{
  const o=document.createElement("option");
  o.value=u; o.textContent=u;
  univSelect.appendChild(o);
});

let selectedTypes=[];

addBtn.onclick=()=>{
  const types=[...new Set(
    admission.filter(d=>d.university===univSelect.value)
    .map(d=>d.type)
  )];
  const t=types[0];
  if(!selectedTypes.includes(t)){
    selectedTypes.push(t);
    renderTypeCards();
    drawTable();
  }
};

function renderTypeCards(){
  typeCards.innerHTML="";
  selectedTypes.forEach(t=>{
    const div=document.createElement("div");
    div.className="type-card";
    div.innerHTML=`${t} <span>✕</span>`;
    div.querySelector("span").onclick=()=>{
      selectedTypes=selectedTypes.filter(x=>x!==t);
      renderTypeCards();
      drawTable();
    };
    typeCards.appendChild(div);
  });
}

function drawTable(){
  const table=document.getElementById("datatable");
  const filtered=admission.filter(d=>selectedTypes.includes(d.type));
  if(!filtered.length){ table.innerHTML=""; return;}
  table.innerHTML="<tr><th>연도</th><th>전형</th><th>모집단위</th><th>70%</th></tr>"+
  filtered.map(d=>`<tr><td>${d.year}</td><td>${d.type}</td><td>${d.major}</td><td>${d.cut70}</td></tr>`).join("");
}

function drawBox(userValue){
  const svg=d3.select("#boxplot");
  svg.selectAll("*").remove();

  const width=svg.node().clientWidth;
  const height=400;
  const margin={top:20,right:30,bottom:40,left:60};
  const g=svg.append("g")
    .attr("transform",`translate(${margin.left},${margin.top})`);

  const x=d3.scaleBand()
    .domain(["2023","2024","2025"])
    .range([0,width-100])
    .padding(0.4);

  const y=d3.scaleLinear()
    .domain([0,9])
    .range([height-margin.top-margin.bottom,0]);

  g.append("g")
   .attr("transform",`translate(0,${height-60})`)
   .call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  g.append("line")
    .attr("x1",0)
    .attr("x2",width)
    .attr("y1",y(userValue))
    .attr("y2",y(userValue))
    .attr("stroke","red")
    .attr("stroke-width",3)
    .attr("stroke-dasharray","5,5");
}

});
