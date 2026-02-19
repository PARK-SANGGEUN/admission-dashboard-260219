
let data=[], convertTable=[]
let currentMode="mix"
let selectedTypes=[]
const maxTypes=3

Promise.all([
fetch('./data/admission.json').then(r=>r.json()),
fetch('./data/convert.json').then(r=>r.json())
]).then(([d,c])=>{
data=d; convertTable=c
init()
})

function init(){
populateUniversities()
document.getElementById("grade5").addEventListener("input",autoConvert)
document.querySelectorAll(".toggle button").forEach(btn=>{
btn.onclick=()=>{
document.querySelectorAll(".toggle button").forEach(b=>b.classList.remove("active"))
btn.classList.add("active")
currentMode=btn.dataset.mode
drawAll()
}
})
document.getElementById("addType").onclick=addTypeSelect
addTypeSelect()
}

function populateUniversities(){
const univs=[...new Set(data.map(d=>d["대학명"]))]
let u=document.getElementById("univ")
u.innerHTML="<option value=''>대학 선택</option>"
univs.forEach(x=>{
let o=document.createElement("option")
o.value=x;o.text=x;u.appendChild(o)
})
u.onchange=()=>{selectedTypes=[];drawAll();resetTypeContainer()}
}

function resetTypeContainer(){
document.getElementById("typeContainer").innerHTML=""
addTypeSelect()
}

function addTypeSelect(){
if(selectedTypes.length>=maxTypes) return
let sel=document.createElement("select")
sel.onchange=()=>{
selectedTypes=[...document.querySelectorAll("#typeContainer select")].map(s=>s.value).filter(v=>v)
drawAll()
}
document.getElementById("typeContainer").appendChild(sel)
updateTypeOptions(sel)
}

function updateTypeOptions(sel){
let univ=document.getElementById("univ").value
let types=[...new Set(data.filter(d=>d["대학명"]===univ).map(d=>d["전형명"]))]
sel.innerHTML="<option value=''>전형 선택</option>"
types.forEach(t=>{
let o=document.createElement("option")
o.value=t;o.text=t;sel.appendChild(o)
})
}

function autoConvert(){
let g=parseFloat(document.getElementById("grade5").value)
if(isNaN(g)) return
let row=convertTable.reduce((prev,curr)=>
Math.abs(curr["5등급 평균"]-g)<Math.abs(prev["5등급 평균"]-g)?curr:prev)
document.getElementById("busan").innerHTML="부산 9등급<br>"+row["부산 9등급"]
document.getElementById("daejin").innerHTML="대진대 9등급<br>"+row["대진대 9등급(평균)"]
document.getElementById("mix").innerHTML="50:50 통합<br>"+row["50:50 통합"]
drawAll()
}

function drawAll(){
drawBox()
drawRail()
}

function drawBox(){
let canvas=document.getElementById("boxCanvas")
let ctx=canvas.getContext("2d")
canvas.width=canvas.offsetWidth
canvas.height=canvas.offsetHeight
ctx.clearRect(0,0,canvas.width,canvas.height)
ctx.font="bold 16px Arial"

let univ=document.getElementById("univ").value
if(!univ||selectedTypes.length===0) return

selectedTypes.forEach((type,i)=>{
let values=data.filter(d=>d["대학명"]===univ&&d["전형명"]===type)
.map(d=>d["70%cut"])
if(values.length===0) return
values.sort((a,b)=>a-b)
let min=values[0], max=values[values.length-1]
let q1=values[Math.floor(values.length*0.25)]
let median=values[Math.floor(values.length*0.5)]
let q3=values[Math.floor(values.length*0.75)]

let x=100+i*200
let scale=40
let baseY=350

ctx.strokeStyle="#111"
ctx.beginPath()
ctx.moveTo(x,baseY-min*scale)
ctx.lineTo(x,baseY-max*scale)
ctx.stroke()

ctx.fillStyle="#6366f1"
ctx.fillRect(x-30,baseY-q3*scale,60,(q3-q1)*scale)

ctx.strokeStyle="#000"
ctx.beginPath()
ctx.moveTo(x-30,baseY-median*scale)
ctx.lineTo(x+30,baseY-median*scale)
ctx.stroke()

ctx.fillStyle="#000"
ctx.fillText(type,x-40,baseY+30)
})
}

function drawRail(){
let canvas=document.getElementById("railCanvas")
let ctx=canvas.getContext("2d")
canvas.width=canvas.offsetWidth
canvas.height=canvas.offsetHeight
ctx.clearRect(0,0,canvas.width,canvas.height)
ctx.font="bold 14px Arial"

let univ=document.getElementById("univ").value
if(!univ||selectedTypes.length===0) return

selectedTypes.forEach((type,i)=>{
let values=data.filter(d=>d["대학명"]===univ&&d["전형명"]===type)
values.forEach(d=>{
let x=50+d["70%cut"]*60
let y=100+(d["연도"]-2023)*100+i*20
ctx.fillStyle="#111"
ctx.beginPath()
ctx.arc(x,y,6,0,Math.PI*2)
ctx.fill()
})
})
}
