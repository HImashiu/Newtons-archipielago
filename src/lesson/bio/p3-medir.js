// Biofísica 1.3 — Medir la presión: mmHg, manómetros y Pascal  (Semana 7)
// Guion: docs/biofisica-presion-guion.md, lección 1.3.
//
// El mmHg deja de ser una unidad mágica: el estudiante reconstruye el
// barómetro de Torricelli, calcula por qué la columna mide 760 mm y de dónde
// sale 1 mmHg = 133,3 Pa. Después usa el mismo principio (misma altura, misma
// presión) en el tubo en U y en el manómetro, y llega a Pascal y al manguito.

import { ramp, clamp, snap, lerp, easeInOut } from '../core/anim.js';
import { UI_ES, G, MMHG, P_ATM, n, rect, shape, gauge, readout, formula, surfaceMark, titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick } from './kit.js';

const RHO_HG = 13600;
const RHO_W = 1000;

const CAM = {
  title: { xmin: -2.4, xmax: 4.4, ymin: -0.6, ymax: 3.8 },
  baro: { xmin: -2.6, xmax: 5.4, ymin: -0.7, ymax: 3.9 },
  baroP: { xmin: -2.2, xmax: 3.6, ymin: -0.7, ymax: 3.9 },
  utube: { xmin: -1.6, xmax: 4.6, ymin: -0.6, ymax: 3.9 },
  press: { xmin: -1.2, xmax: 5.6, ymin: -0.8, ymax: 3.6 },
  arm: { xmin: -1.8, xmax: 6.4, ymin: -1.6, ymax: 2.2 },
};

// --------------------------------------------------------- barometer

/**
 * Torricelli: a tube closed at the top, inverted in a dish. `fill` 0..1 is the
 * column height as a fraction of the tube (before release it is full). The
 * column scale is k world units per metre of liquid.
 */
function barometer(ink, colH, o = {}) {
  const x = 0, w = 0.28, tubeTop = 3.4, dishY = 0.35;
  const liquid = o.water ? 'fluid-3' : 'part';
  // Dish.
  rect(ink, 'dish-l', -1.1, 0, 1.1, dishY, o.water ? 'fluid' : 'blood-2', { layer: 'trails' });
  ink.poly('dish', [{ x: -1.2, y: 0.55 }, { x: -1.1, y: 0 }, { x: 1.1, y: 0 }, { x: 1.2, y: 0.55 }], 'ink heavy', { layer: 'statics' });
  surfaceMark(ink, 'dish-s', 0.75, dishY);
  // Column of liquid inside the tube, vacuum above.
  const top = Math.min(tubeTop - 0.02, dishY + colH);
  rect(ink, 'col', x - w / 2, 0.12, x + w / 2, top, o.water ? 'fluid-3' : 'mercury', { layer: 'bodies' });
  if (top < tubeTop - 0.05) ink.text('vac', { x: x - w / 2, y: (top + tubeTop) / 2 }, 'vacío', { size: 13, cls: 'mid', dx: -8, dy: 4, anchor: 'end' });
  ink.poly('tube', [{ x: x - w / 2, y: 0.12 }, { x: x - w / 2, y: tubeTop }, { x: x + w / 2, y: tubeTop }, { x: x + w / 2, y: 0.12 }], 'ink heavy', { layer: 'statics' });
  if (o.air) {
    for (const xx of [-0.85, 0.85]) ink.arrow(`air${xx}`, { x: xx, y: dishY + 0.75 }, { x: xx, y: dishY + 0.05 }, 'blue heavy', { head: 10, headW: 3.4, op: o.air });
    ink.text('air-l', { x: 0.85, y: dishY + 0.75 }, '$P_0$', { dx: 10, dy: 2, size: 16, anchor: 'start', cls: 'blue-tx', op: o.air });
  }
  if (o.dim) ink.dimension('h', { x: x + w / 2 + 0.1, y: dishY }, { x: x + w / 2 + 0.1, y: top }, 30, o.dim, { size: 15 });
  ink.line('ref', { x: -1.4, y: dishY }, { x: 1.6, y: dishY }, 'dashdot', { layer: 'annotations', op: o.ref ?? 0 });
  if (o.ref) ink.text('ref-l', { x: 1.6, y: dishY }, 'misma altura → misma presión', { dx: 6, dy: 5, size: 13, anchor: 'start', cls: 'mid', op: o.ref });
}

// ------------------------------------------------------------ U-tube

function uGeom() {
  const a = 0.6, R = 0.6, yT = 2.8, yB = 0.75, w = 0.32;
  const L1 = yT - yB, Larc = Math.PI * R;
  const at = (s) => {
    if (s <= L1) return { p: { x: a, y: yT - s }, t: { x: 0, y: -1 } };
    if (s <= L1 + Larc) {
      const th = Math.PI + (s - L1) / R;
      return { p: { x: a + R + R * Math.cos(th), y: yB + R * Math.sin(th) }, t: { x: -Math.sin(th), y: Math.cos(th) } };
    }
    return { p: { x: a + 2 * R, y: yB + (s - L1 - Larc) }, t: { x: 0, y: 1 } };
  };
  return { a, R, yT, yB, w, L1, Larc, at, total: 2 * L1 + Larc, xL: a, xR: a + 2 * R };
}

