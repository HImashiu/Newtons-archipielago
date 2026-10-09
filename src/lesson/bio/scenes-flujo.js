// Scene drawings (and small models) shared by the lessons of this block.
// Extracted from the first, shorter version of the lessons.

import { ramp, clamp, lerp, easeInOut, snap } from '../core/anim.js';
import {
  UI_ES, MMHG, n, sci, rect, shape, vessel, cells, axes, curve, readout, formula, surfaceMark,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';

export const RHO_B = 1060;


// ----------------------------------------------------------- tubes

/** Smooth narrowing between x = −1 and x = 1 from radius r1 to r2 and back (if back). */
export function narrowing(r1, r2, back = false) {
  return (x) => {
    const s = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
    if (!back) return lerp(r1, r2, s((x + 1) / 2));
    return lerp(r1, r2, s((x + 1.6) / 1.2)) + (r1 - r2) * s((x - 0.4) / 1.2);
  };
}

/**
 * Tube with flow: cells move at v(x) = Q/(π r²) (continuity); lanes follow
 * the streamlines. speed scales the animation, not the physics.
 */
export function flowTube(ink, key, r, t, o = {}) {
  const x0 = o.x0 ?? -3.8, x1 = o.x1 ?? 3.8;
  vessel(ink, key, x0, x1, r, { streamlines: o.streamlines ?? [-0.75, -0.4, 0, 0.4, 0.75], wall: o.wall ?? 0.09, yc: o.yc ?? 0, lumen: o.lumen });
  const ref = r(x0);
  const v = (x) => (ref / r(x)) ** 2 * (o.v0 ?? 1);
  cells(ink, `${key}-c`, x0, x1, r, v, t, { yc: o.yc ?? 0, lanes: o.lanes ?? [-0.6, -0.2, 0.2, 0.6], per: o.per ?? 6, speed: o.speed ?? 1, profile: o.profile, cls: o.cellCls });
}

// --------------------------------------------- 2. caudal (Q = ΔV/Δt = A·v)

export function caudalScene(ink, v, t, o = {}) {
  const R = 0.7;
  flowTube(ink, 'cq', () => R, t, { v0: v, speed: 1 });
  // A plane across the tube, and the cylinder of fluid that crosses it in Δt.
  const xp = 0.4;
  const L = v * 1.2;
  if (o.cyl !== false) {
    rect(ink, 'cq-cyl', xp - L, -R, xp, R, 'fluid-3', { layer: 'trails', op: o.cylOp ?? 1 });
    ink.dimension('cq-L', { x: xp - L, y: -R - 0.25 }, { x: xp, y: -R - 0.25 }, 0, '$v$·Δ$t$', { size: 14, op: o.cylOp ?? 1 });
  }
  const top = ink.S({ x: xp, y: R + 0.25 }), bot = ink.S({ x: xp, y: -R - 0.1 });
  ink.path('cq-plane', `M${(top.x - 10).toFixed(1)},${top.y.toFixed(1)}L${(top.x + 10).toFixed(1)},${(top.y - 14).toFixed(1)}L${(bot.x + 10).toFixed(1)},${(bot.y - 14).toFixed(1)}L${(bot.x - 10).toFixed(1)},${bot.y.toFixed(1)}Z`, 'accent-thin', { layer: 'annotations' });
  ink.text('cq-A', { x: xp, y: R + 0.25 }, '$A$', { dx: 14, dy: -10, size: 16, cls: 'accent-tx' });
}

// ---------------------------------------------------- 4. Bernoulli

/** Venturi tube with two piezometer columns showing the static pressure. */
export function venturi(ink, ratio, t, o = {}) {
  const r1 = 0.6, r2 = r1 / Math.sqrt(ratio);
  const r = narrowing(r1, r2, true);
  flowTube(ink, 'vt', r, t, { v0: o.v0 ?? 0.8, x0: -3.8, x1: 3.8, speed: 1.2 });
  // Piezometers at x = −2.6 (wide) and x = 0 (throat).
  const v1 = o.v1 ?? 0.3; // m/s
  const v2 = v1 * ratio;
  const P1 = o.P1 ?? 100; // mmHg (gauge), arbitrary reference
  const dP = (0.5 * RHO_B * (v2 * v2 - v1 * v1)) / MMHG;
  const k = o.k ?? 0.02; // world units per mmHg (column height)
  const base = (x) => r(x) + 0.09;
  for (const [i, x, P] of [[1, -2.6, P1], [2, 0, P1 - dP]]) {
    const yb = base(x);
    const h = Math.max(0, (P - (o.Pref ?? 60)) * k);
    const w = 0.13;
    rect(ink, `pz${i}-f`, x - w, yb, x + w, yb + h, 'blood-2', { layer: 'trails' });
    ink.poly(`pz${i}-wl`, [{ x: x - w - 0.04, y: yb }, { x: x - w - 0.04, y: 3.1 }], 'ink', { layer: 'statics' });
    ink.poly(`pz${i}-wr`, [{ x: x + w + 0.04, y: yb }, { x: x + w + 0.04, y: 3.1 }], 'ink', { layer: 'statics' });
    surfaceMark(ink, `pz${i}-s`, x + 0.32, yb + h);
    ink.text(`pz${i}-l`, { x, y: 3.1 }, `$P_${i}$`, { dy: -8, size: 17 });
  }
  if (o.dh !== false && dP * k > 0.06) {
    const y1 = base(-2.6) + (P1 - (o.Pref ?? 60)) * k, y2 = base(0) + (P1 - dP - (o.Pref ?? 60)) * k;
    ink.line('pz-ref', { x: -2.6, y: y1 }, { x: 0.5, y: y1 }, 'drop', { layer: 'annotations' });
    ink.dimension('pz-dh', { x: 0.45, y: y1 }, { x: 0.45, y: y2 }, -18, 'Δ$P$', { size: 14 });
  }
  ink.text('vt-v1', { x: -2.6, y: -r1 }, `$v_1$ = ${n(v1, 2)} m/s`, { dy: 30, size: 15 });
  ink.text('vt-v2', { x: 0, y: -r2 }, `$v_2$ = ${n(v2, 2)} m/s`, { dy: 30, size: 15, cls: 'accent-tx' });
  return { v1, v2, dP };
}

// --------------------------------------------- 5. laminar y turbulento

export function regimeScene(ink, Re, t, o = {}) {
  const R = 0.75;
  const turb = clamp((Re - 2000) / 1500);
  vessel(ink, 'rg', -3.8, 3.8, () => R, { streamlines: false, wall: 0.09 });
  // Laminar: straight lines. Turbulent: lines that wander and curl.
  for (let i = 0; i < 7; i++) {
    const s = -0.78 + (i * 1.56) / 6;
    const pts = [];
    for (let k = 0; k <= 120; k++) {
      const x = -3.7 + (7.4 * k) / 120;
      const ph = 1.7 * i + t * 2.2;
      const wob = turb * R * (0.16 * Math.sin(x * 3.1 + ph) + 0.1 * Math.sin(x * 7.3 - ph * 1.3 + i) + 0.06 * Math.sin(x * 13 + ph * 0.7));
      const y = clamp(s * R + wob, -R * 0.95, R * 0.95);
      pts.push({ x, y });
    }
    ink.poly(`rg-l${i}`, pts, 'stream', { layer: 'grid' });
  }
  if (turb > 0.3) {
    for (let k = 0; k < 4; k++) {
      const cx = -2.6 + k * 1.7 + 0.3 * Math.sin(t + k), cy = 0.35 * Math.sin(1.3 * k + t * 0.8);
      const rr = 0.18 + 0.08 * Math.sin(k + t);
      const pts = [];
      for (let j = 0; j <= 40; j++) {
        const a = (j / 40) * Math.PI * 3.2 + t * 2;
        const rad = rr * (j / 40);
        pts.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) });
      }
      ink.poly(`rg-e${k}`, pts, 'blue', { layer: 'vectors', op: (turb - 0.3) / 0.7 });
    }
  }
  cells(ink, 'rg-c', -3.8, 3.8, () => R, () => 1, t, { per: 5, speed: 0.6 + Re / 3000, profile: (s) => 1.5 * (1 - s * s) + 0.3 });
  const label = Re < 2000 ? 'laminar' : Re < 3500 ? 'transición' : 'turbulento';
  ink.text('rg-lab', { x: 0, y: R + 0.1 }, `$Re$ ≈ ${n(Re, 0)}  ·  ${label}`, { dy: -14, size: 18, cls: Re < 2000 ? 'blue-tx' : 'accent-tx' });
}

