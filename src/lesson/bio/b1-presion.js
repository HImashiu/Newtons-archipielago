// Biofísica B.1 — Presión en los fluidos y presión arterial (Semana 7, parte 1).
// Guion: docs/biofisica-unidad-2-guion.md, sección B.1.
//
// Presión P = F/A, densidad, P = P₀ + ρgh, tubo en U, principio de Pascal,
// postura y presión arterial, sistólica/diastólica/PAM, caída de presión a lo
// largo del circuito y medición con manguito (ruidos de Korotkoff).

import { ramp, clamp, lerp, easeInOut, easeOut, snap } from '../core/anim.js';
import {
  UI_ES, G, MMHG, P_ATM, n, sci, rect, shape, tank, gauge, figure, bed, axes, curve, readout, formula,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick, surfaceMark,
} from './kit.js';

const RHO_W = 1000;
const RHO_B = 1060;
const H_BODY = 1.75;

// ------------------------------------------------------------- cameras

const CAM = {
  title: { xmin: -2.4, xmax: 6.4, ymin: -0.9, ymax: 3.9 },
  block: { xmin: -2.2, xmax: 4.2, ymin: -1.2, ymax: 2.6 },
  cubes: { xmin: -0.8, xmax: 7.2, ymin: -1.0, ymax: 2.8 },
  tank: { xmin: -1.2, xmax: 9.0, ymin: -1.0, ymax: 4.1 },
  tankP: { xmin: -1.4, xmax: 5.4, ymin: -0.9, ymax: 4.0 },
  shapes: { xmin: -0.6, xmax: 8.6, ymin: -1.0, ymax: 3.4 },
  utube: { xmin: -1.6, xmax: 4.6, ymin: -0.9, ymax: 3.2 },
  press: { xmin: -1.4, xmax: 5.4, ymin: -0.8, ymax: 3.4 },
  body: { xmin: -2.4, xmax: 3.7, ymin: -0.75, ymax: 2.25 },
  wave: { xmin: -0.9, xmax: 7.6, ymin: -0.9, ymax: 3.6 },
};

// ---------------------------------------------------------- 1. P = F/A

const F_BLOCK = 600; // N, a person's weight

function blockScene(ink, w, o = {}) {
  const op = o.op;
  ink.ground('gnd', { x: -1.8, y: 0 }, { x: 3.8, y: 0 }, { op });
  const x0 = 1 - w / 2, x1 = 1 + w / 2;
  rect(ink, 'blk', x0, 0, x1, 0.55, 'part', { op });
  ink.arrow('Fb', { x: 1, y: 1.75 }, { x: 1, y: 0.58 }, 'ink heavy', { op, head: 12, headW: 4 });
  ink.text('Fb-l', { x: 1, y: 1.75 }, `$F$ = ${n(F_BLOCK)} N`, { op, dy: -10, size: 17 });
  // Pressure on the contact face: arrow length ∝ P.
  const P = F_BLOCK / (w * 1);
  const len = clamp(0.1 + P / 6000, 0.12, 0.85);
  const N = Math.max(2, Math.round(w / 0.16));
  for (let i = 0; i <= N; i++) {
    const x = x0 + 0.04 + ((w - 0.08) * i) / N;
    ink.arrow(`pb${i}`, { x, y: -0.06 }, { x, y: -0.06 - len }, 'blue', { op: (op ?? 1) * (o.arrowsOp ?? 1), head: 7, headW: 2.4 });
  }
  ink.dimension('dim-w', { x: x0, y: -0.2 - len }, { x: x1, y: -0.2 - len }, 0, `$A$ = ${n(w, 2)} m²`, { op, size: 15 });
  return P;
}

// ------------------------------------------------------- 2. densidad

