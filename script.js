const YEAR_COLOR = {2024:"#1d4ed8", 2025:"#16a34a", 2026:"#dc2626"};
const YEARS = [2024,2025,2026];

let USER_VALUE = null;
let CONVERT = null;
let DATA_GLOBAL = null;

const TOOLTIP = document.getElementById("tooltip");
const gradeSlider = document.getElementById("gradeSlider");
const gradeValue = document.getElementById("gradeValue");

fetch("convert.json")
  .then(r=>r.json())
  .then(data=>CONVERT=data);

fetch("data.json")
  .then(r=>r.json())
  .then(DATA=>{
    DATA_GLOBAL = DATA;

    const sel = document.getElementById("collegeSelect");
    const colleges = Object.keys(DATA).sort((a,b)=>a.localeCompare(b,'ko'));
    sel.innerHTML = colleges.map(c=>`<option>${c}</option>`).join("");
    sel.value = colleges[0];

    sel.addEventListener("change", ()=>renderCollege(DATA_GLOBAL, sel.value));
    renderCollege(DATA_GLOBAL, sel.value);
  });

gradeSlider.addEventListener("input", ()=>{
  const v = parseFloat(gradeSlider.value).toFixed(2);
  gradeValue.textContent = v;

  if(CONVERT && CONVERT.mix && CONVERT.mix[v]){
    USER_VALUE = CONVERT.mix[v];
  }else{
    USER_VALUE = null;
  }

  const sel = document.getElementById("collegeSelect");
  if(DATA_GLOBAL) renderCollege(DATA_GLOBAL, sel.value);
});

function renderCollege(DATA, college){
  const rails = document.getElementById("rails");
  rails.innerHTML = "";

  const tracks = DATA[college].tracks;

  tracks.forEach(tr=>{
    const card = document.createElement("section");
    card.className="railCard";

    const header = document.createElement("div");
    header.className="railHeader";

    const title = document.createElement("div");
    title.className="railTitle";
    title.textContent = tr.name;

    header.appendChild(title);
    card.appendChild(header);

    const viewport = document.createElement("div");
    viewport.className="railViewport";

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");

    const W=1600,H=280,left=120,right=60;
    const innerW=W-left-right;
    svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    svg.setAttribute("width","100%");
    svg.setAttribute("height",H);

    const pts=tr.points;
    const values=pts.map(p=>p.value);
    let vmin=Math.min(...values), vmax=Math.max(...values);
    const pad=(vmax-vmin)*0.08;
    vmin-=pad; vmax+=pad;

    const xScale=v=>left+((v-vmin)/(vmax-vmin))*innerW;

    YEARS.forEach(y=>{
      const y0 = y===2024?70:y===2025?150:230;
      svg.appendChild(mkLine(left,y0,W-right,y0,"laneLine"));
      svg.appendChild(mkText(y,20,y0+6,"yearText"));
    });

    if(USER_VALUE){
      const ux=xScale(USER_VALUE);
      const line=mkLine(ux,40,ux,H-20,null);
      line.setAttribute("stroke","red");
      line.setAttribute("stroke-width","4");
      line.setAttribute("stroke-dasharray","8,6");
      svg.appendChild(line);
    }

    pts.forEach(p=>{
      const x=xScale(p.value);
      const y0=p.year===2024?70:p.year===2025?150:230;
      const dot=mkCircle(x,y0,8,YEAR_COLOR[p.year]);
      dot.addEventListener("mousemove",e=>{
        TOOLTIP.style.display="block";
        TOOLTIP.style.left=(e.clientX+12)+"px";
        TOOLTIP.style.top=(e.clientY-12)+"px";
        TOOLTIP.innerHTML=`${p.unit}<br>${p.value}`;
      });
      dot.addEventListener("mouseleave",()=>TOOLTIP.style.display="none");
      svg.appendChild(dot);
    });

    viewport.appendChild(svg);
    card.appendChild(viewport);
    rails.appendChild(card);
  });
}

function mkLine(x1,y1,x2,y2,cls){
  const el=document.createElementNS("http://www.w3.org/2000/svg","line");
  el.setAttribute("x1",x1); el.setAttribute("y1",y1);
  el.setAttribute("x2",x2); el.setAttribute("y2",y2);
  if(cls) el.setAttribute("class",cls);
  return el;
}
function mkCircle(cx,cy,r,fill){
  const el=document.createElementNS("http://www.w3.org/2000/svg","circle");
  el.setAttribute("cx",cx); el.setAttribute("cy",cy);
  el.setAttribute("r",r);
  el.setAttribute("fill",fill);
  return el;
}
function mkText(txt,x,y,cls){
  const el=document.createElementNS("http://www.w3.org/2000/svg","text");
  el.textContent=txt;
  el.setAttribute("x",x); el.setAttribute("y",y);
  if(cls) el.setAttribute("class",cls);
  return el;
}
