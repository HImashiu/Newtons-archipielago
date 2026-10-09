// Shared drawing kit, Spanish interface and practice sets for the biophysics
// unit (Biofísica · Unidad 2: cardiovascular y respiratoria). Same drawing
// language as the mechanics lessons — black ink on white paper, grey parts,
// one accent — plus fluids (blue wash), blood (accent wash), gauges, human
// figures, vessels with moving streamlines and plotted graphs.

import * as V from '../../core/vec.js';
import { clamp } from '../core/anim.js';
import { createWorkPanel } from '../core/workpanel.js';

export const UI_ES = {
  chapter: 'Capítulo', yourTurn: 'Tu turno', nextStep: 'Siguiente paso', cont: 'Continuar', check: 'Comprobar',
  skip: 'Saltar este paso', play: 'Reproducir', pause: 'Pausa', speed: 'Velocidad',
};

export const G = 9.8;
export const MMHG = 133.3; // Pa per mmHg
export const P_ATM = 101325;

// ---------------------------------------------------------------- numbers

/**
 * Spanish number format: decimal comma, proper minus, thin-space thousands
 * for numbers of five or more digits. d = decimals (default: as needed, ≤ 2).
 */
export function n(v, d) {
  if (!Number.isFinite(v)) return '—';
  if (d === undefined) {
    const a = Math.abs(v);
    d = Math.abs(v - Math.round(v)) < 1e-9 ? 0 : a >= 100 ? 0 : a >= 10 ? 1 : Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? 1 : 2;
  }
  let s = Math.abs(v).toFixed(d);
  let [int, frac] = s.split('.');
  if (int.length >= 5) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  s = frac ? `${int},${frac}` : int;
  return (v < 0 && Number(Math.abs(v).toFixed(d)) !== 0 ? '−' : '') + s;
}

/** Scientific notation in Spanish typography: 1,4 × 10⁻⁴. */
export function sci(v, d = 2) {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  const sup = String(e).replace('-', '⁻').replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
  return `${n(m, d)} × 10${sup}`;
}

export const close = (v, ans, rel = 0.02, abs = 1e-9) => Math.abs(v - ans) <= Math.max(abs, rel * Math.abs(ans));

// ---------------------------------------------------------------- drawing

const f = (x) => (Number.isFinite(x) ? +x.toFixed(2) : 0);
const P2 = (p) => `${f(p.x)},${f(p.y)}`;

/** World-space rectangle. */
export function rect(ink, key, x0, y0, x1, y1, cls, o = {}) {
  if ((o.op ?? 1) <= 0.002) return;
  const a = ink.S({ x: Math.min(x0, x1), y: Math.max(y0, y1) }), b = ink.S({ x: Math.max(x0, x1), y: Math.min(y0, y1) });
  ink.P.el(o.layer ?? 'bodies', key, 'rect', {
    x: f(a.x), y: f(a.y), width: f(Math.max(0, b.x - a.x)), height: f(Math.max(0, b.y - a.y)), rx: o.rx ?? null,
    class: cls, opacity: o.op !== undefined && o.op < 0.999 ? f(o.op) : null,
  });
}

/** Closed polygon from world points. */
export function shape(ink, key, pts, cls, o = {}) {
  if ((o.op ?? 1) <= 0.002 || pts.length < 3) return;
  ink.path(key, `M${pts.map((p) => P2(ink.S(p))).join('L')}Z`, cls, { op: o.op, layer: o.layer ?? 'bodies' });
}

/** Free-surface symbol (▽ with two short lines), as on hydraulics drawings. */
export function surfaceMark(ink, key, x, y, o = {}) {
  const s = ink.S({ x, y });
  const w = 7;
  const d = `M${f(s.x - w)},${f(s.y - 11)}L${f(s.x + w)},${f(s.y - 11)}L${f(s.x)},${f(s.y - 1)}Z`;
  ink.path(`${key}-t`, d, 'support', { op: o.op, layer: 'annotations' });
  ink.path(`${key}-l`, `M${f(s.x - 9)},${f(s.y + 4)}L${f(s.x + 9)},${f(s.y + 4)}M${f(s.x - 5)},${f(s.y + 8)}L${f(s.x + 5)},${f(s.y + 8)}`, 'thin', { op: o.op, layer: 'annotations' });
}

