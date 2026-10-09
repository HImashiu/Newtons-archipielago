// Biofísica 3.2 — El teorema de Bernoulli  (Semanas 8–9, bloque «Flujo»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 3.2.
//
// Bernoulli contradice la intuición, así que se empieza por una predicción
// (casi todos dicen que la presión SUBE en el estrechamiento). El estudiante lo
// observa, construye la explicación con una cadena de causas (aceleración →
// fuerza neta → diferencia de presión), lo conecta con la energía y lo aplica a
// estenosis y aneurismas con desvanecimiento.

import { clamp, snap } from '../core/anim.js';
import { UI_ES, MMHG, n, formula, titleCard, summaryCard, practiceChapter, askNumber, askChoice, orderChain, createWorkPanel, pick } from './kit.js';
import { flowTube, venturi } from './scenes-flujo.js';

const RHO = 1060;
const CAM = {
  title: { xmin: -4.4, xmax: 4.4, ymin: -1.5, ymax: 3.6 },
  ventu: { xmin: -4.4, xmax: 4.4, ymin: -1.5, ymax: 3.6 },
  ventuP: { xmin: -4.4, xmax: 4.4, ymin: -1.6, ymax: 3.8 },
  tube: { xmin: -4.4, xmax: 4.4, ymin: -1.9, ymax: 2.4 },
  chain: { xmin: -3, xmax: 3, ymin: -2, ymax: 2 },
};

const WHY = [
  'El tubo se estrecha',
  'Por continuidad, la sangre tiene que ir más rápido en la parte estrecha',
  'Para acelerar, sobre la sangre debe actuar una fuerza neta hacia adelante',
  'Esa fuerza solo puede venir de la presión: la de atrás debe ser mayor que la de delante',
  'Por tanto, en la parte estrecha (rápida) la presión es menor',
];

const PRED = { up: 'más alta', down: 'más baja', eq: 'igual' };

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'dP': {
      const v1 = pick(rnd, [0.2, 0.3, 0.4, 0.5]);
      const k = pick(rnd, [2, 3, 4]);
      const v2 = v1 * k;
      const dP = 0.5 * RHO * (v2 * v2 - v1 * v1);
      return { kind, ask: `En una estenosis horizontal la sangre pasa de ${n(v1, 1)} a ${n(v2, 1)} m/s. ¿Cuánto cae la presión (Pa)?`, given: [['$v_1$', `${n(v1, 1)} m/s`], ['$v_2$', `${n(v2, 1)} m/s`], ['$ρ$', '1060 kg/m³']], number: { label: 'Δ$P$ =', unit: 'Pa', answer: dP }, hint: 'Δ$P$ = ½ $ρ$ ($v_2$² − $v_1$²).', solution: [{ text: 'Bernoulli horizontal:', math: `½·1060·(${n(v2 * v2, 2)} − ${n(v1 * v1, 2)}) = ${n(dP, 0)} Pa` }, { text: 'En mmHg:', math: `${n(dP / MMHG, 1)} mmHg` }], why: `${n(dP, 0)} Pa.`, k };
    }
    case 'v2': {
      const v1 = pick(rnd, [0.2, 0.3, 0.4]);
      const k = pick(rnd, [2, 3, 4]);
      return { kind, ask: `El área se reduce a 1/${k} y antes la sangre iba a ${n(v1, 1)} m/s. ¿Velocidad en la estenosis?`, given: [['$v_1$', `${n(v1, 1)} m/s`], ['$A_1/A_2$', `${k}`]], number: { label: '$v_2$ =', unit: 'm/s', answer: v1 * k }, hint: 'Primero continuidad.', solution: [{ text: 'Continuidad:', math: `${n(v1, 1)}·${k} = ${n(v1 * k, 1)} m/s` }], why: `${n(v1 * k, 1)} m/s.`, k };
    }
    case 'dir': {
      const wide = rnd() < 0.5;
      return { kind, ask: wide ? 'En una dilatación (aneurisma) la presión lateral es…' : 'En un estrechamiento (estenosis) la presión lateral es…', given: [['zona', wide ? 'dilatada' : 'estrecha']], choices: [{ id: 'up', label: 'mayor que antes', correct: wide }, { id: 'down', label: 'menor que antes', correct: !wide }, { id: 'eq', label: 'igual' }], hint: 'Continuidad (velocidad) y luego Bernoulli (presión).', solution: [{ text: wide ? 'Más área → menos velocidad → más presión' : 'Menos área → más velocidad → menos presión', math: '' }], why: wide ? 'Mayor.' : 'Menor.', k: wide ? 0.5 : 3 };
    }
    default: {
      const v = pick(rnd, [0.5, 1, 2, 3]);
      const dP = 0.5 * RHO * v * v;
      return { kind: 'ke', ask: `¿Cuánto vale la energía cinética por volumen, ½ $ρ$ $v$², de la sangre a ${n(v)} m/s? (Pa)`, given: [['$v$', `${n(v)} m/s`]], number: { label: '½ $ρ$ $v$² =', unit: 'Pa', answer: dP }, hint: '½ · 1060 · $v$².', solution: [{ text: 'Cálculo:', math: `½·1060·${n(v * v, 2)} = ${n(dP, 0)} Pa` }], why: `${n(dP, 0)} Pa ≈ ${n(dP / MMHG, 1)} mmHg.`, k: 2 };
    }
  }
}

