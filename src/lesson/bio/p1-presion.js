// Biofísica 1.1 — ¿Qué es la presión?  (Semana 7, bloque «Presión»)
// Guion: docs/biofisica-presion-guion.md, lección 1.1.
//
// Enseñar, no repasar: la lección parte de una pregunta (¿por qué entra la
// aguja y el dedo no?), el estudiante descubre P = F/A con un experimento que
// él mismo anota, lo usa para resolver un reto, y solo entonces aparecen las
// unidades y los casos clínicos (úlceras por presión).

import { clamp, ramp, snap, lerp, easeInOut } from '../core/anim.js';
import {
  UI_ES, MMHG, n, rect, shape, figure, bed, readout, formula, table,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';

const CAM = {
  title: { xmin: -3, xmax: 5, ymin: -1.6, ymax: 2.6 },
  hook: { xmin: -2.6, xmax: 4.6, ymin: -1.6, ymax: 2.4 },
  foam: { xmin: -2.4, xmax: 6.2, ymin: -1.6, ymax: 2.6 },
  plate: { xmin: -2.6, xmax: 5.4, ymin: -1.2, ymax: 3.4 },
  bed: { xmin: -3.2, xmax: 1.4, ymin: -1.3, ymax: 1.3 },
};

// ------------------------------------------------------------ hook

/** Finger and needle pressing on skin with the same force. */
function hookScene(ink, t, o = {}) {
  const skinTop = 0;
  rect(ink, 'skin', -2.2, -1.0, 4.2, skinTop, 'skin', { layer: 'trails' });
  // Finger: dents the skin, does not enter.
  const dent = 0.12 * (o.press ?? 1);
  const fx = 0;
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = -2.2 + (6.4 * i) / 40;
    const u = Math.abs(x - fx) / 0.55;
    const y = u < 1 ? skinTop - dent * (0.5 + 0.5 * Math.cos(Math.PI * u)) : skinTop;
    pts.push({ x, y });
  }
  ink.poly('skin-l', pts.filter((p) => p.x < 1.4), 'ink', { layer: 'statics' });
  ink.poly('skin-r', [{ x: 1.4, y: 0 }, { x: 1.95, y: 0 }], 'ink', { layer: 'statics' });
  ink.poly('skin-r2', [{ x: 2.05, y: 0 }, { x: 4.2, y: 0 }], 'ink', { layer: 'statics' });
  // Finger as a rounded part.
  const fw = 0.34, ftop = 1.5, fb = skinTop - dent + 0.02;
  ink.path('finger', `M${pt(ink, fx - fw, ftop)}L${pt(ink, fx - fw, fb + fw)}Q${pt(ink, fx - fw, fb)} ${pt(ink, fx, fb)}Q${pt(ink, fx + fw, fb)} ${pt(ink, fx + fw, fb + fw)}L${pt(ink, fx + fw, ftop)}`, 'part', { layer: 'bodies' });
  // Needle: a syringe barrel and a sharp tip that has entered the skin.
  const nx = 2.0, depth = 0.45 * (o.press ?? 1);
  rect(ink, 'barrel', nx - 0.18, 0.75, nx + 0.18, 1.5, 'part');
  ink.line('hub', { x: nx - 0.07, y: 0.75 }, { x: nx + 0.07, y: 0.75 }, 'ink', { layer: 'bodies' });
  ink.poly('needle', [{ x: nx, y: 0.75 }, { x: nx, y: -depth + 0.05 }, { x: nx + 0.012, y: -depth }], 'ink heavy', { layer: 'bodies' });
  for (const [k, x] of [['Ff', fx], ['Fn', nx]]) {
    ink.arrow(k, { x, y: 2.3 }, { x, y: 1.55 }, 'accent heavy', { head: 11, headW: 3.8 });
    ink.text(`${k}-l`, { x, y: 2.3 }, '$F$ = 5 N', { dy: -8, size: 16, cls: 'accent-tx' });
  }
  ink.text('lab-f', { x: fx, y: -1.0 }, 'dedo: la piel se hunde', { dy: 22, size: 15 });
  ink.text('lab-n', { x: nx, y: -1.0 }, 'aguja: la piel se perfora', { dy: 22, size: 15 });
  if (o.areas) {
    ink.dimension('a-f', { x: fx - fw, y: fb - 0.08 }, { x: fx + fw, y: fb - 0.08 }, 22, '≈ 1 cm²', { size: 14, op: o.areas });
    ink.text('a-n', { x: nx, y: -depth }, 'punta ≈ 0,1 mm²', { dx: 12, dy: 4, size: 14, anchor: 'start', cls: 'halo', op: o.areas });
  }
}

const pt = (ink, x, y) => { const s = ink.S({ x, y }); return `${s.x.toFixed(1)},${s.y.toFixed(1)}`; };

// ---------------------------------------------------- the foam experiment

const DEPTH_K = 1 / 2200; // drawn dent (m) per Pa (exaggerated)
const BX = 1.2; // block centre

/** dent in mm, as "measured" (1 mm per 100 Pa) */
const dentMM = (P) => P / 100;

