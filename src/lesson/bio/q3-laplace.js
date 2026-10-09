// Biofísica 2.3 — Laplace y onda de pulso  (Semana 7, bloque «La pared del vaso»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 2.3.
//
// El aneurisma como pregunta: el estudiante mide la tensión de la pared al
// cambiar el radio (y descubre T ∝ r), resuelve el caso 03 con desvanecimiento,
// ordena la cadena del círculo vicioso, explica por qué un capilar no revienta,
// y mide la velocidad de onda de pulso leyendo dos registros reales de tiempo.

import { clamp, snap, ramp } from '../core/anim.js';
import { UI_ES, n, table, readout, formula, axes, curve, titleCard, summaryCard, practiceChapter, askNumber, askChoice, orderChain, createWorkPanel, pick } from './kit.js';
import { laplaceScene, vopScene, matchBoard, PAIRS, LETTERS, DEF } from './scenes-pared.js';

const CAM = {
  title: { xmin: -3.0, xmax: 3.4, ymin: -2.3, ymax: 2.6 },
  lap: { xmin: -3.0, xmax: 3.4, ymin: -2.3, ymax: 2.6 },
  lapP: { xmin: -2.6, xmax: 2.8, ymin: -2.2, ymax: 2.4 },
  chain: { xmin: -3, xmax: 3, ymin: -2, ymax: 2 },
  body: { xmin: -2.4, xmax: 3.6, ymin: -0.5, ymax: 2.2 },
  trace: { xmin: -0.8, xmax: 7.6, ymin: -0.9, ymax: 3.4 },
  match: { xmin: 0, xmax: 10, ymin: -0.4, ymax: 7.6 },
};

const ANEU = [
  'Una zona débil de la pared arterial cede un poco: su radio aumenta',
  'Con la misma presión, la tensión de la pared aumenta ($T$ = $P$·$r$)',
  'La pared, más tensa, se estira y se adelgaza',
  'El radio crece todavía más… y la tensión también',
  'Si la tensión supera la resistencia de la pared: ruptura (hemorragia)',
];

/** Pressure pulse arriving at a site at time t0 (s). */
const pulse = (t, t0) => (t < t0 ? 0 : (1 - Math.exp(-(t - t0) / 0.012)) * Math.exp(-(t - t0) / 0.18));

