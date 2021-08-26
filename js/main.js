const width = 1000;
const height = 790;

let format = d3.timeFormat('%Y');
let parseDate = d3.timeParse('%Y');

let year = parseDate(2020);
let ufSelected;
let br;

let circleScale = d3.scaleLinear().domain([1, 23511]).range([2, 40]);

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

const levelsOptions = {
  mestrado: 'Mestrado',
  doutorado_pleno: 'Doutorado',
  pos_doutorado: 'Pós-doutorado',
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

function showTooltip(id, x, y) {
  const offset = 10;
  const tooltip = d3.select('.tooltip-map');
  tooltip.select('#count').text(totalByUf.get(`${format(year)}/${id}`));
  tooltip.select('#name').text(ufOptions[id]);
  tooltip.classed('hidden', false);
  const rect = tooltip.node().getBoundingClientRect();
  const h = rect.height;
  tooltip.style('left', x + offset + 'px').style('top', y - h + 'px');
}

function hideTooltip() {
  d3.select('.tooltip-map').classed('hidden', true);
}

function resetMap() {
  d3.selectAll('.state').classed('selected-state', false);
  d3.selectAll('.circle').classed('selected-circle', false);
}

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

const lineChart = dc.compositeChart('#lineChart');
const pieChartLevel = dc.pieChart('#pieChartLevel');
const pieChartStatus = dc.pieChart('#pieChartStatus');

const levelColorScale = d3
  .scaleOrdinal()
  .domain(['mestrado', 'doutorado_pleno', 'pos_doutorado'])
  .range(['#3263FD', '#FEB865', '#D8584E']);

const statusColorScale = d3
  .scaleOrdinal()
  .domain(['Federal', 'Estadual', 'Privada', 'Municipal'])
  .range(['#04A6EA', '#FA8775', '#329694', '#5D5988']);

// Promise.all([
//   d3.json('./assets/files/br-states.json'),
//   d3.csv('https://raw.githubusercontent.com/JJBarata/capes_dataset/master/dataset_bolsas_capes.csv'),
// ]).then(
//   (a, 2) => {console.log(1,2)}
// );

d3.csv(
  'https://raw.githubusercontent.com/JJBarata/capes_dataset/master/dataset_bolsas_capes.csv'
).then((data) => {
  data.forEach((d) => {
    d.ano = parseDate(+d.ano);
    d.mestrado = +d.mestrado;
    d.doutorado_pleno = +d.doutorado_pleno;
    d.pos_doutorado = +d.pos_doutorado;
    d.status_juridico = d.status_juridico;
  });

  let facts = crossfilter(data);

  let ufDimension = facts.dimension((d) => d.uf);

  let yearDimension = facts.dimension((d) => d.ano);

  let yearGroup = yearDimension.group();

  select = dc
    .selectMenu('#menuselect')
    .dimension(yearDimension)
    .group(yearGroup)
    .promptText('De 2003 até 2020')
    .title(function (d) {
      return format(d.key);
    })
    .controlsUseVisibility(true);

  var oldHandler = select.filterHandler();
  select.filterHandler(function (dimension, filters) {
    var parseFilters = filters.map(function (d) {
      year = new Date(d);
      return new Date(d);
    });

    ready();

    oldHandler(dimension, parseFilters);
    return filters;
  });

  let masterByYearGroup = yearDimension.group().reduceSum((d) => d.mestrado);

  let doctorateByYearGroup = yearDimension
    .group()
    .reduceSum((d) => d.doutorado_pleno);

  let posDocByYearGroup = yearDimension
    .group()
    .reduceSum((d) => d.pos_doutorado);

  let ufAndYearDimension = facts.dimension(function (d) {
    return `${format(d.ano)}/${d.uf}`;
  });

  ufAndYearGroup = ufAndYearDimension.group();

  let totalDimension = facts.dimension((d) => +d.total_linha);

  let totalByUfAndYearGroup = ufAndYearGroup.reduceSum((d) => +d.total_linha);

  totalByUfAndYearGroup.top(Infinity).forEach(function (d) {
    totalByUf.set(d.key, +d.value);
  });

  console.log(totalByUf.get(`${format(year)}/${'SP'}`));

  let levelsDimension = facts.dimension(function (d) {
    return d;
  });

  let levelsGroup = regroup(levelsDimension, [
    'mestrado',
    'doutorado_pleno',
    'pos_doutorado',
  ]);

  let statusDimension = facts.dimension((d) => d.status_juridico);

  let statusGroup = statusDimension.group().reduceCount();

  const yearScale = d3
    .scaleTime()
    .domain([yearDimension.bottom(1)[0].ano, yearDimension.top(1)[0].ano]);

  lineChart
    .width(1250)
    .height(550)
    .margins({ top: 50, right: 50, bottom: 20, left: 70 })
    .dimension(yearDimension)
    .x(yearScale)
    .elasticY(false)
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

  lineChart.filter = function () {};

  pieChartLevel
    .width(300)
    .height(360)
    .dimension(levelsDimension)
    .group(levelsGroup)
    .innerRadius(75)
    .colors(levelColorScale)
    .legend(
      dc
        .legend()
        .y(345)
        .x(28)
        .horizontal(true)
        .highlightSelected(true)
        .itemHeight(15)
        .itemWidth(80)
        .gap(5)
        .legendText(function (d, i) {
          return levelsOptions[d.name];
        })
    )
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
    .width(300)
    .height(360)
    .dimension(statusDimension)
    .group(statusGroup)
    .innerRadius(75)
    .colors(statusColorScale)
    .legend(
      dc
        .legend()
        .y(345)
        .x(15)
        .horizontal(true)
        .highlightSelected(true)
        .itemHeight(15)
        .itemWidth(70)
        .gap(5)
    )
    .on('pretransition', function (chart) {
      chart.selectAll('text.pie-slice').text(function (d) {
        return (
          dc.utils.printSingleValue(
            ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100
          ) + '%'
        );
      });
    });

  // function updateFilters() {
  //   yearDimension.filter(function (d) {
  //     return d === parseDate(2020);
  //   });

  //   dc.redrawAll();
  // }

  if (ufSelected) {
    console.log(ufSelected)
    ufDimension.filter(function (d) {
      return ufSelected === d;
    });
    dc.redrawAll();
  }

  dc.renderAll();

  console.log(totalByUf);

  select.replaceFilter([[year]]).redrawGroup();
});

function ready() {
  g.selectAll('circle').attr('r', (d) =>
    circleScale(totalByUf.get(`${format(year)}/${d.id}`))
  );
}

d3.json('./assets/files/br-states.json').then((data) => {
  br = data;
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
        .style('fill-opacity', '0.7');
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

      ufSelected(d.id);
    });
});