// ------------------------------------------------------- 6. viscosidad

/** Relative viscosity of blood vs hematocrit (Hct as fraction). */
export const etaBlood = (hct) => 1.2 * Math.exp(2.5 * hct); // mPa·s

export function profileScene(ink, hct, t, o = {}) {
  const R = 0.85;
  vessel(ink, 'pf', -3.8, 3.2, () => R, { streamlines: false, wall: 0.09 });
  const eta = etaBlood(hct);
  const vmax = 1.6 * (3.7 / eta);
  // Velocity profile arrows (parabolic): layers slide over each other.
  const xs = 2.0;
  ink.line('pf-ax', { x: xs, y: -R }, { x: xs, y: R }, 'thin', { layer: 'annotations' });
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const s = -0.9 + (1.8 * i) / 10;
    const len = vmax * (1 - s * s) * 0.6;
    if (len > 0.04) ink.arrow(`pf-a${i}`, { x: xs, y: s * R }, { x: xs + len, y: s * R }, 'blue', { head: 7, headW: 2.4 });
  }
  for (let i = 0; i <= 30; i++) {
    const s = -1 + (2 * i) / 30;
    pts.push({ x: xs + vmax * (1 - s * s) * 0.6, y: s * R });
  }
  ink.poly('pf-curve', pts, 'blue', { layer: 'vectors' });
  const per = Math.round(3 + hct * 14);
  cells(ink, 'pf-c', -3.8, 1.8, () => R, () => vmax, t, { per, speed: 0.5, lanes: [-0.7, -0.35, 0, 0.35, 0.7], profile: (s) => 1 - s * s + 0.05, size: 3.6 });
  ink.text('pf-l', { x: xs, y: R }, 'perfil parabólico', { dy: -14, size: 14, cls: 'blue-tx' });
}