function traces(ink, tc, tf, o = {}) {
  const P = axes(ink, 'tr', { x: 0, y: 0, w: 6.4, h: 2.8 }, { xmax: 0.3, ymax: 2.2, xticks: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], xfmt: (v) => n(v, 2), xlabel: '$t$ (s)', grid: true });
  curve(ink, 'tr-c', P, (t) => 1.2 + 0.9 * pulse(t, tc), 0, 0.3, 'wave', { N: 300 });
  curve(ink, 'tr-f', P, (t) => 0.15 + 0.9 * pulse(t, tf), 0, 0.3, 'wave-2', { N: 300 });
  ink.text('tr-cl', P(0, 1.2), 'carótida', { dx: -8, dy: 5, size: 14, anchor: 'end', cls: 'accent-tx' });
  ink.text('tr-fl', P(0, 0.15), 'femoral', { dx: -8, dy: 5, size: 14, anchor: 'end', cls: 'blue-tx' });
  if (o.marks) {
    for (const [k, t, y] of [['c', tc, 1.2], ['f', tf, 0.15]]) ink.line(`tr-m${k}`, P(t, 0), P(t, y + 1), 'dashed', { layer: 'annotations' });
    ink.dimension('tr-dt', P(tc, 2.1), P(tf, 2.1), 0, 'Δ$t$', { size: 14 });
  }
}

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'lap': {
      const r1 = pick(rnd, [1, 2, 3]);
      const k = pick(rnd, [1.5, 2, 2.5, 3]);
      const thin = rnd() < 0.4;
      const ans = thin ? k * 2 : k;
      return {
        kind, ask: thin ? `Un aneurisma lleva el radio de ${r1} a ${n(r1 * k, 1)} mm y la pared se adelgaza a la mitad. A igual presión, ¿cuántas veces aumenta el esfuerzo en la pared?` : `Un aneurisma lleva el radio de ${r1} a ${n(r1 * k, 1)} mm. A igual presión, ¿cuántas veces aumenta la tensión?`,
        given: [['$r$', `${r1} → ${n(r1 * k, 1)} mm`], ...(thin ? [['$h$', '$h$ → $h$/2']] : [])], number: { label: '×', unit: 'veces', answer: ans },
        hint: thin ? '$σ$ = $P$ $r$ / $h$.' : '$T$ = $P$·$r$: a igual $P$, $T$ ∝ $r$.',
        solution: [{ text: 'Proporción:', math: thin ? `${n(k, 1)} × 2 = ${n(ans, 1)}` : `${n(r1 * k, 1)}/${r1} = ${n(k, 1)}` }], why: `× ${n(ans, 1)}.`, mm: r1 * k, thin,
      };
    }
    case 'vop': {
      const d = pick(rnd, [0.5, 0.55, 0.6, 0.65, 0.7]);
      const dt = pick(rnd, [0.05, 0.06, 0.075, 0.08, 0.1, 0.12]);
      return {
        kind, ask: `La onda tarda ${n(dt, 3)} s en recorrer ${n(d, 2)} m (carótida → femoral). ¿VOP?`,
        given: [['$d$', `${n(d, 2)} m`], ['Δ$t$', `${n(dt, 3)} s`]], number: { label: 'VOP =', unit: 'm/s', answer: d / dt },
        hint: 'VOP = $d$/Δ$t$.', solution: [{ text: 'Velocidad:', math: `${n(d, 2)}/${n(dt, 3)} = ${n(d / dt, 1)} m/s` }], why: `${n(d / dt, 1)} m/s${d / dt > 10 ? ': rigidez arterial.' : '.'}`, dt,
      };
    }
    case 'cap': {
      return {
        kind, ask: 'Un capilar tiene una pared de una sola célula y la aorta una pared gruesa. ¿Por qué no revienta el capilar?',
        given: [['$r_{capilar}$', '≈ 4 µm'], ['$r_{aorta}$', '≈ 12 mm']],
        choices: [{ id: 'r', label: 'su radio es diminuto: la tensión $T$ = $P$·$r$ es miles de veces menor', correct: true }, { id: 'p', label: 'en el capilar no hay presión' }, { id: 'el', label: 'el endotelio es más resistente que la pared aórtica' }],
        hint: 'Laplace: la tensión depende del radio.', solution: [{ text: 'Laplace:', math: 'radio 3000 veces menor → tensión mucho menor' }], why: 'Por su radio diminuto.', mm: 0.4,
      };
    }
    default: {
      const a = pick(rnd, [7, 8, 9, 10, 12]);
      const b = pick(rnd, [5, 6, 6.5]);
      return {
        kind: 'stiff', ask: `Paciente A: VOP = ${a} m/s. Paciente B: VOP = ${n(b)} m/s. ¿Quién tiene arterias más rígidas?`,
        given: [['A', `${a} m/s`], ['B', `${n(b)} m/s`]],
        choices: [{ id: 'A', label: 'A', correct: true }, { id: 'B', label: 'B' }, { id: '?', label: 'no se puede saber' }],
        hint: 'En una pared rígida la onda viaja más rápido.', solution: [{ text: 'Mayor VOP ↔ mayor rigidez', math: '' }], why: 'A.', dt: 0.075,
      };
    }
  }
}

function drawProblem(ink, p, solved, t) {
  if (p.kind === 'lap' || p.kind === 'cap') { laplaceScene(ink, Math.min(p.mm ?? 1, 3.5) / 2 + 0.3, { thin: p.thin, mm: p.mm }); return; }
  traces(ink, 0.05, 0.05 + (p.dt ?? 0.075), { marks: solved });
}

