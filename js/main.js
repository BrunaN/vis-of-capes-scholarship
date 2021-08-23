const width = 1000;
const height = 790;

const map = d3
  .select('#map')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

let g = map.append('g').attr('id', 'brMap1');

let projection = d3
  .geoMercator()
  .scale(1000)
  .center([-54, -15])
  .translate([width / 2, height / 2]);

let path = d3.geoPath().projection(projection);

let totalByUf = new Map();

let circleScale = d3.scaleLinear().domain([1, 23511]).range([2, 40]);

Promise.all([
  d3.json('./assets/files/br-states.json'),
  d3.csv('./assets/files/count-by-uf-ano.csv', function (d) {
    if (d.ano === '2020') {
      totalByUf.set(d.uf, +d.total_linha);
    }
  }),
]).then(ready);

function ready([br]) {
  g.selectAll('path')
    .data(topojson.feature(br, br.objects.estados).features)
    .enter()
    .append('path')
    .attr('class', 'state')
    .attr('id', (d) => d.id)
    .attr('d', path)
    .on('click', (e, d) => {
      g.selectAll('circle')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .style('fill-opacity', '1');
    });

  g.append('path')
    .datum(topojson.mesh(br, br.objects.estados))
    .attr('d', path)
    .attr('class', 'state_contour');

  g.selectAll('circle')
    .data(topojson.feature(br, br.objects.estados).features)
    .enter()
    .append('circle')
    .attr('transform', (d) => 'translate(' + path.centroid(d) + ')')
    .attr('r', (d) => circleScale(totalByUf.get(d.id)))
    .attr('class', 'circle')
    .attr('id', (d) => d.id)
    .on('click', (e, d) => {
      g.selectAll('.state')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .style('fill', '#333');
    });
}

const lineChart = dc.compositeChart('#lineChart');

d3.csv(
  'https://raw.githubusercontent.com/JJBarata/capes_dataset/master/capes_bolsas_dataset.csv'
).then((data) => {
  let parseDate = d3.timeParse('%Y');
  data.forEach((d) => {
    d.ano = parseDate(+d.ano);
    d.mestrado = +d.mestrado;
    d.doutorado_pleno = +d.doutorado_pleno;
    d.pos_doutorado = +d.pos_doutorado;
  });

  let facts = crossfilter(data);

  facts = crossfilter(data);

  ufDimension = facts.dimension((d) => d.uf);

  totalDimension = facts.dimension((d) => d.total_linha);

  totalByUfGroup = ufDimension.group().reduceSum((d) => d.total_linha);

  yearDimension = facts.dimension((d) => d.ano);

  masterGroup = yearDimension.group().reduceSum((d) => d.mestrado);

  doctorateGroup = yearDimension.group().reduceSum((d) => d.doutorado_pleno);

  posDocGroup = yearDimension.group().reduceSum((d) => d.pos_doutorado);

  yearScale = d3
    .scaleTime()
    .domain([yearDimension.bottom(1)[0].ano, yearDimension.top(1)[0].ano]);

  lineChart
    .width(1116)
    .height(550)
    .margins({ top: 30, right: 50, bottom: 20, left: 70 })
    .dimension(yearDimension)
    .x(yearScale)
    .elasticY(true)
    .renderHorizontalGridLines(true)
    .brushOn(false)
    .compose([
      dc
        .lineChart(lineChart)
        .group(masterGroup, 'Mestrado')
        .ordinalColors(['#FA8775'])
        .curve(d3.curveCardinal),
      dc
        .lineChart(lineChart)
        .group(doctorateGroup, 'Doutorado')
        .ordinalColors(['#CD34B5'])
        .curve(d3.curveCardinal),
      dc
        .lineChart(lineChart)
        .group(posDocGroup, 'Pós-doutorado')
        .ordinalColors(['#0000FF'])
        .curve(d3.curveCardinal),
    ]);

  dc.renderAll();
});
