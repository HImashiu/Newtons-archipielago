// Biofísica 2.1 — Elasticidad y compliance  (Semana 7, bloque «La pared del vaso»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 2.1.
//
// El estudiante estira tiras de pared y anota sus mediciones; el módulo de
// elasticidad aparece como la pendiente de SU tabla. Después infla una arteria
// y una vena, anota presión y volumen, y calcula la compliance con sus datos.
// La distensibilidad surge de una comparación que la compliance no resuelve.

import { clamp, snap, ramp } from '../core/anim.js';
import { UI_ES, n, table, readout, formula, titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick } from './kit.js';
import { stripScene, seGraph, E_SANA, E_RIGIDA, pvGraph, segment, ART, VEN } from './scenes-pared.js';

const CAM = {
  title: { xmin: -3.2, xmax: 5.6, ymin: -1.4, ymax: 3.4 },
  strip: { xmin: -0.8, xmax: 9.2, ymin: -1.0, ymax: 3.6 },
  pv: { xmin: -1.0, xmax: 9.4, ymin: -1.0, ymax: 3.7 },
  pvP: { xmin: -0.8, xmax: 4.6, ymin: -1.2, ymax: 2.6 },
};

const rec = (arr, row, same) => { if (!arr.some((r) => same(r, row))) arr.push(row); if (arr.length > 7) arr.shift(); };

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'E': {
      const sigma = pick(rnd, [100, 200, 300, 400]);
      const eps = pick(rnd, [0.1, 0.2, 0.25, 0.4, 0.5]);
      return {
        kind, ask: `Una tira de pared soporta ${sigma} kPa y se alarga un ${n(eps * 100)} %. ¿Módulo de elasticidad?`,
        given: [['$σ$', `${sigma} kPa`], ['$ε$', n(eps, 2)]], number: { label: '$E$ =', unit: 'kPa', answer: sigma / eps },
        hint: '$E$ = $σ/ε$ con $ε$ como fracción (20 % = 0,20).',
        solution: [{ text: 'Pendiente:', math: `${sigma} / ${n(eps, 2)} = ${n(sigma / eps, 0)} kPa` }], why: `$E$ = ${n(sigma / eps, 0)} kPa.`, eps,
      };
    }
    case 'C': {
      const dV = pick(rnd, [20, 40, 60, 70, 90]);
      const dP = pick(rnd, [5, 10, 20]);
      return {
        kind, ask: `Un vaso gana ${dV} mL cuando la presión sube ${dP} mmHg. ¿Compliance?`,
        given: [['Δ$V$', `${dV} mL`], ['Δ$P$', `${dP} mmHg`]], number: { label: '$C$ =', unit: 'mL/mmHg', answer: dV / dP },
        hint: 'Compliance: volumen ganado por cada mmHg, $C$ = Δ$V$/Δ$P$.',
        solution: [{ text: 'Compliance:', math: `${dV}/${dP} = ${n(dV / dP)} mL/mmHg` }], why: `$C$ = ${n(dV / dP)} mL/mmHg.`,
      };
    }
    case 'D': {
      const V0 = pick(rnd, [200, 300, 500, 1000]);
      const dV = pick(rnd, [10, 20, 30, 50]);
      const dP = pick(rnd, [5, 10, 20]);
      const D = (dV / (V0 * dP)) * 100;
      return {
        kind, ask: `Un vaso de ${V0} mL gana ${dV} mL cuando la presión sube ${dP} mmHg. ¿Distensibilidad (% por mmHg)?`,
        given: [['$V_0$', `${V0} mL`], ['Δ$V$', `${dV} mL`], ['Δ$P$', `${dP} mmHg`]], number: { label: '$D$ =', unit: '% / mmHg', answer: D },
        hint: 'Relativa: $D$ = Δ$V$/($V_0$·Δ$P$), y × 100.',
        solution: [{ text: 'Distensibilidad:', math: `${dV}/(${V0}·${dP}) = ${n(D / 100, 4)} → ${n(D, 2)} %/mmHg` }], why: `$D$ = ${n(D, 2)} %/mmHg.`,
      };
    }
    default: {
      return {
        kind: 'which', ask: 'Dos vasos ganan 20 mL cuando la presión sube 10 mmHg. Uno tiene 100 mL y el otro 1000 mL. ¿Cuál es más distensible?',
        given: [['Δ$V$, Δ$P$', 'iguales']],
        choices: [{ id: 'small', label: 'el de 100 mL', correct: true }, { id: 'big', label: 'el de 1000 mL' }, { id: 'eq', label: 'igual: tienen la misma compliance' }],
        hint: 'La distensibilidad compara el cambio con el tamaño inicial.',
        solution: [{ text: 'Relativo:', math: '20/100 = 20 % frente a 20/1000 = 2 %' }], why: 'El pequeño: crece un 20 % frente a un 2 %.',
      };
    }
  }
}

