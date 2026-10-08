// Timing helpers for lesson choreography. Everything a "watch" beat draws is
// a pure function of its local time t, so the timeline can be scrubbed.

export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const lerpP = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });

export const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOut = (u) => 1 - Math.pow(1 - u, 3);
export const easeIn = (u) => u * u * u;

/** Progress 0→1 of a window [t0, t0 + dur] at time t, eased. */
export function ramp(t, t0, dur = 0.6, ease = easeInOut) {
  if (dur <= 0) return t >= t0 ? 1 : 0;
  return ease(clamp((t - t0) / dur));
}

/** Fade in at t0, optionally fade out at t1. */
export function fade(t, t0, t1 = Infinity, dur = 0.45) {
  return Math.min(ramp(t, t0, dur), 1 - ramp(t, t1, dur));
}

/** Gentle pulse (0..1) for "touch me" affordances. */
export const pulse = (t, period = 1.6) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period);

/** Snap to a step. */
export const snap = (v, step) => Math.round(v / step) * step;

/** Format a number for typeset labels (proper minus sign, fixed decimals). */
export function num(v, d = 1) {
  const s = (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
  return s.replace('-', '−');
}
