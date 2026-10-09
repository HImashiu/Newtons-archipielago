// Biofísica 3.1 — Caudal y continuidad  (Semanas 8–9, bloque «Flujo»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 3.1.
//
// Pregunta de partida: ¿dónde va más rápida la sangre, en la aorta o en los
// capilares? El estudiante construye Q = A·v contando el volumen que cruza una
// sección, descubre A·v = constante con sus propias mediciones y resuelve la
// paradoja de los capilares con el área total.

import { clamp, snap } from '../core/anim.js';
import { UI_ES, n, table, readout, formula, titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick } from './kit.js';
import { narrowing, flowTube, caudalScene, treeScene } from './scenes-flujo.js';

const CAM = {
  title: { xmin: -4.2, xmax: 4.2, ymin: -2.0, ymax: 2.6 },
  tube: { xmin: -4.4, xmax: 4.4, ymin: -1.9, ymax: 2.4 },
  tree: { xmin: -0.6, xmax: 9.4, ymin: -1.2, ymax: 3.6 },
};

const PRED = { aorta: 'en la aorta', cap: 'en los capilares', eq: 'igual en los dos' };

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'Q': {
      const A = pick(rnd, [1, 2, 3, 4, 5]);
      const v = pick(rnd, [10, 15, 20, 30]);
      return { kind, ask: `Sangre a ${v} cm/s por un vaso de ${A} cm² de sección. ¿Caudal?`, given: [['$A$', `${A} cm²`], ['$v$', `${v} cm/s`]], number: { label: '$Q$ =', unit: 'mL/s', answer: A * v }, hint: '$Q$ = $A$·$v$ (cm² · cm/s = cm³/s = mL/s).', solution: [{ text: 'Caudal:', math: `${A}·${v} = ${A * v} mL/s` }], why: `${A * v} mL/s.`, r: 0.6 };
    }
    case 'gc': {
      const L = pick(rnd, [4, 5, 6, 7, 8]);
      return { kind, ask: `Gasto cardíaco de ${L} L/min: ¿cuántos mL/s?`, given: [['$Q$', `${L} L/min`]], number: { label: '$Q$ =', unit: 'mL/s', answer: (L * 1000) / 60 }, hint: '× 1000 y ÷ 60.', solution: [{ text: 'Conversión:', math: `${L}·1000/60 = ${n((L * 1000) / 60, 1)} mL/s` }], why: `${n((L * 1000) / 60, 1)} mL/s.`, r: 0.6 };
    }
    case 'cont': {
      const v1 = pick(rnd, [10, 20, 30]);
      const k = pick(rnd, [2, 3, 4]);
      const byD = rnd() < 0.5;
      const ans = byD ? v1 * k * k : v1 * k;
      return { kind, ask: byD ? `El diámetro de un vaso se reduce a 1/${k}. Antes la sangre iba a ${v1} cm/s. ¿Y en el estrechamiento?` : `El área se reduce a 1/${k}. Antes la sangre iba a ${v1} cm/s. ¿Y en el estrechamiento?`, given: [['$v_1$', `${v1} cm/s`], [byD ? 'diámetro' : 'área', `÷ ${k}`]], number: { label: '$v_2$ =', unit: 'cm/s', answer: ans }, hint: byD ? 'Área ∝ diámetro²: si el diámetro ÷ k, el área ÷ k².' : '$A_1$ $v_1$ = $A_2$ $v_2$.', solution: [{ text: 'Continuidad:', math: `$v_2$ = ${v1} × ${byD ? k * k : k} = ${ans} cm/s` }], why: `${ans} cm/s.`, k: byD ? k * k : k };
    }
    default: {
      const Q = pick(rnd, [80, 83, 100]);
      const A = pick(rnd, [2000, 2500, 3000]);
      return { kind: 'capv', ask: `Si ${Q} mL/s atraviesan capilares con un área total de ${A} cm², ¿velocidad media en mm/s?`, given: [['$Q$', `${Q} mL/s`], ['$A_{total}$', `${A} cm²`]], number: { label: '$v$ =', unit: 'mm/s', answer: (Q / A) * 10, d: 2 }, hint: '$v$ = $Q$/$A$ en cm/s; × 10 para mm/s.', solution: [{ text: 'Velocidad:', math: `${Q}/${A} = ${n(Q / A, 3)} cm/s = ${n((Q / A) * 10, 2)} mm/s` }], why: `${n((Q / A) * 10, 2)} mm/s.`, r: 0.9 };
    }
  }
}

