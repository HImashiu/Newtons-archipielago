// Scene drawings (and small models) shared by the lessons of this block.
// Extracted from the first, shorter version of the lessons.

import { ramp, clamp, lerp, easeInOut, snap } from '../core/anim.js';
import {
  UI_ES, MMHG, n, sci, rect, shape, vessel, cells, axes, curve, readout, formula, section,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';


// ------------------------------------------------------- Poiseuille tube

/** Straight tube of radius r (world) with a parabolic profile and moving cells. */
export function poisTube(ink, r, t, o = {}) {
  const x0 = o.x0 ?? -3.8, x1 = o.x1 ?? 3.2;
  vessel(ink, 'pt', x0, x1, () => r, { streamlines: false, wall: 0.09 });
  const vmax = (o.vmax ?? 1) * (r / 0.8) ** 2; // mean speed ∝ r² at fixed ΔP (Q ∝ r⁴, A ∝ r²)
  cells(ink, 'pt-c', x0, x1, () => r, () => Math.max(0.03, vmax), t, { per: 5, speed: 0.7, lanes: [-0.6, -0.2, 0.2, 0.6], profile: (s) => 2 * (1 - s * s) + 0.04 });
  if (o.profile !== false) {
    const xs = x1 - 0.9;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const s = -1 + (2 * i) / 24;
      pts.push({ x: xs + 0.7 * vmax * (1 - s * s), y: s * r });
    }
    ink.line('pt-ax', { x: xs, y: -r }, { x: xs, y: r }, 'thin', { layer: 'annotations' });
    ink.poly('pt-prof', pts, 'blue', { layer: 'vectors' });
  }
  if (o.labels !== false) {
    ink.arrow('pt-P1', { x: x0 - 0.75, y: 0 }, { x: x0 - 0.1, y: 0 }, 'accent heavy', { head: 11, headW: 3.8 });
    ink.text('pt-P1l', { x: x0 - 0.75, y: 0 }, '$P_1$', { dy: -12, size: 17, cls: 'accent-tx' });
    ink.text('pt-P2l', { x: x1 + 0.4, y: 0 }, '$P_2$', { dy: 6, size: 17 });
    ink.dimension('pt-L', { x: x0, y: -r - 0.09 }, { x: x1, y: -r - 0.09 }, 26, '$L$', { size: 16 });
    ink.dimension('pt-r', { x: x0 + 0.6, y: 0 }, { x: x0 + 0.6, y: r }, -16, '$r$', { size: 16 });
  }
}

export function qrGraph(ink, rr, o = {}) {
  const P = axes(ink, 'qr', { x: 5.2, y: 0, w: 3.6, h: 2.6 }, { xmax: 1, ymax: 1, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.25, 0.5, 0.75, 1], xlabel: '$r/r_0$', ylabel: '$Q/Q_0$', grid: true });
  curve(ink, 'qr-c', P, (x) => x ** 4, 0, 1, 'wave', { op: o.curveOp ?? 1 });
  curve(ink, 'qr-l', P, (x) => x, 0, 1, 'ghost', { op: o.linOp ?? 0 });
  if (o.linOp) ink.text('qr-ll', P(0.62, 0.62), 'si fuera proporcional', { dx: -6, dy: -6, size: 12, anchor: 'end', cls: 'mid', op: o.linOp });
  if (rr !== null && rr !== undefined) {
    ink.line('qr-v', P(rr, 0), P(rr, rr ** 4), 'drop', { layer: 'annotations' });
    ink.line('qr-h', P(0, rr ** 4), P(rr, rr ** 4), 'drop', { layer: 'annotations' });
    ink.circle('qr-p', P(rr, rr ** 4), 5, 'dot-accent', { layer: 'vectors' });
  }
}

// ---------------------------------------------- organs in parallel (shock)

