// Biofísica 1.5 — Presión arterial  (Semana 7, bloque «Presión»)
// Guion: docs/biofisica-presion-guion.md, lección 1.5.
//
// El estudiante lee la onda de presión con un cursor, encuentra la presión
// media equilibrando áreas (y descubre por qué no es el promedio de 120 y
// 80), predice dónde cae la presión en el circuito y toma él mismo una
// lectura con un manguito que se desinfla, incluido el error de hacerlo
// demasiado rápido. Cierra con los cuatro casos de la clase.

import { ramp, clamp, snap } from '../core/anim.js';
import {
  UI_ES, n, rect, axes, curve, readout, table, titleCard, summaryCard,
  practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';

const T = 0.8; // s per beat

/** Arterial pressure over one cycle (phase 0..1), sys/dia mmHg. */
export function arterial(phi, sys = 120, dia = 80) {
  const u = ((phi % 1) + 1) % 1;
  const k = 4.2, rise = 0.13;
  if (u < rise) return dia + (sys - dia) * Math.sin((Math.PI / 2) * (u / rise)) ** 1.6;
  const s = (u - rise) / (1 - rise);
  const decay = (Math.exp(-k * s) - Math.exp(-k)) / (1 - Math.exp(-k));
  const notch = -0.06 * Math.exp(-(((s - 0.24) / 0.035) ** 2)) + 0.045 * Math.exp(-(((s - 0.3) / 0.05) ** 2));
  return dia + (sys - dia) * (decay + notch);
}

/** True time-average of the waveform (≈ 90.6 mmHg for 120/80). */
export function meanPressure(sys = 120, dia = 80) {
  let s = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) s += arterial(i / N, sys, dia);
  return s / N;
}
const MEAN = meanPressure();

const CAM = {
  title: { xmin: -0.9, xmax: 7.6, ymin: -0.9, ymax: 3.6 },
  wave: { xmin: -0.9, xmax: 7.6, ymin: -0.9, ymax: 3.6 },
  ko: { xmin: -0.9, xmax: 7.9, ymin: -0.9, ymax: 3.7 },
};

// ------------------------------------------------------------- graphs

function waveAxes(ink, o = {}) {
  return axes(ink, 'wv', { x: 0, y: 0, w: 6.2, h: 2.8 }, {
    xmax: 2.4, ymin: o.ymin ?? 0, ymax: 140, xticks: [0, 0.8, 1.6, 2.4], yticks: o.yticks ?? [0, 40, 80, 120], xlabel: '$t$ (s)', ylabel: '$P$ (mmHg)', grid: true,
  });
}

function waveGraph(ink, o = {}) {
  const sys = o.sys ?? 120, dia = o.dia ?? 80;
  const P = waveAxes(ink, o);
  curve(ink, 'wv-c', P, (x) => arterial(x / T, sys, dia), 0, 2.4, 'wave', { N: 300, draw: o.draw ?? 1 });
  if (o.marks) {
    ink.line('wv-sys', P(0, sys), P(2.4, sys), 'accent-thin', { op: o.marks, layer: 'annotations' });
    ink.line('wv-dia', P(0, dia), P(2.4, dia), 'thin', { op: o.marks, layer: 'annotations' });
    ink.text('wv-sysl', P(2.4, sys), `sistólica ${n(sys)}`, { op: o.marks, dx: 6, dy: 5, size: 14, anchor: 'start', cls: 'accent-tx' });
    ink.text('wv-dial', P(2.4, dia), `diastólica ${n(dia)}`, { op: o.marks, dx: 6, dy: 5, size: 14, anchor: 'start' });
  }
  if (o.pulse) ink.dimension('wv-pp', P(2.15, dia), P(2.15, sys), 0, `${n(sys - dia)} mmHg`, { op: o.pulse, size: 13 });
  if (o.phases) {
    // Shade systole (ejection) in each beat.
    for (let k = 0; k < 3; k++) rect(ink, `wv-sy${k}`, P(k * T, 0).x, 0, P(k * T + 0.3, 0).x, 2.8, 'band', { op: o.phases, layer: 'grid' });
    ink.text('wv-syl', P(0.15, 140), 'sístole', { dy: 14, size: 13, cls: 'accent-tx', op: o.phases });
    ink.text('wv-dil', P(0.55, 140), 'diástole', { dy: 14, size: 13, cls: 'mid', op: o.phases });
  }
  return P;
}

