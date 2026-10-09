// Biofísica B.2 — La pared del vaso: rigidez vascular (Semana 7, parte 2).
// Guion: docs/biofisica-unidad-2-guion.md, sección B.2.
//
// Esfuerzo y deformación (módulo de elasticidad), compliance y
// distensibilidad, la aorta como amortiguador (modelo de Windkessel),
// ley de Laplace y aneurismas, velocidad de onda de pulso e índice CAVI.

import { ramp, clamp, lerp, easeInOut, snap } from '../core/anim.js';
import {
  UI_ES, n, rect, shape, figure, heart, axes, curve, readout, formula, section, vessel,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';

const H_BODY = 1.75;

const CAM = {
  title: { xmin: -3.2, xmax: 5.6, ymin: -1.4, ymax: 3.4 },
  strip: { xmin: -0.8, xmax: 9.2, ymin: -1.0, ymax: 3.6 },
  pv: { xmin: -1.0, xmax: 9.4, ymin: -1.0, ymax: 3.7 },
  pvP: { xmin: -0.8, xmax: 4.6, ymin: -1.2, ymax: 2.6 },
  wk: { xmin: -1.0, xmax: 9.4, ymin: -1.0, ymax: 3.5 },
  lap: { xmin: -3.0, xmax: 3.4, ymin: -2.3, ymax: 2.6 },
  lapP: { xmin: -2.6, xmax: 2.8, ymin: -2.2, ymax: 2.4 },
  body: { xmin: -2.4, xmax: 3.6, ymin: -0.5, ymax: 2.2 },
  match: { xmin: 0, xmax: 10, ymin: -0.4, ymax: 7.6 },
};

// --------------------------------------------- 1. esfuerzo y deformación

const E_SANA = 0.5; // MPa
const E_RIGIDA = 2.0;

function stripScene(ink, eps, E, o = {}) {
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

function seGraph(ink, pts, o = {}) {
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
const ART = { V0: 400, C: 2.0 }; // mL at 0 mmHg, mL/mmHg
const VEN = { V0: 2100, C: 50 };

function pvGraph(ink, o = {}) {
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
function segment(ink, key, x0, x1, r, o = {}) {
  vessel(ink, key, x0, x1, (x) => {
    const u = (x - x0) / (x1 - x0);
    const bulge = Math.sin(Math.PI * u) ** 0.6;
    return o.r0 + (r - o.r0) * bulge;
  }, { wall: o.wall ?? 0.08, lumen: o.vein ? 'fluid' : 'blood', streamlines: false });
}

// ----------------------------------------------------- 3. Windkessel

const WK_R = 1.12; // mmHg·s/mL
const WK = { SV: 70, T: 0.8, Ts: 0.3 };
const wkCache = new Map();

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

function inflow(t) {
  const u = ((t % WK.T) + WK.T) % WK.T;
  return u < WK.Ts ? ((WK.SV * Math.PI) / (2 * WK.Ts)) * Math.sin((Math.PI * u) / WK.Ts) : 0;
}

function wkScene(ink, C, t, o = {}) {
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

function laplaceScene(ink, r, o = {}) {
  const c = { x: 0, y: 0 };
  const w = (o.w ?? 0.16) * (o.thin ? 0.5 : 1);
  section(ink, 'lp', c, r, w, { pressure: o.pressure ?? 1, tension: o.tension ?? r / 1 });
  ink.text('lp-P', c, '$P$', { size: 20, dy: 7, cls: 'blue-tx halo' });
  ink.dimension('lp-r', c, { x: 0, y: -r }, 0, `$r$ = ${n(o.mm ?? r, 1)} mm`, { size: 14 });
  ink.text('lp-T', { x: 0, y: r + w * 1.6 + 0.05 }, '$T$', { dy: -14, size: 18, cls: 'accent-tx halo' });
}

// ------------------------------------------------------------- 5. VOP

const CAROTID = { x: 0.07, y: 1.48 };
const AORTIC = { x: 0.0, y: 1.22 };
const FEMORAL = { x: 0.09, y: 0.82 };

function pulsePath(u) {
  // Heart → carotid (up) and heart → femoral (down) at the same speed.
  return {
    up: { x: lerp(AORTIC.x, CAROTID.x, u), y: lerp(AORTIC.y, CAROTID.y, u) },
    down: { x: lerp(AORTIC.x, FEMORAL.x, u), y: lerp(AORTIC.y, FEMORAL.y, u) },
  };
}

function vopScene(ink, t, o = {}) {
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

const PAIRS = [
  ['Extensibilidad', 'C', 'Capacidad del vaso para estirarse ante una fuerza.'],
  ['Módulo de elasticidad', 'E', 'Relación entre tensión mecánica y deformación.'],
  ['Distensibilidad', 'F', 'Cambio relativo de volumen ante variaciones de presión.'],
  ['Compliance', 'A', 'Cambio de volumen por cada cambio de presión.'],
  ['Velocidad de onda de pulso', 'G', 'Rapidez de propagación de la onda de presión arterial.'],
  ['Índice CAVI', 'D', 'Índice de rigidez desde el corazón hasta el tobillo.'],
  ['Ley de Laplace', 'B', 'Relación entre tensión de pared, presión y radio vascular.'],
];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const DEF = Object.fromEntries(PAIRS.map(([, L, d]) => [L, d]));

function matchBoard(ink, S) {
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

// ----------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'C': {
      const V0 = pick(rnd, [800, 1000, 1200]);
      const dV = pick(rnd, [30, 40, 50, 60, 70, 80]);
      const dP = pick(rnd, [5, 10, 20, 40]);
      return {
        kind, ask: `Durante la sístole, un segmento de aorta pasa de ${V0} mL a ${V0 + dV} mL mientras la presión sube ${dP} mmHg. ¿Cuál es su compliance?`,
        given: [['$V_0$', `${V0} mL`], ['Δ$V$', `${dV} mL`], ['Δ$P$', `${dP} mmHg`]],
        number: { label: '$C$ =', unit: 'mL/mmHg', answer: dV / dP }, V0, dV, dP,
        hint: 'Compliance = cambio absoluto de volumen por cada mmHg: $C$ = Δ$V$/Δ$P$.',
        solution: [{ text: 'Cambio de volumen:', math: `Δ$V$ = ${V0 + dV} − ${V0} = ${dV} mL` }, { text: 'Compliance:', math: `$C$ = ${dV}/${dP} = ${n(dV / dP)} mL/mmHg` }],
        why: `$C$ = ${n(dV / dP)} mL/mmHg.`,
      };
    }
    case 'D': {
      const V0 = pick(rnd, [200, 300, 500, 1000]);
      const dV = pick(rnd, [10, 20, 30, 50]);
      const dP = pick(rnd, [5, 10, 20]);
      const D = (dV / (V0 * dP)) * 100;
      return {
        kind, ask: `Un vaso de ${V0} mL aumenta ${dV} mL cuando la presión sube ${dP} mmHg. ¿Cuál es su distensibilidad, en % por mmHg?`,
        given: [['$V_0$', `${V0} mL`], ['Δ$V$', `${dV} mL`], ['Δ$P$', `${dP} mmHg`]],
        number: { label: '$D$ =', unit: '% / mmHg', answer: D }, V0, dV, dP,
        hint: 'La distensibilidad es relativa: $D$ = Δ$V$ / ($V_0$·Δ$P$). Multiplica por 100 para expresarla en %.',
        solution: [{ text: 'Distensibilidad:', math: `$D$ = ${dV} / (${V0}·${dP}) = ${n(D / 100, 4)} /mmHg` }, { text: 'En porcentaje:', math: `${n(D, 2)} % por mmHg` }],
        why: `$D$ = ${n(D, 2)} % por mmHg.`,
      };
    }
    case 'laplace': {
      const r1 = pick(rnd, [1, 2, 3]);
      const k = pick(rnd, [1.5, 2, 2.5, 3]);
      const thin = rnd() < 0.4;
      const ans = thin ? k * 2 : k;
      return {
        kind, ask: thin
          ? `Un aneurisma lleva el radio de ${r1} mm a ${n(r1 * k, 1)} mm y la pared se adelgaza a la mitad. A igual presión, ¿cuántas veces aumenta el esfuerzo en la pared?`
          : `Un aneurisma lleva el radio de una arteria de ${r1} mm a ${n(r1 * k, 1)} mm. A igual presión, ¿cuántas veces aumenta la tensión de la pared?`,
        given: [['$r_1$', `${r1} mm`], ['$r_2$', `${n(r1 * k, 1)} mm`], ...(thin ? [['$h_2$', '$h_1$/2']] : [])],
        number: { label: '×', unit: 'veces', answer: ans }, r: r1 * k, thin,
        hint: thin ? 'Esfuerzo $σ$ = $P$ $r$ / $h$: sube con el radio y también al disminuir el grosor.' : 'Laplace: $T$ = $P$·$r$. A igual $P$, $T$ crece en la misma proporción que $r$.',
        solution: thin
          ? [{ text: 'Por el radio:', math: `× ${n(k, 1)}` }, { text: 'Por el grosor (÷ 2):', math: `× 2` }, { text: 'Total:', math: `× ${n(ans, 1)}` }]
          : [{ text: 'Laplace:', math: '$T_2/T_1$ = $r_2/r_1$' }, { text: 'Cociente:', math: `${n(r1 * k, 1)} / ${r1} = ${n(k, 1)}` }],
        why: `Aumenta ${n(ans, 1)} veces.`,
      };
    }
    case 'vop': {
      const d = pick(rnd, [0.5, 0.55, 0.6, 0.65, 0.7]);
      const dt = pick(rnd, [0.05, 0.06, 0.075, 0.08, 0.1, 0.12]);
      return {
        kind, ask: `La onda de pulso recorre ${n(d, 2)} m entre la carótida y la femoral en ${n(dt, 3)} s. ¿Cuál es la velocidad de onda de pulso?`,
        given: [['$d$', `${n(d, 2)} m`], ['Δ$t$', `${n(dt, 3)} s`]],
        number: { label: 'VOP =', unit: 'm/s', answer: d / dt }, d,
        hint: 'VOP = $d$ / Δ$t$.',
        solution: [{ text: 'Velocidad de onda de pulso:', math: `VOP = ${n(d, 2)} / ${n(dt, 3)} = ${n(d / dt, 1)} m/s` }, { text: d / dt > 10 ? 'Valor alto: sugiere arterias rígidas.' : 'Valor dentro de lo esperable en adultos jóvenes.', math: '' }],
        why: `VOP = ${n(d / dt, 1)} m/s${d / dt > 10 ? ': arterias rígidas.' : '.'}`,
      };
    }
    case 'E': {
      const sigma = pick(rnd, [100, 200, 300, 400]);
      const eps = pick(rnd, [0.1, 0.2, 0.25, 0.4, 0.5]);
      return {
        kind, ask: `Una tira de pared arterial soporta un esfuerzo de ${sigma} kPa y se alarga un ${n(eps * 100)} %. ¿Cuál es su módulo de elasticidad?`,
        given: [['$σ$', `${sigma} kPa`], ['$ε$', `${n(eps, 2)}`]],
        number: { label: '$E$ =', unit: 'kPa', answer: sigma / eps }, eps,
        hint: '$E$ = $σ$ / $ε$, con $ε$ como fracción (20 % = 0,20).',
        solution: [{ text: 'Módulo de elasticidad:', math: `$E$ = ${sigma} / ${n(eps, 2)} = ${n(sigma / eps, 0)} kPa` }],
        why: `$E$ = ${n(sigma / eps, 0)} kPa${sigma / eps > 1000 ? ': una pared rígida.' : '.'}`,
      };
    }
    default: {
      const a = pick(rnd, [7, 8, 9, 10, 12]);
      const b = pick(rnd, [5, 6, 6.5]);
      return {
        kind: 'stiff', ask: `Paciente A: VOP = ${a} m/s. Paciente B: VOP = ${b} m/s. ¿Cuál tiene las arterias más rígidas?`,
        given: [['VOP A', `${a} m/s`], ['VOP B', `${n(b)} m/s`]],
        choices: [{ id: 'A', label: 'Paciente A', correct: true }, { id: 'B', label: 'Paciente B' }, { id: 'eq', label: 'No se puede saber' }],
        hint: 'En una pared más rígida la onda viaja más rápido.',
        solution: [{ text: 'Mayor VOP ↔ mayor rigidez arterial:', math: `${a} > ${n(b)} m/s → A` }],
        why: 'A: su onda viaja más rápido.',
      };
    }
  }
}

function drawProblem(ink, p, solved, t) {
  if (p.kind === 'laplace') { laplaceScene(ink, Math.min(p.r, 3.5) / 2 + 0.3, { thin: p.thin, mm: p.r }); return; }
  if (p.kind === 'vop' || p.kind === 'stiff') { vopScene(ink, t, { wave: true, d: p.d ?? 0.6 }); return; }
  if (p.kind === 'E') { stripScene(ink, p.eps, 1); return; }
  segment(ink, 'ps', -0.5, 3.6, 0.55 + (p.dV ?? 30) / 300, { r0: 0.5 });
  ink.text('ps-l', { x: 1.55, y: -1.0 }, `${p.V0} mL → ${p.V0 + p.dV} mL`, { size: 16 });
}

const practiceCam = (S) => ({ laplace: CAM.lapP, vop: CAM.body, stiff: CAM.body, E: CAM.strip })[S.practice?.prob?.kind] ?? CAM.pvP;

// ------------------------------------------------------------- lesson

function aortaStep(k, caption) {
  return {
    kind: 'watch', dur: 4, pause: true, cam: CAM.pvP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Datos' }, { given: [['$V_0$ (diástole)', '1000 mL'], ['$V$ (sístole)', '1070 mL'], ['Δ$P$', '10 mmHg']] },
        { step: 1, text: 'Compliance, cambio absoluto:', math: '$C$ = Δ$V$/Δ$P$ = 70/10 = 7 mL/mmHg', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Distensibilidad, cambio relativo:', math: '$D$ = Δ$V$/($V_0$·Δ$P$) = 70/(1000·10) = 0,007 /mmHg', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Interpretación:', math: 'la aorta gana 0,7 % de volumen por cada mmHg', state: st(3) }] : []),
      ];
    },
    draw({ ink }, t) {
      const u = 0.5 - 0.5 * Math.cos(t * 2.4);
      segment(ink, 'ao', -0.5, 3.6, 0.5 + 0.09 * u, { r0: 0.5 });
      ink.text('ao-v', { x: 1.55, y: -1.0 }, u > 0.5 ? 'sístole · 1070 mL' : 'diástole · 1000 mL', { size: 16, cls: u > 0.5 ? 'accent-tx' : '' });
    },
  };
}

