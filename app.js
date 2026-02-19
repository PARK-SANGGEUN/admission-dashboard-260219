// =============================
// 데이터 로드
// =============================

const admissionPromise = fetch("data/admission.json").then(res => {
    if (!res.ok) throw new Error("admission.json 로드 실패");
    return res.json();
});

const convertPromise = fetch("data/convert.json").then(res => {
    if (!res.ok) throw new Error("convert.json 로드 실패");
    return res.json();
});

Promise.all([admissionPromise, convertPromise])
.then(([admissionData, convertData]) => {

    // =============================
    // 등급 변환 기능
    // =============================

    const input = document.getElementById("g5");
    const busanCard = document.getElementById("busan");
    const daejinCard = document.getElementById("daejin");
    const mixCard = document.getElementById("mix");

    input.addEventListener("input", () => {
        const val = parseFloat(input.value);
        if (isNaN(val)) return;

        const busan = convertData.busan[val] || "";
        const daejin = convertData.daejin[val] || "";

        if (busan && daejin) {
            const mix = ((busan + daejin) / 2).toFixed(2);

            busanCard.innerHTML = `부산 9등급<br><strong>${busan}</strong>`;
            daejinCard.innerHTML = `대진대 9등급<br><strong>${daejin}</strong>`;
            mixCard.innerHTML = `50:50 통합<br><strong>${mix}</strong>`;
        }
    });

    // =============================
    // 대학 드롭다운 구성
    // =============================

    const univSelect = document.getElementById("univ");
    const typeContainer = document.getElementById("typeContainer");
    const addBtn = document.getElementById("addType");

    const universities = [...new Set(admissionData.map(d => d.university))];

    universities.forEach(u => {
        const option = document.createElement("option");
        option.value = u;
        option.textContent = u;
        univSelect.appendChild(option);
    });

    let selectedTypes = [];

    addBtn.addEventListener("click", () => {
        const selectedUniv = univSelect.value;
        const types = [...new Set(
            admissionData
            .filter(d => d.university === selectedUniv)
            .map(d => d.type)
        )];

        const select = document.createElement("select");

        types.forEach(t => {
            const option = document.createElement("option");
            option.value = t;
            option.textContent = t;
            select.appendChild(option);
        });

        select.addEventListener("change", drawAll);
        typeContainer.appendChild(select);

        selectedTypes.push(select.value);
        drawAll();
    });

    // =============================
    // 전체 그리기 함수
    // =============================

    function drawAll() {
        const typeSelects = typeContainer.querySelectorAll("select");
        selectedTypes = [...typeSelects].map(s => s.value);

        drawBoxPlot();
        drawTable();
    }

    // =============================
    // 박스플롯
    // =============================

    function drawBoxPlot() {

        const svg = d3.select("#boxplot");
        svg.selectAll("*").remove();

        const width = svg.node().clientWidth;
        const height = 450;

        const margin = { top: 30, right: 40, bottom: 50, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const filtered = admissionData.filter(d =>
            selectedTypes.includes(d.type)
        );

        if (filtered.length === 0) return;

        const years = ["2023", "2024", "2025"];

        const x = d3.scaleBand()
            .domain(years)
            .range([0, innerWidth])
            .padding(0.4);

        const y = d3.scaleLinear()
            .domain([0, 9])
            .range([innerHeight, 0]);

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x));

        g.append("g")
            .call(d3.axisLeft(y));

        years.forEach(year => {
            const yearData = filtered
                .filter(d => d.year === year)
                .map(d => +d.cut70)
                .filter(v => !isNaN(v));

            if (yearData.length === 0) return;

            yearData.sort(d3.ascending);

            const q1 = d3.quantile(yearData, 0.25);
            const median = d3.quantile(yearData, 0.5);
            const q3 = d3.quantile(yearData, 0.75);
            const min = d3.min(yearData);
            const max = d3.max(yearData);

            const center = x(year) + x.bandwidth() / 2;

            // 수염
            g.append("line")
                .attr("x1", center)
                .attr("x2", center)
                .attr("y1", y(min))
                .attr("y2", y(max))
                .attr("stroke", "black")
                .attr("stroke-width", 3);

            // 박스
            g.append("rect")
                .attr("x", center - 40)
                .attr("y", y(q3))
                .attr("width", 80)
                .attr("height", y(q1) - y(q3))
                .attr("fill", "#6d28d9")
                .attr("opacity", 0.7)
                .attr("stroke", "black")
                .attr("stroke-width", 2);

            // 중앙선
            g.append("line")
                .attr("x1", center - 40)
                .attr("x2", center + 40)
                .attr("y1", y(median))
                .attr("y2", y(median))
                .attr("stroke", "black")
                .attr("stroke-width", 3);
        });
    }

    // =============================
    // 데이터 테이블
    // =============================

    function drawTable() {
        const table = document.getElementById("datatable");
        table.innerHTML = "";

        const filtered = admissionData.filter(d =>
            selectedTypes.includes(d.type)
        );

        if (filtered.length === 0) return;

        const header = `
            <tr>
                <th>연도</th>
                <th>전형</th>
                <th>모집단위</th>
                <th>70%컷</th>
            </tr>
        `;

        const rows = filtered.map(d => `
            <tr>
                <td>${d.year}</td>
                <td>${d.type}</td>
                <td>${d.major}</td>
                <td>${d.cut70}</td>
            </tr>
        `).join("");

        table.innerHTML = header + rows;
    }

})
.catch(err => {
    console.error("데이터 로드 실패:", err);
});