/** Area-balance picture for a horizontal level L over one beat. */
function balanceGraph(ink, L, o = {}) {
  const P = axes(ink, 'bl', { x: 0, y: 0, w: 6.2, h: 2.8 }, { xmax: 0.8, ymin: 60, ymax: 130, xticks: [0, 0.2, 0.4, 0.6, 0.8], yticks: [60, 80, 100, 120], xlabel: '$t$ (s)', ylabel: '$P$ (mmHg)', grid: true });
  const N = 160;
  let above = '', below = '';
  let aA = 0, aB = 0;
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N * 0.8;
    const p = arterial(x / T);
    const s0 = ink.S(P(x, L));
    const sp = ink.S(P(x, p));
    if (p > L) { above += `M${s0.x.toFixed(1)},${s0.y.toFixed(1)}V${sp.y.toFixed(1)}`; aA += p - L; } else { below += `M${s0.x.toFixed(1)},${s0.y.toFixed(1)}V${sp.y.toFixed(1)}`; aB += L - p; }
  }
  ink.path('bl-above', above, 'accent-thin', { layer: 'grid' });
  ink.path('bl-below', below, 'stream', { layer: 'grid' });
  curve(ink, 'bl-c', P, (x) => arterial(x / T), 0, 0.8, 'wave', { N: 200 });
  ink.line('bl-L', P(0, L), P(0.8, L), 'blue heavy', { layer: 'vectors' });
  ink.text('bl-Ll', P(0.8, L), `${n(L, 0)} mmHg`, { dx: 8, dy: 5, size: 15, anchor: 'start', cls: 'blue-tx' });
  if (o.simple) {
    ink.line('bl-avg', P(0, 100), P(0.8, 100), 'dashed', { layer: 'annotations' });
    ink.text('bl-avgl', P(0.78, 100), 'promedio simple (120 + 80)/2 = 100', { dy: -8, size: 13, anchor: 'end', cls: 'mid halo' });
  }
  return { above: (aA / N) * 0.8, below: (aB / N) * 0.8, P };
}

const SEGMENTS = ['Aorta', 'Arterias', 'Arteriolas', 'Capilares', 'Vénulas', 'Venas', 'Cava'];

function circuitMean(x) {
  const pts = [[0, 100], [1, 97], [2, 88], [2.5, 60], [3, 35], [4, 17], [5, 12], [6, 8], [7, 2]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x <= x1) return y0 + (y1 - y0) * (1 - Math.cos((Math.PI * (x - x0)) / (x1 - x0))) / 2;
  }
  return 2;
}
const circuitAmp = (x) => (x < 1.6 ? 20 + 2 * x : x < 3 ? 23 * (1 - (x - 1.6) / 1.4) ** 1.5 : 0);

function circuitGraph(ink, o = {}) {
  const P = axes(ink, 'cg', { x: 0, y: 0, w: 6.6, h: 2.8 }, { xmax: 7, ymax: 130, yticks: [0, 40, 80, 120], ylabel: '$P$ (mmHg)', grid: true });
  SEGMENTS.forEach((s, i) => {
    ink.text(`cg-s${i}`, P(i + 0.5, 0), s, { dy: 20, size: 13, cls: o.pick === i ? 'accent-tx' : 'mid' });
    if (i) ink.line(`cg-d${i}`, P(i, 0), P(i, 125), 'grid', { layer: 'grid' });
  });
  if (o.reveal) {
    rect(ink, 'cg-band', P(2, 0).x, 0, P(3, 0).x, 2.8, 'band', { op: o.reveal, layer: 'grid' });
    curve(ink, 'cg-w', P, (x) => circuitMean(x) + circuitAmp(x) * Math.sin(2 * Math.PI * x * 2.6), 0, 7, 'wave', { N: 420, op: o.reveal });
    curve(ink, 'cg-m', P, circuitMean, 0, 7, 'blue', { op: o.reveal });
    ink.text('cg-bl', P(2.5, 125), 'mayor caída', { size: 14, cls: 'accent-tx halo', dy: 4, op: o.reveal });
  } else {
    ink.text('cg-q', P(3.5, 70), '?', { size: 40, cls: 'mid' });
  }
  return P;
}

// ------------------------------------------------- Korotkoff simulator

const CUFF0 = 170, CUFF_END = 50;

function koState(S) {
  return (S.ko ??= { run: false, t: 0, rate: 3, sounds: [], sys: null, dia: null, mode: 'slow' });
}

/** Advance the deflating cuff; record a sound at each beat that gets through. */
function koTick(S, dt) {
  const k = koState(S);
  if (!k.run) return;
  const before = k.t;
  k.t += dt;
  const cuff = CUFF0 - k.rate * k.t;
  // Beat peaks occur at phase 0.13 of each 0.8 s cycle.
  const b0 = Math.floor((before - 0.13 * T) / T), b1 = Math.floor((k.t - 0.13 * T) / T);
  for (let b = b0 + 1; b <= b1; b++) {
    const tp = b * T + 0.13 * T;
    const c = CUFF0 - k.rate * tp;
    if (c < 120 && c > 80) k.sounds.push({ t: tp, c, at: k.t });
  }
  if (cuff <= CUFF_END) k.run = false;
}