function lapStep(k, caption) {
  return {
    kind: 'watch', dur: 5, pause: true, cam: CAM.lapP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Datos' }, { given: [['$r$ normal', '1,0 mm'], ['$r$ aneurisma', '2,5 mm'], ['$P$', 'constante']] },
        { step: 1, text: 'Ley de Laplace:', math: '$T$ = $P$·$r$', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'A igual presión:', math: '$T_2/T_1$ = $r_2/r_1$ = 2,5/1,0 = 2,5', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Círculo vicioso:', math: '↑ $r$ → ↑ $T$ → la pared cede → ↑ $r$ …', state: st(3) }] : []),
      ];
    },
    draw({ ink }, t) {
      const mm = k === 1 ? 1.0 : k === 2 ? lerp(1.0, 2.5, easeInOut(clamp(t / 2.5))) : 2.5 + 0.1 * Math.sin(t * 3);
      const r = mm * 0.8;
      laplaceScene(ink, r, { tension: r, mm });
      ink.text('lp-lab', { x: 0, y: -r - 0.5 }, r < 1.4 ? 'arteria cerebral normal' : 'aneurisma', { size: 15, cls: 'mid' });
    },
  };
}

export const b2 = {
  id: 'bio-b2', code: 'B.2', title: 'La pared del vaso', lang: 'es', ui: UI_ES,
  cam: CAM.pv, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, eps: 0, rigid: false, sePts: [], seSeen: new Set(), pv: 60, vein: false, pvSeen: new Set(), C: 1.1, cSeen: new Set(), r: 1, rSeen: new Set(), match: { i: 0, done: [], wrong: null } }),
  chapters: [
    {
      id: 'intro', title: 'La pared del vaso', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Unidad 2 · Lección B.2',
          title: 'La pared del vaso',
          sub: 'Elasticidad, compliance y rigidez: por qué una aorta sana amortigua cada latido y por qué un aneurisma tiende a crecer.',
          meta: 'Unos 50 minutos · Semana 7 · Casos 02–04 · Práctica',
        }),
        draw({ ink }, t) {
          const u = 0.5 - 0.5 * Math.cos(t * 2.6);
          segment(ink, 'tv', -2.8, 5.2, 0.62 + 0.07 * u, { r0: 0.6 });
        },
      }],
    },
    // ============================================================ 1
    {
      id: 'elasticidad', title: 'Esfuerzo, deformación y elasticidad', short: 'Elasticidad', num: '1',
      beats: [
        {
          kind: 'watch', dur: 18, cam: CAM.strip,
          caption: [
            [0, 'Tomemos una tira de pared arterial y tiremos de ella. La fuerza por unidad de área es el <b>esfuerzo</b> (tensión): $σ$ = $F/A$.'],
            [8.5, 'El estiramiento relativo es la <b>deformación</b>: $ε$ = Δ$L/L_0$. No tiene unidades.'],
            [14, 'Su cociente es el <b>módulo de elasticidad</b>: $E$ = $σ/ε$. Mide la rigidez del material: módulo alto, pared rígida.'],
          ],
          draw({ ink }, t) {
            const eps = 0.3 * ramp(t, 2, 4);
            stripScene(ink, eps, E_SANA);
            seGraph(ink, [], { lines: ramp(t, 14, 1) });
            formula(ink, 'f-E', '$E$ = $σ$ / $ε$', { op: ramp(t, 14, 0.8), fx: 0.25, fy: 0.3 });
          },
        },
        {
          kind: 'do', cam: CAM.strip,
          caption: (S) => `$ε$ = ${n(S.eps, 2)}   ·   $σ$ = ${n((S.rigid ? E_RIGIDA : E_SANA) * S.eps * 1000, 0)} kPa   ·   ${S.rigid ? 'pared rígida' : 'pared sana'}`,
          prompt: 'Estira la tira con el asa. Luego cambia a pared rígida y estírala otra vez.',
          controls: (S) => [
            { type: 'button', id: 'sana', label: 'Pared sana', primary: !S.rigid },
            { type: 'button', id: 'rigida', label: 'Pared rígida (aterosclerosis)', primary: S.rigid },
          ],
          act(S, id) { S.rigid = id === 'rigida'; S.eps = 0; },
          success: 'Para la misma deformación, la pared rígida necesita cuatro veces más esfuerzo: su recta es más empinada. Aterosclerosis, hipertensión y envejecimiento aumentan $E$.',
          draw({ ink, S }) {
            stripScene(ink, S.eps, S.rigid ? E_RIGIDA : E_SANA, { rigid: S.rigid });
            seGraph(ink, S.sePts, { lines: S.seSeen.has('sana') && S.seSeen.has('rigida') ? 1 : 0 });
          },
          handles: (S) => [{ key: 'end', p: { x: 2.2 * (1 + S.eps), y: 0.25 }, r: 26, cursor: 'ew-resize', drag: (S2, p) => {
            S2.eps = clamp(snap(p.x / 2.2 - 1, 0.02), 0, 0.6);
            const sigma = (S2.rigid ? E_RIGIDA : E_SANA) * S2.eps * 1000;
            if (sigma <= 1200 && !S2.sePts.some((q) => q.rigid === S2.rigid && Math.abs(q.e - S2.eps) < 0.03)) S2.sePts.push({ e: S2.eps, s: sigma, rigid: S2.rigid });
            if (S2.eps >= 0.3) S2.seSeen.add(S2.rigid ? 'rigida' : 'sana');
          } }],
          done: (S) => S.seSeen.has('sana') && S.seSeen.has('rigida'),
          skip(S) { S.seSeen.add('sana'); S.seSeen.add('rigida'); },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'compliance', title: 'Compliance y distensibilidad', short: 'Compliance', num: '2',
      beats: [
        {
          kind: 'watch', dur: 18, cam: CAM.pv,
          caption: [
            [0, 'Un vaso se infla cuando sube la presión de la sangre que contiene. La <b>compliance</b> (capacitancia) mide cuánto volumen gana por cada mmHg: $C$ = Δ$V$/Δ$P$.'],
            [10, 'En la gráfica presión–volumen, la compliance es la inversa de la pendiente. El sistema arterial es empinado; el venoso, casi plano.'],
          ],
          draw({ ink }, t) {
            const u = 0.5 - 0.5 * Math.cos(t * 2.4);
            segment(ink, 'sg', -0.5, 3.6, 0.5 + 0.08 * u, { r0: 0.5 });
            ink.text('sg-l', { x: 1.55, y: -0.85 }, 'arteria', { size: 15, cls: 'mid' });
            pvGraph(ink, { art: ramp(t, 10, 0.8), ven: ramp(t, 12, 0.8), tri: { V1: 500, V2: 640, P1: 50, P2: 120 }, triOp: ramp(t, 4, 0.8) });
          },
        },
        {
          kind: 'do', cam: CAM.pv,
          caption: (S) => {
            const sys = S.vein ? VEN : ART;
            const V = sys.V0 + S.pv * sys.C;
            return `${S.vein ? 'Vena' : 'Arteria'}: $P$ = ${n(S.pv, 0)} mmHg → $V$ = ${n(V, 0)} mL   ·   $C$ ≈ ${n(sys.C)} mL/mmHg`;
          },
          prompt: 'Sube y baja la presión con el asa. Luego cambia a venas.',
          controls: (S) => [
            { type: 'button', id: 'art', label: 'Sistema arterial', primary: !S.vein },
            { type: 'button', id: 'ven', label: 'Sistema venoso', primary: S.vein },
          ],
          act(S, id) { S.vein = id === 'ven'; S.pv = S.vein ? 10 : 60; },
          success: 'Las venas aceptan mucho volumen con poco aumento de presión: son el <b>reservorio</b> de la sangre (unas 24 veces más compliantes que las arterias). Las arterias, más rígidas, transmiten presión.',
          draw({ ink, S }) {
            const sys = S.vein ? VEN : ART;
            const V = sys.V0 + S.pv * sys.C;
            const r = S.vein ? 0.5 + (S.pv / 25) * 0.55 : 0.5 + (S.pv / 140) * 0.18;
            segment(ink, 'sg', -0.5, 3.6, r, { r0: 0.5, vein: S.vein, wall: S.vein ? 0.04 : 0.1 });
            ink.text('sg-l', { x: 1.55, y: -0.85 }, S.vein ? 'vena' : 'arteria', { size: 15, cls: 'mid' });
            pvGraph(ink, { point: { V, P: S.pv, vein: S.vein } });
          },
          handles: (S) => {
            const r = S.vein ? 0.5 + (S.pv / 25) * 0.55 : 0.5 + (S.pv / 140) * 0.18;
            return [{ key: 'p', p: { x: 1.55, y: r + 0.1 }, r: 24, cursor: 'ns-resize', drag: (S2, p) => {
              const max = S2.vein ? 25 : 140;
              const rr = clamp(p.y - 0.1, 0.5, S2.vein ? 1.05 : 0.68);
              S2.pv = clamp(S2.vein ? ((rr - 0.5) / 0.55) * 25 : ((rr - 0.5) / 0.18) * 140, 0, max);
              if (S2.pv > max * 0.7) S2.pvSeen.add(S2.vein ? 'v' : 'a');
            } }];
          },
          done: (S) => S.pvSeen.has('a') && S.pvSeen.has('v'),
          skip(S) { S.pvSeen.add('a'); S.pvSeen.add('v'); },
        },
        {
          kind: 'watch', dur: 16, cam: CAM.pv,
          caption: [
            [0, 'La <b>distensibilidad</b> es la versión relativa: la fracción de su volumen que gana el vaso por cada mmHg. $D$ = Δ$V$ / ($V_0$·Δ$P$).'],
            [9.5, 'Compliance = distensibilidad × volumen. Las venas son unas 8 veces más distensibles y tienen unas 3 veces más volumen: por eso su compliance es unas 24 veces mayor.'],
          ],
          draw({ ink }, t) {
            segment(ink, 'sg', -0.5, 3.6, 0.58, { r0: 0.5 });
            pvGraph(ink, {});
            formula(ink, 'f-D', '$D$ = Δ$V$ / ($V_0$ · Δ$P$)', { op: ramp(t, 1, 0.8), fx: 0.25, fy: 0.3 });
          },
        },
        aortaStep(1, 'Caso 02: en la sístole, una porción de aorta pasa de 1000 a 1070 mL mientras la presión sube 10 mmHg. Primero, la compliance.'),
        aortaStep(2, 'Ahora la distensibilidad: el cambio relativo de volumen por mmHg.'),
        aortaStep(3, 'La aorta guarda 70 mL estirando su pared en cada sístole. Ese volumen lo devuelve en la diástole: es su <b>función amortiguadora</b>.'),
        {
          kind: 'do', cam: CAM.pvP, panel: 'work',
          ...askNumber({ key: 'Cv', label: '$C$ =', unit: 'mL/mmHg', answer: 12, wrong: [[0.04, 'Eso es la distensibilidad (relativa). La compliance es absoluta: Δ$V$/Δ$P$.'], [300, 'Usa el cambio de volumen (60 mL), no el volumen total.']] }),
          caption: (S) => S.g.Cv?.msg ?? (S.g.Cv?.wrong ? 'Compliance: Δ$V$/Δ$P$.' : 'Una vena de 300 mL gana 60 mL cuando su presión sube 5 mmHg.'),
          prompt: '¿Cuál es su compliance?',
          success: '$C$ = 60/5 = 12 mL/mmHg: casi el doble que la aorta del caso 02, con mucho menos volumen.',
          work: (S) => [{ h: 'Datos' }, { given: [['$V_0$', '300 mL'], ['Δ$V$', '60 mL'], ['Δ$P$', '5 mmHg']] }, ...(S.g.Cv?.ok ? [{ result: '$C$ = 12 mL/mmHg', ok: true }] : [])],
          draw({ ink }) { segment(ink, 'sv', -0.5, 3.6, 0.85, { r0: 0.5, vein: true, wall: 0.04 }); },
        },
        {
          kind: 'do', cam: CAM.pvP, panel: 'work',
          ...askNumber({ key: 'Dv', label: '$D$ =', unit: '% / mmHg', answer: 4, wrong: [[0.04, 'Correcto como fracción (0,04 /mmHg); exprésalo en porcentaje: × 100.'], [12, 'Esa es la compliance. Divide además entre $V_0$.']] }),
          caption: (S) => S.g.Dv?.msg ?? (S.g.Dv?.wrong ? '$D$ = Δ$V$ / ($V_0$·Δ$P$), y luego × 100.' : 'Misma vena: 300 mL, +60 mL, +5 mmHg.'),
          prompt: '¿Cuál es su distensibilidad, en % por mmHg?',
          success: '$D$ = 60/(300·5) = 0,04 /mmHg = 4 % por mmHg, frente al 0,7 % de la aorta: la vena es unas 6 veces más distensible.',
          work: (S) => [{ h: 'Datos' }, { given: [['$V_0$', '300 mL'], ['Δ$V$', '60 mL'], ['Δ$P$', '5 mmHg']] }, { step: 1, text: 'Compliance:', math: '$C$ = 12 mL/mmHg', state: 'done' }, ...(S.g.Dv?.ok ? [{ result: '$D$ = 4 % por mmHg', ok: true }] : [])],
          draw({ ink }) { segment(ink, 'sv', -0.5, 3.6, 0.85, { r0: 0.5, vein: true, wall: 0.04 }); },
        },
      ],
    },
    // ============================================================ 3
    {
      id: 'amortiguador', title: 'La aorta como amortiguador', short: 'Amortiguador', num: '3',
      beats: [
        {
          kind: 'watch', dur: 22, cam: CAM.wk,
          caption: [
            [0, 'El corazón expulsa sangre solo durante la sístole. Si las arterias fueran tubos rígidos, el flujo se detendría en cada diástole.'],
            [9, 'Pero la aorta se estira y guarda parte del volumen. En la diástole su pared retrocede y sigue empujando la sangre.'],
            [16.5, 'Así la presión no cae a cero entre latidos y el flujo a los tejidos es casi continuo. Es el efecto <b>Windkessel</b>.'],
          ],
          draw({ ink }, t) { wkScene(ink, 1.1, t); },
        },
        {
          kind: 'do', cam: CAM.wk,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => {
            const wk = windkessel(S.C);
            return `$C$ = ${n(S.C, 2)} mL/mmHg   →   ${n(wk.sys, 0)}/${n(wk.dia, 0)} mmHg   ·   presión de pulso ${n(wk.sys - wk.dia, 0)} mmHg`;
          },
          prompt: 'Arrastra el asa para cambiar la compliance de la aorta. Haz las arterias cada vez más rígidas.',
          success: 'Arterias rígidas: la sistólica sube, la diastólica baja y la presión de pulso se ensancha. Es la hipertensión sistólica del adulto mayor (≈ 150/90), y por eso la presión arterial cambia con la edad.',
          draw({ ink, S }) {
            wkScene(ink, S.C, S.tt ?? 0, { ref: Math.abs(S.C - 1.1) > 0.05 ? 1.1 : null });
            // Compliance scale under the aorta.
            ink.line('cs', { x: -0.5, y: 0.2 }, { x: 2.4, y: 0.2 }, 'ink', { layer: 'annotations' });
            ink.text('cs-a', { x: -0.5, y: 0.2 }, 'rígida', { dy: 22, size: 13, cls: 'mid' });
            ink.text('cs-b', { x: 2.4, y: 0.2 }, 'elástica', { dy: 22, size: 13, cls: 'mid' });
          },
          handles: (S) => [{ key: 'C', p: { x: -0.5 + ((S.C - 0.4) / 1.2) * 2.9, y: 0.2 }, r: 22, cursor: 'ew-resize', drag: (S2, p) => {
            S2.C = clamp(snap(0.4 + ((p.x + 0.5) / 2.9) * 1.2, 0.05), 0.4, 1.6);
            if (S2.C <= 0.55) S2.cSeen.add('low');
          } }],
          done: (S) => S.cSeen.has('low'),
          skip(S) { S.cSeen.add('low'); S.C = 0.5; },
        },
        {
          kind: 'do', cam: CAM.wk,
          ...(() => {
            const c = askChoice({
              key: 'pp', choices: [
                { id: 'a', label: 'pérdida de elasticidad arterial', correct: true },
                { id: 'b', label: 'mayor compliance de la aorta', why: 'Con más compliance la aorta amortiguaría más: la presión de pulso sería menor.' },
                { id: 'c', label: 'sangre menos densa', why: 'La densidad casi no cambia; lo que cambia es la pared.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Un paciente de 70 años tiene 160/80 mmHg: presión de pulso de 80 mmHg.' };
          })(),
          prompt: '¿Qué indica una presión de pulso tan amplia?',
          success: 'La energía que la pared debería guardar en la sístole no se conserva para la diástole: menor compliance (Ley de Hooke aplicada al vaso). También aparece en la insuficiencia aórtica, por regurgitación.',
          draw({ ink, S }) { wkScene(ink, 0.45, S.tt ?? 0); },
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'laplace', title: 'Ley de Laplace', short: 'Laplace', num: '4',
      beats: [
        {
          kind: 'watch', dur: 20, cam: CAM.lap,
          caption: [
            [0, 'Corte transversal de un vaso. La presión de la sangre empuja la pared hacia afuera en todas las direcciones.'],
            [7, 'La pared resiste con una <b>tensión</b> $T$ a lo largo de ella, como la piel de un globo.'],
            [12.5, '<b>Ley de Laplace</b>: $T$ = $P$·$r$. A igual presión, un vaso más ancho soporta más tensión. Con grosor de pared $h$, el esfuerzo es $σ$ = $P$ $r$ / $h$.'],
          ],
          draw({ ink }, t) {
            laplaceScene(ink, 1.1, { pressure: ramp(t, 1.5, 1), tension: ramp(t, 7, 1) * 1.1 });
            formula(ink, 'f-L', '$T$ = $P$ · $r$', { op: ramp(t, 12.5, 0.8), fx: 0.8, fy: 0.18 });
          },
        },
        {
          kind: 'do', cam: CAM.lap,
          caption: (S) => `$r$ = ${n(S.r, 1)} mm   →   $T$ = ${n(S.r, 1)} × $T_{normal}$`,
          prompt: 'Arrastra la pared hacia afuera, como en un aneurisma que crece.',
          success: 'La tensión crece en proporción al radio. Y a más tensión, la pared cede más y el radio aumenta: un círculo vicioso que lleva a la ruptura.',
          draw({ ink, S }) {
            laplaceScene(ink, S.r * 0.8, { tension: S.r * 0.8, mm: S.r });
            readout(ink, [`$r$ = ${n(S.r, 1)} mm`, `$T$ / $T_{normal}$ = ${n(S.r, 1)}`]);
          },
          handles: (S) => [{ key: 'r', p: { x: S.r * 0.8 * Math.cos(-0.6) + 0.1, y: S.r * 0.8 * Math.sin(-0.6) }, r: 24, drag: (S2, p) => {
            S2.r = clamp(snap(Math.hypot(p.x, p.y) / 0.8, 0.1), 0.6, 2.6);
            if (S2.r >= 2.4) S2.rSeen.add('big');
          } }],
          done: (S) => S.rSeen.has('big'),
          skip(S) { S.r = 2.5; S.rSeen.add('big'); },
        },
        lapStep(1, 'Caso 03: una arteria cerebral normal tiene 1,0 mm de radio. Se forma un aneurisma de 2,5 mm. La presión arterial se mantiene igual.'),
        lapStep(2, 'Con Laplace, a igual presión la tensión crece en la misma proporción que el radio.'),
        lapStep(3, 'La tensión se multiplica por 2,5. Eso favorece que siga creciendo y que se rompa: hemorragia cerebral.'),
        {
          kind: 'do', cam: CAM.lapP, panel: 'work',
          ...askNumber({ key: 'thin', label: '×', unit: 'veces', answer: 5, wrong: [[2.5, 'Eso es solo por el radio. El adelgazamiento de la pared aumenta el esfuerzo otra vez: $σ$ = $P$ $r$ / $h$.'], [1.25, 'Si $h$ se reduce a la mitad, $σ$ se duplica (no se reduce).']] }),
          caption: (S) => S.g.thin?.msg ?? (S.g.thin?.wrong ? 'Esfuerzo: $σ$ = $P$ $r$ / $h$.' : 'Además, al dilatarse, la pared del aneurisma se adelgaza a la mitad.'),
          prompt: 'Respecto a la arteria normal, ¿cuántas veces aumenta el esfuerzo en la pared?',
          success: '× 2,5 por el radio y × 2 por el grosor: el esfuerzo se multiplica por 5. Por eso el control de la presión es clave en estos pacientes.',
          work: (S) => [{ h: 'Datos' }, { given: [['$r$', '1,0 → 2,5 mm'], ['$h$', '$h$ → $h$/2'], ['$P$', 'constante']] }, { step: 1, text: 'Esfuerzo en la pared:', math: '$σ$ = $P$ $r$ / $h$', state: 'now' }, ...(S.g.thin?.ok ? [{ result: '× 5', ok: true }] : [])],
          draw({ ink }) { laplaceScene(ink, 2.0, { thin: true, tension: 2.0, mm: 2.5 }); },
        },
      ],
    },
    // ============================================================ 5
    {
      id: 'vop', title: 'Velocidad de onda de pulso', short: 'VOP', num: '5',
      beats: [
        {
          kind: 'watch', dur: 18, cam: CAM.body,
          caption: [
            [0, 'Cada latido lanza una onda de presión que viaja por la pared arterial, mucho más rápido que la propia sangre.'],
            [7.5, 'Se mide su llegada a la carótida y a la femoral. La <b>velocidad de onda de pulso</b> es VOP = $d$/Δ$t$.'],
            [13.5, 'Cuanto más rígida la pared, más rápida la onda ($c$ ∝ √($E$ $h$ / $ρ$ $r$)). La VOP es un marcador directo de rigidez arterial.'],
          ],
          draw({ ink }, t) { vopScene(ink, t, { wave: true }); },
        },
        {
          kind: 'do', cam: CAM.body,
          ...askNumber({ key: 'vA', label: 'VOP =', unit: 'm/s', answer: 8, wrong: [[0.125, 'Invertiste el cociente: distancia entre tiempo.'], [0.045, 'Multiplicaste. Divide la distancia entre el tiempo.']] }),
          caption: (S) => S.g.vA?.msg ?? (S.g.vA?.wrong ? 'VOP = $d$ / Δ$t$.' : 'Caso 04, paciente A: carótida–femoral, $d$ = 0,60 m; la onda tarda 0,075 s.'),
          prompt: 'Calcula la VOP del paciente A.',
          success: 'VOP = 0,60/0,075 = 8 m/s.',
          draw({ ink }, t) { vopScene(ink, t, { wave: true, T: 0.9 }); },
          tick(S, dt) {},
        },
        {
          kind: 'do', cam: CAM.body,
          ...askNumber({ key: 'vB', label: 'VOP =', unit: 'm/s', answer: 6, wrong: [[8, 'Ese es el paciente A. B tarda 0,10 s.']] }),
          caption: (S) => S.g.vB?.msg ?? (S.g.vB?.wrong ? 'VOP = $d$ / Δ$t$.' : 'Paciente B: la misma distancia en 0,10 s.'),
          prompt: 'Calcula la VOP del paciente B.',
          success: 'VOP = 0,60/0,10 = 6 m/s.',
          draw({ ink }, t) { vopScene(ink, t, { wave: true, T: 1.2 }); },
        },
        {
          kind: 'do', cam: CAM.body,
          ...(() => {
            const c = askChoice({
              key: 'stiff', choices: [
                { id: 'A', label: 'el paciente A (8 m/s)', correct: true },
                { id: 'B', label: 'el paciente B (6 m/s)', why: 'Una onda más lenta indica una pared más distensible, no más rígida.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Pista clínica: mayor rigidez arterial → mayor velocidad de onda de pulso.' };
          })(),
          prompt: '¿Cuál paciente presenta mayor rigidez arterial?',
          success: 'El paciente A. Un índice relacionado es el <b>CAVI</b> (del corazón al tobillo), que corrige el efecto de la presión: valores ≥ 9 sugieren arteriosclerosis.',
          draw({ ink }, t) { vopScene(ink, t, { wave: true, T: 0.9 }); },
        },
      ],
    },
    // ============================================================ 6
    {
      id: 'relacionar', title: 'Relaciona conceptos', short: 'Relacionar', num: '6',
      beats: [{
        kind: 'do', cam: CAM.match,
        caption: (S) => (S.match.wrong ? `No: ${S.match.wrong} es «${DEF[S.match.wrong]}» Inténtalo otra vez.` : 'Actividad de la clase: une cada propiedad del vaso con su definición.'),
        prompt: (S) => (S.match.i < PAIRS.length ? `¿Qué definición corresponde a <b>${PAIRS[S.match.i][0]}</b>?` : ''),
        controls: (S) => (S.match.i >= PAIRS.length ? [] : LETTERS.filter((L) => !S.match.done.some((i) => PAIRS[i][1] === L)).map((L) => ({ type: 'choice', id: L, label: L, state: S.match.wrong === L ? 'wrong' : null }))),
        act(S, id) {
          const m = S.match;
          if (id === PAIRS[m.i][1]) { m.done.push(m.i); m.i++; m.wrong = null; } else m.wrong = id;
        },
        success: 'Todas unidas. Pista clínica: mayor rigidez → menor compliance y distensibilidad → mayor VOP.',
        draw({ ink, S }) { matchBoard(ink, S); },
        done: (S) => S.match.i >= PAIRS.length,
        skip(S) { S.match = { i: PAIRS.length, done: PAIRS.map((_, i) => i), wrong: null }; },
      }],
    },
    // ============================================================ 7
    practiceChapter({ num: '7', seed: 70207, kinds: ['C', 'D', 'laplace', 'vop', 'E', 'stiff'], make: makeProblem, draw: drawProblem, cam: practiceCam }),
    // ============================================================ 8
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '8',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica B.2 · Resumen',
          title: 'La pared del vaso',
          ideas: [
            'Módulo de elasticidad: <span class="m"><i>E</i> = <i>σ</i>/<i>ε</i></span>. Aterosclerosis, hipertensión y edad lo aumentan: pared rígida.',
            'Compliance <span class="m"><i>C</i> = Δ<i>V</i>/Δ<i>P</i></span> (absoluta); distensibilidad <span class="m"><i>D</i> = Δ<i>V</i>/(<i>V</i><sub>0</sub>Δ<i>P</i>)</span> (relativa). Las venas son el reservorio: ≈ 24 veces más compliantes.',
            'La aorta amortigua cada latido (Windkessel). Si se pone rígida, sube la sistólica, baja la diastólica y se ensancha la presión de pulso.',
            'Laplace: <span class="m"><i>T</i> = <i>P r</i></span> y <span class="m"><i>σ</i> = <i>P r</i>/<i>h</i></span>. Un aneurisma soporta más tensión cuanto más crece: círculo vicioso.',
            '<span class="m">VOP = <i>d</i>/Δ<i>t</i></span>: más rigidez, onda más rápida. El índice CAVI la corrige por la presión.',
          ],
          next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#flujo">B.3 · Flujo, continuidad y Bernoulli ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};
