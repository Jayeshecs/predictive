/**
 * app.js — State management and event listeners
 * Ties together math-engine.js and render-engine.js for all four phases.
 */

import {
  scaleVector,
  addVectors,
  magnitude,
  dotProduct,
  angleBetween,
  applyTransform,
  generateDataCloud,
  computePCA,
  projectPoints,
  projectedVariance,
  linearRegression,
  rSquared,
} from './math-engine.js';

import {
  setupCanvas,
  toUnit,
  renderPhase1,
  renderPhase2,
  renderPhase3,
  renderPhase4,
} from './render-engine.js';

// ── Tab navigation ────────────────────────────────────────────────────────────

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(btn.dataset.tab).classList.add('active');

    // Re-render the newly visible phase
    switch (btn.dataset.tab) {
      case 'phase1': renderP1(); break;
      case 'phase2': renderP2(); break;
      case 'phase3': renderP3(); break;
      case 'phase4': renderP4(); break;
    }
  });
});

// ── KaTeX render helper ───────────────────────────────────────────────────────

function renderMath(containerId, latex) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    katex.render(`\\begin{aligned}${latex}\\end{aligned}`, el, {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    el.textContent = latex;
  }
}

function renderMathInline(containerId, latex) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    katex.render(latex, el, { throwOnError: false, displayMode: true });
  } catch {
    el.textContent = latex;
  }
}

// ── Phase 1 setup ─────────────────────────────────────────────────────────────

const canvas1 = document.getElementById('canvas-phase1');
let ctx1, W1, H1;

const p1State = {
  v: [3, 2],
  w: [1, 3],
  k: 1,
};

function renderP1() {
  if (!ctx1) ({ ctx: ctx1, W: W1, H: H1 } = setupCanvas(canvas1));
  renderPhase1(ctx1, W1, H1, p1State);

  const { v, w, k } = p1State;
  const kv = scaleVector(v, k);
  const sum = addVectors(v, w);

  const latex = [
    `\\mathbf{V} = [${v[0]},\\, ${v[1]}],\\quad |\\mathbf{V}| = ${magnitude(v).toFixed(2)}`,
    `\\mathbf{W} = [${w[0]},\\, ${w[1]}]`,
    `k\\mathbf{V} = [${kv[0].toFixed(2)},\\, ${kv[1].toFixed(2)}]`,
    `\\mathbf{V} + \\mathbf{W} = [${sum[0].toFixed(1)},\\, ${sum[1].toFixed(1)}]`,
  ].join('\\\\');

  renderMath('phase1-math', latex);
}

function bindSlider(id, valId, decimals, onChange) {
  const slider = document.getElementById(id);
  const display = document.getElementById(valId);
  if (!slider) return;
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    if (display) display.textContent = val.toFixed(decimals);
    onChange(val);
  });
}

bindSlider('vx', 'vx-val', 1, (v) => { p1State.v[0] = v; renderP1(); });
bindSlider('vy', 'vy-val', 1, (v) => { p1State.v[1] = v; renderP1(); });
bindSlider('wx', 'wx-val', 1, (v) => { p1State.w[0] = v; renderP1(); });
bindSlider('wy', 'wy-val', 1, (v) => { p1State.w[1] = v; renderP1(); });
bindSlider('k-slider', 'k-val', 1, (v) => { p1State.k = v; renderP1(); });

// ── Phase 2 setup ─────────────────────────────────────────────────────────────

const canvas2 = document.getElementById('canvas-phase2');
let ctx2, W2, H2;

const p2State = {
  M: [[1, 0], [0, 1]],
  a: [2, 1],
  b: [1, 3],
};

function renderP2() {
  if (!ctx2) ({ ctx: ctx2, W: W2, H: H2 } = setupCanvas(canvas2));
  renderPhase2(ctx2, W2, H2, p2State);

  const { M, a, b } = p2State;
  const dp = dotProduct(a, b);
  const ang = angleBetween(a, b).toFixed(1);
  const Ma = applyTransform(M, a);
  const Mb = applyTransform(M, b);

  const latex = [
    `\\mathbf{a} \\cdot \\mathbf{b} = ${dp.toFixed(2)},\\quad \\theta = ${ang}^\\circ`,
    `M\\mathbf{a} = [${Ma[0].toFixed(2)},\\, ${Ma[1].toFixed(2)}]`,
    `M\\mathbf{b} = [${Mb[0].toFixed(2)},\\, ${Mb[1].toFixed(2)}]`,
  ].join('\\\\');

  renderMath('phase2-math', latex);
}

['m00', 'm01', 'm10', 'm11'].forEach((id, idx) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const r = Math.floor(idx / 2);
    const c = idx % 2;
    p2State.M[r][c] = parseFloat(el.value) || 0;
    renderP2();
  });
});

function bindP2Slider(id, valId, vecKey, dim) {
  const slider = document.getElementById(id);
  const display = document.getElementById(valId);
  if (!slider) return;
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    if (display) display.textContent = val.toFixed(1);
    p2State[vecKey][dim] = val;
    renderP2();
  });
}