function foamScene(ink, F, A, o = {}) {
  const P = F / A;
  const d = Math.min(1.0, P * DEPTH_K);
  const x0 = BX - A / 2, x1 = BX + A / 2;
  // Foam slab with a dent under the block.
  const top = [];
  for (let i = 0; i <= 120; i++) {
    const x = -2 + (6 * i) / 120;
    let y = 0;
    const edge = 0.22;
    if (x >= x0 && x <= x1) y = -d;
    else if (x > x0 - edge && x < x0) y = -d * (0.5 + 0.5 * Math.cos((Math.PI * (x0 - x)) / edge));
    else if (x > x1 && x < x1 + edge) y = -d * (0.5 + 0.5 * Math.cos((Math.PI * (x - x1)) / edge));
    top.push({ x, y });
  }
  shape(ink, 'foam', [...top, { x: 4, y: -1.2 }, { x: -2, y: -1.2 }], 'foam', { layer: 'trails' });
  ink.poly('foam-top', top, 'ink', { layer: 'statics' });
  ink.ground('foam-g', { x: -2.1, y: -1.2 }, { x: 4.1, y: -1.2 });
  for (let k = 0; k < 26; k++) {
    const x = -1.85 + ((k * 0.613) % 5.7), y = -0.25 - ((k * 0.37) % 0.85);
    if (!(x > x0 - 0.1 && x < x1 + 0.1 && y > -d - 0.05)) ink.dot(`fd${k}`, { x, y }, { r: 2, cls: 'foam-dots' });
  }
  if (o.target) {
    const dt = o.target * DEPTH_K;
    ink.line('target', { x: x0 - 0.3, y: -dt }, { x: x1 + 0.3, y: -dt }, 'target', { layer: 'annotations' });
    ink.text('target-l', { x: x1 + 0.3, y: -dt }, 'huella objetivo', { dx: 6, dy: 5, size: 13, anchor: 'start', cls: 'accent-tx halo' });
  }
  // Block and stacked weights (100 N each).
  rect(ink, 'blk', x0, -d, x1, -d + 0.35, 'part');
  const plates = Math.round(F / 100);
  for (let i = 0; i < plates; i++) {
    const w = Math.min(0.5, A * 0.8);
    rect(ink, `w${i}`, BX - w / 2, -d + 0.35 + i * 0.16, BX + w / 2, -d + 0.35 + (i + 1) * 0.16 - 0.02, 'weight');
  }
  ink.text('F-l', { x: BX, y: -d + 0.35 + plates * 0.16 }, `$F$ = ${n(F)} N`, { dy: -10, size: 16 });
  ink.dimension('A-d', { x: x0, y: -1.2 }, { x: x1, y: -1.2 }, 26, `$A$ = ${n(A, 2)} m²`, { size: 14 });
  if (d > 0.02) {
    ink.dimension('d-d', { x: x1 + 0.45, y: 0 }, { x: x1 + 0.45, y: -d }, 0, `${n(dentMM(P), 0)} mm`, { size: 13 });
    ink.line('d-ref', { x: x1 + 0.2, y: 0 }, { x: x1 + 0.6, y: 0 }, 'drop', { layer: 'annotations' });
  }
  return P;
}

function trialsTable(ink, S, o = {}) {
  table(ink, 'tb', [{ h: 'F (N)', w: 64 }, { h: 'A (m²)', w: 70 }, { h: 'hundimiento (mm)', w: 128 }],
    S.trials.map((r) => [n(r.F), n(r.A, 2), n(dentMM(r.F / r.A), 0)]), { hi: S.trials.length - 1, empty: 'pulsa «Anotar»', y: 26, ...o });
}

function record(S) {
  const last = S.trials[S.trials.length - 1];
  if (last && last.F === S.F && Math.abs(last.A - S.A) < 1e-9) return;
  S.trials.push({ F: S.F, A: S.A });
  if (S.trials.length > 7) S.trials.shift();
}

const has = (S, f) => S.trials.some(f);
const pairF = (S) => S.trials.some((a) => S.trials.some((b) => Math.abs(a.A - b.A) < 1e-9 && Math.abs(b.F - 2 * a.F) < 1e-9));
const pairA = (S) => S.trials.some((a) => S.trials.some((b) => a.F === 300 && b.F === 300 && Math.abs(b.A - a.A / 2) < 0.011));

// --------------------------------------------------------- units scenes

function plateScene(ink, t, o = {}) {
  // A 1 m × 1 m plate seen obliquely, and what rests on it.
  const P = (x, y) => ({ x: x + y * 0.55, y: y * 0.35 });
  const corners = [P(0, 0), P(2, 0), P(2, 2), P(0, 2)];
  shape(ink, 'plate', corners, 'part', { layer: 'trails' });
  ink.poly('plate-o', [...corners, corners[0]], 'ink', { layer: 'statics' });
  ink.text('plate-l', P(1, 0), '1 m²', { dy: 22, size: 15 });
  if (o.apple) {
    ink.circle('apple', { x: P(1, 1).x, y: P(1, 1).y + 0.12 }, 8, 'heart', { layer: 'bodies', op: o.apple });
    ink.text('apple-l', { x: P(1, 1).x, y: P(1, 1).y + 0.12 }, 'una manzana pequeña: ≈ 1 N  →  1 Pa', { dx: 16, dy: -10, size: 15, anchor: 'start', op: o.apple, cls: 'halo' });
  }
  if (o.air) {
    const levels = 14;
    for (let i = 0; i < levels; i++) {
      const y0 = 0.7 + i * 0.18, y1 = y0 + 0.18;
      const a = P(0, 2).x, b = P(2, 2).x;
      rect(ink, `air${i}`, a, P(0, 2).y + y0 - 0.7, b, P(0, 2).y + y1 - 0.7, 'fluid-3', { layer: 'grid', op: o.air * (1 - i / levels) * 0.9 });
    }
    ink.text('air-l', { x: P(2, 2).x, y: 1.6 }, 'columna de aire sobre 1 m²', { dx: 14, size: 15, anchor: 'start', op: o.air });
    ink.text('air-l2', { x: P(2, 2).x, y: 1.6 }, '≈ 10 toneladas  →  101 325 Pa', { dx: 14, dy: 24, size: 15, anchor: 'start', op: o.air, cls: 'accent-tx' });
  }
}

