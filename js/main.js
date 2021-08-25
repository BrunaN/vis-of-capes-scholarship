const width = 1000;
const height = 790;

const ufOptions = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
};

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

function showTooltip(id, x, y) {
  const offset = 10;
  const tooltip = d3.select('.tooltip-map');
  tooltip.select('#count').text(totalByUf.get(id));
  tooltip.select('#name').text(ufOptions[id]);
  tooltip.classed('hidden', false);
  const rect = tooltip.node().getBoundingClientRect();
  const h = rect.height;
  tooltip.style('left', x + offset + 'px').style('top', y - h + 'px');
}

function hideTooltip() {
  d3.select('.tooltip-map').classed('hidden', true);
}

Promise.all([
  d3.json('./assets/files/br-states.json'),
  d3.csv('./assets/files/count-by-uf-ano.csv', function (d) {
    if (d.ano === '2020') {
      totalByUf.set(d.uf, +d.total_linha);
    }
  }),
]).then(ready);

function resetMap() {
  d3.selectAll('.state').classed('selected-state', false);
  d3.selectAll('.circle').classed('selected-circle', false);
}

function ready([br]) {
  g.selectAll('path')
    .data(topojson.feature(br, br.objects.estados).features)
    .enter()
    .append('path')
    .attr('class', 'state')
    .attr('id', (d) => d.id)
    .attr('d', path)
    .on('mouseover', function (e, d) {
      g.selectAll('circle')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .style('fill-opacity', '1');
    })
    .on('mouseout', function (e, d) {
      g.selectAll('circle')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .style('fill-opacity', '0.6');
    })
    .on('click', function (e, d) {
      resetMap();
      d3.select(this).classed('selected-state', true);

      g.selectAll('circle')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .classed('selected-circle', true);

      showTooltip(d.id, e.x, e.y);
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
    .on('mouseover', function (e, d) {
      g.selectAll('.state')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .style('fill', '#333');
    })
    .on('mouseout', function (e, d) {
      g.selectAll('.state')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .style('fill', 'transparent');
    })
    .on('click', function (e, d) {
      resetMap();
      d3.select(this).classed('selected-circle', true);

      g.selectAll('.state')
        .filter(function () {
          return d3.select(this).attr('id') === d.id;
        })
        .classed('selected-state', true);

      showTooltip(d.id, e.x, e.y);
    });
}

const lineChart = dc.compositeChart('#lineChart');
const pieChartLevel = dc.pieChart('#pieChartLevel');
const pieChartStatus = dc.pieChart('#pieChartStatus');

function regroup(dimension, columns) {
  let _groupAll = dimension.groupAll().reduce(
    function (p, v) {
      columns.forEach(function (c) {
        p[c] += v[c];
      });
      return p;
    },
    function (p, v) {
      columns.forEach(function (c) {
        p[c] -= v[c];
      });
      return p;
    },
    function () {
      let p = {};
      columns.forEach(function (c) {
        p[c] = 0;
      });
      return p;
    }
  );
  return {
    all: function () {
      let data = [];
      for (let [key, value] of Object.entries(_groupAll.value())) {
        data.push({ key: key, value, value });
      }
      return data;
    },
  };
}

levelColorScale = d3
  .scaleOrdinal()
  .domain(['mestrado', 'doutorado_pleno', 'pos_doutorado'])
  .range(['#3263FD', '#FEB865', '#D8584E']);

statusColorScale = d3
  .scaleOrdinal()
  .domain(['Federal', 'Estadual', 'Privada', 'Municipal'])
  .range(['#04A6EA', '#FA8775', '#329694', '#5D5988']);

d3.csv(
  'https://raw.githubusercontent.com/JJBarata/capes_dataset/master/dataset_bolsas_capes.csv'
).then((data) => {
  let parseDate = d3.timeParse('%Y');
  data.forEach((d) => {
    d.ano = parseDate(+d.ano);
    d.mestrado = +d.mestrado;
    d.doutorado_pleno = +d.doutorado_pleno;
    d.pos_doutorado = +d.pos_doutorado;
    d.status_juridico = d.status_juridico;
  });

  let facts = crossfilter(data);

  ufDimension = facts.dimension((d) => d.uf);

  totalDimension = facts.dimension((d) => +d.total_linha);

  totalByUfGroup = ufDimension.group().reduceSum((d) => d.total_linha);

  yearDimension = facts.dimension((d) => d.ano);

  masterByYearGroup = yearDimension.group().reduceSum((d) => d.mestrado);

  doctorateByYearGroup = yearDimension
    .group()
    .reduceSum((d) => d.doutorado_pleno);

  posDocByYearGroup = yearDimension.group().reduceSum((d) => d.pos_doutorado);

  levelsDimension = facts.dimension(function (d) {
    return d;
  });

  levelsGroup = regroup(levelsDimension, [
    'mestrado',
    'doutorado_pleno',
    'pos_doutorado',
  ]);

  statusDimension = facts.dimension((d) => d.status_juridico);
  statusGroup = statusDimension.group().reduceCount();

  yearScale = d3
    .scaleTime()
    .domain([yearDimension.bottom(1)[0].ano, yearDimension.top(1)[0].ano]);

  lineChart
    .width(1250)
    .height(550)
    .margins({ top: 50, right: 50, bottom: 20, left: 70 })
    .dimension(yearDimension)
    .x(yearScale)
    .elasticY(true)
    .renderHorizontalGridLines(true)
    .brushOn(false)
    .compose([
      dc
        .lineChart(lineChart)
        .group(masterByYearGroup, 'Mestrado')
        .colors(levelColorScale)
        .curve(d3.curveCardinal)
        .renderDataPoints({ radius: 5, fillOpacity: 1 }),
      dc
        .lineChart(lineChart)
        .group(doctorateByYearGroup, 'Doutorado')
        .colors(levelColorScale)
        .curve(d3.curveCardinal)
        .renderDataPoints({ radius: 5, fillOpacity: 1 }),
      dc
        .lineChart(lineChart)
        .group(posDocByYearGroup, 'Pós-doutorado')
        .colors(levelColorScale)
        .curve(d3.curveCardinal)
        .renderDataPoints({ radius: 5, fillOpacity: 1 }),
    ]);

  pieChartLevel
    .width(400)
    .height(400)
    .dimension(levelsDimension)
    .group(levelsGroup)
    .innerRadius(100)
    .colors(levelColorScale)
    .on('pretransition', function (chart) {
      chart.selectAll('text.pie-slice').text(function (d) {
        return (
          dc.utils.printSingleValue(
            ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100
          ) + '%'
        );
      });
    });

  pieChartLevel.filterHandler(function (dim, filters) {
    if (filters && filters.length)
      levelsDimension.filterFunction(function (r) {
        return filters.some(function (c) {
          return r[c] > 0;
        });
      });
    else dim.filterAll();
    return filters;
  });

  pieChartStatus
    .width(400)
    .height(400)
    .dimension(statusDimension)
    .group(statusGroup)
    .innerRadius(100)
    .colors(statusColorScale)
    .on('pretransition', function (chart) {
      chart.selectAll('text.pie-slice').text(function (d) {
        return (
          dc.utils.printSingleValue(
            ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100
          ) + '%'
        );
      });
    });

  dc.renderAll();
});
