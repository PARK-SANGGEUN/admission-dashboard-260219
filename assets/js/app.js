
let admissionData=[];
let boxChart,railChart;

Promise.all([
fetch('data/admission_data.json').then(r=>r.json())
]).then(([ad])=>{
admissionData=ad;
initFilters();
renderAll();
document.getElementById("loader").style.display="none";
});

function unique(field,data){
return [...new Set(data.map(d=>d[field]).filter(v=>v))];
}

function initFilters(){
fillSelect("univ","대학",admissionData);
document.getElementById("univ").onchange=()=>updateFilter("univ","center","중심전형");
document.getElementById("center").onchange=()=>updateFilter("center","type","전형명");
document.getElementById("type").onchange=()=>updateFilter("type","major","모집단위");
document.getElementById("major").onchange=renderAll;
}

function fillSelect(id,field,data){
let sel=document.getElementById(id);
sel.innerHTML="<option value=''>전체</option>";
unique(field,data).forEach(v=>{
let o=document.createElement("option");
o.value=v;o.text=v;
sel.add(o);
});
}

function updateFilter(parentId,childId,field){
let data=filteredData();
fillSelect(childId,field,data);
renderAll();
}

function resetFilter(){
["univ","center","type","major"].forEach(id=>{
document.getElementById(id).value="";
});
initFilters();
renderAll();
}

function filteredData(){
let data=admissionData;
["univ","center","type","major"].forEach(id=>{
let val=document.getElementById(id).value;
if(val) data=data.filter(d=>d[document.getElementById(id).options[0].text=="전체"?
(id=="univ"?"대학":id=="center"?"중심전형":id=="type"?"전형명":"모집단위"):null]==val);
});
return data;
}

function stats(values){
values=values.sort((a,b)=>a-b);
let min=values[0];
let max=values[values.length-1];
let median=values[Math.floor(values.length/2)];
let mean=values.reduce((a,b)=>a+b,0)/values.length;
return {min,max,median,mean};
}

function renderAll(){
let data=filteredData();
renderBox(data);
renderRail(data);
renderTable(data);
}

function renderBox(data){
let ctx=document.getElementById("boxChart").getContext("2d");
if(boxChart)boxChart.destroy();
let values=data.map(d=>d["70%cut"]).filter(v=>v);
let s=stats(values);
boxChart=new Chart(ctx,{
type:'boxplot',
data:{labels:["70%cut 분포"],datasets:[{data:[values]}]},
options:{
plugins:{
annotation:{
annotations:{
meanLine:{type:'line',yMin:s.mean,yMax:s.mean},
medianLine:{type:'line',yMin:s.median,yMax:s.median}
}
}
}
}
});
}

function renderRail(data){
let ctx=document.getElementById("railChart").getContext("2d");
if(railChart)railChart.destroy();
railChart=new Chart(ctx,{
type:'scatter',
data:{
datasets:data.map(d=>({
label:d["전형명"],
data:[{x:d["70%cut"],y:0}],
pointRadius:5
}))
},
options:{scales:{y:{display:false}}}
});
}

function renderTable(data){
let html="<table border='1' style='width:100%;border-collapse:collapse'>";
html+="<tr><th>대학</th><th>모집단위</th><th>2023</th><th>2024</th><th>2025</th><th>증감</th></tr>";
data.forEach(d=>{
let y1=d["2023"]||"";
let y2=d["2024"]||"";
let y3=d["2025"]||"";
let diff=(y3 && y2)?(y3-y2):"";
let arrow=diff>0?"▲":diff<0?"▼":"-";
html+=`<tr><td>${d["대학"]}</td><td>${d["모집단위"]}</td><td>${y1}</td><td>${y2}</td><td>${y3}</td><td>${arrow}</td></tr>`;
});
html+="</table>";
document.getElementById("dataTable").innerHTML=html;
}