/** A diver's-eye cube of fluid with pressure on every face. */
function allSidesScene(ink, t, o = {}) {
  const c = { x: 1.6, y: 1.3 };
  rect(ink, 'fl', -1.8, -0.8, 5.0, 3.1, 'fluid', { layer: 'trails' });
  rect(ink, 'cube', c.x - 0.45, c.y - 0.45, c.x + 0.45, c.y + 0.45, 'blood-2');
  ink.poly('cube-o', [{ x: c.x - 0.45, y: c.y - 0.45 }, { x: c.x + 0.45, y: c.y - 0.45 }, { x: c.x + 0.45, y: c.y + 0.45 }, { x: c.x - 0.45, y: c.y + 0.45 }, { x: c.x - 0.45, y: c.y - 0.45 }], 'ink', { layer: 'statics' });
  const op = o.arrows ?? 1;
  for (const [k, a, b] of [
    ['u', { x: c.x, y: c.y + 1.2 }, { x: c.x, y: c.y + 0.5 }], ['d', { x: c.x, y: c.y - 1.2 }, { x: c.x, y: c.y - 0.5 }],
    ['l', { x: c.x - 1.3, y: c.y }, { x: c.x - 0.5, y: c.y }], ['r', { x: c.x + 1.3, y: c.y }, { x: c.x + 0.5, y: c.y }],
  ]) ink.arrow(`as-${k}`, a, b, 'blue heavy', { head: 11, headW: 3.8, op });
  ink.text('as-l', { x: c.x, y: c.y - 0.45 }, 'tejido', { dy: 20, size: 14, cls: 'mid' });
  if (o.inside) {
    for (const [k, a, b] of [['iu', c, { x: c.x, y: c.y + 0.38 }], ['id', c, { x: c.x, y: c.y - 0.38 }], ['il', c, { x: c.x - 0.38, y: c.y }], ['ir', c, { x: c.x + 0.38, y: c.y }]]) {
      ink.arrow(`as-${k}`, a, b, 'accent', { head: 8, headW: 2.8, op: o.inside });
    }
  }
}

// ----------------------------------------------------------- bedsore

function bedsoreScene(ink, o = {}) {
  bed(ink, 'bed', -2.0, 0.3, 0.42);
  const fig = figure(ink, 'pt', { x: -1.75, y: 0.42 + 0.14 }, 1.75, -Math.PI / 2, { sx: 0.6, heart: false });
  // Sacrum: a bony point near the hips; spread weight elsewhere.
  const sac = { x: -1.75 + 0.5 * 1.75, y: 0.42 };
  if (o.arrows) {
    // Contact pressure along the body, drawn as a load diagram under the bed:
    // low and spread under the back, sharp peaks under sacrum and heels.
    const peak = (x, c, w, h) => h * Math.exp(-(((x - c) / w) ** 2));
    const head = 0.0; // the head rests at the right end of the body
    const v = (x) => (x > -0.6 && x < -0.05 ? 0.1 : 0.04) + peak(x, sac.x, 0.1, 0.75) + peak(x, -1.66, 0.05, 0.4) + peak(x, head - 0.1, 0.12, 0.18);
    const xs = Array.from({ length: 161 }, (_, k) => -1.72 + (1.72 * k) / 160);
    const y0 = -0.25;
    ink.diagram('bs-d', xs.map((x) => ({ x, v: -v(x) })), y0, 1, { op: o.arrows });
    ink.line('bs-base', { x: -1.8, y: y0 }, { x: 0.1, y: y0 }, 'ink', { op: o.arrows, layer: 'annotations' });
    ink.text('bs-dl', { x: -1.85, y: y0 }, 'presión de apoyo', { dx: -6, dy: 5, size: 13, anchor: 'end', cls: 'mid', op: o.arrows });
    ink.text('bs-sac', { x: sac.x, y: y0 - 0.75 }, 'sacro: poca área, mucha presión', { dy: 18, size: 14, cls: 'accent-tx halo', op: o.arrows });
    ink.text('bs-heel', { x: -1.66, y: y0 - 0.4 }, 'talones', { dy: 18, size: 13, cls: 'mid halo', op: o.arrows });
  }
  return fig;
}