export const r1 = {
  id: 'bio-r1', code: '3.1', title: 'Caudal y continuidad', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.tube, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, ratio: 1, rows: [] }),
  chapters: [
    {
      id: 'intro', title: 'Caudal y continuidad', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · Flujo · Lección 3.1', title: 'Caudal y continuidad', sub: '¿Dónde va más rápida la sangre: en la aorta, un tubo de 2,5 cm, o en un capilar de 8 µm? La respuesta sorprende, y es vital para el intercambio de oxígeno.', meta: 'Unos 25 minutos · Semanas 8–9 · Experimento · Práctica' }), draw({ ink }, t) { flowTube(ink, 'tt', narrowing(0.7, 0.4, true), t, { v0: 0.6, x0: -4, x1: 4 }); } }],
    },
    {
      id: 'pregunta', title: 'Una predicción', short: 'Pregunta', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.tube, caption: 'Las líneas de flujo muestran el camino de la sangre. En un flujo ordenado no se cruzan, y la velocidad es tangente a ellas. Fíjate: donde el tubo se estrecha, las líneas se juntan.', draw({ ink }, t) { flowTube(ink, 'id', narrowing(0.75, 0.4, true), t, { v0: 0.6 }); } },
        {
          kind: 'do', cam: CAM.tube,
          controls: (S) => Object.entries(PRED).map(([id, label]) => ({ type: 'choice', id, label, state: S.g.pred === id ? 'right' : null, disabled: !!S.g.pred })),
          act(S, id) { S.g.pred ??= id; },
          caption: 'Predicción: aún no hay respuesta correcta.',
          prompt: '¿Dónde crees que va más rápida la sangre: en la aorta o en los capilares?',
          success: 'Guardado. Para responder necesitamos dos ideas: el caudal y la continuidad.',
          draw({ ink }, t) { flowTube(ink, 'id', narrowing(0.75, 0.4, true), t, { v0: 0.6 }); },
          done: (S) => !!S.g.pred, skip(S) { S.g.pred ??= 'cap'; },
        },
      ],
    },
    {
      id: 'caudal', title: 'Caudal', short: 'Caudal', num: '2',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.tube, caption: 'El <b>caudal</b> $Q$ es el volumen que cruza una sección por unidad de tiempo: $Q$ = Δ$V$/Δ$t$ (mL/s, L/min). Imagina el plano rojo: en un tiempo Δ$t$, lo cruza un cilindro de líquido de largo $v$·Δ$t$.', draw({ ink }, t) { caudalScene(ink, 0.8, t, { cylOp: 1 }); } },
        {
          kind: 'do', cam: CAM.tube, panel: 'work',
          ...askNumber({ key: 'vol', label: 'Δ$V$ =', unit: 'mL', answer: 60, wrong: [[6.67, 'Volumen del cilindro = base × largo, no división.'], [23, 'Multiplica, no sumes.']] }),
          caption: (S) => S.g.vol?.msg ?? (S.g.vol?.wrong ? 'Volumen del cilindro: $A$ × largo, con largo = $v$ × 1 s.' : 'La sección mide $A$ = 3 cm² y la sangre avanza a $v$ = 20 cm/s.'),
          prompt: '¿Qué volumen cruza el plano en 1 segundo?',
          success: '3 cm² × 20 cm = 60 cm³ = 60 mL en 1 s. En general, $Q$ = $A$·$v$.',
          work: (S) => [{ h: 'Construyendo $Q$ = $A$·$v$' }, { step: 1, text: 'Largo del cilindro en 1 s:', math: '$v$·Δ$t$ = 20 cm', state: 'done' }, { step: 2, text: 'Volumen = base × largo.', state: S.g.vol?.ok ? 'done' : 'now' }, ...(S.g.vol?.ok ? [{ step: 3, text: 'Dividiendo entre Δ$t$:', math: '$Q$ = $A$·$v$', state: 'now' }] : [])],
          draw({ ink }, t) { caudalScene(ink, 0.8, t); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...askNumber({ key: 'gc', label: '$Q$ =', unit: 'mL/s', answer: 83.3, rel: 0.01, wrong: [[300000, 'Un minuto tiene 60 s: divide.', 0.05], [5000, 'Eso es por minuto.']] }),
          caption: (S) => S.g.gc?.msg ?? (S.g.gc?.wrong ? '1 L = 1000 mL; 1 min = 60 s.' : 'El <b>gasto cardíaco</b> es el caudal del corazón: unos 5 L/min en reposo.'),
          prompt: 'Exprésalo en mL/s.',
          success: '≈ 83 mL/s. Todo ese caudal pasa por la aorta, y después por todas las arterias, todos los capilares y todas las venas.',
          draw({ ink }, t) { caudalScene(ink, 0.8, t, { cylOp: 0.4 }); },
        },
      ],
    },
    {
      id: 'continuidad', title: 'Continuidad', short: 'Continuidad', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.tube,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `Área del tramo derecho: $A_1$/${n(S.ratio, 1)}   ·   velocidad medida: ${n(S.ratio, 1)} × $v_1$`,
          prompt: 'Estrecha o ensancha el tramo derecho (arrastra su pared) y anota 3 situaciones distintas.',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar', primary: true }],
          act(S, id) { if (id === 'rec' && !S.rows.some((r) => Math.abs(r - S.ratio) < 0.15)) { S.rows.push(S.ratio); S.rows.sort((a, b) => a - b); } },
          success: 'Mira la última columna: siempre 1. El producto $A$·$v$ no cambia a lo largo del tubo.',
          draw({ ink, S }) {
            flowTube(ink, 'ct', narrowing(0.75, 0.75 / Math.sqrt(S.ratio)), S.tt ?? 0, { v0: 0.45 });
            table(ink, 'tb', [{ h: 'A₂ / A₁', w: 70 }, { h: 'v₂ / v₁', w: 70 }, { h: '(A₂ v₂)/(A₁ v₁)', w: 120 }], S.rows.map((r) => [n(1 / r, 2), n(r, 1), '1,0']), { y: 18, empty: '—' });
          },
          handles: (S) => [{ key: 'w', p: { x: 2.6, y: 0.75 / Math.sqrt(S.ratio) + 0.09 }, r: 24, cursor: 'ns-resize', drag: (S2, p) => { const r2 = clamp(p.y - 0.09, 0.3, 1.1); S2.ratio = clamp(snap((0.75 / r2) ** 2, 0.1), 0.5, 6); } }],
          done: (S) => S.rows.length >= 3,
          skip(S) { S.rows = [0.5, 2, 4]; },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...(() => { const c = askChoice({ key: 'law', choices: [
            { id: 'v', label: 'la velocidad', why: 'Tu tabla muestra que la velocidad cambia mucho.' },
            { id: 'Av', label: 'el producto $A$·$v$, es decir, el caudal', correct: true },
            { id: 'A', label: 'el área', why: 'Eres tú quien la cambia.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'La sangre no se crea ni se acumula en el tubo.' }; })(),
          prompt: 'Según tu tabla, ¿qué permanece constante?',
          success: '<b>Ecuación de continuidad</b>: $A_1$ $v_1$ = $A_2$ $v_2$. Donde el tubo se estrecha, el fluido acelera; donde se ensancha, se frena.',
          draw({ ink }, t) { flowTube(ink, 'ct', narrowing(0.75, 0.4), t, { v0: 0.45 }); formula(ink, 'fc', '$A_1$ $v_1$ = $A_2$ $v_2$', { fy: 0.1 }); },
        },
        {
          kind: 'do', cam: CAM.tree,
          ...askNumber({ key: 'vao', label: '$v$ =', unit: 'cm/s', answer: 83 / 4, rel: 0.03, wrong: [[332, 'Divide: $v$ = $Q$/$A$.']] }),
          caption: (S) => S.g.vao?.msg ?? (S.g.vao?.wrong ? '$v$ = $Q$/$A$.' : 'Los 83 mL/s pasan por la aorta, de unos 4 cm² de sección.'),
          prompt: '¿A qué velocidad media va la sangre en la aorta?',
          success: '≈ 21 cm/s.',
          draw({ ink }) { treeScene(ink, 0, { op: 0.25 }); },
        },
        {
          kind: 'do', cam: CAM.tree,
          ...(() => { const c = askChoice({ key: 'total', choices: [
            { id: 'one', label: 'el área de UN capilar (minúscula)', why: 'La sangre no pasa por un capilar: se reparte entre millones. Hay que sumar todas sus secciones.' },
            { id: 'tot', label: 'el área TOTAL de todos los capilares juntos (≈ 2500 cm²)', correct: true },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Para aplicar continuidad a los capilares, ¿qué área usas?' }; })(),
          prompt: '¿Qué área cuenta?',
          success: 'Millones de capilares en paralelo suman unos 2500 cm²: ¡600 veces el área de la aorta!',
          draw({ ink }) { treeScene(ink, 0, { op: 0.25, areas: 1 }); },
        },
        {
          kind: 'do', cam: CAM.tree,
          ...askNumber({ key: 'vcap', label: '$v$ =', unit: 'mm/s', answer: (83 / 2500) * 10, rel: 0.05, wrong: [[83 / 2500, 'Ese valor está en cm/s; pásalo a mm/s.', 0.05]] }),
          caption: (S) => S.g.vcap?.msg ?? (S.g.vcap?.wrong ? '$v$ = $Q$/$A_{total}$, luego cm → mm.' : 'Mismo caudal, 83 mL/s, a través de 2500 cm².'),
          prompt: '¿Velocidad media en los capilares (mm/s)?',
          success: (S) => `≈ 0,33 mm/s: unas 600 veces más lenta que en la aorta. Tu predicción era «${PRED[S.g.pred] ?? '—'}». ${S.g.pred === 'aorta' ? '¡Correcta!' : 'La clave es el área total.'} La lentitud da tiempo al intercambio de O₂ y CO₂.`,
          draw({ ink }, t) { treeScene(ink, t, { areas: 1 }); },
        },
      ],
    },
    practiceChapter({ num: '4', seed: 73101, kinds: ['Q', 'cont', 'gc', 'capv'], make: makeProblem, draw: (ink, p, s, t) => flowTube(ink, 'pc', narrowing(0.7, 0.7 / Math.sqrt(p.k ?? 1)), t, { v0: 0.5 }), cam: () => CAM.tube }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '5',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 3.1 · Resumen', title: 'Caudal y continuidad', ideas: [
        'Caudal <span class="m"><i>Q</i> = Δ<i>V</i>/Δ<i>t</i> = <i>A v</i></span>: lo construiste con el cilindro que cruza la sección. Gasto cardíaco ≈ 83 mL/s.',
        'Continuidad: <span class="m"><i>A</i><sub>1</sub><i>v</i><sub>1</sub> = <i>A</i><sub>2</sub><i>v</i><sub>2</sub></span>. Estrechar acelera; ensanchar frena.',
        'Aorta ≈ 21 cm/s; capilares ≈ 0,3 mm/s porque su área TOTAL es enorme: tiempo para el intercambio.',
      ], next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#bernoulli">3.2 · Bernoulli ›</a>' }), draw() {} }],
    },
  ],
};
