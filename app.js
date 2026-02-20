const ADMISSION_URL="./data/admission_full.json";
const CONVERT_URL="./data/convert_full.json";

const YEARS=[2023,2024,2025];
const YEAR_COLOR={2023:"#dc2626",2024:"#2563eb",2025:"#16a34a"};

const $college=document.getElementById("collegeSelect");
const $rails=document.getElementById("rails");
const $gradeSlider=document.getElementById("gradeSlider");
const $gradeInput=document.getElementById("gradeInput");
const $busanVal=document.getElementById("busanVal");
const $daejinVal=document.getElementById("daejinVal");
const $mixVal=document.getElementById("mixVal");
const $heroTitle=document.getElementById("heroTitle");
const $heroDesc=document.getElementById("heroDesc");

let ADMISSION=null;
let CONVERT=null;
let COLLEGE_MAP=null;
let getConverted=null;

function fmt(n){
  if(!Number.isFinite(n))return"-";
  return n.toFixed(2);
}

function buildConvertGetter(data){
  return function(five){
    const row=data.find(r=>Number(r["5등급 평균"])===Number(five.toFixed(2)));
    if(!row)return{busan:NaN,daejin:NaN,mix:NaN};
    return{
      busan:Number(row["부산 9등급"]),
      daejin:Number(row["대진대 9등급(평균)"]),
      mix:Number(row["50:50 통합"])
    };
  }
}

function normalize(rows){
  return rows.map(r=>({
    year:Number(r.year),
    college:r["대학명"],
    center:r["중심전형"]||r["전형구분"]||r["전형"]||"기타",
    type:r["전형명"],
    unit:r["모집단위"],
    cut70:Number(r["70%cut"]),
    cut50:Number(r["50%cut"])
  }));
}

function buildCollegeMap(rows){
  const map={};
  rows.forEach(r=>{
    if(!map[r.college])map[r.college]=[];
    map[r.college].push(r);
  });
  return map;
}

function applyConverted(){
  const five=Number($gradeInput.value);
  const {busan,daejin,mix}=getConverted(five);
  $busanVal.textContent=fmt(busan);
  $daejinVal.textContent=fmt(daejin);
  $mixVal.textContent=fmt(mix);

  $heroDesc.innerHTML=
  `환산등급(50:50 통합): <span style="color:#ef4444;font-size:18px;font-weight:900">${fmt(mix)}</span>`;

  return mix;
}

function render(college){
  const rows=COLLEGE_MAP[college];
  $rails.innerHTML="";
  $heroTitle.textContent=`${college} 전형별 모집단위 산포도 레일 (3개년 비교)`;

  const centers=[...new Set(rows.map(r=>r.center))];

  centers.forEach(center=>{
    const card=document.createElement("div");
    card.className="railCard";
    card.innerHTML=`<h3>${center}</h3>`;
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 1600 280");
    svg.setAttribute("width","100%");
    svg.setAttribute("height","280");

    const data=rows.filter(r=>r.center===center);
    const values=data.map(r=>r.cut70||r.cut50).filter(v=>v);
    const min=Math.min(...values);
    const max=Math.max(...values);

    function x(v){return 120+(v-min)/(max-min)*1300;}

    YEARS.forEach((y,i)=>{
      const yPos=70+i*80;
      const yearData=data.filter(r=>r.year===y);

      yearData.forEach(r=>{
        const val=r.cut70||r.cut50;
        if(!val)return;
        const cx=x(val);
        const circle=document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx",cx);
        circle.setAttribute("cy",yPos);
        circle.setAttribute("r",8);
        circle.setAttribute("fill",YEAR_COLOR[y]);
        circle.setAttribute("class","dot");
        svg.appendChild(circle);

        const text=document.createElementNS("http://www.w3.org/2000/svg","text");
        text.setAttribute("x",cx);
        text.setAttribute("y",yPos-12);
        text.setAttribute("text-anchor","middle");
        text.setAttribute("font-size","12");
        text.setAttribute("font-weight","900");
        text.textContent=r.unit;
        svg.appendChild(text);
      });

      const label=document.createElementNS("http://www.w3.org/2000/svg","text");
      label.setAttribute("x",20);
      label.setAttribute("y",yPos+4);
      label.setAttribute("fill",YEAR_COLOR[y]);
      label.setAttribute("font-weight","900");
      label.textContent=y;
      svg.appendChild(label);
    });

    const userVal=applyConverted();
    const ux=x(userVal);
    const line=document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1",ux);
    line.setAttribute("x2",ux);
    line.setAttribute("y1",40);
    line.setAttribute("y2",260);
    line.setAttribute("stroke","#ef4444");
    line.setAttribute("stroke-width","4");
    line.setAttribute("stroke-dasharray","10,6");
    svg.appendChild(line);

    card.appendChild(svg);
    $rails.appendChild(card);
  });
}

async function init(){
  const [a,c]=await Promise.all([
    fetch(ADMISSION_URL).then(r=>r.json()),
    fetch(CONVERT_URL).then(r=>r.json())
  ]);

  ADMISSION=normalize(a);
  CONVERT=c;
  getConverted=buildConvertGetter(CONVERT);
  COLLEGE_MAP=buildCollegeMap(ADMISSION);

  const colleges=Object.keys(COLLEGE_MAP);
  $college.innerHTML=colleges.map(c=>`<option>${c}</option>`).join("");

  $college.addEventListener("change",()=>render($college.value));
  $gradeSlider.addEventListener("input",()=>{
    $gradeInput.value=$gradeSlider.value;
    render($college.value);
  });
  $gradeInput.addEventListener("input",()=>{
    $gradeSlider.value=$gradeInput.value;
    render($college.value);
  });

  render(colleges[0]);
}

init();
