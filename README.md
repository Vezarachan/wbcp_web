# WBCP Project Page

Project website for **Weighted Bayesian Conformal Prediction** (Lou & Luo, 2026).

Minimal single-page design in the spirit of
[horwitz.ai/spectral_detuning](https://horwitz.ai/spectral_detuning), layout
conventions from the
[Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
(CC BY-SA 4.0, credited in the footer). Fully self-contained: d3 is vendored
locally, no CDN, no build step, no external fonts.

## Structure

```
index.html              the whole page
static/
  css/style.css         all styling
  js/d3.v7.min.js       vendored d3 v7.9.0
  js/hero.js            the three-stage hero animation (live simulation)
  js/compare.js         benchmark comparison bar chart (paper Tables 1-4)
  paper.pdf             neurips_wbqcp_v8.pdf
old_version/            earlier, more detailed page (charts of raw trial data)
```

## The hero animation

`hero.js` runs a live, seeded simulation of the paper's synthetic benchmark
(X ~ U[0.15, 3.85], Y|X ~ N(0, X²), miscoverage loss, n = 200, exponential
tilt γ = 1.5, α = 0.1, β = 0.95). Three stages:

1. **Deployment shifts** — shift-blind selection on the calibration scores;
   the live readout shows the deployed risk it actually incurs (~14%).
2. **Reweight the evidence** — Ṽᵢ ∝ wᵢEᵢ, the exact posterior over the
   deployed threshold; the histogram is built from the same draws that
   animate the dot masses.
3. **Certify at credibility β** — the β-quantile threshold, deployed risk
   back at target, with n_eff and σ_post as trust readouts.

Every number shown (deployed risk, n_eff, σ_post, oracle λ*) is computed in
the browser, none are hardcoded. The RNG is seeded, so the page shows the
same calibration set on every load; the parameters were chosen (see
`old_version/` history) so the single displayed calibration set is
representative of the paper's aggregate results.

## Local preview

```bash
python3 -m http.server 8791
```

then open http://localhost:8791.

## Deploy

Push the directory contents to a GitHub repo and enable GitHub Pages
(Settings → Pages → deploy from branch, root). No build step needed.

## Before release (TODOs)

- Replace the disabled **arXiv** / **Code** buttons in `index.html` with real URLs.
- Update the BibTeX entry once the arXiv ID exists.
- `.claude/launch.json` is local tooling; exclude it from the published repo.
