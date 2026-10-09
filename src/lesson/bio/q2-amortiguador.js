// Biofísica 2.2 — La aorta amortiguadora  (Semana 7, bloque «La pared del vaso»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 2.2.
//
// Predicción (¿qué pasaría con tubos rígidos?), experimento con la compliance
// de la aorta en un modelo de Windkessel cuyos resultados anota el propio
// estudiante, conclusión a partir de su tabla y aplicación a la edad y a los
// casos clínicos.

import { clamp, snap } from '../core/anim.js';
import { UI_ES, n, table, titleCard, summaryCard, practiceChapter, askNumber, askChoice, orderChain, createWorkPanel, pick } from './kit.js';
import { windkessel, wkScene } from './scenes-pared.js';

const CAM = {
  title: { xmin: -1.0, xmax: 9.4, ymin: -1.0, ymax: 3.5 },
  wk: { xmin: -1.0, xmax: 9.4, ymin: -1.0, ymax: 3.5 },
  chain: { xmin: -3, xmax: 3, ymin: -2, ymax: 2 },
};

const AGES = [['Recién nacido', '60–80*'], ['Bebé', '80–90*'], ['Adulto joven', '110/75'], ['Adulto mayor', '150/90']];

const STIFF = [
  'Con la edad, la pared de la aorta pierde elastina y gana colágeno y calcio',
  'Su compliance disminuye: se estira menos con cada latido',
  'Guarda menos sangre durante la sístole, así que la presión sube más: PAS ↑',
  'En la diástole tiene menos sangre que devolver: la presión cae más: PAD ↓',
  'Se ensancha la presión de pulso (≈ 150/90 o más)',
];

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'pp': {
      const [s, d] = pick(rnd, [[120, 80], [160, 80], [150, 90], [180, 75], [110, 75]]);
      return {
        kind, ask: `Paciente con ${s}/${d} mmHg. ¿Presión de pulso?`, given: [['PAS', `${s}`], ['PAD', `${d}`]],
        number: { label: 'PP =', unit: 'mmHg', answer: s - d }, hint: 'PAS − PAD.',
        solution: [{ text: 'Diferencia:', math: `${s} − ${d} = ${s - d} mmHg` }, { text: s - d >= 60 ? 'Amplia: sugiere aorta rígida.' : 'Normal.', math: '' }], why: `${s - d} mmHg.`, C: s - d >= 60 ? 0.5 : 1.1,
      };
    }
    case 'dir': {
      const which = pick(rnd, ['PAS', 'PAD', 'PP']);
      const ans = { PAS: 'up', PAD: 'down', PP: 'up' }[which];
      return {
        kind, ask: `Si la aorta pierde compliance (se pone rígida), ¿qué le pasa a la ${which === 'PP' ? 'presión de pulso' : which === 'PAS' ? 'presión sistólica' : 'presión diastólica'}?`,
        given: [['cambio', 'compliance ↓']],
        choices: [{ id: 'up', label: 'sube', correct: ans === 'up' }, { id: 'down', label: 'baja', correct: ans === 'down' }, { id: 'eq', label: 'no cambia' }],
        hint: 'Piensa en lo que la aorta guarda en la sístole y devuelve en la diástole.',
        solution: [{ text: 'Aorta rígida:', math: 'PAS ↑, PAD ↓, PP ↑' }], why: { up: 'Sube.', down: 'Baja.' }[ans], C: 0.5,
      };
    }
    case 'stiff': {
      const a = pick(rnd, [40, 45, 50]);
      const b = pick(rnd, [70, 80, 90]);
      const swap = rnd() < 0.5;
      return {
        kind, ask: `Paciente 1: presión de pulso ${swap ? b : a} mmHg. Paciente 2: ${swap ? a : b} mmHg. ¿Quién tiene la aorta más rígida?`,
        given: [['PP 1', `${swap ? b : a}`], ['PP 2', `${swap ? a : b}`]],
        choices: [{ id: '1', label: 'paciente 1', correct: swap }, { id: '2', label: 'paciente 2', correct: !swap }],
        hint: 'Una aorta rígida amortigua menos: la presión oscila más.',
        solution: [{ text: 'Mayor presión de pulso → menos compliance', math: '' }], why: 'El de mayor presión de pulso.', C: 0.6,
      };
    }
    default: {
      const C = pick(rnd, [1.4, 1.1, 0.7, 0.45]);
      const w = windkessel(C);
      return {
        kind: 'read', ask: `En el modelo, con $C$ = ${n(C, 2)} mL/mmHg, ¿cuál es la presión de pulso? (lee la gráfica)`,
        given: [['$C$', `${n(C, 2)} mL/mmHg`]], number: { label: 'PP ≈', unit: 'mmHg', answer: w.sys - w.dia, rel: 0.1 },
        hint: 'Máximo menos mínimo de la curva.', solution: [{ text: 'De la curva:', math: `${n(w.sys, 0)} − ${n(w.dia, 0)} ≈ ${n(w.sys - w.dia, 0)} mmHg` }], why: `≈ ${n(w.sys - w.dia, 0)} mmHg.`, C,
      };
    }
  }
}