function koGraph(ink, S, o = {}) {
  const k = koState(S);
  const tEnd = (CUFF0 - CUFF_END) / k.rate;
  const P = axes(ink, 'ko', { x: 0, y: 0, w: 6.4, h: 2.8 }, { xmax: tEnd, ymin: 40, ymax: 180, yticks: [40, 80, 120, 160], xticks: [0, Math.round(tEnd / 2), Math.round(tEnd)], xlabel: '$t$ (s)', ylabel: '$P$ (mmHg)', grid: true });
  curve(ink, 'ko-a', P, (x) => arterial(x / T), 0, Math.min(tEnd, Math.max(k.t, 0.01)), 'wave', { N: Math.max(40, Math.round(tEnd * 40)) });
  curve(ink, 'ko-c', P, (x) => CUFF0 - k.rate * x, 0, Math.max(0.01, Math.min(k.t, tEnd)), 'blue heavy', { N: 20 });
  const cuffNow = CUFF0 - k.rate * Math.min(k.t, tEnd);
  ink.circle('ko-now', P(Math.min(k.t, tEnd), cuffNow), 5, 'dot-blue', { layer: 'vectors' });
  k.sounds.forEach((s, i) => ink.line(`ko-s${i}`, P(s.t, s.c - 7), P(s.t, s.c + 7), 'accent heavy', { layer: 'vectors' }));
  // Flash "tum" on the most recent sound.
  const last = k.sounds[k.sounds.length - 1];
  if (last && k.t - last.at < 0.35 && k.run) ink.textS('ko-tum', ink.W * 0.5, ink.H * 0.12, '♪ tum', { size: 26, cls: 'accent-tx', layer: 'screen' });
  for (const [key, v, cls] of [['sys', k.sys, 'accent-tx'], ['dia', k.dia, '']]) {
    if (v === null) continue;
    ink.line(`ko-${key}`, P(0, v), P(tEnd, v), key === 'sys' ? 'accent-thin' : 'thin', { layer: 'annotations' });
    ink.text(`ko-${key}l`, P(tEnd, v), `${key === 'sys' ? 'tu sistólica' : 'tu diastólica'}: ${n(v, 0)}`, { dx: 6, dy: 5, size: 13, anchor: 'start', cls });
  }
  readout(ink, [`manguito: ${n(cuffNow, 0)} mmHg`], { size: 17 });
}

function koControls(S, label = '') {
  const k = koState(S);
  if (!k.run && k.t === 0) return [{ type: 'button', id: 'go', label: 'Inflar a 170 y empezar a desinflar', primary: true }];
  if (k.run) return [
    { type: 'button', id: 'sys', label: 'Oigo el primer ruido', disabled: k.sys !== null, primary: k.sys === null },
    { type: 'button', id: 'dia', label: 'Ya no oigo nada', disabled: k.sys === null || k.dia !== null, primary: k.sys !== null && k.dia === null },
  ];
  return [{ type: 'button', id: 'again', label: 'Repetir la medición' }];
}

function koAct(S, id, rate) {
  const k = koState(S);
  if (id === 'go' || id === 'again') Object.assign(k, { run: true, t: 0, rate, sounds: [], sys: null, dia: null });
  const cuff = CUFF0 - k.rate * k.t;
  if (id === 'sys' && k.sys === null) k.sys = cuff;
  if (id === 'dia' && k.dia === null) { k.dia = cuff; k.run = false; }
}