function cubes(ink, t, o = {}) {
  const items = [
    { x: 0, cls: 'ghost', name: 'Aire pulmonar', rho: '1,2', dots: 6 },
    { x: 2.4, cls: 'blood-2', name: 'Sangre', rho: '1060', dots: 0 },
    { x: 4.8, cls: 'part', name: 'Hueso cortical', rho: '1900', approx: true, dots: 0 },
  ];
  items.forEach((it, i) => {
    const op = ramp(t, 0.4 + i * 0.8, 0.8) * (o.op ?? 1);
    const s = 1.5;
    rect(ink, `cube${i}`, it.x, 0, it.x + s, s, it.cls === 'ghost' ? 'fluid' : it.cls, { op });
    ink.poly(`cubeO${i}`, [{ x: it.x, y: 0 }, { x: it.x + s, y: 0 }, { x: it.x + s, y: s }, { x: it.x, y: s }, { x: it.x, y: 0 }], 'ink heavy', { op, layer: 'statics' });
    // Oblique edges: a technical cube.
    const d = 0.35;
    ink.poly(`cubeT${i}`, [{ x: it.x, y: s }, { x: it.x + d, y: s + d * 0.6 }, { x: it.x + s + d, y: s + d * 0.6 }, { x: it.x + s, y: s }], 'ink', { op, layer: 'statics' });
    ink.poly(`cubeR${i}`, [{ x: it.x + s + d, y: s + d * 0.6 }, { x: it.x + s + d, y: d * 0.6 }, { x: it.x + s, y: 0 }], 'ink', { op, layer: 'statics' });
    if (i === 0) for (let k = 0; k < 7; k++) ink.dot(`air${k}`, { x: it.x + 0.2 + ((k * 0.53) % 1.1), y: 0.25 + ((k * 0.37) % 1.0) }, { op, r: 2.6, cls: 'dot-blue' });
    if (i === 2) {
      let dd = '';
      for (let k = 0; k < 9; k++) {
        const a = ink.S({ x: it.x + 0.1 + k * 0.17, y: 0.08 }), b = ink.S({ x: it.x + 0.1 + k * 0.17 - 0.0, y: s - 0.08 });
        dd += `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
      }
      ink.path('bone-h', dd, 'hatch', { op: op * 0.5, layer: 'bodies' });
    }
    ink.text(`cubeN${i}`, { x: it.x + s / 2, y: 0 }, it.name, { op, dy: 24, size: 16 });
    ink.text(`cubeV${i}`, { x: it.x + s / 2, y: 0 }, `$ρ$ ${it.approx ? '≈' : '='} ${it.rho} kg/m³`, { op: op * (o.valuesOp ?? 1), dy: 46, size: 15, cls: 'mid' });
  });
  ink.dimension('cube-v', { x: 0, y: 2.25 }, { x: 4.8 + 1.5, y: 2.25 }, 0, 'mismo volumen, distinta masa', { op: ramp(t, 3, 0.8) * (o.op ?? 1), size: 14 });
}

// ------------------------------------------------ 3. presión y profundidad

const TANK = { x0: 0, x1: 3, y0: 0, depth: 3, top: 3.4 };

function tankScene(ink, probeDepth, o = {}) {
  const surf = TANK.y0 + TANK.depth;
  tank(ink, 'tk', TANK.x0, TANK.x1, TANK.y0, TANK.top, [{ h: TANK.depth, cls: 'fluid' }], { op: o.op });
  ink.text('tk-p0', { x: 1.5, y: TANK.top }, '$P_0$ (atmósfera)', { op: o.op, dy: -6, size: 15, cls: 'mid' });
  if (probeDepth === null || probeDepth === undefined) return;
  const y = surf - probeDepth;
  const op = o.op ?? 1;
  // The column of liquid resting on a small area A at depth h.
  if (o.column) {
    const co = o.columnOp ?? 1;
    rect(ink, 'col', 1.3, y, 1.7, surf, 'fluid-3', { op: op * co, layer: 'trails' });
    ink.poly('col-o', [{ x: 1.3, y: surf }, { x: 1.3, y }, { x: 1.7, y }, { x: 1.7, y: surf }], 'dashed', { op: op * co, layer: 'statics' });
    ink.line('col-A', { x: 1.3, y }, { x: 1.7, y }, 'accent heavy', { op: op * co, layer: 'vectors' });
    ink.text('col-Al', { x: 1.7, y }, '$A$', { op: op * co, dx: 8, dy: 16, size: 16, anchor: 'start', cls: 'accent-tx' });
    if (o.weight) {
      ink.arrow('col-W', { x: 1.5, y: (y + surf) / 2 + 0.25 }, { x: 1.5, y: (y + surf) / 2 - 0.35 }, 'ink heavy', { op: op * o.weight, head: 11, headW: 3.8 });
      ink.text('col-Wl', { x: 1.5, y: (y + surf) / 2 }, '$W$ = $ρ$ $g$ $A$ $h$', { op: op * o.weight, dx: 30, dy: 4, size: 15, anchor: 'start', cls: 'halo' });
    }
  }
  ink.dimension('dim-h', { x: TANK.x0, y: surf }, { x: TANK.x0, y }, 24, o.hLabel ?? `$h$ = ${n(probeDepth, 2)} m`, { op, size: 15 });
  ink.line('probe-l', { x: TANK.x1, y }, { x: TANK.x1 + 0.45, y }, 'ink', { op, layer: 'statics' });
  ink.circle('probe', { x: 2.2, y }, 4.5, 'ring-accent', { op, layer: 'vectors' });
  ink.line('probe-s', { x: 2.2, y }, { x: TANK.x1, y }, 'thin', { op, layer: 'statics' });
  const Pg = RHO_W * G * probeDepth;
  gauge(ink, 'gP', { x: TANK.x1 + 0.75, y }, Pg, RHO_W * G * 3.2, { op, label: o.gaugeLabel === false ? null : `${n(Pg / 1000, 1)} kPa`, size: 15 });
}

function phGraph(ink, marks, o = {}) {
  const P = axes(ink, 'ph', { x: 5.4, y: 0, w: 2.9, h: 3 }, {
    xmax: 3, ymax: 32, xticks: [0, 1, 2, 3], yticks: [0, 10, 20, 30], xlabel: '$h$ (m)', ylabel: '$P$ − $P_0$ (kPa)', op: o.op,
  });
  marks.forEach((h, i) => ink.dot(`phm${i}`, P(h, (RHO_W * G * h) / 1000), { r: 3.4, cls: 'dot-accent', layer: 'vectors', op: o.op }));
  if (o.line) curve(ink, 'ph-line', P, (h) => (RHO_W * G * h) / 1000, 0, 3, 'ink heavy', { draw: o.line, op: o.op });
  return P;
}

/** Three vessels of different shape, same depth: same pressure at the bottom. */
function shapesScene(ink, o = {}) {
  const h = 2;
  const vessels = [
    { x: 0.2, top: [0.0, 2.2], bottom: [0.6, 1.6] },
    { x: 3.2, top: [0.75, 1.35], bottom: [0.75, 1.35] },
    { x: 5.8, top: [0.9, 1.5], bottom: [0, 2.4] },
  ];
  vessels.forEach((v, i) => {
    const [tl, tr] = v.top, [bl, br] = v.bottom;
    const pts = [{ x: v.x + bl, y: 0 }, { x: v.x + br, y: 0 }, { x: v.x + tr, y: h }, { x: v.x + tl, y: h }];
    shape(ink, `sv${i}`, pts, 'fluid', { layer: 'trails' });
    ink.poly(`svw${i}`, [{ x: v.x + tl - (tl - bl) * 0.15, y: h + 0.3 }, ...[pts[3], pts[0], pts[1], pts[2]], { x: v.x + tr + (br - tr) * -0.15, y: h + 0.3 }], 'ink heavy', { layer: 'statics' });
    surfaceMark(ink, `svs${i}`, v.x + (tl + tr) / 2 + 0.2, h);
    const c = (bl + br) / 2;
    gauge(ink, `svg${i}`, { x: v.x + c, y: -0.45 }, o.reveal ? h : 0.0001, 3.2, { r: 17, op: 1 });
    ink.line(`svgl${i}`, { x: v.x + c, y: 0 }, { x: v.x + c, y: -0.45 + 0.13 }, 'ink', { layer: 'statics' });
    ink.text(`svn${i}`, { x: v.x + c, y: -0.45 }, ['(a)', '(b)', '(c)'][i], { dy: 40, size: 16 });
  });
  ink.dimension('sv-h', { x: -0.2, y: 0 }, { x: -0.2, y: h }, -2, '$h$', { size: 16 });
}

// ------------------------------------------------------------ 4. tubo en U

function uTubeGeom() {
  const a = 0.6, R = 0.6, yT = 2.6, yB = 0.7, w = 0.32;
  const L1 = yT - yB, Larc = Math.PI * R;
  const at = (s) => {
    if (s <= L1) return { p: { x: a, y: yT - s }, t: { x: 0, y: -1 } };
    if (s <= L1 + Larc) {
      const th = Math.PI + (s - L1) / R;
      return { p: { x: a + R + R * Math.cos(th), y: yB + R * Math.sin(th) }, t: { x: -Math.sin(th), y: Math.cos(th) } };
    }
    return { p: { x: a + 2 * R, y: yB + (s - L1 - Larc) }, t: { x: 0, y: 1 } };
  };
  return { a, R, yT, yB, w, L1, Larc, at, total: 2 * L1 + Larc };
}

function uBand(ink, key, U, s0, s1, cls) {
  const N = 40;
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const s = s0 + ((s1 - s0) * i) / N;
    const { p, t } = U.at(s);
    const nrm = { x: -t.y, y: t.x };
    left.push({ x: p.x + (nrm.x * U.w) / 2, y: p.y + (nrm.y * U.w) / 2 });
    right.push({ x: p.x - (nrm.x * U.w) / 2, y: p.y - (nrm.y * U.w) / 2 });
  }
  shape(ink, key, [...left, ...right.reverse()], cls, { layer: 'trails' });
}

function uTubeScene(ink, hOil, rhoOil, o = {}) {
  const k = o.k ?? 0.1; // world units per cm
  const U = uTubeGeom();
  // Interface level in the right leg; water surface on the left is lower by
  // the balance ρ₁h₁ = ρ₂h₂ measured from the interface level.
  const yI = 1.15;
  const hW = (rhoOil * hOil) / RHO_W;
  const sI = U.L1 + U.Larc + (yI - U.yB);
  const sWL = U.yT - (yI + hW);
  uBand(ink, 'u-w', U, sWL, sI, 'fluid-3');
  uBand(ink, 'u-o', U, sI, sI + hOil, 'fluid-2');
  // Walls.
  for (const [k, sg] of [['o', 1], ['i', -1]]) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const { p, t } = U.at((U.total * i) / 80);
      pts.push({ x: p.x - (t.y * sg * U.w) / 2, y: p.y + (t.x * sg * U.w) / 2 });
    }
    ink.poly(`u-wall-${k}`, pts, 'ink heavy', { layer: 'statics' });
  }
  const xL = U.a, xR = U.a + 2 * U.R;
  ink.line('u-ref', { x: xL - 0.6, y: yI }, { x: xR + 0.6, y: yI }, 'dashdot', { layer: 'annotations' });
  ink.text('u-ref-l', { x: xR + 0.6, y: yI }, 'misma presión', { dx: 6, dy: 5, size: 14, anchor: 'start', cls: 'mid' });
  ink.dimension('u-hw', { x: xL - 0.16, y: yI }, { x: xL - 0.16, y: yI + hW }, -20, o.showHw === false ? '$h_1$ = ?' : `$h_1$ = ${n(hW / k, 1)} cm`, { size: 14 });
  ink.dimension('u-ho', { x: xR + 0.16, y: yI }, { x: xR + 0.16, y: yI + hOil }, 20, `$h_2$ = ${n(hOil / k, 1)} cm`, { size: 14 });
  ink.text('u-wl', { x: xL, y: U.yB - 0.3 }, 'agua · $ρ_1$', { dx: -40, dy: 4, size: 14, anchor: 'end', cls: 'mid' });
  ink.text('u-ol', { x: xR, y: yI + hOil }, `aceite · $ρ_2$ = ${n(rhoOil)} kg/m³`, { dx: 26, dy: -4, size: 14, anchor: 'start', cls: 'mid' });
  return { hW };
}

// ------------------------------------------------------------- 4b. Pascal

function pressScene(ink, F1, ratio, o = {}) {
  const A1w = 0.36, A2w = 0.36 * Math.sqrt(ratio);
  const xs = 0.4, xb = 2.2;
  const yF = 0.9, depth = 0.5;
  // Fluid: two columns joined by a channel.
  rect(ink, 'pr-c', xs - A1w / 2, 0, xb + A2w / 2, depth, 'fluid', { layer: 'trails' });
  rect(ink, 'pr-s', xs - A1w / 2, depth, xs + A1w / 2, yF + 0.6, 'fluid', { layer: 'trails' });
  rect(ink, 'pr-b', xb - A2w / 2, depth, xb + A2w / 2, yF, 'fluid', { layer: 'trails' });
  ink.poly('pr-wall', [
    { x: xs - A1w / 2, y: 2.3 }, { x: xs - A1w / 2, y: 0 }, { x: xb + A2w / 2, y: 0 }, { x: xb + A2w / 2, y: 2.3 },
  ], 'ink heavy', { layer: 'statics' });
  ink.poly('pr-wall2', [{ x: xs + A1w / 2, y: 2.3 }, { x: xs + A1w / 2, y: depth }, { x: xb - A2w / 2, y: depth }, { x: xb - A2w / 2, y: 2.3 }], 'ink heavy', { layer: 'statics' });
  rect(ink, 'pr-p1', xs - A1w / 2 + 0.02, yF + 0.6, xs + A1w / 2 - 0.02, yF + 0.78, 'piston');
  rect(ink, 'pr-p2', xb - A2w / 2 + 0.02, yF, xb + A2w / 2 - 0.02, yF + 0.18, 'piston');
  ink.arrow('pr-F1', { x: xs, y: yF + 1.55 }, { x: xs, y: yF + 0.8 }, 'accent heavy', { head: 12, headW: 4 });
  ink.text('pr-F1l', { x: xs, y: yF + 1.55 }, `$F_1$ = ${n(F1)} N`, { dy: -8, size: 16, cls: 'accent-tx' });
  const F2 = F1 * ratio;
  ink.arrow('pr-F2', { x: xb, y: yF + 0.2 }, { x: xb, y: yF + 0.2 + clamp(0.3 + F2 / 2500, 0.3, 1.5) }, 'ink heavy', { head: 12, headW: 4 });
  ink.text('pr-F2l', { x: xb, y: yF + 0.2 + clamp(0.3 + F2 / 2500, 0.3, 1.5) }, o.hideF2 ? '$F_2$ = ?' : `$F_2$ = ${n(F2)} N`, { dy: -8, size: 16 });
  ink.text('pr-A1', { x: xs, y: 0 }, '$A_1$', { dy: 22, size: 15 });
  ink.text('pr-A2', { x: xb, y: 0 }, `$A_2$ = ${n(ratio)} $A_1$`, { dy: 22, size: 15 });
  // Equal pressure everywhere: small arrows on the walls.
  for (let i = 0; i < 6; i++) {
    const x = xs + 0.3 + i * ((xb - xs - 0.6) / 5);
    ink.arrow(`pr-pa${i}`, { x, y: depth / 2 }, { x, y: depth / 2 - 0.2 }, 'blue', { head: 6, headW: 2, op: o.arrowsOp ?? 1 });
  }
}

// ----------------------------------------------------------- 5. postura

function bodyScene(ink, ang, u, o = {}) {
  // Rotate about the feet; lying, the body rests on a bed at y ≈ 0.42.
  const lie = clamp(-ang / (Math.PI / 2));
  const at = { x: lerp(0, -0.9, lie), y: lerp(0, 0.42 + 0.13 * H_BODY * 0.6, lie) };
  if (lie > 0.02) bed(ink, 'bed', -1.05, 1.05, 0.42, { op: lie });
  if (lie < 0.98) ink.ground('floor', { x: -1.4, y: 0 }, { x: 1.4, y: 0 }, { op: 1 - lie });
  const fig = figure(ink, 'fig', at, H_BODY, ang, { op: o.op, sx: 1 - 0.4 * lie });
  const hy = fig.heart.y;
  ink.line('heart-ref', { x: -2.1, y: hy }, { x: 2.4, y: hy }, 'dashdot', { op: o.refOp ?? 1, layer: 'annotations' });
  ink.text('heart-refl', { x: -2.1, y: hy }, 'nivel del corazón', { op: o.refOp ?? 1, dx: 0, dy: -8, size: 13, anchor: 'start', cls: 'mid' });
  let probe = null;
  if (u !== null && u !== undefined) {
    probe = fig.W(0, u);
    const dh = o.dh ?? hy - probe.y;
    const Pm = 100 + (RHO_B * G * dh) / MMHG;
    if (Math.abs(dh) > 0.12 && !o.noDim) ink.dimension('dh', { x: 1.55, y: hy }, { x: 1.55, y: probe.y }, 0, `Δ$h$ = ${n(Math.abs(dh), 2)} m`, { size: 14 });
    ink.line('probe-h', probe, { x: 1.55, y: probe.y }, 'drop', { layer: 'annotations' });
    ink.circle('probe', probe, 6, 'ring-accent', { layer: 'vectors' });
    gauge(ink, 'gB', { x: 2.35, y: probe.y }, Pm, 220, { r: 22, label: o.showP === false ? null : `${n(Pm, 0)} mmHg`, size: 15 });
    return { probe, Pm, dh, fig };
  }
  return { fig };
}

// ------------------------------------------------ 6. presión arterial

/** Arterial pressure over one cycle (phase 0..1), 120/80 by default. */
export function arterial(phi, sys = 120, dia = 80) {
  const u = ((phi % 1) + 1) % 1;
  const k = 4.2;
  const rise = 0.13;
  if (u < rise) return dia + (sys - dia) * Math.sin((Math.PI / 2) * (u / rise)) ** 1.6;
  const s = (u - rise) / (1 - rise);
  const decay = (Math.exp(-k * s) - Math.exp(-k)) / (1 - Math.exp(-k));
  const notch = -0.06 * Math.exp(-(((s - 0.24) / 0.035) ** 2)) + 0.045 * Math.exp(-(((s - 0.3) / 0.05) ** 2));
  return dia + (sys - dia) * (decay + notch);
}

function waveGraph(ink, t, o = {}) {
  const P = axes(ink, 'wv', { x: 0, y: 0, w: 6.2, h: 2.8 }, {
    xmax: 3, ymax: 140, xticks: [0, 1, 2, 3], yticks: [0, 40, 80, 120], xlabel: '$t$ (s)', ylabel: '$P$ (mmHg)', grid: true, op: o.op,
  });
  const T = 0.8;
  curve(ink, 'wv-c', P, (x) => arterial(x / T, o.sys, o.dia), 0, 3, 'wave', { N: 300, draw: o.draw ?? 1, op: o.op });
  const sys = o.sys ?? 120, dia = o.dia ?? 80;
  if (o.marks) {
    const mo = o.marks;
    ink.line('wv-sys', P(0, sys), P(3, sys), 'accent-thin', { op: mo, layer: 'annotations' });
    ink.line('wv-dia', P(0, dia), P(3, dia), 'thin', { op: mo, layer: 'annotations' });
    ink.text('wv-sysl', P(3, sys), `sistólica ${n(sys)}`, { op: mo, dx: 6, dy: 5, size: 14, anchor: 'start', cls: 'accent-tx' });
    ink.text('wv-dial', P(3, dia), `diastólica ${n(dia)}`, { op: mo, dx: 6, dy: 5, size: 14, anchor: 'start' });
  }
  if (o.pulse) ink.dimension('wv-pp', P(2.55, dia), P(2.55, sys), 0, `${n(sys - dia)} mmHg`, { op: o.pulse, size: 13 });
  if (o.pam) {
    const pam = dia + (sys - dia) / 3;
    ink.line('wv-pam', P(0, pam), P(3, pam), 'blue', { op: o.pam, layer: 'annotations' });
    ink.text('wv-paml', P(3, pam), `PAM ≈ ${n(pam, 0)}`, { op: o.pam, dx: 6, dy: 5, size: 14, anchor: 'start', cls: 'blue-tx' });
  }
  return P;
}

const SEGMENTS = ['Aorta', 'Arterias', 'Arteriolas', 'Capilares', 'Vénulas', 'Venas', 'Cava'];

function circuitMean(x) {
  // x in [0, 7], one unit per segment.
  const pts = [[0, 100], [1, 97], [2, 88], [2.5, 60], [3, 35], [4, 17], [5, 12], [6, 8], [7, 2]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x <= x1) {
      const u = (x - x0) / (x1 - x0);
      const e = (1 - Math.cos(Math.PI * u)) / 2;
      return y0 + (y1 - y0) * e;
    }
  }
  return 2;
}

function circuitAmp(x) {
  if (x < 1.6) return 20 + 2 * x;
  if (x < 3) return 23 * (1 - (x - 1.6) / 1.4) ** 1.5;
  return 0;
}

function circuitGraph(ink, t, o = {}) {
  const P = axes(ink, 'cg', { x: 0, y: 0, w: 6.6, h: 2.8 }, { xmax: 7, ymax: 130, yticks: [0, 40, 80, 120], ylabel: '$P$ (mmHg)', grid: true, op: o.op });
  SEGMENTS.forEach((s, i) => {
    ink.text(`cg-s${i}`, P(i + 0.5, 0), s, { dy: 20, size: 13, cls: 'mid', op: o.op });
    if (i) ink.line(`cg-d${i}`, P(i, 0), P(i, 125), 'grid', { layer: 'grid', op: o.op });
  });
  if (o.band) rect(ink, 'cg-band', P(2, 0).x, 0, P(3, 0).x, 2.8, 'band', { op: o.band, layer: 'grid' });
  curve(ink, 'cg-w', P, (x) => circuitMean(x) + circuitAmp(x) * Math.sin(2 * Math.PI * x * 2.6), 0, 7, 'wave', { N: 420, draw: o.draw ?? 1, op: o.op });
  if (o.mean) curve(ink, 'cg-m', P, circuitMean, 0, 7, 'blue', { op: o.mean });
  if (o.band) ink.text('cg-bl', P(2.5, 125), 'mayor caída', { op: o.band, size: 14, cls: 'accent-tx halo', dy: 4 });
  return P;
}

function korotkoff(ink, t, o = {}) {
  const P = axes(ink, 'ko', { x: 0, y: 0, w: 6.4, h: 2.8 }, { xmax: 8, ymax: 170, xticks: [0, 2, 4, 6, 8], yticks: [40, 80, 120, 160], xlabel: '$t$ (s)', ylabel: '$P$ (mmHg)', grid: true });
  const T = 0.8;
  const reveal = o.reveal ?? 1;
  curve(ink, 'ko-a', P, (x) => arterial(x / T), 0, 8, 'wave', { N: 500, op: 0.9 });
  const cuff = (x) => 165 - 12.5 * x;
  curve(ink, 'ko-c', P, cuff, 0, 8, 'blue heavy', { draw: reveal });
  ink.text('ko-cl', P(0.4, cuff(0.4)), 'manguito', { dy: -10, size: 14, cls: 'blue-tx halo', anchor: 'start' });
  // A sound at each beat whose peak exceeds the cuff while the cuff is above diastole.
  const xEnd = 8 * reveal;
  let first = null, last = null;
  for (let k = 0; k < 10; k++) {
    const xp = k * T + 0.13 * T;
    if (xp > xEnd) break;
    const c = cuff(xp);
    if (c < 120 && c > 80) {
      if (first === null) first = xp;
      last = xp;
      ink.line(`ko-s${k}`, P(xp, c - 6), P(xp, c + 6), 'accent heavy', { layer: 'vectors' });
    }
  }
  if (first !== null && o.labels) {
    ink.text('ko-f', P(first, cuff(first)), '1.er ruido → PAS', { dx: 8, dy: -14, size: 14, anchor: 'start', cls: 'accent-tx halo' });
  }
  if (last !== null && o.labels && cuff(last + T) <= 80) {
    ink.text('ko-l', P(6.8, 80), 'silencio → PAD', { dy: 34, size: 14, cls: 'halo' });
  }
}

// ---------------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'depth': {
      const fluid = pick(rnd, [['agua', 1000], ['agua salada', 1025], ['sangre', 1060]]);
      const h = pick(rnd, [0.5, 1.2, 2, 2.5, 3, 4, 6]);
      const ans = (fluid[1] * G * h) / 1000;
      return {
        kind, ask: `¿Cuánto vale la presión manométrica ($P$ − $P_0$) a ${n(h)} m de profundidad en ${fluid[0]}?`,
        given: [['$ρ$', `${n(fluid[1])} kg/m³`], ['$h$', `${n(h)} m`], ['$g$', '9,8 m/s²']],
        number: { label: '$P$ − $P_0$ =', unit: 'kPa', answer: ans, d: 1 },
        hint: 'La presión manométrica es solo el término $ρ$ $g$ $h$. Pasa de Pa a kPa dividiendo entre 1000.',
        solution: [{ text: 'Presión manométrica:', math: `$ρ$ $g$ $h$ = ${n(fluid[1])}·9,8·${n(h)} = ${n(ans * 1000, 0)} Pa` }, { text: 'En kPa:', math: `${n(ans, 1)} kPa` }],
        why: `$ρ$ $g$ $h$ = ${n(ans, 1)} kPa.`, h, rho: fluid[1],
      };
    }
    case 'force': {
      const h = pick(rnd, [2, 3, 4, 5, 8]);
      const A = pick(rnd, [0.5, 1, 2, 3]);
      const ans = RHO_W * G * h * A * 1e-4;
      return {
        kind, ask: `Un buzo desciende a ${n(h)} m. ¿Qué fuerza neta ejerce el agua sobre una membrana de ${n(A)} cm² (presión manométrica)?`,
        given: [['$h$', `${n(h)} m`], ['$A$', `${n(A)} cm²`], ['$ρ$', '1000 kg/m³']],
        number: { label: '$F$ =', unit: 'N', answer: ans, d: 2 },
        hint: '$F$ = $P$·$A$, con $A$ en m²: 1 cm² = 10⁻⁴ m².',
        solution: [
          { text: 'Presión manométrica:', math: `$ρ$ $g$ $h$ = 1000·9,8·${n(h)} = ${n(RHO_W * G * h, 0)} Pa` },
          { text: 'Área en m²:', math: `${n(A)} cm² = ${sci(A * 1e-4, 1)} m²` },
          { text: 'Fuerza:', math: `$F$ = $P$·$A$ = ${n(ans, 2)} N` },
        ],
        why: `$F$ = ${n(ans, 2)} N.`, h,
      };
    }
    case 'posture': {
      const dh = pick(rnd, [0.3, 0.4, 0.5, 1.0, 1.2, 1.3]);
      const below = dh >= 1;
      const dP = (RHO_B * G * dh) / MMHG;
      const ans = below ? 100 + dP : 100 - dP;
      return {
        kind, ask: `De pie, con PAM = 100 mmHg a nivel del corazón, ¿cuál es la presión media en un punto ${n(dh, 2)} m ${below ? 'por debajo' : 'por encima'} del corazón?`,
        given: [['$ρ_{sangre}$', '1060 kg/m³'], ['Δ$h$', `${n(dh, 2)} m ${below ? 'abajo' : 'arriba'}`], ['1 mmHg', '133,3 Pa']],
        number: { label: '$P$ =', unit: 'mmHg', answer: ans, d: 0, rel: 0.02 },
        hint: `Δ$P$ = $ρ$ $g$ Δ$h$, en mmHg (÷ 133,3). ${below ? 'Por debajo del corazón se suma.' : 'Por encima del corazón se resta.'}`,
        solution: [
          { text: 'Diferencia hidrostática:', math: `Δ$P$ = 1060·9,8·${n(dh, 2)} = ${n(dP * MMHG, 0)} Pa = ${n(dP, 1)} mmHg` },
          { text: below ? 'Por debajo del corazón se suma:' : 'Por encima del corazón se resta:', math: `$P$ = 100 ${below ? '+' : '−'} ${n(dP, 1)} = ${n(ans, 0)} mmHg` },
        ],
        why: `$P$ ≈ ${n(ans, 0)} mmHg.`, dh, below,
      };
    }
    case 'pam': {
      const [sys, dia] = pick(rnd, [[120, 80], [130, 85], [140, 95], [150, 90], [110, 70], [90, 60], [160, 100]]);
      const ans = dia + (sys - dia) / 3;
      return {
        kind, ask: `Un paciente tiene ${sys}/${dia} mmHg. Estima su presión arterial media (PAM).`,
        given: [['PAS', `${sys} mmHg`], ['PAD', `${dia} mmHg`]],
        number: { label: 'PAM =', unit: 'mmHg', answer: ans, d: 0, rel: 0.015 },
        hint: 'PAM ≈ PAD + ⅓ (PAS − PAD): la diástole ocupa cerca de dos tercios del ciclo.',
        solution: [{ text: 'Presión de pulso:', math: `PAS − PAD = ${sys - dia} mmHg` }, { text: 'PAM:', math: `${dia} + ${sys - dia}/3 = ${n(ans, 0)} mmHg` }],
        why: `PAM ≈ ${n(ans, 0)} mmHg.`, sys, dia,
      };
    }
    case 'pascal': {
      const F1 = pick(rnd, [10, 20, 25, 40, 50]);
      const ratio = pick(rnd, [10, 20, 40, 50, 80]);
      return {
        kind, ask: `En una prensa hidráulica, $A_2$ = ${ratio}·$A_1$. Si se aplica $F_1$ = ${F1} N, ¿qué fuerza $F_2$ se obtiene?`,
        given: [['$F_1$', `${F1} N`], ['$A_2/A_1$', `${ratio}`]],
        number: { label: '$F_2$ =', unit: 'N', answer: F1 * ratio, d: 0 },
        hint: 'Pascal: la presión es la misma en ambos émbolos, $F_1/A_1$ = $F_2/A_2$.',
        solution: [{ text: 'Misma presión:', math: '$F_1/A_1$ = $F_2/A_2$' }, { text: 'Despejando:', math: `$F_2$ = ${F1}·${ratio} = ${F1 * ratio} N` }],
        why: `$F_2$ = ${F1 * ratio} N: la presión se transmite, la fuerza se multiplica.`, F1, ratio,
      };
    }
    case 'utube': {
      const rho = pick(rnd, [700, 800, 900]);
      const h2 = pick(rnd, [5, 8, 10, 12, 15]);
      const ans = (rho * h2) / RHO_W;
      return {
        kind, ask: `En un tubo en U hay agua y un aceite de ${rho} kg/m³. La columna de aceite mide ${h2} cm. ¿Qué altura de agua la equilibra, medida desde la interfase?`,
        given: [['$ρ_1$ (agua)', '1000 kg/m³'], ['$ρ_2$ (aceite)', `${rho} kg/m³`], ['$h_2$', `${h2} cm`]],
        number: { label: '$h_1$ =', unit: 'cm', answer: ans, d: 1 },
        hint: 'A la altura de la interfase las presiones son iguales: $ρ_1$ $h_1$ = $ρ_2$ $h_2$.',
        solution: [{ text: 'Equilibrio:', math: '$ρ_1$ $h_1$ = $ρ_2$ $h_2$' }, { text: 'Despejando:', math: `$h_1$ = ${rho}·${h2}/1000 = ${n(ans, 1)} cm` }],
        why: `$h_1$ = ${n(ans, 1)} cm: el líquido más denso sube menos.`, rho, h2,
      };
    }
    default: {
      const mm = pick(rnd, [80, 90, 100, 120, 140, 160]);
      return {
        kind: 'units', ask: `Expresa ${mm} mmHg en kilopascales.`,
        given: [['1 mmHg', '133,3 Pa'], ['1 kPa', '1000 Pa']],
        number: { label: '', unit: 'kPa', answer: (mm * MMHG) / 1000, d: 1 },
        hint: 'Multiplica por 133,3 para obtener Pa y divide entre 1000.',
        solution: [{ text: 'A pascales:', math: `${mm}·133,3 = ${n(mm * MMHG, 0)} Pa` }, { text: 'A kilopascales:', math: `${n((mm * MMHG) / 1000, 1)} kPa` }],
        why: `${mm} mmHg = ${n((mm * MMHG) / 1000, 1)} kPa.`, mm,
      };
    }
  }
}

function drawProblem(ink, p, solved, t) {
  switch (p.kind) {
    case 'depth':
    case 'force': {
      tank(ink, 'ptk', 0, 3, 0, 3.4, [{ h: 3, cls: 'fluid' }]);
      const y = 3 - clamp(p.h, 0, 6) * 0.45;
      ink.dimension('pdh', { x: 0, y: 3 }, { x: 0, y }, 24, `${n(p.h)} m`, { size: 15 });
      ink.circle('pdp', { x: 1.5, y }, 5, 'ring-accent', { layer: 'vectors' });
      if (p.kind === 'force') ink.text('pdm', { x: 1.5, y }, 'membrana', { dy: 22, size: 14, cls: 'mid' });
      break;
    }
    case 'posture': {
      const r = bodyScene(ink, 0, 0.5, { showP: solved });
      const hy = r.fig.heart.y;
      const y = p.below ? hy - p.dh : hy + p.dh;
      ink.line('ppl', { x: -0.4, y }, { x: 1.6, y }, 'accent-thin', { layer: 'annotations' });
      ink.circle('ppo', { x: 0, y: Math.max(0.03, Math.min(1.72, y)) }, 6, 'ring-accent', { layer: 'vectors' });
      break;
    }
    case 'pam':
      waveGraph(ink, t, { sys: p.sys, dia: p.dia, marks: 1, pam: solved ? 1 : 0, pulse: 1 });
      break;
    case 'pascal':
      pressScene(ink, p.F1, p.ratio, { hideF2: !solved });
      break;
    case 'utube':
      uTubeScene(ink, p.h2 * 0.09, p.rho, { showHw: solved, k: 0.09 });
      break;
    default:
      gauge(ink, 'pu', { x: 3, y: 1.4 }, p.mm, 200, { r: 60, label: `${p.mm} mmHg`, size: 22 });
  }
}

function practiceCam(S) {
  const k = S.practice?.prob?.kind;
  return ({ depth: CAM.tank, force: CAM.tank, posture: CAM.body, pam: CAM.wave, pascal: CAM.press, utube: CAM.utube })[k] ?? CAM.utube;
}

// ------------------------------------------------------------------ lesson

const workTank = (n1) => (S, t) => {
  const st = (k) => (k < n1 ? 'done' : 'now');
  return [
    { h: 'Datos' }, { given: [['$h$', '4 m'], ['$A$', '3 cm² = 3 × 10⁻⁴ m²'], ['$ρ_{agua}$', '1000 kg/m³']] },
    { step: 1, text: 'Presión manométrica a 4 m:', math: '$ρ$ $g$ $h$ = 1000·9,8·4 = 39 200 Pa', state: st(1) },
    ...(n1 >= 2 ? [{ step: 2, text: 'La fuerza es presión por área:', math: '$F$ = $P$·$A$ = 39 200·3 × 10⁻⁴', state: st(2) }] : []),
    ...(n1 >= 3 ? [{ step: 3, text: 'Resultado:', math: '$F$ ≈ 11,8 N   (el peso de 1,2 kg)', state: st(3) }] : []),
  ];
};

function tankExample(nStep, caption) {
  return {
    kind: 'watch', dur: 4, pause: true, cam: CAM.tankP, panel: 'work', caption,
    work: workTank(nStep),
    draw({ ink }, t) {
      tankScene(ink, 4 * 0.6, { column: nStep >= 1, columnOp: 1, weight: nStep === 1 ? ramp(t, 0.5, 0.6) : 0, gaugeLabel: false, hLabel: '$h$ = 4 m' });
      ink.text('ex-ear', { x: 2.2, y: 3 - 2.4 }, 'tímpano', { dx: 2, dy: -12, size: 14, cls: 'accent-tx halo' });
      ink.text('ex-scale', { x: 1.5, y: 0 }, '(escala vertical reducida)', { dy: 22, size: 12, cls: 'mid' });
    },
  };
}

function oilTank(ink, o = {}) {
  const top = tank(ink, 'ot', 0, 3, 0, 3.6, [{ h: 1.5, cls: 'fluid', label: 'agua salada · 1025 kg/m³' }, { h: 1.8, cls: 'fluid-2', label: 'petróleo · 700 kg/m³' }], { labelSize: 15 });
  ink.dimension('ot-h1', { x: 3, y: top }, { x: 3, y: 1.5 }, -24, '$h_1$ = 8,00 m', { size: 14 });
  ink.dimension('ot-h2', { x: 3, y: 1.5 }, { x: 3, y: 0 }, -24, '$h_2$ = 5,00 m', { size: 14 });
  ink.text('ot-p0', { x: 1.5, y: 3.6 }, '$P_0$', { dy: -4, size: 16 });
  ink.circle('ot-P1', { x: 0.5, y: 1.5 }, 5, o.at === 1 ? 'ring-accent' : 'pin', { layer: 'vectors' });
  ink.text('ot-P1l', { x: 0.5, y: 1.5 }, '$P_1$', { dx: 10, dy: -8, size: 16, anchor: 'start', cls: 'halo' });
  ink.circle('ot-Pb', { x: 1.5, y: 0.06 }, 5, o.at === 2 ? 'ring-accent' : 'pin', { layer: 'vectors' });
  ink.text('ot-Pbl', { x: 1.5, y: 0.06 }, '$P_{fondo}$', { dx: 10, dy: -8, size: 16, anchor: 'start', cls: 'halo' });
}

export const b1 = {
  id: 'bio-b1', code: 'B.1', title: 'Presión en los fluidos', lang: 'es', ui: UI_ES,
  cam: CAM.tank, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, w: 1.2, wSeen: new Set(), depth: 1, marks: [], dBins: new Set(), ang: 0, target: 0, u: 0.5, uSeen: new Set(), lieSeen: false }),
  chapters: [
    {
      id: 'intro', title: 'Presión en los fluidos', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Unidad 2 · Lección B.1',
          title: 'Presión en los fluidos',
          sub: 'De P = F/A a la presión arterial: por qué la postura cambia la presión, cómo se mide y qué significa cada número.',
          meta: 'Unos 60 minutos · Semana 7 · Ejemplos resueltos · Casos clínicos · Práctica',
        }),
        draw({ ink }, t) {
          tank(ink, 'tt', 2.4, 5.4, 0, 3.2, [{ h: 2.6 * ramp(t, 0.5, 2.5, easeOut), cls: 'fluid' }], { op: 0.85 });
          figure(ink, 'tf', { x: 0, y: 0 }, H_BODY, 0, { op: ramp(t, 0.3, 1) * 0.85 });
          ink.ground('tg', { x: -1, y: 0 }, { x: 1, y: 0 }, { op: 0.8 });
        },
      }],
    },
    // ================================================================ 1
    {
      id: 'presion', title: 'Presión: fuerza sobre área', short: 'Presión', num: '1',
      beats: [
        {
          kind: 'watch', dur: 10, cam: CAM.block,
          caption: [
            [0, 'Un bloque de 600 N descansa sobre el suelo. Su peso no actúa en un punto: se reparte sobre toda la cara de apoyo.'],
            [9.5, 'La <b>presión</b> es cuánta fuerza recibe cada metro cuadrado: $P$ = $F/A$.'],
          ],
          draw({ ink }, t) {
            blockScene(ink, 1.2, { arrowsOp: ramp(t, 4, 1) });
            formula(ink, 'f-pfa', '$P$ = $F$ / $A$', { op: ramp(t, 9.5, 0.8), fy: 0.12 });
          },
        },
        {
          kind: 'do', cam: CAM.block,
          caption: (S) => `$P$ = ${n(F_BLOCK)} N / ${n(S.w, 2)} m² = ${n(F_BLOCK / S.w, 0)} Pa`,
          prompt: 'Arrastra el borde del bloque: hazlo muy angosto y luego muy ancho.',
          success: 'Misma fuerza, menos área → más presión. Por eso una aguja perfora la piel y un manguito ancho reparte su presión sobre el brazo.',
          draw({ ink, S }) {
            const P = blockScene(ink, S.w);
            readout(ink, [`$F$ = ${n(F_BLOCK)} N`, `$A$ = ${n(S.w, 2)} m²`, `$P$ = ${n(P, 0)} Pa`]);
          },
          handles: (S) => [{ key: 'edge', p: { x: 1 + S.w / 2, y: 0.28 }, r: 24, cursor: 'ew-resize', drag: (S2, p) => {
            S2.w = clamp(snap((p.x - 1) * 2, 0.05), 0.15, 2.6);
            S2.wSeen.add(S2.w < 0.4 ? 'n' : S2.w > 1.9 ? 'w' : 'm');
          } }],
          done: (S) => S.wSeen.has('n') && S.wSeen.has('w'),
          skip(S) { S.wSeen.add('n'); S.wSeen.add('w'); },
        },
        {
          kind: 'watch', dur: 10, cam: CAM.block,
          caption: [
            [0, 'En el SI la presión se mide en pascales: 1 Pa = 1 N/m². Es una unidad pequeña.'],
            [7.5, 'En medicina se usa el milímetro de mercurio: 1 mmHg = 133,3 Pa, y 760 mmHg = 1 atm = 101 325 Pa.'],
          ],
          draw({ ink }, t) {
            gauge(ink, 'gu1', { x: -0.4, y: 1 }, 120, 200, { r: 56, op: ramp(t, 0.5, 0.8), label: '120 mmHg', size: 20 });
            ink.text('gu1e', { x: -0.4, y: 1 }, `= ${n(120 * MMHG, 0)} Pa = ${n((120 * MMHG) / 1000, 1)} kPa`, { op: ramp(t, 7.5, 0.8), dy: 90, size: 17 });
            gauge(ink, 'gu2', { x: 2.6, y: 1 }, 760, 800, { r: 56, op: ramp(t, 8.5, 0.8), label: '1 atm', size: 20 });
            ink.text('gu2e', { x: 2.6, y: 1 }, '= 760 mmHg = 101 325 Pa', { op: ramp(t, 9.5, 0.8), dy: 90, size: 17 });
          },
        },
        {
          kind: 'do', cam: CAM.block,
          ...askNumber({
            key: 'conv', label: '', unit: 'kPa', answer: 16.0, rel: 0.01,
            wrong: [[16000, 'Eso está en pascales. Divide entre 1000 para pasar a kPa.'], [0.9, 'Dividiste. Cada mmHg vale 133,3 Pa: hay que multiplicar.', 0.05], [120, 'Falta convertir: multiplica por 133,3 Pa/mmHg.']],
          }),
          caption: (S) => S.g.conv?.msg ?? (S.g.conv?.wrong ? 'Revisa: mmHg × 133,3 → Pa; Pa ÷ 1000 → kPa.' : 'Una presión sistólica típica es 120 mmHg.'),
          prompt: 'Expresa 120 mmHg en kilopascales.',
          success: '120 mmHg = 16,0 kPa. La sangre empuja la pared de la aorta con unas 0,16 atmósferas sobre la presión atmosférica.',
          draw({ ink }) { gauge(ink, 'gq', { x: 1, y: 1 }, 120, 200, { r: 64, label: '120 mmHg', size: 22 }); },
        },
      ],
    },
    // ================================================================ 2
    {
      id: 'densidad', title: 'Densidad', short: 'Densidad', num: '2',
      beats: [
        {
          kind: 'watch', dur: 12, cam: CAM.cubes,
          caption: [
            [0, 'Tres cubos del mismo volumen: aire del pulmón, sangre y hueso. Pesan muy distinto.'],
            [6.5, 'La <b>densidad</b> es la masa por unidad de volumen: $ρ$ = $m/V$, en kg/m³.'],
            [12.5, 'Clave clínica: la densidad condiciona cuánto atenúa un tejido los rayos X. Por eso el hueso se ve blanco y el pulmón oscuro.'],
          ],
          draw({ ink }, t) {
            cubes(ink, t, { valuesOp: ramp(t, 6.5, 0.8) });
            formula(ink, 'f-rho', '$ρ$ = $m$ / $V$', { op: ramp(t, 6.5, 0.8), fy: 0.1 });
          },
        },
        {
          kind: 'do', cam: CAM.cubes,
          ...(() => {
            const c = askChoice({
              key: 'rho', choices: [
                { id: 'a', label: '1,06 kg', correct: true },
                { id: 'b', label: '1,00 kg', why: 'Eso sería agua pura. La sangre lleva células y proteínas: es algo más densa.' },
                { id: 'c', label: '10,6 kg', why: 'Revisa las unidades: 1 L = 10⁻³ m³, así que $m$ = 1060 × 10⁻³ kg.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Usa $m$ = $ρ$·$V$, con 1 L = 10⁻³ m³.' };
          })(),
          prompt: '¿Qué masa tiene 1 litro de sangre ($ρ$ = 1060 kg/m³)?',
          success: '$m$ = 1060 kg/m³ × 10⁻³ m³ = 1,06 kg. Un adulto tiene unos 5 L de sangre: unos 5,3 kg.',
          draw({ ink }, t) { cubes(ink, 10); },
        },
      ],
    },
    // ================================================================ 3
    {
      id: 'profundidad', title: 'La presión crece con la profundidad', short: 'Profundidad', num: '3',
      beats: [
        {
          kind: 'watch', dur: 16, cam: CAM.tank,
          caption: [
            [0, 'En un líquido en reposo, imagina un área pequeña $A$ a una profundidad $h$.'],
            [6, 'Sobre ella descansa una columna de líquido. Su peso es $W$ = $m$ $g$ = $ρ$ $A$ $h$ $g$.'],
            [12.5, 'Ese peso, más el aire que empuja la superficie, se reparte sobre $A$: $P$ = $P_0$ + $ρ$ $g$ $h$.'],
          ],
          draw({ ink }, t) {
            tankScene(ink, 1.8, { column: true, columnOp: ramp(t, 3, 1), weight: ramp(t, 6, 0.8), gaugeLabel: false });
            formula(ink, 'f-hyd', '$P$ = $P_0$ + $ρ$ $g$ $h$', { op: ramp(t, 12.5, 0.8), fx: 0.72, fy: 0.2 });
          },
        },
        {
          kind: 'watch', dur: 9, cam: CAM.tank,
          caption: [
            [0, '$P$ es la presión <b>absoluta</b>. La parte $ρ$ $g$ $h$ es la presión <b>manométrica</b>: lo que marca un manómetro, que mide respecto a la atmósfera.'],
            [9, 'La presión arterial "120 mmHg" es manométrica: 120 mmHg por encima de la atmosférica.'],
          ],
          draw({ ink }, t) { tankScene(ink, 1.8, { column: true }); formula(ink, 'f-hyd2', '$P$ − $P_0$ = $ρ$ $g$ $h$', { op: ramp(t, 0.5, 0.8), fx: 0.72, fy: 0.2 }); },
        },
        {
          kind: 'do', cam: CAM.tank,
          enter(S) { S.marks = S.marks ?? []; },
          caption: (S) => `A ${n(S.depth, 2)} m: $P$ − $P_0$ = 1000·9,8·${n(S.depth, 2)} = ${n(RHO_W * G * S.depth / 1000, 1)} kPa`,
          prompt: 'Arrastra el sensor hacia abajo y hacia arriba. Cada posición deja un punto en la gráfica.',
          success: 'Una recta: cada metro de agua añade 9,8 kPa (≈ 74 mmHg). La presión depende linealmente de la profundidad.',
          draw({ ink, S }) {
            tankScene(ink, S.depth);
            phGraph(ink, S.marks, { line: S.dBins.size >= 5 ? 1 : 0 });
          },
          handles: (S) => [{ key: 'probe', p: { x: 2.2, y: 3 - S.depth }, r: 24, cursor: 'ns-resize', drag: (S2, p) => {
            S2.depth = clamp(snap(3 - p.y, 0.1), 0, 3);
            if (!S2.marks.some((h) => Math.abs(h - S2.depth) < 0.05)) S2.marks.push(S2.depth);
            S2.dBins.add(Math.floor(S2.depth * 2));
          } }],
          done: (S) => S.dBins.size >= 5,
          skip(S) { [0, 1, 2, 3, 4, 5].forEach((k) => { S.dBins.add(k); S.marks.push(k / 2); }); },
        },
        {
          kind: 'do', cam: CAM.shapes,
          ...(() => {
            const c = askChoice({
              key: 'shape', choices: [
                { id: 'a', label: 'en (a), el más ancho arriba', why: 'Más líquido no significa más presión en el fondo: las paredes inclinadas sostienen parte del peso.' },
                { id: 'c', label: 'en (c), el de fondo más grande', why: 'Un fondo más grande recibe más fuerza, pero no más presión: $P$ = $F/A$.' },
                { id: 'eq', label: 'es igual en los tres', correct: true },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Los tres recipientes tienen el mismo líquido a la misma altura $h$.' };
          })(),
          prompt: '¿En cuál es mayor la presión en el fondo?',
          success: 'Igual en los tres: $P$ = $P_0$ + $ρ$ $g$ $h$ solo depende de la profundidad, no de la forma ni de la cantidad de líquido (paradoja hidrostática).',
          draw({ ink, S }) { shapesScene(ink, { reveal: S.g.shape === 'eq' }); },
        },
        tankExample(1, 'Ejemplo: ¿qué fuerza ejerce el agua sobre el tímpano a 4 m de profundidad? Área del tímpano: unos 3 cm². Primero, la presión manométrica.'),
        tankExample(2, 'La fuerza sobre una superficie es presión por área, con el área en m²: 3 cm² = 3 × 10⁻⁴ m².'),
        tankExample(3, 'Unos 12 N, como sostener 1,2 kg con el tímpano. Por eso duele bucear sin compensar la presión del oído medio.'),
        {
          kind: 'do', cam: CAM.tankP, panel: 'work',
          ...askNumber({
            key: 'P1', label: '$P_1$ =', unit: 'kPa', answer: (P_ATM + 700 * G * 8) / 1000, rel: 0.005,
            wrong: [[(700 * G * 8) / 1000, 'Esa es solo la parte manométrica. El tanque está abierto: suma $P_0$ = 101,3 kPa.', 0.01], [(P_ATM + 1025 * G * 8) / 1000, 'Usaste la densidad del agua salada. Sobre la interfase hay petróleo: 700 kg/m³.', 0.005]],
          }),
          caption: (S) => S.g.P1?.msg ?? (S.g.P1?.wrong ? 'Revisa: $P_1$ = $P_0$ + $ρ_{petróleo}$ $g$ $h_1$.' : 'Tanque abierto con dos capas de líquido. Baja capa por capa.'),
          prompt: '¿Cuál es la presión absoluta $P_1$ en la interfase petróleo–agua? (en kPa)',
          success: '$P_1$ = 101 325 + 700·9,8·8 = 156 205 Pa ≈ 156,2 kPa.',
          work: (S) => [
            { h: 'Datos' }, { given: [['$h_1$', '8,00 m de petróleo'], ['$ρ_1$', '700 kg/m³'], ['$h_2$', '5,00 m de agua salada'], ['$ρ_2$', '1025 kg/m³'], ['$P_0$', '101 325 Pa']] },
            { step: 1, text: 'En la interfase pesa solo el petróleo:', math: '$P_1$ = $P_0$ + $ρ_1$ $g$ $h_1$', state: S.g.P1?.ok ? 'done' : 'now' },
            ...(S.g.P1?.ok ? [{ result: '$P_1$ = 156,2 kPa', ok: true }] : []),
          ],
          draw({ ink }) { oilTank(ink, { at: 1 }); },
        },
        {
          kind: 'do', cam: CAM.tankP, panel: 'work',
          ...askNumber({
            key: 'Pb', label: '$P_{fondo}$ =', unit: 'kPa', answer: (P_ATM + 700 * G * 8 + 1025 * G * 5) / 1000, rel: 0.005,
            wrong: [[(P_ATM + 1025 * G * 13) / 1000, 'Usaste agua salada en toda la altura. Cada capa aporta con su propia densidad.', 0.005], [(700 * G * 8 + 1025 * G * 5) / 1000, 'Falta la presión atmosférica: pide la presión absoluta.', 0.01]],
          }),
          caption: (S) => S.g.Pb?.msg ?? (S.g.Pb?.wrong ? 'Desde $P_1$, suma la columna de agua salada: $ρ_2$ $g$ $h_2$.' : 'Ahora sigue bajando por la capa de agua salada.'),
          prompt: '¿Cuál es la presión absoluta en el fondo del tanque? (en kPa)',
          success: '$P_{fondo}$ = 156 205 + 1025·9,8·5 = 206 430 Pa ≈ 206,4 kPa: unas 2 atmósferas.',
          work: (S) => [
            { h: 'Datos' }, { given: [['$h_1$', '8,00 m de petróleo'], ['$ρ_1$', '700 kg/m³'], ['$h_2$', '5,00 m de agua salada'], ['$ρ_2$', '1025 kg/m³'], ['$P_0$', '101 325 Pa']] },
            { step: 1, text: 'En la interfase:', math: '$P_1$ = 156 205 Pa', state: 'done' },
            { step: 2, text: 'Hasta el fondo se suma la columna de agua:', math: '$P_{fondo}$ = $P_1$ + $ρ_2$ $g$ $h_2$', state: S.g.Pb?.ok ? 'done' : 'now' },
            ...(S.g.Pb?.ok ? [{ result: '$P_{fondo}$ = 206,4 kPa', ok: true }] : []),
          ],
          draw({ ink }) { oilTank(ink, { at: 2 }); },
        },
      ],
    },
    // ================================================================ 4
    {
      id: 'pascal', title: 'Tubo en U y principio de Pascal', short: 'Pascal', num: '4',
      beats: [
        {
          kind: 'watch', dur: 14, cam: CAM.utube,
          caption: [
            [0, 'Un tubo en U con agua a la izquierda y aceite, menos denso, a la derecha. No se mezclan.'],
            [6.5, 'A la altura de la interfase, la presión es la misma en las dos ramas: $ρ_1$ $g$ $h_1$ = $ρ_2$ $g$ $h_2$.'],
            [13.5, 'Así que $ρ_1$ $h_1$ = $ρ_2$ $h_2$: el líquido menos denso necesita una columna más alta. Es la base de los manómetros.'],
          ],
          draw({ ink }, t) {
            uTubeScene(ink, 1.0, 700);
            formula(ink, 'f-u', '$ρ_1$ $h_1$ = $ρ_2$ $h_2$', { op: ramp(t, 13.5, 0.8), fx: 0.78, fy: 0.2 });
          },
        },
        {
          kind: 'do', cam: CAM.utube,
          ...askNumber({ key: 'u', label: '$h_1$ =', unit: 'cm', answer: 7, rel: 0.02, wrong: [[14.29, 'Invertiste la proporción: el agua es más densa, así que su columna es más baja.', 0.02], [10, 'Las alturas solo son iguales si las densidades lo son.']] }),
          caption: (S) => S.g.u?.msg ?? (S.g.u?.wrong ? 'Usa $ρ_1$ $h_1$ = $ρ_2$ $h_2$.' : 'El aceite tiene 700 kg/m³ y su columna mide 10 cm sobre la interfase.'),
          prompt: '¿Qué altura de agua $h_1$ equilibra 10 cm de aceite?',
          success: '$h_1$ = 700·10/1000 = 7 cm. El agua, más densa, sube menos.',
          draw({ ink, S }) { uTubeScene(ink, 1.0, 700, { showHw: !!S.g.u?.ok }); },
        },
        {
          kind: 'watch', dur: 18, cam: CAM.press,
          caption: [
            [0, '<b>Principio de Pascal</b>: la presión aplicada a un fluido encerrado se transmite con igual intensidad a todos sus puntos y a las paredes.'],
            [9, 'Si empujamos el émbolo pequeño, la misma presión actúa sobre el grande: $F_1/A_1$ = $F_2/A_2$.'],
            [15, 'Con $A_2$ = 50 $A_1$, 20 N se convierten en 1000 N. La presión se transmite; la fuerza se multiplica.'],
          ],
          draw({ ink }, t) {
            pressScene(ink, 20, 50, { arrowsOp: ramp(t, 3, 1) });
            formula(ink, 'f-pa', '$F_1$ / $A_1$ = $F_2$ / $A_2$', { op: ramp(t, 9, 0.8), fx: 0.75, fy: 0.16 });
          },
        },
        {
          kind: 'watch', dur: 12, cam: CAM.press,
          caption: [
            [0, 'Clave clínica: el manguito del tensiómetro es un fluido (aire) encerrado. Su presión se transmite a través del brazo hasta la arteria braquial.'],
            [10, 'Por eso la lectura depende de la <b>presión</b>, no de la fuerza: presión ≠ fuerza. Un manguito demasiado estrecho da lecturas falsamente altas.'],
          ],
          draw({ ink }, t) { pressScene(ink, 20, 50); },
        },
      ],
    },
    // ================================================================ 5
    {
      id: 'postura', title: 'La postura y la presión arterial', short: 'Postura', num: '5',
      beats: [
        {
          kind: 'watch', dur: 18, cam: CAM.body,
          caption: [
            [0, 'La sangre es un fluido, y dentro del cuerpo también vale $P$ = $P_0$ + $ρ$ $g$ $h$. Tomamos el corazón como referencia.'],
            [8, 'De pie, los pies están unos 1,3 m por debajo del corazón: ahí la presión es mayor. La cabeza está por encima: ahí es menor.'],
            [16.5, 'La diferencia es Δ$P$ = $ρ$ $g$ Δ$h$, con $ρ_{sangre}$ = 1060 kg/m³.'],
          ],
          draw({ ink }, t) {
            const u = t < 8 ? HEART_U : t < 12 ? lerp(HEART_U, 0.03, easeInOut(clamp((t - 8) / 3))) : lerp(0.03, 0.92, easeInOut(clamp((t - 12) / 4)));
            bodyScene(ink, 0, u, { refOp: ramp(t, 1, 0.8) });
          },
        },
        {
          kind: 'do', cam: CAM.body,
          tick(S, dt) {
            const k = 1 - Math.exp(-dt * 3.2);
            S.ang += (S.target - S.ang) * k;
          },
          caption: (S) => {
            const lying = S.target < -1;
            if (lying) return 'Acostado, todo el cuerpo queda casi a la altura del corazón: Δ$h$ es pequeño y la presión es casi uniforme.';
            return 'De pie: la presión cambia con la altura respecto al corazón.';
          },
          prompt: 'Arrastra el sensor de la cabeza a los pies. Luego acuesta al paciente.',
          controls: (S) => [
            { type: 'button', id: 'pie', label: 'De pie', primary: S.target === 0 },
            { type: 'button', id: 'acostado', label: 'Acostado (decúbito)', primary: S.target < -1 },
          ],
          act(S, id) {
            S.target = id === 'acostado' ? -Math.PI / 2 : 0;
            if (id === 'acostado') S.lieSeen = true;
          },
          success: 'De pie: unos 70 mmHg en la cabeza y unos 200 mmHg en los tobillos. Acostado: casi 100 mmHg en todas partes. Por eso la presión se mide con el brazo a la altura del corazón.',
          draw({ ink, S }) {
            const r = bodyScene(ink, S.ang, S.u);
            if (r.Pm !== undefined) readout(ink, [`Δ$h$ = ${n(r.dh, 2)} m`, `$P$ ≈ ${n(r.Pm, 0)} mmHg`]);
          },
          handles: (S) => {
            const lie = clamp(-S.ang / (Math.PI / 2));
            const at = { x: lerp(0, -0.9, lie), y: lerp(0, 0.42 + 0.13 * H_BODY * 0.6, lie) };
            const c = Math.cos(S.ang), s = Math.sin(S.ang);
            const p = { x: at.x + (-S.u * H_BODY) * s, y: at.y + S.u * H_BODY * c };
            return [{ key: 'probe', p, r: 22, drag: (S2, q) => {
              const dx = q.x - at.x, dy = q.y - at.y;
              S2.u = clamp((-dx * s + dy * c) / H_BODY, 0.03, 0.93);
              S2.uSeen.add(S2.u > 0.85 ? 'head' : S2.u < 0.15 ? 'feet' : 'mid');
            } }];
          },
          done: (S) => S.uSeen.has('head') && S.uSeen.has('feet') && S.lieSeen,
          skip(S) { S.uSeen.add('head'); S.uSeen.add('feet'); S.lieSeen = true; },
          leave(S) { S.ang = 0; S.target = 0; },
        },
        ...[1, 2, 3].map((k) => ({
          kind: 'watch', dur: 4, pause: true, cam: CAM.body, panel: 'work',
          caption: [
            'Caso 01: un paciente de pie; del corazón al tobillo hay 1,30 m. ¿Cuánto aumenta la presión en el tobillo?',
            'Convertimos a mmHg dividiendo entre 133,3 Pa/mmHg.',
            'En el tobillo la presión es unos 100 mmHg mayor que en el corazón. En las venas pasa lo mismo: favorece el edema maleolar y la insuficiencia venosa.',
          ][k - 1],
          work: () => {
            const st = (j) => (j < k ? 'done' : 'now');
            return [
              { h: 'Datos' }, { given: [['$ρ_{sangre}$', '1060 kg/m³'], ['$g$', '9,8 m/s²'], ['$h$', '1,30 m']] },
              { step: 1, text: 'Diferencia hidrostática:', math: 'Δ$P$ = $ρ$ $g$ $h$ = 1060·9,8·1,30 = 13 504 Pa', state: st(1) },
              ...(k >= 2 ? [{ step: 2, text: 'En mmHg:', math: '13 504 / 133,3 ≈ 101 mmHg', state: st(2) }] : []),
              ...(k >= 3 ? [{ step: 3, text: 'Implicación:', math: 'PAM tobillo ≈ 100 + 101 ≈ 200 mmHg', state: st(3) }] : []),
            ];
          },
          draw({ ink }) {
            const r = bodyScene(ink, 0, 0.02, { showP: k >= 3, dh: 1.3, noDim: true });
            ink.dimension('c1h', { x: -0.55, y: r.fig.heart.y }, { x: -0.55, y: 0.035 }, 0, '$h$ = 1,30 m', { size: 15 });
          },
        })),
        {
          kind: 'do', cam: CAM.body, panel: 'work',
          ...askNumber({ key: 'head', label: '$P_{cabeza}$ =', unit: 'mmHg', answer: 100 - (RHO_B * G * 0.4) / MMHG, rel: 0.03, wrong: [[100 + (RHO_B * G * 0.4) / MMHG, 'El cerebro está por encima del corazón: ahí la presión es menor. Resta.', 0.03], [(RHO_B * G * 0.4) / MMHG, 'Ese es Δ$P$. La presión en la cabeza es 100 mmHg menos Δ$P$.', 0.03]] }),
          caption: (S) => S.g.head?.msg ?? (S.g.head?.wrong ? 'Δ$P$ = 1060·9,8·0,40 Pa; pásalo a mmHg y réstalo de 100.' : 'Ahora la cabeza: el cerebro está unos 0,40 m por encima del corazón. PAM en el corazón: 100 mmHg.'),
          prompt: '¿Cuál es la presión arterial media a la altura del cerebro, de pie?',
          success: 'Δ$P$ = 4155 Pa ≈ 31 mmHg, así que $P_{cabeza}$ ≈ 69 mmHg. Si la presión en el corazón cae, el cerebro es el primero en notarlo: mareo.',
          work: (S) => [
            { h: 'Datos' }, { given: [['$ρ_{sangre}$', '1060 kg/m³'], ['Δ$h$', '0,40 m (por encima)'], ['PAM corazón', '100 mmHg']] },
            { step: 1, text: 'Δ$P$ = $ρ$ $g$ Δ$h$ en Pa y en mmHg.', state: 'now' },
            { step: 2, text: 'Por encima del corazón, la presión es menor: se resta.', state: 'now' },
            ...(S.g.head?.ok ? [{ result: '$P_{cabeza}$ ≈ 69 mmHg', ok: true }] : []),
          ],
          draw({ ink, S }) { bodyScene(ink, 0, 0.95, { showP: !!S.g.head?.ok }); },
        },
        {
          kind: 'do', cam: CAM.body,
          ...(() => {
            const c = askChoice({
              key: 'orto', choices: [
                { id: 'a', label: 'la sangre se acumula en las piernas y baja la presión que llega a la cabeza', correct: true },
                { id: 'b', label: 'al ponerse de pie cambia la presión atmosférica', why: '$P_0$ es la misma en la cabeza y en los pies: la diferencia es la columna de sangre.' },
                { id: 'c', label: 'el corazón late más débil al estar de pie', why: 'Al contrario: los reflejos aceleran el corazón para compensar. La causa inicial es hidrostática.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Caso 1: paciente de 75 años. Sentado, 130/85 mmHg; tras 3 min de pie, 90/60 mmHg. Refiere mareo al levantarse.' };
          })(),
          prompt: '¿Qué explica la hipotensión ortostática?',
          success: 'Al ponerse de pie, $ρ$ $g$ $h$ hace que la sangre se acumule en las venas de las piernas; baja el retorno venoso, el volumen sistólico y la presión cerebral. Con arterias rígidas (edad, aterosclerosis) la compensación es más lenta.',
          draw({ ink }) { bodyScene(ink, 0, 0.95, { showP: false }); },
        },
      ],
    },
    // ================================================================ 6
    {
      id: 'arterial', title: 'Sistólica, diastólica y PAM', short: 'Presión arterial', num: '6',
      beats: [
        {
          kind: 'watch', dur: 20, cam: CAM.wave,
          caption: [
            [0, 'En cada latido la presión arterial oscila. El máximo, durante la eyección ventricular, es la presión <b>sistólica</b>.'],
            [8, 'El mínimo, al final del llenado ventricular, es la <b>diastólica</b>. Se escribe 120/80 y se lee "120 sobre 80".'],
            [15, 'La diferencia, 40 mmHg, es la <b>presión de pulso</b>. El corazón genera la presión; las arterias elásticas la amortiguan.'],
          ],
          draw({ ink }, t) { waveGraph(ink, t, { draw: ramp(t, 0.3, 6, (u) => u), marks: ramp(t, 6, 0.8), pulse: ramp(t, 15, 0.8) }); },
        },
        {
          kind: 'watch', dur: 12, cam: CAM.wave,
          caption: [
            [0, 'La <b>presión arterial media</b> (PAM) es la que sostiene la perfusión de los tejidos. No es el promedio simple: la diástole dura más.'],
            [9, 'Por eso PAM ≈ PAD + ⅓ (PAS − PAD). Para 120/80: 80 + 40/3 ≈ 93 mmHg. En un adulto estable suele estar entre 70 y 100 mmHg.'],
          ],
          draw({ ink }, t) { waveGraph(ink, t, { marks: 1, pulse: 1, pam: ramp(t, 3, 0.8) }); },
        },
        {
          kind: 'do', cam: CAM.wave,
          ...askNumber({ key: 'pam', label: 'PAM =', unit: 'mmHg', answer: 110, rel: 0.01, wrong: [[120, 'Ese es el promedio simple (150 + 90)/2. La diástole dura más: usa PAD + ⅓ (PAS − PAD).'], [130, 'Sumaste ⅓ de la presión de pulso a la sistólica. Se suma a la diastólica.']] }),
          caption: (S) => S.g.pam?.msg ?? (S.g.pam?.wrong ? 'PAM ≈ PAD + ⅓ (PAS − PAD).' : 'Un adulto mayor con 150/90 mmHg.'),
          prompt: 'Calcula su presión arterial media.',
          success: 'PAM = 90 + 60/3 = 110 mmHg. Su presión de pulso, 60 mmHg, es amplia: típico de arterias rígidas (Lección B.2).',
          draw({ ink, S }) { waveGraph(ink, 0, { sys: 150, dia: 90, marks: 1, pulse: 1, pam: S.g.pam?.ok ? 1 : 0 }); },
        },
        {
          kind: 'watch', dur: 18, cam: CAM.wave,
          caption: [
            [0, 'La presión cae a lo largo del circuito: de unos 100 mmHg en la aorta a casi 0 en la vena cava. Esa diferencia es la que impulsa el flujo.'],
            [9.5, 'La mayor caída ocurre en las <b>arteriolas</b>: son la principal resistencia periférica. Ahí también desaparece la pulsatilidad.'],
            [17, 'La circulación pulmonar trabaja a presiones mucho menores: unos 25/10 mmHg.'],
          ],
          draw({ ink }, t) { circuitGraph(ink, t, { draw: ramp(t, 0.3, 6, (u) => u), mean: ramp(t, 5, 0.8), band: ramp(t, 9.5, 0.8) }); },
        },
        {
          kind: 'do', cam: CAM.wave,
          ...(() => {
            const c = askChoice({
              key: 'drop', choices: [
                { id: 'art', label: 'en las grandes arterias', why: 'Las grandes arterias son anchas y oponen poca resistencia: la presión media apenas baja.' },
                { id: 'arteriolas', label: 'en las arteriolas', correct: true },
                { id: 'cap', label: 'en los capilares', why: 'Cada capilar es diminuto, pero hay millones en paralelo: su resistencia conjunta es menor que la de las arteriolas.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Mira la pendiente de la curva media (azul).' };
          })(),
          prompt: '¿Dónde cae más la presión?',
          success: 'En las arteriolas. Al contraerse o dilatarse, regulan la resistencia periférica y reparten el flujo entre los órganos.',
          draw({ ink, S }) { circuitGraph(ink, 0, { mean: 1, band: S.g.drop === 'arteriolas' ? 1 : 0 }); },
        },
        {
          kind: 'watch', dur: 24, cam: CAM.wave,
          caption: [
            [0, 'Medición con manguito: se infla por encima de la sistólica, y por Pascal su presión comprime la arteria hasta cerrarla.'],
            [8.5, 'Al desinflar, cuando la presión del manguito baja de la sistólica, pasa sangre a chorros: flujo turbulento que se oye. Es el primer ruido de Korotkoff.'],
            [17, 'Los ruidos siguen mientras el manguito está entre la sistólica y la diastólica. Cuando baja de la diastólica, el flujo vuelve a ser laminar y se hace silencio.'],
          ],
          draw({ ink }, t) { korotkoff(ink, t, { reveal: ramp(t, 3, 18, (u) => u), labels: t > 12 }); },
        },
        {
          kind: 'do', cam: CAM.wave,
          ...(() => {
            const c = askChoice({
              key: 'err', choices: [
                { id: 'fast', label: 'desinflar el manguito muy rápido', correct: true },
                { id: 'heart', label: 'tener el brazo a la altura del corazón', why: 'Esa es la posición correcta: Δ$h$ = 0 respecto al corazón.' },
                { id: 'rest', label: 'medir tras 5 minutos de reposo', why: 'Esa es la práctica recomendada, no un error.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Piensa en lo que hace falta para detectar el instante exacto del primer y del último ruido.' };
          })(),
          prompt: '¿Cuál es un error frecuente al medir la presión arterial?',
          success: 'Si se desinfla muy rápido, se pierde el instante en que la presión externa iguala la interna (Pascal). Otros errores: manguito inadecuado y brazo por encima o por debajo del corazón (ρgh).',
          draw({ ink }) { korotkoff(ink, 30, { reveal: 1, labels: true }); },
        },
      ],
    },
    // ================================================================ 7
    practiceChapter({
      num: '7', seed: 70107,
      kinds: ['depth', 'posture', 'pam', 'pascal', 'utube', 'force', 'units'],
      make: makeProblem, draw: drawProblem, cam: practiceCam,
    }),
    // ================================================================ 8
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '8',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica B.1 · Resumen',
          title: 'Presión en los fluidos',
          ideas: [
            'La presión es fuerza por área: <span class="m"><i>P</i> = <i>F</i>/<i>A</i></span>. 1 mmHg = 133,3 Pa; 760 mmHg = 1 atm.',
            'En un líquido en reposo, <span class="m"><i>P</i> = <i>P</i><sub>0</sub> + <i>ρgh</i></span>: depende de la profundidad, no de la forma del recipiente.',
            'Pascal: la presión se transmite a todo el fluido encerrado (<span class="m"><i>F</i><sub>1</sub>/<i>A</i><sub>1</sub> = <i>F</i><sub>2</sub>/<i>A</i><sub>2</sub></span>). Así funciona el manguito.',
            'De pie, la presión es mayor bajo el corazón y menor sobre él (<span class="m">Δ<i>P</i> = <i>ρg</i>Δ<i>h</i></span>): edema maleolar, hipotensión ortostática.',
            'PAS = máximo (eyección); PAD = mínimo (llenado). <span class="m">PAM ≈ PAD + ⅓(PAS − PAD)</span>. La mayor caída de presión está en las arteriolas.',
          ],
          next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#pared">B.2 · La pared del vaso ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};

const HEART_U = 0.72;