// ---------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'P': {
      const F = pick(rnd, [20, 50, 100, 150, 300, 600]);
      const Acm = pick(rnd, [2, 5, 10, 20, 50, 100]);
      const P = F / (Acm * 1e-4);
      return {
        kind, ask: `Una fuerza de ${F} N se reparte sobre ${Acm} cm². ¿Qué presión produce, en kPa?`,
        given: [['$F$', `${F} N`], ['$A$', `${Acm} cm² = ${n(Acm * 1e-4, 4)} m²`]],
        number: { label: '$P$ =', unit: 'kPa', answer: P / 1000 }, F, A: Acm,
        hint: 'Pasa el área a m² (1 cm² = 10⁻⁴ m²), divide la fuerza entre el área y pasa de Pa a kPa.',
        solution: [{ text: 'Área en m²:', math: `${Acm} × 10⁻⁴ = ${n(Acm * 1e-4, 4)} m²` }, { text: 'Presión:', math: `$P$ = ${F} / ${n(Acm * 1e-4, 4)} = ${n(P, 0)} Pa = ${n(P / 1000, 1)} kPa` }],
        why: `$P$ = ${n(P / 1000, 1)} kPa.`,
      };
    }
    case 'F': {
      const PkPa = pick(rnd, [4, 10, 16, 20, 50]);
      const Acm = pick(rnd, [10, 20, 50, 100]);
      const F = PkPa * 1000 * Acm * 1e-4;
      return {
        kind, ask: `Un manguito aprieta el brazo con ${PkPa} kPa sobre un área de ${Acm} cm². ¿Qué fuerza total ejerce?`,
        given: [['$P$', `${PkPa} kPa`], ['$A$', `${Acm} cm²`]],
        number: { label: '$F$ =', unit: 'N', answer: F }, F, A: Acm,
        hint: 'Despeja: $F$ = $P$·$A$, con $P$ en Pa y $A$ en m².',
        solution: [{ text: 'En SI:', math: `$P$ = ${PkPa * 1000} Pa; $A$ = ${n(Acm * 1e-4, 4)} m²` }, { text: 'Fuerza:', math: `$F$ = $P$·$A$ = ${n(F, 1)} N` }],
        why: `$F$ = ${n(F, 1)} N.`,
      };
    }
    case 'A': {
      const F = pick(rnd, [100, 200, 300, 600]);
      const P = pick(rnd, [1000, 2000, 5000, 10000]);
      return {
        kind, ask: `¿Sobre qué área hay que repartir ${F} N para que la presión sea ${n(P)} Pa? (en m²)`,
        given: [['$F$', `${F} N`], ['$P$', `${n(P)} Pa`]],
        number: { label: '$A$ =', unit: 'm²', answer: F / P, d: 3 }, F, A: (F / P) * 1e4,
        hint: 'Despeja el área: $A$ = $F$/$P$.',
        solution: [{ text: 'Área:', math: `$A$ = ${F} / ${n(P)} = ${n(F / P, 3)} m²` }],
        why: `$A$ = ${n(F / P, 3)} m².`,
      };
    }
    case 'mm2k': {
      const mm = pick(rnd, [40, 80, 90, 100, 120, 140]);
      return {
        kind, ask: `Expresa ${mm} mmHg en kilopascales.`,
        given: [['1 mmHg', '133,3 Pa']],
        number: { label: '', unit: 'kPa', answer: (mm * MMHG) / 1000, d: 1 },
        hint: 'mmHg × 133,3 → Pa; luego ÷ 1000 → kPa.',
        solution: [{ text: 'Conversión:', math: `${mm} × 133,3 = ${n(mm * MMHG, 0)} Pa = ${n((mm * MMHG) / 1000, 1)} kPa` }],
        why: `${mm} mmHg = ${n((mm * MMHG) / 1000, 1)} kPa.`,
      };
    }
    case 'k2mm': {
      const kPa = pick(rnd, [4, 8, 10, 13.3, 20]);
      return {
        kind, ask: `Un sensor marca ${n(kPa)} kPa. ¿Cuántos mmHg son?`,
        given: [['1 mmHg', '133,3 Pa']],
        number: { label: '', unit: 'mmHg', answer: (kPa * 1000) / MMHG, d: 0 },
        hint: 'kPa × 1000 → Pa; luego ÷ 133,3 → mmHg.',
        solution: [{ text: 'Conversión:', math: `${n(kPa * 1000)} / 133,3 = ${n((kPa * 1000) / MMHG, 0)} mmHg` }],
        why: `${n(kPa)} kPa ≈ ${n((kPa * 1000) / MMHG, 0)} mmHg.`,
      };
    }
    case 'abs': {
      const g = pick(rnd, [80, 100, 120, 140]);
      return {
        kind, ask: `Un tensiómetro marca ${g} mmHg en una arteria. ¿Cuál es la presión absoluta de la sangre allí (al nivel del mar)?`,
        given: [['lectura', `${g} mmHg`], ['$P_0$', '760 mmHg']],
        number: { label: '$P$ =', unit: 'mmHg', answer: 760 + g, d: 0, rel: 0.002 },
        hint: 'El tensiómetro mide respecto a la atmósfera: la absoluta es la lectura más 760 mmHg.',
        solution: [{ text: 'Absoluta = manométrica + atmosférica:', math: `${g} + 760 = ${760 + g} mmHg` }],
        why: `${760 + g} mmHg absolutos.`,
      };
    }
    default: {
      // Which presses harder? Same force, different areas, or different forces.
      const a = { F: pick(rnd, [200, 400, 600]), A: pick(rnd, [0.1, 0.2, 0.4]) };
      let b = { F: pick(rnd, [200, 400, 600]), A: pick(rnd, [0.1, 0.2, 0.4]) };
      if (Math.abs(a.F / a.A - b.F / b.A) < 1e-9) b = { F: a.F, A: a.A * 2 };
      const big = a.F / a.A > b.F / b.A ? 'a' : 'b';
      return {
        kind: 'cmp', ask: `¿Qué bloque produce más presión? (1) ${a.F} N sobre ${n(a.A, 1)} m²  ·  (2) ${b.F} N sobre ${n(b.A, 1)} m²`,
        given: [['(1)', `${a.F} N / ${n(a.A, 1)} m²`], ['(2)', `${b.F} N / ${n(b.A, 1)} m²`]],
        choices: [{ id: 'a', label: '(1)', correct: big === 'a' }, { id: 'b', label: '(2)', correct: big === 'b' }],
        hint: 'No compares solo las fuerzas: calcula $F$/$A$ para cada uno.',
        solution: [{ text: '(1):', math: `${a.F}/${n(a.A, 1)} = ${n(a.F / a.A, 0)} Pa` }, { text: '(2):', math: `${b.F}/${n(b.A, 1)} = ${n(b.F / b.A, 0)} Pa` }],
        why: `${big === 'a' ? '(1)' : '(2)'}: ${n(Math.max(a.F / a.A, b.F / b.A), 0)} Pa.`, a, b,
      };
    }
  }
}

