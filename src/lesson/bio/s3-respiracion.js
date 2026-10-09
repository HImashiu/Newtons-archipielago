// Biofísica 4.3 — Mecánica de la respiración  (Semana 11, bloque «Resistencia»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 4.3.
//
// Pregunta: ¿por qué entra el aire si nadie lo empuja? El estudiante mueve el
// diafragma de un modelo de tórax con la glotis cerrada, anota P y V, descubre
// la ley de Boyle, ordena la cadena de la inspiración y aplica Poiseuille a la
// vía aérea (asma y broncodilatadores).

import { clamp, snap } from '../core/anim.js';
import { UI_ES, n, table, formula, titleCard, summaryCard, practiceChapter, askNumber, askChoice, orderChain, createWorkPanel, pick } from './kit.js';
import { bronchiole, boyleScene } from './scenes-resistencia.js';

const CAM = {
  title: { xmin: -3.6, xmax: 4.4, ymin: -0.8, ymax: 4.0 },
  boyle: { xmin: -4.6, xmax: 4.6, ymin: -0.8, ymax: 4.0 },
  airway: { xmin: -3.6, xmax: 3.6, ymin: -2.0, ymax: 2.2 },
  chain: { xmin: -3, xmax: 3, ymin: -2, ymax: 2 },
};

const V0 = 2.0, P0 = 760;
const pOf = (V) => (P0 * V0) / V;

const INSP = [
  'El diafragma se contrae y desciende; los intercostales elevan las costillas',
  'Aumenta el volumen del tórax y de los pulmones',
  'Por la ley de Boyle, la presión alveolar baja (≈ −1 a −3 mmHg)',
  'Ahora la presión atmosférica es mayor que la alveolar',
  'El aire fluye hacia adentro hasta que las presiones se igualan',
];

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'boyle': {
      const V1 = pick(rnd, [2, 2.5, 3]), V2 = V1 + pick(rnd, [0.5, 1]);
      return { kind, ask: `Un gas a 760 mmHg ocupa ${n(V1)} L. Se expande a ${n(V2)} L a temperatura constante. ¿Nueva presión?`, given: [['$P_1$', '760 mmHg'], ['$V_1$', `${n(V1)} L`], ['$V_2$', `${n(V2)} L`]], number: { label: '$P_2$ =', unit: 'mmHg', answer: (760 * V1) / V2 }, hint: '$P_1$ $V_1$ = $P_2$ $V_2$.', solution: [{ text: 'Boyle:', math: `760 × ${n(V1)}/${n(V2)} = ${n((760 * V1) / V2, 0)} mmHg` }], why: 'Más volumen, menos presión.', V: V2 / 1.5 };
    }
    case 'alv': {
      const dV = pick(rnd, [3, 6, 9]); // mL sobre 3 L
      const P2 = (760 * 3000) / (3000 + dV);
      return { kind, ask: `Los pulmones (3 L, 760 mmHg) aumentan ${dV} mL antes de que entre el aire. ¿Presión alveolar relativa a la atmósfera?`, given: [['$V_1$', '3000 mL'], ['Δ$V$', `${dV} mL`]], number: { label: 'Δ$P$ =', unit: 'mmHg', answer: P2 - 760, rel: 0.05 }, hint: '$P_2$ = 760 × 3000/(3000 + Δ$V$), luego resta 760.', solution: [{ text: 'Boyle:', math: `$P_2$ = ${n(P2, 2)} mmHg` }, { text: 'Relativa:', math: `${n(P2 - 760, 2)} mmHg` }], why: 'Una caída pequeña basta para mover el aire.', V: 2 };
    }
    case 'bd': {
      const k = pick(rnd, [1.2, 1.3, 1.5]);
      return { kind, ask: `Un broncodilatador aumenta el radio de los bronquiolos × ${n(k)}. ¿Por cuánto se multiplica el flujo de aire?`, given: [['$r$', `× ${n(k)}`]], number: { label: '×', unit: '', answer: k ** 4, d: 2 }, hint: '$Q$ ∝ $r$⁴.', solution: [{ text: 'Poiseuille:', math: `${n(k)}⁴ = ${n(k ** 4, 2)}` }], why: `× ${n(k ** 4, 2)}.`, V: 1.8 };
    }
    default: {
      const f = pick(rnd, [0.5, 0.6, 0.7, 0.8]);
      return { kind: 'asma', ask: `En una crisis asmática el radio bronquiolar queda en ${n(f * 100)} % del normal. ¿Qué porcentaje del flujo de aire queda (igual Δ$P$)?`, given: [['$r$', `${n(f * 100)} %`]], number: { label: '$Q$ =', unit: '%', answer: f ** 4 * 100, rel: 0.03 }, hint: '($r$/$r_0$)⁴.', solution: [{ text: 'Poiseuille:', math: `${n(f)}⁴ = ${n(f ** 4 * 100, 1)} %` }], why: 'Por eso el paciente debe hacer mucha más fuerza al respirar.', V: 2.2 };
    }
  }
}