// ---------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'pam': {
      const [s, d] = pick(rnd, [[120, 80], [130, 85], [140, 95], [150, 90], [110, 70], [90, 60], [160, 100], [100, 65]]);
      return {
        kind, ask: `Presión arterial ${s}/${d} mmHg. Estima la PAM.`, sys: s, dia: d,
        given: [['PAS', `${s}`], ['PAD', `${d}`]],
        number: { label: 'PAM ≈', unit: 'mmHg', answer: d + (s - d) / 3, d: 0, rel: 0.015 },
        hint: 'PAM ≈ PAD + ⅓ (PAS − PAD): la diástole dura unos dos tercios del ciclo.',
        solution: [{ text: 'Presión de pulso:', math: `${s} − ${d} = ${s - d}` }, { text: 'PAM:', math: `${d} + ${s - d}/3 ≈ ${n(d + (s - d) / 3, 0)} mmHg` }],
        why: `PAM ≈ ${n(d + (s - d) / 3, 0)} mmHg.`,
      };
    }
    case 'pp': {
      const [s, d] = pick(rnd, [[120, 80], [160, 80], [150, 90], [110, 75], [180, 70]]);
      return {
        kind, ask: `¿Cuál es la presión de pulso de un paciente con ${s}/${d} mmHg?`, sys: s, dia: d,
        given: [['PAS', `${s}`], ['PAD', `${d}`]],
        number: { label: 'PP =', unit: 'mmHg', answer: s - d, d: 0 },
        hint: 'Presión de pulso = sistólica − diastólica.',
        solution: [{ text: 'Diferencia:', math: `${s} − ${d} = ${s - d} mmHg` }, { text: s - d >= 60 ? 'Amplia: sugiere arterias rígidas.' : 'Normal (≈ 40 mmHg).', math: '' }],
        why: `${s - d} mmHg${s - d >= 60 ? ': amplia, típica de arterias rígidas.' : '.'}`,
      };
    }
    case 'class': {
      const [s, d, c] = pick(rnd, [[118, 76, 'n'], [145, 92, 'h'], [150, 85, 'h'], [128, 95, 'h'], [85, 55, 'l'], [124, 82, 'n'], [88, 50, 'l']]);
      return {
        kind, ask: `Un adulto en reposo tiene ${s}/${d} mmHg. ¿Cómo la clasificas? (referencia docente: elevada si ≥ 140 o ≥ 90; hipotensión si < 90/60)`, sys: s, dia: d,
        given: [['lectura', `${s}/${d}`]],
        choices: [{ id: 'n', label: 'normal', correct: c === 'n' }, { id: 'h', label: 'elevada (hipertensión)', correct: c === 'h' }, { id: 'l', label: 'baja (hipotensión)', correct: c === 'l' }],
        hint: 'Basta con que uno de los dos valores cruce el umbral.',
        solution: [{ text: 'Compara cada valor con su umbral:', math: `${s} vs 140/90 · ${d} vs 90/60` }],
        why: { n: 'Normal.', h: 'Elevada: al menos un valor supera el umbral.', l: 'Baja.' }[c],
      };
    }
    case 'read': {
      const s = pick(rnd, [110, 120, 130, 140, 150]);
      const d = pick(rnd, [70, 75, 80, 85, 90]);
      return {
        kind, ask: `Al desinflar el manguito, el primer ruido aparece con ${s} mmHg y el último se oye con ${d} mmHg. ¿Cuál es la presión arterial?`, sys: s, dia: d,
        given: [['primer ruido', `${s} mmHg`], ['silencio', `${d} mmHg`]],
        choices: [{ id: 'ok', label: `${s}/${d}`, correct: true }, { id: 'inv', label: `${d}/${s}` }, { id: 'avg', label: `${(s + d) / 2}/${d}` }],
        hint: 'El primer ruido marca la sistólica; la desaparición, la diastólica.',
        solution: [{ text: 'Korotkoff:', math: `primer ruido = PAS = ${s}; silencio = PAD = ${d}` }],
        why: `${s}/${d} mmHg.`,
      };
    }
    default: {
      const [desc, id] = pick(rnd, [
        ['Tras un sangrado abundante: 70/40 mmHg, taquicardia y piel fría.', 'hemo'],
        ['Deportista: 115/75 en reposo, 150/80 justo después de correr.', 'ex'],
        ['De pie tras estar acostado: de 125/80 baja a 95/65 y se marea.', 'orto'],
      ]);
      const opts = { hemo: 'pérdida de volumen: cae la presión y el cuerpo compensa', ex: 'respuesta normal: sube el gasto cardíaco', orto: 'hipotensión ortostática por acumulación venosa' };
      return {
        kind: 'case', ask: `${desc} ¿Qué lo explica mejor?`,
        given: [['caso', desc]],
        choices: Object.entries(opts).map(([k, v]) => ({ id: k, label: v, correct: k === id })),
        hint: 'Fíjate en el contexto: ¿qué cambió justo antes de medir?',
        solution: [{ text: opts[id], math: '' }],
        why: opts[id] + '.',
      };
    }
  }
}

function drawProblem(ink, p) {
  if (p.kind === 'case') { circuitGraph(ink, { reveal: 1 }); return; }
  waveGraph(ink, { sys: p.sys ?? 120, dia: p.dia ?? 80, marks: p.kind === 'read' ? 0 : 1, pulse: p.kind === 'pam' ? 1 : 0 });
}

// ------------------------------------------------------------- lesson