bindP2Slider('a-x', 'a-x-val', 'a', 0);
bindP2Slider('a-y', 'a-y-val', 'a', 1);
bindP2Slider('b-x', 'b-x-val', 'b', 0);
bindP2Slider('b-y', 'b-y-val', 'b', 1);

// ── Phase 3 setup ─────────────────────────────────────────────────────────────

const canvas3 = document.getElementById('canvas-phase3');
let ctx3, W3, H3;

const p3State = {
  points: [],
  pc1: [1, 0],
  projected: null,
  showProjection: false,
  n: 40,
  spread: 2,
};

function generateP3() {
  p3State.points = generateDataCloud(p3State.n, p3State.spread);
  const pca = computePCA(p3State.points);
  p3State.pc1 = pca.pc1;
  if (p3State.showProjection) {
    p3State.projected = projectPoints(p3State.points, p3State.pc1);
  } else {
    p3State.projected = null;
  }
  renderP3();
}

function renderP3() {
  if (!ctx3) ({ ctx: ctx3, W: W3, H: H3 } = setupCanvas(canvas3));
  renderPhase3(ctx3, W3, H3, p3State);

  const pca = computePCA(p3State.points);
  const pVar = p3State.points.length > 0
    ? projectedVariance(p3State.points, p3State.pc1).toFixed(3)
    : '—';

  const explPct = (pca.explainedRatio * 100).toFixed(1);
  const latex = [
    `\\text{PC}_1 = [${pca.pc1[0].toFixed(3)},\\, ${pca.pc1[1].toFixed(3)}]`,
    `\\text{Variance}_{\\text{proj}} = ${pVar}`,
    `\\text{Explained: } ${explPct}\\%`,
  ].join('\\\\');

  renderMath('phase3-math', latex);
}

document.getElementById('btn-generate')?.addEventListener('click', generateP3);

document.getElementById('btn-flatten')?.addEventListener('click', () => {
  p3State.showProjection = !p3State.showProjection;
  if (p3State.showProjection) {
    p3State.projected = projectPoints(p3State.points, p3State.pc1);
  } else {
    p3State.projected = null;
  }
  renderP3();
});

bindSlider('n-points', 'n-points-val', 0, (v) => { p3State.n = Math.round(v); generateP3(); });
bindSlider('spread', 'spread-val', 1, (v) => { p3State.spread = v; generateP3(); });

// ── Phase 4 setup ─────────────────────────────────────────────────────────────

const canvas4 = document.getElementById('canvas-phase4');
let ctx4, W4, H4;

const p4State = {
  points: [],
  regression: null,
};

function renderP4() {
  if (!ctx4) ({ ctx: ctx4, W: W4, H: H4 } = setupCanvas(canvas4));
  renderPhase4(ctx4, W4, H4, p4State);

  const reg = p4State.regression;
  if (reg) {
    const r2 = rSquared(p4State.points, reg.slope, reg.intercept).toFixed(3);
    const latex = [
      `\\hat{y} = ${reg.slope.toFixed(3)}x + ${reg.intercept.toFixed(3)}`,
      `R^2 = ${r2}`,
      `n = ${p4State.points.length}\\text{ points}`,
    ].join('\\\\');
    renderMath('phase4-math', latex);

    // Normal equation display
    renderMathInline('normal-eq-display', '\\boldsymbol{\\theta} = (A^\\top A)^{-1} A^\\top \\mathbf{b}');
  } else {
    const el = document.getElementById('phase4-math');
    if (el) el.textContent = 'Add at least 2 points to fit the regression line.';
    renderMathInline('normal-eq-display', '\\boldsymbol{\\theta} = (A^\\top A)^{-1} A^\\top \\mathbf{b}');
  }
}

canvas4?.addEventListener('click', (e) => {
  if (!ctx4) ({ ctx: ctx4, W: W4, H: H4 } = setupCanvas(canvas4));

  const rect = canvas4.getBoundingClientRect();
  const scaleX = W4 / rect.width;
  const scaleY = H4 / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;

  const ux = toUnit(canvasX, W4);
  const uy = -toUnit(canvasY, H4);

  p4State.points.push({ x: ux, y: uy });
  p4State.regression = linearRegression(p4State.points);
  renderP4();
});

document.getElementById('btn-clear')?.addEventListener('click', () => {
  p4State.points = [];
  p4State.regression = null;
  renderP4();
});

// ── Responsive resize ─────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  // Reset cached contexts so they re-initialise with new dimensions
  ctx1 = null; ctx2 = null; ctx3 = null; ctx4 = null;

  const activeTab = document.querySelector('.tab-btn.active')?.dataset?.tab;
  switch (activeTab) {
    case 'phase1': renderP1(); break;
    case 'phase2': renderP2(); break;
    case 'phase3': renderP3(); break;
    case 'phase4': renderP4(); break;
  }
});

// ── Initial render ────────────────────────────────────────────────────────────

generateP3();
renderP1();
renderP4();
