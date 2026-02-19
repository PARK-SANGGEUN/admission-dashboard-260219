
let data=[], convertTable=[]
let boxChart, railChart
let userValue=null

const themeColors=["#2563eb","#16a34a","#f59e0b","#7c3aed","#dc2626"]

Promise.all([
fetch('./data/admission.json').then(r=>r.json()),
fetch('./data/convert.json').then(r=>r.json())
]).then(([d,c])=>{
data=d; convertTable=c
init()
})

function init(){
const univs=[...new Set(data.map(d=>d["대학명"]))]
let u=document.getElementById("univ")
u.innerHTML="<option value=''>대학 선택</option>"
univs.forEach(x=>{
let o=document.createElement("option")
o.value=x;o.text=x;u.appendChild(o)
})
u.onchange=updateTypes
}

function updateTypes(){
const selected=document.getElementById("univ").value
const types=[...new Set(data.filter(d=>d["대학명"]===selected).map(d=>d["전형명"]))]
let tA=document.getElementById("typeA")
let tB=document.getElementById("typeB")
tA.innerHTML="<option value=''>전형 A</option>"
tB.innerHTML="<option value=''>전형 B</option>"
types.forEach(x=>{
let o1=document.createElement("option")
o1.value=x;o1.text=x;tA.appendChild(o1)
let o2=document.createElement("option")
o2.value=x;o2.text=x;tB.appendChild(o2)
})
tA.onchange=renderAll
tB.onchange=renderAll
}

function interpolate(g){
let arr=convertTable.map(r=>parseFloat(r["5등급 평균"]))
for(let i=0;i<arr.length-1;i++){
if(g>=arr[i]&&g<=arr[i+1]){
let ratio=(g-arr[i])/(arr[i+1]-arr[i])
let r1=convertTable[i],r2=convertTable[i+1]
return parseFloat(r1["50:50 통합"])+ratio*(parseFloat(r2["50:50 통합"])-parseFloat(r1["50:50 통합"]))
}
}
return arr[0]
}

function convert(){
let g=parseFloat(document.getElementById("grade5").value)
if(isNaN(g)) return
userValue=interpolate(g)
renderAll()
}

function getStats(arr){
arr.sort((a,b)=>a-b)
let q1=arr[Math.floor(arr.length*0.25)]
let median=arr[Math.floor(arr.length*0.5)]
let q3=arr[Math.floor(arr.length*0.75)]
return {min:arr[0],q1,median,q3,max:arr[arr.length-1]}
}

function renderAll(){
const univ=document.getElementById("univ").value
const typeA=document.getElementById("typeA").value
const typeB=document.getElementById("typeB").value
if(!univ||!typeA) return

let selectedTypes=[typeA]
if(typeB) selectedTypes.push(typeB)

renderBox(univ,selectedTypes)
renderRail(univ,selectedTypes)
renderTable(univ,selectedTypes)
}

function renderBox(univ,types){
if(boxChart) boxChart.destroy()

let datasets=[]
types.forEach((type,idx)=>{
let values=data.filter(d=>d["대학명"]===univ&&d["전형명"]===type)
.map(d=>d["70%cut"])
if(values.length==0) return
let s=getStats(values)
datasets.push({
label:type,
data:[s.median],
backgroundColor:themeColors[idx]
})
})

boxChart=new Chart(document.getElementById("boxChart"),{
type:'bar',
data:{labels:["Median 비교"],datasets},
options:{
animation:{duration:1000},
plugins:{legend:{position:'top'}}
}
})
}

function renderRail(univ,types){
if(railChart) railChart.destroy()

let datasets=[]
types.forEach((type,idx)=>{
let values=data.filter(d=>d["대학명"]===univ&&d["전형명"]===type)
datasets.push({
label:type,
data:values.map(d=>({x:d["70%cut"],y:d["연도"]})),
pointRadius:6,
backgroundColor:themeColors[idx]
})
})

if(userValue){
datasets.push({
label:"내 위치",
data:[{x:userValue,y:2024}],
pointRadius:10,
backgroundColor:"#dc2626"
})
}

railChart=new Chart(document.getElementById("railChart"),{
type:'scatter',
data:{datasets},
options:{
animation:{duration:1200},
scales:{y:{type:'category',labels:[2023,2024,2025]}},
plugins:{legend:{position:'top'}}
}
})
}

function renderTable(univ,types){
let table=document.getElementById("dataTable")
let filtered=data.filter(d=>d["대학명"]===univ&&types.includes(d["전형명"]))
let html="<tr><th>전형</th><th>연도</th><th>모집단위</th><th>70%cut</th></tr>"
filtered.forEach(d=>{
html+=`<tr><td>${d["전형명"]}</td><td>${d["연도"]}</td><td>${d["모집단위"]}</td><td>${d["70%cut"]}</td></tr>`
})
table.innerHTML=html
}