const CASES = [
  {
    key: 'c2', text: 'Caso 2. Paciente hipertenso: 150/100 mmHg, con hematocrito elevado por deshidratación.',
    prompt: '¿Qué factor físico empeora su presión?',
    choices: [
      { id: 'visc', label: 'la sangre más viscosa ofrece más resistencia al flujo: el corazón debe empujar más fuerte', correct: true },
      { id: 'vol', label: 'tiene más volumen de sangre', why: 'Al deshidratarse pierde agua: el volumen baja. Lo que sube es la concentración de glóbulos rojos.' },
      { id: 'grav', label: 'la gravedad', why: 'La postura no ha cambiado; el dato clave es el hematocrito.' },
    ],
    success: 'Más hematocrito → más viscosidad → más resistencia (lo verás con Poiseuille). A igual flujo, más presión.',
  },
  {
    key: 'c3', text: 'Caso 3. Hemorragia aguda: 70/40 mmHg, taquicardia, piel fría.',
    prompt: '¿Por qué baja tanto la diastólica?',
    choices: [
      { id: 'vol', label: 'hay menos sangre en un sistema cerrado y menos resistencia: la presión no se sostiene entre latidos', correct: true },
      { id: 'heart', label: 'el corazón late más lento', why: 'Al contrario: hay taquicardia, el corazón intenta compensar.' },
      { id: 'cuff', label: 'es un error del manguito', why: 'Los signos (taquicardia, piel fría) confirman un problema real de perfusión.' },
    ],
    success: 'Con menos volumen, las arterias se llenan menos y la presión cae. La piel fría y la taquicardia son la compensación: vasoconstricción en la piel y más frecuencia cardíaca.',
  },
  {
    key: 'c4', text: 'Caso 4. Deportista: 115/75 en reposo; 150/80 justo después de correr.',
    prompt: '¿Cómo lo interpretas?',
    choices: [
      { id: 'ok', label: 'respuesta normal: sube el gasto cardíaco y con él la sistólica', correct: true },
      { id: 'hta', label: 'hipertensión: 150 supera 140', why: 'La referencia es en reposo. Durante el ejercicio es normal que la sistólica suba.' },
      { id: 'stiff', label: 'arterias rígidas', why: 'La diastólica casi no cambia: las arterias amortiguan bien.' },
    ],
    success: 'El corazón bombea más sangre por minuto: sube la sistólica. La diastólica se mantiene gracias a la elasticidad arterial y a la vasodilatación en los músculos.',
  },
];

