// Biofísica B.3 — Flujo: caudal, continuidad, Bernoulli, régimen y
// viscosidad (Semanas 8–9). Guion: docs/biofisica-unidad-2-guion.md, B.3.

import { ramp, clamp, lerp, easeInOut, snap } from '../core/anim.js';
import {
  UI_ES, MMHG, n, sci, rect, shape, vessel, cells, axes, curve, readout, formula, surfaceMark,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';

const RHO_B = 1060;

const CAM = {
  title: { xmin: -4.2, xmax: 4.2, ymin: -2.0, ymax: 2.6 },
  tube: { xmin: -4.4, xmax: 4.4, ymin: -1.9, ymax: 2.4 },
  tubeP: { xmin: -4.2, xmax: 4.2, ymin: -2.2, ymax: 2.6 },
  ventu: { xmin: -4.4, xmax: 4.4, ymin: -1.5, ymax: 3.6 },
  ventuP: { xmin: -4.4, xmax: 4.4, ymin: -1.6, ymax: 3.8 },
  tree: { xmin: -0.6, xmax: 9.4, ymin: -1.2, ymax: 3.6 },
  prof: { xmin: -4.4, xmax: 6.4, ymin: -1.9, ymax: 2.4 },
};

// ----------------------------------------------------------- tubes

/** Smooth narrowing between x = −1 and x = 1 from radius r1 to r2 and back (if back). */
function narrowing(r1, r2, back = false) {
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
function flowTube(ink, key, r, t, o = {}) {
  const x0 = o.x0 ?? -3.8, x1 = o.x1 ?? 3.8;
  vessel(ink, key, x0, x1, r, { streamlines: o.streamlines ?? [-0.75, -0.4, 0, 0.4, 0.75], wall: o.wall ?? 0.09, yc: o.yc ?? 0, lumen: o.lumen });
  const ref = r(x0);
  const v = (x) => (ref / r(x)) ** 2 * (o.v0 ?? 1);
  cells(ink, `${key}-c`, x0, x1, r, v, t, { yc: o.yc ?? 0, lanes: o.lanes ?? [-0.6, -0.2, 0.2, 0.6], per: o.per ?? 6, speed: o.speed ?? 1, profile: o.profile, cls: o.cellCls });
}

// --------------------------------------------- 2. caudal (Q = ΔV/Δt = A·v)

function caudalScene(ink, v, t, o = {}) {
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
function venturi(ink, ratio, t, o = {}) {
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

function regimeScene(ink, Re, t, o = {}) {
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

function profileScene(ink, hct, t, o = {}) {
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

function treeScene(ink, t, o = {}) {
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

// ---------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'Q': {
      const d = pick(rnd, [1, 1.5, 2, 2.5]);
      const v = pick(rnd, [10, 15, 20, 30]);
      const A = Math.PI * (d / 2) ** 2;
      return {
        kind, ask: `La sangre fluye a ${v} cm/s por un vaso de ${n(d)} cm de diámetro. ¿Cuál es el caudal?`,
        given: [['$d$', `${n(d)} cm`], ['$v$', `${v} cm/s`]],
        number: { label: '$Q$ =', unit: 'mL/s', answer: A * v }, r: d / 2,
        hint: '$Q$ = $A$·$v$, con $A$ = $π$ $r$² (1 cm³ = 1 mL). Cuidado: el radio es la mitad del diámetro.',
        solution: [{ text: 'Área:', math: `$A$ = $π$·${n(d / 2, 2)}² = ${n(A, 2)} cm²` }, { text: 'Caudal:', math: `$Q$ = ${n(A, 2)}·${v} = ${n(A * v, 1)} mL/s` }],
        why: `$Q$ = ${n(A * v, 1)} mL/s.`,
      };
    }
    case 'cont': {
      const v1 = pick(rnd, [10, 20, 30]);
      const k = pick(rnd, [2, 3, 4]);
      const byD = rnd() < 0.5;
      const ans = byD ? v1 * k * k : v1 * k;
      return {
        kind, ask: byD ? `En una estenosis el diámetro se reduce a 1/${k}. Si antes la sangre iba a ${v1} cm/s, ¿a qué velocidad pasa por la estenosis?` : `Un vaso se estrecha hasta un área ${k} veces menor. Si antes la sangre iba a ${v1} cm/s, ¿a qué velocidad pasa por el estrechamiento?`,
        given: [['$v_1$', `${v1} cm/s`], [byD ? '$d_2$' : '$A_2$', byD ? `$d_1$/${k}` : `$A_1$/${k}`]],
        number: { label: '$v_2$ =', unit: 'cm/s', answer: ans }, k, byD,
        hint: byD ? 'Continuidad: $A_1$ $v_1$ = $A_2$ $v_2$. Si el diámetro se divide entre $k$, el área se divide entre $k$².' : 'Continuidad: $A_1$ $v_1$ = $A_2$ $v_2$.',
        solution: [{ text: 'Continuidad:', math: '$v_2$ = $v_1$·$A_1/A_2$' }, { text: 'Cociente de áreas:', math: `$A_1/A_2$ = ${byD ? `${k}² = ${k * k}` : k}` }, { text: 'Velocidad:', math: `$v_2$ = ${v1}·${byD ? k * k : k} = ${ans} cm/s` }],
        why: `$v_2$ = ${ans} cm/s.`,
      };
    }
    case 'bern': {
      const v1 = pick(rnd, [0.2, 0.3, 0.4, 0.5]);
      const k = pick(rnd, [2, 3, 4]);
      const v2 = v1 * k;
      const dPa = 0.5 * RHO_B * (v2 * v2 - v1 * v1);
      return {
        kind, ask: `La sangre ($ρ$ = 1060 kg/m³) pasa de ${n(v1, 1)} m/s a ${n(v2, 1)} m/s en una estenosis horizontal. ¿Cuánto cae la presión, en Pa?`,
        given: [['$v_1$', `${n(v1, 1)} m/s`], ['$v_2$', `${n(v2, 1)} m/s`], ['$ρ$', '1060 kg/m³']],
        number: { label: 'Δ$P$ =', unit: 'Pa', answer: dPa, rel: 0.02 }, k,
        hint: 'Bernoulli horizontal: $P_1$ − $P_2$ = ½ $ρ$ ($v_2$² − $v_1$²).',
        solution: [{ text: 'Bernoulli (misma altura):', math: 'Δ$P$ = ½ $ρ$ ($v_2$² − $v_1$²)' }, { text: 'Sustituyendo:', math: `½·1060·(${n(v2 * v2, 2)} − ${n(v1 * v1, 2)}) = ${n(dPa, 0)} Pa` }, { text: 'En mmHg:', math: `${n(dPa / MMHG, 1)} mmHg` }],
        why: `Δ$P$ ≈ ${n(dPa, 0)} Pa (${n(dPa / MMHG, 1)} mmHg).`,
      };
    }
    case 're': {
      const v = pick(rnd, [0.1, 0.2, 0.3, 0.5, 1.0]);
      const D = pick(rnd, [0.5, 1, 2, 2.5]);
      const Re = (RHO_B * v * D / 100) / 0.004;
      return {
        kind, ask: `Calcula el número de Reynolds de la sangre ($ρ$ = 1060 kg/m³, $η$ = 0,004 Pa·s) que fluye a ${n(v, 1)} m/s por un vaso de ${n(D)} cm de diámetro.`,
        given: [['$v$', `${n(v, 1)} m/s`], ['$D$', `${n(D)} cm = ${n(D / 100, 3)} m`], ['$η$', '0,004 Pa·s']],
        number: { label: '$Re$ =', unit: '', answer: Re }, Re,
        hint: '$Re$ = $ρ$ $v$ $D$ / $η$, todo en unidades SI (el diámetro en metros).',
        solution: [{ text: 'Reynolds:', math: `$Re$ = 1060·${n(v, 1)}·${n(D / 100, 3)} / 0,004 = ${n(Re, 0)}` }, { text: Re < 2000 ? 'Menor que 2000: laminar.' : Re < 3500 ? 'Entre 2000 y 3500: transición.' : 'Mayor que 3500: turbulento.', math: '' }],
        why: `$Re$ ≈ ${n(Re, 0)}: ${Re < 2000 ? 'laminar' : Re < 3500 ? 'transición' : 'turbulento'}.`,
      };
    }
    case 'regime': {
      const Re = pick(rnd, [300, 1200, 1800, 4500, 6000, 9000]);
      return {
        kind, ask: `En un vaso se estima $Re$ ≈ ${n(Re, 0)}. ¿Qué régimen esperas?`,
        given: [['$Re$', n(Re, 0)]], Re,
        choices: [{ id: 'lam', label: 'laminar', correct: Re < 2000 }, { id: 'turb', label: 'turbulento (posible soplo)', correct: Re >= 2000 }],
        hint: 'Por debajo de unos 2000 el flujo es laminar; por encima aparecen remolinos.',
        solution: [{ text: Re < 2000 ? '$Re$ < 2000 → laminar, silencioso.' : '$Re$ > 2000 → turbulento: vibra la pared y se oye un soplo.', math: '' }],
        why: Re < 2000 ? 'Laminar.' : 'Turbulento: se puede auscultar un soplo.',
      };
    }
    default: {
      const L = pick(rnd, [4, 5, 6, 7]);
      return {
        kind: 'gc', ask: `Un gasto cardíaco de ${L} L/min, ¿cuántos mL/s son?`,
        given: [['$Q$', `${L} L/min`]],
        number: { label: '$Q$ =', unit: 'mL/s', answer: (L * 1000) / 60 },
        hint: '1 L = 1000 mL y 1 min = 60 s.',
        solution: [{ text: 'Conversión:', math: `${L}·1000 / 60 = ${n((L * 1000) / 60, 1)} mL/s` }],
        why: `${L} L/min = ${n((L * 1000) / 60, 1)} mL/s.`,
      };
    }
  }
}

function drawProblem(ink, p, solved, t) {
  if (p.kind === 'bern') { venturi(ink, p.k, t, { v1: 0.3, dh: true }); return; }
  if (p.kind === 're' || p.kind === 'regime') { regimeScene(ink, solved || p.kind === 'regime' ? p.Re : 1000, t); return; }
  if (p.kind === 'cont') { flowTube(ink, 'pc', narrowing(0.7, 0.7 / (p.byD ? p.k : Math.sqrt(p.k))), t, { v0: 0.5 }); return; }
  flowTube(ink, 'pq', () => 0.7, t, { v0: 0.8 });
}

const practiceCam = (S) => ({ bern: CAM.ventuP })[S.practice?.prob?.kind] ?? CAM.tubeP;

// ------------------------------------------------------------ lesson

function bernStep(k, caption) {
  return {
    kind: 'watch', dur: 4, pause: true, cam: CAM.ventuP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Datos' }, { given: [['$v_1$', '0,30 m/s'], ['$A_1/A_2$', '3'], ['$ρ$', '1060 kg/m³']] },
        { step: 1, text: 'Continuidad:', math: '$v_2$ = $v_1$·$A_1/A_2$ = 0,30·3 = 0,90 m/s', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Bernoulli, misma altura:', math: '$P_1$ − $P_2$ = ½ $ρ$ ($v_2$² − $v_1$²)', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Resultado:', math: '½·1060·(0,81 − 0,09) = 382 Pa ≈ 2,9 mmHg', state: st(3) }] : []),
      ];
    },
    draw({ ink }, t) { venturi(ink, 3, t, { v1: 0.3, k: 0.12, Pref: 92 }); },
  };
}