/**
 * Open tank [x0, x1] × [y0, top] holding stacked liquid layers (bottom first):
 * layers = [{ h, cls: 'fluid' | 'fluid-2', label }]. Walls are heavy ink.
 */
export function tank(ink, key, x0, x1, y0, top, layers, o = {}) {
  const op = o.op;
  let y = y0;
  layers.forEach((L, i) => {
    rect(ink, `${key}-f${i}`, x0, y, x1, y + L.h, L.cls ?? 'fluid', { op, layer: 'trails' });
    if (i > 0) ink.line(`${key}-if${i}`, { x: x0, y }, { x: x1, y }, 'thin', { op, layer: 'statics' });
    if (L.label) ink.text(`${key}-fl${i}`, { x: (x0 + x1) / 2, y: y + L.h / 2 }, L.label, { op, dy: 6, size: o.labelSize ?? 16, cls: 'mid' });
    y += L.h;
  });
  if (layers.length) surfaceMark(ink, `${key}-sm`, x1 - (x1 - x0) * 0.18, y, { op });
  const t = 0.06;
  ink.poly(`${key}-w`, [{ x: x0, y: top }, { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: top }], 'ink heavy', { op, layer: 'statics' });
  if (o.hatch !== false) {
    // Hatched floor under the tank.
    ink.ground(`${key}-g`, { x: x0 - t * 2, y: y0 - 0.001 }, { x: x1 + t * 2, y: y0 - 0.001 }, { op });
  }
  return y;
}

/** Dial gauge centred at p (world), reading v in [0, max]. */
export function gauge(ink, key, p, v, max, o = {}) {
  const op = o.op;
  const s = ink.S(p);
  const r = o.r ?? 24;
  ink.P.el('labels', `${key}-c`, 'circle', { cx: f(s.x), cy: f(s.y), r, class: 'gauge', opacity: op !== undefined && op < 0.999 ? f(op) : null });
  const a0 = (-225 * Math.PI) / 180, a1 = (45 * Math.PI) / 180;
  let d = '';
  for (let i = 0; i <= 10; i++) {
    const a = a0 + ((a1 - a0) * i) / 10;
    const r0 = i % 5 === 0 ? r - 7 : r - 4;
    d += `M${f(s.x + r0 * Math.cos(a))},${f(s.y + r0 * Math.sin(a))}L${f(s.x + (r - 1.5) * Math.cos(a))},${f(s.y + (r - 1.5) * Math.sin(a))}`;
  }
  ink.path(`${key}-ticks`, d, 'thin', { op, layer: 'labels' });
  const a = a0 + (a1 - a0) * clamp(v / max);
  ink.path(`${key}-n`, `M${f(s.x - 4 * Math.cos(a))},${f(s.y - 4 * Math.sin(a))}L${f(s.x + (r - 6) * Math.cos(a))},${f(s.y + (r - 6) * Math.sin(a))}`, 'accent heavy', { op, layer: 'labels' });
  ink.P.el('labels', `${key}-hub`, 'circle', { cx: f(s.x), cy: f(s.y), r: 2.6, class: 'hub', opacity: op !== undefined && op < 0.999 ? f(op) : null });
  if (o.label) ink.textS(`${key}-l`, s.x + (o.labelDx ?? r + 8), s.y + 6, o.label, { op, size: o.size ?? 16, anchor: o.labelDx < 0 ? 'end' : 'start', cls: 'halo' });
}