export const q3 = {
  id: 'bio-q3', code: '2.3', title: 'Laplace y onda de pulso', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.lap, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, r: 1, rows: [], match: { i: 0, done: [], wrong: null } }),
  chapters: [
    {
      id: 'intro', title: 'Laplace y onda de pulso', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · La pared del vaso · Lección 2.3', title: 'Laplace y onda de pulso', sub: '¿Por qué un aneurisma tiende a crecer y romperse? ¿Cómo se mide la rigidez de una arteria sin tocarla?', meta: 'Unos 30 minutos · Semana 7 · Casos 03 y 04 · Actividad de la clase · Práctica' }), draw({ ink }, t) { laplaceScene(ink, 1 + 0.15 * Math.sin(t * 1.5), { tension: 1 }); } }],
    },
    {
      id: 'aneurisma', title: 'Un aneurisma', short: 'Pregunta', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.lap, caption: 'Corte de una arteria. La presión de la sangre empuja la pared hacia afuera en todas direcciones; la pared resiste con una <b>tensión</b> $T$ a lo largo de ella, como la goma de un globo.', draw({ ink }, t) { laplaceScene(ink, 1.1, { pressure: ramp(t, 0.3, 1), tension: ramp(t, 1.5, 1) * 1.1, mm: 1 }); } },
        {
          kind: 'do', cam: CAM.lap,
          ...(() => { const c = askChoice({ key: 'pred', choices: [
            { id: 'more', label: 'más tensión en la zona dilatada', correct: true },
            { id: 'less', label: 'menos tensión: la presión se reparte en más pared', why: 'Parece lógico, pero mide antes de decidir: hay más sangre empujando sobre cada tramo de pared.' },
            { id: 'eq', label: 'la misma tensión: la presión es la misma', why: 'La presión sí es la misma; la tensión depende también del tamaño.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Una arteria cerebral de 1 mm de radio desarrolla una dilatación (aneurisma). La presión arterial es la misma.' }; })(),
          prompt: 'Predice: ¿qué soporta la pared de la zona dilatada?',
          success: 'Vamos a comprobarlo midiendo la tensión con distintos radios.',
          draw({ ink }) { laplaceScene(ink, 1.6, { mm: 2 }); },
        },
      ],
    },
    {
      id: 'medir', title: 'Medir la tensión', short: 'T = P·r', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.lap,
          caption: (S) => `$r$ = ${n(S.r, 1)} mm → $T$ = ${n(S.r, 1)} unidades (presión constante)`,
          prompt: 'Cambia el radio arrastrando la pared y anota la tensión para al menos 3 radios.',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar', primary: true }],
          act(S, id) { if (id === 'rec' && !S.rows.some((r) => Math.abs(r - S.r) < 0.05)) { S.rows.push(S.r); S.rows.sort((a, b) => a - b); } },
          success: 'Doble radio, doble tensión: $T$ ∝ $r$. Con la presión incluida es la <b>ley de Laplace</b>: $T$ = $P$·$r$.',
          draw({ ink, S }) {
            laplaceScene(ink, S.r * 0.8, { tension: S.r * 0.8, mm: S.r });
            table(ink, 'tb', [{ h: 'r (mm)', w: 70 }, { h: 'T', w: 60 }, { h: 'T / r', w: 60 }], S.rows.map((r) => [n(r, 1), n(r, 1), '1,0']), { y: 18, empty: '—' });
          },
          handles: (S) => [{ key: 'r', p: { x: S.r * 0.8 * Math.cos(-0.6) + 0.1, y: S.r * 0.8 * Math.sin(-0.6) }, r: 24, drag: (S2, p) => { S2.r = clamp(snap(Math.hypot(p.x, p.y) / 0.8, 0.1), 0.6, 2.6); } }],
          done: (S) => S.rows.length >= 3 && S.rows[S.rows.length - 1] >= 1.9 * S.rows[0],
          skip(S) { S.rows = [1, 1.5, 2.5]; },
        },
        { kind: 'watch', dur: 3, cam: CAM.lap, caption: 'Si además la pared tiene grosor $h$, el esfuerzo dentro del material es $σ$ = $P$ $r$ / $h$: una pared más fina sufre más.', draw({ ink }) { laplaceScene(ink, 1.6, { tension: 1.6, mm: 2 }); formula(ink, 'fl', '$T$ = $P$ · $r$     $σ$ = $P$ $r$ / $h$', { fx: 0.5, fy: 0.08 }); } },
        ...[1, 2].map((k) => ({
          kind: 'watch', dur: 3, pause: true, autoPause: false, cam: CAM.lapP, panel: 'work',
          caption: ['Ejemplo resuelto (caso 03): radio normal 1,0 mm; aneurisma 2,5 mm; presión constante.', 'La tensión se multiplica por 2,5.'][k - 1],
          work: () => [{ h: 'Ejemplo resuelto' }, { given: [['$r_1$', '1,0 mm'], ['$r_2$', '2,5 mm']] }, { step: 1, text: 'Laplace a igual presión:', math: '$T_2/T_1$ = $r_2/r_1$', state: k > 1 ? 'done' : 'now' }, ...(k >= 2 ? [{ step: 2, text: 'Resultado:', math: '2,5/1,0 = × 2,5', state: 'now' }] : [])],
          draw({ ink }) { laplaceScene(ink, k === 1 ? 0.8 : 2.0, { tension: k === 1 ? 0.8 : 2.0, mm: k === 1 ? 1 : 2.5 }); },
        })),
        {
          kind: 'do', cam: CAM.lapP, panel: 'work',
          ...askNumber({ key: 'thin', label: '×', unit: 'veces', answer: 5, wrong: [[2.5, 'Eso es solo el radio. Con $h$ a la mitad, $σ$ se duplica otra vez.'], [1.25, 'Si $h$ baja a la mitad, $σ$ sube al doble.']] }),
          caption: (S) => S.g.thin?.msg ?? (S.g.thin?.wrong ? '$σ$ = $P$ $r$ / $h$.' : 'Semi-resuelto: además, la pared del aneurisma se adelgaza a la mitad.'),
          prompt: '¿Cuántas veces aumenta el esfuerzo $σ$ respecto a la arteria normal?',
          success: '× 2,5 por el radio y × 2 por el grosor: × 5.',
          work: (S) => [{ h: 'Semi-resuelto' }, { step: 1, text: 'Por el radio:', math: '× 2,5', state: 'done' }, { step: 2, text: 'Tu turno: añade el efecto del grosor.', state: S.g.thin?.ok ? 'done' : 'now' }],
          draw({ ink }) { laplaceScene(ink, 2.0, { thin: true, tension: 2.0, mm: 2.5 }); },
        },
        (() => { const ch = orderChain({ key: 'aneu', steps: ANEU }); return { kind: 'do', cam: CAM.chain, ...ch, caption: (S) => (ch.wrongId(S) ? 'Ese paso viene después.' : 'Ahora explica por qué el aneurisma se agranda solo.'), prompt: 'Elige qué ocurre después.', success: 'Un <b>círculo vicioso</b>: más radio, más tensión, más radio. Por eso controlar la presión ($P$ en $T$ = $P$·$r$) es clave en estos pacientes.', draw({ ink, S }) { ch.draw(ink, S); } }; })(),
        {
          kind: 'do', cam: CAM.lap,
          ...(() => { const c = askChoice({ key: 'cap', choices: [
            { id: 'r', label: 'su radio es diminuto (≈ 4 µm): la tensión es miles de veces menor que en la aorta', correct: true },
            { id: 'p', label: 'en los capilares no hay presión', why: 'Hay unos 20–30 mmHg: no es cero.' },
            { id: 'res', label: 'su pared es más resistente', why: 'Es una sola capa de células: mucho más débil que la aorta.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Los capilares tienen paredes de una sola célula, y aun así no revientan.' }; })(),
          prompt: '¿Por qué?',
          success: 'Laplace también protege: radio diminuto, tensión diminuta. La aorta, con radio grande, necesita una pared gruesa y elástica.',
          draw({ ink }) { laplaceScene(ink, 0.3, { tension: 0.3, mm: 0.004 }); },
        },
      ],
    },
    {
      id: 'vop', title: 'La velocidad de onda de pulso', short: 'VOP', num: '3',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.body, caption: 'Cada latido lanza una onda de presión que viaja por la pared arterial, más rápido que la sangre. Cuanto más rígida la pared, más rápido viaja ($c$ ∝ √($E$ $h$ / $ρ$ $r$)). Medir su velocidad es medir la rigidez.', draw({ ink }, t) { vopScene(ink, t, { wave: true }); } },
        {
          kind: 'do', cam: CAM.trace,
          ...askNumber({ key: 'dtA', label: 'Δ$t$ =', unit: 's', answer: 0.075, rel: 0.07, wrong: [[0.125, 'Ese es el instante en que llega a la femoral. Resta el de la carótida.', 0.05]] }),
          caption: (S) => S.g.dtA?.msg ?? (S.g.dtA?.wrong ? 'Lee dónde empieza a subir cada curva y resta.' : 'Caso 04, paciente A: registros de presión en carótida y femoral. Lee el instante en que empieza a subir cada uno.'),
          prompt: '¿Cuánto tarda la onda de la carótida a la femoral?',
          success: 'Δ$t$ = 0,125 − 0,050 = 0,075 s.',
          draw({ ink, S }) { traces(ink, 0.05, 0.125, { marks: !!S.g.dtA?.ok }); },
        },
        {
          kind: 'do', cam: CAM.trace,
          ...askNumber({ key: 'vA', label: 'VOP =', unit: 'm/s', answer: 8, wrong: [[0.125, 'Invertiste: distancia entre tiempo.']] }),
          caption: (S) => S.g.vA?.msg ?? (S.g.vA?.wrong ? 'VOP = $d$/Δ$t$.' : 'Entre carótida y femoral hay $d$ = 0,60 m.'),
          prompt: 'Calcula la VOP del paciente A.',
          success: '0,60/0,075 = 8 m/s.',
          draw({ ink }) { traces(ink, 0.05, 0.125, { marks: true }); },
        },
        {
          kind: 'do', cam: CAM.trace,
          ...askNumber({ key: 'vB', label: 'VOP =', unit: 'm/s', answer: 6, rel: 0.05, wrong: [[8, 'Ese es A. Lee los registros de B.']] }),
          caption: (S) => S.g.vB?.msg ?? (S.g.vB?.wrong ? 'Δ$t$ de B y luego $d$/Δ$t$.' : 'Paciente B: mismos 0,60 m. Lee sus registros.'),
          prompt: 'Calcula la VOP del paciente B.',
          success: 'Δ$t$ = 0,10 s → 6 m/s.',
          draw({ ink }) { traces(ink, 0.05, 0.15); },
        },
        {
          kind: 'do', cam: CAM.trace,
          ...(() => { const c = askChoice({ key: 'who', choices: [{ id: 'A', label: 'el paciente A (8 m/s)', correct: true }, { id: 'B', label: 'el paciente B (6 m/s)', why: 'Una onda más lenta indica una pared más distensible.' }] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Pista clínica: más rigidez → más velocidad.' }; })(),
          prompt: '¿Quién tiene arterias más rígidas?',
          success: 'A. En clínica se usa también el <b>índice CAVI</b> (del corazón al tobillo), que corrige el efecto de la presión: ≥ 9 sugiere arteriosclerosis.',
          draw({ ink }) { traces(ink, 0.05, 0.125, { marks: true }); },
        },
      ],
    },
    {
      id: 'relacionar', title: 'Relaciona conceptos', short: 'Relacionar', num: '4',
      beats: [{
        kind: 'do', cam: CAM.match,
        caption: (S) => (S.match.wrong ? `No: ${S.match.wrong} es «${DEF[S.match.wrong]}»` : 'Actividad de la clase, ahora que conoces cada concepto.'),
        prompt: (S) => (S.match.i < PAIRS.length ? `¿Qué definición corresponde a <b>${PAIRS[S.match.i][0]}</b>?` : ''),
        controls: (S) => (S.match.i >= PAIRS.length ? [] : LETTERS.filter((L) => !S.match.done.some((i) => PAIRS[i][1] === L)).map((L) => ({ type: 'choice', id: L, label: L, state: S.match.wrong === L ? 'wrong' : null }))),
        act(S, id) { const m = S.match; if (id === PAIRS[m.i][1]) { m.done.push(m.i); m.i++; m.wrong = null; } else m.wrong = id; },
        success: 'Pista clínica: más rigidez → menos compliance y distensibilidad → más VOP.',
        draw({ ink, S }) { matchBoard(ink, S); },
        done: (S) => S.match.i >= PAIRS.length,
        skip(S) { S.match = { i: PAIRS.length, done: PAIRS.map((_, i) => i), wrong: null }; },
      }],
    },
    practiceChapter({ num: '5', seed: 72303, kinds: ['lap', 'vop', 'cap', 'stiff'], make: makeProblem, draw: drawProblem, cam: (S) => (['lap', 'cap'].includes(S.practice?.prob?.kind) ? CAM.lapP : CAM.trace) }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 2.3 · Resumen', title: 'Laplace y onda de pulso', ideas: [
        'Laplace: <span class="m"><i>T</i> = <i>P r</i></span>; esfuerzo <span class="m"><i>σ</i> = <i>P r</i>/<i>h</i></span>. Lo mediste: doble radio, doble tensión.',
        'Aneurisma: más radio → más tensión → más radio (círculo vicioso). Caso 03: × 2,5 (× 5 si la pared se adelgaza).',
        'Los capilares resisten gracias a su radio diminuto.',
        '<span class="m">VOP = <i>d</i>/Δ<i>t</i></span>: más rigidez, onda más rápida (caso 04: 8 frente a 6 m/s). CAVI ≥ 9: arteriosclerosis.',
      ], next: '<span class="eyebrow">Siguiente bloque</span> <a class="cm-next" href="#caudal">3.1 · Caudal y continuidad ›</a>' }), draw() {} }],
    },
  ],
};
