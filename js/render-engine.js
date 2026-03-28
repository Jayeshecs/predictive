/**
 * render-engine.js — The "Eyes"
 * Canvas API rendering for all four phases.
 * Exports a RenderEngine class and phase-specific draw functions.
 */

// ── Canvas setup helpers ──────────────────────────────────────────────────────

/**
 * Configure a canvas for high-DPI screens.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ ctx: CanvasRenderingContext2D, W: number, H: number }}
 */
export function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || canvas.width;
  const H = canvas.clientHeight || canvas.height;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W, H };
}

// ── Grid helpers ──────────────────────────────────────────────────────────────

const GRID_RANGE = 6; // units visible from centre

/** Convert a unit coordinate to canvas pixel. */
function toPixel(val, size) {
  return size / 2 + (val / GRID_RANGE) * (size / 2);
}

/** Convert canvas pixel to unit coordinate. */
export function toUnit(px, size) {
  return ((px - size / 2) / (size / 2)) * GRID_RANGE;
}

// ── Shared draw utilities ─────────────────────────────────────────────────────

/**
 * Draw the standard Cartesian grid with axes and tick labels.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W canvas logical width
 * @param {number} H canvas logical height
 * @param {{ iHat?: number[], jHat?: number[] }} [transform] - optional basis vectors for warped grid
 */
export function drawGrid(ctx, W, H, transform) {
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const unit = W / 2 / GRID_RANGE;

  // Background
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, W, H);

  if (transform) {
    drawWarpedGrid(ctx, W, H, transform, unit);
  } else {
    drawStandardGrid(ctx, W, H, cx, cy, unit);
  }

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(W, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, H);
  ctx.stroke();

  // Tick labels
  ctx.fillStyle = 'rgba(136,144,187,0.8)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
    if (i === 0) continue;
    const px = toPixel(i, W);
    ctx.fillText(i, px, cy + 14);
  }
  ctx.textAlign = 'right';
  for (let j = -GRID_RANGE; j <= GRID_RANGE; j++) {
    if (j === 0) continue;
    const py = toPixel(-j, H);
    ctx.fillText(j, cx - 4, py + 3);
  }
}

function drawStandardGrid(ctx, W, H, cx, cy, unit) {
  ctx.strokeStyle = 'rgba(46,50,72,0.9)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
    const x = cx + i * unit;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();

    const y = cy + i * unit;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawWarpedGrid(ctx, W, H, { iHat, jHat }, unit) {
  const cx = W / 2;
  const cy = H / 2;

  const iX = iHat[0] * unit;
  const iY = -iHat[1] * unit;
  const jX = jHat[0] * unit;
  const jY = -jHat[1] * unit;

  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  // Grid lines along j direction
  ctx.strokeStyle = 'rgba(33,150,243,0.25)';
  for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
    const ox = cx + i * iX;
    const oy = cy + i * iY;
    ctx.beginPath();
    ctx.moveTo(ox + -GRID_RANGE * jX, oy + -GRID_RANGE * jY);
    ctx.lineTo(ox + GRID_RANGE * jX, oy + GRID_RANGE * jY);
    ctx.stroke();
  }

  // Grid lines along i direction
  ctx.strokeStyle = 'rgba(76,175,80,0.25)';
  for (let j = -GRID_RANGE; j <= GRID_RANGE; j++) {
    const ox = cx + j * jX;
    const oy = cy + j * jY;
    ctx.beginPath();
    ctx.moveTo(ox + -GRID_RANGE * iX, oy + -GRID_RANGE * iY);
    ctx.lineTo(ox + GRID_RANGE * iX, oy + GRID_RANGE * iY);
    ctx.stroke();
  }
}

// ── Arrow drawing ─────────────────────────────────────────────────────────────

/**
 * Draw an arrow from (x0,y0) to (x1,y1) in canvas pixels.
 */
function drawArrow(ctx, x0, y0, x1, y1, color, lineWidth = 2.5) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;

  const headLen = Math.min(12, len * 0.35);
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(
    x1 - headLen * Math.cos(angle - Math.PI / 7),
    y1 - headLen * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    x1 - headLen * Math.cos(angle + Math.PI / 7),
    y1 - headLen * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw a vector from the origin to (vx, vy) in unit coordinates.
 */
export function drawVector(ctx, W, H, vx, vy, color, label) {
  const cx = W / 2;
  const cy = H / 2;
  const x1 = toPixel(vx, W);
  const y1 = toPixel(-vy, H);
  drawArrow(ctx, cx, cy, x1, y1, color);

  if (label) {
    ctx.fillStyle = color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x1 + 6, y1 - 6);
  }
}