function uBand(ink, key, U, s0, s1, cls) {
  const N = 40;
  const l = [], r = [];
  for (let i = 0; i <= N; i++) {
    const { p, t } = U.at(s0 + ((s1 - s0) * i) / N);
    l.push({ x: p.x - (t.y * U.w) / 2, y: p.y + (t.x * U.w) / 2 });
    r.push({ x: p.x + (t.y * U.w) / 2, y: p.y - (t.x * U.w) / 2 });
  }
  shape(ink, key, [...l, ...r.reverse()], cls, { layer: 'trails' });
}

function uWalls(ink, U) {
  for (const [k, sg] of [['o', 1], ['i', -1]]) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const { p, t } = U.at((U.total * i) / 80);
      pts.push({ x: p.x - (t.y * sg * U.w) / 2, y: p.y + (t.x * sg * U.w) / 2 });
    }
    ink.poly(`u-wall-${k}`, pts, 'ink heavy', { layer: 'statics' });
  }
}

/** Levels yL, yR (world) of a single liquid, or water + oil (hOil above yI on the right). */
function uTube(ink, o = {}) {
  const U = uGeom();
  uWalls(ink, U);
  const sOf = (side, y) => (side === 'L' ? U.yT - y : U.L1 + U.Larc + (y - U.yB));
  if (o.oil) {
    const { yI, hOil, rhoOil, k } = o.oil;
    const hW = (rhoOil * hOil) / RHO_W;
    uBand(ink, 'u-w', U, sOf('L', yI + hW), sOf('R', yI), 'fluid-3');
    uBand(ink, 'u-o', U, sOf('R', yI), sOf('R', yI + hOil), 'fluid-2');
    ink.line('u-ref', { x: U.xL - 0.6, y: yI }, { x: U.xR + 0.6, y: yI }, 'dashdot', { layer: 'annotations' });
    ink.text('u-ref-l', { x: U.xR + 0.6, y: yI }, 'misma presión', { dx: 6, dy: 5, size: 13, anchor: 'start', cls: 'mid' });
    ink.dimension('u-hw', { x: U.xL - 0.16, y: yI }, { x: U.xL - 0.16, y: yI + hW }, -20, o.showHw === false ? '$h_1$ = ?' : `$h_1$ = ${n(hW / k, 1)} cm`, { size: 14 });
    ink.dimension('u-ho', { x: U.xR + 0.16, y: yI }, { x: U.xR + 0.16, y: yI + hOil }, 20, `$h_2$ = ${n(hOil / k, 1)} cm`, { size: 14 });
    ink.text('u-ol', { x: U.xR, y: yI + hOil }, `aceite · ${n(rhoOil)} kg/m³`, { dx: 24, dy: -6, size: 13, anchor: 'start', cls: 'mid' });
    ink.text('u-wl', { x: U.xL, y: U.yB - 0.3 }, 'agua', { dx: -40, dy: 4, size: 13, anchor: 'end', cls: 'mid' });
    return U;
  }
  const yL = o.yL ?? 1.9, yR = o.yR ?? 1.9;
  uBand(ink, 'u-w', U, sOf('L', yL), sOf('R', yR), o.cls ?? 'fluid-3');
  if (o.gas) {
    // The right arm opens into a closed chamber of gas sitting on top of it.
    const c0 = U.xR - 0.65, c1 = U.xR + 0.65, b = U.yT, t = U.yT + 0.8;
    rect(ink, 'gas', c0, b, c1, t, 'fluid', { layer: 'trails' });
    ink.poly('gas-w', [{ x: U.xR - U.w / 2, y: b }, { x: c0, y: b }, { x: c0, y: t }, { x: c1, y: t }, { x: c1, y: b }, { x: U.xR + U.w / 2, y: b }], 'ink heavy', { layer: 'statics' });
    ink.text('gas-l', { x: U.xR, y: b + 0.4 }, o.gasLabel ?? 'gas', { size: 15, dy: 5 });
    ink.text('open', { x: U.xL, y: U.yT }, 'abierto: $P_0$', { dy: -10, size: 13, cls: 'mid' });
  }
  if (o.dh && Math.abs(yL - yR) > 0.03) {
    ink.line('dh-ref', { x: U.xL, y: Math.min(yL, yR) }, { x: U.xR + 0.3, y: Math.min(yL, yR) }, 'drop', { layer: 'annotations' });
    ink.dimension('dh', { x: U.xL - 0.2, y: Math.min(yL, yR) }, { x: U.xL - 0.2, y: Math.max(yL, yR) }, -18, o.dh, { size: 14 });
  }
  return U;
}

// ------------------------------------------------------- Pascal press