// Mannequin outline, front view, right half (x ≥ 0), in units of body height.
const BODY = [
  [0.024, 0.86], [0.05, 0.835], [0.1, 0.82], [0.118, 0.795], [0.122, 0.7], [0.128, 0.6], [0.134, 0.5], [0.13, 0.47],
  [0.112, 0.47], [0.108, 0.55], [0.1, 0.66], [0.088, 0.72], [0.078, 0.64], [0.074, 0.58], [0.088, 0.5], [0.084, 0.36],
  [0.072, 0.2], [0.062, 0.06], [0.078, 0.018], [0.074, 0], [0.02, 0], [0.024, 0.06], [0.028, 0.2], [0.02, 0.36], [0.006, 0.47], [0, 0.48],
];
export const HEART_Y = 0.72; // fraction of height
export const HEART_X = -0.03;

/**
 * Human figure as a grey mannequin. `at` = point between the feet, H = height,
 * angle = rotation (rad, CCW) about `at`: 0 standing, −π/2 lying supine (head
 * to the right is +π/2... we use −π/2 so the head points left→right is not needed).
 */
export function figure(ink, key, at, H, angle = 0, o = {}) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const sx = o.sx ?? 1; // squash the width (a lying figure reads as a side view)
  const W = (x0, y) => { const x = x0 * sx; return { x: at.x + (x * c - y * s) * H, y: at.y + (x * s + y * c) * H }; };
  const right = BODY.map(([x, y]) => W(x, y));
  const left = BODY.slice().reverse().map(([x, y]) => W(-x, y));
  shape(ink, `${key}-b`, [...right, ...left], o.cls ?? 'part', { op: o.op });
  const hc = W(0, 0.93);
  ink.circle(`${key}-h`, hc, 0.068 * H * ink.k, o.cls ?? 'part', { op: o.op, layer: 'bodies' });
  if (o.heart !== false) heart(ink, `${key}-heart`, W(HEART_X, HEART_Y), { op: o.op, size: o.heartSize });
  return { W, heart: W(HEART_X, HEART_Y), head: hc, feet: W(0, 0.02) };
}

/** Small heart glyph (accent), centred at p. */
export function heart(ink, key, p, o = {}) {
  const s = ink.S(p);
  const k = (o.size ?? 9) / 10;
  const d = `M${f(s.x)},${f(s.y + 8 * k)}C${f(s.x - 12 * k)},${f(s.y - 1 * k)} ${f(s.x - 6 * k)},${f(s.y - 10 * k)} ${f(s.x)},${f(s.y - 4 * k)}C${f(s.x + 6 * k)},${f(s.y - 10 * k)} ${f(s.x + 12 * k)},${f(s.y - 1 * k)} ${f(s.x)},${f(s.y + 8 * k)}Z`;
  ink.path(key, d, 'heart', { op: o.op, layer: 'labels' });
}

/** Bed / table under a lying figure. */
export function bed(ink, key, x0, x1, y, o = {}) {
  rect(ink, `${key}-m`, x0, y - 0.09, x1, y, 'part', { op: o.op, layer: 'statics' });
  for (const [i, x] of [[0, x0 + 0.08], [1, x1 - 0.08]]) ink.line(`${key}-l${i}`, { x, y: y - 0.09 }, { x, y: y - 0.55 }, 'ink', { op: o.op, layer: 'statics' });
}

// --------------------------------------------------------------- vessels

/**
 * A vessel along x with inner radius r(x), centred on y = yc, wall thickness w.
 * Draws wall (grey), lumen (wash) and optional streamlines.
 */