// ── Phase 1 renderer ──────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {{ v: number[], w: number[], k: number }} state
 */
export function renderPhase1(ctx, W, H, { v, w, k }) {
  drawGrid(ctx, W, H);

  const kv = [v[0] * k, v[1] * k];
  const sum = [v[0] + w[0], v[1] + w[1]];

  // V + W parallelogram dashed lines
  const cx = W / 2;
  const cy = H / 2;

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(233,30,99,0.4)';
  ctx.lineWidth = 1;

  const pVx = toPixel(v[0], W), pVy = toPixel(-v[1], H);
  const pWx = toPixel(w[0], W), pWy = toPixel(-w[1], H);
  const pSx = toPixel(sum[0], W), pSy = toPixel(-sum[1], H);

  ctx.beginPath();
  ctx.moveTo(pVx, pVy);
  ctx.lineTo(pSx, pSy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pWx, pWy);
  ctx.lineTo(pSx, pSy);
  ctx.stroke();
  ctx.setLineDash([]);

  drawVector(ctx, W, H, v[0], v[1], '#2196F3', 'V');
  drawVector(ctx, W, H, w[0], w[1], '#4CAF50', 'W');
  drawVector(ctx, W, H, kv[0], kv[1], '#FF9800', `${k.toFixed(1)}V`);
  drawVector(ctx, W, H, sum[0], sum[1], '#E91E63', 'V+W');
}

// ── Phase 2 renderer ──────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {{ M: number[][], a: number[], b: number[] }} state
 */
export function renderPhase2(ctx, W, H, { M, a, b }) {
  const iHat = [M[0][0], M[1][0]]; // column 0
  const jHat = [M[0][1], M[1][1]]; // column 1

  drawGrid(ctx, W, H, { iHat, jHat });

  // Original basis vectors (dashed)
  const cx = W / 2;
  const cy = H / 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(33,150,243,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(toPixel(1, W), cy);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(76,175,80,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, toPixel(-1, H));
  ctx.stroke();
  ctx.setLineDash([]);

  // Transformed basis vectors
  drawVector(ctx, W, H, iHat[0], iHat[1], '#2196F3', 'î');
  drawVector(ctx, W, H, jHat[0], jHat[1], '#4CAF50', 'ĵ');

  // Vectors a and b
  drawVector(ctx, W, H, a[0], a[1], '#FF9800', 'a');
  drawVector(ctx, W, H, b[0], b[1], '#E91E63', 'b');
}

// ── Phase 3 renderer ──────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {{ points: {x,y}[], pc1: number[], projected: {x,y}[]|null }} state
 */
export function renderPhase3(ctx, W, H, { points, pc1, projected }) {
  drawGrid(ctx, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const unit = W / 2 / GRID_RANGE;

  // PC1 axis line (extended)
  const ext = GRID_RANGE;
  ctx.strokeStyle = '#FF9800';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(cx + (-ext * pc1[0]) * unit, cy + (ext * pc1[1]) * unit);
  ctx.lineTo(cx + (ext * pc1[0]) * unit, cy + (-ext * pc1[1]) * unit);
  ctx.stroke();
  ctx.setLineDash([]);

  // Data points
  for (const p of points) {
    const px = cx + p.x * unit;
    const py = cy - p.y * unit;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2196F3';
    ctx.fill();
  }

  // Projected points + connectors
  if (projected) {
    for (let i = 0; i < points.length; i++) {
      const orig = points[i];
      const proj = projected[i];
      const ox = cx + orig.x * unit;
      const oy = cy - orig.y * unit;
      const prx = cx + proj.x * unit;
      const pry = cy - proj.y * unit;

      ctx.strokeStyle = 'rgba(233,30,99,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(prx, pry);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(prx, pry, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#E91E63';
      ctx.fill();
    }
  }
}

// ── Phase 4 renderer ──────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {{ points: {x,y}[], regression: {slope,intercept}|null }} state
 */
export function renderPhase4(ctx, W, H, { points, regression }) {
  drawGrid(ctx, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const unit = W / 2 / GRID_RANGE;

  // Data points
  for (const p of points) {
    const px = cx + p.x * unit;
    const py = cy - p.y * unit;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#2196F3';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Regression line
  if (regression) {
    const { slope, intercept } = regression;
    const x0 = -GRID_RANGE;
    const x1 = GRID_RANGE;
    const y0 = slope * x0 + intercept;
    const y1 = slope * x1 + intercept;

    ctx.beginPath();
    ctx.moveTo(cx + x0 * unit, cy - y0 * unit);
    ctx.lineTo(cx + x1 * unit, cy - y1 * unit);
    ctx.strokeStyle = '#E91E63';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.stroke();
  }
}
