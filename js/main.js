const width = 1000;
const height = 790;

const map = d3.select("#map").append("svg").attr("width", width).attr("height", height);
const lineChart = dc.compositeChart("#lineChart");

let g = map.append("g").attr("id", "brMap1");

let projection = d3.geoMercator().scale(1000).center([-54, -15]).translate([width / 2, height / 2]);

let path = d3.geoPath().projection(projection);

d3.json("./assets/files/br-states.json").then(
    (br) => {
        g.selectAll("path")
            .data(topojson.feature(br, br.objects.estados).features)
            .enter()
            .append("path")
            .attr("class", "state")
            .attr("d", path);
        
        g.append("path")
            .datum(topojson.mesh(br, br.objects.estados))
            .attr("d", path)
            .attr("class", "state_contour");
    }
);

d3.csv("https://raw.githubusercontent.com/JJBarata/capes_dataset/master/capes_bolsas_dataset.csv").then(
    (data) => {
    let parseDate = d3.timeParse("%Y");
    data.forEach((d) => {
        d.ano = parseDate(+d.ano);
        d.mestrado = +d.mestrado;
        d.doutorado_pleno = +d.doutorado_pleno;
        d.pos_doutorado = +d.pos_doutorado;
    });

    let facts = crossfilter(data);

    facts = crossfilter(data);

    ufDimension = facts.dimension(d => d.uf);

    totalDimension = facts.dimension(d => d.total_linha);

    totalByUfGroup = ufDimension.group().reduceSum(d => d.total_linha);

    yearDimension = facts.dimension(d => d.ano);

    masterGroup = yearDimension.group().reduceSum((d) => d.mestrado);

    doctorateGroup = yearDimension.group().reduceSum((d) => d.doutorado_pleno);

    posDocGroup = yearDimension.group().reduceSum((d) => d.pos_doutorado);

    yearScale = d3.scaleTime().domain([yearDimension.bottom(1)[0].ano, yearDimension.top(1)[0].ano]);

    lineChart
        .width(width)
        .height(450)
        .margins({ top: 15, right: 50, bottom: 75, left: 70 })
        .dimension(yearDimension)
        .x(yearScale)
        .elasticY(true)
        .renderHorizontalGridLines(true)
        .brushOn(false)
        .legend(
        dc
            .legend()
            .horizontal(true)
            .x(width - 310)
            .y(450 - 35)
            .itemHeight(15)
            .itemWidth(90)
            .gap(5)
        )
        .compose([
        dc
            .lineChart(lineChart)
            .group(masterGroup, "Mestrado")
            .ordinalColors(["#FA8775"])
            .curve(d3.curveCardinal),
        dc
            .lineChart(lineChart)
            .group(doctorateGroup, "Doutorado")
            .ordinalColors(["#CD34B5"])
            .curve(d3.curveCardinal),
        dc
            .lineChart(lineChart)
            .group(posDocGroup, "Pós-doutorado")
            .ordinalColors(["#0000FF"])
            .curve(d3.curveCardinal)
        ]);

    dc.renderAll();
});
