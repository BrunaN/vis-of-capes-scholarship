const width = 1000;
const height = 790;

let format = d3.timeFormat('%Y');
let parseDate = d3.timeParse('%Y');

let year = parseDate(2020);
let ufSelected;
let ufDimensionForClean;
let br;

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

function updateCircles() {
  g.selectAll('circle').attr('r', (d) =>
    circleScale(totalByUf.get(`${format(year)}/${d.id}`))
  );
}

function showUfSelected(id) {
  const div = d3.select('#ufSelected');
  div.select('#ufSelectedQuant').text(totalByUf.get(`${format(year)}/${id}`));
  div.select('#ufSelectedName').text(ufOptions[id]);
  div.style('display', 'block');
}

function showTooltip(id, x, y) {
  const offset = 10;
  const tooltip = d3.select('.tooltip-map');
  tooltip.select('#count').text(totalByUf.get(`${format(year)}/${id}`));
  tooltip.select('#name').text(ufOptions[id]);
  tooltip.classed('hidden', false);
  const rect = tooltip.node().getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (x + offset + w > width) {
    x = x - w;
  }
  tooltip.style('left', x + offset + 'px').style('top', y - h + 'px');
}

function hideTooltip() {
  d3.select('.tooltip-map').classed('hidden', true);
}

function resetMap() {
  d3.select('#ufSelected').style('display', 'none');
  d3.selectAll('.state').classed('selected-state', false);
  d3.selectAll('.circle').classed('selected-circle', false);
}

function resetAll(e) {
  e.preventDefault();
  ufDimensionForClean.filter(null);
  resetMap();
  dc.filterAll();
  dc.renderAll();
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

let circleScale = d3.scaleLinear().domain([1, 23511]).range([2, 40]);

const compositeChart = dc.compositeChart('#lineChart');
const pieChartLevel = dc.pieChart('#pieChartLevel');
const pieChartStatus = dc.pieChart('#pieChartStatus');
const barChart = dc.barChart('#barChart');

const levelColorScale = d3
  .scaleOrdinal()
  .domain(['mestrado', 'doutorado_pleno', 'pos_doutorado'])
  .range(['#3263FD', '#FEB865', '#D8584E']);

const statusColorScale = d3
  .scaleOrdinal()
  .domain(['Federal', 'Estadual', 'Privada', 'Municipal'])
  .range(['#04A6EA', '#FA8775', '#329694', '#5D5988']);

d3.csv(
  'https://raw.githubusercontent.com/JJBarata/capes_dataset/master/dataset_bolsas_capes.csv'
).then((data) => {
  data.forEach((d) => {
    d.ano = parseDate(+d.ano);
    d.mestrado = +d.mestrado;
    d.doutorado_pleno = +d.doutorado_pleno;
    d.pos_doutorado = +d.pos_doutorado;
    d.regiao = d.regiao;
    d.status_juridico = d.status_juridico;
    d.total_linha = +d.total_linha;
    d.programa = d.programa.toUpperCase();
    d.grande_area = d.grande_area.toUpperCase();
    d.municipio = d.municipio.toUpperCase();
    d.ies = d.ies.toUpperCase();
  });

  let facts = crossfilter(data);

  let ufDimension = facts.dimension((d) => d.uf);
  ufDimensionForClean = ufDimension;

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

    buildMultiLevelChart(yearDimension, year);
    updateCircles();

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

  let regionDimension = facts.dimension((d) => d.regiao);

  let totalByRegionGroup = regionDimension
    .group()
    .reduceSum((d) => +d.total_linha);

  let totalDimension = facts.dimension((d) => +d.total_linha);

  let totalByUfAndYearGroup = ufAndYearGroup.reduceSum((d) => +d.total_linha);

  totalByUfAndYearGroup.top(Infinity).forEach(function (d) {
    totalByUf.set(d.key, +d.value);
  });

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

  compositeChart
    .width(1250)
    .height(550)
    .margins({ top: 50, right: 50, bottom: 20, left: 70 })
    .dimension(yearDimension)
    .x(yearScale)
    .elasticY(true)
    .renderHorizontalGridLines(true)
    .brushOn(false)
    .legend(
      dc
        .legend()
        .y(30)
        .x(70)
        .horizontal(true)
        .highlightSelected(true)
        .itemHeight(15)
        .itemWidth(80)
        .gap(5)
    )
    .compose([
      dc
        .lineChart(compositeChart)
        .group(masterByYearGroup, 'Mestrado')
        .colors(levelColorScale)
        .curve(d3.curveCardinal)
        .renderDataPoints({ radius: 5, fillOpacity: 1 }),
      dc
        .lineChart(compositeChart)
        .group(doctorateByYearGroup, 'Doutorado')
        .colors(levelColorScale)
        .curve(d3.curveCardinal)
        .renderDataPoints({ radius: 5, fillOpacity: 1 }),
      dc
        .lineChart(compositeChart)
        .group(posDocByYearGroup, 'Pós-doutorado')
        .colors(levelColorScale)
        .curve(d3.curveCardinal)
        .renderDataPoints({ radius: 5, fillOpacity: 1 }),
    ]);

  compositeChart.filter = function () {};

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

  barChart
    .height(360)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .elasticY(true)
    .centerBar(false)
    .renderHorizontalGridLines(true)
    .barPadding(0.1)
    .outerPadding(0.05)
    .dimension(regionDimension)
    .group(totalByRegionGroup)
    .margins({ top: 25, right: 20, bottom: 20, left: 70 })
    .ordering(function (d) {
      return -d.value;
    })
    .colorAccessor((d) => d.key)
    .ordinalColors(['#8180B9']);

  dc.renderAll();

  function updateFilters(uf) {
    if (ufSelected === uf) {
      ufSelected = undefined;
      resetMap();
      ufDimension.filter(null);
    } else {
      ufSelected = uf;
      ufDimension.filter(function (d) {
        return uf === d;
      });
    }
    dc.redrawAll();
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

        const rect = this.getBoundingClientRect();
        showTooltip(d.id, rect.x, rect.y);
      })
      .on('mouseout', function (e, d) {
        g.selectAll('circle')
          .filter(function () {
            return d3.select(this).attr('id') === d.id;
          })
          .style('fill-opacity', '0.7');

        hideTooltip();
      })
      .on('click', function (e, d) {
        resetMap();
        d3.select(this).classed('selected-state', true);

        g.selectAll('circle')
          .filter(function () {
            return d3.select(this).attr('id') === d.id;
          })
          .classed('selected-circle', true);

        if (ufSelected !== d.id) {
          showUfSelected(d.id);
        }
        updateFilters(d.id);
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
        const rect = this.getBoundingClientRect();
        showTooltip(d.id, rect.x, rect.y);

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

        hideTooltip();
      })
      .on('click', function (e, d) {
        resetMap();
        d3.select(this).classed('selected-circle', true);

        g.selectAll('.state')
          .filter(function () {
            return d3.select(this).attr('id') === d.id;
          })
          .classed('selected-state', true);

        updateFilters(d.id);
        if (ufSelected !== d.id) {
          showUfSelected(d.id);
        }
      });

    updateCircles();
  });

  select.replaceFilter([[year]]).redrawGroup();
});