export const q2 = {
  id: 'bio-q2', code: '2.2', title: 'La aorta amortiguadora', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.wk, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, C: 1.1, rows: [] }),
  chapters: [
    {
      id: 'intro', title: 'La aorta amortiguadora', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · La pared del vaso · Lección 2.2', title: 'La aorta amortiguadora', sub: 'El corazón bombea a golpes, pero a los tejidos la sangre llega casi continua. ¿Quién suaviza los golpes? Y ¿por qué la presión sube con la edad?', meta: 'Unos 25 minutos · Semana 7 · Modelo de Windkessel · Casos · Práctica' }), draw({ ink }, t) { wkScene(ink, 1.1, t); } }],
    },
    {
      id: 'pregunta', title: 'Un corazón a golpes', short: 'Pregunta', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.wk, caption: 'El ventrículo solo expulsa sangre durante la sístole (≈ 0,3 s de cada 0,8 s). El resto del tiempo, la válvula aórtica está cerrada: no entra nada en la aorta.', draw({ ink }, t) { wkScene(ink, 1.1, t); } },
        {
          kind: 'do', cam: CAM.wk,
          controls: (S) => [['stop', 'se detendría'], ['same', 'seguiría igual'], ['back', 'volvería hacia el corazón']].map(([id, label]) => ({ type: 'choice', id, label, state: S.g.pred === id ? 'right' : null, disabled: !!S.g.pred })),
          act(S, id) { S.g.pred ??= id; },
          caption: 'Predicción (sin respuesta correcta todavía).',
          prompt: 'Si las arterias fueran tubos rígidos, durante la diástole el flujo hacia los tejidos…',
          success: 'Guardado. Vamos a comprobarlo con un modelo de la aorta.',
          draw({ ink }, t) { wkScene(ink, 1.1, t); },
          done: (S) => !!S.g.pred, skip(S) { S.g.pred ??= 'stop'; },
        },
        { kind: 'watch', dur: 5, cam: CAM.wk, caption: (S) => `Tu predicción: «${({ stop: 'se detendría', same: 'seguiría igual', back: 'volvería' })[S.g.pred] ?? '—'}». Con tubos rígidos, el flujo se detendría en cada diástole. Pero la aorta es elástica: en la sístole se estira y guarda parte de la sangre; en la diástole su pared retrocede y la sigue empujando. Es el efecto <b>Windkessel</b> (cámara de aire).`, draw({ ink }, t) { wkScene(ink, 1.1, t); } },
      ],
    },
    {
      id: 'experimento', title: 'Experimento: rigidez', short: 'Experimento', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.wk,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => { const w = windkessel(S.C); return `$C$ = ${n(S.C, 2)} mL/mmHg → ${n(w.sys, 0)}/${n(w.dia, 0)} mmHg`; },
          prompt: 'Cambia la compliance de la aorta con el asa y anota al menos 3 valores distintos, incluido uno muy rígido ($C$ ≤ 0,5).',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar', primary: true }],
          act(S, id) { if (id === 'rec' && !S.rows.some((r) => Math.abs(r.C - S.C) < 0.04)) { const w = windkessel(S.C); S.rows.push({ C: S.C, s: w.sys, d: w.dia }); S.rows.sort((a, b) => b.C - a.C); } },
          success: 'Tu tabla muestra el patrón completo. ¿Lo ves? Responde a continuación.',
          draw({ ink, S }) {
            wkScene(ink, S.C, S.tt ?? 0, { ref: Math.abs(S.C - 1.1) > 0.05 ? 1.1 : null });
            ink.line('cs', { x: -0.5, y: 0.2 }, { x: 2.4, y: 0.2 }, 'ink', { layer: 'annotations' });
            ink.text('cs-a', { x: -0.5, y: 0.2 }, 'rígida', { dy: 22, size: 13, cls: 'mid' });
            ink.text('cs-b', { x: 2.4, y: 0.2 }, 'elástica', { dy: 22, size: 13, cls: 'mid' });
            table(ink, 'tb', [{ h: 'C', w: 50 }, { h: 'PAS', w: 50 }, { h: 'PAD', w: 50 }, { h: 'PP', w: 50 }], S.rows.map((r) => [n(r.C, 2), n(r.s, 0), n(r.d, 0), n(r.s - r.d, 0)]), { y: 18, empty: '—' });
          },
          handles: (S) => [{ key: 'C', p: { x: -0.5 + ((S.C - 0.4) / 1.2) * 2.9, y: 0.2 }, r: 22, cursor: 'ew-resize', drag: (S2, p) => { S2.C = clamp(snap(0.4 + ((p.x + 0.5) / 2.9) * 1.2, 0.05), 0.4, 1.6); } }],
          done: (S) => S.rows.length >= 3 && S.rows.some((r) => r.C <= 0.5),
          skip(S) { S.rows = [1.4, 1.0, 0.45].map((C) => { const w = windkessel(C); return { C, s: w.sys, d: w.dia }; }); },
        },
        {
          kind: 'do', cam: CAM.wk,
          ...(() => { const c = askChoice({ key: 'pattern', choices: [
            { id: 'all', label: 'todo sube: PAS y PAD', why: 'Mira la columna PAD de tu tabla: baja.' },
            { id: 'ok', label: 'PAS sube, PAD baja: la presión de pulso se ensancha', correct: true },
            { id: 'none', label: 'casi nada cambia', why: 'Compara la primera y la última fila.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Lee tu tabla de arriba (elástica) abajo (rígida).' }; })(),
          prompt: 'Al volver la aorta más rígida…',
          success: 'Y la media casi no cambia (la fija el gasto cardíaco × la resistencia). Lo que cambia es la oscilación: menos compliance, menos amortiguación.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { wkScene(ink, 0.45, S.tt ?? 0, { ref: 1.1 }); table(ink, 'tb', [{ h: 'C', w: 50 }, { h: 'PAS', w: 50 }, { h: 'PAD', w: 50 }, { h: 'PP', w: 50 }], S.rows.map((r) => [n(r.C, 2), n(r.s, 0), n(r.d, 0), n(r.s - r.d, 0)]), { y: 18 }); },
        },
      ],
    },
    {
      id: 'edad', title: 'La presión y la edad', short: 'La edad', num: '3',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.wk, caption: 'Valores de referencia a lo largo de la vida (* solo sistólica). La sistólica sube de forma continua; en el adulto mayor aparece la hipertensión sistólica aislada.', draw({ ink }) { table(ink, 'age', [{ h: 'edad', w: 150 }, { h: 'presión (mmHg)', w: 140 }], AGES, { right: false, x: Math.max(28, ink.W / 2 - 145), y: Math.max(20, ink.H / 2 - 70), rh: 32 }); } },
        (() => { const ch = orderChain({ key: 'stiff', steps: STIFF }); return { kind: 'do', cam: CAM.chain, ...ch, caption: (S) => (ch.wrongId(S) ? 'Ese paso viene más adelante.' : 'Explica, eslabón por eslabón, por qué la presión del adulto mayor es 150/90.'), prompt: 'Elige qué ocurre después.', success: 'Esa cadena une la física (compliance) con la clínica (hipertensión sistólica del adulto mayor). La rigidez también aumenta el trabajo del corazón y el riesgo cardiovascular.', draw({ ink, S }) { ch.draw(ink, S); } }; })(),
      ],
    },
    {
      id: 'casos', title: 'Casos', short: 'Casos', num: '4',
      beats: [
        {
          kind: 'do', cam: CAM.wk,
          ...askNumber({ key: 'pp', label: 'PP =', unit: 'mmHg', answer: 80, wrong: [[120, 'Ese es el promedio. Es la diferencia.'], [240, 'Es la diferencia, no la suma.']] }),
          caption: (S) => S.g.pp?.msg ?? (S.g.pp?.wrong ? 'PAS − PAD.' : 'Paciente de 70 años: 160/80 mmHg.'),
          prompt: '¿Cuál es su presión de pulso?',
          success: '80 mmHg, el doble de lo normal: la energía que la pared debería guardar en la sístole no se conserva para la diástole. También ocurre en la insuficiencia aórtica, donde parte de la sangre vuelve al ventrículo en la diástole.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { wkScene(ink, 0.45, S.tt ?? 0); },
        },
        {
          kind: 'do', cam: CAM.wk,
          ...(() => { const c = askChoice({ key: 'mareo', choices: [
            { id: 'ok', label: 'su aorta rígida amortigua mal: la presión cae más en cada diástole y al ponerse de pie compensa peor', correct: true },
            { id: 'heart', label: 'su corazón late demasiado fuerte', why: 'La fuerza del corazón no explica el mareo al ponerse de pie.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Hombre de 65 años con hipertensión crónica y aterosclerosis: se marea al incorporarse.' }; })(),
          prompt: '¿Cómo influye la rigidez arterial?',
          success: 'Con menos compliance, la PAD es baja y los barorreflejos actúan peor: combinado con la columna de sangre de pie (lección 1.4), el cerebro queda sin presión suficiente.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { wkScene(ink, 0.5, S.tt ?? 0); },
        },
      ],
    },
    practiceChapter({ num: '5', seed: 72202, kinds: ['pp', 'dir', 'read', 'stiff'], make: makeProblem, draw: (ink, p, s, t) => wkScene(ink, p.C ?? 1.1, t), cam: () => CAM.wk }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 2.2 · Resumen', title: 'La aorta amortiguadora', ideas: [
        'La aorta guarda sangre en la sístole y la devuelve en la diástole (Windkessel): el flujo a los tejidos es casi continuo.',
        'Menos compliance → PAS ↑, PAD ↓, presión de pulso ↑; la media casi no cambia.',
        'Con la edad la aorta se vuelve rígida: hipertensión sistólica aislada (≈ 150/90).',
        'Presión de pulso amplia (≥ 60 mmHg) sugiere rigidez arterial o insuficiencia aórtica.',
      ], next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#laplace">2.3 · Laplace y onda de pulso ›</a>' }), draw() {} }],
    },
  ],
};