export const b3 = {
  id: 'bio-b3', code: 'B.3', title: 'Flujo: continuidad y Bernoulli', lang: 'es', ui: UI_ES,
  cam: CAM.tube, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, v: 0.6, vSeen: new Set(), ratio: 1.5, rSeen: new Set(), vratio: 1.5, bSeen: new Set(), Re: 800, reSeen: new Set(), hct: 0.45, hSeen: new Set() }),
  chapters: [
    {
      id: 'intro', title: 'Flujo: continuidad y Bernoulli', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Unidad 2 · Lección B.3',
          title: 'Flujo, continuidad y Bernoulli',
          sub: 'Cuánta sangre pasa, a qué velocidad y con qué presión: de la aorta a los capilares, y qué cambia en una estenosis.',
          meta: 'Unos 55 minutos · Semanas 8–9 · Ejemplos resueltos · Práctica',
        }),
        draw({ ink }, t) { flowTube(ink, 'tt', narrowing(0.7, 0.4, true), t, { v0: 0.6, x0: -4, x1: 4 }); },
      }],
    },
    // ============================================================ 1
    {
      id: 'ideal', title: 'Fluido ideal y líneas de flujo', short: 'Fluido ideal', num: '1',
      beats: [
        {
          kind: 'watch', dur: 22, cam: CAM.tube,
          caption: [
            [0, 'La <b>hidrodinámica</b> estudia los fluidos en movimiento. Empezamos con un modelo: el <b>fluido ideal</b>.'],
            [6.5, 'Ideal significa: flujo estacionario (laminar), incompresible ($ρ$ constante), irrotacional (sin remolinos) y no viscoso.'],
            [14, 'Cada partícula sigue una <b>línea de flujo</b>; su velocidad es tangente a ella. Un haz de líneas forma un <b>tubo de flujo</b>, como un vaso.'],
          ],
          draw({ ink }, t) { flowTube(ink, 'id', narrowing(0.75, 0.75), t, { v0: 0.6 }); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...(() => {
            const c = askChoice({
              key: 'cross', choices: [
                { id: 'no', label: 'No, nunca', correct: true },
                { id: 'si', label: 'Sí, donde el tubo se estrecha', why: 'Si dos líneas se cruzaran, en ese punto el fluido tendría dos velocidades a la vez. En un estrechamiento se juntan, pero no se cruzan.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Piensa en lo que significaría un cruce: la velocidad es tangente a la línea en cada punto.' };
          })(),
          prompt: 'En un flujo estacionario, ¿pueden cruzarse dos líneas de flujo?',
          success: 'No: en cada punto el fluido tiene una sola velocidad. Por eso las líneas se aprietan donde el tubo se estrecha, sin cruzarse.',
          draw({ ink }, t) { flowTube(ink, 'id', narrowing(0.75, 0.4, true), t, { v0: 0.6 }); },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'caudal', title: 'Caudal', short: 'Caudal', num: '2',
      beats: [
        {
          kind: 'watch', dur: 20, cam: CAM.tube,
          caption: [
            [0, 'El <b>caudal</b> es el volumen que atraviesa una sección por unidad de tiempo: $Q$ = Δ$V$/Δ$t$. En mL/s o L/min.'],
            [9, 'En un tiempo Δ$t$, cruza la sección $A$ un cilindro de fluido de largo $v$·Δ$t$. Su volumen es $A$·$v$·Δ$t$.'],
            [16, 'Así que $Q$ = $A$·$v$. Clave clínica: el <b>gasto cardíaco</b> es el caudal del corazón, unos 5 L/min en reposo.'],
          ],
          draw({ ink }, t) {
            caudalScene(ink, 0.8, t, { cylOp: ramp(t, 9, 0.8) });
            formula(ink, 'f-Q', '$Q$ = Δ$V$ / Δ$t$ = $A$ · $v$', { op: ramp(t, 16, 0.8), fy: 0.1 });
          },
        },
        {
          kind: 'do', cam: CAM.tube,
          caption: (S) => `$v$ = ${n(S.v * 25, 0)} cm/s, $A$ = 3,1 cm²  →  $Q$ = ${n(S.v * 25 * 3.14, 0)} mL/s`,
          prompt: 'Arrastra el extremo del cilindro: cambia la velocidad del flujo.',
          success: 'A igual área, el caudal es proporcional a la velocidad: el doble de rápido, el doble de volumen por segundo.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { caudalScene(ink, S.v, S.tt ?? 0); },
          handles: (S) => [{ key: 'v', p: { x: 0.4 - S.v * 1.2, y: 0 }, r: 24, cursor: 'ew-resize', drag: (S2, p) => {
            S2.v = clamp(snap((0.4 - p.x) / 1.2, 0.05), 0.2, 2.6);
            S2.vSeen.add(S2.v < 0.5 ? 'lo' : S2.v > 1.8 ? 'hi' : 'mid');
          } }],
          done: (S) => S.vSeen.has('lo') && S.vSeen.has('hi'),
          skip(S) { S.vSeen.add('lo'); S.vSeen.add('hi'); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...askNumber({ key: 'gc', label: '$Q$ =', unit: 'mL/s', answer: 83.3, rel: 0.01, wrong: [[300000, 'Multiplicaste por 60. Un minuto tiene 60 s: divide.', 0.05], [5000, 'Eso son mL por minuto. Divide entre 60 para mL por segundo.']] }),
          caption: (S) => S.g.gc?.msg ?? (S.g.gc?.wrong ? '1 L = 1000 mL; 1 min = 60 s.' : 'Un gasto cardíaco típico en reposo es 5 L/min.'),
          prompt: 'Exprésalo en mL/s.',
          success: '5000 mL / 60 s ≈ 83,3 mL/s: con unos 70 latidos por minuto, cada latido expulsa unos 70 mL (volumen sistólico).',
          draw({ ink }, t) { caudalScene(ink, 0.8, t, { cylOp: 0.5 }); },
        },
      ],
    },
    // ============================================================ 3
    {
      id: 'continuidad', title: 'Ecuación de continuidad', short: 'Continuidad', num: '3',
      beats: [
        {
          kind: 'watch', dur: 18, cam: CAM.tube,
          caption: [
            [0, 'Un fluido incompresible no se acumula ni desaparece: el caudal que entra en un tramo es el mismo que sale.'],
            [7, 'Por eso, $A_1$ $v_1$ = $A_2$ $v_2$. Donde el tubo se estrecha, el fluido acelera; donde se ensancha, se frena.'],
            [14.5, 'Mira las células: en la parte estrecha avanzan más rápido.'],
          ],
          draw({ ink }, t) {
            flowTube(ink, 'ct', narrowing(0.75, 0.38), t, { v0: 0.45 });
            ink.text('ct-1', { x: -2.6, y: -0.75 }, '$A_1$, $v_1$', { dy: 34, size: 16 });
            ink.text('ct-2', { x: 2.6, y: -0.38 }, '$A_2$, $v_2$', { dy: 34, size: 16, cls: 'accent-tx' });
            formula(ink, 'f-c', '$A_1$ $v_1$ = $A_2$ $v_2$', { op: ramp(t, 7, 0.8), fy: 0.1 });
          },
        },
        {
          kind: 'do', cam: CAM.tube,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `$A_1/A_2$ = ${n(S.ratio, 1)}   →   $v_2$ = ${n(S.ratio, 1)} × $v_1$`,
          prompt: 'Arrastra la pared del tramo derecho para estrecharlo o ensancharlo.',
          success: 'La velocidad cambia en proporción inversa al área. Si el diámetro se reduce a la mitad, el área queda en ¼ y la velocidad se multiplica por 4.',
          draw({ ink, S }) {
            const r2 = 0.75 / Math.sqrt(S.ratio);
            flowTube(ink, 'ct', narrowing(0.75, r2), S.tt ?? 0, { v0: 0.45 });
            readout(ink, [`$A_1/A_2$ = ${n(S.ratio, 1)}`, `$v_2/v_1$ = ${n(S.ratio, 1)}`]);
          },
          handles: (S) => [{ key: 'w', p: { x: 2.6, y: 0.75 / Math.sqrt(S.ratio) + 0.09 }, r: 24, cursor: 'ns-resize', drag: (S2, p) => {
            const r2 = clamp(p.y - 0.09, 0.3, 1.1);
            S2.ratio = clamp(snap((0.75 / r2) ** 2, 0.1), 0.5, 6);
            S2.rSeen.add(S2.ratio >= 3.5 ? 'n' : S2.ratio < 0.8 ? 'w' : 'm');
          } }],
          done: (S) => S.rSeen.has('n') && S.rSeen.has('w'),
          skip(S) { S.rSeen.add('n'); S.rSeen.add('w'); },
        },
        {
          kind: 'do', cam: CAM.tree,
          ...askNumber({ key: 'vao', label: '$v$ =', unit: 'cm/s', answer: 83 / 4, rel: 0.02, wrong: [[332, 'Multiplicaste. $v$ = $Q$/$A$.'], [0.048, 'Invertiste: $v$ = $Q$/$A$ = 83/4.', 0.05]] }),
          caption: (S) => S.g.vao?.msg ?? (S.g.vao?.wrong ? '$v$ = $Q$/$A$, con $Q$ en mL/s = cm³/s y $A$ en cm².' : 'Toda la sangre que sale del corazón (≈ 83 mL/s) pasa por la aorta, de unos 4 cm² de sección.'),
          prompt: '¿A qué velocidad media va la sangre en la aorta?',
          success: '$v$ = 83/4 ≈ 21 cm/s.',
          draw({ ink }, t) { treeScene(ink, 0, { op: 0.25 }); },
        },
        {
          kind: 'watch', dur: 20, cam: CAM.tree,
          caption: [
            [0, 'El mismo caudal atraviesa cada nivel del árbol vascular. Lo que cambia es el área <b>total</b>: millones de capilares suman unos 2500 cm².'],
            [10, 'Por continuidad, en los capilares la sangre va unas 600 veces más lenta que en la aorta: menos de medio milímetro por segundo.'],
            [17, 'Esa lentitud no es un defecto: da tiempo al intercambio de O₂, CO₂ y nutrientes a través de la pared capilar.'],
          ],
          draw({ ink }, t) { treeScene(ink, t, { areas: ramp(t, 3, 0.8) }); },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'bernoulli', title: 'Teorema de Bernoulli', short: 'Bernoulli', num: '4',
      beats: [
        {
          kind: 'watch', dur: 24, cam: CAM.ventu,
          caption: [
            [0, 'Si el fluido acelera en el estrechamiento, algo lo empuja: la presión detrás de él es mayor que delante.'],
            [7, 'Las columnas miden la presión lateral. En la parte estrecha, donde el fluido va más rápido, la presión es <b>menor</b>.'],
            [14.5, 'Es la conservación de la energía por unidad de volumen: $P$ + ½ $ρ$ $v$² + $ρ$ $g$ $y$ = constante. Si sube la energía cinética, baja la presión.'],
          ],
          draw({ ink }, t) {
            venturi(ink, 3, t, { v1: 0.3, k: 0.12, Pref: 92, dh: t > 7 });
            formula(ink, 'f-b', '$P$ + ½ $ρ$ $v$² + $ρ$ $g$ $y$ = constante', { op: ramp(t, 14.5, 0.8), fy: 0.08, size: 26 });
          },
        },
        {
          kind: 'do', cam: CAM.ventu,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => {
            const v2 = 0.3 * S.vratio;
            const dP = (0.5 * RHO_B * (v2 * v2 - 0.09)) / MMHG;
            return `$A_1/A_2$ = ${n(S.vratio, 1)}  ·  $v_2$ = ${n(v2, 2)} m/s  ·  $P_1$ − $P_2$ = ${n(dP, 1)} mmHg`;
          },
          prompt: 'Estrecha la garganta del tubo y observa las dos columnas.',
          success: 'Más estrecho → más rápido → menos presión lateral. La caída crece con $v$²: al triplicar la velocidad, la energía cinética se multiplica por 9.',
          draw({ ink, S }) { venturi(ink, S.vratio, S.tt ?? 0, { v1: 0.3, k: 0.12, Pref: 92 }); },
          handles: (S) => [{ key: 'th', p: { x: 0.7, y: 0.6 / Math.sqrt(S.vratio) + 0.09 }, r: 22, cursor: 'ns-resize', drag: (S2, p) => {
            const r2 = clamp(p.y - 0.09, 0.22, 0.6);
            S2.vratio = clamp(snap((0.6 / r2) ** 2, 0.1), 1, 6);
            S2.bSeen.add(S2.vratio >= 4 ? 'n' : 'w');
          } }],
          done: (S) => S.bSeen.has('n'),
          skip(S) { S.bSeen.add('n'); S.vratio = 4; },
        },
        bernStep(1, 'Ejemplo: en una estenosis horizontal el área se reduce a ⅓. Antes, la sangre iba a 0,30 m/s. Primero, continuidad.'),
        bernStep(2, 'Bernoulli a la misma altura: el término $ρ$ $g$ $y$ es igual en ambos lados y se cancela.'),
        bernStep(3, 'Unos 3 mmHg menos en la estenosis. En estenosis severas la caída puede colapsar parcialmente el vaso y producir flujo turbulento.'),
        {
          kind: 'do', cam: CAM.ventuP,
          ...(() => {
            const c = askChoice({
              key: 'aneu', choices: [
                { id: 'sube', label: 'la velocidad baja y la presión sube', correct: true },
                { id: 'baja', label: 'la velocidad sube y la presión baja', why: 'Eso pasa en un estrechamiento. En una dilatación el área aumenta: la sangre se frena.' },
                { id: 'igual', label: 'nada cambia', why: 'Continuidad: si $A$ aumenta, $v$ disminuye. Y Bernoulli enlaza $v$ con $P$.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Caso clínico: en un aneurisma la arteria se dilata (área mayor).' };
          })(),
          prompt: '¿Qué ocurre dentro del aneurisma?',
          success: 'La sangre se frena y su presión lateral aumenta. Con Laplace (B.2): más radio y más presión → más tensión → la dilatación progresa. Así se explica a un paciente por qué su arteria puede romperse.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) {
            const r = (x) => 0.45 + 0.4 * Math.exp(-((x / 0.9) ** 2));
            flowTube(ink, 'an', r, S.tt ?? 0, { v0: 0.8 });
            ink.text('an-l', { x: 0, y: -0.85 }, 'aneurisma', { dy: 30, size: 15, cls: 'accent-tx' });
          },
        },
      ],
    },
    // ============================================================ 5
    {
      id: 'reynolds', title: 'Flujo laminar y turbulento', short: 'Reynolds', num: '5',
      beats: [
        {
          kind: 'watch', dur: 22, cam: CAM.tube,
          caption: [
            [0, 'En el flujo <b>laminar</b> el fluido avanza en capas paralelas, con trayectorias definidas. Es silencioso y eficiente.'],
            [7.5, 'En el flujo <b>turbulento</b> aparecen remolinos y mezcla, y se pierde energía. La pared vibra: se oye un <b>soplo</b>.'],
            [15, 'El <b>número de Reynolds</b> predice el régimen: $Re$ = $ρ$ $v$ $D$ / $η$. Por debajo de unos 2000, laminar; por encima, cada vez más turbulento.'],
          ],
          draw({ ink }, t) {
            const Re = t < 7.5 ? 800 : t < 15 ? lerp(800, 6000, easeInOut(clamp((t - 7.5) / 3))) : 6000;
            regimeScene(ink, Re, t);
            formula(ink, 'f-re', '$Re$ = $ρ$ $v$ $D$ / $η$', { op: ramp(t, 15, 0.8), fy: 0.08 });
          },
        },
        {
          kind: 'do', cam: CAM.tube,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `$v$ = ${n(S.Re * 0.004 / (RHO_B * 0.025), 2)} m/s en un vaso de 2,5 cm  →  $Re$ = ${n(S.Re, 0)}`,
          prompt: 'Arrastra la flecha para aumentar la velocidad hasta que el flujo se vuelva turbulento.',
          success: 'Con más velocidad (o más diámetro, o menos viscosidad) sube $Re$ y el flujo se desordena. Las estenosis aceleran la sangre: por eso producen soplos.',
          draw({ ink, S }) {
            regimeScene(ink, S.Re, S.tt ?? 0);
            const L = 0.4 + S.Re / 3000;
            ink.arrow('re-v', { x: -3.6, y: 1.35 }, { x: -3.6 + L, y: 1.35 }, 'accent heavy', { head: 12, headW: 4 });
            ink.text('re-vl', { x: -3.6, y: 1.35 }, '$v$', { dx: -10, dy: 6, size: 18, anchor: 'end', cls: 'accent-tx' });
          },
          handles: (S) => [{ key: 'v', p: { x: -3.6 + 0.4 + S.Re / 3000, y: 1.35 }, r: 24, cursor: 'ew-resize', drag: (S2, p) => {
            S2.Re = clamp(snap((p.x + 3.6 - 0.4) * 3000, 100), 200, 9000);
            if (S2.Re > 3500) S2.reSeen.add('t');
          } }],
          done: (S) => S.reSeen.has('t'),
          skip(S) { S.Re = 5000; S.reSeen.add('t'); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...askNumber({ key: 're', label: '$Re$ =', unit: '', answer: 1987.5, rel: 0.02, wrong: [[19.875, 'El diámetro va en metros: 2,5 cm = 0,025 m.', 0.03], [198750, 'Revisa: 2,5 cm = 0,025 m, no 2,5 m.', 0.03]] }),
          caption: (S) => S.g.re?.msg ?? (S.g.re?.wrong ? '$Re$ = $ρ$ $v$ $D$ / $η$, todo en SI.' : 'Aorta: $ρ$ = 1060 kg/m³, $v$ = 0,30 m/s, $D$ = 2,5 cm, $η$ = 0,004 Pa·s.'),
          prompt: 'Calcula el número de Reynolds en la aorta.',
          success: '$Re$ ≈ 1990: justo en el límite. En el pico de la sístole $v$ supera 1 m/s y el flujo aórtico se perturba un instante. En el manguito, los ruidos de Korotkoff son esta turbulencia.',
          draw({ ink }, t) { regimeScene(ink, 1990, t); },
        },
      ],
    },
    // ============================================================ 6
    {
      id: 'viscosidad', title: 'Viscosidad', short: 'Viscosidad', num: '6',
      beats: [
        {
          kind: 'watch', dur: 22, cam: CAM.prof,
          caption: [
            [0, 'Un fluido real tiene <b>viscosidad</b> $η$: rozamiento interno entre capas. La capa pegada a la pared no se mueve; la del centro va más rápido.'],
            [9, 'Por eso el perfil de velocidades es una parábola. La viscosidad se mide en Pa·s: agua ≈ 0,7 mPa·s a 37 °C; plasma ≈ 1,2; sangre ≈ 3–4 mPa·s.'],
            [17.5, 'La viscosidad de la sangre aumenta con el hematocrito, con las proteínas plasmáticas y al bajar la temperatura.'],
          ],
          draw({ ink }, t) { profileScene(ink, 0.45, t); },
        },
        {
          kind: 'do', cam: CAM.prof,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `Hematocrito ${n(S.hct * 100, 0)} %  →  $η$ ≈ ${n(etaBlood(S.hct), 1)} mPa·s`,
          prompt: 'Cambia el hematocrito: de anemia (25 %) a policitemia (65 %).',
          controls: () => [
            { type: 'button', id: '0.25', label: 'Anemia · 25 %' },
            { type: 'button', id: '0.45', label: 'Normal · 45 %' },
            { type: 'button', id: '0.65', label: 'Policitemia · 65 %' },
          ],
          act(S, id) { S.hct = Number(id); S.hSeen.add(id); },
          success: 'Con más glóbulos rojos la sangre es más viscosa y, a igual presión, fluye más despacio. En la policitemia vera: cefalea, rubicundez y riesgo trombótico; el corazón debe trabajar más (B.4).',
          draw({ ink, S }) { profileScene(ink, S.hct, S.tt ?? 0); },
          done: (S) => S.hSeen.has('0.25') && S.hSeen.has('0.65'),
          skip(S) { S.hSeen.add('0.25'); S.hSeen.add('0.65'); },
        },
        {
          kind: 'do', cam: CAM.prof,
          ...(() => {
            const c = askChoice({
              key: 'visc', choices: [
                { id: 'a', label: 'deshidratación (más hematocrito)', correct: true },
                { id: 'b', label: 'fiebre (mayor temperatura)', why: 'Al subir la temperatura la viscosidad disminuye.' },
                { id: 'c', label: 'anemia', why: 'En la anemia hay menos glóbulos rojos: la viscosidad baja.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Un paciente con hipertensión (150/100 mmHg) llega deshidratado.' };
          })(),
          prompt: '¿Qué aumenta la viscosidad de su sangre?',
          success: 'Al perder agua, el plasma disminuye y el hematocrito sube: más viscosidad, más resistencia y más carga para el corazón.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { profileScene(ink, 0.55, S.tt ?? 0); },
        },
      ],
    },
    // ============================================================ 7
    practiceChapter({ num: '7', seed: 70307, kinds: ['gc', 'Q', 'cont', 'bern', 're', 'regime'], make: makeProblem, draw: drawProblem, cam: practiceCam }),
    // ============================================================ 8
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '8',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica B.3 · Resumen',
          title: 'Flujo, continuidad y Bernoulli',
          ideas: [
            'Caudal: <span class="m"><i>Q</i> = Δ<i>V</i>/Δ<i>t</i> = <i>A v</i></span>. Gasto cardíaco ≈ 5 L/min ≈ 83 mL/s.',
            'Continuidad: <span class="m"><i>A</i><sub>1</sub><i>v</i><sub>1</sub> = <i>A</i><sub>2</sub><i>v</i><sub>2</sub></span>. En los capilares (área total enorme) la sangre va muy lenta: tiempo para el intercambio.',
            'Bernoulli: <span class="m"><i>P</i> + ½<i>ρv</i>² + <i>ρgy</i> = cte</span>. Donde el fluido acelera, la presión baja; en un aneurisma, se frena y la presión sube.',
            'Reynolds: <span class="m"><i>Re</i> = <i>ρvD</i>/<i>η</i></span>. Por encima de ≈ 2000, turbulencia: soplos y ruidos de Korotkoff.',
            'La viscosidad (≈ 3–4 mPa·s) crece con el hematocrito y las proteínas y baja con la temperatura.',
          ],
          next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#poiseuille">B.4 · Resistencia y ley de Poiseuille ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};
