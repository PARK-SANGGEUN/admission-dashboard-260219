
let data=[], convertTable=[];
let railChart;

Promise.all([
fetch('./data/admission.json').then(r=>r.json()),
fetch('./data/convert.json').then(r=>r.json())
]).then(([d,c])=>{
data=d; convertTable=c;
init();
});

function init(){
const univs=[...new Set(data.map(d=>d["대학명"]))];
let u=document.getElementById("univ");
u.innerHTML="<option value=''>대학 선택</option>";
univs.forEach(x=>{
let o=document.createElement("option");
o.value=x;o.text=x;u.appendChild(o);
});
u.onchange=updateType;
}

function updateType(){
const selected=document.getElementById("univ").value;
const types=[...new Set(data.filter(d=>d["대학명"]===selected).map(d=>d["전형명"]))];
let t=document.getElementById("type");
t.innerHTML="<option value=''>전형 선택</option>";
types.forEach(x=>{
let o=document.createElement("option");
o.value=x;o.text=x;t.appendChild(o);
});
t.onchange=renderAll;
}

function convert(){
let g=parseFloat(document.getElementById("grade5").value);
let row=convertTable.find(r=>r["5등급 평균"]==g);
if(!row){alert("정확한 단위 입력");return;}
document.getElementById("busan").innerHTML="부산 9등급<br>"+row["부산 9등급"];
document.getElementById("daejin").innerHTML="대진대 9등급<br>"+row["대진대 9등급(평균)"];
document.getElementById("mix").innerHTML="50:50 통합<br>"+row["50:50 통합"];
}

function renderAll(){
const univ=document.getElementById("univ").value;
const type=document.getElementById("type").value;
if(!univ||!type) return;
const filtered=data.filter(d=>d["대학명"]===univ && d["전형명"]===type);
renderRail(filtered);
renderTable(filtered);
}

function renderRail(filtered){
if(railChart) railChart.destroy();

const sorted=[...filtered].sort((a,b)=>a["70%cut"]-b["70%cut"]);
const top=sorted.slice(0,3);
const mid=sorted.slice(Math.floor(sorted.length/2)-1,Math.floor(sorted.length/2)+2);
const bottom=sorted.slice(-3);

railChart=new Chart(document.getElementById("railChart"),{
type:'scatter',
data:{
datasets:[
{
label:"70%cut",
data:sorted.map((d,i)=>({x:d["70%cut"],y:d["연도"]})),
pointRadius:6,
backgroundColor:"#4f46e5"
}
]
},
options:{
plugins:{
tooltip:{
callbacks:{
label:(ctx)=>sorted[ctx.dataIndex]["모집단위"]+" : "+ctx.raw.x
}
}
}
}
});

// 고정 라벨 출력
console.log("상위3:", bottom);
console.log("중앙3:", mid);
console.log("하위3:", top);
}

function renderTable(filtered){
let html="<table><tr><th>연도</th><th>모집단위</th><th>70%cut</th><th>증감</th></tr>";
filtered.forEach(d=>{
let prev=data.find(x=>x["모집단위"]===d["모집단위"] && x["연도"]===d["연도"]-1);
let diff=prev?d["70%cut"]-prev["70%cut"]:0;
let cls=diff>0?"up":diff<0?"down":"same";
let arrow=diff>0?"▲":diff<0?"▼":"-";
html+=`<tr><td>${d["연도"]}</td><td>${d["모집단위"]}</td><td>${d["70%cut"]}</td><td class="${cls}">${arrow}</td></tr>`;
});
html+="</table>";
document.getElementById("table").innerHTML=html;
}
