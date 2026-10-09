// Scene drawings (and small models) shared by the lessons of this block.
// Extracted from the first, shorter version of the lessons.

import { ramp, clamp, lerp, easeInOut, snap } from '../core/anim.js';
import {
  UI_ES, n, rect, shape, figure, heart, axes, curve, readout, formula, section, vessel,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';

export const H_BODY = 1.75;


// --------------------------------------------- 1. esfuerzo y deformación

export const E_SANA = 0.5; // MPa
export const E_RIGIDA = 2.0;

export function stripScene(ink, eps, E, o = {}) {
  // A strip of vessel wall clamped on the left and pulled on the right.
  const L0 = 2.2, h = 0.5;
  const L = L0 * (1 + eps);
  const thin = h / Math.sqrt(1 + eps);
  ink.line('clamp', { x: 0, y: -0.4 }, { x: 0, y: h + 0.4 }, 'ink heavy', { layer: 'statics' });
  let d = '';
  for (let i = 0; i < 7; i++) {
    const a = ink.S({ x: 0, y: -0.35 + i * 0.17 });
    d += `M${a.x.toFixed(1)},${a.y.toFixed(1)}l-8,8`;
  }
  ink.path('clamp-h', d, 'hatch', { layer: 'statics' });
  const y0 = h / 2 - thin / 2;
  rect(ink, 'strip', 0, y0, L, y0 + thin, o.rigid ? 'plaque' : 'blood-2');
  ink.poly('strip-o', [{ x: 0, y: y0 }, { x: L, y: y0 }, { x: L, y: y0 + thin }, { x: 0, y: y0 + thin }], 'ink', { layer: 'statics' });
  const sigma = E * eps * 1000; // kPa
  if (eps > 0.005) ink.arrow('Fs', { x: L + 0.05, y: h / 2 }, { x: L + 0.25 + clamp(sigma / 600, 0, 1.6), y: h / 2 }, 'accent heavy', { head: 12, headW: 4 });
  ink.dimension('L0', { x: 0, y: -0.45 }, { x: L0, y: -0.45 }, 0, '$L_0$', { size: 15 });
  if (eps > 0.02) ink.dimension('dL', { x: L0, y: -0.45 }, { x: L, y: -0.45 }, 0, 'Δ$L$', { size: 15 });
  return sigma;
}

export function seGraph(ink, pts, o = {}) {
  const P = axes(ink, 'se', { x: 5.2, y: 0, w: 3.4, h: 3 }, {
    xmax: 0.6, ymax: 1200, xticks: [0, 0.2, 0.4, 0.6], yticks: [0, 400, 800, 1200], xlabel: '$ε$', ylabel: '$σ$ (kPa)', grid: true,
  });
  if (o.lines) {
    curve(ink, 'se-s', P, (e) => E_SANA * e * 1000, 0, 0.6, 'wave-2', { op: o.lines });
    curve(ink, 'se-r', P, (e) => E_RIGIDA * e * 1000, 0, 0.6, 'wave', { op: o.lines });
    ink.text('se-sl', P(0.6, E_SANA * 600), 'pared sana', { op: o.lines, dx: 6, dy: 5, size: 13, anchor: 'start', cls: 'blue-tx' });
    ink.text('se-rl', P(0.55, 1100), 'pared rígida', { op: o.lines, dx: 8, dy: 0, size: 13, anchor: 'start', cls: 'accent-tx' });
  }
  pts.forEach((p, i) => ink.dot(`se-p${i}`, P(p.e, p.s), { r: 3.4, cls: p.rigid ? 'dot-accent' : 'dot-blue', layer: 'vectors' }));
  return P;
}

// --------------------------------------------- 2. compliance, distensibilidad

// Pressure–volume relations of the arterial and venous systems (after Guyton).
export const ART = { V0: 400, C: 2.0 }; // mL at 0 mmHg, mL/mmHg
export const VEN = { V0: 2100, C: 50 };

export function pvGraph(ink, o = {}) {
  const P = axes(ink, 'pv', { x: 4.8, y: 0, w: 3.9, h: 3 }, {
    xmax: 3500, ymax: 140, xticks: [0, 1000, 2000, 3000], yticks: [0, 40, 80, 120], xlabel: '$V$ (mL)', ylabel: '$P$ (mmHg)', grid: true,
  });
  curve(ink, 'pv-a', P, (V) => (V - ART.V0) / ART.C, ART.V0, ART.V0 + 140 * ART.C, 'wave', { op: o.art ?? 1 });
  curve(ink, 'pv-v', P, (V) => (V - VEN.V0) / VEN.C, VEN.V0, 3400, 'wave-2', { op: o.ven ?? 1 });
  ink.text('pv-al', P(ART.V0 + 135 * ART.C, 135), 'sistema arterial', { op: o.art ?? 1, dx: 10, dy: 4, size: 13, anchor: 'start', cls: 'accent-tx halo' });
  ink.text('pv-vl', P(3300, (3300 - VEN.V0) / VEN.C), 'sistema venoso', { op: o.ven ?? 1, dx: 0, dy: -12, size: 13, anchor: 'end', cls: 'blue-tx halo' });
  if (o.point) ink.circle('pv-pt', P(o.point.V, o.point.P), 5, o.point.vein ? 'dot-blue' : 'dot-accent', { layer: 'vectors' });
  if (o.tri) {
    const { V1, V2, P1, P2, cls } = o.tri;
    ink.poly('pv-tri', [P(V1, P1), P(V2, P1), P(V2, P2)], cls ?? 'accent-thin', { layer: 'annotations', op: o.triOp ?? 1 });
    ink.text('pv-dv', P((V1 + V2) / 2, P1), 'Δ$V$', { dy: 18, size: 14, op: o.triOp ?? 1, cls: 'halo' });
    ink.text('pv-dp', P(V2, (P1 + P2) / 2), 'Δ$P$', { dx: 8, dy: 5, size: 14, anchor: 'start', op: o.triOp ?? 1, cls: 'halo' });
  }
  return P;
}

/** A short vessel segment that swells with pressure (vein swells much more). */
export function segment(ink, key, x0, x1, r, o = {}) {
  vessel(ink, key, x0, x1, (x) => {
    const u = (x - x0) / (x1 - x0);
    const bulge = Math.sin(Math.PI * u) ** 0.6;
    return o.r0 + (r - o.r0) * bulge;
  }, { wall: o.wall ?? 0.08, lumen: o.vein ? 'fluid' : 'blood', streamlines: false });
}

// ----------------------------------------------------- 3. Windkessel

export const WK_R = 1.12; // mmHg·s/mL
export const WK = { SV: 70, T: 0.8, Ts: 0.3 };
export const wkCache = new Map();

/** Two-element Windkessel: C dP/dt = Q(t) − P/R. One steady-state period. */
export function windkessel(C, R = WK_R) {
  const key = `${C.toFixed(3)}|${R}`;
  if (wkCache.has(key)) return wkCache.get(key);
  const dt = 0.0005;
  const N = Math.round(WK.T / dt);
  let P = 80;
  const out = new Float64Array(N);
  for (let b = 0; b < 14; b++) {
    for (let i = 0; i < N; i++) {
      const t = i * dt;
      const Q = t < WK.Ts ? ((WK.SV * Math.PI) / (2 * WK.Ts)) * Math.sin((Math.PI * t) / WK.Ts) : 0;
      P += (dt * (Q - P / R)) / C;
      if (b === 13) out[i] = P;
    }
  }
  let max = -Infinity, min = Infinity;
  for (const v of out) { max = Math.max(max, v); min = Math.min(min, v); }
  const res = { at: (t) => out[Math.floor(((((t % WK.T) + WK.T) % WK.T) / WK.T) * N) % N], sys: max, dia: min };
  wkCache.set(key, res);
  return res;
}

export function inflow(t) {
  const u = ((t % WK.T) + WK.T) % WK.T;
  return u < WK.Ts ? ((WK.SV * Math.PI) / (2 * WK.Ts)) * Math.sin((Math.PI * u) / WK.Ts) : 0;
}

export function wkScene(ink, C, t, o = {}) {
  const wk = windkessel(C);
  const P = axes(ink, 'wk', { x: 3.4, y: 0, w: 5.2, h: 2.8 }, { xmax: 2.4, ymax: 160, xticks: [0, 0.8, 1.6, 2.4], yticks: [0, 40, 80, 120, 160], xlabel: '$t$ (s)', ylabel: '$P$ (mmHg)', grid: true });
  curve(ink, 'wk-c', P, (x) => wk.at(x), 0, 2.4, 'wave', { N: 360 });
  if (o.ref) {
    const ref = windkessel(o.ref);
    curve(ink, 'wk-ref', P, (x) => ref.at(x), 0, 2.4, 'ghost', { N: 360 });
  }
  const tt = t % 2.4;
  ink.line('wk-now', P(tt, 0), P(tt, 155), 'accent-thin', { layer: 'grid', op: 0.5 });
  ink.circle('wk-dot', P(tt, wk.at(tt)), 4, 'dot-accent', { layer: 'vectors' });
  // The aorta: radius follows pressure through its compliance.
  const p = wk.at(t);
  const r = 0.45 + (p - 60) * 0.004 * C;
  const rr = (x) => r * (1 - 0.15 * Math.max(0, x - 1.6));
  vessel(ink, 'ao', -0.6, 2.4, rr, { yc: 1.5, wall: 0.06 + 0.06 / C, streamlines: false });
  const q = inflow(t);
  if (q > 1) ink.arrow('ao-in', { x: -0.95, y: 1.5 }, { x: -0.95 + 0.25 + q / 450, y: 1.5 }, 'accent heavy', { head: 11, headW: 3.8 });
  ink.text('ao-l', { x: 0.9, y: 1.5 - r - 0.2 }, 'aorta', { dy: 10, size: 14, cls: 'mid' });
  ink.text('ao-q', { x: -0.6, y: 1.5 + r + 0.25 }, q > 1 ? 'sístole: entra sangre y la pared se estira' : 'diástole: la pared retrocede y sigue empujando', { size: 14, anchor: 'start', cls: q > 1 ? 'accent-tx' : 'blue-tx' });
  return wk;
}

// --------------------------------------------------------- 4. Laplace

export function laplaceScene(ink, r, o = {}) {
  const c = { x: 0, y: 0 };
  const w = (o.w ?? 0.16) * (o.thin ? 0.5 : 1);
  section(ink, 'lp', c, r, w, { pressure: o.pressure ?? 1, tension: o.tension ?? r / 1 });
  ink.text('lp-P', c, '$P$', { size: 20, dy: 7, cls: 'blue-tx halo' });
  ink.dimension('lp-r', c, { x: 0, y: -r }, 0, `$r$ = ${n(o.mm ?? r, 1)} mm`, { size: 14 });
  ink.text('lp-T', { x: 0, y: r + w * 1.6 + 0.05 }, '$T$', { dy: -14, size: 18, cls: 'accent-tx halo' });
}

// ------------------------------------------------------------- 5. VOP

export const CAROTID = { x: 0.07, y: 1.48 };
export const AORTIC = { x: 0.0, y: 1.22 };
export const FEMORAL = { x: 0.09, y: 0.82 };

export function pulsePath(u) {
  // Heart → carotid (up) and heart → femoral (down) at the same speed.
  return {
    up: { x: lerp(AORTIC.x, CAROTID.x, u), y: lerp(AORTIC.y, CAROTID.y, u) },
    down: { x: lerp(AORTIC.x, FEMORAL.x, u), y: lerp(AORTIC.y, FEMORAL.y, u) },
  };
}

export function vopScene(ink, t, o = {}) {
  figure(ink, 'vf', { x: 0, y: 0 }, H_BODY, 0, { heart: false, op: 0.9 });
  // Arteries: aorta down to the femoral, carotid up.
  ink.poly('vf-car', [AORTIC, { x: 0.06, y: 1.35 }, CAROTID], 'accent', { layer: 'vectors' });
  ink.poly('vf-ao', [AORTIC, { x: 0.02, y: 1.0 }, { x: 0.05, y: 0.9 }, FEMORAL], 'accent', { layer: 'vectors' });
  heart(ink, 'vf-h', { x: -0.03, y: 1.26 });
  for (const [k, p, name] of [['c', CAROTID, 'carótida'], ['f', FEMORAL, 'femoral']]) {
    ink.circle(`vf-${k}`, p, 4.5, 'ring-accent', { layer: 'vectors' });
    ink.line(`vf-${k}l`, p, { x: 1.0, y: p.y }, 'hair', { layer: 'annotations' });
    ink.text(`vf-${k}t`, { x: 1.0, y: p.y }, name, { dx: 6, dy: 5, size: 14, anchor: 'start' });
  }
  ink.dimension('vf-d', { x: 1.9, y: CAROTID.y }, { x: 1.9, y: FEMORAL.y }, 0, `$d$ = ${n(o.d ?? 0.6, 2)} m`, { size: 14 });
  if (o.wave) {
    const T = o.T ?? 1.4;
    const u = clamp((t % T) / (T * 0.8));
    // The pulse leaves the heart and reaches carotid and femoral; Δt is the
    // difference between their arrival times (here drawn as one travelling front).
    const pp = pulsePath(u);
    ink.circle('vf-wu', pp.up, 6, 'dot-accent', { layer: 'vectors' });
    ink.circle('vf-wd', pp.down, 6, 'dot-accent', { layer: 'vectors' });
  }
}

// ------------------------------------------------------- 6. relacionar

export const PAIRS = [
  ['Extensibilidad', 'C', 'Capacidad del vaso para estirarse ante una fuerza.'],
  ['Módulo de elasticidad', 'E', 'Relación entre tensión mecánica y deformación.'],
  ['Distensibilidad', 'F', 'Cambio relativo de volumen ante variaciones de presión.'],
  ['Compliance', 'A', 'Cambio de volumen por cada cambio de presión.'],
  ['Velocidad de onda de pulso', 'G', 'Rapidez de propagación de la onda de presión arterial.'],
  ['Índice CAVI', 'D', 'Índice de rigidez desde el corazón hasta el tobillo.'],
  ['Ley de Laplace', 'B', 'Relación entre tensión de pared, presión y radio vascular.'],
];
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const DEF = Object.fromEntries(PAIRS.map(([, L, d]) => [L, d]));

export function matchBoard(ink, S) {
  const yRow = (i) => 6.6 - i * 0.98;
  PAIRS.forEach(([name], i) => {
    const done = S.match.done.includes(i);
    const cur = S.match.i === i;
    ink.text(`mb-c${i}`, { x: 0.3, y: yRow(i) }, `${i + 1}  ${name}`, { anchor: 'start', size: 17, dy: 5, cls: cur ? 'accent-tx' : done ? '' : 'mid' });
    ink.circle(`mb-cd${i}`, { x: 3.95, y: yRow(i) }, 4.5, done ? 'dot' : cur ? 'ring-accent' : 'pin', { layer: 'vectors' });
  });
  LETTERS.forEach((L, j) => {
    const used = S.match.done.some((i) => PAIRS[i][1] === L);
    ink.circle(`mb-dd${j}`, { x: 4.75, y: yRow(j) }, 4.5, used ? 'dot' : 'pin', { layer: 'vectors' });
    ink.text(`mb-d${j}`, { x: 5.0, y: yRow(j) }, `${L}  ${DEF[L]}`, { anchor: 'start', size: 14, dy: 5, cls: used ? 'mid' : '' });
  });
  S.match.done.forEach((i) => {
    const j = LETTERS.indexOf(PAIRS[i][1]);
    ink.line(`mb-l${i}`, { x: 3.95, y: yRow(i) }, { x: 4.75, y: yRow(j) }, 'ink', { layer: 'annotations' });
  });
  if (S.match.wrong) {
    const j = LETTERS.indexOf(S.match.wrong);
    ink.line('mb-wrong', { x: 3.95, y: yRow(S.match.i) }, { x: 4.75, y: yRow(j) }, 'cutline', { layer: 'annotations' });
  }
}