export const ORGANS = [
  { name: 'Cerebro', R: 6.5, vital: true },
  { name: 'Corazón', R: 22, vital: true },
  { name: 'Riñones', R: 4.6, vital: false },
  { name: 'Intestino', R: 3.8, vital: false },
  { name: 'Piel', R: 10, vital: false },
  { name: 'Músculo', R: 5.5, vital: false },
];

/** Arterial pressure and organ flows for a cardiac output (mL/s) and constriction factor. */
export function circulation(CO, k) {
  const R = ORGANS.map((o) => o.R * (o.vital ? 1 : k));
  const G = R.reduce((a, r) => a + 1 / r, 0);
  const Rt = 1 / G;
  const P = CO * Rt;
  return { P, Rt, Q: R.map((r) => P / r) };
}

export function organScene(ink, CO, k, o = {}) {
  const c = circulation(CO, k);
  const base = circulation(83, 1);
  const P = axes(ink, 'or', { x: 0.6, y: 0, w: 8.4, h: 2.8 }, { xmax: 6, ymax: 30, yticks: [0, 10, 20, 30], ylabel: '$Q$ (mL/s)' });
  ORGANS.forEach((org, i) => {
    const q = c.Q[i];
    const x0 = P(i + 0.2, 0).x, x1 = P(i + 0.8, 0).x;
    rect(ink, `or-b${i}`, x0, 0, x1, P(0, Math.min(q, 29.5)).y, org.vital ? 'blood-2' : 'part');
    ink.line(`or-ref${i}`, { x: x0 - 0.05, y: P(0, base.Q[i]).y }, { x: x1 + 0.05, y: P(0, base.Q[i]).y }, 'dashed', { layer: 'annotations' });
    ink.text(`or-n${i}`, P(i + 0.5, 0), org.name, { dy: 20, size: 14, cls: org.vital ? 'accent-tx' : 'mid' });
    ink.text(`or-q${i}`, P(i + 0.5, Math.min(q, 29.5)), n(q, 1), { dy: -8, size: 13, cls: 'halo' });
  });
  ink.text('or-ref', P(6, base.Q[5]), '- - normal', { dx: 4, dy: 4, size: 12, anchor: 'start', cls: 'mid' });
  return c;
}

// --------------------------------------------- series / parallel network

export function networkScene(ink, mode, N, o = {}) {
  // Inlet on the left, outlet on the right; resistors drawn as narrow vessels.
  const y = 1;
  ink.line('nw-in', { x: 0, y }, { x: 1.2, y }, 'ink heavy', { layer: 'statics' });
  ink.line('nw-out', { x: 7.8, y }, { x: 9, y }, 'ink heavy', { layer: 'statics' });
  ink.text('nw-P1', { x: 0, y }, '$P_1$', { dy: -10, size: 16, anchor: 'start' });
  ink.text('nw-P2', { x: 9, y }, '$P_2$', { dy: -10, size: 16, anchor: 'end' });
  const res = (key, xa, xb, yy, label) => {
    ink.line(`${key}-a`, { x: xa, y: yy }, { x: xa + 0.35, y: yy }, 'ink heavy', { layer: 'statics' });
    ink.line(`${key}-b`, { x: xb - 0.35, y: yy }, { x: xb, y: yy }, 'ink heavy', { layer: 'statics' });
    rect(ink, `${key}-r`, xa + 0.35, yy - 0.13, xb - 0.35, yy + 0.13, 'part', { layer: 'statics' });
    if (label) ink.text(`${key}-l`, { x: (xa + xb) / 2, y: yy + 0.13 }, label, { dy: -8, size: 15 });
  };
  if (mode === 'serie') {
    const w = 6.6 / N;
    for (let i = 0; i < N; i++) res(`nw-s${i}`, 1.2 + i * w, 1.2 + (i + 1) * w, y, `$R_${i + 1}$`);
  } else {
    const ys = Array.from({ length: N }, (_, i) => y + (N === 1 ? 0 : 1.6 * (i / (N - 1) - 0.5)));
    ink.line('nw-bl', { x: 1.2, y: ys[0] }, { x: 1.2, y: ys[ys.length - 1] }, 'ink heavy', { layer: 'statics' });
    ink.line('nw-br', { x: 7.8, y: ys[0] }, { x: 7.8, y: ys[ys.length - 1] }, 'ink heavy', { layer: 'statics' });
    ys.forEach((yy, i) => res(`nw-p${i}`, 1.2, 7.8, yy, N <= 4 ? `$R_${i + 1}$` : null));
  }
}