function drawProblem(ink, p) {
  if (p.kind === 'cmp') { foamScene(ink, p.a.F, p.a.A); return; }
  if (p.kind === 'P' || p.kind === 'F' || p.kind === 'A') { foamScene(ink, Math.min(600, p.F ?? 300), clamp((p.A ?? 50) / 100, 0.15, 1.2)); return; }
  plateScene(ink, 0, { air: 1 });
}

// ------------------------------------------------------------- lesson

function needleStep(k, caption) {
  return {
    kind: 'watch', dur: 3, pause: true, cam: CAM.hook, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Datos' }, { given: [['$F$', '5 N (los dos)'], ['$A_{dedo}$', '1 cm² = 10⁻⁴ m²'], ['$A_{aguja}$', '0,1 mm² = 10⁻⁷ m²']] },
        { step: 1, text: 'Presión del dedo:', math: '$P$ = 5 / 10⁻⁴ = 50 000 Pa = 50 kPa', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Presión de la aguja:', math: '$P$ = 5 / 10⁻⁷ = 50 000 000 Pa = 50 MPa', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Comparación:', math: '50 MPa / 50 kPa = 1000 veces más', state: st(3) }] : []),
      ];
    },
    draw({ ink }) { hookScene(ink, 0, { areas: 1 }); },
  };
}

