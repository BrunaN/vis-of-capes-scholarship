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

function updateCircles() {
  g.selectAll('circle').attr('r', (d) =>
    circleScale(totalByUf.get(`${format(year)}/${d.id}`))
  );
}

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

color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 12));

function get_name(data, depth) {
  if (depth == 0) return data.grande_area;
  else if (depth == 1) return data.regiao;
  else if (depth == 2) return data.ies;
  else if (depth == 3) return data.programa;
}

function tree_generator(data, tree, depth) {
  //depht: 0)grande área > 1)região > 2)ies > 3)programa > 4)tipos de bolsa
  let flag = [false, false, false, false, false];
  let size = 3;

  if (depth > size + 1) return;

  for (const node of tree.children) {
    switch (depth + '-' + node.name) {
      case 0 + '-' + data.grande_area:
      case 1 + '-' + data.regiao:
      case 2 + '-' + data.ies:
      case 3 + '-' + data.programa:
        flag[depth] = true;
        tree_generator(data, node, ++depth);
        return;
      case 4 + '-doutorado_pleno':
        node.value += data.doutorado_pleno;
        flag[depth] = true;
        break;
      case 4 + '-mestrado':
        node.value += data.mestrado;
        flag[depth] = true;
        break;
      case 4 + '-pos_doutorado':
        node.value += data.pos_doutorado;
        flag[depth] = true;
        break;
    }
  }

  if (!flag[depth]) {
    if (depth < size) {
      tree.children.push({
        name: get_name(data, depth),
        children: [],
      });
    } else
      tree.children.push({
        name: get_name(data, depth),
        children: [
          { name: 'doutorado_pleno', value: 0 },
          { name: 'mestrado', value: 0 },
          { name: 'pos_doutorado', value: 0 },
        ],
      });
    tree_generator(data, tree.children[tree.children.length - 1], ++depth);
    return;
  }
}

function get_tree(d) {
  console.log(d);
  let tree = {
    name: 'BOLSAS DE FOMENTO À PESQUISA',
    children: [],
  };
  console.log(tree);
  for (const node of d) {
    tree_generator(node, tree, 0);
  }
  return tree;
}

function hierarchy(data) {
  const root = d3
    .hierarchy(data)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);
  return root;
}

function prune_tree(tree, total) {
  if (!tree.children) return;
  if (!tree.children[0].children) return;
  let trashold = 0.05;
  let min = Math.min(tree.children.length, trashold);

  let i = 0;
  let n_trashold = trashold;
  for (; i < tree.children.length; i++) {
    let percentage = +((100 * +tree.children[i].value) / total).toPrecision(3);
    // console.log(percentage);
    if (tree.depth >= 3) n_trashold = trashold / 1.5;
    if (percentage <= n_trashold) break;
  }

  // console.log(i);
  while (tree.children.length > i) {
    tree.children.pop();
  }

  for (const node of tree.children) {
    prune_tree(node, total);
  }
}

function create_node_nested(params) {
  if (params.depth == params.depth + params.height) {
    let leaf = d3.hierarchy({ name: 'OUTROS' });
    leaf.parent = params.parent;
    leaf.height = params.height;
    leaf.depth = params.depth;
    leaf.value = params.value;
    return leaf;
  }
  let data = {
    name: 'OUTROS',
    children: [],
  };
  let new_tree = hierarchy(data);
  new_tree.height = params.height;
  new_tree.depth = params.depth;
  new_tree.value = params.value;
  new_tree.parent = params.parent;
  new_tree.data = data;
  new_tree.children = [
    create_node_nested({
      height: new_tree.height - 1,
      value: new_tree.value,
      depth: new_tree.depth + 1,
      parent: new_tree,
    }),
  ];

  return new_tree;
}