export const s3 = {
  id: 'bio-s3', code: '4.3', title: 'Mecánica de la respiración', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.boyle, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, V: V0, rows: [] }),
  chapters: [
    {
      id: 'intro', title: 'Mecánica de la respiración', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · Resistencia · Lección 4.3', title: 'Mecánica de la respiración', sub: 'Respiras unas 20 000 veces al día y ningún músculo empuja el aire hacia adentro. ¿Entonces por qué entra? Vas a descubrirlo con un modelo del tórax.', meta: 'Unos 25 minutos · Semana 11 · Experimento · Asma · Práctica' }), draw({ ink }) { boyleScene(ink, 2.2, { air: 1 }); } }],
    },
    {
      id: 'pregunta', title: 'Una predicción', short: 'Pregunta', num: '1',
      beats: [
        {
          kind: 'do', cam: CAM.boyle,
          controls: (S) => [['sube', 'aumenta'], ['igual', 'no cambia'], ['baja', 'disminuye']].map(([id, label]) => ({ type: 'choice', id, label, state: S.g.pred === id ? 'right' : null, disabled: !!S.g.pred })),
          act(S, id) { S.g.pred ??= id; },
          caption: 'Predicción. Este cilindro representa el tórax; el pistón de abajo, el diafragma. Imagina que tapas la tráquea (glotis cerrada) y bajas el diafragma.',
          prompt: 'La presión del aire dentro del tórax…',
          success: 'Guardado. Hagamos el experimento.',
          draw({ ink }) { boyleScene(ink, 2.0); },
          done: (S) => !!S.g.pred, skip(S) { S.g.pred ??= 'sube'; },
        },
      ],
    },
    {
      id: 'boyle', title: 'Medir: la ley de Boyle', short: 'Boyle', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.boyle,
          caption: (S) => `Glotis cerrada · $V$ = ${n(S.V, 2)} L → $P$ = ${n(pOf(S.V), 0)} mmHg`,
          prompt: 'Arrastra el diafragma y anota $P$ y $V$ en al menos 4 posiciones distintas.',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar', primary: true }],
          act(S, id) { if (id === 'rec' && !S.rows.some((v) => Math.abs(v - S.V) < 0.05)) { S.rows.push(S.V); S.rows.sort((a, b) => a - b); } },
          success: 'Mira la última columna: siempre da lo mismo.',
          draw({ ink, S }) {
            boyleScene(ink, S.V);
            table(ink, 'tb', [{ h: 'V (L)', w: 60 }, { h: 'P (mmHg)', w: 84 }, { h: 'P·V', w: 70 }], S.rows.map((v) => [n(v, 2), n(pOf(v), 0), n(pOf(v) * v, 0)]), { right: false, x: 28, y: 160, empty: '—' });
          },
          handles: (S) => [{ key: 'd', p: { x: 0, y: 2.6 - S.V * 0.9 - 0.1 }, r: 26, cursor: 'ns-resize', drag: (S2, p) => { S2.V = clamp(snap((2.6 - p.y - 0.1) / 0.9, 0.1), 1.2, 2.8); } }],
          done: (S) => S.rows.length >= 4, skip(S) { S.rows = [1.5, 2, 2.4, 2.8]; },
        },
        {
          kind: 'do', cam: CAM.boyle,
          ...(() => { const c = askChoice({ key: 'law', choices: [
            { id: 'ok', label: '$P$ $V$ = constante (ley de Boyle)', correct: true },
            { id: 'a', label: '$P$ / $V$ = constante', why: 'Entonces más volumen daría más presión. Tu tabla muestra lo contrario.' },
            { id: 'b', label: '$P$ − $V$ = constante', why: 'Revisa la columna $P$·$V$: es ella la que no cambia.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Tu tabla: al aumentar $V$, $P$ baja, y el producto $P$·$V$ ≈ 1520 siempre.' }; })(),
          prompt: '¿Qué ley siguen tus datos (a temperatura constante)?',
          success: (S) => `$P_1$ $V_1$ = $P_2$ $V_2$. Al bajar el diafragma el volumen sube y la presión <b>baja</b>. Tu predicción: «${{ sube: 'aumenta', igual: 'no cambia', baja: 'disminuye' }[S.g.pred] ?? '—'}».`,
          draw({ ink }) { boyleScene(ink, 2.4); formula(ink, 'fb', '$P_1$ $V_1$ = $P_2$ $V_2$', { fx: 0.18, fy: 0.12 }); },
        },
        { kind: 'watch', dur: 4, cam: CAM.boyle, caption: 'Ahora abre la glotis. La presión dentro baja un poco respecto a la atmósfera, y el aire, como cualquier fluido, va de mayor a menor presión: <b>entra</b>. Nadie lo empuja: lo «empuja» la atmósfera.', draw({ ink }) { boyleScene(ink, 2.4, { air: 1 }); } },
        {
          kind: 'do', cam: CAM.boyle, panel: 'work',
          ...askNumber({ key: 'alv', label: '$P_{alv}$ =', unit: 'mmHg', answer: (760 * 3) / 3.006, rel: 0.0003, wrong: [[761.52, 'Más volumen → menos presión.']] }),
          caption: (S) => S.g.alv?.msg ?? (S.g.alv?.wrong ? '$P_2$ = 760 × 3/3,006.' : 'Pulmones reales: 3,000 L a 760 mmHg. Al empezar la inspiración aumentan a 3,006 L antes de que entre el aire.'),
          prompt: '¿Cuál es la presión alveolar? (da 2 decimales)',
          success: '≈ 758,5 mmHg: 1,5 mmHg menos que la atmósfera. Esa pequeña diferencia basta para mover medio litro de aire en cada respiración tranquila.',
          work: (S) => [{ h: 'Semi-resuelto' }, { step: 1, text: 'Boyle:', math: '$P_2$ = $P_1$ $V_1$ / $V_2$', state: 'done' }, { step: 2, text: 'Tu turno: sustituye.', state: S.g.alv?.ok ? 'done' : 'now' }],
          draw({ ink }) { boyleScene(ink, 2.1, { air: 1 }); },
        },
      ],
    },
    {
      id: 'ciclo', title: 'El ciclo respiratorio', short: 'Ciclo', num: '3',
      beats: [
        (() => { const ch = orderChain({ key: 'insp', steps: INSP }); return { kind: 'do', cam: CAM.chain, ...ch, caption: (S) => (ch.wrongId(S) ? 'Ese paso viene más adelante.' : 'Explica la inspiración, eslabón por eslabón.'), prompt: 'Elige qué ocurre después.', success: 'La espiración tranquila es lo contrario y es <b>pasiva</b>: el diafragma se relaja, el pulmón elástico se retrae (como la aorta en 2.2), $V$ baja, $P$ sube por encima de la atmosférica y el aire sale.', draw({ ink, S }) { ch.draw(ink, S); } }; })(),
        {
          kind: 'do', cam: CAM.boyle,
          ...(() => { const c = askChoice({ key: 'ptx', choices: [
            { id: 'ok', label: 'Entra aire al espacio pleural, el pulmón se colapsa y no se expande con el tórax', correct: true },
            { id: 'a', label: 'El pulmón se infla más porque entra más aire', why: 'El aire entra a la pleura, no al pulmón: la presión pleural deja de ser negativa.' },
            { id: 'b', label: 'Nada: el diafragma sigue funcionando igual', why: 'El diafragma se mueve, pero el pulmón ya no está «pegado» a la pared.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Caso: una herida en el tórax abre la pleura (neumotórax). La presión pleural normal es negativa (≈ −5 cmH₂O): mantiene el pulmón pegado a la pared.' }; })(),
          prompt: '¿Qué pasa con ese pulmón?',
          success: 'Sin presión negativa el pulmón se retrae por su elasticidad; al bajar el diafragma no cambia el volumen alveolar, Boyle no actúa y no entra aire. Disnea, hipoxemia; se trata con un tubo de tórax.',
          draw({ ink }) { boyleScene(ink, 2.0); },
        },
      ],
    },
    {
      id: 'via', title: 'Resistencia de la vía aérea', short: 'Vía aérea', num: '4',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.airway, caption: 'El aire también obedece $Q$ = Δ$P$/$R$ y, en flujo laminar, Poiseuille: $R$ ∝ 1/$r$⁴. Como en 4.2, los bronquiolos están en paralelo por miles: la mayor resistencia está en los bronquios medianos.', draw({ ink }) { bronchiole(ink, 'b1', { x: -1.5, y: 0.2 }, 1.0, { label: 'sano' }); bronchiole(ink, 'b2', { x: 1.6, y: 0.2 }, 0.6, { wall: 0.5, mucus: true, label: 'asma' }); } },
        {
          kind: 'do', cam: CAM.airway, panel: 'work',
          ...askNumber({ key: 'bd', label: '×', unit: '', answer: 1.25 ** 4, rel: 0.02, wrong: [[1.25, 'El flujo depende de $r$⁴.'], [1.5625, 'Eso es $r$². Poiseuille usa $r$⁴.']] }),
          caption: (S) => S.g.bd?.msg ?? (S.g.bd?.wrong ? '1,25⁴.' : 'Independiente: un paciente con asma inhala salbutamol, que relaja el músculo liso y aumenta el radio bronquiolar un 25 %.'),
          prompt: '¿Por cuánto se multiplica el flujo de aire (igual esfuerzo)?',
          success: '× 2,44: un cambio pequeño de radio más que duplica el flujo. Por eso el alivio es tan rápido.',
          work: (S) => [{ h: 'Independiente' }, { given: [['$r$', '× 1,25'], ['Δ$P$', 'igual']] }, ...(S.g.bd?.ok ? [{ result: '× 2,44', ok: true }] : [])],
          draw({ ink, S }) { bronchiole(ink, 'b1', { x: -1.5, y: 0.2 }, 0.6, { wall: 0.5, mucus: true, label: 'antes' }); bronchiole(ink, 'b2', { x: 1.6, y: 0.2 }, S.g.bd?.ok ? 0.75 : 0.6, { wall: 0.4, label: 'con salbutamol' }); },
        },
      ],
    },
    practiceChapter({ num: '5', seed: 74303, kinds: ['boyle', 'alv', 'bd', 'asma'], make: makeProblem, draw: (ink, p) => { boyleScene(ink, clamp(p.V, 1.2, 2.8)); }, cam: () => CAM.boyle }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 4.3 · Resumen', title: 'Mecánica de la respiración', ideas: [
        'Ley de Boyle (T constante): <span class="m"><i>P</i><sub>1</sub><i>V</i><sub>1</sub> = <i>P</i><sub>2</sub><i>V</i><sub>2</sub></span>; tus datos dieron <i>P·V</i> constante.',
        'Inspiración: el diafragma aumenta <i>V</i>, la presión alveolar baja ≈ 1–3 mmHg y el aire entra. Espiración tranquila: pasiva, por retracción elástica.',
        'Neumotórax: se pierde la presión pleural negativa y el pulmón se colapsa.',
        'Vía aérea: <span class="m"><i>Q</i> ∝ <i>r</i>⁴</span>. Asma reduce el radio; un broncodilatador +25 % → flujo × 2,44.',
      ], next: '<span class="eyebrow">Fin del bloque</span> <a class="cm-next" href="#presion">Volver a 1.1 · Presión ›</a>' }), draw() {} }],
    },
  ],
};
