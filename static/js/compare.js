/* Benchmark comparison — violation rates from the paper's Tables 1-4. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var COLORS = { 'WBCP': '#2a78d6', 'BQ-CP': '#eb6834', 'W-CRC': '#1baf7a', 'RCPS': '#eda100' };
  var INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#898781', GRID = '#e1e0d9', BASELINE = '#c3c2b7';
  var FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  // within-group order keeps adjacent hues a validated CVD-safe pair sequence
  var ORDER = ['WBCP', 'BQ-CP', 'W-CRC', 'RCPS'];
  var BENCH = [
    { name: 'Synthetic regression', sub: 'n = 200, α = 0.1',
      vals: { 'WBCP': 5.0, 'BQ-CP': 92.3, 'W-CRC': 42.8, 'RCPS': 85.2 } },
    { name: 'Synthetic multilabel', sub: 'n = 250, α = 0.4',
      vals: { 'WBCP': 7.9, 'BQ-CP': 100, 'W-CRC': 43.7, 'RCPS': 100 } },
    { name: 'PovertyMap-WILDS', sub: 'country shift',
      vals: { 'WBCP': 1.6, 'BQ-CP': 29.0, 'W-CRC': 18.7, 'RCPS': 26.4 } },
    { name: 'Fashion-MNIST', sub: 'entropy tilt',
      vals: { 'WBCP': 6.5, 'BQ-CP': 100, 'W-CRC': 45.0, 'RCPS': 100 } }
  ];

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, attrs) {
    var a = { x: x, y: y, 'font-family': FONT, 'font-size': 11, fill: INK2 };
    for (var k in (attrs || {})) a[k] = attrs[k];
    var n = el('text', a, parent);
    n.textContent = s;
    return n;
  }
  function label(m) { return m === 'WBCP' ? 'WBCP (ours)' : m; }

  var tooltip = document.getElementById('tooltip');
  function showTip(html, evt) {
    tooltip.innerHTML = html;
    tooltip.style.opacity = 1;
    var pad = 14, w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    var x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  function hideTip() { tooltip.style.opacity = 0; }

  // legend
  var leg = document.getElementById('bars-legend');
  ORDER.forEach(function (m) {
    var li = document.createElement('span');
    li.className = 'li';
    var sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = COLORS[m];
    li.appendChild(sw);
    li.appendChild(document.createTextNode(label(m)));
    leg.appendChild(li);
  });

  // chart
  var W = 900, H = 300, ml = 44, mr = 104, mt = 16, mb = 50;
  var pw = W - ml - mr, ph = H - mt - mb;
  function Y(v) { return mt + ph * (1 - v / 100); }

  var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
    'aria-label': 'Violation rates across four benchmarks',
    style: 'width:100%;height:auto;display:block;' });
  document.getElementById('bars-chart').appendChild(svg);

  for (var i = 0; i <= 4; i++) {
    var v = 25 * i;
    el('line', { x1: ml, x2: ml + pw, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, svg);
    txt(svg, ml - 6, Y(v) + 3.5, v + '%', { 'text-anchor': 'end', fill: MUTED, 'font-size': 10 });
  }
  el('line', { x1: ml, x2: ml + pw, y1: Y(0), y2: Y(0), stroke: BASELINE, 'stroke-width': 1 }, svg);

  var groupW = pw / BENCH.length;
  var barW = Math.min(40, (groupW - 56) / 4);

  BENCH.forEach(function (b) {
    var gi = BENCH.indexOf(b);
    var cx = ml + groupW * gi + groupW / 2;
    var total = barW * 4 + 2 * 3;
    ORDER.forEach(function (m, mi) {
      var v = b.vals[m];
      var x = cx - total / 2 + mi * (barW + 2);
      var r = el('rect', { x: x, y: Y(v), width: barW, height: Y(0) - Y(v),
        fill: COLORS[m], rx: 3 }, svg);
      txt(svg, x + barW / 2, Y(v) - 5, v.toFixed(v < 10 ? 1 : 0) + '%',
        { 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600,
          fill: m === 'WBCP' ? COLORS['WBCP'] : INK2 });
      r.addEventListener('mousemove', function (e) {
        showTip('<div class="tt-title">' + b.name + '</div>' +
          '<div class="tt-row"><span class="tt-swatch" style="background:' + COLORS[m] +
          '"></span>' + label(m) + ': ' + v + '% of calibration sets violate</div>', e);
      });
      r.addEventListener('mouseleave', hideTip);
    });
    txt(svg, cx, H - mb + 18, b.name, { 'text-anchor': 'middle', fill: INK, 'font-size': 12, 'font-weight': 600 });
    txt(svg, cx, H - mb + 33, b.sub, { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10.5 });
  });

  el('line', { x1: ml, x2: ml + pw + 6, y1: Y(5), y2: Y(5),
    stroke: INK, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, svg);
  txt(svg, ml + pw + 10, Y(5) - 2, 'allowed failure', { fill: INK, 'font-size': 10.5 });
  txt(svg, ml + pw + 10, Y(5) + 11, 'rate 5%', { fill: INK, 'font-size': 10.5 });

  // accessible table view
  var det = document.createElement('details');
  det.className = 'table-view';
  det.innerHTML = '<summary>Data table — violation rates by benchmark</summary>';
  var t = document.createElement('table');
  var tr = document.createElement('tr');
  ['Benchmark'].concat(ORDER.map(label)).forEach(function (h) {
    var th = document.createElement('th'); th.textContent = h; tr.appendChild(th);
  });
  t.appendChild(tr);
  BENCH.forEach(function (b) {
    var tr2 = document.createElement('tr');
    [b.name + ' (' + b.sub + ')'].concat(ORDER.map(function (m) { return b.vals[m] + '%'; }))
      .forEach(function (c) {
        var td = document.createElement('td'); td.textContent = c; tr2.appendChild(td);
      });
    t.appendChild(tr2);
  });
  det.appendChild(t);
  document.getElementById('bars-table').appendChild(det);
})();
