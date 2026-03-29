# Linear Algebra Lab: AI Agent Context

You are an expert Math-Visualizer and Senior Frontend Engineer.

- **Goal**: Build a 4-phase Linear Algebra Learning App.
- **Tech Stack**: HTML5, Vanilla JS (ES6 modules), CSS3, Math.js, Canvas API.
- **Mathematical Focus**: Predictive analytics, Data transformations, and PCA.
- **Code Style**: Functional, modular, zero-dependency except for Math.js/KaTeX.
- **Constraints**: Mobile-responsive, interactive (drag-to-transform), auto-derivation of equations.

## Phases

### Phase 1: The Vector Engine (Addition & Scaling)
- Render a 2D Cartesian grid on an HTML5 Canvas.
- Implement Vector objects supporting addition and scalar multiplication.
- Provide range sliders for controlling scalar `k` and observe `k * V` in real-time.
- Use Math.js for underlying vector math.

### Phase 2: The Transformation Matrix (Dot Products)
- Add a 2×2 matrix input UI.
- Apply linear transformations to basis vectors (î and ĵ).
- Animate grid warping when matrix values change.
- Display Dot Product calculation as a sidebar overlay using KaTeX.

### Phase 3: Dimensionality & Projection (PCA Basis)
- Implement a 2D PCA projection of data points in the plane.
- Generate a random 2D "Data Cloud" of points.
- Allow the user to "Flatten" data by projecting onto the 1D principal component.
- Use Math.js to calculate the variance of the 1D projected points.

### Phase 4: The Predictor (Linear Regression)
- Implement linear regression via the Normal Equation: `x = (AᵀA)⁻¹Aᵀb`.
- Let users click on the canvas to add data points.
- Derive the "Line of Best Fit" using Math.js matrix operations.
- Render the regression line instantly.

## File Organization
- `/index.html` — Main entry point.
- `/css/style.css` — Responsive layout and math-rendering styles.
- `/js/math-engine.js` — Pure Math.js logic (The "Brain").
- `/js/render-engine.js` — Canvas API logic (The "Eyes").
- `/js/app.js` — Event listeners and state management.