export function vessel(ink, key, x0, x1, r, o = {}) {
  const yc = o.yc ?? 0;
  const w = o.wall ?? 0.08;
  const N = o.N ?? 60;
  const xs = Array.from({ length: N + 1 }, (_, i) => x0 + ((x1 - x0) * i) / N);
  const top = xs.map((x) => ({ x, y: yc + r(x) }));
  const bot = xs.map((x) => ({ x, y: yc - r(x) }));
  const topO = xs.map((x) => ({ x, y: yc + r(x) + w }));
  const botO = xs.map((x) => ({ x, y: yc - r(x) - w }));
  shape(ink, `${key}-lum`, [...top, ...bot.slice().reverse()], o.lumen ?? 'blood', { op: o.op, layer: 'trails' });
  shape(ink, `${key}-wt`, [...top, ...topO.slice().reverse()], o.wallCls ?? 'part', { op: o.op });
  shape(ink, `${key}-wb`, [...bot, ...botO.slice().reverse()], o.wallCls ?? 'part', { op: o.op });
  if (o.centerline !== false) ink.line(`${key}-cl`, { x: x0 - 0.15, y: yc }, { x: x1 + 0.15, y: yc }, 'dashdot', { op: o.op, layer: 'grid' });
  if (o.streamlines) {
    const fr = o.streamlines === true ? [-0.66, -0.33, 0, 0.33, 0.66] : o.streamlines;
    fr.forEach((s, i) => ink.poly(`${key}-sl${i}`, xs.map((x) => ({ x, y: yc + s * r(x) })), 'stream', { op: o.op, layer: 'grid' }));
  }
}

/**
 * Travel-time table for a particle moving along a vessel with mean speed
 * v(x) (m/s or any unit). Returns pos(τ) giving x after time τ from x0,
 * wrapping around, for animating markers as pure functions of time.
 */
export function transit(x0, x1, v, N = 400) {
  const xs = [x0];
  const ts = [0];
  for (let i = 1; i <= N; i++) {
    const x = x0 + ((x1 - x0) * i) / N;
    const xm = x - (x1 - x0) / (2 * N);
    ts.push(ts[i - 1] + (x1 - x0) / N / Math.max(1e-6, v(xm)));
    xs.push(x);
  }
  const T = ts[N];
  return {
    T,
    pos(tau) {
      const u = ((tau % T) + T) % T;
      let lo = 0, hi = N;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (ts[m] <= u) lo = m; else hi = m;
      }
      const a = (u - ts[lo]) / Math.max(1e-12, ts[hi] - ts[lo]);
      return xs[lo] + (xs[hi] - xs[lo]) * a;
    },
  };
}

/**
 * Moving blood cells along streamlines. Each lane s ∈ (−1, 1) moves at
 * v(x)·profile(s); profile(s) = 1 for plug flow or 2(1 − s²) for Poiseuille.
 */
export function cells(ink, key, x0, x1, r, v, t, o = {}) {
  const yc = o.yc ?? 0;
  const lanes = o.lanes ?? [-0.6, -0.2, 0.2, 0.6];
  const per = o.per ?? 5;
  const prof = o.profile ?? (() => 1);
  lanes.forEach((s, li) => {
    const tr = transit(x0, x1, (x) => v(x) * prof(s));
    for (let k = 0; k < per; k++) {
      const x = tr.pos(t * (o.speed ?? 1) + (tr.T * (k + 0.37 * li)) / per);
      const p = { x, y: yc + s * r(x) };
      ink.circle(`${key}-${li}-${k}`, p, o.size ?? 3.4, o.cls ?? 'cell', { op: o.op, layer: 'vectors' });
    }
  });
}

/**
 * Circular cross-section of a vessel (annulus) at c, inner radius r, wall w
 * (world units). Pressure arrows push outward; tension arrows run along the wall.
 */
