// Shared helpers for level definitions.

import * as V from '../core/vec.js';
import { fmt } from '../render/mathtext.js';

export { V, fmt };

export function ground(world, { x0 = -60, x1 = 60, y = 0, friction = 0.4, restitution = 0.4, name = 'ground', style = {} } = {}) {
  return world.addSegment({ a: { x: x0, y }, b: { x: x1, y }, friction, restitution, name, style });
}

/** Intersection of two circles; `upper` picks the solution left of c0→c1. */
export function circleIntersect(c0, r0, c1, r1, upper = true) {
  const d = V.dist(c0, c1);
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d < 1e-9) return null;
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const u = V.scale(V.sub(c1, c0), 1 / d);
  const m = V.addScaled(c0, u, a);
  return V.addScaled(m, V.perp(u), upper ? h : -h);
}

export const inRect = (p, z) => p.x >= z.xmin && p.x <= z.xmax && p.y >= z.ymin && p.y <= z.ymax;

/**
 * Track upward zero crossings of a signal to measure its period.
 * Returns the latest full period (s) or null.
 */
export function trackPeriod(rt, key, value, t) {
  const st = rt[key] ?? (rt[key] = { prev: value, crossings: [] });
  if (st.prev < 0 && value >= 0) {
    // Linear interpolation of the crossing time inside this frame.
    const frac = st.prev / (st.prev - value);
    st.crossings.push(t - (1 - frac) / 60);
    if (st.crossings.length > 6) st.crossings.shift();
  }
  st.prev = value;
  const c = st.crossings;
  return c.length >= 2 ? c[c.length - 1] - c[c.length - 2] : null;
}

export const N = (v, d = 2) => fmt(v, d);
export const deg = (r) => V.deg(r);

/** "ok" marker for equation rows. */
export const check = (ok) => (ok ? ' ✓' : '');