// ------------------------------------------- 3b. aorta → capilares

export function treeScene(ink, t, o = {}) {
  const P = axes(ink, 'tr', { x: 0, y: 0, w: 8.4, h: 2.6 }, { xmax: 6, ymax: 30, yticks: [0, 10, 20, 30], ylabel: '$v$ (cm/s)', op: o.op });
  const segs = ['Aorta', 'Arterias', 'Arteriolas', 'Capilares', 'Vénulas', 'Venas'];
  const area = [4, 20, 40, 2500, 250, 80]; // cm², total cross-section
  const Q = 83; // mL/s
  segs.forEach((s, i) => ink.text(`tr-s${i}`, P(i + 0.5, 0), s, { dy: 20, size: 13, cls: 'mid', op: o.op }));
  const bars = area.map((A) => Q / A);
  bars.forEach((v, i) => {
    const vv = Math.min(v, 29);
    rect(ink, `tr-b${i}`, P(i + 0.15, 0).x, 0, P(i + 0.85, 0).x, P(0, vv * ramp(t, 0.5 + i * 0.4, 0.8)).y, i === 3 ? 'blood-2' : 'part', { op: o.op });
    ink.text(`tr-v${i}`, P(i + 0.5, vv), v < 0.1 ? `${n(v * 10, 2)} mm/s` : `${n(v, 1)}`, { dy: -8, size: 13, op: ramp(t, 0.9 + i * 0.4, 0.5) * (o.op ?? 1), cls: 'halo' });
  });
  if (o.areas) {
    area.forEach((A, i) => ink.text(`tr-a${i}`, P(i + 0.5, 0), `$A$ ≈ ${n(A)} cm²`, { dy: 38, size: 12, cls: 'mid', op: o.areas }));
  }
}

