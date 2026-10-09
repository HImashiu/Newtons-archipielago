// Biofísica 4.1 — La ley de Poiseuille  (Semana 10, bloque «Resistencia»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 4.1.
//
// Pregunta: una coronaria pierde la mitad de su radio; ¿cuánto flujo pierde?
// El estudiante mide el caudal con distintos radios, descubre el exponente 4
// con sus propios datos, comprueba el efecto de la viscosidad y la longitud,
// ensambla la ley y la aplica con desvanecimiento a asma, carótida y coronaria.

import { clamp, snap } from '../core/anim.js';
import { UI_ES, n, table, formula, titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick } from './kit.js';
import { poisTube, qrGraph, bronchiole } from './scenes-resistencia.js';

const CAM = {
  title: { xmin: -4.2, xmax: 4.2, ymin: -2.0, ymax: 2.6 },
  tube: { xmin: -4.4, xmax: 4.4, ymin: -1.9, ymax: 2.4 },
  tubeP: { xmin: -4.2, xmax: 4.2, ymin: -2.0, ymax: 2.4 },
  pois: { xmin: -4.4, xmax: 9.6, ymin: -1.9, ymax: 3.2 },
  airway: { xmin: -3.6, xmax: 3.6, ymin: -2.0, ymax: 2.2 },
};

const PRED = { half: 'a la mitad', quarter: 'a la cuarta parte', six: 'a la dieciseisava parte' };

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'ratio': {
      const f = pick(rnd, [2, 3, 1.5]);
      return { kind, ask: `El radio de un vaso se reduce a 1/${n(f)}. A igual presión, ¿cuántas veces disminuye el flujo?`, given: [['$r_2$', `$r_1$/${n(f)}`]], number: { label: '÷', unit: 'veces', answer: f ** 4 }, hint: '$Q$ ∝ $r$⁴.', solution: [{ text: 'Poiseuille:', math: `${n(f)}⁴ = ${n(f ** 4, 2)}` }], why: `÷ ${n(f ** 4, 2)}.`, rr: 1 / f };
    }
    case 'pct': {
      const red = pick(rnd, [10, 20, 30, 40, 50, 70]);
      const rr = 1 - red / 100;
      return { kind, ask: `Una placa reduce el radio un ${red} %. ¿Qué porcentaje del flujo queda?`, given: [['reducción del radio', `${red} %`]], number: { label: '$Q$ =', unit: '% de $Q_0$', answer: rr ** 4 * 100, rel: 0.03 }, hint: `(${n(rr, 2)})⁴ × 100.`, solution: [{ text: 'Flujo:', math: `${n(rr, 2)}⁴ = ${n(rr ** 4, 4)} → ${n(rr ** 4 * 100, 1)} %` }], why: `${n(rr ** 4 * 100, 1)} %.`, rr };
    }
    case 'eta': {
      const f = pick(rnd, [1.5, 2, 3]);
      return { kind, ask: `La viscosidad se multiplica por ${n(f)} (policitemia). A igual presión, ¿qué fracción del flujo queda?`, given: [['$η$', `× ${n(f)}`]], number: { label: '$Q$/$Q_0$ =', unit: '', answer: 1 / f, d: 2 }, hint: '$Q$ ∝ 1/$η$.', solution: [{ text: 'Inversa:', math: `1/${n(f)} = ${n(1 / f, 2)}` }], why: `${n(1 / f, 2)}.`, rr: 0.9 };
    }
    default: {
      const k = pick(rnd, [1.1, 1.2, 1.25, 1.5]);
      return { kind: 'dil', ask: `Un vasodilatador aumenta el radio un ${n((k - 1) * 100)} %. ¿Por cuánto se multiplica el flujo?`, given: [['$r$', `× ${n(k, 2)}`]], number: { label: '×', unit: '', answer: k ** 4, d: 2 }, hint: '$Q$ ∝ $r$⁴.', solution: [{ text: 'Flujo:', math: `${n(k, 2)}⁴ = ${n(k ** 4, 2)}` }], why: `× ${n(k ** 4, 2)}: pequeños cambios de radio, grandes cambios de flujo.`, rr: 1 };
    }
  }
}