function pressScene(ink, F1, ratio, o = {}) {
  const A1w = 0.36, A2w = 0.36 * Math.sqrt(ratio);
  const xs = 0.4, xb = 2.6;
  const rise = o.rise ?? 0; // how far the big piston has risen (world)
  const yF = 0.9 + rise, depth = 0.5;
  const ySmall = 1.5 - rise * ratio * 0.05;
  rect(ink, 'pr-c', xs - A1w / 2, 0, xb + A2w / 2, depth, 'fluid', { layer: 'trails' });
  rect(ink, 'pr-s', xs - A1w / 2, depth, xs + A1w / 2, ySmall, 'fluid', { layer: 'trails' });
  rect(ink, 'pr-b', xb - A2w / 2, depth, xb + A2w / 2, yF, 'fluid', { layer: 'trails' });
  ink.poly('pr-wall', [{ x: xs - A1w / 2, y: 2.7 }, { x: xs - A1w / 2, y: 0 }, { x: xb + A2w / 2, y: 0 }, { x: xb + A2w / 2, y: 2.7 }], 'ink heavy', { layer: 'statics' });
  ink.poly('pr-wall2', [{ x: xs + A1w / 2, y: 2.7 }, { x: xs + A1w / 2, y: depth }, { x: xb - A2w / 2, y: depth }, { x: xb - A2w / 2, y: 2.7 }], 'ink heavy', { layer: 'statics' });
  rect(ink, 'pr-p1', xs - A1w / 2 + 0.02, ySmall, xs + A1w / 2 - 0.02, ySmall + 0.18, 'piston');
  rect(ink, 'pr-p2', xb - A2w / 2 + 0.02, yF, xb + A2w / 2 - 0.02, yF + 0.18, 'piston');
  if (o.load) {
    rect(ink, 'pr-load', xb - 0.5, yF + 0.18, xb + 0.5, yF + 0.68, 'weight');
    ink.text('pr-load-l', { x: xb, y: yF + 0.43 }, o.load, { dy: 5, size: 14 });
  }
  ink.arrow('pr-F1', { x: xs, y: ySmall + 0.95 }, { x: xs, y: ySmall + 0.2 }, 'accent heavy', { head: 12, headW: 4 });
  ink.text('pr-F1l', { x: xs, y: ySmall + 0.95 }, `$F_1$ = ${n(F1)} N`, { dy: -8, size: 16, cls: 'accent-tx' });
  const F2 = F1 * ratio;
  if (o.showF2 !== false) ink.text('pr-F2l', { x: xb + A2w / 2, y: yF + 0.1 }, `$F_2$ = ${n(F2)} N`, { dx: 12, dy: 5, size: 16, anchor: 'start', cls: 'halo' });
  ink.text('pr-A1', { x: xs, y: 0 }, '$A_1$', { dy: 22, size: 15 });
  ink.text('pr-A2', { x: xb, y: 0 }, `$A_2$ = ${n(ratio)} $A_1$`, { dy: 22, size: 15 });
  if (o.gauges) {
    // Equal pressure rise everywhere in the confined fluid.
    const P = F1 / 2;
    for (const [i, x] of [[0, 1.1], [1, 1.6], [2, 2.1]]) {
      ink.line(`pg-s${i}`, { x, y: 0 }, { x, y: -0.25 }, 'ink', { layer: 'statics' });
      gauge(ink, `pg${i}`, { x, y: -0.45 }, P, 30, { r: 15 });
    }
  }
}

// -------------------------------------------------------------- cuff

function cuffScene(ink, Pcuff, o = {}) {
  // Cross-section of an upper arm: skin, muscle, bone and the brachial artery.
  const c = { x: 0.6, y: 0.6 };
  const R = 1.1;
  const squeeze = clamp(Pcuff / 200);
  ink.circle('arm', c, R * ink.k, 'skin', { layer: 'trails' });
  ink.circle('arm-o', c, R * ink.k, 'ink', { layer: 'statics' });
  ink.circle('bone', { x: c.x + 0.15, y: c.y + 0.1 }, 0.28 * ink.k, 'part', { layer: 'bodies' });
  const art = { x: c.x - 0.45, y: c.y - 0.35 };
  const open = clamp(1 - Math.max(0, Pcuff - (o.Part ?? 100)) / 25);
  ink.path('artery', ellipse(ink, art, 0.16, 0.16 * Math.max(0.08, open)), 'blood-2', { layer: 'bodies' });
  ink.path('artery-o', ellipse(ink, art, 0.16, 0.16 * Math.max(0.08, open)), 'ink', { layer: 'statics' });
  ink.text('art-l', art, 'arteria braquial', { dy: 32, size: 13, cls: 'mid halo' });
  // The cuff: a ring around the arm, thicker when inflated.
  const t = 0.12 + 0.12 * squeeze;
  ink.path('cuff', `${circlePath(ink, c, R + t + 0.02)}${circlePath(ink, c, R + 0.02, true)}`, 'cuff', { layer: 'bodies' });
  for (let i = 0; i < 10; i++) {
    const a = (2 * Math.PI * i) / 10;
    const u = { x: Math.cos(a), y: Math.sin(a) };
    ink.arrow(`cf${i}`, { x: c.x + u.x * (R + 0.42), y: c.y + u.y * (R + 0.42) }, { x: c.x + u.x * (R + 0.06), y: c.y + u.y * (R + 0.06) }, 'blue', { head: 7, headW: 2.4, op: squeeze });
  }
  gauge(ink, 'cuff-g', { x: c.x + 2.6, y: c.y + 0.4 }, Pcuff, 300, { r: 34, label: `${n(Pcuff, 0)} mmHg`, size: 16 });
  ink.line('cuff-tube', { x: c.x + R + t, y: c.y + 0.2 }, { x: c.x + 2.6 - 0.36, y: c.y + 0.35 }, 'ink', { layer: 'statics' });
  // Inflation bulb (the handle drags it).
  const bulb = { x: c.x + 2.6, y: c.y - 0.75 - Pcuff / 200 };
  ink.path('bulb', ellipse(ink, bulb, 0.22, 0.32), 'part', { layer: 'bodies' });
  ink.line('bulb-t', { x: bulb.x, y: bulb.y + 0.32 }, { x: c.x + 2.6, y: c.y + 0.4 - 0.36 }, 'ink', { layer: 'statics' });
  ink.text('bulb-l', bulb, 'pera: arrástrala hacia abajo para inflar', { dx: 26, dy: 5, size: 13, anchor: 'start', cls: 'mid' });
}

