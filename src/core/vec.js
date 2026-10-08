// Immutable 2-D vector helpers. World units are SI metres, y points up.

export const vec = (x = 0, y = 0) => ({ x, y });
export const ZERO = Object.freeze({ x: 0, y: 0 });

export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a, s) => ({ x: a.x * s, y: a.y * s });
export const addScaled = (a, b, s) => ({ x: a.x + b.x * s, y: a.y + b.y * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export const len2 = (a) => a.x * a.x + a.y * a.y;
export const len = (a) => Math.hypot(a.x, a.y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const neg = (a) => ({ x: -a.x, y: -a.y });
export const perp = (a) => ({ x: -a.y, y: a.x });
export const clone = (a) => ({ x: a.x, y: a.y });
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const angleOf = (a) => Math.atan2(a.y, a.x);
export const fromAngle = (theta, r = 1) => ({ x: Math.cos(theta) * r, y: Math.sin(theta) * r });
export const eq = (a, b, eps = 1e-9) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

export function norm(a) {
  const l = Math.hypot(a.x, a.y);
  return l > 1e-12 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

export function rotate(a, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

/** Closest point to p on segment ab, with the segment parameter t in [0, 1]. */
export function closestOnSegment(p, a, b) {
  const ab = sub(b, a);
  const l2 = len2(ab);
  const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return { point: addScaled(a, ab, t), t };
}

/** Wrap an angle to (-π, π]. */
export function wrapAngle(theta) {
  let t = theta % (2 * Math.PI);
  if (t <= -Math.PI) t += 2 * Math.PI;
  if (t > Math.PI) t -= 2 * Math.PI;
  return t;
}

export const deg = (rad) => (rad * 180) / Math.PI;
export const rad = (degrees) => (degrees * Math.PI) / 180;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
