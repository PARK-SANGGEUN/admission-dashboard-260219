
const universitySelect=document.getElementById("universitySelect");
const typeSelect=document.getElementById("typeSelect");
const majorSelect=document.getElementById("majorSelect");

let trendChart;

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
drawTrend();
}

function linearRegression(y){
const x=[1,2,3];
const n=3;
const sumX=x.reduce((a,b)=>a+b,0);
const sumY=y.reduce((a,b)=>a+b,0);
const sumXY=x.reduce((a,b,i)=>a+b*y[i],0);
const sumXX=x.reduce((a,b)=>a+b*b,0);
const slope=(n*sumXY - sumX*sumY)/(n*sumXX - sumX*sumX);
const intercept=(sumY - slope*sumX)/n;
return x.map(v=>slope*v+intercept);
}

function drawTrend(){
let data=admissionData[majorSelect.value];
let avg2023=average(data.y2023);
let avg2024=average(data.y2024);
let avg2025=average(data.y2025);

let y=[avg2023,avg2024,avg2025];
let trend=linearRegression(y);

if(trendChart)trendChart.destroy();
trendChart=new Chart(document.getElementById("trendChart"),{
type:"line",
data:{
labels:["2023","2024","2025"],
datasets:[
{label:"70%cut 평균",data:y,borderColor:"#6366f1",tension:0.3},
{label:"추세선",data:trend,borderDash:[5,5],borderColor:"#ef4444"}
]
},
options:{
responsive:true,
scales:{y:{reverse:true}}
}
});
}

function average(arr){
return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function savePDF(){window.print();}

universitySelect.addEventListener("change",updateTypes);
typeSelect.addEventListener("change",updateMajors);
window.onload=initFilters;