export function section(ink, key, c, r, w, o = {}) {
  const N = 48;
  const ring = (R) => Array.from({ length: N }, (_, i) => ({ x: c.x + R * Math.cos((2 * Math.PI * i) / N), y: c.y + R * Math.sin((2 * Math.PI * i) / N) }));
  const outer = ring(r + w), inner = ring(r);
  ink.path(`${key}-wall`, `M${outer.map((p) => P2(ink.S(p))).join('L')}ZM${inner.slice().reverse().map((p) => P2(ink.S(p))).join('L')}Z`, 'part', { op: o.op, layer: 'bodies' });
  shape(ink, `${key}-lum`, inner, 'blood', { op: o.op, layer: 'trails' });
  if (o.pressure) {
    const k = o.pressure;
    for (let i = 0; i < 8; i++) {
      const a = (2 * Math.PI * (i + 0.5)) / 8;
      const u = { x: Math.cos(a), y: Math.sin(a) };
      ink.arrow(`${key}-p${i}`, V.addScaled(c, u, r * 0.35), V.addScaled(c, u, r * (0.35 + 0.55 * k)), 'blue', { op: o.op, head: 8, headW: 2.8 });
    }
  }
  if (o.tension) {
    // Two tangential arrows at the top of the wall, pulling apart.
    const T = o.tension;
    const yW = c.y + r + w / 2;
    const L = Math.min(r * 1.4, 0.15 + 0.35 * T);
    ink.arrow(`${key}-t1`, { x: c.x + 0.05, y: yW + w * 1.6 }, { x: c.x + 0.05 + L, y: yW + w * 1.6 }, 'accent heavy', { op: o.op, head: 10, headW: 3.4 });
    ink.arrow(`${key}-t2`, { x: c.x - 0.05, y: yW + w * 1.6 }, { x: c.x - 0.05 - L, y: yW + w * 1.6 }, 'accent heavy', { op: o.op, head: 10, headW: 3.4 });
  }
}

// ------------------------------------------------------------------ plots

/**
 * Axes in a world box. Returns P(x, y) mapping data to world points.
 * o: { xmax, ymax, xmin=0, ymin=0, xlabel, ylabel, xticks, yticks, xfmt, yfmt }
 */
export function axes(ink, key, box, o) {
  const { x, y, w, h } = box;
  const xmin = o.xmin ?? 0, ymin = o.ymin ?? 0;
  const P = (dx, dy) => ({ x: x + ((dx - xmin) / (o.xmax - xmin)) * w, y: y + ((dy - ymin) / (o.ymax - ymin)) * h });
  const op = o.op;
  ink.arrow(`${key}-xa`, { x, y }, { x: x + w + 0.25, y }, 'ink', { op, head: 9, headW: 3 });
  ink.arrow(`${key}-ya`, { x, y }, { x, y: y + h + 0.25 }, 'ink', { op, head: 9, headW: 3 });
  for (const [i, v] of (o.xticks ?? []).entries()) {
    const p = P(v, ymin);
    ink.line(`${key}-xt${i}`, p, { x: p.x, y: p.y - 0.06 }, 'thin', { op, layer: 'annotations' });
    ink.text(`${key}-xl${i}`, p, (o.xfmt ?? n)(v), { op, dy: 19, size: 13, cls: 'mid' });
    if (o.grid) ink.line(`${key}-xg${i}`, p, { x: p.x, y: y + h }, 'grid', { op, layer: 'grid' });
  }
  for (const [i, v] of (o.yticks ?? []).entries()) {
    const p = P(xmin, v);
    ink.line(`${key}-yt${i}`, p, { x: p.x - 0.06, y: p.y }, 'thin', { op, layer: 'annotations' });
    ink.text(`${key}-yl${i}`, p, (o.yfmt ?? n)(v), { op, dx: -8, dy: 5, size: 13, anchor: 'end', cls: 'mid' });
    if (o.grid) ink.line(`${key}-yg${i}`, p, { x: x + w, y: p.y }, 'grid', { op, layer: 'grid' });
  }
  if (o.xlabel) ink.text(`${key}-xn`, { x: x + w + 0.25, y }, o.xlabel, { op, dx: 8, dy: 5, size: 15, anchor: 'start' });
  if (o.ylabel) ink.text(`${key}-yn`, { x, y: y + h + 0.25 }, o.ylabel, { op, dx: 10, dy: 4, size: 15, anchor: 'start' });
  return P;
}

