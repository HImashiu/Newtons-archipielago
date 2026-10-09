// Ink: the drawing language of the lessons. Line art in the style of
// engineering-mechanics figures — hatched supports, grey-filled parts,
// slender filled arrowheads, dimension lines, numbered balloons — rendered as
// crisp SVG through the keyed Painter. Geometry is given in world metres
// (y up); stroke weights and text sizes are in screen pixels so the drawing
// keeps its line hierarchy at every zoom.

import { Painter } from '../../render/painter.js';
import * as V from '../../core/vec.js';
import { mathMarkup, estimateWidth } from '../../render/mathtext.js';

const f = (n) => (Number.isFinite(n) ? +n.toFixed(2) : 0);
const P2 = (p) => `${f(p.x)},${f(p.y)}`;

export class Ink {
  constructor(svg) {
    this.svg = svg;
    this.P = new Painter(svg);
    this.W = 800;
    this.H = 600;
    this.cx = 0;
    this.cy = 0;
    this.k = 100; // px per metre
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  /** Frame a world rectangle, keeping aspect, with padding in px. */
  frame(b, pad = 28) {
    const kx = (this.W - 2 * pad) / (b.xmax - b.xmin);
    const ky = (this.H - 2 * pad) / (b.ymax - b.ymin);
    this.k = Math.min(kx, ky);
    this.cx = (b.xmin + b.xmax) / 2;
    this.cy = (b.ymin + b.ymax) / 2;
  }

  S(p) {
    return { x: (p.x - this.cx) * this.k + this.W / 2, y: this.H / 2 - (p.y - this.cy) * this.k };
  }

  toWorld(sx, sy) {
    return { x: (sx - this.W / 2) / this.k + this.cx, y: (this.H / 2 - sy) / this.k + this.cy };
  }

  begin() {
    this.P.begin();
  }

  end() {
    this.P.end();
  }

  // ------------------------------------------------------------- basics

  _attrs(cls, o, extra = {}) {
    const a = { class: cls, ...extra };
    if (o.op !== undefined && o.op < 0.999) a.opacity = f(o.op);
    if (o.draw !== undefined && o.draw < 0.999) {
      a.pathLength = 1;
      a['stroke-dasharray'] = `${f(Math.max(0, o.draw))} 2`;
    }
    if (o.ref) a['data-ref'] = o.ref;
    return a;
  }

  visible(o) {
    return !(o.op !== undefined && o.op <= 0.002) && !(o.draw !== undefined && o.draw <= 0.002);
  }

  /** Raw screen-space path. */
  path(key, d, cls = 'ink', o = {}) {
    if (!d || !this.visible(o)) return;
    this.P.el(o.layer ?? 'statics', key, 'path', this._attrs(cls, o, { d }));
  }

  line(key, a, b, cls = 'ink', o = {}) {
    this.path(key, `M${P2(this.S(a))}L${P2(this.S(b))}`, cls, o);
  }

  poly(key, pts, cls = 'ink', o = {}) {
    if (pts.length < 2) return;
    this.path(key, `M${pts.map((p) => P2(this.S(p))).join('L')}`, cls, o);
  }

  circle(key, c, r, cls = 'ink', o = {}) {
    if (!this.visible(o)) return;
    const s = this.S(c);
    this.P.el(o.layer ?? 'bodies', key, 'circle', this._attrs(cls, o, { cx: f(s.x), cy: f(s.y), r: f(r) }));
  }

  /** Typeset label. `$…$` switches to math (Computer Modern italic). */
  text(key, p, str, o = {}) {
    if (!this.visible(o)) return;
    const s = this.S(p);
    const size = o.size ?? 16;
    const attrs = this._attrs(`tx ${o.cls ?? ''}`, o, {
      x: f(s.x + (o.dx ?? 0)), y: f(s.y + (o.dy ?? 0)), 'font-size': size, 'text-anchor': o.anchor ?? 'middle',
    });
    this.P.el(o.layer ?? 'labels', key, 'text', attrs, mathMarkup(str, size));
  }

  // --------------------------------------------------------- drafting

  arrow(key, a, b, cls = 'ink', o = {}) {
    if (!this.visible(o)) return;
    const A = this.S(a);
    const B0 = this.S(b);
    const draw = o.draw ?? 1;
    const B = V.lerp(A, B0, draw);
    const L = V.dist(A, B);
    if (L < 1) return;
    const u = V.scale(V.sub(B, A), 1 / L);
    const hl = Math.min(o.head ?? 11, L * 0.6);
    const hw = (o.headW ?? 3.4) * (hl / (o.head ?? 11));
    const base = V.addScaled(B, u, -hl);
    const n = V.perp(u);
    const shaftEnd = V.addScaled(B, u, -hl * 0.7);
    const oo = { ...o, draw: undefined };
    this.path(`${key}-s`, `M${P2(A)}L${P2(shaftEnd)}`, cls, { ...oo, layer: o.layer ?? 'vectors' });
    this.path(`${key}-h`, `M${P2(B)}L${P2(V.addScaled(base, n, hw))}L${P2(V.addScaled(base, n, -hw))}Z`, `${cls} head`, { ...oo, layer: o.layer ?? 'vectors' });
  }

  /** Fixed ground: a heavy line with 45° hatching underneath. */
  ground(key, a, b, o = {}) {
    if (!this.visible(o)) return;
    const draw = o.draw ?? 1;
    const A = this.S(a);
    const B = V.lerp(A, this.S(b), draw);
    this.path(`${key}-l`, `M${P2(A)}L${P2(B)}`, 'ink heavy', { op: o.op, layer: 'statics' });
    const L = V.dist(A, B);
    if (L < 2) return;
    const u = V.scale(V.sub(B, A), 1 / L);
    const n = V.perp(u); // left-to-right → points down on screen
    const sp = o.spacing ?? 10, depth = o.depth ?? 9;
    let d = '';
    for (let s = sp * 0.6; s < L; s += sp) {
      const p = V.addScaled(A, u, s);
      const q = V.add(p, V.add(V.scale(n, depth), V.scale(u, -depth)));
      d += `M${P2(p)}L${P2(q)}`;
    }
    this.path(`${key}-h`, d, 'hatch', { op: o.op, layer: 'statics' });
  }

  /**
   * Dimension line between world points a and b, offset by `off` px
   * (perpendicular, screen space), with extension lines, arrowheads and an
   * upright label on a paper knockout.
   */
  dimension(key, a, b, off, label, o = {}) {
    if (!this.visible(o)) return;
    const A = this.S(a), B = this.S(b);
    const L = V.dist(A, B);
    if (L < 2) return;
    const u = V.scale(V.sub(B, A), 1 / L);
    const n = V.perp(u);
    const sgn = Math.sign(off) || 1;
    const dA = V.addScaled(A, n, off), dB = V.addScaled(B, n, off);
    const gap = 4, over = 6;
    const ext = `M${P2(V.addScaled(A, n, gap * sgn))}L${P2(V.addScaled(dA, n, over * sgn))}M${P2(V.addScaled(B, n, gap * sgn))}L${P2(V.addScaled(dB, n, over * sgn))}`;
    const cls = `thin ${o.cls ?? ''}`;
    this.path(`${key}-e`, ext, cls, { op: o.op, layer: 'annotations' });
    const head = (tip, dir) => {
      const base = V.addScaled(tip, dir, -9);
      const m = V.perp(dir);
      return `M${P2(tip)}L${P2(V.addScaled(base, m, 2.6))}L${P2(V.addScaled(base, m, -2.6))}Z`;
    };
    if (L > 30) {
      this.path(`${key}-d`, `M${P2(V.addScaled(dA, u, 6))}L${P2(V.addScaled(dB, u, -6))}`, cls, { op: o.op, layer: 'annotations' });
      this.path(`${key}-a`, head(dA, V.neg(u)) + head(dB, u), `${cls} head`, { op: o.op, layer: 'annotations' });
    } else {
      this.path(`${key}-d`, `M${P2(V.addScaled(dA, u, -16))}L${P2(V.addScaled(dB, u, 16))}`, cls, { op: o.op, layer: 'annotations' });
      this.path(`${key}-a`, head(dA, u) + head(dB, V.neg(u)), `${cls} head`, { op: o.op, layer: 'annotations' });
    }
    if (label) {
      const size = o.size ?? 16;
      let mid = V.lerp(dA, dB, 0.5);
      const w = estimateWidth(label, size) + 10;
      let ang = (Math.atan2(u.y, u.x) * 180) / Math.PI;
      if (ang > 90) ang -= 180;
      if (ang <= -90) ang += 180;
      // Steep dimensions keep their text horizontal, set beside the line.
      if (Math.abs(ang) > 50) {
        mid = V.add(mid, { x: Math.sign(n.x * sgn || 1) * (w / 2 + 2), y: 0 });
        ang = 0;
      }
      const tr = Math.abs(ang) > 0.5 ? `rotate(${f(ang)} ${P2(mid)})` : null;
      this.P.el('annotations', `${key}-k`, 'rect', { x: f(mid.x - w / 2), y: f(mid.y - size * 0.62), width: f(w), height: f(size * 1.2), class: 'knockout', transform: tr, opacity: o.op !== undefined && o.op < 0.999 ? f(o.op) : null });
      this.P.el('labels', `${key}-t`, 'text', { x: f(mid.x), y: f(mid.y + size * 0.33), 'font-size': size, 'text-anchor': 'middle', class: `tx ${o.textCls ?? ''}`, transform: tr, opacity: o.op !== undefined && o.op < 0.999 ? f(o.op) : null }, mathMarkup(label, size));
    }
  }

  /** Numbered balloon callout with a leader line to `target` (world). */
  balloon(key, at, label, target, o = {}) {
    if (!this.visible(o)) return;
    const c = this.S(at);
    const r = o.r ?? 12;
    if (target) {
      const t = this.S(target);
      const u = V.norm(V.sub(t, c));
      this.path(`${key}-l`, `M${P2(V.addScaled(c, u, r))}L${P2(t)}`, 'hair', { op: o.op, layer: 'annotations' });
    }
    this.P.el('annotations', `${key}-c`, 'circle', { cx: f(c.x), cy: f(c.y), r, class: 'balloon', opacity: o.op !== undefined && o.op < 0.999 ? f(o.op) : null });
    this.P.el('labels', `${key}-t`, 'text', { x: f(c.x), y: f(c.y + 5.4), 'font-size': 16, 'text-anchor': 'middle', class: 'tx', opacity: o.op !== undefined && o.op < 0.999 ? f(o.op) : null }, mathMarkup(label, 16));
  }

  /** Pin joint / point marker: small open circle with centre dot. */
  pin(key, p, o = {}) {
    if (!this.visible(o)) return;
    this.circle(`${key}-o`, p, o.r ?? 4.2, 'pin', { op: o.op, layer: o.layer ?? 'labels' });
  }

  /**
   * A cart drawn as a technical part: grey body, two wheels on axles, and a
   * reference point marking its position. x is the reference point.
   */
  cart(key, x, o = {}) {
    if (!this.visible(o)) return;
    const y = o.y ?? 0;
    const ghost = !!o.ghost;
    const op = o.op;
    const bodyCls = ghost ? 'ghost' : o.accent ? 'part accent' : 'part';
    const bl = this.S({ x: x - 0.42, y: y + 0.52 });
    const br = this.S({ x: x + 0.42, y: y + 0.15 });
    this.P.el(ghost ? 'trails' : 'bodies', `${key}-b`, 'rect', {
      x: f(bl.x), y: f(bl.y), width: f(br.x - bl.x), height: f(br.y - bl.y), rx: 3,
      class: bodyCls, opacity: op !== undefined && op < 0.999 ? f(op) : null,
    });
    const wr = 0.085 * this.k;
    // Wheels roll without slipping: spoke angle = −x / r.
    const spin = -x / 0.085;
    for (const [i, dx] of [[0, -0.25], [1, 0.25]]) {
      const c = this.S({ x: x + dx, y: y + 0.085 });
      this.P.el(ghost ? 'trails' : 'bodies', `${key}-w${i}`, 'circle', { cx: f(c.x), cy: f(c.y), r: f(wr), class: ghost ? 'ghost' : 'wheel', opacity: op !== undefined && op < 0.999 ? f(op) : null });
      if (!ghost) {
        const u = V.fromAngle(-spin, wr * 0.82);
        this.path(`${key}-sp${i}`, `M${P2(V.add(c, u))}L${P2(V.sub(c, u))}M${P2(V.add(c, V.perp(u)))}L${P2(V.sub(c, V.perp(u)))}`, 'spoke', { op, layer: 'bodies' });
        this.P.el('bodies', `${key}-h${i}`, 'circle', { cx: f(c.x), cy: f(c.y), r: 1.8, class: 'hub', opacity: op !== undefined && op < 0.999 ? f(op) : null });
      }
    }
    // Reference point and its centre line (dash-dot), as on a drawing.
    const top = this.S({ x, y: y + 0.66 });
    const bot = this.S({ x, y: y + 0.02 });
    if (!ghost && o.centerline !== false) this.path(`${key}-cl`, `M${P2(top)}L${P2(bot)}`, 'dashdot', { op, layer: 'bodies' });
    if (!ghost) this.circle(`${key}-r`, { x, y: y + 0.335 }, 3.4, 'pin', { op, layer: 'bodies' });
  }

  /** Small filled dot (motion-diagram snapshot). */
  dot(key, p, o = {}) {
    this.circle(key, p, o.r ?? 3.6, o.cls ?? 'dot', { op: o.op, layer: o.layer ?? 'trails' });
  }

  /** Flag on a pole, standing on the track at x. */
  flag(key, x, label, o = {}) {
    if (!this.visible(o)) return;
    const y = o.y ?? 0;
    this.line(`${key}-p`, { x, y }, { x, y: y + 1.05 }, 'ink', { op: o.op, layer: 'statics' });
    const a = this.S({ x, y: y + 1.05 }), b = this.S({ x: x + 0.42, y: y + 0.92 }), c = this.S({ x, y: y + 0.79 });
    this.path(`${key}-f`, `M${P2(a)}L${P2(b)}L${P2(c)}Z`, 'flag', { op: o.op, layer: 'statics' });
    if (label) this.text(`${key}-t`, { x, y: y + 0.92 }, label, { op: o.op, dx: -8, dy: 4, size: 15, anchor: 'end' });
  }

  /** Text placed in screen pixels (for typeset equations laid out on the stage). */
  textS(key, sx, sy, str, o = {}) {
    if (!this.visible(o)) return;
    const size = o.size ?? 16;
    this.P.el(o.layer ?? 'labels', key, 'text', this._attrs(`tx ${o.cls ?? ''}`, o, {
      x: f(sx), y: f(sy), 'font-size': size, 'text-anchor': o.anchor ?? 'middle',
    }), mathMarkup(str, size));
  }

  /** Horizontal curly brace under [x0, x1] (screen px) at y, opening upward. */
  brace(key, x0, x1, y, o = {}) {
    if (!this.visible(o) || x1 - x0 < 6) return;
    const hgt = o.h ?? 9;
    const m = (x0 + x1) / 2;
    const q = hgt / 2;
    const d = `M${f(x0)},${f(y)}Q${f(x0)},${f(y + q)} ${f(x0 + q)},${f(y + q)}L${f(m - q)},${f(y + q)}Q${f(m)},${f(y + q)} ${f(m)},${f(y + hgt)}`
      + `M${f(x1)},${f(y)}Q${f(x1)},${f(y + q)} ${f(x1 - q)},${f(y + q)}L${f(m + q)},${f(y + q)}Q${f(m)},${f(y + q)} ${f(m)},${f(y + hgt)}`;
    this.path(key, d, o.cls ?? 'thin', { op: o.op, layer: o.layer ?? 'annotations' });
  }

  /** Pin support under world point p: triangle, hatched ground. */
  pinSupport(key, p, o = {}) {
    if (!this.visible(o)) return;
    const s = this.S(p);
    const size = o.size ?? 15;
    const base = s.y + size * 1.25;
    this.path(`${key}-t`, `M${f(s.x)},${f(s.y)}L${f(s.x - size)},${f(base)}L${f(s.x + size)},${f(base)}Z`, 'support', { op: o.op, layer: 'statics' });
    this.circle(`${key}-p`, p, 3.6, 'pin', { op: o.op, layer: 'statics' });
    this._groundPx(key, s.x - size * 1.5, s.x + size * 1.5, base, o);
  }

  /** Roller support: triangle on two rollers, hatched ground. */
  rollerSupport(key, p, o = {}) {
    if (!this.visible(o)) return;
    const s = this.S(p);
    const size = o.size ?? 15;
    const base = s.y + size * 1.25;
    this.path(`${key}-t`, `M${f(s.x)},${f(s.y)}L${f(s.x - size)},${f(base)}L${f(s.x + size)},${f(base)}Z`, 'support', { op: o.op, layer: 'statics' });
    this.circle(`${key}-p`, p, 3.6, 'pin', { op: o.op, layer: 'statics' });
    const r = 3.4;
    for (const [i, dx] of [[0, -size * 0.55], [1, size * 0.55]]) {
      this.P.el('statics', `${key}-r${i}`, 'circle', { cx: f(s.x + dx), cy: f(base + r), r, class: 'wheel', opacity: o.op !== undefined && o.op < 0.999 ? f(o.op) : null });
    }
    this._groundPx(key, s.x - size * 1.5, s.x + size * 1.5, base + 2 * r, o);
  }

  _groundPx(key, x0, x1, y, o) {
    this.path(`${key}-g`, `M${f(x0)},${f(y)}L${f(x1)},${f(y)}`, 'ink', { op: o.op, layer: 'statics' });
    let d = '';
    for (let x = x0 + 5; x <= x1; x += 7) d += `M${f(x)},${f(y)}L${f(x - 7)},${f(y + 7)}`;
    this.path(`${key}-h`, d, 'hatch', { op: o.op, layer: 'statics' });
  }

  /** Uniform distributed load over [x0, x1] on top of a beam at height y. */
  distLoad(key, x0, x1, y, hgt, o = {}) {
    if (!this.visible(o)) return;
    const top = y + hgt;
    const n = Math.max(2, Math.round((x1 - x0) / 0.5));
    this.line(`${key}-top`, { x: x0, y: top }, { x: x1, y: top }, 'ink', { op: o.op, layer: 'vectors' });
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      this.arrow(`${key}-a${i}`, { x, y: top }, { x, y }, o.cls ?? 'ink', { op: o.op, head: 8, headW: 2.8 });
    }
  }