function bernStep(k, caption) {
  return {
    kind: 'watch', dur: 3, pause: true, autoPause: false, cam: CAM.ventuP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Ejemplo resuelto' }, { given: [['$v_1$', '0,30 m/s'], ['$A_1/A_2$', '3'], ['$ρ$', '1060 kg/m³']] },
        { step: 1, text: 'Continuidad:', math: '$v_2$ = 0,30·3 = 0,90 m/s', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Bernoulli (misma altura):', math: '$P_1$ − $P_2$ = ½ $ρ$ ($v_2$² − $v_1$²)', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Resultado:', math: '½·1060·(0,81 − 0,09) ≈ 382 Pa ≈ 2,9 mmHg', state: st(3) }] : []),
      ];
    },
    draw({ ink }, t) { venturi(ink, 3, t, { v1: 0.3, k: 0.12, Pref: 92 }); },
  };
}

export const r2 = {
  id: 'bio-r2', code: '3.2', title: 'El teorema de Bernoulli', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.ventu, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, vratio: 1.2, seen: false }),
  chapters: [
    {
      id: 'intro', title: 'El teorema de Bernoulli', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · Flujo · Lección 3.2', title: 'El teorema de Bernoulli', sub: 'En un estrechamiento la sangre acelera. ¿Qué le pasa a su presión? La respuesta va contra la intuición y explica estenosis y aneurismas.', meta: 'Unos 25 minutos · Semanas 8–9 · Predicción · Cadena causal · Casos · Práctica' }), draw({ ink }, t) { venturi(ink, 3, t, { v1: 0.3, k: 0.12, Pref: 92 }); } }],
    },
    {
      id: 'prediccion', title: 'Predice', short: 'Predicción', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.ventu, caption: 'Un tubo con un estrechamiento. Las dos columnas verticales miden la <b>presión lateral</b>: cuanto más presión, más sube la sangre en la columna.', draw({ ink }, t) { venturi(ink, 1.01, t, { v1: 0.3, k: 0.12, Pref: 92, dh: false }); } },
        {
          kind: 'do', cam: CAM.ventu,
          controls: (S) => Object.entries(PRED).map(([id, label]) => ({ type: 'choice', id, label, state: S.g.pred === id ? 'right' : null, disabled: !!S.g.pred })),
          act(S, id) { S.g.pred ??= id; },
          caption: 'Predicción (sin respuesta correcta todavía).',
          prompt: 'Al estrechar el tubo, la columna sobre el estrechamiento quedará…',
          success: 'Guardado. Compruébalo.',
          draw({ ink }, t) { venturi(ink, 1.01, t, { v1: 0.3, k: 0.12, Pref: 92, dh: false }); },
          done: (S) => !!S.g.pred, skip(S) { S.g.pred ??= 'up'; },
        },
        {
          kind: 'do', cam: CAM.ventu,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => { const v2 = 0.3 * S.vratio; return `$A_1/A_2$ = ${n(S.vratio, 1)} · $v_2$ = ${n(v2, 2)} m/s · $P_1$ − $P_2$ = ${n((0.5 * RHO * (v2 * v2 - 0.09)) / MMHG, 1)} mmHg`; },
          prompt: 'Estrecha la garganta del tubo (arrastra su pared) y mira la segunda columna.',
          success: (S) => `La columna <b>baja</b>: donde la sangre va más rápido, la presión lateral es menor. Tu predicción: «${PRED[S.g.pred] ?? '—'}». ${S.g.pred === 'down' ? '¡Acertaste!' : 'Es la predicción más común, y la intuición falla. Veamos por qué.'}`,
          draw({ ink, S }) { venturi(ink, S.vratio, S.tt ?? 0, { v1: 0.3, k: 0.12, Pref: 92 }); },
          handles: (S) => [{ key: 'th', p: { x: 0.7, y: 0.6 / Math.sqrt(S.vratio) + 0.09 }, r: 22, cursor: 'ns-resize', drag: (S2, p) => { const r2 = clamp(p.y - 0.09, 0.22, 0.6); S2.vratio = clamp(snap((0.6 / r2) ** 2, 0.1), 1, 6); if (S2.vratio >= 3) S2.seen = true; } }],
          done: (S) => S.seen, skip(S) { S.seen = true; S.vratio = 3; },
        },
      ],
    },
    {
      id: 'porque', title: '¿Por qué baja?', short: '¿Por qué?', num: '2',
      beats: [
        (() => { const ch = orderChain({ key: 'why', steps: WHY }); return { kind: 'do', cam: CAM.chain, ...ch, caption: (S) => (ch.wrongId(S) ? 'Ese paso viene después.' : 'Explica el resultado eslabón por eslabón. Pista: la segunda ley de Newton.'), prompt: 'Elige qué ocurre después.', success: 'Para que la sangre acelere hacia el estrechamiento, tiene que haber más presión detrás que delante. Por eso la presión es menor donde la velocidad es mayor.', draw({ ink, S }) { ch.draw(ink, S); } }; })(),
        { kind: 'watch', dur: 4, cam: CAM.ventu, caption: 'En términos de energía por unidad de volumen: <b>$P$ + ½ $ρ$ $v$² + $ρ$ $g$ $y$ = constante</b> a lo largo de una línea de flujo (fluido ideal). Si la energía cinética ½ $ρ$ $v$² sube, la presión $P$ baja. Es la conservación de la energía mecánica.', draw({ ink }, t) { venturi(ink, 3, t, { v1: 0.3, k: 0.12, Pref: 92 }); formula(ink, 'fb', '$P$ + ½ $ρ$ $v$² + $ρ$ $g$ $y$ = constante', { fy: 0.06, size: 24 }); } },
        {
          kind: 'do', cam: CAM.ventu,
          ...(() => { const c = askChoice({ key: 'terms', choices: [
            { id: 'ok', label: '$ρ$ $g$ $y$, porque el tubo es horizontal: $y$ no cambia', correct: true },
            { id: 'v', label: '½ $ρ$ $v$², porque la velocidad es pequeña', why: 'Justo ese término es el que cambia y explica la caída de presión.' },
            { id: 'P', label: '$P$, porque la presión se cancela', why: 'La presión es lo que queremos calcular.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Para comparar dos puntos del tubo horizontal, ¿qué término de Bernoulli es igual en los dos y se cancela?' }; })(),
          prompt: '¿Qué término se cancela?',
          success: 'Queda $P_1$ + ½ $ρ$ $v_1$² = $P_2$ + ½ $ρ$ $v_2$², es decir, $P_1$ − $P_2$ = ½ $ρ$ ($v_2$² − $v_1$²).',
          draw({ ink }, t) { venturi(ink, 3, t, { v1: 0.3, k: 0.12, Pref: 92 }); },
        },
      ],
    },
    {
      id: 'estenosis', title: 'Estenosis y aneurisma', short: 'Casos', num: '3',
      beats: [
        bernStep(1, 'Ejemplo resuelto: estenosis horizontal, el área se reduce a ⅓; antes la sangre iba a 0,30 m/s. Primero, continuidad.'),
        bernStep(2, 'Bernoulli con $y$ constante.'),
        bernStep(3, '≈ 3 mmHg menos dentro de la estenosis. En estenosis severas la caída puede colapsar parcialmente el vaso y desordenar el flujo (lección 3.3).'),
        {
          kind: 'do', cam: CAM.ventuP, panel: 'work',
          ...askNumber({ key: 'dP2', label: 'Δ$P$ =', unit: 'Pa', answer: 0.5 * RHO * (0.36 - 0.09), rel: 0.02, wrong: [[0.5 * RHO * 0.09, 'Usa la diferencia de los cuadrados: $v_2$² − $v_1$².', 0.02], [0.5 * RHO * 0.3, 'Eleva las velocidades al cuadrado.', 0.03]] }),
          caption: (S) => S.g.dP2?.msg ?? (S.g.dP2?.wrong ? 'Paso 3 del ejemplo con $v_2$ = 0,60 m/s.' : 'Semi-resuelto: ahora el área se reduce a la mitad. La continuidad ya está hecha: $v_2$ = 0,60 m/s.'),
          prompt: '¿Cuánto cae la presión (Pa)?',
          success: '½·1060·(0,36 − 0,09) ≈ 143 Pa ≈ 1,1 mmHg.',
          work: (S) => [{ h: 'Semi-resuelto' }, { step: 1, text: 'Continuidad:', math: '$v_2$ = 0,60 m/s', state: 'done' }, { step: 2, text: 'Tu turno: Bernoulli.', state: S.g.dP2?.ok ? 'done' : 'now' }],
          draw({ ink }, t) { venturi(ink, 2, t, { v1: 0.3, k: 0.12, Pref: 92 }); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...(() => { const c = askChoice({ key: 'aneu', choices: [
            { id: 'up', label: 'la sangre se frena y la presión lateral aumenta', correct: true },
            { id: 'down', label: 'la sangre acelera y la presión baja', why: 'Eso ocurre en un estrechamiento. En una dilatación el área crece.' },
            { id: 'eq', label: 'nada cambia', why: 'Continuidad: más área, menos velocidad; Bernoulli enlaza velocidad y presión.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Caso de la clase: un paciente con un aneurisma (arteria dilatada) pregunta por qué puede romperse.' }; })(),
          prompt: '¿Qué ocurre dentro del aneurisma?',
          success: 'Explicación para el paciente: «en la parte dilatada la sangre va más despacio y empuja más la pared (Bernoulli); y como el vaso es más ancho, la pared soporta más tensión (Laplace, lección 2.3). Por eso la dilatación tiende a crecer.»',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { flowTube(ink, 'an', (x) => 0.45 + 0.4 * Math.exp(-((x / 0.9) ** 2)), S.tt ?? 0, { v0: 0.8 }); ink.text('an-l', { x: 0, y: -0.85 }, 'aneurisma', { dy: 30, size: 15, cls: 'accent-tx' }); },
        },
      ],
    },
    practiceChapter({ num: '4', seed: 73202, kinds: ['v2', 'dP', 'dir', 'ke'], make: makeProblem, draw: (ink, p, s, t) => venturi(ink, Math.max(1.01, p.k ?? 2), t, { v1: 0.3, k: 0.12, Pref: 92 }), cam: () => CAM.ventuP }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '5',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 3.2 · Resumen', title: 'El teorema de Bernoulli', ideas: [
        'Donde el fluido va más rápido, la presión lateral es menor: para acelerar necesita más presión detrás que delante.',
        '<span class="m"><i>P</i> + ½<i>ρv</i>² + <i>ρgy</i> = cte</span> (fluido ideal); en un tubo horizontal, <span class="m"><i>P</i><sub>1</sub> − <i>P</i><sub>2</sub> = ½<i>ρ</i>(<i>v</i><sub>2</sub>² − <i>v</i><sub>1</sub>²)</span>.',
        'Siempre continuidad primero (para hallar <span class="m"><i>v</i><sub>2</sub></span>) y después Bernoulli.',
        'Aneurisma: se frena la sangre, sube la presión y, con Laplace, sube la tensión: la dilatación progresa.',
      ], next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#regimen">3.3 · Régimen y viscosidad ›</a>' }), draw() {} }],
    },
  ],
};