export const p5 = {
  id: 'bio-p5', code: '1.5', title: 'Presión arterial', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.wave, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, cur: 0.4, peakSeen: false, troughSeen: false, L: 100, circ: null }),
  chapters: [
    {
      id: 'intro', title: 'Presión arterial', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Presión · Lección 1.5',
          title: 'Presión arterial',
          sub: '¿Qué significan los dos números de «120/80»? Vas a leerlos en la onda de presión, calcular la media y tomar tú mismo una lectura con un manguito.',
          meta: 'Unos 30 minutos · Semana 7 · Simulador de manguito · Casos clínicos · Práctica',
        }),
        draw({ ink }, t) { waveGraph(ink, { draw: ramp(t, 0.3, 3, (u) => u) }); },
      }],
    },
    // ============================================================ 1
    {
      id: 'onda', title: 'Leer la onda de presión', short: 'La onda', num: '1',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.wave,
          caption: 'Esta es la presión dentro de la aorta durante tres latidos. No es constante: sube y baja con cada latido.',
          draw({ ink }, t) { waveGraph(ink, { draw: ramp(t, 0.3, 3, (u) => u) }); },
        },
        {
          kind: 'do', cam: CAM.wave,
          caption: (S) => `$t$ = ${n(S.cur, 2)} s  →  $P$ = ${n(arterial(S.cur / T), 0)} mmHg`,
          prompt: 'Arrastra el cursor por la curva. Encuentra el valor <b>más alto</b> y el <b>más bajo</b> de la presión.',
          success: 'Máximo ≈ 120 mmHg: presión <b>sistólica</b>. Mínimo ≈ 80 mmHg: presión <b>diastólica</b>. Se escribe 120/80.',
          draw({ ink, S }) {
            const P = waveGraph(ink, {});
            const p = arterial(S.cur / T);
            ink.line('cur', P(S.cur, 0), P(S.cur, 140), 'accent-thin', { layer: 'annotations' });
            ink.circle('cur-p', P(S.cur, p), 5, 'dot-accent', { layer: 'vectors' });
            readout(ink, [`$P$ = ${n(p, 0)} mmHg`, `máx. encontrado: ${S.peakSeen ? '✓' : '—'}`, `mín. encontrado: ${S.troughSeen ? '✓' : '—'}`]);
          },
          handles: (S) => [{ key: 'cur', p: { x: (S.cur / 2.4) * 6.2, y: (arterial(S.cur / T) / 140) * 2.8 }, r: 22, cursor: 'ew-resize', drag: (S2, q) => {
            S2.cur = clamp(snap((q.x / 6.2) * 2.4, 0.005), 0, 2.4);
            const p = arterial(S2.cur / T);
            if (p > 118.5) S2.peakSeen = true;
            if (p < 81) S2.troughSeen = true;
          } }],
          done: (S) => S.peakSeen && S.troughSeen,
          skip(S) { S.peakSeen = S.troughSeen = true; },
        },
        {
          kind: 'do', cam: CAM.wave,
          ...(() => {
            const c = askChoice({
              key: 'phase', choices: [
                { id: 'sys', label: 'el ventrículo izquierdo se contrae y expulsa sangre a la aorta (sístole)', correct: true },
                { id: 'dia', label: 'el ventrículo se relaja y se llena (diástole)', why: 'Mientras el ventrículo se llena, la válvula aórtica está cerrada y la presión en la aorta va bajando.' },
                { id: 'valve', label: 'la válvula aórtica se cierra', why: 'El cierre de la válvula deja una pequeña muesca en la bajada (la incisura dícrota), no el máximo.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Mira la subida rápida al principio de cada latido.' };
          })(),
          prompt: '¿Qué hace el corazón cuando la presión llega al máximo?',
          success: 'La sístole: el ventrículo izquierdo eyecta sangre. Durante la diástole la presión baja lentamente, pero no a cero: las arterias elásticas devuelven la sangre que guardaron (lo verás en la Unidad 2).',
          draw({ ink }) { waveGraph(ink, { marks: 1, phases: 1 }); },
        },
        {
          kind: 'do', cam: CAM.wave,
          ...askNumber({ key: 'pp', label: 'PP =', unit: 'mmHg', answer: 40, wrong: [[100, 'Ese es el promedio. La presión de pulso es la diferencia.'], [200, 'Es la diferencia, no la suma.']] }),
          caption: (S) => S.g.pp?.msg ?? (S.g.pp?.wrong ? 'Resta la diastólica de la sistólica.' : 'La distancia vertical entre el máximo y el mínimo se llama <b>presión de pulso</b>.'),
          prompt: '¿Cuánto vale la presión de pulso para 120/80?',
          success: '40 mmHg. Es lo que notas al tomar el pulso. Si se ensancha (por ejemplo 160/80), suele indicar arterias rígidas.',
          draw({ ink, S }) { waveGraph(ink, { marks: 1, pulse: S.g.pp?.ok ? 1 : 0 }); },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'pam', title: 'La presión media', short: 'PAM', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.wave,
          caption: (S) => {
            const b = balanceGraphNumbers(S.L);
            if (Math.abs(S.L - MEAN) < 1.5) return '';
            return b.above > b.below ? 'El área roja (por encima) es mayor: sube la línea.' : 'El área azul (por debajo) es mayor: baja la línea.';
          },
          prompt: 'La presión media es la línea horizontal que deja <b>tanta área por encima como por debajo</b> de la curva. Arrastra la línea azul hasta equilibrarlas.',
          success: (S) => `La media es ≈ ${n(MEAN, 0)} mmHg, no 100. La curva pasa más tiempo cerca de la diastólica: la diástole dura unos dos tercios del ciclo.`,
          draw({ ink, S }) {
            const b = balanceGraph(ink, S.L, { simple: true });
            readout(ink, [`área encima: ${n(b.above, 1)}`, `área debajo: ${n(b.below, 1)}`]);
          },
          handles: (S) => [{ key: 'L', p: { x: 3.1, y: ((S.L - 60) / 70) * 2.8 }, r: 24, cursor: 'ns-resize', drag: (S2, q) => { S2.L = clamp(snap(60 + (q.y / 2.8) * 70, 0.5), 70, 125); } }],
          done: (S) => Math.abs(S.L - MEAN) < 1.5,
          skip(S) { S.L = Math.round(MEAN); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.wave,
          caption: `Como la diástole ocupa unos dos tercios del ciclo, una buena aproximación es <b>PAM ≈ PAD + ⅓ (PAS − PAD)</b>. Para 120/80: 80 + 40/3 ≈ 93 mmHg (la media exacta de esta curva es ≈ ${n(MEAN, 0)}).`,
          draw({ ink }) { balanceGraph(ink, MEAN, {}); },
        },
        {
          kind: 'do', cam: CAM.wave,
          ...askNumber({ key: 'pam', label: 'PAM ≈', unit: 'mmHg', answer: 110, rel: 0.01, wrong: [[120, 'Ese es el promedio simple. La diástole dura más: usa PAD + ⅓(PAS − PAD).'], [130, 'Sumaste ⅓ de la presión de pulso a la sistólica. Se suma a la diastólica.']] }),
          caption: (S) => S.g.pam?.msg ?? (S.g.pam?.wrong ? 'PAM ≈ PAD + ⅓ (PAS − PAD).' : 'Un adulto mayor con 150/90 mmHg.'),
          prompt: 'Estima su presión arterial media.',
          success: '90 + 60/3 = 110 mmHg. La PAM es la presión que realmente impulsa la perfusión de los órganos: en un adulto estable suele estar entre 70 y 100 mmHg; en el paciente crítico se busca ≥ 65.',
          draw({ ink }) { waveGraph(ink, { sys: 150, dia: 90, marks: 1, pulse: 1, yticks: [0, 40, 80, 120], ymin: 0 }); },
        },
      ],
    },
    // ============================================================ 3
    {
      id: 'circuito', title: '¿Dónde cae la presión?', short: 'El circuito', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.wave,
          controls: (S) => SEGMENTS.map((s, i) => ({ type: 'choice', id: String(i), label: s, state: S.circ === i ? 'right' : null, disabled: S.circ !== null })),
          act(S, id) { if (S.circ === null) S.circ = Number(id); },
          caption: 'La sangre sale de la aorta a ≈ 100 mmHg (media) y vuelve a la aurícula derecha a casi 0. Esa caída de presión es la que la hace circular.',
          prompt: 'Predice: ¿en qué tramo crees que cae más la presión?',
          success: (S) => `Predicción guardada: ${SEGMENTS[S.circ]}. Veamos.`,
          draw({ ink, S }) { circuitGraph(ink, { pick: S.circ }); },
          done: (S) => S.circ !== null,
          skip(S) { S.circ = 2; },
        },
        {
          kind: 'watch', dur: 5, cam: CAM.wave,
          caption: (S) => `${S.circ === 2 ? '¡Bien! ' : ''}La mayor caída ocurre en las <b>arteriolas</b>: vasos estrechos que ofrecen la mayor resistencia (la «resistencia periférica»). Ahí también desaparece la pulsatilidad: a los capilares llega un flujo casi continuo.`,
          draw({ ink, S }, t) { circuitGraph(ink, { reveal: ramp(t, 0.3, 1.2), pick: S.circ }); },
        },
        {
          kind: 'do', cam: CAM.wave,
          ...(() => {
            const c = askChoice({
              key: 'why', choices: [
                { id: 'res', label: 'son estrechas y la sangre pierde mucha energía al atravesarlas', correct: true },
                { id: 'far', label: 'están lejos del corazón', why: 'Los capilares y las venas están aún más lejos, y la caída allí es menor.' },
                { id: 'valve', label: 'tienen válvulas', why: 'Las válvulas están en las venas, no en las arteriolas.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Piensa en por qué un tramo puede «consumir» mucha presión.' };
          })(),
          prompt: '¿Por qué cae tanto la presión en las arteriolas?',
          success: 'Exacto: radio pequeño → mucha resistencia → gran caída de presión. Contrayéndose o dilatándose, las arteriolas regulan cuánta sangre recibe cada órgano. La ley de Poiseuille (Semana 10) lo cuantifica.',
          draw({ ink, S }) { circuitGraph(ink, { reveal: 1, pick: S.circ }); },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'medir', title: 'Toma la presión tú mismo', short: 'Medir', num: '4',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.ko,
          caption: 'Método auscultatorio: se infla el manguito por encima de la sistólica (la arteria se cierra) y se desinfla despacio, unos 2–3 mmHg por segundo, escuchando con el estetoscopio.',
          draw({ ink, S }) { koGraph(ink, S); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.ko,
          caption: 'Cuando el manguito baja de la sistólica, en cada latido la sangre pasa a chorros por la arteria comprimida: flujo turbulento que se oye (<b>ruidos de Korotkoff</b>). Cuando baja de la diastólica, la arteria queda abierta todo el tiempo, el flujo vuelve a ser laminar y se hace silencio.',
          draw({ ink, S }) { koGraph(ink, S); },
        },
        {
          kind: 'do', cam: CAM.ko,
          enter(S) { const k = koState(S); if (k.mode !== 'slow') Object.assign(k, { mode: 'slow', run: false, t: 0, sounds: [], sys: null, dia: null }); },
          tick(S, dt) { koTick(S, dt); },
          caption: (S) => {
            const k = koState(S);
            if (k.dia !== null) {
              const ok = Math.abs(k.sys - 120) <= 5 && Math.abs(k.dia - 80) <= 5;
              return ok ? '' : `Tu lectura: ${n(k.sys, 0)}/${n(k.dia, 0)}. La real es 120/80. Repite: pulsa justo con el primer «tum» y justo cuando dejan de aparecer.`;
            }
            if (k.run) return k.sys === null ? 'Escucha… pulsa en cuanto aparezca el primer «tum».' : 'Sigue escuchando: pulsa cuando ya no haya ruidos.';
            return 'El manguito se desinflará a 3 mmHg/s. Atento a las marcas rojas («tum»).';
          },
          prompt: 'Mide la presión: marca el primer ruido y el momento en que desaparecen.',
          controls: (S) => koControls(S),
          act(S, id) { koAct(S, id, 3); },
          success: (S) => `Tu lectura: ${n(koState(S).sys, 0)}/${n(koState(S).dia, 0)} mmHg. ¡Bien medido! El primer ruido es la sistólica; el silencio, la diastólica.`,
          draw({ ink, S }) { koGraph(ink, S); },
          done: (S) => { const k = koState(S); return k.dia !== null && Math.abs(k.sys - 120) <= 5 && Math.abs(k.dia - 80) <= 5; },
          skip(S) { Object.assign(koState(S), { run: false, t: 40, sys: 120, dia: 80 }); },
        },
        {
          kind: 'do', cam: CAM.ko,
          enter(S) { Object.assign(koState(S), { mode: 'fast', run: false, t: 0, sounds: [], sys: null, dia: null }); },
          tick(S, dt) { koTick(S, dt); },
          caption: (S) => {
            const k = koState(S);
            if (k.dia !== null) return '';
            return k.run ? 'Ahora va a 15 mmHg/s: entre latido y latido el manguito baja 12 mmHg.' : 'Repite la medición, pero desinflando muy rápido (15 mmHg/s).';
          },
          prompt: 'Mide otra vez con el manguito desinflándose rápido.',
          controls: (S) => koControls(S),
          act(S, id) { koAct(S, id, 15); },
          success: (S) => { const k = koState(S); const err = 120 - k.sys; return `Tu lectura: ${n(k.sys, 0)}/${n(k.dia, 0)} (la real es 120/80). Entre latido y latido el manguito baja 12 mmHg, así que ${err > 3 ? `el primer ruido llegó tarde: la sistólica salió ${n(err, 0)} mmHg baja` : 'esta vez tuviste suerte, pero el error puede llegar a 12 mmHg'}. Desinflar rápido es uno de los errores más frecuentes al medir.`; },
          draw({ ink, S }) { koGraph(ink, S); },
          done: (S) => koState(S).dia !== null,
          skip(S) { Object.assign(koState(S), { run: false, t: 8, sys: 112, dia: 76 }); },
        },
      ],
    },
    // ============================================================ 5
    {
      id: 'casos', title: 'Casos de la clase', short: 'Casos', num: '5',
      beats: CASES.map((cs) => {
        const c = askChoice({ key: cs.key, choices: cs.choices });
        return {
          kind: 'do', cam: CAM.wave, ...c,
          caption: (S) => c.feedback(S) ?? cs.text,
          prompt: cs.prompt, success: cs.success,
          draw({ ink }) { circuitGraph(ink, { reveal: 1 }); },
        };
      }),
    },
    // ============================================================ 6
    practiceChapter({ num: '6', seed: 61505, kinds: ['pam', 'read', 'pp', 'class', 'case'], make: makeProblem, draw: drawProblem, cam: () => CAM.wave }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '7',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica 1.5 · Resumen',
          title: 'Presión arterial',
          ideas: [
            'Sistólica = máximo (eyección ventricular); diastólica = mínimo (final del llenado). Presión de pulso = PAS − PAD (≈ 40 mmHg).',
            'La PAM equilibra el área por encima y por debajo de la curva; como la diástole es más larga, <span class="m">PAM ≈ PAD + ⅓(PAS − PAD)</span>.',
            'La mayor caída de presión ocurre en las arteriolas: son la resistencia periférica y regulan el reparto del flujo.',
            'Korotkoff: primer ruido = PAS, silencio = PAD. Desinflar rápido, un manguito estrecho o el brazo fuera del nivel del corazón falsean la lectura.',
            'Casos: viscosidad (hematocrito) → más resistencia; hemorragia → menos volumen; ejercicio → más gasto cardíaco.',
          ],
          next: '<span class="eyebrow">Siguiente bloque</span> <a class="cm-next" href="#elasticidad">2.1 · Elasticidad de la pared ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};

/** Area numbers without drawing (for captions). */
function balanceGraphNumbers(L) {
  let aA = 0, aB = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const p = arterial((i + 0.5) / N);
    if (p > L) aA += p - L; else aB += L - p;
  }
  return { above: aA / N, below: aB / N };
}