const drawProblem = (ink, p) => (p.kind === 'E' ? stripScene(ink, p.eps ?? 0.3, E_SANA) : segment(ink, 'ps', -0.5, 3.6, 0.7, { r0: 0.5 }));

function aortaStep(k, caption) {
  return {
    kind: 'watch', dur: 3, pause: true, cam: CAM.pvP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Ejemplo resuelto · caso 02' }, { given: [['$V_0$ (diástole)', '1000 mL'], ['$V$ (sístole)', '1070 mL'], ['Δ$P$', '10 mmHg']] },
        { step: 1, text: 'Compliance (absoluta):', math: '$C$ = 70/10 = 7 mL/mmHg', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Distensibilidad (relativa):', math: '$D$ = 70/(1000·10) = 0,007 /mmHg = 0,7 %/mmHg', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Lectura clínica:', math: 'en cada sístole la aorta guarda 70 mL estirándose', state: st(3) }] : []),
      ];
    },
    draw({ ink }, t) { segment(ink, 'ao', -0.5, 3.6, 0.5 + 0.09 * (0.5 - 0.5 * Math.cos(t * 2.4)), { r0: 0.5 }); },
  };
}

export const q1 = {
  id: 'bio-q1', code: '2.1', title: 'Elasticidad y compliance', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.strip, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, eps: 0, rigid: false, se: [], pv: 60, vein: false, rows: [] }),
  chapters: [
    {
      id: 'intro', title: 'Elasticidad y compliance', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({ eyebrow: 'Biofísica · La pared del vaso · Lección 2.1', title: 'Elasticidad y compliance', sub: 'La aorta de un joven se estira como un globo; la de un anciano, como una manguera vieja. Vas a medir esa diferencia y ponerle números.', meta: 'Unos 30 minutos · Semana 7 · Dos experimentos · Caso 02 · Práctica' }),
        draw({ ink }, t) { segment(ink, 'tv', -2.8, 5.2, 0.62 + 0.07 * (0.5 - 0.5 * Math.cos(t * 2.6)), { r0: 0.6 }); },
      }],
    },
    {
      id: 'pregunta', title: 'Una pregunta', short: 'Pregunta', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.pv, caption: 'Con cada latido la aorta recibe unos 70 mL de sangre en 0,3 s. Para hacerles sitio, su pared tiene que estirarse. ¿Qué tan fácil le resulta?', draw({ ink }, t) { segment(ink, 'sg', -0.5, 3.6, 0.5 + 0.09 * (0.5 - 0.5 * Math.cos(t * 2.4)), { r0: 0.5 }); } },
        {
          kind: 'do', cam: CAM.pv,
          ...(() => { const c = askChoice({ key: 'pred', choices: [
            { id: 'young', label: 'la de un joven de 20 años', correct: true },
            { id: 'old', label: 'la de un adulto de 75 años', why: 'Con la edad la pared se llena de colágeno y calcio: se vuelve más rígida, no más estirable.' },
            { id: 'eq', label: 'igual: todas las aortas son iguales', why: 'La pared cambia mucho con la edad, la hipertensión y la aterosclerosis.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Piensa en una goma nueva y una vieja.' }; })(),
          prompt: '¿Qué aorta se estira más con la misma presión?',
          success: 'La del joven. Para comparar paredes con precisión necesitamos medir: primero el material, luego el vaso entero.',
          draw({ ink }) { segment(ink, 'sg', -0.5, 3.6, 0.58, { r0: 0.5 }); },
        },
      ],
    },
    {
      id: 'material', title: 'Estirar la pared', short: 'El material', num: '2',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.strip, caption: 'Cortamos una tira de pared y tiramos de ella. Medimos el <b>esfuerzo</b> $σ$ = $F/A$ (fuerza por área de la sección) y la <b>deformación</b> $ε$ = Δ$L/L_0$ (cuánto se alarga, en fracción).', draw({ ink }, t) { stripScene(ink, 0.3 * ramp(t, 0.5, 2.5), E_SANA); seGraph(ink, []); } },
        {
          kind: 'do', cam: CAM.strip,
          caption: (S) => `${S.rigid ? 'Pared rígida' : 'Pared sana'} · $ε$ = ${n(S.eps, 2)} · $σ$ = ${n((S.rigid ? E_RIGIDA : E_SANA) * S.eps * 1000, 0)} kPa`,
          prompt: 'Estira la tira y pulsa «Anotar» en 3 estiramientos distintos. Luego cambia a pared rígida y repite.',
          controls: (S) => [
            { type: 'button', id: 'sana', label: 'Pared sana', primary: !S.rigid },
            { type: 'button', id: 'rigida', label: 'Pared rígida', primary: S.rigid },
            { type: 'button', id: 'rec', label: 'Anotar', primary: true },
          ],
          act(S, id) {
            if (id === 'rec' && S.eps > 0.01) rec(S.se, { e: S.eps, s: (S.rigid ? E_RIGIDA : E_SANA) * S.eps * 1000, rigid: S.rigid }, (a, b) => a.rigid === b.rigid && Math.abs(a.e - b.e) < 0.02);
            if (id === 'sana' || id === 'rigida') { S.rigid = id === 'rigida'; S.eps = 0; }
          },
          success: 'Para cada pared, los puntos caen sobre una recta: el esfuerzo es proporcional a la deformación (ley de Hooke). La recta de la pared rígida es mucho más empinada.',
          draw({ ink, S }) {
            stripScene(ink, S.eps, S.rigid ? E_RIGIDA : E_SANA, { rigid: S.rigid });
            seGraph(ink, S.se.map((p) => ({ e: p.e, s: p.s, rigid: p.rigid })), { lines: S.se.filter((p) => p.rigid).length >= 3 ? 0.5 : 0 });
            table(ink, 'tb', [{ h: 'pared', w: 70 }, { h: 'ε', w: 50 }, { h: 'σ (kPa)', w: 70 }], S.se.map((p) => [p.rigid ? 'rígida' : 'sana', n(p.e, 2), n(p.s, 0)]), { right: false, x: 28, y: 160, empty: '—' });
          },
          handles: (S) => [{ key: 'end', p: { x: 2.2 * (1 + S.eps), y: 0.25 }, r: 26, cursor: 'ew-resize', drag: (S2, p) => { S2.eps = clamp(snap(p.x / 2.2 - 1, 0.05), 0, 0.6); } }],
          done: (S) => S.se.filter((p) => !p.rigid).length >= 3 && S.se.filter((p) => p.rigid).length >= 3,
          skip(S) { for (const e of [0.2, 0.4, 0.6]) for (const r of [false, true]) S.se.push({ e, s: (r ? E_RIGIDA : E_SANA) * e * 1000, rigid: r }); },
        },
        {
          kind: 'do', cam: CAM.strip,
          ...askNumber({ key: 'E', label: '$E_{sana}$ =', unit: 'kPa', answer: 500, wrong: [[0.002, 'Invertiste: esfuerzo entre deformación.', 0.05], [2000, 'Ese es el de la pared rígida.']] }),
          caption: (S) => S.g.E?.msg ?? (S.g.E?.wrong ? 'Toma una fila de la pared sana y divide $σ$ entre $ε$.' : 'Un solo número describe cada recta: su pendiente, $σ/ε$. Se llama <b>módulo de elasticidad</b> $E$.'),
          prompt: 'Con tu tabla, calcula $E$ de la pared sana.',
          success: '$E$ ≈ 500 kPa para la sana y ≈ 2000 kPa para la rígida: hace falta 4 veces más esfuerzo para la misma deformación. Aterosclerosis, hipertensión y edad aumentan $E$.',
          draw({ ink, S }) { stripScene(ink, 0.4, E_SANA); seGraph(ink, S.se.map((p) => ({ e: p.e, s: p.s, rigid: p.rigid })), { lines: 1 }); formula(ink, 'fE', '$E$ = $σ$ / $ε$', { fx: 0.25, fy: 0.3 }); },
        },
      ],
    },
    {
      id: 'compliance', title: 'Inflar un vaso', short: 'Compliance', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.pv,
          caption: (S) => { const sys = S.vein ? VEN : ART; return `${S.vein ? 'Vena' : 'Arteria'}: $P$ = ${n(S.pv, 0)} mmHg, $V$ = ${n(sys.V0 + S.pv * sys.C, 0)} mL`; },
          prompt: 'El clínico mide el vaso entero: presión y volumen. Infla la arteria y anota 2 puntos; luego cambia a venas y anota 2 puntos.',
          controls: (S) => [
            { type: 'button', id: 'art', label: 'Sistema arterial', primary: !S.vein },
            { type: 'button', id: 'ven', label: 'Sistema venoso', primary: S.vein },
            { type: 'button', id: 'rec', label: 'Anotar', primary: true },
          ],
          act(S, id) {
            if (id === 'art' || id === 'ven') { S.vein = id === 'ven'; S.pv = S.vein ? 5 : 40; }
            if (id === 'rec') { const sys = S.vein ? VEN : ART; rec(S.rows, { vein: S.vein, P: S.pv, V: sys.V0 + S.pv * sys.C }, (a, b) => a.vein === b.vein && Math.abs(a.P - b.P) < 3); }
          },
          success: 'Mira tus tablas: la arteria apenas gana volumen aunque la presión suba mucho; la vena gana muchísimo con pocos mmHg.',
          draw({ ink, S }) {
            const sys = S.vein ? VEN : ART;
            const r = S.vein ? 0.5 + (S.pv / 25) * 0.55 : 0.5 + (S.pv / 140) * 0.18;
            segment(ink, 'sg', -0.5, 3.6, r, { r0: 0.5, vein: S.vein, wall: S.vein ? 0.04 : 0.1 });
            pvGraph(ink, { point: { V: sys.V0 + S.pv * sys.C, P: S.pv, vein: S.vein } });
            table(ink, 'tb', [{ h: '', w: 70 }, { h: 'P (mmHg)', w: 80 }, { h: 'V (mL)', w: 70 }], S.rows.map((r) => [r.vein ? 'vena' : 'arteria', n(r.P, 0), n(r.V, 0)]), { right: false, x: 28, y: 160, empty: '—' });
          },
          handles: (S) => { const r = S.vein ? 0.5 + (S.pv / 25) * 0.55 : 0.5 + (S.pv / 140) * 0.18; return [{ key: 'p', p: { x: 1.55, y: r + 0.1 }, r: 24, cursor: 'ns-resize', drag: (S2, p) => {
            const rr = clamp(p.y - 0.1, 0.5, S2.vein ? 1.05 : 0.68);
            S2.pv = snap(S2.vein ? ((rr - 0.5) / 0.55) * 25 : ((rr - 0.5) / 0.18) * 140, 1);
          } }]; },
          done: (S) => S.rows.filter((r) => !r.vein).length >= 2 && S.rows.filter((r) => r.vein).length >= 2,
          skip(S) { S.rows = [{ vein: false, P: 40, V: 480 }, { vein: false, P: 100, V: 600 }, { vein: true, P: 5, V: 2350 }, { vein: true, P: 15, V: 2850 }]; },
        },
        {
          kind: 'do', cam: CAM.pv,
          ...askNumber({ key: 'Ca', label: '$C_{arteria}$ =', unit: 'mL/mmHg', answer: 2, wrong: [[0.5, 'Invertiste: volumen ganado entre presión subida.'], [50, 'Esa es la de la vena.']] }),
          caption: (S) => S.g.Ca?.msg ?? (S.g.Ca?.wrong ? 'Toma dos filas de la arteria: Δ$V$ ÷ Δ$P$.' : 'La <b>compliance</b> $C$ = Δ$V$/Δ$P$ dice cuántos mL gana el vaso por cada mmHg.'),
          prompt: 'Con tus dos filas de la arteria, calcula su compliance.',
          success: '≈ 2 mL/mmHg. Haz lo mismo con la vena: ≈ 50 mL/mmHg.',
          draw({ ink, S }) { pvGraph(ink, {}); table(ink, 'tb', [{ h: '', w: 70 }, { h: 'P (mmHg)', w: 80 }, { h: 'V (mL)', w: 70 }], S.rows.map((r) => [r.vein ? 'vena' : 'arteria', n(r.P, 0), n(r.V, 0)]), { right: false, x: 28, y: 160 }); formula(ink, 'fC', '$C$ = Δ$V$ / Δ$P$', { fx: 0.28, fy: 0.75 }); },
        },
        {
          kind: 'do', cam: CAM.pv,
          ...askNumber({ key: 'ratio', label: '', unit: 'veces', answer: 25, rel: 0.05, wrong: [[0.04, 'Al revés: vena entre arteria.', 0.1]] }),
          caption: (S) => S.g.ratio?.msg ?? (S.g.ratio?.wrong ? 'Divide la compliance venosa (≈ 50) entre la arterial (≈ 2).' : 'Compara los dos sistemas.'),
          prompt: '¿Cuántas veces más compliante es el sistema venoso que el arterial?',
          success: '≈ 25 veces (Guyton da ≈ 24). Por eso las venas son el <b>reservorio</b> de sangre (≈ 65 % del volumen) y las arterias, rígidas, transmiten presión.',
          draw({ ink }) { pvGraph(ink, {}); },
        },
      ],
    },
    {
      id: 'distensibilidad', title: '¿Grande o distensible?', short: 'Distensibilidad', num: '4',
      beats: [
        {
          kind: 'do', cam: CAM.pv,
          ...(() => { const c = askChoice({ key: 'dist', choices: [
            { id: 'eq', label: 'igual de estirables: tienen la misma compliance', why: 'La compliance es igual, pero 20 mL es mucho para un vaso de 100 mL y poco para uno de 1000 mL.' },
            { id: 'small', label: 'el pequeño: crece un 20 % frente a un 2 %', correct: true },
            { id: 'big', label: 'el grande, porque guarda más sangre', why: 'Guardan lo mismo (20 mL). En proporción a su tamaño, el pequeño se estira mucho más.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Dos vasos ganan 20 mL cuando la presión sube 10 mmHg: misma compliance. Uno tiene 100 mL y el otro 1000 mL.' }; })(),
          prompt: '¿Cuál tiene la pared más estirable?',
          success: 'Para comparar paredes de vasos de distinto tamaño se usa la <b>distensibilidad</b>, el cambio relativo: $D$ = Δ$V$ / ($V_0$·Δ$P$). Compliance = distensibilidad × volumen.',
          draw({ ink }) { segment(ink, 's1', -0.5, 1.2, 0.35, { r0: 0.3 }); segment(ink, 's2', 1.8, 4.2, 0.82, { r0: 0.8 }); formula(ink, 'fD', '$D$ = Δ$V$ / ($V_0$ · Δ$P$)', { fy: 0.85 }); },
        },
        aortaStep(1, 'Ejemplo resuelto (caso 02). Una porción de aorta pasa de 1000 a 1070 mL mientras la presión sube 10 mmHg.'),
        aortaStep(2, 'Ahora la distensibilidad: el mismo cambio, relativo al volumen inicial.'),
        aortaStep(3, 'Gana un 0,7 % de su volumen por cada mmHg. En la lección 2.2 verás qué hace con esos 70 mL.'),
        {
          kind: 'do', cam: CAM.pvP, panel: 'work',
          ...askNumber({ key: 'Dv', label: '$D$ =', unit: '% / mmHg', answer: 4, wrong: [[0.04, 'Bien como fracción; exprésalo en % (× 100).'], [12, 'Esa es la compliance; divide además entre $V_0$.']] }),
          caption: (S) => S.g.Dv?.msg ?? (S.g.Dv?.wrong ? 'Mismo paso 2 del ejemplo.' : 'Semi-resuelto: una vena de 300 mL gana 60 mL con 5 mmHg. Su compliance ya está calculada.'),
          prompt: '¿Cuál es su distensibilidad?',
          success: '60/(300·5) = 0,04 /mmHg = 4 % por mmHg: unas 6 veces más que la aorta.',
          work: (S) => [{ h: 'Semi-resuelto' }, { given: [['$V_0$', '300 mL'], ['Δ$V$', '60 mL'], ['Δ$P$', '5 mmHg']] }, { step: 1, text: 'Compliance:', math: '60/5 = 12 mL/mmHg', state: 'done' }, { step: 2, text: 'Tu turno: distensibilidad.', state: S.g.Dv?.ok ? 'done' : 'now' }],
          draw({ ink }) { segment(ink, 'sv', -0.5, 3.6, 0.85, { r0: 0.5, vein: true, wall: 0.04 }); },
        },
      ],
    },
    practiceChapter({ num: '5', seed: 72101, kinds: ['E', 'C', 'which', 'D'], make: makeProblem, draw: drawProblem, cam: (S) => (S.practice?.prob?.kind === 'E' ? CAM.strip : CAM.pvP) }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 2.1 · Resumen', title: 'Elasticidad y compliance', ideas: [
        'Material: <span class="m"><i>E</i> = <i>σ</i>/<i>ε</i></span>, la pendiente de tu tabla. Pared rígida ≈ 4 × la sana.',
        'Vaso entero: compliance <span class="m"><i>C</i> = Δ<i>V</i>/Δ<i>P</i></span>. Venas ≈ 25 × más compliantes que arterias: son el reservorio.',
        'Distensibilidad <span class="m"><i>D</i> = Δ<i>V</i>/(<i>V</i><sub>0</sub>Δ<i>P</i>)</span>: el cambio relativo, para comparar vasos de distinto tamaño.',
        'Aorta (caso 02): <span class="m"><i>C</i></span> = 7 mL/mmHg, <span class="m"><i>D</i></span> = 0,7 %/mmHg.',
      ], next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#amortiguador">2.2 · La aorta amortiguadora ›</a>' }), draw() {} }],
    },
  ],
};