// ------------------------------------------------------- airways, Boyle

export function bronchiole(ink, key, c, r, o = {}) {
  section(ink, key, c, r, o.wall ?? 0.22, {});
  if (o.mucus) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = -0.9 + (1.6 * i) / 24;
      pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
    }
    for (let i = 24; i >= 0; i--) {
      const a = -0.9 + (1.6 * i) / 24;
      pts.push({ x: c.x + (r * 0.72 + 0.05 * Math.sin(i)) * Math.cos(a), y: c.y + (r * 0.72 + 0.05 * Math.sin(i)) * Math.sin(a) });
    }
    shape(ink, `${key}-m`, pts, 'plaque', { layer: 'vectors' });
  }
  ink.text(`${key}-l`, { x: c.x, y: c.y - r - (o.wall ?? 0.22) }, o.label ?? '', { dy: 24, size: 15 });
}

export function boyleScene(ink, V, o = {}) {
  // A piston–cylinder model of the thorax: diaphragm = piston.
  const x0 = -1.2, x1 = 1.2;
  const top = 2.6;
  const bottom = top - V * 0.9;
  rect(ink, 'by-gas', x0, bottom, x1, top, 'fluid', { layer: 'trails' });
  ink.poly('by-wall', [{ x: x0, y: 0 }, { x: x0, y: top }, { x: -0.18, y: top }], 'ink heavy', { layer: 'statics' });
  ink.poly('by-wall2', [{ x: 0.18, y: top }, { x: x1, y: top }, { x: x1, y: 0 }], 'ink heavy', { layer: 'statics' });
  ink.line('by-tr1', { x: -0.18, y: top }, { x: -0.18, y: top + 0.6 }, 'ink heavy', { layer: 'statics' });
  ink.line('by-tr2', { x: 0.18, y: top }, { x: 0.18, y: top + 0.6 }, 'ink heavy', { layer: 'statics' });
  ink.text('by-tr', { x: 0.18, y: top + 0.5 }, 'tráquea', { dx: 8, dy: 4, size: 13, anchor: 'start', cls: 'mid' });
  rect(ink, 'by-pist', x0 + 0.03, bottom - 0.2, x1 - 0.03, bottom, 'piston');
  ink.text('by-d', { x: 0, y: bottom - 0.2 }, 'diafragma', { dy: 20, size: 14, cls: 'mid' });
  ink.text('by-t', { x: x1, y: top - 0.3 }, 'tórax (modelo)', { dx: 12, size: 14, anchor: 'start', cls: 'mid' });
  ink.text('by-v', { x: x1, y: top - 0.65 }, `$V$ = ${n(V, 2)} L`, { dx: 12, size: 15, anchor: 'start' });
  if (o.air) {
    const dir = o.air;
    ink.arrow('by-air', dir > 0 ? { x: 0, y: top + 0.95 } : { x: 0, y: top + 0.15 }, dir > 0 ? { x: 0, y: top + 0.15 } : { x: 0, y: top + 0.95 }, 'blue heavy', { head: 11, headW: 3.8 });
    ink.text('by-airl', { x: 0, y: top + 0.95 }, dir > 0 ? 'entra aire' : 'sale aire', { dx: -10, dy: 4, size: 14, anchor: 'end', cls: 'blue-tx' });
  }
}