function ellipse(ink, c, rx, ry) {
  const s = ink.S(c);
  const a = rx * ink.k, b = ry * ink.k;
  return `M${(s.x - a).toFixed(1)},${s.y.toFixed(1)}A${a.toFixed(1)},${b.toFixed(1)} 0 1 0 ${(s.x + a).toFixed(1)},${s.y.toFixed(1)}A${a.toFixed(1)},${b.toFixed(1)} 0 1 0 ${(s.x - a).toFixed(1)},${s.y.toFixed(1)}Z`;
}

function circlePath(ink, c, r, rev = false) {
  const s = ink.S(c);
  const R = r * ink.k;
  const sweep = rev ? 0 : 1;
  return `M${(s.x - R).toFixed(1)},${s.y.toFixed(1)}A${R.toFixed(1)},${R.toFixed(1)} 0 1 ${sweep} ${(s.x + R).toFixed(1)},${s.y.toFixed(1)}A${R.toFixed(1)},${R.toFixed(1)} 0 1 ${sweep} ${(s.x - R).toFixed(1)},${s.y.toFixed(1)}Z`;
}

// ---------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'col': {
      const fl = pick(rnd, [['mercurio', RHO_HG], ['agua', RHO_W], ['aceite', 800], ['alcohol', 790]]);
      const ans = P_ATM / (fl[1] * G);
      return {
        kind, ask: `Si Torricelli hubiera usado ${fl[0]} ($ρ$ = ${n(fl[1])} kg/m³), ¿qué altura tendría la columna? (m)`,
        given: [['$P_0$', '101 325 Pa'], ['$ρ$', `${n(fl[1])} kg/m³`]],
        number: { label: '$h$ =', unit: 'm', answer: ans, d: 2 }, rho: fl[1],
        hint: 'La columna se equilibra con el aire: $P_0$ = $ρ$ $g$ $h$. Despeja $h$.',
        solution: [{ text: 'Equilibrio:', math: '$h$ = $P_0$ / ($ρ$ $g$)' }, { text: 'Sustituyendo:', math: `101 325 / (${n(fl[1])}·9,8) = ${n(ans, 2)} m` }],
        why: `$h$ = ${n(ans, 2)} m.`,
      };
    }
    case 'cmh2o': {
      const mm = pick(rnd, [5, 10, 15, 20, 30]);
      return {
        kind, ask: `En un ventilador mecánico se programan ${mm} cmH₂O. ¿Cuántos mmHg son?`,
        given: [['1 cmH₂O', '1000·9,8·0,01 = 98 Pa'], ['1 mmHg', '133,3 Pa']],
        number: { label: '', unit: 'mmHg', answer: (mm * 98) / MMHG, d: 1 }, rho: RHO_W,
        hint: 'Pasa a pascales (× 98) y luego a mmHg (÷ 133,3).',
        solution: [{ text: 'A pascales:', math: `${mm}·98 = ${mm * 98} Pa` }, { text: 'A mmHg:', math: `${mm * 98} / 133,3 = ${n((mm * 98) / MMHG, 1)} mmHg` }],
        why: `${mm} cmH₂O ≈ ${n((mm * 98) / MMHG, 1)} mmHg.`,
      };
    }
    case 'utube': {
      const rho = pick(rnd, [700, 800, 900]);
      const h2 = pick(rnd, [5, 8, 10, 12, 15]);
      const ans = (rho * h2) / RHO_W;
      return {
        kind, ask: `Tubo en U con agua y un aceite de ${rho} kg/m³. La columna de aceite mide ${h2} cm. ¿Qué altura de agua la equilibra (medida desde la interfase)?`,
        given: [['$ρ_{agua}$', '1000 kg/m³'], ['$ρ_{aceite}$', `${rho} kg/m³`], ['$h_2$', `${h2} cm`]],
        number: { label: '$h_1$ =', unit: 'cm', answer: ans, d: 1 }, rho, h2,
        hint: 'A la altura de la interfase las presiones son iguales: $ρ_1$ $h_1$ = $ρ_2$ $h_2$.',
        solution: [{ text: 'Equilibrio:', math: '$ρ_1$ $h_1$ = $ρ_2$ $h_2$' }, { text: 'Despejando:', math: `$h_1$ = ${rho}·${h2}/1000 = ${n(ans, 1)} cm` }],
        why: `$h_1$ = ${n(ans, 1)} cm.`,
      };
    }
    case 'mano': {
      const cm = pick(rnd, [2, 5, 10, 20, 27]);
      const fl = pick(rnd, [['agua', RHO_W], ['mercurio', RHO_HG]]);
      const ans = (fl[1] * G * cm) / 100 / MMHG;
      return {
        kind, ask: `Un manómetro de ${fl[0]} conectado a un recipiente muestra una diferencia de niveles de ${cm} cm. ¿Cuál es la presión manométrica del recipiente en mmHg?`,
        given: [['Δ$h$', `${cm} cm`], ['$ρ$', `${n(fl[1])} kg/m³`]],
        number: { label: '$P$ =', unit: 'mmHg', answer: ans, d: 1 }, rho: fl[1],
        hint: fl[1] === RHO_HG ? 'Con mercurio es directo: cada mm de diferencia es 1 mmHg.' : 'Δ$P$ = $ρ$ $g$ Δ$h$ en Pa, luego ÷ 133,3.',
        solution: [{ text: 'Δ$P$ = $ρ$ $g$ Δ$h$:', math: `${n(fl[1])}·9,8·${n(cm / 100, 2)} = ${n((fl[1] * G * cm) / 100, 0)} Pa` }, { text: 'En mmHg:', math: `${n(ans, 1)} mmHg` }],
        why: `${n(ans, 1)} mmHg.`,
      };
    }
    case 'pascal': {
      const F1 = pick(rnd, [10, 20, 25, 40]);
      const ratio = pick(rnd, [10, 20, 40, 50]);
      return {
        kind, ask: `Prensa hidráulica con $A_2$ = ${ratio}·$A_1$. Se empuja con $F_1$ = ${F1} N. ¿Qué fuerza aparece en el émbolo grande?`,
        given: [['$F_1$', `${F1} N`], ['$A_2/A_1$', `${ratio}`]],
        number: { label: '$F_2$ =', unit: 'N', answer: F1 * ratio, d: 0 }, F1, ratio,
        hint: 'La presión es la misma en los dos émbolos: $F_1/A_1$ = $F_2/A_2$.',
        solution: [{ text: 'Pascal:', math: '$F_2$ = $F_1$·$A_2/A_1$' }, { text: 'Sustituyendo:', math: `${F1}·${ratio} = ${F1 * ratio} N` }],
        why: `$F_2$ = ${F1 * ratio} N.`,
      };
    }
    default: {
      const ratio = pick(rnd, [10, 20, 40, 50]);
      const d2 = pick(rnd, [1, 2, 5]);
      return {
        kind: 'travel', ask: `En una prensa con $A_2$ = ${ratio}·$A_1$, ¿cuántos cm debe bajar el émbolo pequeño para que el grande suba ${d2} cm?`,
        given: [['$A_2/A_1$', `${ratio}`], ['Δ$x_2$', `${d2} cm`]],
        number: { label: 'Δ$x_1$ =', unit: 'cm', answer: ratio * d2, d: 0 }, F1: 20, ratio,
        hint: 'El volumen que sale de un cilindro entra en el otro: $A_1$ Δ$x_1$ = $A_2$ Δ$x_2$.',
        solution: [{ text: 'Volumen conservado:', math: '$A_1$ Δ$x_1$ = $A_2$ Δ$x_2$' }, { text: 'Despejando:', math: `Δ$x_1$ = ${ratio}·${d2} = ${ratio * d2} cm` }],
        why: `${ratio * d2} cm: lo que se gana en fuerza se paga en recorrido.`,
      };
    }
  }
}

