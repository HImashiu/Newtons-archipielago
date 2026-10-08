// Scene renderer: draws the physics world and level annotations through the
// keyed Painter. Which layers appear is controlled by view.features, which the
// current level (and the learner's View menu) decides — beginner scenes stay
// minimal and technical detail appears only when a concept needs it.
//
// Every drawn element carries data-ref (what it represents, for linked
// highlighting) and, when manipulable, data-hit (what dragging it does).

import * as V from '../core/vec.js';
import * as D from './draft.js';
import { mathMarkup, estimateWidth, fmt, escapeXml } from './mathtext.js';

const PALETTE = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#ef4444', '#eab308', '#14b8a6', '#ec4899'];

export const FORCE_WORDS = {
  weight: 'weight', normal: 'support', friction: 'friction', spring: 'spring',
  constraint: 'tension', drag: 'air drag', script: 'program',
};

export function bodyColor(world, b) {
  if (b.color) return b.color;
  const i = world.bodies.indexOf(b);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
}

/** Build a vector label like "$\v{F}_s$" from "F_s"; leave words alone. */
export function vecLabel(label) {
  if (label.includes('$')) return label;
  const m = /^([A-Za-zͰ-Ͽ])(_\{?[^}]*\}?)?$/.exec(label);
  return m ? `$\\v{${m[1]}}${m[2] ?? ''}$` : label;
}

export function renderScene(painter, camera, world, view) {
  painter.begin();
  const ctx = new SceneContext(painter, camera, world, view);
  ctx.draw();
  painter.end();
  return ctx;
}

class SceneContext {
  constructor(P, cam, world, view) {
    this.P = P;
    this.cam = cam;
    this.world = world;
    this.view = view;
    this.f = view.features;
    this.style = view.style;
    this.placed = [];
    this.fontSize = this.style === 'soft' ? 14 : 13;
  }

  S(p) {
    return this.cam.toScreen(p);
  }

  cls(base, ...refs) {
    const v = this.view;
    let c = base;
    for (const r of refs) {
      if (!r) continue;
      if (v.selection === r) c += ' is-selected';
      if (v.hover === r) c += ' is-hover';
      if (v.linked && v.linked.has(r)) c += ' is-linked';
    }
    return c;
  }

  draw() {
    this.grid();
    this.zones();
    this.trails();
    this.prediction();
    this.segments();
    this.sliders();
    this.springs();
    this.rods();
    this.motors();
    this.bodies();
    this.vectors();
    this.annotations();
    this.handles();
    this.bubbles();
    this.screen();
  }

  // ------------------------------------------------------------- labels

