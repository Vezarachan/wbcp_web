/* Per-step visualizations for "From prior to threshold, in three steps".
 * Uses the same seeded calibration set as the hero animation (window.WBCP_SIM).
 *   viz-boot   : one Bayesian-bootstrap mass draw per second
 *   viz-tilt   : the SAME draw before / after the likelihood-ratio tilt
 *   viz-curves : each draw's risk curve + its α-crossing accumulating into the posterior
 */
(function () {
  'use strict';
  var S = window.WBCP_SIM;
  if (!S) return;

  var rng = S.mulberry32(4242);
  function expDraw() { return -Math.log(1 - rng()); }

  var INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#898781',
      GRID = '#e1e0d9', BASE = '#c3c2b7',
      BLUE = '#4677b5', RED = '#c24545';
  var FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  function text(g, x, y, s, a) {
    var t = g.append('text').attr('x', x).attr('y', y)
      .attr('font-family', FONT).attr('font-size', 12).attr('fill', INK2).text(s);
    for (var k in (a || {})) t.attr(k, a[k]);
    return t;
  }

  var maxW = d3.max(S.Wg);

  // one draw shared by viz 1 and viz 2 so "the same draw" is literally true
  var E = [], V = [], Vt = [];
  function redraw() {
    E = []; var sum = 0, sumT = 0, i;
    for (i = 0; i < S.n; i++) { E.push(expDraw()); sum += E[i]; sumT += S.Wg[i] * E[i]; }
    V = E.map(function (e) { return e / sum; });
    Vt = E.map(function (e, i) { return S.Wg[i] * e / sumT; });
  }
  redraw();

  // ---------- shared: aggregate point masses into coarse x-bins for display ----------
  function binMasses(masses, nb) {
    var b = new Array(nb).fill(0);
    for (var i = 0; i < S.n; i++) {
      var k = Math.min(nb - 1, Math.floor((S.X[i] - S.XA) / (S.XB - S.XA) * nb));
      b[k] += masses[i];
    }
    return b;
  }

  // ---------- viz 1: bootstrap masses ----------
  (function () {
    var W = 720, H = 132, x0 = 16, x1 = 704, base = 102, NBX = 28;
    var svg = d3.select('#viz-boot').append('svg').attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('role', 'img').attr('aria-label', 'One Bayesian bootstrap draw of the calibration masses per second');
    var bw = (x1 - x0) / NBX;
    var mScale = 1450; // bar height per unit binned mass

    svg.append('line').attr('x1', x0).attr('x2', x1).attr('y1', base).attr('y2', base).attr('stroke', BASE);
    text(svg, x0, 14, 'one draw of the masses  V₁ … Vₙ   (n = ' + S.n + ', equal weights; shown binned over x)', { fill: INK2, 'font-weight': 600 });
    text(svg, (x0 + x1) / 2, base + 20, 'covariate x', { 'text-anchor': 'middle', fill: MUTED });

    var bars = svg.selectAll('rect.m').data(d3.range(NBX)).enter().append('rect')
      .attr('x', function (i) { return x0 + i * bw + 1.5; })
      .attr('width', bw - 3)
      .attr('y', base).attr('height', 0)
      .attr('rx', 2)
      .attr('fill', BLUE).attr('fill-opacity', 0.7);

    function update() {
      var b = binMasses(V, NBX);
      bars.transition().duration(420)
        .attr('y', function (i) { return base - Math.min(82, b[i] * mScale); })
        .attr('height', function (i) { return Math.min(82, b[i] * mScale); });
    }
    update();
    window.__vizBootUpdate = update;
  })();

  // ---------- viz 2: the same draw, tilted ----------
  (function () {
    var W = 720, H = 156, base = 110, NBX = 14;
    var svg = d3.select('#viz-tilt').append('svg').attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('role', 'img').attr('aria-label', 'The same mass draw before and after the likelihood-ratio tilt');
    var PL = { x0: 16, x1: 330 }, PR = { x0: 390, x1: 704 };

    [PL, PR].forEach(function (P) {
      svg.append('line').attr('x1', P.x0).attr('x2', P.x1).attr('y1', base).attr('y2', base).attr('stroke', BASE);
    });
    text(svg, PL.x0, 14, 'Vᵢ — calibration masses', { fill: INK2, 'font-weight': 600 });
    text(svg, PR.x0, 14, 'Ṽᵢ ∝ wᵢVᵢ — deployed masses', { fill: RED, 'font-weight': 600 });
    text(svg, (PL.x0 + PL.x1) / 2, base + 20, 'covariate x', { 'text-anchor': 'middle', fill: MUTED });
    text(svg, (PR.x0 + PR.x1) / 2, base + 20, 'covariate x', { 'text-anchor': 'middle', fill: MUTED });

    // arrow between panels
    svg.append('path').attr('d', 'M344 64 h22 m0 0 l-7 -5 m7 5 l-7 5')
      .attr('stroke', INK2).attr('stroke-width', 1.6).attr('fill', 'none')
      .attr('stroke-linecap', 'round');
    text(svg, 355, 48, '× wᵢ', { 'text-anchor': 'middle', fill: INK2, 'font-size': 13.5, 'font-weight': 600 });

    // w(x) curve on the right panel
    var xsR = d3.scaleLinear().domain([S.XA, S.XB]).range([PR.x0, PR.x1]);
    var wPath = d3.range(80).map(function (k) {
      var x = S.XA + (S.XB - S.XA) * k / 79;
      return [xsR(x), base - 10 - 58 * Math.exp(S.GAMMA * (x - 2)) / Math.exp(S.GAMMA * (S.XB - 2))];
    });
    svg.append('path')
      .attr('d', 'M' + wPath.map(function (p) { return p[0] + ' ' + p[1]; }).join('L'))
      .attr('fill', 'none').attr('stroke', RED).attr('stroke-width', 1.3)
      .attr('stroke-dasharray', '4 3').attr('opacity', 0.75);
    text(svg, PR.x1 - 2, 30, 'w(x)', { 'text-anchor': 'end', fill: RED });

    var bwL = (PL.x1 - PL.x0) / NBX, bwR = (PR.x1 - PR.x0) / NBX;
    var mScale = 640;
    var barsL = svg.selectAll('rect.bl').data(d3.range(NBX)).enter().append('rect')
      .attr('x', function (i) { return PL.x0 + i * bwL + 1; })
      .attr('width', bwL - 2)
      .attr('y', base).attr('height', 0)
      .attr('rx', 2)
      .attr('fill', BLUE).attr('fill-opacity', 0.55);
    var barsR = svg.selectAll('rect.br').data(d3.range(NBX)).enter().append('rect')
      .attr('x', function (i) { return PR.x0 + i * bwR + 1; })
      .attr('width', bwR - 2)
      .attr('y', base).attr('height', 0)
      .attr('rx', 2)
      .attr('fill', RED).attr('fill-opacity', 0.7);

    function update() {
      var bL = binMasses(V, NBX), bR = binMasses(Vt, NBX);
      barsL.transition().duration(420)
        .attr('y', function (i) { return base - Math.min(86, bL[i] * mScale); })
        .attr('height', function (i) { return Math.min(86, bL[i] * mScale); });
      barsR.transition().duration(420)
        .attr('y', function (i) { return base - Math.min(86, bR[i] * mScale); })
        .attr('height', function (i) { return Math.min(86, bR[i] * mScale); });
    }
    update();
    window.__vizTiltUpdate = update;
  })();

  d3.interval(function () { redraw(); window.__vizBootUpdate(); window.__vizTiltUpdate(); }, 1100);

  // ---------- viz 3: risk curves -> threshold posterior ----------
  (function () {
    var W = 720, H = 190, base = 150, top = 26;
    var svg = d3.select('#viz-curves').append('svg').attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('role', 'img').attr('aria-label', 'Sampled deployed risk curves crossing the target, and the resulting threshold posterior');
    var PL = { x0: 42, x1: 420 }, PR = { x0: 480, x1: 704 };
    var LMINC = 0, LMAXC = 9;
    var xsL = d3.scaleLinear().domain([LMINC, LMAXC]).range([PL.x0, PL.x1]);
    var yRisk = d3.scaleLinear().domain([0, 0.42]).range([base, top]);

    text(svg, PL.x0, 14, 'each draw → one deployed risk curve L(λ)', { fill: INK2, 'font-weight': 600 });
    text(svg, PR.x0, 14, 'its α-crossings → threshold posterior', { fill: RED, 'font-weight': 600 });

    // left axes
    svg.append('line').attr('x1', PL.x0).attr('x2', PL.x1).attr('y1', base).attr('y2', base).attr('stroke', BASE);
    [0, 0.2, 0.4].forEach(function (v) {
      svg.append('line').attr('x1', PL.x0).attr('x2', PL.x1).attr('y1', yRisk(v)).attr('y2', yRisk(v))
        .attr('stroke', GRID);
      text(svg, PL.x0 - 5, yRisk(v) + 3.5, (v * 100) + '%', { 'text-anchor': 'end', fill: MUTED, 'font-size': 11 });
    });
    text(svg, (PL.x0 + PL.x1) / 2, base + 18, 'threshold λ', { 'text-anchor': 'middle', fill: MUTED });
    text(svg, (PR.x0 + PR.x1) / 2, base + 18, 'threshold λ', { 'text-anchor': 'middle', fill: MUTED });

    // α line
    svg.append('line').attr('x1', PL.x0).attr('x2', PL.x1).attr('y1', yRisk(S.ALPHA)).attr('y2', yRisk(S.ALPHA))
      .attr('stroke', INK).attr('stroke-width', 1.2).attr('stroke-dasharray', '4 3');
    text(svg, PL.x1 - 2, yRisk(S.ALPHA) - 4, 'target α', { 'text-anchor': 'end', fill: INK, 'font-size': 11.5 });

    // right panel: histogram of crossings
    var LMINH = 4.5, LMAXH = 9, NB = 9;
    var xsR = d3.scaleLinear().domain([LMINH, LMAXH]).range([PR.x0, PR.x1]);
    var binW = (LMAXH - LMINH) / NB;
    var histH = base - top - 8;
    svg.append('line').attr('x1', PR.x0).attr('x2', PR.x1).attr('y1', base).attr('y2', base).attr('stroke', BASE);
    d3.range(5, 10).forEach(function (v) {
      text(svg, xsR(v), base + 10, v, { 'text-anchor': 'middle', fill: MUTED, 'font-size': 11 });
    });
    d3.range(1, 9).forEach(function (v) {
      text(svg, xsL(v), base + 10, v, { 'text-anchor': 'middle', fill: MUTED, 'font-size': 11 });
    });
    var bars = svg.selectAll('rect.b').data(d3.range(NB)).enter().append('rect')
      .attr('x', function (i) { return xsR(LMINH + i * binW) + 0.5; })
      .attr('width', (xsR(LMINH + binW) - xsR(LMINH)) - 1)
      .attr('y', base).attr('height', 0).attr('fill', RED).attr('fill-opacity', 0.75).attr('rx', 1);
    var hpdLine = svg.append('line').attr('y1', top - 4).attr('y2', base).attr('stroke', INK).attr('stroke-width', 1.5);
    var hpdLbl = text(svg, 0, top + 8, 'λ HPD (β)', { fill: INK, 'font-weight': 600, 'text-anchor': 'start' });
    hpdLine.attr('opacity', 0); hpdLbl.attr('opacity', 0);

    var curvesG = svg.append('g');
    var ticksG = svg.append('g');
    var curves = [], crossings = [], counts = new Array(NB).fill(0);

    // λ grid for curves: the sorted scores define the steps; sample 90 grid points
    var grid = d3.range(90).map(function (k) { return LMINC + (LMAXC - LMINC) * k / 89; });

    function riskCurve() {
      var E2 = [], sumT = 0, i;
      for (i = 0; i < S.n; i++) { E2.push(expDraw()); sumT += S.Wg[i] * E2[i]; }
      var trail = S.wbar * expDraw();
      sumT += trail;
      // survival mass above λ, over the grid
      var masses = S.ORDER.map(function (j) { return S.Wg[j] * E2[j] / sumT; });
      var scores = S.ORDER.map(function (j) { return S.RHO[j]; });
      var pts = [], acc = 1; // start with all mass above λ=0 (plus trailing atom)
      var mi = 0, tot = masses.reduce(function (a, b) { return a + b; }, 0) + trail / sumT;
      acc = tot;
      var lam = Infinity;
      for (var g = 0; g < grid.length; g++) {
        while (mi < scores.length && scores[mi] <= grid[g]) { acc -= masses[mi]; mi++; }
        pts.push([grid[g], acc]);
        if (lam === Infinity && acc <= S.ALPHA) lam = grid[g];
      }
      return { pts: pts, lam: lam };
    }

    function drawOnce() {
      var c = riskCurve();
      var path = curvesG.append('path')
        .attr('d', 'M' + c.pts.map(function (p) { return xsL(p[0]) + ' ' + yRisk(Math.min(p[1], 0.42)); }).join('L'))
        .attr('fill', 'none').attr('stroke', RED).attr('stroke-width', 1.2).attr('opacity', 0.65);
      curves.push(path);
      if (curves.length > 14) curves.shift().remove();
      curves.forEach(function (p, i) { p.attr('opacity', 0.12 + 0.5 * (i + 1) / curves.length); });

      if (isFinite(c.lam)) {
        // tick on the α line
        var tk = ticksG.append('line')
          .attr('x1', xsL(c.lam)).attr('x2', xsL(c.lam))
          .attr('y1', yRisk(S.ALPHA) - 4).attr('y2', yRisk(S.ALPHA) + 4)
          .attr('stroke', RED).attr('stroke-width', 1.4).attr('opacity', 0.9);
        tk.transition().duration(2400).attr('opacity', 0.15);
        crossings.push(c.lam);
        if (crossings.length > 500) crossings.shift();
        var b = Math.floor((c.lam - LMINH) / binW);
        counts = new Array(NB).fill(0);
        crossings.forEach(function (l) {
          var bi = Math.floor((l - LMINH) / binW);
          if (bi >= 0 && bi < NB) counts[bi]++;
        });
        var cmax = d3.max(counts) || 1;
        bars.attr('y', function (i) { return base - histH * counts[i] / cmax; })
            .attr('height', function (i) { return histH * counts[i] / cmax; });
        if (crossings.length > 20) {
          var hpd = d3.quantileSorted(crossings.slice().sort(d3.ascending), S.BETA);
          var hx = Math.min(xsR(hpd), PR.x1);
          hpdLine.attr('x1', hx).attr('x2', hx).attr('opacity', 1);
          hpdLbl.attr('x', Math.min(hx + 5, PR.x1 - 62)).attr('opacity', 1);
        }
      }
    }
    drawOnce();
    d3.interval(drawOnce, 550);
  })();
})();
