const multiLevelWidth = 900;
let radius = multiLevelWidth / 6;

let arc = d3
  .arc()
  .startAngle((d) => d.x0)
  .endAngle((d) => d.x1)
  .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
  .padRadius(radius * 1.5)
  .innerRadius((d) => d.y0 * radius)
  .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

const colors = d3
  .scaleOrdinal()
  .domain([1, 12])
  .range([
    '#946795',
    '#D1646B',
    '#EF4B4E',
    '#EE7152',
    '#F6C992',
    '#945D4E',
    '#C09651',
    '#329694',
    '#717CB3',
  ]);

const multiLevelChart = d3
  .select('#multiLevelChart')
  .append('svg')
  .attr('width', multiLevelWidth)
  .attr('height', 900)
  .style('font', '10px sans-serif');

let g1 = multiLevelChart
  .append('g')
  .attr(
    'transform',
    `translate(${multiLevelWidth / 2},${multiLevelWidth / 2})`
  );

let pathGroup = g1.append('g');

let labelGroup = g1
  .append('g')
  .attr('pointer-events', 'none')
  .attr('text-anchor', 'middle')
  .style('user-select', 'none');

const labelCenterTitle = multiLevelChart
  .append('text')
  .attr('text-anchor', 'middle')
  .attr('fill', '#888')
  .style('visibility', 'none');

labelCenterTitle
  .append('tspan')
  .attr('class', 'centerTitle')
  .attr('x', multiLevelWidth / 2)
  .attr('y', 430)
  .attr('dy', '1.5em')
  .attr('font-size', '1.7em')
  .text('BOLSAS DE FOMENTO');

const labelP = multiLevelChart
  .append('text')
  .attr('text-anchor', 'middle')
  .attr('fill', '#888')
  .style('visibility', 'hidden');

labelP
  .append('tspan')
  .attr('class', 'percentage')
  .attr('x', multiLevelWidth / 2)
  .attr('y', multiLevelWidth / 2)
  .attr('dy', '-0.1em')
  .attr('font-size', '5em')
  .text('');

labelP
  .append('tspan')
  .attr('x', multiLevelWidth / 2)
  .attr('y', multiLevelWidth / 2)
  .attr('dy', '1.5em')
  .attr('font-size', '1.7em')
  .text('Quantidade de bolsas em relação')
  .append('tspan')
  .attr('x', multiLevelWidth / 2)
  .attr('y', multiLevelWidth / 2)
  .attr('dy', '2.5em')
  .text('ao total ofertada no Brasil');

function getName(data, depth) {
  if (depth == 0) return data.grande_area;
  else if (depth == 1) return data.regiao;
  else if (depth == 2) return data.ies;
  else if (depth == 3) return data.programa;
}

function treeGenerator(data, tree, depth) {
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
        treeGenerator(data, node, ++depth);
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
        name: getName(data, depth),
        children: [],
      });
    } else
      tree.children.push({
        name: getName(data, depth),
        children: [
          { name: 'doutorado_pleno', value: 0 },
          { name: 'mestrado', value: 0 },
          { name: 'pos_doutorado', value: 0 },
        ],
      });
    treeGenerator(data, tree.children[tree.children.length - 1], ++depth);
    return;
  }
}

