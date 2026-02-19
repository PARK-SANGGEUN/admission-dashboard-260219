
let admission = [];
let convert = [];
let selectedTypes = [];

Promise.all([
  d3.json("data/admission.json"),
  d3.json("data/convert.json")
]).then(([a,c])=>{
  admission = a;
  convert = c;
  init();
});

function init(){
  populateUniversities();
  d3.select("#g5").on("input", convertGrade);
  d3.select("#addType").on("click", addType);
}

function populateUniversities(){
  const univs = [...new Set(admission.map(d=>d.univ))];
  const sel = d3.select("#univ");
  sel.append("option").text("대학 선택");
  univs.forEach(u=>sel.append("option").attr("value",u).text(u));

  sel.on("change", ()=>{
    selectedTypes = [];
    d3.select("#typeContainer").html("");
    addType();
  });
}

function addType(){
  if(selectedTypes.length>=3) return;
  const univ = d3.select("#univ").property("value");
  if(!univ) return;

  const types = [...new Set(admission.filter(d=>d.univ===univ).map(d=>d.type))];
  const sel = d3.select("#typeContainer").append("select");
  sel.append("option").text("전형 선택");
  types.forEach(t=>sel.append("option").attr("value",t).text(t));

  sel.on("change", ()=>{
    selectedTypes = [...document.querySelectorAll("#typeContainer select")]
      .map(s=>s.value).filter(v=>v);
    updateTable();
  });
}

function convertGrade(){
  const g = parseFloat(d3.select("#g5").property("value"));
  if(isNaN(g)) return;

  const row = convert.reduce((prev,curr)=>
    Math.abs(curr.g5-g)<Math.abs(prev.g5-g)?curr:prev
  );

  d3.select("#busan").html("부산 9등급<br>"+row.busan);
  d3.select("#daejin").html("대진대 9등급<br>"+row.daejin);
  d3.select("#mix").html("50:50 통합<br>"+row.mix);
}

function updateTable(){
  const table = d3.select("#datatable");
  table.html("");
  const header = table.append("tr");
  header.append("th").text("전형");
  header.append("th").text("연도");
  header.append("th").text("모집단위");
  header.append("th").text("70%cut");

  admission.filter(d=>selectedTypes.includes(d.type))
    .forEach(d=>{
      const row = table.append("tr");
      row.append("td").text(d.type);
      row.append("td").text(d.year);
      row.append("td").text(d.major);
      row.append("td").text(d.cut70);
    });
}
