
let admissionData=[];
let chart;

fetch('./data/admission_data.json')
.then(r=>r.json())
.then(data=>{
    admissionData=data;
    renderChart();
});

function getYearValues(year){
    return admissionData.map(d=>d[year]).filter(v=>typeof v==="number");
}

function stats(values){
    values=values.sort((a,b)=>a-b);
    let q1=values[Math.floor(values.length*0.25)];
    let median=values[Math.floor(values.length*0.5)];
    let q3=values[Math.floor(values.length*0.75)];
    let min=values[0];
    let max=values[values.length-1];
    return {q1,median,q3,min,max};
}

function renderChart(){
    const user=parseFloat(document.getElementById("userValue").value);

    const years=["2023","2024","2025"];
    const colors=["#93c5fd","#86efac","#fca5a5"];

    if(chart) chart.destroy();

    const datasets=[];

    years.forEach((year,i)=>{
        let values=getYearValues(year);
        if(values.length===0) return;
        let s=stats(values);

        // Q1~Q3 박스
        datasets.push({
            type:'bar',
            label:year+" Q1~Q3",
            data:[s.q3-s.q1],
            base:s.q1,
            backgroundColor:colors[i],
        });

        // Median 선
        datasets.push({
            type:'line',
            label:year+" Median",
            data:[s.median],
            borderColor:"#111827",
            borderWidth:3,
            pointRadius:0
        });

        // Whisker
        datasets.push({
            type:'line',
            label:year+" Whisker",
            data:[s.min,s.max],
            borderColor:"#374151",
            borderWidth:2,
            pointRadius:0
        });
    });

    // 사용자 위치 선
    if(!isNaN(user)){
        datasets.push({
            type:'line',
            label:"사용자 위치",
            data:[user,user],
            borderColor:"red",
            borderWidth:3,
            pointRadius:0
        });
    }

    chart=new Chart(document.getElementById("boxChart"),{
        data:{
            labels:["2023","2024","2025"],
            datasets:datasets
        },
        options:{
            responsive:true,
            scales:{
                y:{beginAtZero:false}
            }
        }
    });
}