/** Sample a function into world points through an axes mapper. */
export function curve(ink, key, P, fn, a, b, cls = 'ink heavy', o = {}) {
  const N = o.N ?? 120;
  const end = a + (b - a) * (o.draw ?? 1);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = a + ((end - a) * i) / N;
    const y = fn(x);
    if (Number.isFinite(y)) pts.push(P(x, y));
  }
  ink.poly(key, pts, cls, { op: o.op, layer: o.layer ?? 'vectors' });
}

/** Screen-anchored readout block in the stage's top-right corner. */
export function readout(ink, lines, o = {}) {
  const x = o.left ? 28 : ink.W - 28;
  lines.forEach((t, i) => ink.textS(`ro${i}`, x, (o.top ?? 38) + i * (o.gap ?? 27), t, { anchor: o.left ? 'start' : 'end', size: o.size ?? 18, op: o.op, layer: 'screen', cls: `halo ${o.cls ?? ''}` }));
}

/** Big centred formula on the stage (screen space). */
export function formula(ink, key, str, o = {}) {
  ink.textS(key, ink.W * (o.fx ?? 0.5), ink.H * (o.fy ?? 0.16), str, { size: o.size ?? 30, op: o.op, layer: 'screen', cls: `halo ${o.cls ?? ''}` });
}

// ---------------------------------------------------------------- cards

export function titleCard({ eyebrow, title, sub, meta }) {
  return `<div class="title-card">
    <div class="eyebrow">${eyebrow}</div>
    <h1>${title}</h1>
    <p class="sub">${sub}</p>
    <button class="begin" data-action="next">Comenzar <span aria-hidden="true">›</span></button>
    <div class="meta">${meta}</div>
  </div>`;
}

export function summaryCard({ eyebrow, title, ideas, next }) {
  return `<div class="summary-card">
    <div class="eyebrow">${eyebrow}</div>
    <h2>${title}</h2>
    <ol class="ideas">${ideas.map((t, i) => `<li><span class="n">${i + 1}</span><div>${t}</div></li>`).join('')}</ol>
    <div class="next-row">
      <button class="ghost-btn" data-action="restart">Repetir la lección</button>
      <div class="next-lesson">${next}</div>
    </div>
  </div>`;
}

// ------------------------------------------------------------- practice

export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

/**
 * Practice set with mastery (four correct in a row). make(rnd, kind) returns
 *   { ask, given: [[k, v]], hint, solution: [{ text, math }], why?,
 *     number: { label, unit, answer, rel? }  |  choices: [{ id, label, correct }] }
 * draw(ink, prob, solved, t) draws the problem's figure.
 */
