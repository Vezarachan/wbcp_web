/* WBCP project page — hand-rolled SVG charts, no dependencies.
 * Data: window.WBCP_DATA (static/js/data.js), aggregated from the paper's
 * per-trial experiment CSVs (experiments_v6/).
 */
(function () {
  'use strict';

  var D = window.WBCP_DATA;
  var NS = 'http://www.w3.org/2000/svg';

  // Fixed method -> color assignment (identical across every chart).
  var COLORS = {
    'WBCP': '#2a78d6',
    'BQ-CP': '#eb6834',
    'W-CRC': '#1baf7a',
    'RCPS': '#eda100'
  };
  var CRITICAL = '#d03b3b';
  var INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#898781',
      GRID = '#e1e0d9', BASELINE = '#c3c2b7';
  var PANEL_ORDER = ['BQ-CP', 'RCPS', 'W-CRC', 'WBCP'];
  var FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  // ---------- helpers ----------
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
    var pad = 14;
    var w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    var x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  function hideTip() { tooltip.style.opacity = 0; }

  function makeTable(containerId, caption, header, rows) {
    var box = document.getElementById(containerId);
    if (!box) return;
    var det = document.createElement('details');
    det.className = 'table-view';
    var sum = document.createElement('summary');
    sum.textContent = caption;
    det.appendChild(sum);
    var t = document.createElement('table');
    var tr = document.createElement('tr');
    header.forEach(function (h) {
      var th = document.createElement('th'); th.textContent = h; tr.appendChild(th);
    });
    t.appendChild(tr);
    rows.forEach(function (r) {
      var tr2 = document.createElement('tr');
      r.forEach(function (c) {
        var td = document.createElement('td'); td.textContent = c; tr2.appendChild(td);
      });
      t.appendChild(tr2);
    });
    det.appendChild(t);
    box.innerHTML = '';
    box.appendChild(det);
  }

  function makeLegend(containerId, methods) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = '';
    methods.forEach(function (m) {
      var li = document.createElement('span');
      li.className = 'li';
      var sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = COLORS[m];
      li.appendChild(sw);
      li.appendChild(document.createTextNode(label(m)));
      box.appendChild(li);
    });
  }

  // ================= Chart 1: risk histograms (small multiples) =================
  function renderHistograms(mode) {
    var data = mode === 'iid' ? D.risk_hist_iid : D.risk_hist;
    var container = document.getElementById('hist-panels');
    container.innerHTML = '';

    var bins = data.bins, alpha = data.alpha;
    // shared y max (percent of trials) across available panels
    var ymax = 0;
    PANEL_ORDER.forEach(function (m) {
      var d = data.methods[m];
      if (!d || !d.n) return;
      d.counts.forEach(function (c) { ymax = Math.max(ymax, 100 * c / d.n); });
    });
    ymax = Math.ceil(ymax / 5) * 5;

    var W = 440, H = 210, ml = 40, mr = 12, mt = 26, mb = 30;
    var pw = W - ml - mr, ph = H - mt - mb;
    var xmax = 0.3;
    function X(v) { return ml + pw * v / xmax; }
    function Y(v) { return mt + ph * (1 - v / ymax); }

    PANEL_ORDER.forEach(function (m) {
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
        'aria-label': label(m) + ': distribution of realized risk' });
      container.appendChild(svg);

      var d = data.methods[m];

      // panel title + violation stat
      txt(svg, ml, 15, label(m), { 'font-size': 13, 'font-weight': 600, fill: INK });

      if (!d || !d.n) {
        txt(svg, W / 2, H / 2, 'Not run in this control — equals WBCP at uniform weights.',
          { 'text-anchor': 'middle', fill: MUTED, 'font-size': 12 });
        return;
      }

      txt(svg, W - mr, 15, d.viol.toFixed(1) + '% of trials exceed α',
        { 'text-anchor': 'end', 'font-size': 12, 'font-weight': 600,
          fill: d.viol > 5.5 ? CRITICAL : INK2 });

      // gridlines + y ticks
      [0, ymax / 2, ymax].forEach(function (v) {
        el('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, svg);
        txt(svg, ml - 5, Y(v) + 3.5, v + '%', { 'text-anchor': 'end', fill: MUTED, 'font-size': 10 });
      });
      // x ticks
      [0, 0.1, 0.2, 0.3].forEach(function (v) {
        txt(svg, X(v), H - mb + 14, v.toFixed(1), { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10 });
      });
      txt(svg, ml + pw / 2, H - 4, 'realized deployed risk', { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10.5 });

      // baseline
      el('line', { x1: ml, x2: W - mr, y1: Y(0), y2: Y(0), stroke: BASELINE, 'stroke-width': 1 }, svg);

      // bars (2px gap between adjacent fills)
      var bw = pw / (bins.length - 1);
      for (var i = 0; i < d.counts.length; i++) {
        var pct = 100 * d.counts[i] / d.n;
        if (pct <= 0) continue;
        var over = bins[i] >= alpha;
        var x0 = X(bins[i]) + 1, y0 = Y(pct);
        var r = el('rect', {
          x: x0, y: y0, width: Math.max(bw - 2, 1), height: Y(0) - y0,
          fill: over ? CRITICAL : COLORS[m], rx: 1.5
        }, svg);
        (function (lo, hi, pct, over) {
          r.addEventListener('mousemove', function (e) {
            showTip('<div class="tt-title">' + label(m) + '</div>' +
              'risk ' + lo.toFixed(3) + '–' + hi.toFixed(3) +
              (over ? ' (exceeds α)' : '') + '<br>' +
              pct.toFixed(2) + '% of trials', e);
          });
          r.addEventListener('mouseleave', hideTip);
        })(bins[i], bins[i + 1], pct, over);
      }

      // alpha line
      el('line', { x1: X(alpha), x2: X(alpha), y1: mt - 2, y2: Y(0),
        stroke: INK, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
      txt(svg, X(alpha) + 4, mt + 8, 'α = ' + alpha, { fill: INK, 'font-size': 10.5 });
    });

    // table view
    var rows = PANEL_ORDER.filter(function (m) { return data.methods[m] && data.methods[m].n; })
      .map(function (m) {
        var d = data.methods[m];
        return [label(m), d.viol.toFixed(1) + '%', d.mean_risk.toFixed(1) + '%', d.mean_len.toFixed(2)];
      });
    makeTable('hist-table', 'Data table — summary over trials',
      ['Decision rule', 'Trials exceeding α', 'Mean realized risk', 'Mean interval length'], rows);
  }

  document.getElementById('hist-toggle').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    this.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
    b.classList.add('active');
    renderHistograms(b.dataset.mode);
  });

  // ================= Chart 2: gamma sweep (two line panels) =================
  function renderSweepPanel(containerId, key, yLabel, yTickFmt, targetLine) {
    var box = document.getElementById(containerId);
    box.innerHTML = '';
    var W = 520, H = 316, ml = 46, mr = 78, mt = 30, mb = 40;
    var pw = W - ml - mr, ph = H - mt - mb;
    var gmin = 0, gmax = 2;

    var ymax = 0;
    PANEL_ORDER.forEach(function (m) {
      D.gamma_sweep.methods[m][key].forEach(function (v) { ymax = Math.max(ymax, v); });
    });
    ymax = key === 'viol' ? 100 : Math.ceil(ymax / 2) * 2;

    function X(g) { return ml + pw * (g - gmin) / (gmax - gmin); }
    function Y(v) { return mt + ph * (1 - v / ymax); }

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': yLabel });
    box.appendChild(svg);

    // grid + y ticks
    var steps = 4;
    for (var i = 0; i <= steps; i++) {
      var v = ymax * i / steps;
      el('line', { x1: ml, x2: ml + pw, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, svg);
      txt(svg, ml - 6, Y(v) + 3.5, yTickFmt(v), { 'text-anchor': 'end', fill: MUTED, 'font-size': 10 });
    }
    el('line', { x1: ml, x2: ml + pw, y1: Y(0), y2: Y(0), stroke: BASELINE, 'stroke-width': 1 }, svg);

    // x ticks
    [0, 0.5, 1, 1.5, 2].forEach(function (g) {
      txt(svg, X(g), H - mb + 16, g, { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10 });
    });
    txt(svg, ml + pw / 2, H - 6, 'shift strength γ', { 'text-anchor': 'middle', fill: MUTED, 'font-size': 11 });
    txt(svg, 12, 14, yLabel, { fill: INK2, 'font-size': 11, 'font-weight': 600 });

    // target line
    if (targetLine != null) {
      el('line', { x1: ml, x2: ml + pw, y1: Y(targetLine), y2: Y(targetLine),
        stroke: INK, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, svg);
      txt(svg, ml + 4, Y(targetLine) - 5, 'target failure rate 5%', { fill: INK, 'font-size': 10 });
    }

    // lines + markers, then direct end labels with collision resolution
    var endLabels = [];
    PANEL_ORDER.forEach(function (m) {
      var md = D.gamma_sweep.methods[m];
      var pts = md.gammas.map(function (g, i) { return [X(g), Y(md[key][i])]; });
      el('path', {
        d: pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' '),
        fill: 'none', stroke: COLORS[m], 'stroke-width': 2,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      }, svg);
      pts.forEach(function (p) {
        el('circle', { cx: p[0], cy: p[1], r: 3.5, fill: COLORS[m],
          stroke: '#fcfcfb', 'stroke-width': 1.5 }, svg);
      });
      var last = pts[pts.length - 1];
      endLabels.push({ m: m, x: last[0], y: last[1] });
    });
    // push overlapping labels apart (min 13px vertical separation)
    endLabels.sort(function (a, b) { return a.y - b.y; });
    for (var li = 1; li < endLabels.length; li++) {
      if (endLabels[li].y - endLabels[li - 1].y < 13) {
        endLabels[li].y = endLabels[li - 1].y + 13;
      }
    }
    endLabels.forEach(function (L) {
      txt(svg, L.x + 8, L.y + 3.5, label(L.m),
        { fill: INK2, 'font-size': 10.5, 'font-weight': 600 });
    });

    // hover: nearest gamma crosshair
    var hover = el('g', { style: 'display:none' }, svg);
    var vline = el('line', { y1: mt, y2: mt + ph, stroke: BASELINE, 'stroke-width': 1 }, hover);
    var overlay = el('rect', { x: ml, y: mt, width: pw, height: ph, fill: 'transparent' }, svg);
    var gammasAll = [0, 0.5, 1, 1.5, 2];
    overlay.addEventListener('mousemove', function (e) {
      var rect = svg.getBoundingClientRect();
      var gx = (e.clientX - rect.left) * (W / rect.width);
      var g = gammasAll.reduce(function (a, b) {
        return Math.abs(X(b) - gx) < Math.abs(X(a) - gx) ? b : a;
      });
      hover.style.display = '';
      vline.setAttribute('x1', X(g)); vline.setAttribute('x2', X(g));
      var html = '<div class="tt-title">γ = ' + g + '</div>';
      PANEL_ORDER.forEach(function (m) {
        var md = D.gamma_sweep.methods[m];
        var i = md.gammas.indexOf(g);
        if (i < 0) { html += '<div class="tt-row"><span class="tt-swatch" style="background:' +
          COLORS[m] + '"></span>' + label(m) + ': —</div>'; return; }
        var v = md[key][i];
        html += '<div class="tt-row"><span class="tt-swatch" style="background:' + COLORS[m] +
          '"></span>' + label(m) + ': ' + yTickFmt(v) +
          (key === 'length' && md.abstain[i] > 0 ? ' (abstains ' + md.abstain[i] + '%)' : '') +
          '</div>';
      });
      showTip(html, e);
    });
    overlay.addEventListener('mouseleave', function () { hover.style.display = 'none'; hideTip(); });
  }

  // ================= Chart 3: grouped bars across benchmarks =================
  // Values from the paper's Tables 1-4 (percentage of calibration sets violating alpha).
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
  // Within-group order chosen so adjacent hues are a validated pair sequence.
  var BAR_ORDER = ['WBCP', 'BQ-CP', 'W-CRC', 'RCPS'];

  function renderBars() {
    var box = document.getElementById('bars-chart');
    box.innerHTML = '';
    var W = 1040, H = 330, ml = 46, mr = 116, mt = 18, mb = 52;
    var pw = W - ml - mr, ph = H - mt - mb;
    var ymax = 100;
    function Y(v) { return mt + ph * (1 - v / ymax); }

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Violation rates across four benchmarks',
      style: 'width:100%;height:auto;display:block;' });
    box.appendChild(svg);

    for (var i = 0; i <= 4; i++) {
      var v = 25 * i;
      el('line', { x1: ml, x2: ml + pw, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, svg);
      txt(svg, ml - 6, Y(v) + 3.5, v + '%', { 'text-anchor': 'end', fill: MUTED, 'font-size': 10 });
    }
    el('line', { x1: ml, x2: ml + pw, y1: Y(0), y2: Y(0), stroke: BASELINE, 'stroke-width': 1 }, svg);

    var groupW = pw / BENCH.length;
    var barW = Math.min(44, (groupW - 60) / 4);

    BENCH.forEach(function (b, gi) {
      var cx = ml + groupW * gi + groupW / 2;
      var total = barW * 4 + 2 * 3;
      BAR_ORDER.forEach(function (m, mi) {
        var v = b.vals[m];
        var x = cx - total / 2 + mi * (barW + 2);
        var r = el('rect', { x: x, y: Y(v), width: barW, height: Y(0) - Y(v),
          fill: COLORS[m], rx: 3 }, svg);
        // direct value label
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

    // 5% target line on top of bars, labeled in the right margin
    el('line', { x1: ml, x2: ml + pw + 6, y1: Y(5), y2: Y(5),
      stroke: INK, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, svg);
    txt(svg, ml + pw + 10, Y(5) - 2, 'allowed failure', { fill: INK, 'font-size': 10.5 });
    txt(svg, ml + pw + 10, Y(5) + 11, 'rate 5%', { fill: INK, 'font-size': 10.5 });

    makeTable('bars-table', 'Data table — violation rates by benchmark',
      ['Benchmark'].concat(BAR_ORDER.map(label)),
      BENCH.map(function (b) {
        return [b.name + ' (' + b.sub + ')'].concat(BAR_ORDER.map(function (m) {
          return b.vals[m] + '%';
        }));
      }));
  }

  // ================= boot =================
  renderHistograms('shift');
  makeLegend('sweep-legend', PANEL_ORDER);
  renderSweepPanel('sweep-viol', 'viol', '% of calibration sets exceeding α',
    function (v) { return Math.round(v) + '%'; }, 5);
  renderSweepPanel('sweep-len', 'length', 'mean deployed interval length',
    function (v) { return (Math.round(v * 10) / 10).toFixed(1); }, null);
  makeTable('sweep-table', 'Data table — failure rate and length vs γ',
    ['γ'].concat(PANEL_ORDER.map(function (m) { return label(m) + ' viol.'; }))
      .concat(PANEL_ORDER.map(function (m) { return label(m) + ' length'; })),
    [0, 0.5, 1, 1.5, 2].map(function (g) {
      var row = [g];
      PANEL_ORDER.forEach(function (m) {
        var md = D.gamma_sweep.methods[m], i = md.gammas.indexOf(g);
        row.push(i < 0 ? '—' : md.viol[i] + '%');
      });
      PANEL_ORDER.forEach(function (m) {
        var md = D.gamma_sweep.methods[m], i = md.gammas.indexOf(g);
        row.push(i < 0 ? '—' : md.length[i]);
      });
      return row;
    }));
  makeLegend('bars-legend', BAR_ORDER);
  renderBars();

  // BibTeX copy
  var copyBtn = document.getElementById('copy-bib');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var t = document.getElementById('bib-text').textContent;
    navigator.clipboard.writeText(t).then(function () {
      copyBtn.textContent = 'Copied!';
      setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
    });
  });
})();