function coroStep(k, caption) {
  return {
    kind: 'watch', dur: 3, pause: true, autoPause: false, cam: CAM.tubeP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Ejemplo resuelto · asma' }, { given: [['radio bronquiolar', '$r$ → $r$/2'], ['Δ$P$, $η$, $L$', 'iguales']] },
        { step: 1, text: 'Poiseuille, todo igual salvo el radio:', math: '$Q_2/Q_1$ = ($r_2/r_1$)⁴', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Sustituyendo:', math: '(½)⁴ = 1/16', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Conclusión:', math: 'el flujo de aire cae 16 veces', state: st(3) }] : []),
      ];
    },
    draw({ ink }) { bronchiole(ink, 'b1', { x: -1.5, y: 0.2 }, 1.0, { label: 'sano' }); bronchiole(ink, 'b2', { x: 1.6, y: 0.2 }, 0.5, { wall: 0.6, mucus: true, label: 'broncoespasmo' }); },
  };
}

export const s1 = {
  id: 'bio-s1', code: '4.1', title: 'La ley de Poiseuille', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.pois, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, rr: 1, rows: [], eta: 1, L: 1, eSeen: new Set() }),
  chapters: [
    {
      id: 'intro', title: 'La ley de Poiseuille', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · Resistencia · Lección 4.1', title: 'La ley de Poiseuille', sub: 'Una placa reduce a la mitad el radio de una arteria coronaria. ¿Cuánto flujo se pierde? Vas a medirlo y a descubrir la ley que lo gobierna.', meta: 'Unos 30 minutos · Semana 10 · Experimento · Casos de la clase · Práctica' }), draw({ ink }, t) { poisTube(ink, 0.8, t, { labels: false, x0: -4, x1: 4 }); } }],
    },
    {
      id: 'pregunta', title: 'Una predicción', short: 'Pregunta', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.tube, caption: 'La sangre fluye porque hay una diferencia de presión Δ$P$ entre los extremos de un vaso. El vaso se opone con una <b>resistencia</b> $R$: $Q$ = Δ$P$/$R$, como la ley de Ohm. El corazón genera Δ$P$; las arteriolas regulan $R$.', draw({ ink }, t) { poisTube(ink, 0.8, t, { profile: false }); formula(ink, 'fo', '$Q$ = Δ$P$ / $R$', { fy: 0.1 }); } },
        {
          kind: 'do', cam: CAM.tube,
          controls: (S) => Object.entries(PRED).map(([id, label]) => ({ type: 'choice', id, label, state: S.g.pred === id ? 'right' : null, disabled: !!S.g.pred })),
          act(S, id) { S.g.pred ??= id; },
          caption: 'Predicción: aún no hay respuesta correcta.',
          prompt: 'Si el radio de una coronaria se reduce a la mitad (con la misma presión), su flujo se reduce…',
          success: 'Guardado. Vamos a medir.',
          draw({ ink }, t) { poisTube(ink, 0.8, t, {}); },
          done: (S) => !!S.g.pred, skip(S) { S.g.pred ??= 'quarter'; },
        },
      ],
    },
    {
      id: 'radio', title: 'Medir: el radio', short: 'El radio', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.pois,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `$r$ = ${n(S.rr * 100, 0)} % de $r_0$ → caudal medido ${n(S.rr ** 4 * 100, 1)} % de $Q_0$`,
          prompt: 'Estrecha el vaso (arrastra su pared) y anota el caudal con al menos 3 radios, incluido el 50 %.',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar', primary: true }],
          act(S, id) { if (id === 'rec' && !S.rows.some((r) => Math.abs(r - S.rr) < 0.02)) { S.rows.push(S.rr); S.rows.sort((a, b) => b - a); } },
          success: 'Mira la fila del 50 %: el caudal no es la mitad ni la cuarta parte.',
          draw({ ink, S }) {
            poisTube(ink, 0.8 * S.rr, S.tt ?? 0, { x1: 2.8 });
            qrGraph(ink, S.rr, { curveOp: S.rows.length >= 3 ? 1 : 0 });
            table(ink, 'tb', [{ h: 'r / r₀', w: 70 }, { h: 'Q / Q₀', w: 80 }], S.rows.map((r) => [n(r, 2), n(r ** 4, 3)]), { right: false, x: 28, y: 160, empty: '—' });
          },
          handles: (S) => [{ key: 'r', p: { x: -1.5, y: 0.8 * S.rr + 0.09 }, r: 24, cursor: 'ns-resize', drag: (S2, p) => { S2.rr = clamp(snap((p.y - 0.09) / 0.8, 0.05), 0.25, 1); } }],
          done: (S) => S.rows.length >= 3 && S.rows.some((r) => Math.abs(r - 0.5) < 0.01),
          skip(S) { S.rows = [1, 0.75, 0.5]; },
        },
        {
          kind: 'do', cam: CAM.pois,
          ...(() => { const c = askChoice({ key: 'exp', choices: [
            { id: '1', label: '$Q$ ∝ $r$', why: 'Entonces con la mitad del radio tendrías la mitad del caudal. Tu tabla dice 0,0625.' },
            { id: '2', label: '$Q$ ∝ $r$²', why: 'Eso daría 0,25 con la mitad del radio (solo por el área). Tu tabla dice 0,0625.' },
            { id: '4', label: '$Q$ ∝ $r$⁴', correct: true },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Con $r$ = 0,5 $r_0$ mediste $Q$ = 0,0625 $Q_0$ = 1/16. ¿Qué potencia de ½ da 1/16?' }; })(),
          prompt: '¿Qué relación siguen tus datos?',
          success: (S) => `$Q$ ∝ $r$⁴: (½)⁴ = 1/16. Tu predicción era «${PRED[S.g.pred] ?? '—'}». Dos razones se multiplican: un radio menor reduce el área (× ¼) y además frena la sangre por el rozamiento con la pared (otro × ¼).`,
          draw({ ink, S }) { poisTube(ink, 0.4, S.tt ?? 0, { x1: 2.8 }); qrGraph(ink, 0.5, { linOp: 1 }); },
        },
      ],
    },
    {
      id: 'ley', title: 'La ley completa', short: 'La ley', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.tube,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `$η$ × ${n(S.eta)} · $L$ × ${n(S.L)} → caudal ${n(100 / (S.eta * S.L), 0)} %`,
          prompt: 'Prueba ahora la viscosidad y la longitud: duplica cada una.',
          controls: (S) => [
            { type: 'button', id: 'eta', label: S.eta > 1 ? 'Viscosidad normal' : 'Duplicar viscosidad' },
            { type: 'button', id: 'L', label: S.L > 1 ? 'Longitud normal' : 'Duplicar longitud' },
          ],
          act(S, id) { if (id === 'eta') S.eta = S.eta > 1 ? 1 : 2; else S.L = S.L > 1 ? 1 : 2; S.eSeen.add(id); },
          success: 'Doble viscosidad: mitad de caudal. Doble longitud: mitad de caudal. El caudal es inversamente proporcional a $η$ y a $L$, y proporcional a Δ$P$.',
          draw({ ink, S }) { poisTube(ink, 0.8, (S.tt ?? 0) / (S.eta * S.L), { x1: 3.2 }); },
          done: (S) => S.eSeen.has('eta') && S.eSeen.has('L'), skip(S) { S.eSeen.add('eta'); S.eSeen.add('L'); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...(() => { const c = askChoice({ key: 'law', choices: [
            { id: 'ok', label: '$Q$ = $π$ $r$⁴ Δ$P$ / (8 $η$ $L$)', correct: true },
            { id: 'a', label: '$Q$ = $π$ $r$² Δ$P$ $η$ / (8 $L$)', why: 'Revisa: el radio va a la cuarta y la viscosidad abajo.' },
            { id: 'b', label: '$Q$ = 8 $η$ $L$ / ($π$ $r$⁴ Δ$P$)', why: 'Esa expresión baja con el radio. Tu experimento mostró lo contrario.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Reúne lo que mediste: $r$⁴ arriba, Δ$P$ arriba, $η$ y $L$ abajo (el factor $π$/8 sale del perfil parabólico).' }; })(),
          prompt: '¿Cuál es la ley?',
          success: '<b>Ley de Poiseuille</b> (flujo laminar). Comparando con $Q$ = Δ$P$/$R$: la resistencia es $R$ = 8 $η$ $L$ / ($π$ $r$⁴). El radio es el regulador más potente.',
          draw({ ink }, t) { poisTube(ink, 0.8, t, {}); formula(ink, 'fp', '$Q$ = $π$ $r$⁴ Δ$P$ / (8 $η$ $L$)     $R$ = 8 $η$ $L$ / ($π$ $r$⁴)', { fy: 0.08, size: 24 }); },
        },
      ],
    },
    {
      id: 'casos', title: 'Casos de la clase', short: 'Casos', num: '4',
      beats: [
        coroStep(1, 'Ejemplo resuelto (caso 1, asma): en un broncoespasmo el edema, el moco y la contracción muscular reducen el radio bronquiolar a la mitad.'),
        coroStep(2, 'Solo cambia el radio, así que todo lo demás se cancela.'),
        coroStep(3, 'El flujo de aire cae 16 veces: disnea, sibilancias y espiración prolongada. Los broncodilatadores devuelven el radio.'),
        {
          kind: 'do', cam: CAM.pois, panel: 'work',
          ...askNumber({ key: 'car', label: '$Q$ =', unit: '% de $Q_0$', answer: 0.81, rel: 0.04, wrong: [[24.01, 'Eso sería con el 70 % del radio. Se reduce un 70 %: queda el 30 %.'], [30, 'Ese es el radio que queda; el flujo es su cuarta potencia.']] }),
          caption: (S) => S.g.car?.msg ?? (S.g.car?.wrong ? 'Queda 0,30 del radio.' : 'Semi-resuelto (caso 4, estenosis carotídea): una placa reduce el radio un 70 %. El planteamiento ya está hecho.'),
          prompt: '¿Qué porcentaje del flujo cerebral queda?',
          success: '0,3⁴ ≈ 0,8 %. La autorregulación y la circulación colateral compensan en parte, pero explica el riesgo de AIT, amaurosis fugaz y ACV.',
          work: (S) => [{ h: 'Semi-resuelto' }, { step: 1, text: 'Radio restante:', math: '$r$ = 0,30 $r_0$', state: 'done' }, { step: 2, text: 'Tu turno: ($r/r_0$)⁴ en %.', state: S.g.car?.ok ? 'done' : 'now' }],
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { poisTube(ink, 0.24, S.tt ?? 0, { x1: 2.8 }); qrGraph(ink, 0.3); },
        },
        {
          kind: 'do', cam: CAM.tubeP, panel: 'work',
          ...askNumber({ key: 'cor', label: 'reducción =', unit: '%', answer: 93.75, rel: 0.01, wrong: [[6.25, 'Ese es el flujo que queda. Se pide cuánto se pierde.'], [50, 'El flujo no es proporcional al radio.']] }),
          caption: (S) => S.g.cor?.msg ?? (S.g.cor?.wrong ? '1 − (½)⁴.' : 'Independiente: hombre de 55 años con angina de esfuerzo. Una coronaria pasa de 2 mm a 1 mm de radio en un segmento de 3 cm (Δ$P$ = 20 mmHg, $η$ = 0,004 Pa·s).'),
          prompt: '¿En qué porcentaje se reduce el flujo en ese segmento?',
          success: '1 − 1/16 = 93,75 %. (Con números, Poiseuille da ≈ 1,4 × 10⁻⁴ m³/s → 8,7 × 10⁻⁶ m³/s; el modelo ideal exagera el valor absoluto, pero la proporción es robusta.) En el esfuerzo el miocardio pide más oxígeno del que llega: angina.',
          work: (S) => [{ h: 'Independiente' }, { given: [['$r$', '2 mm → 1 mm'], ['$L$', '3 cm'], ['Δ$P$', '20 mmHg']] }, ...(S.g.cor?.ok ? [{ result: '− 93,75 %', ok: true }] : [])],
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { poisTube(ink, 0.4, S.tt ?? 0, {}); },
        },
      ],
    },
    practiceChapter({ num: '5', seed: 74101, kinds: ['ratio', 'pct', 'dil', 'eta'], make: makeProblem, draw: (ink, p, s, t) => { poisTube(ink, 0.8 * p.rr, t, { x1: 2.8 }); qrGraph(ink, p.rr); }, cam: () => CAM.pois }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 4.1 · Resumen', title: 'La ley de Poiseuille', ideas: [
        '<span class="m"><i>Q</i> = Δ<i>P</i>/<i>R</i></span>: el corazón genera la presión, las arteriolas regulan la resistencia.',
        'Tus datos: mitad de radio → 1/16 del caudal. <span class="m"><i>Q</i> ∝ <i>r</i>⁴</span>; doble <span class="m"><i>η</i></span> o doble <span class="m"><i>L</i></span> → mitad.',
        'Poiseuille: <span class="m"><i>Q</i> = π<i>r</i>⁴Δ<i>P</i>/(8<i>ηL</i>)</span>, <span class="m"><i>R</i> = 8<i>ηL</i>/(π<i>r</i>⁴)</span>.',
        'Asma ÷ 16; carótida −70 % del radio → < 1 % del flujo; coronaria −50 % del radio → −94 % del flujo.',
      ], next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#redes">4.2 · Redes y regulación ›</a>' }), draw() {} }],
    },
  ],
};
