
const gradeInput=document.getElementById("grade5");
const universitySelect=document.getElementById("universitySelect");
const typeSelect=document.getElementById("typeSelect");
const majorSelect=document.getElementById("majorSelect");
const busanResult=document.getElementById("busanResult");
const daejinResult=document.getElementById("daejinResult");
const combinedResult=document.getElementById("combinedResult");

let boxChart;

function initFilters(){
const keys=Object.keys(admissionData);
const universities=[...new Set(keys.map(k=>k.split("|")[0]))];
universities.forEach(u=>{
let opt=document.createElement("option");
opt.value=u; opt.text=u;
universitySelect.appendChild(opt);
});
updateTypes();
}

function updateTypes(){
typeSelect.innerHTML="";
majorSelect.innerHTML="";
const uni=universitySelect.value;
const keys=Object.keys(admissionData).filter(k=>k.startsWith(uni+"|"));
const types=[...new Set(keys.map(k=>k.split("|")[1]))];
types.forEach(t=>{
let opt=document.createElement("option");
opt.value=t; opt.text=t;
typeSelect.appendChild(opt);
});
updateMajors();
}

function updateMajors(){
majorSelect.innerHTML="";
const uni=universitySelect.value;
const type=typeSelect.value;
const keys=Object.keys(admissionData).filter(k=>k.startsWith(uni+"|"+type));
keys.forEach(k=>{
let major=k.split("|")[2];
let opt=document.createElement("option");
opt.value=k; opt.text=major;
majorSelect.appendChild(opt);
});
drawBox();
}

function nearest(val){
let keys=Object.keys(conversionTable).map(Number);
return keys.reduce((p,c)=>Math.abs(c-val)<Math.abs(p-val)?c:p).toFixed(2);
}

function updateConversion(){
let val=parseFloat(gradeInput.value);
if(!val)return;
let key=nearest(val);
let b=conversionTable[key].busan;
let d=conversionTable[key].daejin;
let c=((b+d)/2).toFixed(2);

busanResult.innerText="부산: "+b;
daejinResult.innerText="대진: "+d;
combinedResult.innerText="50:50: "+c;

drawBox(c);
}

function drawBox(userVal=null){
let data=admissionData[majorSelect.value];
if(!data)return;

let years=["y2023","y2024","y2025"];
let labels=["2023","2024","2025"];
let datasetsData=years.map(y=>data[y]);

let meanLine=years.map(y=>{
let arr=data[y];
return arr.reduce((a,b)=>a+b,0)/arr.length;
});

if(boxChart)boxChart.destroy();

boxChart=new Chart(document.getElementById("boxChart"),{
type:"boxplot",
data:{
labels:labels,
datasets:[{
label:"70%cut 분포",
backgroundColor:"#c7d2fe",
borderColor:"#6366f1",
borderWidth:2,
data:datasetsData
},
{
type:"line",
label:"평균선",
data:meanLine,
borderColor:"#ef4444",
borderWidth:2,
fill:false,
tension:0.3
},
{
type:"scatter",
label:"사용자 위치",
data:userVal? labels.map(()=>userVal):[],
backgroundColor:"red",
pointRadius:8
}]
},
options:{
responsive:true,
scales:{
y:{
reverse:true,
min:1,
max:9,
title:{display:true,text:"9등급"}
}
}
}
});
}

function savePDF(){window.print();}

gradeInput.addEventListener("input",updateConversion);
universitySelect.addEventListener("change",updateTypes);
typeSelect.addEventListener("change",updateMajors);

window.onload=initFilters;