function getTree(d) {
  let tree = {
    name: 'BOLSAS DE FOMENTO',
    children: [],
  };
  for (const node of d) {
    treeGenerator(node, tree, 0);
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

function pruneTree(tree, total) {
  if (!tree.children) return;
  if (!tree.children[0].children) return;
  let trashold = 0.05;
  let min = Math.min(tree.children.length, trashold);

  let i = 0;
  let nTrashold = trashold;
  for (; i < tree.children.length; i++) {
    let percentage = +((100 * +tree.children[i].value) / total).toPrecision(3);
    if (tree.depth >= 3) nTrashold = trashold / 1.5;
    if (percentage <= nTrashold) break;
  }

  while (tree.children.length > i) {
    tree.children.pop();
  }

  for (const node of tree.children) {
    pruneTree(node, total);
  }
}

function createNodeNested(params) {
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
  let newTree = hierarchy(data);
  newTree.height = params.height;
  newTree.depth = params.depth;
  newTree.value = params.value;
  newTree.parent = params.parent;
  newTree.data = data;
  newTree.children = [
    createNodeNested({
      height: newTree.height - 1,
      value: newTree.value,
      depth: newTree.depth + 1,
      parent: newTree,
    }),
  ];

  return newTree;
}

function fixTree(tree) {
  if (!tree.children) return;

  for (const node of tree.children) {
    fixTree(node);
  }

  let sum = 0;
  for (const node of tree.children) sum += node.value;

  if (sum < tree.value) {
    let node = createNodeNested({
      parent: tree,
      value: tree.value - sum,
      depth: tree.depth + 1,
      height: tree.height - 1,
    });
    tree.data.children.push(node.data);
    tree.children.push(node);
  }
}

function buildMultiLevelChart(yearDimension, yearSelected) {
  let tree = getTree(yearDimension.filter(yearSelected).top(Infinity));
  let root = hierarchy(tree);
  pruneTree(root, root.value);
  fixTree(root);
  root = partition(root);

  const element = multiLevelChart.node();
  element.value = { sequence: [], percentage: 0.0 };

  root.each((d) => (d.current = d));

  let label = labelGroup
    .selectAll('text')
    .data(root.descendants().slice(1))
    .join('text')
    .attr('dy', '0.35em')
    .attr('fill-opacity', (d) => +labelVisible(d.current))
    .attr('transform', (d) => labelTransform(d.current))
    .text((d) => viewText(d)); // Corta os textos longos.

  let path = pathGroup
    .selectAll('path')
    .data(root.descendants().slice(1))
    .join('path')
    .attr('fill', (d) => {
      while (d.depth > 1) d = d.parent;
      return colors(d.data.name);
    })
    .attr('fill-opacity', (d) =>
      arcVisible(d.current) ? (d.depth % 2 == 0 ? 0.7 : 0.4) : 0
    )
    .attr('d', (d) => arc(d.current));

  path
    .filter((d) => d.children)
    .on('click', clicked)
    .on('mouseleave', () => {
      path.attr('fill-opacity', (d) =>
        arcVisible(d.current) ? (d.depth % 2 == 0 ? 0.7 : 0.4) : 0
      );
      labelP.style('visibility', 'hidden');
      path.style('cursor', (d) =>
        arcVisible(d.current) && d.children ? 'pointer' : ''
      );
      element.value = { sequence: [], percentage: 0.0 };
      element.dispatchEvent(new CustomEvent('input'));
      labelCenterTitle.style('visibility', null);
    })
    .on('mouseenter', (event, d) => {
      if (arcVisible(d.current)) {
        path.style('cursor', (d) =>
          arcVisible(d.current) && d.children ? 'pointer' : ''
        );
        labelCenterTitle.style('visibility', 'hidden');
        const sequence = d.ancestors().reverse().slice(1);
        path.attr('fill-opacity', (node) =>
          arcVisible(node.current)
            ? sequence.indexOf(node) >= 0
              ? 1.0
              : 0.3
            : 0
        );
        const percentage = ((100 * d.value) / root.value).toPrecision(3);
        labelP
          .style('visibility', null)
          .select('.percentage')
          .text(percentage + '%');
        element.value = { sequence, percentage };
        element.dispatchEvent(new CustomEvent('input'));
      }
    });

  path.append('title').text(
    (d) =>
      `${d
        .ancestors()
        .map((d) => d.data.name)
        .reverse()
        .join('/')}\n${format(d.value)}`
  );

  const parent = g1
    .append('circle')
    .datum(root)
    .attr('r', radius)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('click', clicked);

  function clicked(event, p) {
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

    labelCenterTitle
      .style('visibility', null)
      .select('.centerTitle')
      .text(p.data.name);

    const t = g1.transition().duration(1000);

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

    label
      .filter(function (d) {
        return +this.getAttribute('fill-opacity') || labelVisible(d.target);
      })
      .transition(t)
      .attr('fill-opacity', (d) => +labelVisible(d.target))
      .attrTween('transform', (d) => () => labelTransform(d.current));
  }

  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function arcVisibleWithCenter(d) {
    return d.y1 <= 3 && d.y0 >= 0 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  function viewText(d) {
    let name = d.data.name;
    if (d.data.name.length > 20) name = d.data.name.substr(0, 19) + '...';
    if (d.data.value)
      return name.replace('_', ' ').toUpperCase() + ': ' + d.data.value;
    else return name;
  }

  function partition(root) {
    return d3.partition().size([2 * Math.PI, root.height + 1])(root);
  }

  return multiLevelChart.node();
}