function fix_tree(tree) {
  if (!tree.children) return;

  for (const node of tree.children) {
    fix_tree(node);
  }

  let sum = 0;
  for (const node of tree.children) sum += node.value;

  // console.log(tree.value);
  if (sum < tree.value) {
    let node = create_node_nested({
      parent: tree,
      value: tree.value - sum,
      depth: tree.depth + 1,
      height: tree.height - 1,
    }); //Altura e profundidade dos filhos
    tree.data.children.push(node.data);
    tree.children.push(node);
  }
}

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

  let filter = parseDate(2020);

  let tree = get_tree(yearDimension.filter(filter).top(Infinity));
  let root = hierarchy(tree);
  prune_tree(root, root.value);
  fix_tree(root);
  root = partition(root);
  // console.log(root);

  // Dimensões do gráficos
  let width = 1200;
  let radius = width / 6;

  // Definições dos arcos (ângulos)
  let arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  // Raiz da árvore
  root.each((d) => (d.current = d));

  // Criando o SVG
  // const svg = d3
  //   .create('svg')
  //   .attr('viewBox', [0, 0, width, width])
  //   .style('font', '10px sans-serif');

  const multiLevelChart = d3
    .select('#multiLevelChart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('font', '10px sans-serif');

  // SVG do gráfico
  const g = multiLevelChart
    .append('g')
    .attr('transform', `translate(${width / 2},${width / 2})`);

  // Criando um nó SVG para armazenar a sequência dos nós nos eventos do mouse
  const element = multiLevelChart.node();
  element.value = { sequence: [], percentage: 0.0 };

  // Label central do gráfico que apresenta o título de cada seção
  const label_center_title = multiLevelChart
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('fill', '#888')
    .style('visibility', 'none');

  label_center_title
    .append('tspan')
    .attr('class', 'center_title')
    .attr('x', width / 2)
    .attr('y', width / 2)
    .attr('dy', '1.5em')
    .attr('font-size', '1.7em')
    .text('BOLSAS DE FOMENTO À PESQUISA');

  // Label central do gráfico que apresenta a porcentagem de cada seção
  const label_p = multiLevelChart
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('fill', '#888')
    .style('visibility', 'hidden');

  label_p
    .append('tspan')
    .attr('class', 'percentage')
    .attr('x', width / 2)
    .attr('y', width / 2)
    .attr('dy', '-0.1em')
    .attr('font-size', '5em')
    .text('');

  label_p
    .append('tspan')
    .attr('x', width / 2)
    .attr('y', width / 2)
    .attr('dy', '1.5em')
    .attr('font-size', '1.7em')
    .text('Quantidade de bolsas em relação')
    .append('tspan')
    .attr('x', width / 2)
    .attr('y', width / 2)
    .attr('dy', '2.5em')
    .text('ao total ofertada no Brasil');

  // Cria as partes do gráfico (do arco) formatado como um caminho em busca da folha da árvore
  const path = g
    .append('g')
    .selectAll('path')
    .data(root.descendants().slice(1))
    .join('path')
    .attr('fill', (d) => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    .attr('fill-opacity', (d) =>
      arcVisible(d.current) ? (d.depth % 2 == 0 ? 0.7 : 0.4) : 0
    )
    .attr('d', (d) => arc(d.current));

  // Aplica os eventos do mouse
  path
    .filter((d) => d.children)

    .on('click', clicked)
    .on('mouseleave', () => {
      path.attr('fill-opacity', (d) =>
        arcVisible(d.current) ? (d.depth % 2 == 0 ? 0.7 : 0.4) : 0
      );
      label_p.style('visibility', 'hidden');
      path.style('cursor', (d) =>
        arcVisible(d.current) && d.children ? 'pointer' : ''
      );
      element.value = { sequence: [], percentage: 0.0 };
      element.dispatchEvent(new CustomEvent('input'));
      label_center_title.style('visibility', null);
    })
    .on('mouseenter', (event, d) => {
      //O efeito é aplicado apenas sobre os arc visíveis
      if (arcVisible(d.current)) {
        path.style('cursor', (d) =>
          arcVisible(d.current) && d.children ? 'pointer' : ''
        );
        label_center_title.style('visibility', 'hidden');
        const sequence = d.ancestors().reverse().slice(1);
        path.attr('fill-opacity', (node) =>
          arcVisible(node.current)
            ? sequence.indexOf(node) >= 0
              ? 1.0
              : 0.3
            : 0
        );
        const percentage = ((100 * d.value) / root.value).toPrecision(3);
        label_p
          .style('visibility', null)
          .select('.percentage')
          .text(percentage + '%');
        element.value = { sequence, percentage };
        element.dispatchEvent(new CustomEvent('input'));
      }
    });

  // Aplica o title para quando passar o mouse sobre os paths
  path.append('title').text(
    (d) =>
      `${d
        .ancestors()
        .map((d) => d.data.name)
        .reverse()
        .join('/')}\n${format(d.value)}`
  );

  // Cria os labels para cada path.
  // Aqui são os nomes de cada seção.
  const label = g
    .append('g')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .style('user-select', 'none')
    .selectAll('text')
    .data(root.descendants().slice(1))
    .join('text')
    .attr('dy', '0.35em')
    .attr('fill-opacity', (d) => +labelVisible(d.current))
    .attr('transform', (d) => labelTransform(d.current))
    .text((d) => view_text(d)); // Corta os textos longos.

  const parent = g
    .append('circle')
    .datum(root)
    .attr('r', radius)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('click', clicked);

  // Função do onClick
  function clicked(event, p) {
    console.log(p);

    if (!arcVisibleWithCenter(p.current)) return;

    parent.datum(p.parent || root);
    root.each(
      (d) =>
        (d.target = {
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        })
    );

    // Atualiza o nome central do gráfico para o nome da seção clicada
    label_center_title
      .style('visibility', null)
      .select('.center_title')
      .text(p.data.name);

    // Definição da duração do efeito de transição
    const t = g.transition().duration(1000);

    // Efeito de transição
    path
      .transition(t)
      .tween('data', (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (t) => (d.current = i(t));
      })
      .filter(function (d) {
        return +this.getAttribute('fill-opacity') || arcVisible(d.target);
      })
      .attr('fill-opacity', (d) =>
        arcVisible(d.target) ? (d.depth % 2 == 0 ? 0.7 : 0.4) : 0
      )
      .attrTween('d', (d) => () => arc(d.current));

    // Gerenciamento dos labels de cada path (seção) para apresentar apenas o que é visível na tela
    label
      .filter(function (d) {
        return +this.getAttribute('fill-opacity') || labelVisible(d.target);
      })
      .transition(t)
      .attr('fill-opacity', (d) => +labelVisible(d.target))
      .attrTween('transform', (d) => () => labelTransform(d.current));
  }

  // Verifica quais paths são visíveis
  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function arcVisibleWithCenter(d) {
    return d.y1 <= 3 && d.y0 >= 0 && d.x1 > d.x0;
  }

  // Verifica quais labels de paths são visíveis
  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  // Transformação dos ângulos dos labels dos paths
  function labelTransform(d) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  // Função para tratar strings dos labels dos paths
  function view_text(d) {
    let name = d.data.name;
    if (d.data.name.length > 30) name = d.data.name.substr(0, 29) + '...';
    if (d.data.value)
      return name.replace('_', ' ').toUpperCase() + ': ' + d.data.value;
    else return name;
  }

  // function partition(data) {
  //   const root = d3.hierarchy(data)
  //       .sum(d => d.value)
  //       .sort((a, b) => b.value - a.value);
  //   return d3.partition()
  //       .size([2 * Math.PI, root.height + 1])
  //     (root);
  // }

  function partition(root) {
    return d3.partition().size([2 * Math.PI, root.height + 1])(root);
  }

  return multiLevelChart.node();

  function updateFilters(uf) {
    ufSelected = uf;
    ufDimension.filter(function (d) {
      return uf === d;
    });
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
        updateFilters(d.id);
      });

    updateCircles();
  });

  select.replaceFilter([[year]]).redrawGroup();
});