function drawProblem(ink, p) {
  if (p.kind === 'col' || p.kind === 'cmh2o') { barometer(ink, clamp((P_ATM / ((p.rho ?? RHO_HG) * G)) * (2.5 / 0.76) * 0.08 + 0.4, 0.4, 3), { water: p.rho !== RHO_HG, air: 1 }); return; }
  if (p.kind === 'utube') { uTube(ink, { oil: { yI: 1.2, hOil: p.h2 * 0.09, rhoOil: p.rho, k: 0.09 }, showHw: false }); return; }
  if (p.kind === 'mano') { uTube(ink, { yL: 2.1, yR: 1.5, gas: true, dh: 'Δ$h$' }); return; }
  pressScene(ink, p.F1 ?? 20, p.ratio ?? 20, { showF2: false });
}

const practiceCam = (S) => ({ col: CAM.baroP, cmh2o: CAM.baroP, utube: CAM.utube, mano: CAM.utube })[S.practice?.prob?.kind] ?? CAM.press;

// ------------------------------------------------------------- lesson

export const p3 = {
  id: 'bio-p3', code: '1.3', title: 'Medir la presión', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.baro, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, gasP: 0, gasSeen: new Set(), ratio: 5, Pcuff: 0, cuffSeen: new Set() }),
  chapters: [
    {
      id: 'intro', title: 'Medir la presión', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Presión · Lección 1.3',
          title: 'Medir la presión',
          sub: '¿Por qué la presión arterial se mide en milímetros de mercurio? Reconstruye el experimento de Torricelli y descubre cómo funciona un tensiómetro.',
          meta: 'Unos 25 minutos · Semana 7 · Torricelli · Tubo en U · Pascal · Manguito',
        }),
        draw({ ink }, t) { barometer(ink, lerp(3.0, 2.5, ramp(t, 1, 2, easeInOut)), { air: ramp(t, 2.5, 1) }); },
      }],
    },
    // ============================================================ 1
    {
      id: 'torricelli', title: 'El experimento de Torricelli', short: 'Torricelli', num: '1',
      beats: [
        {
          kind: 'watch', dur: 6, cam: CAM.baro,
          caption: 'Italia, 1643. Torricelli llena de mercurio un tubo de un metro, lo tapa, lo invierte sobre una cubeta de mercurio y lo destapa. La columna baja… y se detiene a unos 76 cm. Arriba queda vacío.',
          draw({ ink }, t) { barometer(ink, lerp(3.0, 2.5, ramp(t, 1.5, 3, easeInOut)), { dim: t > 4.5 ? '760 mm' : null }); },
        },
        {
          kind: 'do', cam: CAM.baro,
          ...(() => {
            const c = askChoice({
              key: 'hold', choices: [
                { id: 'vac', label: 'el vacío de arriba «chupa» el mercurio', why: 'El vacío no tira de nada: es ausencia de materia. Algo tiene que empujar desde abajo.' },
                { id: 'air', label: 'el aire empuja la superficie de la cubeta, y esa presión se transmite al mercurio del tubo', correct: true },
                { id: 'glass', label: 'el mercurio se adhiere al vidrio', why: 'El mercurio casi no moja el vidrio; además, tubos más anchos dan la misma altura.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Pista: la columna se detiene siempre a la misma altura, sin importar el grosor del tubo.' };
          })(),
          prompt: '¿Qué sostiene la columna de mercurio?',
          success: 'El aire empuja la superficie libre de la cubeta. A la altura de esa superficie, dentro y fuera del tubo, la presión es la misma: $P_0$ = $ρ_{Hg}$ $g$ $h$. La columna es una balanza que «pesa» el aire.',
          draw({ ink }) { barometer(ink, 2.5, { air: 1, ref: 1, dim: '$h$' }); },
        },
        {
          kind: 'do', cam: CAM.baroP, panel: 'work',
          ...askNumber({ key: 'hHg', label: '$h$ =', unit: 'm', answer: P_ATM / (RHO_HG * G), rel: 0.01, wrong: [[RHO_HG * G / P_ATM, 'Invertiste el cociente: $h$ = $P_0$ / ($ρ$ $g$).', 0.02], [P_ATM / RHO_HG, 'Falta dividir también por $g$.', 0.02]] }),
          caption: (S) => S.g.hHg?.msg ?? (S.g.hHg?.wrong ? 'Despeja $h$ de $P_0$ = $ρ$ $g$ $h$.' : 'Compruébalo: $ρ_{Hg}$ = 13 600 kg/m³ y $P_0$ = 101 325 Pa.'),
          prompt: '¿Qué altura de mercurio equilibra la atmósfera?',
          success: '101 325 / (13 600·9,8) = 0,760 m = <b>760 mm</b>. Por eso 1 atm = 760 mmHg.',
          work: (S) => [{ h: 'Datos' }, { given: [['$P_0$', '101 325 Pa'], ['$ρ_{Hg}$', '13 600 kg/m³']] }, { step: 1, text: 'Equilibrio en la superficie de la cubeta:', math: '$P_0$ = $ρ$ $g$ $h$', state: 'done' }, { step: 2, text: 'Tu turno: despeja y calcula $h$.', state: S.g.hHg?.ok ? 'done' : 'now' }, ...(S.g.hHg?.ok ? [{ result: '$h$ = 0,760 m', ok: true }] : [])],
          draw({ ink }) { barometer(ink, 2.5, { air: 1, dim: '$h$ = ?' }); },
        },
        {
          kind: 'do', cam: CAM.baroP, panel: 'work',
          ...askNumber({ key: 'hW', label: '$h$ =', unit: 'm', answer: P_ATM / (RHO_W * G), rel: 0.01, wrong: [[0.76, 'Esa es la de mercurio. El agua es 13,6 veces menos densa.', 0.02]] }),
          caption: (S) => S.g.hW?.msg ?? (S.g.hW?.wrong ? '$h$ = $P_0$ / ($ρ_{agua}$ $g$).' : '¿Y si Torricelli hubiera usado agua?'),
          prompt: '¿Qué altura de agua equilibra la atmósfera?',
          success: '≈ 10,3 m: un tubo de la altura de un edificio de tres pisos. Por eso se usa mercurio, 13,6 veces más denso: la columna cabe en una mesa.',
          work: (S) => [{ h: 'Datos' }, { given: [['$P_0$', '101 325 Pa'], ['$ρ_{agua}$', '1000 kg/m³']] }, ...(S.g.hW?.ok ? [{ result: '$h$ ≈ 10,3 m', ok: true }] : [])],
          draw({ ink }) { barometer(ink, 3.0, { water: true, air: 1, dim: '≈ 10 m (tubo cortado)' }); },
        },
        {
          kind: 'do', cam: CAM.baroP, panel: 'work',
          ...askNumber({ key: 'mmHg', label: '1 mmHg =', unit: 'Pa', answer: RHO_HG * G * 0.001, rel: 0.01, wrong: [[RHO_HG * G, 'Eso es para 1 metro de mercurio. 1 mm = 0,001 m.', 0.02], [RHO_HG * G * 0.01, 'Eso es para 1 cm. 1 mm = 0,001 m.', 0.02]] }),
          caption: (S) => S.g.mmHg?.msg ?? (S.g.mmHg?.wrong ? '$ρ$ $g$ $h$ con $h$ = 1 mm = 0,001 m.' : 'Ahora puedes deducir la conversión que usamos en 1.1: un mmHg es la presión de una columna de mercurio de 1 mm.'),
          prompt: '¿Cuántos pascales son 1 mmHg?',
          success: '13 600 · 9,8 · 0,001 ≈ <b>133,3 Pa</b>. «120 mmHg» significa: la sangre empuja tanto como una columna de mercurio de 12 cm.',
          work: (S) => [{ h: 'Definición' }, { given: [['1 mmHg', 'presión de 1 mm de Hg'], ['$ρ_{Hg}$', '13 600 kg/m³']] }, ...(S.g.mmHg?.ok ? [{ result: '1 mmHg ≈ 133,3 Pa', ok: true }] : [])],
          draw({ ink }) { barometer(ink, 2.5, { air: 1, dim: '760 mm' }); },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'manometro', title: 'Tubo en U y manómetro', short: 'Tubo en U', num: '2',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.utube,
          caption: 'Un tubo en U con agua, abierto por los dos lados. Los niveles quedan a la misma altura: a la misma profundidad de un líquido en reposo, la presión es la misma.',
          draw({ ink }) { uTube(ink, { yL: 1.9, yR: 1.9 }); },
        },
        {
          kind: 'do', cam: CAM.utube,
          caption: (S) => `Presión del gas: ${n(S.gasP, 1)} kPa sobre la atmosférica  →  diferencia de niveles ${n((S.gasP * 1000) / (RHO_W * G) * 100, 1)} cm de agua`,
          prompt: 'Conecta un lado a un recipiente con gas y aumenta su presión con el asa. Observa los niveles.',
          success: 'El gas empuja su lado hacia abajo hasta que la columna extra del otro lado lo equilibra: Δ$P$ = $ρ$ $g$ Δ$h$. Eso es un <b>manómetro</b>: convierte presión en altura.',
          draw({ ink, S }) {
            const dh = (S.gasP * 1000) / (RHO_W * G) * 2.0; // world per m of water (drawn x2)
            uTube(ink, { yL: 1.7 + dh / 2, yR: 1.7 - dh / 2, gas: true, dh: `Δ$h$ = ${n((S.gasP * 1000) / (RHO_W * G) * 100, 1)} cm` });
          },
          handles: (S) => [{ key: 'gas', p: { x: 1.8 + 0.65, y: 3.2 - S.gasP / 4 }, r: 26, cursor: 'ns-resize', drag: (S2, p) => {
            S2.gasP = clamp(snap((3.2 - p.y) * 4, 0.1), 0, 2.5);
            if (S2.gasP >= 1.5) S2.gasSeen.add('hi');
          } }],
          done: (S) => S.gasSeen.has('hi'),
          skip(S) { S.gasP = 2; S.gasSeen.add('hi'); },
        },
        {
          kind: 'do', cam: CAM.utube,
          ...askNumber({ key: 'u', label: '$h_1$ =', unit: 'cm', answer: 7, rel: 0.02, wrong: [[14.29, 'Invertiste la proporción: el agua es más densa, su columna es más baja.', 0.02], [10, 'Las alturas solo son iguales si las densidades lo son.']] }),
          caption: (S) => S.g.u?.msg ?? (S.g.u?.wrong ? 'Iguala las presiones de las dos columnas sobre la línea punteada: $ρ_1$ $h_1$ = $ρ_2$ $h_2$.' : 'Ahora dos líquidos que no se mezclan: agua y un aceite de 700 kg/m³, con 10 cm de aceite sobre la interfase.'),
          prompt: '¿Qué altura de agua $h_1$ equilibra los 10 cm de aceite?',
          success: '$ρ_1$ $h_1$ = $ρ_2$ $h_2$ → $h_1$ = 700·10/1000 = 7 cm. Es la misma idea de Torricelli: columnas que se equilibran a la misma altura.',
          draw({ ink, S }) { uTube(ink, { oil: { yI: 1.2, hOil: 1.0, rhoOil: 700, k: 0.1 }, showHw: !!S.g.u?.ok }); },
        },
      ],
    },
    // ============================================================ 3
    {
      id: 'pascal', title: 'Principio de Pascal', short: 'Pascal', num: '3',
      beats: [
        {
          kind: 'watch', dur: 5, cam: CAM.press,
          caption: 'Si empujas el émbolo de un fluido <b>encerrado</b>, la presión aumenta lo mismo en todos sus puntos: los tres manómetros suben igual. Es el <b>principio de Pascal</b>.',
          draw({ ink }, t) { pressScene(ink, 20 * ramp(t, 0.8, 1.5), 5, { gauges: true, showF2: false }); },
        },
        {
          kind: 'do', cam: CAM.press,
          caption: (S) => `$A_2$ = ${n(S.ratio)}·$A_1$  →  $F_2$ = 20 × ${n(S.ratio)} = ${n(20 * S.ratio)} N`,
          prompt: 'Reto: con solo 20 N tienes que levantar una carga de 1000 N. Arrastra el borde del émbolo grande para elegir su área.',
          success: 'Con $A_2$ ≥ 50 $A_1$ la misma presión empuja un área 50 veces mayor: 20 N → 1000 N. $F_1/A_1$ = $F_2/A_2$.',
          draw({ ink, S }) { pressScene(ink, 20, S.ratio, { load: '1000 N', rise: 20 * S.ratio >= 1000 ? 0.15 : 0 }); },
          handles: (S) => [{ key: 'A2', p: { x: 2.6 + (0.36 * Math.sqrt(S.ratio)) / 2, y: 2.2 }, r: 24, cursor: 'ew-resize', drag: (S2, p) => {
            const w = clamp((p.x - 2.6) * 2, 0.36, 0.36 * Math.sqrt(80));
            S2.ratio = clamp(Math.round((w / 0.36) ** 2), 1, 80);
          } }],
          done: (S) => 20 * S.ratio >= 1000,
          skip(S) { S.ratio = 50; },
        },
        {
          kind: 'do', cam: CAM.press,
          ...askNumber({ key: 'travel', label: 'Δ$x_1$ =', unit: 'cm', answer: 50, wrong: [[0.02, 'Al revés: el émbolo pequeño recorre más, no menos.', 0.05], [1, 'El volumen que sale del cilindro pequeño entra en el grande: $A_1$ Δ$x_1$ = $A_2$ Δ$x_2$.']] }),
          caption: (S) => S.g.travel?.msg ?? (S.g.travel?.wrong ? 'El líquido no se crea ni se destruye: el volumen que baja en un lado sube en el otro.' : '¿Es un truco gratis? Para que la carga suba 1 cm…'),
          prompt: '¿Cuántos cm tiene que bajar el émbolo pequeño ($A_2$ = 50 $A_1$)?',
          success: '50 cm. Ganas fuerza, pero pagas en recorrido: $A_2/A_1$ = Δ$x_1$/Δ$x_2$. El trabajo $F$·$d$ es el mismo en los dos lados.',
          draw({ ink }) { pressScene(ink, 20, 50, { load: '1000 N', rise: 0.15 }); },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'manguito', title: 'Cómo funciona el tensiómetro', short: 'Tensiómetro', num: '4',
      beats: [
        {
          kind: 'watch', dur: 5, cam: CAM.arm,
          caption: 'El manguito es una bolsa de aire encerrada alrededor del brazo. Por Pascal, la presión que inflas se transmite por los tejidos blandos hasta la arteria braquial.',
          draw({ ink }, t) { cuffScene(ink, 60 * ramp(t, 0.5, 2.5)); },
        },
        {
          kind: 'do', cam: CAM.arm,
          caption: (S) => (S.Pcuff > 120 ? 'La arteria está cerrada: no pasa sangre.' : S.Pcuff > 80 ? 'La arteria se abre solo en el pico de cada latido.' : 'La arteria queda abierta todo el tiempo.'),
          prompt: 'Infla el manguito con el asa del manómetro hasta cerrar la arteria (la presión sistólica de este paciente es 120 mmHg).',
          success: 'Cuando la presión del manguito supera la sistólica, la arteria se cierra. Al desinflar, el momento en que vuelve a pasar sangre marca la sistólica. Lo harás tú mismo en la lección 1.5.',
          draw({ ink, S }) { cuffScene(ink, S.Pcuff, { Part: 120 }); },
          handles: (S) => [{ key: 'pump', p: { x: 0.6 + 2.6, y: 0.6 - 0.75 - S.Pcuff / 200 }, r: 26, cursor: 'ns-resize', drag: (S2, p) => {
            S2.Pcuff = clamp(snap((0.6 - 0.75 - p.y) * 200, 5), 0, 200);
            if (S2.Pcuff > 125) S2.cuffSeen.add('closed');
          } }],
          done: (S) => S.cuffSeen.has('closed'),
          skip(S) { S.Pcuff = 140; S.cuffSeen.add('closed'); },
        },
        {
          kind: 'do', cam: CAM.arm,
          ...(() => {
            const c = askChoice({
              key: 'cuffw', choices: [
                { id: 'high', label: 'da lecturas falsamente altas: hace falta más presión para transmitirla hasta la arteria', correct: true },
                { id: 'low', label: 'da lecturas falsamente bajas', why: 'Un manguito estrecho transmite peor la presión a la profundidad de la arteria: hay que inflarlo más para cerrarla.' },
                { id: 'same', label: 'no importa: la presión es la misma en todo el aire del manguito', why: 'En el aire sí (Pascal), pero el brazo no es un fluido encerrado: una banda estrecha comprime una zona pequeña y la presión se pierde hacia los lados.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Un error frecuente es usar un manguito demasiado estrecho en un brazo grueso.' };
          })(),
          prompt: '¿Qué efecto tiene un manguito demasiado estrecho?',
          success: 'Sobreestima la presión arterial. Por eso el ancho del manguito debe ser ≈ 40 % del perímetro del brazo.',
          draw({ ink }) { cuffScene(ink, 140, { Part: 120 }); },
        },
      ],
    },
    // ============================================================ 5
    practiceChapter({ num: '5', seed: 61303, kinds: ['col', 'mano', 'utube', 'pascal', 'travel', 'cmh2o'], make: makeProblem, draw: drawProblem, cam: practiceCam }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica 1.3 · Resumen',
          title: 'Medir la presión',
          ideas: [
            'Torricelli: el aire sostiene una columna de 760 mm de mercurio (<span class="m"><i>P</i><sub>0</sub> = <i>ρgh</i></span>). Con agua harían falta 10,3 m.',
            '1 mmHg es la presión de 1 mm de mercurio: 13 600 · 9,8 · 0,001 ≈ 133,3 Pa.',
            'A la misma altura de un líquido en reposo, la misma presión. Manómetro: Δ<span class="m"><i>P</i> = <i>ρg</i>Δ<i>h</i></span>; dos líquidos: <span class="m"><i>ρ</i><sub>1</sub><i>h</i><sub>1</sub> = <i>ρ</i><sub>2</sub><i>h</i><sub>2</sub></span>.',
            'Pascal: en un fluido encerrado la presión se transmite a todo el fluido. <span class="m"><i>F</i><sub>1</sub>/<i>A</i><sub>1</sub> = <i>F</i><sub>2</sub>/<i>A</i><sub>2</sub></span> y <span class="m"><i>A</i><sub>2</sub>/<i>A</i><sub>1</sub> = Δ<i>x</i><sub>1</sub>/Δ<i>x</i><sub>2</sub></span>.',
            'El manguito transmite su presión a la arteria: cuando supera la sistólica, la cierra. Un manguito estrecho sobreestima la presión.',
          ],
          next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#gravedad">1.4 · La sangre y la gravedad ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};
