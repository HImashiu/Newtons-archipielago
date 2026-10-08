// Technical-drawing primitives. All functions work in SCREEN space (px) and
// return SVG path data or simple geometry, so line weights and arrowheads keep
// a constant, publication-quality size regardless of zoom.

import * as V from '../core/vec.js';

const f = (n) => (Number.isFinite(n) ? +n.toFixed(2) : 0);
export const pt = (p) => `${f(p.x)},${f(p.y)}`;

export function line(a, b) {
  return `M${pt(a)}L${pt(b)}`;
}

export function polyline(points) {
  if (points.length === 0) return '';
  return `M${points.map(pt).join('L')}`;
}

/** Filled arrowhead with its tip at `tip`, pointing along `dir`. */
export function arrowHead(tip, dir, length = 10, halfWidth = 3.5, notch = 0.15) {
  const u = V.norm(dir);
  const n = V.perp(u);
  const base = V.addScaled(tip, u, -length);
  const back = V.addScaled(tip, u, -length * (1 - notch));
  const l = V.addScaled(base, n, halfWidth);
  const r = V.addScaled(base, n, -halfWidth);
  return `M${pt(tip)}L${pt(l)}L${pt(back)}L${pt(r)}Z`;
}

/** Arrow shaft that stops at the base of the head so the tip stays crisp. */
export function arrowShaft(from, to, headLength = 10) {
  const d = V.sub(to, from);
  const L = V.len(d);
  if (L < 1e-6) return '';
  const end = V.addScaled(from, d, Math.max(0, (L - headLength * 0.8) / L));
  return line(from, end);
}

/**
 * Hatching for a fixed surface from a to b. `side` is +1 or -1 and selects
 * which side of a→b (relative to the left normal) gets the hatch.
 */
export function hatch(a, b, side = -1, spacing = 8, depth = 9) {
  const d = V.sub(b, a);
  const L = V.len(d);
  if (L < 1) return '';
  const u = V.scale(d, 1 / L);
  const n = V.scale(V.perp(u), side);
  // 45° strokes leaning back along the surface.
  const stroke = V.add(V.scale(n, depth), V.scale(u, -depth));
  let path = '';
  for (let s = spacing * 0.5; s <= L + depth * 0.2; s += spacing) {
    const p = V.addScaled(a, u, Math.min(s, L));
    path += `M${pt(p)}l${f(stroke.x)},${f(stroke.y)}`;
  }
  return path;
}

/** Zig-zag coil spring between a and b with straight leads at each end. */
export function springPath(a, b, coils = 8, amplitude = 7, lead = 10) {
  const d = V.sub(b, a);
  const L = V.len(d);
  if (L < 1e-6) return '';
  const u = V.scale(d, 1 / L);
  const n = V.perp(u);
  const leadL = Math.min(lead, L * 0.2);
  const body = L - 2 * leadL;
  const pts = [a, V.addScaled(a, u, leadL)];
  const segs = coils * 2;
  for (let i = 0; i < segs; i++) {
    const t = leadL + (body * (i + 0.5)) / segs;
    const side = i % 2 === 0 ? 1 : -1;
    pts.push(V.add(V.addScaled(a, u, t), V.scale(n, amplitude * side)));
  }
  pts.push(V.addScaled(a, u, L - leadL), b);
  return polyline(pts);
}

/** Viscous damper (dashpot) symbol between a and b. */
export function dashpotPath(a, b, width = 9) {
  const d = V.sub(b, a);
  const L = V.len(d);
  if (L < 1e-6) return '';
  const u = V.scale(d, 1 / L);
  const n = V.perp(u);
  const cylStart = L * 0.3;
  const cylEnd = L * 0.72;
  const pistonAt = L * 0.55;
  const P = (t, s = 0) => V.add(V.addScaled(a, u, t), V.scale(n, s));
  return [
    line(P(0), P(cylStart)),
    // cylinder: open-ended U
    `M${pt(P(cylEnd, width))}L${pt(P(cylStart, width))}L${pt(P(cylStart, -width))}L${pt(P(cylEnd, -width))}`,
    // piston plate and rod
    line(P(pistonAt, width * 0.72), P(pistonAt, -width * 0.72)),
    line(P(pistonAt), P(L)),
  ].join('');
}

/** Rounded link (slot) outline between pin centres a and b. */
export function linkPath(a, b, halfWidth = 6) {
  const d = V.sub(b, a);
  const L = V.len(d);
  if (L < 1e-6) return '';
  const u = V.scale(d, 1 / L);
  const n = V.scale(V.perp(u), halfWidth);
  const a1 = V.add(a, n), a2 = V.sub(a, n), b1 = V.add(b, n), b2 = V.sub(b, n);
  const r = f(halfWidth);
  return `M${pt(a1)}L${pt(b1)}A${r},${r} 0 0 0 ${pt(b2)}L${pt(a2)}A${r},${r} 0 0 0 ${pt(a1)}Z`;
}

export function circlePath(c, r) {
  const rr = f(r);
  return `M${f(c.x - r)},${f(c.y)}a${rr},${rr} 0 1 0 ${f(2 * r)},0a${rr},${rr} 0 1 0 ${f(-2 * r)},0Z`;
}

/**
 * Circular arc in screen space from screen-angle a0 to a1 (radians, measured
 * with screen y down). Returns path data and the arc midpoint.
 */