  /** Moment: a three-quarter circular arrow around world point c. */
  moment(key, c, r, ccw, o = {}) {
    if (!this.visible(o)) return;
    const s = this.S(c);
    const a0 = o.start ?? -Math.PI * 0.75;
    const sweep = (ccw ? 1 : -1) * Math.PI * 1.4;
    // Screen y points down: a CCW (world) turn is a negative screen angle.
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const a = -(a0 + (sweep * i) / 28);
      pts.push({ x: s.x + r * Math.cos(a), y: s.y + r * Math.sin(a) });
    }
    this.path(`${key}-arc`, `M${pts.map((p) => P2(p)).join('L')}`, o.cls ?? 'ink', { op: o.op, layer: 'vectors' });
    const tip = pts[pts.length - 1], prev = pts[pts.length - 3];
    const u = V.norm(V.sub(tip, prev)), n = V.perp(u);
    const base = V.addScaled(tip, u, -10);
    this.path(`${key}-h`, `M${P2(V.addScaled(tip, u, 2))}L${P2(V.addScaled(base, n, 3.6))}L${P2(V.addScaled(base, n, -3.6))}Z`, `${o.cls ?? 'ink'} head`, { op: o.op, layer: 'vectors' });
  }

  /**
   * Internal-force diagram: outline of value(x) over a baseline at world
   * height y0 (value scaled by k m per unit), filled with vertical hatching
   * as in engineering-mechanics texts.
   */
  diagram(key, samples, y0, k, o = {}) {
    if (!this.visible(o) || samples.length < 2) return;
    const pts = samples.map((p) => ({ x: p.x, y: y0 + p.v * k }));
    const first = samples[0], last = samples[samples.length - 1];
    const outline = [{ x: first.x, y: y0 }, ...pts, { x: last.x, y: y0 }];
    this.poly(`${key}-o`, outline, `ink ${o.cls ?? ''}`, { op: o.op, layer: 'vectors', draw: o.draw });
    // Vertical hatch every ~7 px, interpolating the curve.
    const sx0 = this.S({ x: first.x, y: y0 }).x, sx1 = this.S({ x: last.x, y: y0 }).x;
    const reveal = o.draw ?? 1;
    let d = '';
    let j = 0;
    for (let sx = sx0 + 3.5; sx < sx0 + (sx1 - sx0) * reveal; sx += 7) {
      const wx = this.toWorld(sx, 0).x;
      while (j < pts.length - 2 && pts[j + 1].x < wx) j++;
      const a = pts[j], b = pts[j + 1];
      const u = b.x === a.x ? 0 : (wx - a.x) / (b.x - a.x);
      const wy = a.y + (b.y - a.y) * Math.max(0, Math.min(1, u));
      const sy = this.S({ x: wx, y: wy }).y, by = this.S({ x: wx, y: y0 }).y;
      if (Math.abs(sy - by) > 1) d += `M${f(sx)},${f(by)}V${f(sy)}`;
    }
    this.path(`${key}-h`, d, `diag-hatch ${o.cls ?? ''}`, { op: o.op, layer: 'grid' });
  }

  /** A draggable affordance ring (drawn by the player for active handles). */
  handle(key, p, active, t) {
    const s = this.S(p);
    const r = active ? 11 : 9 + 2 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 1.6));
    this.P.el('handles', `${key}-ring`, 'circle', { cx: f(s.x), cy: f(s.y), r: f(r), class: `affordance${active ? ' is-active' : ''}` });
  }
}
