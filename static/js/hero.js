/* WBCP hero animation — the story in three stages:
 *   0  deployment shifts; selecting the threshold as if nothing changed fails
 *   1  reweight the evidence: exact posterior over the deployed threshold
 *   2  certify at credibility β: risk back at target, with trust readouts
 * All numbers on screen are computed live from the simulation, none are typed in.
 */
(function () {
  'use strict';

  // ---------- deterministic RNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var seeded = mulberry32(20260813);
  var live = mulberry32(97);          // animation-time randomness (still reproducible)
  function expDraw(rng) { return -Math.log(1 - rng()); }

  // ---------- the toy problem (matches the paper's synthetic benchmark) ----------
  // X ~ U[a,b], Y|X ~ N(0, X^2), score = |Y|, intervals [-λ, λ], miscoverage loss.
  var n = 200, XA = 0.15, XB = 3.85, ALPHA = 0.10, BETA = 0.95, GAMMA = 1.5;

  var X = [], RHO = [];
  for (var i = 0; i < n; i++) {
    var x = XA + (XB - XA) * (i + seeded()) / n;
    var u1 = seeded(), u2 = seeded();
    var z = Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
    X.push(x); RHO.push(Math.abs(z) * x);
  }
  var ORDER = X.map(function (_, i) { return i; }).sort(function (a, b) { return RHO[a] - RHO[b]; });

  function wfun(x) { return Math.exp(GAMMA * (x - 2)); }

  // standard normal CDF via erf (A&S 7.1.26)
  function phi(t) {
    var s = t < 0 ? -1 : 1; t = Math.abs(t) / Math.SQRT2;
    var p = 0.3275911, c = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
    var u = 1 / (1 + p * t), poly = 0;
    for (var k = 4; k >= 0; k--) poly = poly * u + c[k];
    return 0.5 * (1 + s * (1 - poly * u * Math.exp(-t * t)));
  }

  // test law on a grid: density, deployed risk of λ, oracle λ*, E_test[w]
  function testMoments(gamma) {
    var m = 400, xs = [], ps = [], Z = 0;
    for (var i = 0; i < m; i++) {
      var x = XA + (XB - XA) * (i + 0.5) / m;
      var p = Math.exp(gamma * (x - 2));
      xs.push(x); ps.push(p); Z += p;
    }
    for (i = 0; i < m; i++) ps[i] /= Z;
    function risk(lam) {
      var r = 0;
      for (var i = 0; i < m; i++) r += ps[i] * 2 * (1 - phi(lam / xs[i]));
      return r;
    }
    var lo = 0.05, hi = 16;
    for (i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (risk(mid) > ALPHA) lo = mid; else hi = mid;
    }
    var wbar = 0;
    for (i = 0; i < m; i++) wbar += ps[i] * wfun(xs[i]);
    return { xs: xs, ps: ps, risk: risk, lamStar: (lo + hi) / 2, wbar: wbar };
  }
  var CAL = testMoments(0);       // calibration law (γ = 0): for drawing the blue density
  var TEST = testMoments(GAMMA);  // deployment law

  var Wg = X.map(wfun);
  var sw = d3.sum(Wg), sw2 = d3.sum(Wg, function (w) { return w * w; });
  var NEFF = sw * sw / sw2;

  // one posterior draw -> the α-crossing threshold λ^(m)
  function drawCrossing(useWeights) {
    var masses = [], total = 0;
    for (var i = 0; i < n; i++) {
      var m = (useWeights ? Wg[i] : 1) * expDraw(live);
      masses.push(m); total += m;
    }
    var trail = (useWeights ? TEST.wbar : 1) * expDraw(live);
    total += trail;
    var need = (1 - ALPHA) * total, acc = 0, lam = Infinity;
    for (i = 0; i < n; i++) {
      var j = ORDER[i];
      acc += masses[j];
      if (acc >= need) { lam = RHO[j]; break; }
    }
    return { lam: lam, masses: masses, total: total };
  }

  var fmtPct = function (v) { return (100 * v).toFixed(1) + '%'; };

  // ---------- stage definitions (captions get live numbers patched in) ----------
  var STAGES = [
    {
      useWeights: false,
      caption: '<b>Deployment shifts.</b> A predictor calibrated on the blue inputs is ' +
        'deployed on the red ones — harder, noisier. Selecting the threshold from the ' +
        'calibration scores as if nothing changed keeps certifying &ldquo;risk ≤ 10%&rdquo;, ' +
        'but the risk actually deployed is <b>RISKB</b>. More calibration data does not fix ' +
        'this — it only concentrates the selection on the wrong answer.'
    },
    {
      useWeights: true,
      caption: '<b>Reweight the evidence.</b> Give every calibration point an Exp(1) mass — a ' +
        'Bayesian bootstrap over the calibration distribution — and tilt the masses by the ' +
        'likelihood ratio (red rings): Ṽ<sub>i</sub> ∝ w<sub>i</sub>E<sub>i</sub>. Each draw is one ' +
        'plausible deployment distribution, its α-crossing one plausible threshold. This is the ' +
        '<i>exact</i> posterior under the shift — nothing approximate, still O(n) per draw.'
    },
    {
      useWeights: true, emphasize: true,
      caption: '<b>Certify at credibility β.</b> Deploy the smallest λ that 95% of the posterior ' +
        'declares safe. The deployed risk returns to target, and the posterior&rsquo;s honesty is ' +
        'the point: only n<sub>eff</sub> ≈ NEFF of the ' + n + ' points speak for the deployment ' +
        'region, so the spread σ<sub>post</sub> widens — the trust readout a single number never ' +
        'carries. If no λ reaches β, WBCP abstains instead of guessing.'
    }
  ];

  // ---------- svg scaffold ----------
  var W = 880, H = 396;
  var svg = d3.select('#hero-anim').append('svg')
    .attr('viewBox', '0 0 ' + W + ' ' + H)
    .attr('role', 'img')
    .attr('aria-label', 'Animation: covariate shift breaks shift-blind threshold selection; reweighting the Bayesian bootstrap masses gives the exact posterior and a certified threshold');

  var INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#898781',
      GRID = '#e1e0d9', BASE = '#c3c2b7',
      BLUE = '#2a78d6', RED = '#d03b3b', GREEN = '#006300';
  var FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  function text(g, x, y, s, a) {
    var t = g.append('text').attr('x', x).attr('y', y)
      .attr('font-family', FONT).attr('font-size', 12.5).attr('fill', INK2).text(s);
    for (var k in (a || {})) t.attr(k, a[k]);
    return t;
  }
  // "n_eff" with a real subscript (unicode sub/superscripts render unevenly)
  function subText(t, main, sub, rest) {
    t.text(null);
    t.append('tspan').text(main);
    t.append('tspan').attr('baseline-shift', '-18%').attr('font-size', '10').text(sub);
    t.append('tspan').attr('baseline-shift', '0').attr('font-size', '13').text(rest);
    return t;
  }

  // ----- left panel: calibration points & masses -----
  var L = { x0: 34, x1: 408, base: 316, top: 120 };
  var xScale = d3.scaleLinear().domain([XA - 0.1, XB + 0.1]).range([L.x0, L.x1]);

  var gl = svg.append('g');
  var glTitle = text(gl, L.x0, 22, 'Calibration set under covariate shift', { 'font-size': 15, 'font-weight': 600, fill: INK });
  gl.append('line').attr('x1', L.x0).attr('x2', L.x1).attr('y1', L.base).attr('y2', L.base)
    .attr('stroke', BASE);
  text(gl, (L.x0 + L.x1) / 2, L.base + 30, 'covariate x', { 'text-anchor': 'middle', fill: MUTED });
  [1, 2, 3].forEach(function (v) {
    text(gl, xScale(v), L.base + 16, v, { 'text-anchor': 'middle', fill: MUTED, 'font-size': 11.5 });
  });

  var densY = d3.scaleLinear().domain([0, 0.011]).range([L.base, L.top]);
  var areaGen = d3.area()
    .x(function (d) { return xScale(d.x); })
    .y0(L.base)
    .y1(function (d) { return densY(d.p); })
    .curve(d3.curveBasis);
  function densData(tm) {
    return tm.xs.map(function (x, i) { return { x: x, p: tm.ps[i] }; });
  }
  gl.append('path')                                   // calibration density (flat)
    .attr('d', areaGen(densData(CAL)))
    .attr('fill', BLUE).attr('opacity', 0.10)
    .attr('stroke', BLUE).attr('stroke-opacity', 0.45).attr('stroke-width', 1.5);
  gl.append('path')                                   // deployment density (tilted)
    .attr('d', areaGen(densData(TEST)))
    .attr('fill', RED).attr('opacity', 0.10)
    .attr('stroke', RED).attr('stroke-opacity', 0.6).attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '5 3');
  text(gl, L.x0 + 4, L.top - 30, '— calibration Pₓ', { fill: BLUE, 'font-size': 12.5 });
  text(gl, L.x0 + 4, L.top - 14, '-- deployment P̃ₓ', { fill: RED, 'font-size': 12.5 });

  // likelihood-ratio rings (the evidence weights) + posterior-mass dots
  var haloSel = gl.selectAll('circle.halo').data(X).enter().append('circle')
    .attr('class', 'halo')
    .attr('cx', function (d) { return xScale(d); }).attr('cy', L.base)
    .attr('r', 0).attr('fill', 'none')
    .attr('stroke', RED).attr('stroke-width', 1).attr('stroke-dasharray', '2.5 2')
    .attr('opacity', 0);
  var dotSel = gl.selectAll('circle.dot').data(X).enter().append('circle')
    .attr('class', 'dot')
    .attr('cx', function (d) { return xScale(d); }).attr('cy', L.base)
    .attr('r', 3).attr('fill', BLUE).attr('fill-opacity', 0.5)
    .attr('stroke', BLUE).attr('stroke-width', 0.8);
  var dotLbl = text(gl, L.x1, L.top - 14, '', { 'text-anchor': 'end', fill: INK2, 'font-size': 12.5 });

  // ----- right panel: threshold posterior -----
  var R = { x0: 470, x1: 856, base: 316, top: 120 };
  var LMIN = 2.0, LMAX = 9.6, NBINS = 12;
  var lamScale = d3.scaleLinear().domain([LMIN, LMAX]).range([R.x0, R.x1]);
  var binW = (LMAX - LMIN) / NBINS;
  var histH = R.base - R.top - 24;

  var gr = svg.append('g');
  var grTitle = text(gr, R.x0, 22, '', { 'font-size': 15, 'font-weight': 600, fill: INK });
  text(gr, R.x0, 40, 'target risk α = 0.10 · credibility β = 0.95', { fill: MUTED, 'font-size': 12 });
  gr.append('line').attr('x1', R.x0).attr('x2', R.x1).attr('y1', R.base).attr('y2', R.base)
    .attr('stroke', BASE);
  text(gr, (R.x0 + R.x1) / 2, R.base + 30, 'threshold λ', { 'text-anchor': 'middle', fill: MUTED });
  d3.range(2, 10, 2).forEach(function (v) {
    text(gr, lamScale(v), R.base + 16, v, { 'text-anchor': 'middle', fill: MUTED, 'font-size': 11.5 });
  });

  // danger zone: thresholds whose deployed risk exceeds α
  gr.append('rect')
    .attr('x', R.x0).attr('y', R.top - 14)
    .attr('width', Math.max(0, lamScale(TEST.lamStar) - R.x0)).attr('height', R.base - R.top + 14)
    .attr('fill', RED).attr('opacity', 0.06);
  text(gr, R.x0 + 4, R.top - 2, 'deployed risk > α', { fill: RED, 'font-size': 12 });

  var barSel = gr.selectAll('rect.bar').data(d3.range(NBINS)).enter().append('rect')
    .attr('class', 'bar')
    .attr('x', function (i) { return lamScale(LMIN + i * binW) + 1; })
    .attr('width', (lamScale(LMIN + binW) - lamScale(LMIN)) - 2)
    .attr('y', R.base).attr('height', 0)
    .attr('rx', 1.5)
    .attr('fill', MUTED).attr('fill-opacity', 0.75);

  // oracle λ* marker
  var starX = lamScale(TEST.lamStar);
  gr.append('line')
    .attr('x1', starX).attr('x2', starX)
    .attr('y1', R.top - 14).attr('y2', R.base)
    .attr('stroke', RED).attr('stroke-width', 1.4).attr('stroke-dasharray', '5 3');
  text(gr, starX - 4, R.top - 22, 'oracle λ*(α)', { fill: RED, 'font-size': 12, 'text-anchor': 'end' });

  // selected threshold marker
  var hpdLine = gr.append('line')
    .attr('y1', R.top + 4).attr('y2', R.base)
    .attr('stroke', INK).attr('stroke-width', 1.6);
  var hpdLbl = text(gr, 0, R.top - 2, '', { fill: INK, 'font-size': 12, 'text-anchor': 'start', 'font-weight': 600 });

  // readouts
  var roNeff = text(gr, R.x1, 40, '', { 'text-anchor': 'end', 'font-size': 13 });
  var roRisk = text(gr, R.x1, 60, '', { 'text-anchor': 'end', 'font-size': 13, 'font-weight': 600 });
  var roSig  = text(gr, R.x1, 80, '', { 'text-anchor': 'end', 'font-size': 13 });

  // ---------- animation state ----------
  var stage = 0, autoplay = true, buffer = [], BUF = 420;
  var captionEl = document.getElementById('stage-caption');
  var pills = document.querySelectorAll('#stage-pills button');

  // patch measured numbers into the captions (measured, not asserted)
  (function () {
    var probe = [];
    for (var k = 0; k < 4000; k++) probe.push(drawCrossing(false).lam);
    probe.sort(d3.ascending);
    var lamBlind = d3.quantileSorted(probe, BETA);
    STAGES[0].caption = STAGES[0].caption.replace('RISKB', fmtPct(TEST.risk(lamBlind)));
    STAGES[2].caption = STAGES[2].caption.replace('NEFF', NEFF.toFixed(0));
  })();

  function setStage(s) {
    stage = s;
    buffer = [];
    pills.forEach(function (p) { p.classList.toggle('active', +p.dataset.stage === s); });
    captionEl.innerHTML = STAGES[s].caption;

    var t = d3.transition().duration(650);
    var weighted = STAGES[s].useWeights;

    glTitle.text(weighted
      ? 'Calibration set — dot area = reweighted posterior mass'
      : 'Calibration set under covariate shift');
    grTitle.text(weighted
      ? 'Exact posterior over the deployed threshold'
      : 'Shift-blind selection (as if nothing changed)');
    dotLbl.text(weighted ? 'ring radius ∝ likelihood ratio wᵢ' : '');

    haloSel.transition(t)
      .attr('r', function (d, i) { return weighted ? 2.5 + 8 * Math.sqrt(Wg[i] / d3.max(Wg)) : 0; })
      .attr('opacity', weighted ? 0.55 : 0);

    barSel.attr('fill', weighted ? BLUE : MUTED);
    hpdLbl.text(weighted ? 'λ HPD (β)' : 'λ selected');
  }

  // per-tick update: three fresh posterior draws
  function tick() {
    var st = STAGES[stage];
    var last;
    for (var k = 0; k < 3; k++) {
      last = drawCrossing(st.useWeights);
      if (isFinite(last.lam)) {
        buffer.push(last.lam);
        if (buffer.length > BUF) buffer.shift();
      }
    }

    // dots breathe with the newest draw's masses
    dotSel.attr('r', function (d, i) {
      return Math.min(12, 52 * Math.sqrt(last.masses[i] / last.total));
    });

    // histogram over the buffer (normalized to the tallest bin)
    var counts = new Array(NBINS).fill(0);
    buffer.forEach(function (l) {
      var b = Math.floor((l - LMIN) / binW);
      if (b >= 0 && b < NBINS) counts[b]++;
    });
    var cmax = d3.max(counts) || 1;
    var hpd = null;
    if (buffer.length > 20) {
      var sorted = buffer.slice().sort(d3.ascending);
      hpd = d3.quantileSorted(sorted, BETA);
    }
    barSel
      .attr('y', function (i) { return R.base - histH * counts[i] / cmax; })
      .attr('height', function (i) { return histH * counts[i] / cmax; })
      .attr('fill-opacity', function (i) {
        // stage 2: dim the 1-β tail beyond the certified threshold
        if (!STAGES[stage].emphasize || hpd == null) return 0.75;
        return (LMIN + (i + 0.5) * binW) > hpd ? 0.22 : 0.85;
      });

    if (hpd != null) {
      var hx = Math.min(lamScale(hpd), R.x1);
      var sig = d3.deviation(buffer) || 0;
      var risk = TEST.risk(hpd);
      hpdLine.attr('x1', hx).attr('x2', hx);
      hpdLbl.attr('x', hx + 4);

      if (stage === 0) {
        subText(roNeff, 'n', 'eff', ' = ' + NEFF.toFixed(0) + ' — ignored').attr('fill', RED);
      } else {
        subText(roNeff, 'n', 'eff', ' = ' + NEFF.toFixed(0) + ' of ' + n).attr('fill', INK2);
      }
      roRisk.text('deployed risk at selected λ: ' + fmtPct(risk))
        .attr('fill', risk <= ALPHA + 0.006 ? GREEN : RED);
      subText(roSig, 'σ', 'post', ' = ' + sig.toFixed(2)).attr('fill', INK2);
    }
  }

  // ---------- controls & loops ----------
  document.getElementById('stage-pills').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    autoplay = false;
    setStage(+b.dataset.stage);
  });

  setStage(0);
  d3.interval(tick, 90);
  d3.interval(function () { if (autoplay) setStage((stage + 1) % 3); }, 9000);

  // shared with the per-step visualizations (steps.js)
  window.WBCP_SIM = {
    n: n, X: X, RHO: RHO, ORDER: ORDER, Wg: Wg, wbar: TEST.wbar,
    ALPHA: ALPHA, BETA: BETA, XA: XA, XB: XB, GAMMA: GAMMA,
    mulberry32: mulberry32
  };
})();