  /** Place a text label, nudging it to avoid already-placed labels. */
  label(layer, key, at, text, opts = {}) {
    const size = opts.size ?? this.fontSize;
    const w = estimateWidth(text, size) + 4;
    const h = size * 1.25;
    const anchor = opts.anchor ?? 'middle';
    const box = (p) => {
      const x0 = anchor === 'start' ? p.x : anchor === 'end' ? p.x - w : p.x - w / 2;
      return { x0, x1: x0 + w, y0: p.y - h * 0.8, y1: p.y + h * 0.25 };
    };
    let p = at;
    if (opts.avoid !== false) {
      const dir = opts.nudge ?? { x: 0, y: 1 };
      const tries = [0, 1, -1, 2, -2, 3, -3];
      for (const k of tries) {
        const q = V.addScaled(at, dir, k * h * 0.9);
        const b = box(q);
        if (!this.placed.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0)) {
          p = q;
          break;
        }
      }
    }
    this.placed.push(box(p));
    const attrs = {
      x: p.x, y: p.y, 'text-anchor': anchor, class: opts.cls ?? 'lbl',
      'font-size': size, 'data-ref': opts.ref, 'data-hit': opts.hit,
      transform: opts.rotate ? `rotate(${opts.rotate} ${D.pt(p)})` : null,
    };
    this.P.el(layer, key, 'text', attrs, mathMarkup(text, size));
    return p;
  }

  // --------------------------------------------------------------- grid

  grid() {
    const { cam, f } = this;
    const b = cam.visibleBounds();
    if (f.grid) {
      const step = D.niceStep((b.xmax - b.xmin) * 1, cam.W / 70);
      const minor = this.style === 'soft' ? 0 : step / 5;
      let d = '';
      let dm = '';
      const x0 = Math.floor(b.xmin / step) * step;
      const y0 = Math.floor(b.ymin / step) * step;
      for (let x = x0; x <= b.xmax; x += step) {
        const s = cam.toScreen({ x, y: 0 }).x;
        d += `M${s.toFixed(1)},0V${cam.H}`;
        if (minor) for (let k = 1; k < 5; k++) {
          const sm = cam.toScreen({ x: x + k * minor, y: 0 }).x;
          dm += `M${sm.toFixed(1)},0V${cam.H}`;
        }
      }
      for (let y = y0; y <= b.ymax; y += step) {
        const s = cam.toScreen({ x: 0, y }).y;
        d += `M0,${s.toFixed(1)}H${cam.W}`;
        if (minor) for (let k = 1; k < 5; k++) {
          const sm = cam.toScreen({ x: 0, y: y + k * minor }).y;
          dm += `M0,${sm.toFixed(1)}H${cam.W}`;
        }
      }
      if (dm) this.P.el('grid', 'grid-minor', 'path', { d: dm, class: 'grid-minor' });
      this.P.el('grid', 'grid-major', 'path', { d, class: 'grid-major' });
    }
    if (f.axes) this.axes(b);
    else if (f.origin) this.originMark();
    if (f.scaleBar) this.scaleBar();
  }

  axes(b) {
    const { cam } = this;
    const o = cam.toScreen({ x: 0, y: 0 });
    const ox = Math.min(cam.W - 30, Math.max(30, o.x));
    const oy = Math.min(cam.H - 30, Math.max(30, o.y));
    const xEnd = { x: cam.W - 14, y: oy };
    const yEnd = { x: ox, y: 14 };
    this.P.el('grid', 'ax-x', 'path', { d: D.line({ x: 6, y: oy }, xEnd), class: 'axis' });
    this.P.el('grid', 'ax-xh', 'path', { d: D.arrowHead(xEnd, { x: 1, y: 0 }, 10, 3.5), class: 'axis-head' });
    this.P.el('grid', 'ax-y', 'path', { d: D.line({ x: ox, y: cam.H - 6 }, yEnd), class: 'axis' });
    this.P.el('grid', 'ax-yh', 'path', { d: D.arrowHead(yEnd, { x: 0, y: -1 }, 10, 3.5), class: 'axis-head' });
    const unit = this.f.plainLabels ? 'm' : 'm';
    this.label('grid', 'ax-xl', { x: xEnd.x - 4, y: oy - 10 }, `$x$ (${unit})`, { anchor: 'end', cls: 'lbl axis-lbl', avoid: false });
    this.label('grid', 'ax-yl', { x: ox + 10, y: yEnd.y + 12 }, `$y$ (${unit})`, { anchor: 'start', cls: 'lbl axis-lbl', avoid: false });
    const step = D.niceStep(b.xmax - b.xmin, cam.W / 90);
    let ticks = '';
    const fs = 11;
    for (let x = Math.ceil(b.xmin / step) * step; x <= b.xmax; x += step) {
      const s = cam.toScreen({ x, y: 0 }).x;
      if (s < 20 || s > cam.W - 40) continue;
      ticks += `M${s.toFixed(1)},${oy - 4}V${oy + 4}`;
      if (Math.abs(x) > step / 2) {
        this.P.el('grid', `tx${x.toFixed(3)}`, 'text', { x: s, y: oy + 16, class: 'tick-lbl', 'text-anchor': 'middle', 'font-size': fs }, escapeXml(fmt(x, step < 1 ? 1 : 0)));
      }
    }
    for (let y = Math.ceil(b.ymin / step) * step; y <= b.ymax; y += step) {
      const s = cam.toScreen({ x: 0, y }).y;
      if (s < 30 || s > cam.H - 20) continue;
      ticks += `M${ox - 4},${s.toFixed(1)}H${ox + 4}`;
      if (Math.abs(y) > step / 2) {
        this.P.el('grid', `ty${y.toFixed(3)}`, 'text', { x: ox - 7, y: s + 4, class: 'tick-lbl', 'text-anchor': 'end', 'font-size': fs }, escapeXml(fmt(y, step < 1 ? 1 : 0)));
      }
    }
    this.P.el('grid', 'ax-ticks', 'path', { d: ticks, class: 'axis' });
    if (o.x === ox && o.y === oy) this.label('grid', 'ax-o', { x: ox - 8, y: oy + 15 }, '$O$', { anchor: 'end', cls: 'lbl axis-lbl', avoid: false });
  }

  originMark() {
    const o = this.S({ x: 0, y: 0 });
    this.P.el('grid', 'origin', 'path', { d: `M${o.x - 8},${o.y}H${o.x + 8}M${o.x},${o.y - 8}V${o.y + 8}`, class: 'axis' });
    this.label('grid', 'origin-l', { x: o.x - 6, y: o.y + 18 }, 'origin', { anchor: 'end', cls: 'lbl axis-lbl', avoid: false });
  }

  scaleBar() {
    const { cam } = this;
    const len = D.niceStep(120 / cam.scale, 1);
    const px = len * cam.scale;
    const x0 = 18, y0 = cam.H - 20;
    this.P.el('grid', 'scalebar', 'path', { d: `M${x0},${y0 - 5}V${y0 + 5}M${x0},${y0}H${x0 + px}M${x0 + px},${y0 - 5}V${y0 + 5}`, class: 'scalebar' });
    this.P.el('grid', 'scalebar-l', 'text', { x: x0 + px / 2, y: y0 - 8, 'text-anchor': 'middle', class: 'tick-lbl', 'font-size': 12 }, `${fmt(len, len < 1 ? 1 : 0)} m`);
  }

  // -------------------------------------------------------------- zones

  zones() {
    for (const z of this.view.zones ?? []) {
      const cls = `zone${z.reached ? ' is-reached' : ''}`;
      if (z.type === 'rect') {
        const a = this.S({ x: z.xmin, y: z.ymax });
        const b = this.S({ x: z.xmax, y: z.ymin });
        this.P.el('zones', `z-${z.key}`, 'rect', { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, rx: 4, class: cls, 'data-ref': z.key });
        if (z.label) this.label('zones', `zl-${z.key}`, { x: (a.x + b.x) / 2, y: a.y - 7 }, z.label, { cls: 'lbl zone-lbl' });
      } else {
        const c = this.S(z.c);
        const r = Math.max(6, z.r * this.cam.scale);
        this.P.el('zones', `z-${z.key}`, 'circle', { cx: c.x, cy: c.y, r, class: cls, 'data-ref': z.key });
        this.P.el('zones', `zc-${z.key}`, 'path', { d: `M${c.x - 5},${c.y}H${c.x + 5}M${c.x},${c.y - 5}V${c.y + 5}`, class: 'zone-cross' });
        if (z.label) this.label('zones', `zl-${z.key}`, { x: c.x, y: c.y - r - 7 }, z.label, { cls: 'lbl zone-lbl' });
      }
    }
  }

  // ------------------------------------------------------------- trails

  trails() {
    const mode = this.f.trails;
    if (!mode) return;
    for (const b of this.world.bodies) {
      if (!b.trail || !b._trail || b._trail.length < 2) continue;
      const color = bodyColor(this.world, b);
      if (mode === 'dots') {
        const dt = this.view.strobe ?? 0.25;
        let next = b._trail[0].t;
        let i = 0;
        for (const p of b._trail) {
          if (p.t + 1e-9 < next) continue;
          next += dt;
          const s = this.S(p);
          this.P.el('trails', `tr-${b.id}-${i++}`, 'circle', { cx: s.x, cy: s.y, r: 3.2, class: 'trail-dot', style: `--c:${color}`, 'data-ref': b.id });
        }
      } else {
        const pts = b._trail.map((p) => this.S(p));
        this.P.el('trails', `tr-${b.id}`, 'path', { d: D.polyline(pts), class: 'trail-line', style: `--c:${color}`, 'data-ref': b.id });
      }
    }
  }

  prediction() {
    if (!this.f.prediction) return;
    const w = this.world;
    for (const id of this.view.predict ?? []) {
      const b = w.get(id);
      if (!b || !w.isDynamic(b) && !b._drag) continue;
      const pts = [];
      let p = V.clone(b.pos);
      let v = V.clone(b.vel);
      const dt = 0.01;
      let landed = null;
      for (let t = 0; t < 8; t += dt) {
        pts.push(this.S(p));
        v = V.addScaled(v, w.gravity, dt);
        if (w.airDrag > 0) v = V.addScaled(v, v, (-w.airDrag / b.mass) * dt);
        p = V.addScaled(p, v, dt);
        const r = b.shape === 'box' ? b.h / 2 : b.radius;
        if (t > 0.02 && w.segments.some((s) => V.dist(V.closestOnSegment(p, s.a, s.b).point, p) < r)) { landed = p; break; }
        if (p.y < this.cam.visibleBounds().ymin - 2) break;
      }
      this.P.el('trails', `pred-${id}`, 'path', { d: D.polyline(pts), class: 'prediction', 'data-ref': `pred:${id}` });
      if (landed) {
        const s = this.S(landed);
        this.P.el('trails', `predx-${id}`, 'path', { d: `M${s.x - 5},${s.y - 5}L${s.x + 5},${s.y + 5}M${s.x - 5},${s.y + 5}L${s.x + 5},${s.y - 5}`, class: 'prediction-x' });
      }
    }
  }

  // ------------------------------------------------------------ statics

  segments() {
    for (const s of this.world.segments) {
      if (s.style.hidden) continue;
      const a = this.S(s.a), b = this.S(s.b);
      const cls = this.cls('segment', s.id);
      if (s.style.wedge) {
        const base = Math.min(s.a.y, s.b.y);
        const lo = s.a.y < s.b.y ? s.a : s.b;
        const hi = s.a.y < s.b.y ? s.b : s.a;
        const c = this.S({ x: hi.x, y: base });
        this.P.el('statics', `wedge-${s.id}`, 'path', { d: `M${D.pt(this.S(lo))}L${D.pt(this.S(hi))}L${D.pt(c)}Z`, class: 'wedge', 'data-ref': s.id });
        if (this.style !== 'soft') {
          const g0 = this.S({ x: Math.min(lo.x, hi.x) - 0.3, y: base });
          const g1 = this.S({ x: Math.max(lo.x, hi.x) + 0.3, y: base });
          this.P.el('statics', `wedgeb-${s.id}`, 'path', { d: D.line(g0, g1), class: 'segment' });
          this.P.el('statics', `wedgeh-${s.id}`, 'path', { d: D.hatch(g0, g1, -1, 8, 9), class: 'hatch' });
        }
      }
      if (this.style === 'soft') {
        const n = V.norm(V.perp(V.sub(s.b, s.a)));
        const depth = 14 / this.cam.scale;
        const a2 = this.S(V.addScaled(s.a, n, -depth)), b2 = this.S(V.addScaled(s.b, n, -depth));
        this.P.el('statics', `band-${s.id}`, 'path', { d: `M${D.pt(a)}L${D.pt(b)}L${D.pt(b2)}L${D.pt(a2)}Z`, class: 'ground-band', 'data-ref': s.id });
      } else if (s.style.hatch !== false) {
        this.P.el('statics', `hatch-${s.id}`, 'path', { d: D.hatch(a, b, -1, 8, 9), class: 'hatch', 'data-ref': s.id });
      }
      this.P.el('statics', `seg-${s.id}`, 'path', { d: D.line(a, b), class: cls, 'data-ref': s.id, 'data-hit': `seg:${s.id}` });
      if (!s.locked && (this.view.selection === s.id || this.view.tool === 'select')) {
        this.P.el('handles', `sega-${s.id}`, 'circle', { cx: a.x, cy: a.y, r: 5, class: 'handle', 'data-hit': `sega:${s.id}` });
        this.P.el('handles', `segb-${s.id}`, 'circle', { cx: b.x, cy: b.y, r: 5, class: 'handle', 'data-hit': `segb:${s.id}` });
      }
      if (s.style.label && this.f.names) {
        const mid = V.lerp(a, b, 0.5);
        this.label('labels', `segl-${s.id}`, { x: mid.x, y: mid.y + 22 }, s.style.label, { cls: 'lbl muted', ref: s.id });
      }
    }
  }

  sliders() {
    const sc = this.cam.scale;
    for (const sl of this.world.sliders) {
      const b = this.world.get(sl.body);
      const kind = sl.style.kind ?? 'rail';
      if (kind === 'none' || !b) continue;
      const ext = sl.style.extent ?? [Number.isFinite(sl.min) ? sl.min : -3, Number.isFinite(sl.max) ? sl.max : 3];
      const p0 = V.addScaled(sl.origin, sl.dir, ext[0]);
      const p1 = V.addScaled(sl.origin, sl.dir, ext[1]);
      const n = V.perp(sl.dir);
      const half = (b.shape === 'box' ? b.h / 2 : b.radius) + (sl.style.gap ?? 0);
      if (kind === 'rail') {
        const off = sl.style.railOffset ?? -half;
        const a = this.S(V.addScaled(p0, n, off)), c = this.S(V.addScaled(p1, n, off));
        this.P.el('statics', `rail-${sl.id}`, 'path', { d: D.line(a, c), class: this.cls('segment', sl.id), 'data-ref': sl.id, 'data-hit': `slider:${sl.id}` });
        if (this.style !== 'soft') this.P.el('statics', `railh-${sl.id}`, 'path', { d: D.hatch(a, c, -1, 8, 9), class: 'hatch' });
        else {
          const a2 = this.S(V.addScaled(p0, n, off - 10 / sc)), c2 = this.S(V.addScaled(p1, n, off - 10 / sc));
          this.P.el('statics', `railb-${sl.id}`, 'path', { d: `M${D.pt(a)}L${D.pt(c)}L${D.pt(c2)}L${D.pt(a2)}Z`, class: 'ground-band' });
        }
      } else if (kind === 'cylinder') {
        const wall = half + 3 / sc;
        const top0 = this.S(V.addScaled(p0, n, wall)), top1 = this.S(V.addScaled(p1, n, wall));
        const bot0 = this.S(V.addScaled(p0, n, -wall)), bot1 = this.S(V.addScaled(p1, n, -wall));
        this.P.el('statics', `cyl-${sl.id}`, 'path', { d: D.line(top0, top1) + D.line(bot0, bot1) + (sl.style.closed ? D.line(top0, bot0) : ''), class: this.cls('segment', sl.id), 'data-ref': sl.id, 'data-hit': `slider:${sl.id}` });
        this.P.el('statics', `cylh-${sl.id}`, 'path', { d: D.hatch(top0, top1, 1, 8, 9) + D.hatch(bot0, bot1, -1, 8, 9) + (sl.style.closed ? D.hatch(bot0, top0, -1, 8, 9) : ''), class: 'hatch' });
      }
    }
  }

  springs() {
    const sc = this.cam.scale;
    for (const s of this.world.springs) {
      const A = this.world.get(s.a), B = this.world.get(s.b);
      if (!A || !B) continue;
      let a = this.S(A.pos), b = this.S(B.pos);
      const amp = Math.max(4, Math.min(16, (s.width * sc) / 2));
      const cls = this.cls(`spring${this.style === 'soft' ? ' soft' : ''}`, s.id);
      const u = V.norm(V.sub(b, a));
      const n = V.perp(u);
      if (s.style.damper) {
        const off = amp * 1.35;
        const a1 = V.addScaled(a, n, off), b1 = V.addScaled(b, n, off);
        const a2 = V.addScaled(a, n, -off), b2 = V.addScaled(b, n, -off);
        const lead = 12;
        const ea = V.addScaled(a, u, lead), eb = V.addScaled(b, u, -lead);
        this.P.el('connectors', `spl-${s.id}`, 'path', {
          d: D.line(a, ea) + D.line(V.addScaled(ea, n, off), V.addScaled(ea, n, -off)) + D.line(b, eb) + D.line(V.addScaled(eb, n, off), V.addScaled(eb, n, -off)),
          class: cls,
        });
        this.P.el('connectors', `sp-${s.id}`, 'path', { d: D.springPath(V.addScaled(ea, n, off), V.addScaled(eb, n, off), s.coils, amp * 0.8, 6), class: cls, 'data-ref': s.id });
        this.P.el('connectors', `dp-${s.id}`, 'path', { d: D.dashpotPath(V.addScaled(ea, n, -off), V.addScaled(eb, n, -off), amp * 0.8), class: this.cls('dashpot', s.id), 'data-ref': s.id });
        if (this.f.names || this.style === 'drafting') {
          const m1 = V.lerp(a1, b1, 0.5), m2 = V.lerp(a2, b2, 0.5);
          this.label('labels', `spk-${s.id}`, V.addScaled(m1, n, amp + 10), s.style.label ?? '$k$', { ref: s.id, nudge: n });
          this.label('labels', `spc-${s.id}`, V.addScaled(m2, n, -amp - 6), s.style.dampLabel ?? '$c$', { ref: s.id, nudge: V.neg(n) });
        }
      } else {
        this.P.el('connectors', `sp-${s.id}`, 'path', { d: D.springPath(a, b, s.coils, amp, 10), class: cls, 'data-ref': s.id });
        if (this.f.names || this.style === 'drafting') {
          const mid = V.lerp(a, b, 0.5);
          const side = n.y > 0 ? -1 : 1;
          this.label('labels', `spk-${s.id}`, V.addScaled(mid, n, side * (amp + 12)), s.style.label ?? (this.f.plainLabels ? s.name : '$k$'), { ref: s.id, nudge: V.scale(n, side) });
        }
      }
      this.P.el('connectors', `sphit-${s.id}`, 'path', { d: D.line(a, b), class: 'hit-line', 'data-ref': s.id, 'data-hit': `spring:${s.id}` });
    }
  }

  rods() {
    for (const r of this.world.rods) {
      if (!r.visible) continue;
      const A = this.world.get(r.a), B = this.world.get(r.b);
      if (!A || !B) continue;
      const a = this.S(A.pos), b = this.S(B.pos);
      const kind = r.rope ? 'string' : r.style.kind ?? (this.style === 'soft' ? 'bar' : 'link');
      const cls = this.cls(`rod rod-${kind}`, r.id);
      if (kind === 'link') {
        const hw = r.style.halfWidth ?? 6.5;
        this.P.el('connectors', `rod-${r.id}`, 'path', { d: D.linkPath(a, b, hw), class: cls, 'data-ref': r.id });
      } else {
        this.P.el('connectors', `rod-${r.id}`, 'path', { d: D.line(a, b), class: cls, 'data-ref': r.id });
      }
      this.P.el('connectors', `rodhit-${r.id}`, 'path', { d: D.line(a, b), class: 'hit-line', 'data-ref': r.id, 'data-hit': `rod:${r.id}` });
      if (r.style.label && (this.f.names || this.style === 'drafting')) {
        const mid = V.lerp(a, b, r.style.labelAt ?? 0.5);
        const n = V.perp(V.norm(V.sub(b, a)));
        const side = r.style.labelSide ?? (n.y > 0 ? -1 : 1);
        this.label('labels', `rodl-${r.id}`, V.addScaled(mid, n, side * 16), r.style.label, { ref: r.id, nudge: V.scale(n, side) });
      }
    }
  }

  motors() {
    for (const m of this.world.motors) {
      const p = this.world.get(m.pivot);
      if (!p) continue;
      const c = this.S(p.pos);
      if (this.style === 'soft' && !this.f.angles) continue;
      const sweep = Math.sign(m.omega || 1) * 1.6;
      const start = m.angle + Math.PI * 0.75;
      const g = D.curvedArrow(c, 26, start, sweep);
      const cls = this.cls(`motor${m.enabled ? '' : ' is-off'}`, m.id);
      this.P.el('annotations', `mot-${m.id}`, 'path', { d: g.d, class: cls, 'data-ref': m.id, 'data-hit': `motor:${m.id}` });
      this.P.el('annotations', `moth-${m.id}`, 'path', { d: g.head, class: `${cls} head`, 'data-ref': m.id });
      const lbl = m.style.label ?? '$ω$';
      const txt = this.f.values ? `${lbl} = ${fmt(m.omega)} rad/s` : lbl;
      const dir = V.norm(V.sub(g.mid, c));
      this.label('labels', `motl-${m.id}`, V.addScaled(g.mid, dir, 14), txt, { ref: m.id, anchor: dir.x < -0.3 ? 'end' : dir.x > 0.3 ? 'start' : 'middle', nudge: dir });
    }
  }

  // ------------------------------------------------------------- bodies

  bodies() {
    const { world, cam } = this;
    for (const b of world.bodies) {
      if (b.style.hidden) continue;
      const c = this.S(b.pos);
      const color = bodyColor(world, b);
      const hit = b.locked ? `select:${b.id}` : `body:${b.id}`;
      const cls = this.cls(`body body-${b.shape}${b.fixed ? ' is-fixed' : ''}`, b.id);
      if (b.fixed && b.style.support) this.support(b, c);
      if (b.shape === 'ball') {
        const r = Math.max(4, b.radius * cam.scale);
        this.P.el('bodies', `b-${b.id}`, 'circle', { cx: c.x, cy: c.y, r, class: cls, style: `--c:${color}`, 'data-ref': b.id, 'data-hit': hit });
        if (this.style !== 'soft' && r > 9) {
          const k = r + 4;
          this.P.el('bodies', `bc-${b.id}`, 'path', { d: `M${c.x - k},${c.y}H${c.x + k}M${c.x},${c.y - k}V${c.y + k}`, class: 'centerline' });
        } else if (this.style === 'soft' && r > 10) {
          this.P.el('bodies', `bsh-${b.id}`, 'circle', { cx: c.x - r * 0.3, cy: c.y - r * 0.32, r: r * 0.28, class: 'shine' });
        }
      } else if (b.shape === 'box') {
        const w = b.w * cam.scale, h = b.h * cam.scale;
        const ang = (-b.angle * 180) / Math.PI;
        this.P.el('bodies', `b-${b.id}`, 'rect', {
          x: c.x - w / 2, y: c.y - h / 2, width: w, height: h, rx: this.style === 'soft' ? 6 : 0,
          transform: ang ? `rotate(${ang.toFixed(2)} ${D.pt(c)})` : null,
          class: cls, style: `--c:${color}`, 'data-ref': b.id, 'data-hit': hit,
        });
        if (b.style.wheels) {
          const u = V.fromAngle(-b.angle), n = V.perp(u);
          const wr = Math.min(h * 0.18, 7);
          for (const [k, sx] of [[0, -0.3], [1, 0.3]]) {
            const wc = V.add(V.addScaled(c, u, sx * w), V.scale(n, h / 2 - wr));
            const wcc = V.addScaled(wc, n, wr * 2);
            this.P.el('bodies', `bw${k}-${b.id}`, 'circle', { cx: wcc.x, cy: wcc.y, r: wr, class: 'wheel' });
          }
        }
      } else {
        const r = b.fixed ? 4.5 : this.style === 'soft' ? 7 : 4.5;
        this.P.el('bodies', `b-${b.id}`, 'circle', { cx: c.x, cy: c.y, r, class: `${cls}${this.style === 'drafting' || b.style.pin ? ' pin' : ''}`, style: `--c:${color}`, 'data-ref': b.id, 'data-hit': hit });
      }
      // Grab area for small points.
      if (b.shape === 'point') this.P.el('bodies', `bhit-${b.id}`, 'circle', { cx: c.x, cy: c.y, r: 12, class: 'hit-area', 'data-ref': b.id, 'data-hit': hit });

      // Names / coordinates.
      const showName = this.f.names && !b.style.noLabel;
      if (showName || this.f.coords) {
        const r = b.shape === 'box' ? Math.hypot(b.w, b.h) * cam.scale / 2 : b.shape === 'ball' ? b.radius * cam.scale : 6;
        const lbl = b.style.label ?? (this.style === 'drafting' ? `$${b.name}$` : b.name);
        const off = b.style.labelOffset ? { x: b.style.labelOffset.x, y: -b.style.labelOffset.y } : { x: r * 0.75 + 6, y: -r * 0.75 - 6 };
        let text = showName ? lbl : '';
        if (this.f.coords && !b.fixed) text += `${text ? '  ' : ''}(${fmt(b.pos.x)}, ${fmt(b.pos.y)})`;
        if (text) this.label('labels', `bl-${b.id}`, V.add(c, off), text, { anchor: off.x < 0 ? 'end' : 'start', ref: b.id, cls: 'lbl body-lbl', nudge: { x: 0, y: -1 } });
      }
      if (b.style.massLabel && this.style !== 'soft' && b.shape !== 'point') {
        this.label('labels', `bm-${b.id}`, { x: c.x, y: c.y + 5 }, b.style.massLabel, { ref: b.id, avoid: false, cls: 'lbl mass-lbl' });
      }
      if (this.view.selection === b.id) {
        const r = b.shape === 'box' ? Math.hypot(b.w, b.h) * cam.scale / 2 + 6 : Math.max(10, b.radius * cam.scale + 6);
        this.P.el('handles', `sel-${b.id}`, 'circle', { cx: c.x, cy: c.y, r, class: 'selection-ring' });
      }
    }
  }

  support(b, c) {
    const kind = b.style.support;
    if (kind === 'pin' || kind === 'ground-pin') {
      const g = D.pinSupport(c, 12, b.style.supportDir ?? { x: 0, y: 1 });
      this.P.el('statics', `sup-${b.id}`, 'path', { d: g.tri, class: 'support', 'data-ref': b.id });
      this.P.el('statics', `supg-${b.id}`, 'path', { d: g.ground, class: 'segment' });
      this.P.el('statics', `suph-${b.id}`, 'path', { d: g.hatch, class: 'hatch' });
    } else if (kind === 'wall' || kind === 'ceiling' || kind === 'floor') {
      const normal = b.style.normal ?? (kind === 'ceiling' ? { x: 0, y: 1 } : kind === 'floor' ? { x: 0, y: -1 } : { x: 1, y: 0 });
      // Screen-space normal has y flipped.
      const g = D.anchorPlate(c, { x: normal.x, y: -normal.y }, b.style.plate ?? 18);
      this.P.el('statics', `sup-${b.id}`, 'path', { d: g.plate, class: 'segment', 'data-ref': b.id });
      if (this.style !== 'soft') this.P.el('statics', `suph-${b.id}`, 'path', { d: g.hatch, class: 'hatch' });
    }
  }

  // ------------------------------------------------------------ vectors

  arrow(layer, key, originW, vecW, cls, label, opts = {}) {
    const a = this.S(originW);
    const b = this.S(V.add(originW, vecW));
    const L = V.dist(a, b);
    if (L < 3) return null;
    const head = this.style === 'soft' ? 13 : 10;
    const hw = this.style === 'soft' ? 5.5 : 3.6;
    const u = V.norm(V.sub(b, a));
    this.P.el(layer, `${key}-s`, 'path', { d: D.arrowShaft(a, b, head), class: `vec ${cls}${opts.dashed ? ' dashed' : ''}`, 'data-ref': opts.ref });
    this.P.el(layer, `${key}-h`, 'path', { d: D.arrowHead(b, u, Math.min(head, L), hw), class: `vec-head ${cls}`, 'data-ref': opts.ref });
    if (opts.hit) {
      this.P.el('handles', `${key}-hit`, 'circle', { cx: b.x, cy: b.y, r: 9, class: 'tip-handle', 'data-hit': opts.hit, 'data-ref': opts.ref });
    }
    if (label) {
      const at = V.addScaled(b, u, 10);
      const anchor = u.x > 0.35 ? 'start' : u.x < -0.35 ? 'end' : 'middle';
      const dy = u.y > 0.35 ? 12 : u.y < -0.35 ? -2 : 4;
      this.label('labels', `${key}-l`, { x: at.x, y: at.y + dy }, label, { anchor, cls: `lbl vec-lbl ${cls}`, ref: opts.ref, nudge: { x: -u.y, y: u.x } });
    }
    return { a, b };
  }

  components(key, originW, vecW, cls, names, ref, frameAngle = 0) {
    const ux = V.fromAngle(frameAngle), uy = V.perp(ux);
    const cx = V.dot(vecW, ux), cy = V.dot(vecW, uy);
    const px = V.scale(ux, cx), py = V.scale(uy, cy);
    const tip = V.add(originW, vecW);
    // Projections: dashed construction lines from the tip to each axis.
    const a = this.S(V.add(originW, px)), b = this.S(tip), c = this.S(V.add(originW, py));
    this.P.el('vectors', `${key}-cl`, 'path', { d: D.line(a, b) + D.line(c, b), class: `construction ${cls}`, 'data-ref': ref });
    this.arrow('vectors', `${key}-x`, originW, px, `${cls} component`, names[0], { ref });
    this.arrow('vectors', `${key}-y`, originW, py, `${cls} component`, names[1], { ref });
  }

  vectors() {
    const { world, f, view } = this;
    const vS = view.vScale ?? 0.4;
    const fS = view.fScale ?? 0.05;
    const aS = view.aScale ?? 0.15;
    const plain = f.plainLabels;
    const values = f.values;
    const frameAngle = view.componentFrame ?? 0;
    for (const b of world.bodies) {
      if (b.style.hidden) continue;
      const dynamic = world.isDynamic(b) || b._drag || b._motor;
      if (b.fixed && !f.reactions) continue;
      // Forces (free-body diagram).
      if (f.forces && f.forces !== 'off' && b._fbd && !b.style.noForces) {
        let net = { x: 0, y: 0 };
        for (const [key, item] of b._fbd) {
          net = V.add(net, item.vec);
          if (f.forces === 'applied' && !['applied', 'script'].includes(item.kind)) continue;
          if (f.forceKinds && !f.forceKinds.includes(item.kind)) continue;
          const mag = V.len(item.vec);
          if (mag < 1e-3) continue;
          const word = plain ? (item.kind === 'applied' ? item.label : FORCE_WORDS[item.kind] ?? item.label) : vecLabel(item.label);
          const text = values ? `${word} ${plain ? '' : '= '}${fmt(mag)} N` : word;
          const vkey = `fbd:${b.id}:${key}`;
          const isApplied = item.kind === 'applied';
          const hit = isApplied && view.editForces !== false && !world.get(item.ref)?.style?.locked ? `ftip:${item.ref}` : null;
          const vw = V.scale(item.vec, fS);
          this.arrow('vectors', vkey, b.pos, vw, `vec-${item.kind}${this.linkedCls(vkey, item.ref)}`, text, { ref: item.ref ?? vkey, hit });
          if (f.components && (isApplied || f.componentsAll)) {
            const names = plain ? ['', ''] : this.componentNames(item.label, frameAngle !== 0);
            this.components(`${vkey}-c`, b.pos, vw, `vec-${item.kind}`, names, item.ref ?? vkey, frameAngle);
          }
        }
        if (f.net && dynamic && V.len(net) > 1e-3) {
          const lbl = plain ? 'net force' : '$Σ\\v{F}$';
          this.arrow('vectors', `net:${b.id}`, b.pos, V.scale(net, fS), `vec-net${this.linkedCls(`net:${b.id}`)}`, values ? `${lbl} = ${fmt(V.len(net))} N` : lbl, { ref: `net:${b.id}` });
        }
      }
      if (!dynamic && !b.style.showVel) continue;
      if (f.velocity && !b.style.noVel) {
        const lbl = plain ? 'velocity' : '$\\v{v}$';
        const text = values ? `${lbl} ${plain ? '' : '= '}${fmt(V.len(b.vel))} m/s` : lbl;
        const canEdit = view.editVelocity && !b.locked && !b._motor;
        const vw = V.scale(b.vel, vS);
        const r = this.arrow('vectors', `vel:${b.id}`, b.pos, vw, `vec-velocity${this.linkedCls(`vel:${b.id}`)}`, V.len(b.vel) > 1e-3 ? text : null, { ref: `vel:${b.id}`, hit: canEdit ? `vtip:${b.id}` : null });
        if (!r && canEdit) {
          // Zero velocity: still offer a grab handle just beside the body.
          const s = this.S(b.pos);
          const off = (b.shape === 'ball' ? b.radius * this.cam.scale : 10) + 14;
          this.P.el('handles', `vel:${b.id}-hit`, 'circle', { cx: s.x + off, cy: s.y, r: 6, class: 'tip-handle idle', 'data-hit': `vtip0:${b.id}` });
        }
        if (f.components && V.len(b.vel) > 1e-3) {
          this.components(`vel:${b.id}-c`, b.pos, vw, 'vec-velocity', plain ? ['', ''] : this.componentNames('v', frameAngle !== 0), `vel:${b.id}`, frameAngle);
        }
      }
      if (f.acceleration && b._acc && V.len(b._acc) > 1e-2) {
        const lbl = plain ? 'acceleration' : '$\\v{a}$';
        const text = values ? `${lbl} = ${fmt(V.len(b._acc))} m/s²` : lbl;
        this.arrow('vectors', `acc:${b.id}`, b.pos, V.scale(b._acc, aS), `vec-acceleration${this.linkedCls(`acc:${b.id}`)}`, text, { ref: `acc:${b.id}` });
      }
    }
  }

  componentNames(label, prime) {
    const m = /^([A-Za-z\u0370-\u03ff])(?:_\{?([^}]*)\}?)?$/.exec(label);
    const base = m ? m[1] : 'F';
    const sub = m && m[2] ? `${m[2]},` : '';
    const p = prime ? "'" : '';
    return [`$${base}_{${sub}x${p}}$`, `$${base}_{${sub}y${p}}$`];
  }

  linkedCls(...refs) {
    const v = this.view;
    for (const r of refs) {
      if (!r) continue;
      if (v.linked && v.linked.has(r)) return ' is-linked';
      if (v.hover === r) return ' is-hover';
    }
    return '';
  }

  // -------------------------------------------------------- annotations

  annotations() {
    for (const a of this.view.annotations ?? []) {
      const fn = this[`ann_${a.type}`];
      if (fn) fn.call(this, a);
    }
  }

  ann_dim(a) {
    if (!this.f.dimensions && !a.always) return;
    const pa = this.S(a.a), pb = this.S(a.b);
    const g = D.dimension(pa, pb, a.offset ?? 26);
    if (!g) return;
    const cls = this.cls('dim', a.ref, a.key);
    this.P.el('annotations', `dim-${a.key}`, 'path', { d: g.ext + g.dimLine, class: cls, 'data-ref': a.ref });
    this.P.el('annotations', `dimh-${a.key}`, 'path', { d: g.heads, class: `${cls} head`, 'data-ref': a.ref });
    const txtAt = V.addScaled(g.textAt, g.normal, (a.offset ?? 26) >= 0 ? 0 : 0);
    const label = a.text;
    const w = estimateWidth(label, 12) + 8;
    // Paper-coloured knockout behind the text, rotated with the dimension line.
    this.P.el('annotations', `dimbg-${a.key}`, 'rect', {
      x: txtAt.x - w / 2, y: txtAt.y - 9, width: w, height: 16, rx: 2, class: `dim-bg${a.edit ? ' editable' : ''}`,
      transform: `rotate(${g.angle.toFixed(2)} ${D.pt(txtAt)})`, 'data-hit': a.edit ? `dim:${a.key}` : null, 'data-ref': a.ref,
    });
    this.P.el('annotations', `dimt-${a.key}`, 'text', {
      x: txtAt.x, y: txtAt.y + 4, 'text-anchor': 'middle', 'font-size': 12, class: `lbl dim-lbl${a.edit ? ' editable' : ''}`,
      transform: `rotate(${g.angle.toFixed(2)} ${D.pt(txtAt)})`, 'data-hit': a.edit ? `dim:${a.key}` : null, 'data-ref': a.ref,
    }, mathMarkup(label, 12));
    this.placed.push({ x0: txtAt.x - w / 2, x1: txtAt.x + w / 2, y0: txtAt.y - 9, y1: txtAt.y + 7 });
  }

  ann_angle(a) {
    if (!this.f.angles && !a.always) return;
    const c = this.S(a.c);
    let from = a.from, to = a.to;
    const g = D.angleDim(c, a.r ?? 34, from, to);
    const cls = this.cls('angle', a.ref, a.key);
    this.P.el('annotations', `ang-${a.key}`, 'path', { d: g.d, class: cls, 'data-ref': a.ref });
    this.P.el('annotations', `angh-${a.key}`, 'path', { d: g.head, class: `${cls} head`, 'data-ref': a.ref });
    if (a.text) {
      const dir = V.norm(V.sub(g.labelAt, c));
      this.label('labels', `angl-${a.key}`, V.addScaled(g.labelAt, dir, 2), a.text, { ref: a.ref, anchor: dir.x < -0.4 ? 'end' : dir.x > 0.4 ? 'start' : 'middle', nudge: dir, hit: a.edit ? `dim:${a.key}` : null, cls: `lbl${a.edit ? ' editable' : ''}` });
    }
  }

  ann_refline(a) {
    const pa = this.S(a.a), pb = this.S(a.b);
    this.P.el('annotations', `ref-${a.key}`, 'path', { d: D.line(pa, pb), class: `refline${a.cls ? ' ' + a.cls : ''}`, 'data-ref': a.ref });
    if (a.text) this.label('labels', `refl-${a.key}`, V.addScaled(pb, V.norm(V.sub(pb, pa)), 10), a.text, { anchor: pb.x >= pa.x ? 'start' : 'end', cls: 'lbl muted' });
  }

  ann_frame(a) {
    if (!this.f.frames && !a.always) return;
    const o = this.S(a.o);
    const g = D.frameTriad(o, a.theta ?? 0, a.length ?? 48);
    const cls = this.cls(`frame${a.cls ? ' ' + a.cls : ''}`, a.ref, a.key);
    this.P.el('annotations', `frm-${a.key}`, 'path', { d: g.x.shaft + g.y.shaft, class: cls, 'data-ref': a.ref ?? a.key });
    this.P.el('annotations', `frmh-${a.key}`, 'path', { d: g.x.head + g.y.head, class: `${cls} head`, 'data-ref': a.ref ?? a.key });
    this.P.el('annotations', `frmo-${a.key}`, 'circle', { cx: o.x, cy: o.y, r: 2.5, class: `${cls} head` });
    const [lx, ly] = a.labels ?? ['$x$', '$y$'];
    this.label('labels', `frmx-${a.key}`, V.addScaled(g.x.tip, g.x.dir, 10), lx, { avoid: true, ref: a.ref ?? a.key, nudge: V.perp(g.x.dir) });
    this.label('labels', `frmy-${a.key}`, V.addScaled(g.y.tip, g.y.dir, 12), ly, { avoid: true, ref: a.ref ?? a.key, nudge: V.perp(g.y.dir) });
    if (a.origin) this.label('labels', `frmol-${a.key}`, { x: o.x - 8, y: o.y + 16 }, a.origin, { anchor: 'end', ref: a.ref ?? a.key });
  }

  ann_distance(a) {
    const pa = this.S(a.a), pb = this.S(a.b);
    const u = V.norm(V.sub(pb, pa)), n = V.perp(u);
    const tick = (p) => D.line(V.addScaled(p, n, 7), V.addScaled(p, n, -7));
    const cls = this.cls('distance', a.ref, a.key);
    this.P.el('annotations', `dist-${a.key}`, 'path', { d: D.line(pa, pb) + tick(pa) + tick(pb), class: cls, 'data-ref': a.ref ?? a.key });
    const mid = V.lerp(pa, pb, 0.5);
    const side = n.y > 0 ? -1 : 1;
    this.label('labels', `distl-${a.key}`, V.addScaled(mid, n, side * 14), a.text, { ref: a.ref ?? a.key, cls: 'lbl distance-lbl', nudge: V.scale(n, side) });
  }

  ann_coord(a) {
    const p = this.S(a.p);
    const o = this.S({ x: 0, y: 0 });
    this.P.el('annotations', `crd-${a.key}`, 'path', { d: `M${D.pt(p)}V${o.y.toFixed(1)}M${D.pt(p)}H${o.x.toFixed(1)}`, class: 'construction coord', 'data-ref': a.ref });
    this.P.el('annotations', `crdx-${a.key}`, 'text', { x: p.x, y: o.y + 30, 'text-anchor': 'middle', class: 'lbl coord-lbl', 'font-size': 12 }, mathMarkup(`$x$ = ${fmt(a.p.x)}`, 12));
    this.P.el('annotations', `crdy-${a.key}`, 'text', { x: o.x - 30, y: p.y + 4, 'text-anchor': 'end', class: 'lbl coord-lbl', 'font-size': 12 }, mathMarkup(`$y$ = ${fmt(a.p.y)}`, 12));
  }

  ann_point(a) {
    const p = this.S(a.p);
    const cls = this.cls(`mark${a.cls ? ' ' + a.cls : ''}`, a.ref, a.key);
    const k = 6;
    this.P.el('annotations', `pt-${a.key}`, 'path', { d: `M${p.x - k},${p.y}H${p.x + k}M${p.x},${p.y - k}V${p.y + k}${D.circlePath(p, k * 0.6)}`, class: cls, 'data-ref': a.ref });
    if (a.text) this.label('labels', `ptl-${a.key}`, { x: p.x + 9, y: p.y - 8 }, a.text, { anchor: 'start', ref: a.ref, nudge: { x: 0, y: -1 } });
  }

  ann_path(a) {
    if (!a.points || a.points.length < 2) return;
    this.P.el('trails', `path-${a.key}`, 'path', { d: D.polyline(a.points.map((p) => this.S(p))), class: `ann-path${a.cls ? ' ' + a.cls : ''}`, 'data-ref': a.ref });
  }

  ann_vector(a) {
    this.arrow('vectors', `av-${a.key}`, a.origin, a.vec, `${a.cls ?? 'vec-applied'}${this.linkedCls(a.ref, a.key)}`, a.text, { ref: a.ref ?? a.key, dashed: a.dashed });
  }

  ann_note(a) {
    const at = this.S(a.at);
    if (a.anchor) {
      const an = this.S(a.anchor);
      this.P.el('annotations', `nt-${a.key}`, 'path', { d: D.line(an, at), class: 'leader' });
      this.P.el('annotations', `ntd-${a.key}`, 'circle', { cx: an.x, cy: an.y, r: 2, class: 'leader-dot' });
    }
    this.label('labels', `ntl-${a.key}`, { x: at.x + (a.align === 'end' ? -4 : 4), y: at.y + 4 }, a.text, { anchor: a.align ?? 'start', ref: a.ref, cls: `lbl note${a.cls ? ' ' + a.cls : ''}` });
  }

  ann_datum(a) {
    const p0 = this.S({ x: a.x, y: a.y0 }), p1 = this.S({ x: a.x, y: a.y1 });
    this.P.el('annotations', `dat-${a.key}`, 'path', { d: D.line(p0, p1), class: 'refline' });
    if (a.to !== undefined) {
      const y = p1.y + 4;
      const from = { x: p0.x, y }, to = { x: this.S({ x: a.to, y: 0 }).x, y };
      if (Math.abs(to.x - from.x) > 4) {
        this.P.el('annotations', `datv-${a.key}`, 'path', { d: D.arrowShaft(from, to, 8), class: this.cls('coord-arrow', a.ref) });
        this.P.el('annotations', `datvh-${a.key}`, 'path', { d: D.arrowHead(to, { x: Math.sign(to.x - from.x), y: 0 }, 8, 2.8), class: `${this.cls('coord-arrow', a.ref)} head` });
      }
      this.label('labels', `datl-${a.key}`, { x: Math.max(from.x, to.x) + 6, y: y + 4 }, a.text, { anchor: 'start', ref: a.ref });
    } else if (a.text) {
      this.label('labels', `datl-${a.key}`, { x: p1.x, y: p1.y - 6 }, a.text, { ref: a.ref });
    }
  }

  ann_curved(a) {
    const c = this.S(a.c);
    const g = D.curvedArrow(c, a.r ?? 24, a.start, a.sweep);
    const cls = this.cls(a.cls ?? 'motor', a.ref);
    this.P.el('annotations', `crv-${a.key}`, 'path', { d: g.d, class: cls, 'data-ref': a.ref });
    this.P.el('annotations', `crvh-${a.key}`, 'path', { d: g.head, class: `${cls} head`, 'data-ref': a.ref });
    if (a.text) {
      const dir = V.norm(V.sub(g.mid, c));
      this.label('labels', `crvl-${a.key}`, V.addScaled(g.mid, dir, 12), a.text, { ref: a.ref, anchor: dir.x < -0.3 ? 'end' : dir.x > 0.3 ? 'start' : 'middle' });
    }
  }

  // ------------------------------------------------------------ handles

  handles() {
    for (const h of this.view.handles ?? []) {
      const p = this.S(h.p);
      const r = 7;
      const d = h.shape === 'circle' ? D.circlePath(p, r) : `M${p.x},${p.y - r}L${p.x + r},${p.y}L${p.x},${p.y + r}L${p.x - r},${p.y}Z`;
      this.P.el('handles', `h-${h.key}`, 'path', { d, class: this.cls('level-handle', h.key, h.ref), 'data-hit': `handle:${h.key}`, 'data-ref': h.ref ?? h.key });
      if (h.title && (this.view.hover === h.key || this.view.hover === `handle:${h.key}`)) {
        this.label('labels', `hl-${h.key}`, { x: p.x + 12, y: p.y - 10 }, h.title, { anchor: 'start', cls: 'lbl hint' });
      }
    }
  }

  bubbles() {
    for (const [id, text] of this.view.bubbles ?? []) {
      const b = this.world.get(id);
      if (!b || !text) continue;
      const c = this.S(b.pos);
      const r = b.shape === 'ball' ? b.radius * this.cam.scale : b.shape === 'box' ? b.h * this.cam.scale / 2 : 6;
      const w = estimateWidth(text, 13) + 18;
      const x = c.x + r * 0.5, y = c.y - r - 40;
      this.P.el('bubbles', `bub-${id}`, 'path', {
        d: `M${x},${y}h${w}a6,6 0 0 1 6,6v14a6,6 0 0 1 -6,6h${-(w - 22)}l-10,10l2,-10h-14a6,6 0 0 1 -6,-6v-14a6,6 0 0 1 6,-6z`,
        class: 'bubble',
      });
      this.P.el('bubbles', `bubt-${id}`, 'text', { x: x + 6, y: y + 18, class: 'bubble-text', 'font-size': 13 }, escapeXml(text));
    }
  }

  // ------------------------------------------------------- screen space

  screen() {
    const { cam, view } = this;
    const t = this.world.time;
    this.P.el('screen', 'clock', 'text', { x: 14, y: 22, class: 'clock', 'font-size': 13 }, mathMarkup(`$t$ = ${t.toFixed(2)} s`, 13));
    if (this.f.titleBlock && view.title) {
      const W = 300, rowH = 18;
      const rows = [
        ['SCRATCH PHYSICS', view.title.fig ?? ''],
        [view.title.name ?? '', ''],
        // 96 dpi screen: 1 m of world spans cam.scale px = cam.scale / 3.78 mm.
        [`SCALE 1:${Math.max(1, Math.round(3780 / cam.scale))}`, 'UNITS: SI (m, kg, s, N)'],
      ];
      const H = rows.length * rowH;
      const x0 = cam.W - W - 12, y0 = cam.H - H - 12;
      this.P.el('screen', 'tb', 'rect', { x: x0, y: y0, width: W, height: H, class: 'title-block' });
      let d = '';
      for (let i = 1; i < rows.length; i++) d += `M${x0},${y0 + i * rowH}h${W}`;
      d += `M${x0 + W * 0.58},${y0}v${rowH}M${x0 + W * 0.42},${y0 + 2 * rowH}v${rowH}`;
      this.P.el('screen', 'tbl', 'path', { d, class: 'title-block-lines' });
      this.P.el('screen', 'tb0', 'text', { x: x0 + 6, y: y0 + 13, class: 'tb-text strong', 'font-size': 10.5 }, escapeXml(rows[0][0]));
      this.P.el('screen', 'tb1', 'text', { x: x0 + W * 0.58 + 6, y: y0 + 13, class: 'tb-text', 'font-size': 10.5 }, escapeXml(rows[0][1]));
      this.P.el('screen', 'tb2', 'text', { x: x0 + 6, y: y0 + rowH + 13, class: 'tb-text title', 'font-size': 11 }, escapeXml(rows[1][0]));
      this.P.el('screen', 'tb3', 'text', { x: x0 + 6, y: y0 + 2 * rowH + 13, class: 'tb-text', 'font-size': 10 }, escapeXml(rows[2][0]));
      this.P.el('screen', 'tb4', 'text', { x: x0 + W * 0.42 + 6, y: y0 + 2 * rowH + 13, class: 'tb-text', 'font-size': 10 }, escapeXml(rows[2][1]));
      this.P.el('screen', 'sheet', 'rect', { x: 6, y: 6, width: cam.W - 12, height: cam.H - 12, class: 'sheet-border' });
    }
  }
}