export function practiceChapter({ num, kinds, make, draw, cam, seed }) {
  const fresh = (S) => {
    const pr = S.practice;
    const kind = pr.count < kinds.length ? kinds[pr.count] : pick(pr.rnd, kinds);
    pr.prob = make(pr.rnd, kind);
    pr.tries = 0;
    pr.status = 'ask';
    pr.picked = null;
    pr.count++;
  };
  return {
    id: 'practice', title: 'Práctica', short: 'Práctica', num,
    beats: [{
      kind: 'do', panel: 'work', cam,
      enter(S) {
        if (!S.practice) S.practice = { rnd: rngFrom(seed), count: 0, streak: 0, solved: 0, prob: null, status: 'ask', tries: 0 };
        if (!S.practice.prob) fresh(S);
      },
      caption: (S) => {
        const pr = S.practice;
        if (!pr?.prob) return '';
        if (pr.status === 'right') return `Correcto. ${pr.prob.why ?? ''}`;
        if (pr.status === 'reveal') return 'Esta es la solución completa. Estúdiala y luego intenta un problema nuevo.';
        if (pr.tries === 1) return `Todavía no. Pista: ${pr.prob.hint}`;
        return 'Los problemas cambian cada vez. Resuelve cuatro seguidos para terminar.';
      },
      prompt: (S) => S.practice?.prob?.ask ?? '',
      success: 'Cuatro seguidos: dominas esta sección. Práctica completada.',
      controls: (S) => {
        const pr = S.practice;
        if (!pr?.prob || pr.streak >= 4) return [];
        if (pr.status !== 'ask') return [{ type: 'button', id: 'next', label: 'Siguiente problema ›', primary: true }];
        const p = pr.prob;
        if (p.choices) return p.choices.map((c) => ({ type: 'choice', id: c.id, label: c.label, state: pr.picked === c.id ? (c.correct ? 'right' : 'wrong') : null }));
        return [{ type: 'number', id: 'ans', label: p.number.label, unit: p.number.unit, state: pr.tries ? 'wrong' : null }];
      },
      act(S, id, v, api) {
        const pr = S.practice;
        const p = pr.prob;
        if (id === 'next') { fresh(S); api.player.clearAnswers(); return; }
        const ok = p.choices ? !!p.choices.find((c) => c.id === id)?.correct : close(v, p.number.answer, p.number.rel ?? 0.02);
        if (p.choices) pr.picked = id;
        if (ok) {
          pr.streak++;
          pr.solved++;
          pr.status = 'right';
        } else {
          pr.tries++;
          pr.streak = 0;
          if (pr.tries >= 2) pr.status = 'reveal';
        }
      },
      work: (S) => {
        const pr = S.practice;
        if (!pr?.prob) return [];
        const p = pr.prob;
        const dots = [0, 1, 2, 3].map((i) => (i < pr.streak ? '●' : '○')).join(' ');
        const lines = [
          { html: `<div class="mastery"><span class="m-label">Dominio</span><span class="m-dots">${dots}</span><span class="m-sub">4 seguidos · ${pr.solved} resueltos</span></div>` },
          { h: `Problema ${pr.count}` },
        ];
        if (p.given?.length) lines.push({ given: p.given });
        if (pr.status !== 'ask') {
          lines.push({ h: 'Solución' });
          p.solution.forEach((s, i) => lines.push({ step: i + 1, ...s, state: 'done' }));
          if (p.number) lines.push({ result: `${p.number.label} ${n(p.number.answer, p.number.d)} ${p.number.unit}`, ok: pr.status === 'right' });
        }
        return lines;
      },
      draw({ ink, S }, t) {
        const pr = S.practice;
        if (pr?.prob) draw(ink, pr.prob, pr.status !== 'ask', t);
      },
      done: (S) => (S.practice?.streak ?? 0) >= 4,
      skip(S) { S.practice.streak = 4; },
    }],
  };
}

// ------------------------------------------------------- guided numbers

/**
 * A do-beat asking for one number, with targeted feedback for anticipated
 * wrong answers: wrong = [[value, message], …].
 */
export function askNumber({ key, label, unit, answer, rel = 0.02, wrong = [] }) {
  return {
    controls: (S) => (S.g[key]?.ok ? [] : [{ type: 'number', id: key, label, unit, state: S.g[key]?.wrong ? 'wrong' : null }]),
    act(S, id, v) {
      const ok = close(v, answer, rel);
      S.g[key] = { ok, wrong: !ok, v, msg: ok ? null : (wrong.find(([w, , r]) => close(v, w, r ?? rel))?.[1] ?? null) };
    },
    done: (S) => !!S.g[key]?.ok,
    skip(S) { S.g[key] = { ok: true }; },
    answer, // exposed for automated checks
  };
}

/** A do-beat asking a multiple-choice question with per-option feedback. */
export function askChoice({ key, choices }) {
  return {
    choices,
    answered: (S) => S.g[key],
    choose(S, id) { S.g[key] = id; },
    done: (S) => !!choices.find((c) => c.id === S.g[key])?.correct,
    skip(S) { S.g[key] = choices.find((c) => c.correct).id; },
    feedback: (S) => choices.find((c) => c.id === S.g[key] && !c.correct)?.why ?? null,
  };
}

export { createWorkPanel };
