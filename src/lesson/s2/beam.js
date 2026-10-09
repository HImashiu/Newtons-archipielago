// Simply supported beam: pin at A (x = 0), roller at B (x = L), point loads
// F_i (downward, kN) at x_i and an optional uniform load q (kN/m).
//
// Sign convention (Hibbeler, Beer & Johnston): on the right face of the left
// segment, positive shear V acts downward and positive moment M is counter-
// clockwise (sagging). Equilibrium of the left segment [0, x] gives
//   V(x) = A_y − Σ F_i[x_i < x] − q·x
//   M(x) = A_y·x − Σ F_i·(x − x_i)[x_i < x] − q·x²/2

export function solveBeam({ L, loads = [], q = 0 }) {
  const total = loads.reduce((s, l) => s + l.F, 0) + q * L;
  const momentAboutA = loads.reduce((s, l) => s + l.F * l.x, 0) + (q * L * L) / 2;
  const By = momentAboutA / L;
  const Ay = total - By;

  /** Shear just to the right of x (side = +1) or just to the left (side = −1). */
  const V = (x, side = 1) => {
    let v = Ay - q * x;
    for (const l of loads) if (side > 0 ? l.x <= x : l.x < x) v -= l.F;
    return v;
  };
  const M = (x) => {
    let m = Ay * x - (q * x * x) / 2;
    for (const l of loads) if (l.x < x) m -= l.F * (x - l.x);
    return m;
  };

  /** Points for drawing the diagrams, with vertical jumps at point loads. */
  function samples(n = 60) {
    const xs = new Set([0, L, ...loads.map((l) => l.x)]);
    if (q) for (let i = 0; i <= n; i++) xs.add((L * i) / n);
    const sorted = [...xs].sort((a, b) => a - b);
    const shear = [];
    const moment = [];
    for (const x of sorted) {
      const left = V(x, -1), right = V(x, 1);
      if (x > 0) shear.push({ x, v: left });
      if (x < L) shear.push({ x, v: right });
      moment.push({ x, v: M(x) });
    }
    return { shear, moment };
  }

  /** Largest |M| and where it occurs. */
  function maxMoment() {
    const cands = [0, L, ...loads.map((l) => l.x)];
    if (q) {
      // Where V changes sign inside a segment with distributed load.
      const pts = [0, ...loads.map((l) => l.x).sort((a, b) => a - b), L];
      for (let i = 0; i < pts.length - 1; i++) {
        const v0 = V(pts[i], 1);
        const x0 = pts[i] + v0 / q;
        if (x0 > pts[i] && x0 < pts[i + 1]) cands.push(x0);
      }
    }
    let best = { x: 0, M: 0 };
    for (const x of cands) if (Math.abs(M(x)) > Math.abs(best.M) + 1e-12) best = { x, M: M(x) };
    return best;
  }

  return { L, loads, q, Ay, By, V, M, samples, maxMoment };
}
