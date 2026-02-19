let admission = [];
let convert = [];
let selectedTypes = [];

Promise.all([
  d3.json("data/admission.json"),
  d3.json("data/convert.json")
]).then(([a, c]) => {
  admission = a;
  convert = c;
  init();
});

function init() {
  populateUniversities();
  d3.select("#g5").on("input", convertGrade);
  d3.select("#addType").on("click", addType);
}

/* ------------------ 등급 변환 ------------------ */

function convertGrade() {
  const g = parseFloat(d3.select("#g5").property("value"));
  if (isNaN(g)) return;

  const row = convert.reduce((prev, curr) =>
    Math.abs(curr.g5 - g) < Math.abs(prev.g5 - g) ? curr : prev
  );

  d3.select("#busan").html("부산 9등급<br><strong>" + row.busan + "</strong>");
  d3.select("#daejin").html("대진대 9등급<br><strong>" + row.daejin + "</strong>");
  d3.select("#mix").html("50:50 통합<br><strong>" + row.mix + "</strong>");
}

/* ------------------ 대학 드롭다운 ------------------ */

function populateUniversities() {
  const univs = [...new Set(admission.map(d => d.univ))];
  const sel = d3.select("#univ");

  sel.append("option").text("대학 선택");

  univs.forEach(u =>
    sel.append("option").attr("value", u).text(u)
  );

  sel.on("change", () => {
    selectedTypes = [];
    d3.select("#typeContainer").html("");
  });
}

/* ------------------ 전형 추가 ------------------ */

function addType() {
  if (selectedTypes.length >= 3) return;

  const univ = d3.select("#univ").property("value");
  if (!univ) return;

  const types = [...new Set(
    admission.filter(d => d.univ === univ).map(d => d.type)
  )];

  const sel = d3.select("#typeContainer").append("select");

  sel.append("option").text("전형 선택");

  types.forEach(t =>
    sel.append("option").attr("value", t).text(t)
  );

  sel.on("change", () => {
    selectedTypes = [...document.querySelectorAll("#typeContainer select")]
      .map(s => s.value)
      .filter(v => v);

    updateAll();
  });
}

/* ------------------ 전체 업데이트 ------------------ */

function updateAll() {
  drawBoxplot();
  updateTable();
}

/* ------------------ 박스플롯 ------------------ */

function drawBoxplot() {

  const svg = d3.select("#boxplot");
  svg.selectAll("*").remove();

  const width = svg.node().getBoundingClientRect().width;
  const height = 450;
  svg.attr("height", height);

  const margin = { top: 40, right: 40, bottom: 40, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const data = admission
    .filter(d => selectedTypes.includes(d.type))
    .map(d => ({
      year: d.year,
      value: d.cut70 ?? d.cut50
    }))
    .filter(d => d.value != null);

  if (data.length === 0) return;

  const years = [...new Set(data.map(d => d.year))];

  const x = d3.scaleBand()
    .domain(years)
    .range([0, innerW])
    .padding(0.4);

  const y = d3.scaleLinear()
    .domain([d3.max(data, d => d.value) + 0.5, 0])
    .range([0, innerH]);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  years.forEach(year => {
    const values = data
      .filter(d => d.year === year)
      .map(d => d.value)
      .sort(d3.ascending);

    const q1 = d3.quantile(values, 0.25);
    const median = d3.quantile(values, 0.5);
    const q3 = d3.quantile(values, 0.75);
    const min = d3.min(values);
    const max = d3.max(values);
    const mean = d3.mean(values);

    const center = x(year) + x.bandwidth() / 2;

    // Whisker
    g.append("line")
      .attr("x1", center)
      .attr("x2", center)
      .attr("y1", y(min))
      .attr("y2", y(max))
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // Box
    g.append("rect")
      .attr("x", x(year))
      .attr("y", y(q3))
      .attr("width", x.bandwidth())
      .attr("height", y(q1) - y(q3))
      .attr("fill", "#6d28d9")
      .attr("opacity", 0.6);

    // Median
    g.append("line")
      .attr("x1", x(year))
      .attr("x2", x(year) + x.bandwidth())
      .attr("y1", y(median))
      .attr("y2", y(median))
      .attr("stroke", "white")
      .attr("stroke-width", 3);

    // Mean dot
    g.append("circle")
      .attr("cx", center)
      .attr("cy", y(mean))
      .attr("r", 5)
      .attr("fill", "yellow");
  });
}

/* ------------------ 데이터표 ------------------ */

function updateTable() {

  const table = d3.select("#datatable");
  table.html("");

  const header = table.append("tr");
  header.append("th").text("전형");
  header.append("th").text("연도");
  header.append("th").text("모집단위");
  header.append("th").text("70%cut");

  admission
    .filter(d => selectedTypes.includes(d.type))
    .forEach(d => {
      const row = table.append("tr");
      row.append("td").text(d.type);
      row.append("td").text(d.year);
      row.append("td").text(d.major);
      row.append("td").text(d.cut70 ?? d.cut50);
    });
}
