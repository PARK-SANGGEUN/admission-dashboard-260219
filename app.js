Promise.all([
  fetch("data/admission.json").then(r=>r.json()),
  fetch("data/convert.json").then(r=>r.json())
]).then(([admissionData, convertData])=>{

let selectedUniversity;
let userGradeValue;

const slider = document.getElementById("gradeSlider");
const gradeValue = document.getElementById("gradeValue");
const busanValue = document.getElementById("busanValue");
const daejinValue = document.getElementById("daejinValue");
const mixValue = document.getElementById("mixValue");

slider.addEventListener("input",()=>{
  const val = parseFloat(slider.value).toFixed(2);
  gradeValue.textContent = val;
  userGradeValue = null;

  const b = convertData.busan[val];
  const d = convertData.daejin[val];

  if(b && d){
    const m = ((b+d)/2).toFixed(2);
    busanValue.textContent = b;
    daejinValue.textContent = d;
    mixValue.textContent = m;
    userGradeValue = parseFloat(m);
  }

  if(selectedUniversity) renderRail();
});

const univSelect = document.getElementById("univSelect");
const universities = [...new Set(admissionData.map(d=>d.university))];

universities.forEach(u=>{
  const option=document.createElement("option");
  option.value=u;
  option.textContent=u;
  univSelect.appendChild(option);
});

selectedUniversity = universities[0];

univSelect.addEventListener("change",()=>{
  selectedUniversity = univSelect.value;
  renderRail();
});

renderRail();

function renderRail(){

  const wrapper = d3.select("#railContainer");
  wrapper.html("");

  const width = 1400;
  const height = 140;

  const years = ["2024","2025","2026"];

  const yearColor = {
    "2024": "#2563eb",
    "2025": "#16a34a",
    "2026": "#dc2626"
  };

  const filtered = admissionData.filter(d =>
    d.university === selectedUniversity &&
    !isNaN(d.cut70)
  );

  if(filtered.length === 0) return;

  const xMin = d3.min(filtered, d=>+d.cut70);
  const xMax = d3.max(filtered, d=>+d.cut70);

  const xScale = d3.scaleLinear()
    .domain([xMin-0.05, xMax+0.05])
    .range([80, width-40]);

  const svg = wrapper.append("svg")
    .attr("width", width)
    .attr("height", height*years.length);

  svg.append("g")
    .attr("transform","translate(0,30)")
    .call(d3.axisTop(xScale).ticks(10));

  years.forEach((year, i)=>{

    const yPosition = 60 + (i * height);

    svg.append("text")
      .attr("x", 30)
      .attr("y", yPosition+5)
      .attr("font-size", "18px")
      .attr("font-weight", "900")
      .attr("fill", yearColor[year])
      .text(year);

    const yearData = filtered
      .filter(d=>d.year===year)
      .map(d=>({
        major: d.major,
        value: +d.cut70
      }));

    const group = svg.append("g");

    group.selectAll("circle")
      .data(yearData)
      .enter()
      .append("circle")
      .attr("cx", d=>xScale(d.value))
      .attr("cy", yPosition)
      .attr("r", 6)
      .attr("fill", yearColor[year]);

    const sorted = [...yearData].sort((a,b)=>a.value-b.value);

    const fixed = [
      ...sorted.slice(0,3),
      ...sorted.slice(Math.floor(sorted.length/2)-1, Math.floor(sorted.length/2)+2),
      ...sorted.slice(-3)
    ];

    const labels = group.selectAll(".label")
      .data(fixed)
      .enter()
      .append("text")
      .attr("font-size", "12px")
      .attr("font-weight", "700")
      .attr("fill", "#111")
      .text(d=>`${d.major} ${d.value.toFixed(2)}`);

    const simulation = d3.forceSimulation(fixed)
      .force("x", d3.forceX(d=>xScale(d.value)).strength(1))
      .force("y", d3.forceY(yPosition-18))
      .force("collide", d3.forceCollide(35))
      .stop();

    for(let j=0;j<120;j++) simulation.tick();

    labels
      .attr("x", d=>d.x)
      .attr("y", d=>d.y)
      .attr("text-anchor","middle");

    const tooltip = d3.select("body")
      .append("div")
      .attr("class","tooltip")
      .style("display","none");

    group.selectAll("circle")
      .on("mouseover",(event,d)=>{
        tooltip
          .html(`${d.major}<br>${d.value.toFixed(2)}`)
          .style("left",(event.pageX+10)+"px")
          .style("top",(event.pageY-20)+"px")
          .style("display","block");
      })
      .on("mouseout",()=>tooltip.style("display","none"));

  });

  if(userGradeValue){
    svg.append("line")
      .attr("x1", xScale(userGradeValue))
      .attr("x2", xScale(userGradeValue))
      .attr("y1", 30)
      .attr("y2", height*years.length)
      .attr("stroke","red")
      .attr("stroke-width",3)
      .attr("stroke-dasharray","6,4");
  }
}

});
