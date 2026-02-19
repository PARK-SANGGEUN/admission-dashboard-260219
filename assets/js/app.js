
let admission=[], convert=[]
let selectedTypes=[]

Promise.all([
d3.json('data/admission.json'),
d3.json('data/convert.json')
]).then(([a,c])=>{
admission=a
convert=c
init()
})

function init(){
populateUniversities()
d3.select("#g5").on("input",convertGrade)
d3.select("#addType").on("click",addType)
}

function populateUniversities(){
let univs=[...new Set(admission.map(d=>d.univ))]
let sel=d3.select("#univ")
sel.append("option").text("대학 선택")
univs.forEach(u=>sel.append("option").text(u).attr("value",u))
sel.on("change",()=>{
selectedTypes=[]
d3.select("#typeArea").html("")
addType()
})
}

function addType(){
if(selectedTypes.length>=3) return
let univ=d3.select("#univ").property("value")
if(!univ) return
let types=[...new Set(admission.filter(d=>d.univ===univ).map(d=>d.type))]
let sel=d3.select("#typeArea").append("select")
sel.append("option").text("전형 선택")
types.forEach(t=>sel.append("option").text(t).attr("value",t))
sel.on("change",()=>{
selectedTypes=[...document.querySelectorAll("#typeArea select")].map(s=>s.value).filter(v=>v)
drawAll()
updateTable()
})
}

function convertGrade(){
let g=parseFloat(d3.select("#g5").property("value"))
if(isNaN(g)) return
let row=convert.reduce((prev,curr)=>
Math.abs(curr.g5-g)<Math.abs(prev.g5-g)?curr:prev)
d3.select("#busan").html("부산 9등급<br>"+row.busan)
d3.select("#daejin").html("대진대 9등급<br>"+row.daejin)
d3.select("#mix").html("50:50 통합<br>"+row.mix)
}

function drawAll(){
drawBox()
drawRail()
}

function drawBox(){
let svg=d3.select("#boxplot")
svg.selectAll("*").remove()
let width=svg.node().clientWidth
let height=svg.node().clientHeight
let margin=60

let data=admission.filter(d=>selectedTypes.includes(d.type))
if(data.length===0) return

let values=data.map(d=>d.cut70)
let y=d3.scaleLinear()
.domain([d3.min(values)-0.2,d3.max(values)+0.2])
.range([height-margin,margin])

svg.append("g")
.attr("transform","translate(80,0)")
.call(d3.axisLeft(y))

selectedTypes.forEach((type,i)=>{
let vals=data.filter(d=>d.type===type).map(d=>d.cut70).sort(d3.ascending)
let q1=d3.quantile(vals,0.25)
let median=d3.quantile(vals,0.5)
let q3=d3.quantile(vals,0.75)
let min=d3.min(vals)
let max=d3.max(vals)
let x=200+i*200

svg.append("line").attr("x1",x).attr("x2",x)
.attr("y1",y(min)).attr("y2",y(max))
.attr("stroke","black").attr("stroke-width",2)

svg.append("rect")
.attr("x",x-40).attr("width",80)
.attr("y",y(q3)).attr("height",y(q1)-y(q3))
.attr("fill","#6366f1")

svg.append("line")
.attr("x1",x-40).attr("x2",x+40)
.attr("y1",y(median)).attr("y2",y(median))
.attr("stroke","black").attr("stroke-width",3)

svg.append("text")
.attr("x",x).attr("y",height-10)
.attr("text-anchor","middle")
.attr("font-weight","bold")
.text(type)
})
}

function drawRail(){
let svg=d3.select("#rail")
svg.selectAll("*").remove()
let width=svg.node().clientWidth
let height=svg.node().clientHeight
let margin=60

let data=admission.filter(d=>selectedTypes.includes(d.type))
if(data.length===0) return

let x=d3.scaleLinear()
.domain([d3.min(data,d=>d.cut70)-0.2,
d3.max(data,d=>d.cut70)+0.2])
.range([margin,width-margin])

svg.append("g")
.attr("transform","translate(0,"+(height-margin)+")")
.call(d3.axisBottom(x))

let colors={2023:"#3b82f6",2024:"#10b981",2025:"#ef4444"}

svg.selectAll("circle")
.data(data)
.enter()
.append("circle")
.attr("cx",d=>x(d.cut70))
.attr("cy",d=>height-150+(d.year-2023)*40)
.attr("r",6)
.attr("fill",d=>colors[d.year])
}

function updateTable(){
let table=d3.select("#datatable")
table.html("")
let header=table.append("tr")
header.append("th").text("전형")
header.append("th").text("연도")
header.append("th").text("모집단위")
header.append("th").text("70%cut")

admission.filter(d=>selectedTypes.includes(d.type))
.forEach(d=>{
let row=table.append("tr")
row.append("td").text(d.type)
row.append("td").text(d.year)
row.append("td").text(d.major)
row.append("td").text(d.cut70)
})
}
