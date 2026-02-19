
const $=id=>document.getElementById(id);

const gradeInput=$("grade5");
const vBusan=$("v-busan");
const vDaejin=$("v-daejin");
const vCombined=$("v-combined");

let railChart=null;
let boxChart=null;

function fmt(x){return x?x.toFixed(2):"-"}
function snap(v){return Math.round(v/0.05)*0.05}

function quartiles(arr){
arr=[...arr].sort((a,b)=>a-b);
const q1=arr[Math.floor(arr.length*0.25)];
const q2=arr[Math.floor(arr.length*0.50)];
const q3=arr[Math.floor(arr.length*0.75)];
return {min:arr[0],q1,q2,q3,max:arr[arr.length-1]}
}

function update(){
const raw=parseFloat(gradeInput.value);
if(isNaN(raw)) return;
const snapped=snap(raw);
const c=CONV[snapped.toFixed(2)];
if(!c) return;

vBusan.textContent=fmt(c.b);
vDaejin.textContent=fmt(c.d);
vCombined.textContent=fmt(c.c);

drawRail(c.c);
drawBox(c.c);
}

function drawRail(userVal){

if(railChart) railChart.destroy();

const colors=["#2563eb","#16a34a","#7c3aed"];
const years=["2023","2024","2025"];
const datasets=[];

years.forEach((yr,i)=>{
const arr=AD.SCATTER["y"+yr].y;
datasets.push({
label:yr,
data:arr.map(v=>({x:v,y:i})),
backgroundColor:colors[i],
pointRadius:4
});
});

datasets.push({
type:"line",
label:"사용자 위치",
data:[{x:userVal,y:-0.5},{x:userVal,y:2.5}],
borderColor:"#ef4444",
borderWidth:4,
pointRadius:0
});

railChart=new Chart($("railChart"),{
type:"scatter",
data:{datasets},
options:{
responsive:true,
plugins:{legend:{labels:{font:{size:14,weight:"bold"}}}},
scales:{
x:{min:1,max:9,ticks:{font:{size:14,weight:"bold"}}},
y:{type:"category",labels:years,ticks:{font:{size:16,weight:"bold"}}}
}
}
});
}

function drawBox(userVal){

if(boxChart) boxChart.destroy();

const years=["2023","2024","2025"];
const colors=["#60a5fa","#34d399","#a78bfa"];

const datasets=[];

years.forEach((yr,i)=>{
const arr=AD.SCATTER["y"+yr].y;
const q=quartiles(arr);
datasets.push({
label:yr,
data:[{x:i,y:q.q2}],
backgroundColor:colors[i]
});
});

boxChart=new Chart($("boxChart"),{
type:"bar",
data:{
labels:years,
datasets:[{
label:"중앙값",
data:years.map((yr,i)=>quartiles(AD.SCATTER["y"+yr].y).q2),
backgroundColor:colors
}]
},
options:{
responsive:true,
plugins:{legend:{labels:{font:{size:14,weight:"bold"}}}},
scales:{
y:{min:1,max:9,ticks:{font:{size:14,weight:"bold"}}}
}
}
});
}

gradeInput.addEventListener("input",update);