export const p1 = {
  id: 'bio-p1', code: '1.1', title: '¿Qué es la presión?', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.foam, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, F: 300, A: 0.6, trials: [] }),
  chapters: [
    {
      id: 'intro', title: '¿Qué es la presión?', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Presión · Lección 1.1',
          title: '¿Qué es la presión?',
          sub: 'Una aguja entra en la piel y un dedo no, aunque empujen igual. Vas a descubrir por qué con un experimento propio.',
          meta: 'Unos 25 minutos · Semana 7 · Experimento · Reto · Caso clínico · Práctica',
        }),
        draw({ ink }, t) { hookScene(ink, t, { press: ramp(t, 0.5, 1.5) }); },
      }],
    },
    // ============================================================ 1
    {
      id: 'pregunta', title: 'Una pregunta', short: 'Pregunta', num: '1',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.hook,
          caption: 'Una enfermera empuja una aguja con unos 5 N, la misma fuerza con la que tú presionas la piel con un dedo. La aguja entra; el dedo no.',
          draw({ ink }, t) { hookScene(ink, t, { press: ramp(t, 0.3, 1.5) }); },
        },
        {
          kind: 'do', cam: CAM.hook,
          ...(() => {
            const c = askChoice({
              key: 'hook', choices: [
                { id: 'force', label: 'la aguja hace más fuerza', why: 'En este ejemplo las dos fuerzas son iguales: 5 N. La diferencia tiene que estar en otra parte.' },
                { id: 'area', label: 'la misma fuerza se concentra en un área mucho más pequeña', correct: true },
                { id: 'skin', label: 'la piel es más débil donde entra la aguja', why: 'Es la misma piel. Si pusieras el dedo justo donde entra la aguja, tampoco entraría.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Piensa antes de responder: ¿qué es distinto entre el dedo y la aguja, si la fuerza es la misma?' };
          })(),
          prompt: '¿Por qué entra la aguja y el dedo no?',
          success: 'Esa es la intuición correcta. Importa la fuerza, pero también sobre cuánta área se reparte. Vamos a convertir esa intuición en una medida.',
          draw({ ink }) { hookScene(ink, 0); },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'experimento', title: 'Un experimento con espuma', short: 'Experimento', num: '2',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.foam,
          caption: 'Ponemos un bloque sobre una espuma. Cuanto más «apriete» el bloque, más se hundirá la espuma: el hundimiento será nuestro instrumento de medida.',
          draw({ ink }) { foamScene(ink, 300, 0.6); },
        },
        {
          kind: 'do', cam: CAM.foam,
          caption: (S) => (pairF(S) ? '' : S.trials.length ? 'Ahora cambia el peso (sin tocar el área) y anota otra vez.' : 'Primero anota la medición actual.'),
          prompt: 'Sin cambiar el área: anota una medición, <b>duplica el peso</b> y anota otra.',
          controls: (S) => [
            { type: 'button', id: '-', label: '− 100 N', disabled: S.F <= 100 },
            { type: 'button', id: '+', label: '+ 100 N', disabled: S.F >= 600 },
            { type: 'button', id: 'rec', label: 'Anotar medición', primary: true },
          ],
          act(S, id) {
            if (id === '+') S.F = Math.min(600, S.F + 100);
            if (id === '-') S.F = Math.max(100, S.F - 100);
            if (id === 'rec') record(S);
          },
          enter(S) { S.A = 0.6; },
          success: 'En tu tabla: con el doble de fuerza, el doble de hundimiento. El efecto es <b>proporcional a la fuerza</b>.',
          draw({ ink, S }) { foamScene(ink, S.F, S.A); trialsTable(ink, S); },
          done: pairF,
          skip(S) { S.trials.push({ F: 200, A: 0.6 }, { F: 400, A: 0.6 }); },
        },
        {
          kind: 'do', cam: CAM.foam,
          caption: (S) => (pairA(S) ? '' : 'Arrastra el borde del bloque para cambiar el área de apoyo. El peso queda fijo en 300 N.'),
          prompt: 'Con 300 N: anota con un área, <b>reduce el área a la mitad</b> y anota otra vez.',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar medición', primary: true }],
          act(S, id) { if (id === 'rec') record(S); },
          enter(S) { S.F = 300; },
          success: 'Con la mitad del área, el doble de hundimiento. El efecto es <b>inversamente proporcional al área</b>.',
          draw({ ink, S }) { foamScene(ink, S.F, S.A); trialsTable(ink, S); },
          handles: (S) => [{ key: 'edge', p: { x: BX + S.A / 2, y: -Math.min(1.0, (S.F / S.A) * DEPTH_K) + 0.17 }, r: 24, cursor: 'ew-resize', drag: (S2, p) => { S2.A = clamp(snap((p.x - BX) * 2, 0.05), 0.15, 1.2); } }],
          done: pairA,
          skip(S) { S.trials.push({ F: 300, A: 0.6 }, { F: 300, A: 0.3 }); },
        },
        {
          kind: 'do', cam: CAM.foam,
          ...(() => {
            const c = askChoice({
              key: 'law', choices: [
                { id: 'F', label: 'solo de la fuerza $F$', why: 'Mira tus filas con 300 N: la fuerza era la misma y el hundimiento cambió.' },
                { id: 'A', label: 'solo del área $A$', why: 'Mira tus filas con la misma área: al duplicar el peso cambió el hundimiento.' },
                { id: 'FxA', label: 'del producto $F$·$A$', why: 'Con $F$·$A$, reducir el área disminuiría el efecto. Tu tabla dice lo contrario.' },
                { id: 'FdA', label: 'del cociente $F/A$', correct: true },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Mira tu tabla: crece con la fuerza y crece cuando el área se achica.' };
          })(),
          prompt: 'Según tus mediciones, el hundimiento depende…',
          success: 'Exacto. A ese cociente lo llamamos <b>presión</b>: $P$ = $F/A$. Es la fuerza que recibe cada metro cuadrado.',
          draw({ ink, S }) { foamScene(ink, S.F, S.A); trialsTable(ink, S); },
        },
        {
          kind: 'watch', dur: 3, cam: CAM.foam,
          caption: 'Comprueba con tu tabla: para cada fila, divide $F$ entre $A$. Las filas con el mismo cociente tienen el mismo hundimiento, aunque las fuerzas sean distintas.',
          draw({ ink, S }) {
            foamScene(ink, S.F, S.A);
            table(ink, 'tb2', [{ h: 'F (N)', w: 60 }, { h: 'A (m²)', w: 64 }, { h: 'F/A (Pa)', w: 84 }, { h: 'mm', w: 50 }],
              S.trials.map((r) => [n(r.F), n(r.A, 2), n(r.F / r.A, 0), n(dentMM(r.F / r.A), 0)]), { y: 26 });
            formula(ink, 'f-P', '$P$ = $F$ / $A$', { fx: 0.24, fy: 0.3 });
          },
        },
        {
          kind: 'do', cam: CAM.foam,
          enter(S) { S.F = 200; S.A = 0.6; },
          caption: (S) => {
            const P = S.F / S.A;
            if (Math.abs(P - 1000) < 60) return '';
            return P < 1000 ? `Ahora: ${n(P, 0)} Pa. La huella es demasiado poco profunda.` : `Ahora: ${n(P, 0)} Pa. Te pasaste: la huella es demasiado profunda.`;
          },
          prompt: 'Reto: un bloque de 600 N sobre 0,60 m² deja la huella marcada. Con solo 200 N, consigue <b>la misma huella</b>.',
          success: 'Con un tercio de la fuerza necesitas un tercio del área: 200 N / 0,20 m² = 600 N / 0,60 m² = 1000 Pa. Misma presión, mismo efecto.',
          draw({ ink, S }) { foamScene(ink, S.F, S.A, { target: 1000 }); },
          handles: (S) => [{ key: 'edge', p: { x: BX + S.A / 2, y: -Math.min(1.0, (S.F / S.A) * DEPTH_K) + 0.17 }, r: 24, cursor: 'ew-resize', drag: (S2, p) => { S2.A = clamp(snap((p.x - BX) * 2, 0.02), 0.1, 1.2); } }],
          done: (S) => Math.abs(S.F / S.A - 1000) < 60,
          skip(S) { S.A = 0.2; },
        },
      ],
    },
    // ============================================================ 3
    {
      id: 'aguja', title: 'Volvamos a la aguja', short: 'La aguja', num: '3',
      beats: [
        needleStep(1, 'Con $P$ = $F/A$ ya podemos responder la pregunta del principio con números. El dedo apoya unos 1 cm².'),
        needleStep(2, 'La punta de la aguja apoya unos 0,1 mm²: mil veces menos área.'),
        needleStep(3, 'La aguja produce mil veces más presión con la misma fuerza. La piel resiste unos pocos megapascales: el dedo se queda lejos; la aguja la supera de sobra.'),
        {
          kind: 'do', cam: CAM.hook, panel: 'work',
          ...askNumber({ key: 'heel', label: '$P$ =', unit: 'kPa', answer: 3500, rel: 0.02, wrong: [[3.5, 'Revisa las unidades: 2 cm² = 2 × 10⁻⁴ m².', 0.02], [350, 'Revisa la conversión de cm² a m²: 1 cm² = 10⁻⁴ m².', 0.02], [175, 'Ese es el resultado con 40 cm² (zapato plano). Con tacón el área es 2 cm².', 0.02]] }),
          caption: (S) => S.g.heel?.msg ?? (S.g.heel?.wrong ? 'Pasa primero el área a m² y luego divide.' : 'Ahora tú: una persona de 700 N se apoya en dos tacones finos de 1 cm² cada uno (2 cm² en total).'),
          prompt: '¿Qué presión ejerce sobre el suelo? (en kPa)',
          success: '700 / (2 × 10⁻⁴) = 3 500 000 Pa = 3500 kPa: unas 35 atmósferas. Con zapato plano (unos 40 cm²) serían solo 175 kPa.',
          work: (S) => [{ h: 'Datos' }, { given: [['$F$', '700 N'], ['$A$', '2 cm²']] }, { step: 1, text: 'Mismo procedimiento que con la aguja:', math: '$A$ en m² → $P$ = $F/A$ → kPa', state: 'now' }, ...(S.g.heel?.ok ? [{ result: '$P$ = 3500 kPa', ok: true }] : [])],
          draw({ ink }) { foamScene(ink, 600, 0.2); },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'unidades', title: '¿Cuánto es un pascal?', short: 'Unidades', num: '4',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.plate,
          caption: 'La unidad SI de presión es el <b>pascal</b>: 1 Pa = 1 N/m². Es muy poco: el peso de una manzana pequeña repartido sobre un metro cuadrado.',
          draw({ ink }, t) { plateScene(ink, t, { apple: ramp(t, 0.5, 0.8) }); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.plate,
          caption: 'Ahora el aire. Sobre cada metro cuadrado de suelo descansa una columna de aire de muchos kilómetros que pesa unas 10 toneladas. Eso es la presión atmosférica: $P_0$ ≈ 101 325 Pa.',
          draw({ ink }, t) { plateScene(ink, t, { air: ramp(t, 0.3, 1.5) }); },
        },
        {
          kind: 'do', cam: CAM.plate,
          ...(() => {
            const c = askChoice({
              key: 'crush', choices: [
                { id: 'light', label: 'porque el aire casi no pesa', why: 'Pesa: unas 10 toneladas por metro cuadrado, lo acabas de ver.' },
                { id: 'skin', label: 'porque la piel y los huesos resisten 10 toneladas', why: 'Ningún tejido resiste eso. La respuesta está en cómo actúa la presión en un fluido.' },
                { id: 'all', label: 'porque el aire empuja en todas direcciones y los fluidos del cuerpo empujan hacia afuera con la misma presión', correct: true },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Si el aire empuja con 10 toneladas sobre cada metro cuadrado de tu cuerpo…' };
          })(),
          prompt: '¿Por qué no nos aplasta?',
          success: 'En un fluido la presión empuja igual en todas direcciones, y nuestros líquidos están a la misma presión que el aire: las fuerzas se equilibran. Lo que importa en fisiología son las <b>diferencias</b> de presión.',
          draw({ ink }) { allSidesScene(ink, 0, { arrows: 1, inside: 1 }); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.plate,
          caption: 'Por eso los tensiómetros no miden la presión total, sino cuánto supera a la atmosférica: la presión <b>manométrica</b>. «120 mmHg» significa 120 mmHg por encima del aire que nos rodea.',
          draw({ ink }) { allSidesScene(ink, 0, { arrows: 1, inside: 1 }); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.plate,
          caption: 'En medicina se usan otras unidades: el milímetro de mercurio (1 mmHg = 133,3 Pa; en la lección 1.3 verás de dónde sale) y, en respiratorio, el cm de agua (1 cmH₂O ≈ 98 Pa).',
          draw({ ink }) {
            table(ink, 'units', [{ h: 'unidad', w: 120 }, { h: 'en pascales', w: 130 }, { h: 'dónde se usa', w: 190 }], [
              ['1 Pa', '1', 'física (SI)'], ['1 kPa', '1000', 'física, fisiología'], ['1 mmHg', '133,3', 'presión arterial'], ['1 cmH₂O', '98', 'ventilación mecánica'], ['1 atm', '101 325', '= 760 mmHg'],
            ], { right: false, x: Math.max(28, ink.W / 2 - 220), y: Math.max(20, ink.H / 2 - 90), rh: 30 });
          },
        },
        {
          kind: 'do', cam: CAM.plate,
          ...askNumber({ key: 'conv', label: '', unit: 'kPa', answer: 16.0, rel: 0.01, wrong: [[16000, 'Eso está en pascales. Divide entre 1000 para pasar a kPa.'], [0.9, 'Dividiste. Cada mmHg vale 133,3 Pa: hay que multiplicar.', 0.05], [120, 'Falta convertir: multiplica por 133,3 Pa/mmHg.']] }),
          caption: (S) => S.g.conv?.msg ?? (S.g.conv?.wrong ? 'mmHg × 133,3 → Pa; Pa ÷ 1000 → kPa.' : 'Una presión sistólica típica es 120 mmHg.'),
          prompt: 'Exprésala en kilopascales.',
          success: '120 × 133,3 = 15 996 Pa ≈ 16,0 kPa: unas 0,16 atmósferas por encima de la presión del aire.',
          draw({ ink }) { plateScene(ink, 0, {}); },
        },
      ],
    },
    // ============================================================ 5
    {
      id: 'ulceras', title: 'Caso clínico: úlceras por presión', short: 'Úlceras', num: '5',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.bed,
          caption: 'Un paciente encamado no se mueve. Casi todo su peso se reparte sobre la espalda, pero en el sacro, donde el hueso está cerca de la piel, el área de apoyo es pequeña.',
          draw({ ink }, t) { bedsoreScene(ink, { arrows: ramp(t, 0.5, 1) }); },
        },
        {
          kind: 'do', cam: CAM.bed,
          ...askNumber({ key: 'sacro', label: '$P$ =', unit: 'mmHg', answer: 150 / 30e-4 / MMHG, rel: 0.03, wrong: [[150 / 30e-4, 'Ese resultado está en Pa. Divide entre 133,3 para pasar a mmHg.', 0.03], [150 / 30 / MMHG, 'El área va en m²: 30 cm² = 30 × 10⁻⁴ m².', 0.05]] }),
          caption: (S) => S.g.sacro?.msg ?? (S.g.sacro?.wrong ? '$P$ = $F/A$ con $A$ en m²; luego Pa → mmHg.' : 'Sobre el sacro descansan unos 150 N repartidos en 30 cm².'),
          prompt: '¿Qué presión soporta la piel del sacro, en mmHg?',
          success: '150 / 0,003 = 50 000 Pa ≈ 375 mmHg.',
          draw({ ink }) { bedsoreScene(ink, { arrows: 1 }); },
        },
        {
          kind: 'do', cam: CAM.bed,
          ...(() => {
            const c = askChoice({
              key: 'ulcer', choices: [
                { id: 'cap', label: 'la presión externa supera la de los capilares, los aplasta y el tejido se queda sin sangre', correct: true },
                { id: 'heat', label: 'el colchón calienta demasiado la piel', why: 'El calor y la humedad influyen, pero el mecanismo principal es mecánico: la presión.' },
                { id: 'germ', label: 'la piel se infecta por estar quieta', why: 'La infección puede venir después; primero el tejido muere por falta de flujo.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Dato: la sangre en los capilares de la piel está a unos 30 mmHg.' };
          })(),
          prompt: '¿Por qué aparece una úlcera si el paciente no se mueve durante horas?',
          success: '375 mmHg » 30 mmHg: los capilares se cierran, no llega oxígeno y el tejido muere. Por eso se cambia de posición al paciente cada 2 horas y se usan colchones que reparten el peso en más área.',
          draw({ ink }) { bedsoreScene(ink, { arrows: 1 }); },
        },
      ],
    },
    // ============================================================ 6
    practiceChapter({ num: '6', seed: 61101, kinds: ['P', 'cmp', 'F', 'mm2k', 'A', 'abs', 'k2mm'], make: makeProblem, draw: drawProblem, cam: () => CAM.foam }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '7',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica 1.1 · Resumen',
          title: '¿Qué es la presión?',
          ideas: [
            'Tu experimento: el efecto crece con la fuerza y crece al reducir el área. Esa magnitud es la presión: <span class="m"><i>P</i> = <i>F</i>/<i>A</i></span>.',
            'Misma fuerza en menos área → más presión: la aguja (50 MPa) frente al dedo (50 kPa); el sacro de un paciente encamado (≈ 375 mmHg).',
            '1 Pa = 1 N/m² (muy poco). <span class="m"><i>P</i><sub>0</sub></span> ≈ 101 325 Pa = 760 mmHg. 1 mmHg = 133,3 Pa.',
            'En un fluido la presión empuja en todas direcciones. Por eso importan las <b>diferencias</b>: los tensiómetros miden presión manométrica (sobre la atmosférica).',
          ],
          next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#profundidad">1.2 · Presión y profundidad ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};