export function arc(c, r, a0, a1) {
  const p0 = V.add(c, V.fromAngle(a0, r));
  const p1 = V.add(c, V.fromAngle(a1, r));
  const sweep = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const mid = V.add(c, V.fromAngle((a0 + a1) / 2, r));
  return { d: `M${pt(p0)}A${f(r)},${f(r)} 0 ${large} ${sweep} ${pt(p1)}`, mid, p0, p1 };
}

/**
 * Angle dimension between two world-space directions measured CCW from
 * `fromAngle` to `toAngle` (world radians). Produces arc + arrowhead geometry
 * in screen space around screen point c.
 */
export function angleDim(c, r, fromAngle, toAngle) {
  // World CCW → screen: negate angles (y flips).
  let a0 = -fromAngle;
  let a1 = -toAngle;
  const g = arc(c, r, a0, a1);
  const tangentDir = a1 < a0 ? -1 : 1;
  const tipTangent = V.scale(V.perp(V.fromAngle(a1)), tangentDir);
  return { ...g, head: arrowHead(g.p1, tipTangent, 7, 2.6), labelAt: V.add(c, V.fromAngle((a0 + a1) / 2, r + 13)) };
}

/**
 * Linear dimension between screen points a and b, offset perpendicular by
 * `offset` px. Returns extension lines, the dimension line with arrows and a
 * text anchor whose rotation keeps the text upright.
 */
export function dimension(a, b, offset = 24, gap = 4, overshoot = 5) {
  const d = V.sub(b, a);
  const L = V.len(d);
  if (L < 1e-6) return null;
  const u = V.scale(d, 1 / L);
  const n = V.perp(u);
  const off = V.scale(n, offset);
  const da = V.add(a, off), db = V.add(b, off);
  const s = Math.sign(offset) || 1;
  const ext = [
    line(V.addScaled(a, n, gap * s), V.addScaled(da, n, overshoot * s)),
    line(V.addScaled(b, n, gap * s), V.addScaled(db, n, overshoot * s)),
  ].join('');
  const inside = L > 34;
  let dimLine, heads;
  if (inside) {
    dimLine = line(V.addScaled(da, u, 6), V.addScaled(db, u, -6));
    heads = arrowHead(da, V.neg(u), 8, 2.6) + arrowHead(db, u, 8, 2.6);
  } else {
    dimLine = line(V.addScaled(da, u, -18), V.addScaled(db, u, 18)) + line(da, db);
    heads = arrowHead(da, u, 8, 2.6) + arrowHead(db, V.neg(u), 8, 2.6);
  }
  let ang = (Math.atan2(u.y, u.x) * 180) / Math.PI;
  if (ang > 90) ang -= 180;
  if (ang <= -90) ang += 180;
  const mid = V.lerp(da, db, 0.5);
  const textAt = V.addScaled(mid, n, 0);
  return { ext, dimLine, heads, textAt, angle: ang, normal: n };
}

/** Pin support: triangle on hatched ground under pin centre p. */
export function pinSupport(p, size = 13, down = { x: 0, y: 1 }) {
  const u = V.norm(down);
  const n = V.perp(u);
  const apex = p;
  const baseC = V.addScaled(p, u, size * 1.35);
  const l = V.addScaled(baseC, n, size);
  const r = V.addScaled(baseC, n, -size);
  const tri = `M${pt(apex)}L${pt(l)}L${pt(r)}Z`;
  const gl = V.addScaled(l, n, size * 0.45), gr = V.addScaled(r, n, -size * 0.45);
  const ground = line(gl, gr);
  const h = hatch(gl, gr, -1, 6, 7);
  return { tri, ground, hatch: h };
}

/** Wall/ceiling anchor: a short hatched plate centred on p, facing `normal`. */
export function anchorPlate(p, normal, halfLength = 16) {
  const nrm = V.norm(normal);
  const t = V.perp(nrm);
  const a = V.addScaled(p, t, halfLength);
  const b = V.addScaled(p, t, -halfLength);
  // Hatch on the side opposite to the normal.
  const side = V.dot(V.perp(V.sub(b, a)), nrm) > 0 ? -1 : 1;
  return { plate: line(a, b), hatch: hatch(a, b, side, 6, 8) };
}

/** Coordinate frame triad at origin o with world rotation `theta`. */
export function frameTriad(o, theta, length = 46) {
  const ux = V.fromAngle(-theta);
  const uy = V.fromAngle(-theta - Math.PI / 2);
  const x = V.addScaled(o, ux, length);
  const y = V.addScaled(o, uy, length);
  return {
    x: { shaft: arrowShaft(o, x, 9), head: arrowHead(x, ux, 9, 3.2), tip: x, dir: ux },
    y: { shaft: arrowShaft(o, y, 9), head: arrowHead(y, uy, 9, 3.2), tip: y, dir: uy },
  };
}

/** Curved arrow around c (e.g. angular velocity), CCW in world if ccw. */
export function curvedArrow(c, r, startAngle, sweep) {
  const a0 = -startAngle;
  const a1 = -(startAngle + sweep);
  const g = arc(c, r, a0, a1);
  const dirSign = a1 < a0 ? -1 : 1;
  const tangent = V.scale(V.perp(V.fromAngle(a1)), dirSign);
  return { d: g.d, head: arrowHead(g.p1, tangent, 8, 3), mid: g.mid };
}

/** "Nice" tick step for an axis spanning `range` with about `target` ticks. */
export function niceStep(range, target = 8) {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / mag;
  const nice = r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10;
  return nice * mag;
}
