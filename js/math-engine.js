/**
 * math-engine.js — The "Brain"
 * Pure Math.js-based logic for all four phases.
 * Exports functions consumed by app.js and render-engine.js.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a Math.js matrix from a plain 2-element array [x, y]. */
export function vec2(x, y) {
  return math.matrix([x, y]);
}

// ── Phase 1: Vector Operations ───────────────────────────────────────────────

/**
 * Scale a 2D vector by scalar k.
 * @param {number[]} v - [x, y]
 * @param {number}   k - scalar
 * @returns {number[]} k·v
 */
export function scaleVector(v, k) {
  return math.multiply(k, v);
}

/**
 * Add two 2D vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]} a + b
 */
export function addVectors(a, b) {
  return math.add(a, b);
}

/**
 * Compute the magnitude (L2 norm) of a 2D vector.
 * @param {number[]} v
 * @returns {number}
 */
export function magnitude(v) {
  return math.norm(v);
}

// ── Phase 2: Matrix Transformation & Dot Product ─────────────────────────────

/**
 * Apply a 2×2 matrix transformation to a 2D vector.
 * @param {number[][]} M - [[a,b],[c,d]]
 * @param {number[]}   v - [x, y]
 * @returns {number[]} M·v
 */
export function applyTransform(M, v) {
  return math.multiply(math.matrix(M), math.matrix(v)).toArray();
}

/**
 * Compute the dot product of two 2D vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function dotProduct(a, b) {
  return math.dot(a, b);
}

/**
 * Compute the angle between two 2D vectors (in degrees).
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function angleBetween(a, b) {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  const cosTheta = math.max(-1, math.min(1, dot / (magA * magB)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// ── Phase 3: PCA / Dimensionality Reduction ──────────────────────────────────

/**
 * Generate a random 2D data cloud with a given correlation.
 * @param {number} n       - Number of points
 * @param {number} spread  - Spread factor
 * @returns {{ x: number, y: number }[]}
 */
export function generateDataCloud(n, spread) {
  const points = [];
  const angle = Math.PI / 4; // 45-degree principal axis
  for (let i = 0; i < n; i++) {
    const t = (Math.random() - 0.5) * spread * 4;
    const noise = (Math.random() - 0.5) * spread * 0.8;
    points.push({
      x: t * Math.cos(angle) - noise * Math.sin(angle),
      y: t * Math.sin(angle) + noise * Math.cos(angle),
    });
  }
  return points;
}

/**
 * Compute PCA for a set of 2D points.
 * Returns the first principal component (unit vector) and explained variance.
 * @param {{ x: number, y: number }[]} points
 * @returns {{ pc1: number[], variance: number, totalVariance: number }}
 */
export function computePCA(points) {
  const n = points.length;
  if (n < 2) return { pc1: [1, 0], variance: 0, totalVariance: 0 };

  // Centre the data
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  // Covariance matrix entries
  let cxx = 0, cxy = 0, cyy = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    cxx += dx * dx;
    cxy += dx * dy;
    cyy += dy * dy;
  }
  cxx /= n;
  cxy /= n;
  cyy /= n;

  // Eigenvalues of [[cxx, cxy],[cxy, cyy]]
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
  const lambda1 = trace / 2 + disc; // largest eigenvalue
  const lambda2 = trace / 2 - disc;

  // Eigenvector for lambda1
  let pc1;
  if (Math.abs(cxy) > 1e-10) {
    const v = [lambda1 - cyy, cxy];
    const norm = Math.sqrt(v[0] ** 2 + v[1] ** 2);
    pc1 = [v[0] / norm, v[1] / norm];
  } else {
    pc1 = cxx >= cyy ? [1, 0] : [0, 1];
  }

  return {
    pc1,
    variance: lambda1,
    totalVariance: lambda1 + lambda2,
    explainedRatio: lambda1 / Math.max(lambda1 + lambda2, 1e-10),
  };
}

/**
 * Project a set of 2D points onto a unit vector (1D projection).
 * Returns the projected points as 2D positions on the axis line.
 * @param {{ x: number, y: number }[]} points
 * @param {number[]} axis - unit vector [ux, uy]
 * @returns {{ x: number, y: number }[]}
 */
export function projectPoints(points, axis) {
  return points.map((p) => {
    const t = p.x * axis[0] + p.y * axis[1];
    return { x: t * axis[0], y: t * axis[1] };
  });
}

/**
 * Variance of 1D projected scalar values.
 * @param {{ x: number, y: number }[]} points
 * @param {number[]} axis
 * @returns {number}
 */
export function projectedVariance(points, axis) {
  const scalars = points.map((p) => p.x * axis[0] + p.y * axis[1]);
  const mean = scalars.reduce((a, b) => a + b, 0) / scalars.length;
  const variance =
    scalars.reduce((a, b) => a + (b - mean) ** 2, 0) / scalars.length;
  return variance;
}

// ── Phase 4: Linear Regression (Normal Equation) ─────────────────────────────

/**
 * Fit a linear regression line using the Normal Equation:
 *   θ = (AᵀA)⁻¹ Aᵀb
 *
 * @param {{ x: number, y: number }[]} points
 * @returns {{ slope: number, intercept: number } | null}
 */
export function linearRegression(points) {
  if (points.length < 2) return null;

  // Build design matrix A = [[1, x0], [1, x1], ...]
  const A = points.map((p) => [1, p.x]);
  const b = points.map((p) => p.y);

  const AM = math.matrix(A);
  const bM = math.matrix(b);

  try {
    const AT = math.transpose(AM);
    const ATA = math.multiply(AT, AM);
    const ATAinv = math.inv(ATA);
    const ATb = math.multiply(AT, bM);
    const theta = math.multiply(ATAinv, ATb).toArray();

    return { intercept: theta[0], slope: theta[1] };
  } catch {
    // Singular matrix (all x values identical)
    return null;
  }
}

/**
 * Compute R² (coefficient of determination) for the fitted line.
 * @param {{ x: number, y: number }[]} points
 * @param {number} slope
 * @param {number} intercept
 * @returns {number}
 */
export function rSquared(points, slope, intercept) {
  const yMean = points.reduce((s, p) => s + p.y, 0) / points.length;
  const ssTot = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const ssRes = points.reduce(
    (s, p) => s + (p.y - (slope * p.x + intercept)) ** 2,
    0
  );
  if (ssTot === 0) return 1;
  return 1 - ssRes / ssTot;
}
