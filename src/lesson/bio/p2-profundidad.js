// Biofísica 1.2 — Presión y profundidad  (Semana 7, bloque «Presión»)
// Guion: docs/biofisica-presion-guion.md, lección 1.2.
//
// La fórmula P = P₀ + ρgh no se anuncia: el estudiante la construye pieza a
// pieza (¿qué sostiene la columna?, su volumen, su masa, su peso), la comprueba
// midiendo, contrasta su predicción inicial y resuelve ejemplos cada vez con
// menos ayuda (ejemplo resuelto → semi-resuelto → independiente).

import { ramp, clamp, snap, lerp, easeInOut } from '../core/anim.js';
import { UI_ES, G, MMHG, P_ATM, n, readout, formula, table, titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick } from './kit.js';
import { RHO_W, TANK, tankScene, phGraph, shapesScene, oilTank, diverScene } from './hydro.js';

const CAM = {
  title: { xmin: -1.4, xmax: 5.0, ymin: -0.8, ymax: 4.0 },
  diver: { xmin: -1.6, xmax: 6.4, ymin: -0.8, ymax: 4.1 },
  tank: { xmin: -1.2, xmax: 9.0, ymin: -1.0, ymax: 4.1 },
  tankP: { xmin: -1.4, xmax: 5.4, ymin: -0.9, ymax: 4.3 },
  shapes: { xmin: -0.6, xmax: 8.6, ymin: -1.0, ymax: 3.4 },
};

// Derivation lines shown in the working panel as the learner builds them.
const DERIV = [
  { key: 'hold', text: 'La columna no cae: el agua de abajo la sostiene empujando hacia arriba con $P$·$A$.' },
  { key: 'vol', text: 'Volumen de la columna:', math: '$V$ = $A$·$h$' },
  { key: 'mass', text: 'Masa:', math: '$m$ = $ρ$·$V$ = $ρ$·$A$·$h$' },
  { key: 'weight', text: 'Peso:', math: '$W$ = $m$·$g$ = $ρ$·$g$·$A$·$h$' },
  { key: 'bal', text: 'Equilibrio (arriba = abajo):', math: '$P$·$A$ = $P_0$·$A$ + $ρ$ $g$ $A$ $h$' },
  { key: 'div', text: 'Dividiendo entre $A$:', math: '$P$ = $P_0$ + $ρ$ $g$ $h$' },
];

function derivWork(S, upto) {
  const lines = [{ h: 'Construyendo la fórmula' }];
  DERIV.forEach((d, i) => {
    if (i < upto) lines.push({ step: i + 1, text: d.text, math: d.math, state: i === upto - 1 ? 'now' : 'done' });
  });
  return lines;
}

function derivChoice({ key, prompt, choices, success, upto, column = {} }) {
  const c = askChoice({ key, choices });
  return {
    kind: 'do', cam: CAM.tankP, panel: 'work', ...c,
    caption: (S) => c.feedback(S) ?? 'Piensa en la columna resaltada.',
    prompt, success,
    work: (S) => derivWork(S, c.done(S) ? upto : upto - 1),
    draw({ ink }) { tankScene(ink, 1.8, { column: true, probe: false, hLabel: '$h$', ...column }); },
  };
}

const PRED = { half: 'la mitad', same: 'la misma', double: 'el doble', quad: 'cuatro veces' };

// ---------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'depth': {
      const fl = pick(rnd, [['agua', 1000], ['agua de mar', 1025], ['sangre', 1060]]);
      const h = pick(rnd, [0.5, 1.5, 2, 3, 4, 6, 10]);
      const ans = (fl[1] * G * h) / 1000;
      return {
        kind, ask: `¿Cuánto vale la presión manométrica a ${n(h)} m de profundidad en ${fl[0]}?`,
        given: [['$ρ$', `${n(fl[1])} kg/m³`], ['$h$', `${n(h)} m`]],
        number: { label: '$P$ − $P_0$ =', unit: 'kPa', answer: ans, d: 1 }, h,
        hint: 'Manométrica = solo $ρ$ $g$ $h$. Pa → kPa: ÷ 1000.',
        solution: [{ text: 'Manométrica:', math: `${n(fl[1])}·9,8·${n(h)} = ${n(ans * 1000, 0)} Pa = ${n(ans, 1)} kPa` }],
        why: `${n(ans, 1)} kPa.`,
      };
    }
    case 'abs': {
      const h = pick(rnd, [5, 10, 15, 20, 30]);
      const ans = (P_ATM + RHO_W * G * h) / 1000;
      return {
        kind, ask: `¿Cuál es la presión absoluta a ${h} m bajo la superficie de un lago? (en kPa)`,
        given: [['$h$', `${h} m`], ['$P_0$', '101,3 kPa']],
        number: { label: '$P$ =', unit: 'kPa', answer: ans, d: 1, rel: 0.005 }, h,
        hint: 'Absoluta = atmosférica + $ρ$ $g$ $h$.',
        solution: [{ text: 'Columna de agua:', math: `1000·9,8·${h} = ${n(RHO_W * G * h, 0)} Pa` }, { text: 'Absoluta:', math: `101 325 + ${n(RHO_W * G * h, 0)} = ${n(ans * 1000, 0)} Pa` }],
        why: `${n(ans, 1)} kPa (≈ ${n(ans / 101.3, 1)} atm).`,
      };
    }
    case 'force': {
      const h = pick(rnd, [2, 3, 5, 8]);
      const A = pick(rnd, [0.5, 1, 2, 3]);
      const ans = RHO_W * G * h * A * 1e-4;
      return {
        kind, ask: `¿Qué fuerza neta ejerce el agua sobre una membrana de ${n(A)} cm² a ${h} m de profundidad?`,
        given: [['$h$', `${h} m`], ['$A$', `${n(A)} cm²`]],
        number: { label: '$F$ =', unit: 'N', answer: ans, d: 2 }, h,
        hint: 'Primero $ρ$ $g$ $h$; luego $F$ = $P$·$A$ con $A$ en m².',
        solution: [{ text: 'Presión manométrica:', math: `${n(RHO_W * G * h, 0)} Pa` }, { text: 'Fuerza:', math: `${n(RHO_W * G * h, 0)}·${n(A)} × 10⁻⁴ = ${n(ans, 2)} N` }],
        why: `$F$ = ${n(ans, 2)} N.`,
      };
    }
    case 'findh': {
      const kPa = pick(rnd, [9.8, 19.6, 29.4, 49, 98]);
      return {
        kind, ask: `Un manómetro sumergido en agua marca ${n(kPa, 1)} kPa. ¿A qué profundidad está?`,
        given: [['$P$ − $P_0$', `${n(kPa, 1)} kPa`], ['$ρ$', '1000 kg/m³']],
        number: { label: '$h$ =', unit: 'm', answer: (kPa * 1000) / (RHO_W * G), d: 1 }, h: (kPa * 1000) / (RHO_W * G),
        hint: 'Despeja $h$ = ($P$ − $P_0$)/($ρ$ $g$).',
        solution: [{ text: 'Despejando:', math: `$h$ = ${n(kPa * 1000)} / (1000·9,8) = ${n((kPa * 1000) / (RHO_W * G), 1)} m` }],
        why: `$h$ = ${n((kPa * 1000) / (RHO_W * G), 1)} m.`,
      };
    }
    case 'ratio': {
      const h1 = pick(rnd, [2, 3, 5]);
      const k = pick(rnd, [2, 3, 4]);
      return {
        kind, ask: `A ${h1} m la presión manométrica es $X$. ¿Cuántas veces $X$ es a ${h1 * k} m?`,
        given: [['$h_1$', `${h1} m`], ['$h_2$', `${h1 * k} m`]],
        number: { label: '', unit: '× $X$', answer: k }, h: h1,
        hint: 'La presión manométrica es proporcional a la profundidad.',
        solution: [{ text: 'Proporcionalidad:', math: `$ρ$ $g$ (${h1 * k}) / $ρ$ $g$ (${h1}) = ${k}` }],
        why: `${k} veces.`,
      };
    }
    default: {
      const which = pick(rnd, ['ancho', 'estrecho']);
      return {
        kind: 'shape', ask: `Dos depósitos de agua de 2 m de altura: uno ${which === 'ancho' ? 'muy ancho, con 50 000 L' : 'estrecho, con 50 L'} y otro ${which === 'ancho' ? 'estrecho, con 50 L' : 'muy ancho, con 50 000 L'}. ¿Dónde es mayor la presión en el fondo?`,
        given: [['altura', '2 m (ambos)']],
        choices: [{ id: 'wide', label: 'en el que tiene más agua' }, { id: 'narrow', label: 'en el estrecho' }, { id: 'eq', label: 'es igual', correct: true }],
        hint: '$P$ = $P_0$ + $ρ$ $g$ $h$: ¿aparece el volumen o el área?',
        solution: [{ text: 'Misma $ρ$ y misma $h$:', math: 'misma presión, 19,6 kPa manométricos' }],
        why: 'Igual: solo importa la profundidad.', h: 2,
      };
    }
  }
}

function drawProblem(ink, p) {
  if (p.kind === 'shape') { shapesScene(ink, {}); return; }
  const h = clamp(p.h ?? 2, 0, 30);
  tankScene(ink, Math.min(2.8, 0.3 + h * 0.25), { hLabel: `$h$ = ${n(h, 1)} m`, gaugeLabel: false });
}

const practiceCam = (S) => (S.practice?.prob?.kind === 'shape' ? CAM.shapes : CAM.tankP);

// ------------------------------------------------------------- lesson

function earStep(k, caption) {
  return {
    kind: 'watch', dur: 3, pause: true, autoPause: false, cam: CAM.tankP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Ejemplo resuelto' }, { given: [['$h$', '4 m'], ['$A_{tímpano}$', '3 cm²'], ['$ρ_{agua}$', '1000 kg/m³']] },
        { step: 1, text: 'Presión manométrica (el oído medio está a $P_0$):', math: '$ρ$ $g$ $h$ = 1000·9,8·4 = 39 200 Pa', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Área en m²:', math: '3 cm² = 3 × 10⁻⁴ m²', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Fuerza = presión × área:', math: '$F$ = 39 200 · 3 × 10⁻⁴ ≈ 11,8 N', state: st(3) }] : []),
      ];
    },
    draw({ ink }) { diverScene(ink, 1.6, { label: '4 m', arrows: 1 }); },
  };
}

export const p2 = {
  id: 'bio-p2', code: '1.2', title: 'Presión y profundidad', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.tank, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, depth: 1, marks: [], rows: [] }),
  chapters: [
    {
      id: 'intro', title: 'Presión y profundidad', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Presión · Lección 1.2',
          title: 'Presión y profundidad',
          sub: '¿Por qué duelen los oídos al bucear? Vas a construir la fórmula de la presión hidrostática pieza a pieza y a comprobarla midiendo.',
          meta: 'Unos 30 minutos · Semana 7 · Derivación guiada · Experimento · Ejemplos · Práctica',
        }),
        draw({ ink }, t) { diverScene(ink, 0.6 + 1.6 * ramp(t, 0.5, 3), { label: '' }); },
      }],
    },
    // ============================================================ 1
    {
      id: 'buceo', title: 'Al bucear', short: 'Al bucear', num: '1',
      beats: [
        {
          kind: 'watch', dur: 5, cam: CAM.diver,
          caption: 'Al bajar en una piscina, los oídos empiezan a doler. Cuanto más bajas, más duele: el agua empuja el tímpano hacia dentro.',
          draw({ ink }, t) {
            const d = 0.4 + 2.2 * ramp(t, 0.5, 4, easeInOut);
            diverScene(ink, d, { label: `${n(d * 2.5, 1)} m`, scale: 2.5, arrows: 1 });
          },
        },
        {
          kind: 'do', cam: CAM.diver,
          controls: (S) => Object.entries(PRED).map(([id, label]) => ({ type: 'choice', id, label, state: S.g.pred === id ? 'right' : null, disabled: !!S.g.pred })),
          act(S, id) { S.g.pred = S.g.pred ?? id; },
          caption: 'Aún no hay respuesta correcta o incorrecta: guardaremos tu predicción y la comprobaremos.',
          prompt: 'A 2 m, el agua empuja el tímpano con una presión extra $X$. A 4 m, ¿cuál crees que será esa presión extra?',
          success: (S) => `Predicción guardada: «${PRED[S.g.pred]}». Para saber quién tiene razón, primero hay que entender de dónde sale esa presión.`,
          draw({ ink }) { diverScene(ink, 1.6, { label: '4 m', scale: 2.5, arrows: 1 }); },
          done: (S) => !!S.g.pred,
          skip(S) { S.g.pred = S.g.pred ?? 'double'; },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'columna', title: 'Construye la fórmula', short: 'La fórmula', num: '2',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.tankP, panel: 'work',
          caption: 'Imagina, dentro del agua, una columna vertical que va desde la superficie hasta un área pequeña $A$ a profundidad $h$. Esa agua pesa.',
          work: (S) => derivWork(S, 0),
          draw({ ink }, t) { tankScene(ink, 1.8, { column: true, columnOp: ramp(t, 0.5, 1), weight: ramp(t, 1.5, 0.8), probe: false, hLabel: '$h$' }); },
        },
        derivChoice({
          key: 'hold', upto: 1, column: { weight: 1, push: 1 },
          prompt: 'Si la columna pesa, ¿por qué no se hunde?',
          choices: [
            { id: 'walls', label: 'porque la sostienen las paredes del tanque', why: 'La columna está en medio del agua, lejos de las paredes. Algo la sostiene desde abajo.' },
            { id: 'below', label: 'porque el agua de debajo la empuja hacia arriba', correct: true },
            { id: 'none', label: 'porque el agua no pesa dentro del agua', why: 'El agua pesa siempre; lo que pasa es que su peso está equilibrado por otra fuerza.' },
          ],
          success: 'El agua de debajo empuja hacia arriba con una fuerza $P$·$A$. Para que la columna no se mueva, esa fuerza debe igualar todo lo que empuja hacia abajo.',
        }),
        derivChoice({
          key: 'vol', upto: 2, column: { weight: 1, push: 1 },
          prompt: '¿Cuál es el volumen de la columna?',
          choices: [
            { id: 'Ah', label: '$A$·$h$', correct: true },
            { id: 'Ah2', label: '$A$/$h$', why: 'Una columna más alta tiene más volumen, no menos.' },
            { id: 'h', label: '$h$', why: 'Falta la sección: un cilindro más ancho, a igual altura, tiene más volumen.' },
          ],
          success: 'Base por altura: $V$ = $A$·$h$.',
        }),
        derivChoice({
          key: 'mass', upto: 3, column: { weight: 1, push: 1 },
          prompt: 'Con la densidad $ρ$ del líquido, ¿cuál es su masa?',
          choices: [
            { id: 'rAh', label: '$ρ$·$A$·$h$', correct: true },
            { id: 'r/Ah', label: '$ρ$ / ($A$·$h$)', why: 'Densidad = masa / volumen, así que masa = densidad × volumen.' },
            { id: 'Ah', label: '$A$·$h$', why: 'Eso es el volumen. Un litro de sangre pesa más que un litro de aire: falta la densidad.' },
          ],
          success: '$m$ = $ρ$·$V$ = $ρ$·$A$·$h$.',
        }),
        derivChoice({
          key: 'weight', upto: 4, column: { weight: 1, push: 1 },
          prompt: '¿Y su peso?',
          choices: [
            { id: 'rgAh', label: '$ρ$·$g$·$A$·$h$', correct: true },
            { id: 'rAh', label: '$ρ$·$A$·$h$', why: 'Eso es la masa (kg). El peso es una fuerza: $W$ = $m$·$g$.' },
            { id: 'g', label: '$g$·$h$', why: 'Falta la masa de la columna: $W$ = $m$·$g$.' },
          ],
          success: '$W$ = $m$·$g$ = $ρ$·$g$·$A$·$h$.',
        }),
        {
          kind: 'watch', dur: 4, cam: CAM.tankP, panel: 'work',
          caption: 'Hacia arriba empuja $P$·$A$. Hacia abajo, el peso de la columna y también el aire, que empuja la superficie con $P_0$·$A$. En equilibrio se igualan.',
          work: (S) => derivWork(S, 5),
          draw({ ink }) { tankScene(ink, 1.8, { column: true, weight: 1, push: 1, probe: false, hLabel: '$h$' }); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.tankP, panel: 'work',
          caption: 'Divide todo entre $A$ y el área desaparece: $P$ = $P_0$ + $ρ$ $g$ $h$. Esta es la presión hidrostática.',
          work: (S) => derivWork(S, 6),
          draw({ ink }, t) { tankScene(ink, 1.8, { column: true, weight: 1, push: 1, probe: false, hLabel: '$h$' }); formula(ink, 'f-h', '$P$ = $P_0$ + $ρ$ $g$ $h$', { op: ramp(t, 0.5, 0.8), fx: 0.33, fy: 0.12 }); },
        },
        derivChoice({
          key: 'area', upto: 6, column: { weight: 1, push: 1 },
          prompt: 'Si hubieras elegido un área $A$ el doble de grande, ¿cambiaría la presión a esa profundidad?',
          choices: [
            { id: 'yes', label: 'sí, sería el doble', why: 'Con el doble de área la columna pesa el doble, pero ese peso se reparte en el doble de área.' },
            { id: 'half', label: 'sí, sería la mitad', why: 'El área aparece arriba y abajo, y se cancela.' },
            { id: 'no', label: 'no: el área se cancela', correct: true },
          ],
          success: 'La presión depende solo de la profundidad, de la densidad del líquido y de $g$. Esto tendrá una consecuencia sorprendente en el capítulo 4.',
        }),
      ],
    },
    // ============================================================ 3
    {
      id: 'medir', title: 'Compruébalo midiendo', short: 'Medir', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.tank,
          caption: (S) => (S.rows.length < 4 ? `Mediciones anotadas: ${S.rows.length} de 4.` : ''),
          prompt: 'Baja el sensor a distintas profundidades y pulsa «Anotar» en al menos 4 posiciones distintas.',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar medición', primary: true }],
          act(S, id) {
            if (id !== 'rec' || S.rows.some((h) => Math.abs(h - S.depth) < 0.05)) return;
            S.rows.push(S.depth);
            S.marks.push(S.depth);
          },
          success: 'Los puntos quedan sobre una recta que pasa por el origen: la presión manométrica es <b>proporcional</b> a la profundidad.',
          draw({ ink, S }) {
            tankScene(ink, S.depth);
            phGraph(ink, S.marks, { line: S.rows.length >= 4 ? 1 : 0 });
            table(ink, 'tbh', [{ h: 'h (m)', w: 60 }, { h: 'P − P₀ (kPa)', w: 100 }], S.rows.slice(-5).map((h) => [n(h, 1), n((RHO_W * G * h) / 1000, 1)]), { x: 26, y: 20, empty: '—' });
          },
          handles: (S) => [{ key: 'probe', p: { x: 2.2, y: 3 - S.depth }, r: 24, cursor: 'ns-resize', drag: (S2, p) => { S2.depth = clamp(snap(3 - p.y, 0.1), 0.1, 3); } }],
          done: (S) => S.rows.length >= 4,
          skip(S) { for (const h of [0.5, 1, 2, 3]) if (!S.rows.includes(h)) { S.rows.push(h); S.marks.push(h); } },
        },
        {
          kind: 'do', cam: CAM.tank,
          ...askNumber({ key: 'slope', label: '', unit: 'kPa por metro', answer: 9.8, rel: 0.02, wrong: [[98, 'Revisa: la recta pasa por unos 29,4 kPa a 3 m.', 0.03], [1000, 'Esa es la densidad. Mira cuánto sube la presión de un metro al siguiente.']] }),
          caption: (S) => S.g.slope?.msg ?? (S.g.slope?.wrong ? 'Lee dos puntos de tu tabla separados 1 m.' : 'Usa tu tabla o la gráfica.'),
          prompt: '¿Cuánto aumenta la presión por cada metro de profundidad en agua?',
          success: '9,8 kPa por metro: exactamente $ρ$ $g$ = 1000 · 9,8. La pendiente de la recta es $ρ$ $g$.',
          draw({ ink, S }) { tankScene(ink, S.depth); phGraph(ink, S.marks, { line: 1, slope: S.g.slope?.ok ? 1 : 0 }); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.tank,
          caption: (S) => `Tu predicción era «${PRED[S.g.pred] ?? '—'}». Como la presión extra es proporcional a $h$, a 4 m es <b>el doble</b> que a 2 m. ${S.g.pred === 'double' ? '¡Acertaste!' : 'Si predijiste otra cosa, fíjate en la recta: doble profundidad, doble presión.'}`,
          draw({ ink, S }) { tankScene(ink, 2); phGraph(ink, [1, 2], { line: 1 }); },
        },
        {
          kind: 'do', cam: CAM.tank,
          ...askNumber({ key: 'blood', label: '', unit: 'mmHg por metro', answer: (1060 * G) / MMHG, rel: 0.02, wrong: [[1060 * G, 'Eso está en Pa por metro. Divide entre 133,3.', 0.02], [(1000 * G) / MMHG, 'Usaste la densidad del agua; la sangre tiene 1060 kg/m³.', 0.01]] }),
          caption: (S) => S.g.blood?.msg ?? (S.g.blood?.wrong ? 'Pendiente = $ρ$ $g$, en Pa/m; luego a mmHg.' : 'Ahora en sangre ($ρ$ = 1060 kg/m³), y en las unidades del clínico.'),
          prompt: '¿Cuántos mmHg aumenta la presión por cada metro de sangre?',
          success: '1060 · 9,8 = 10 388 Pa por metro ≈ <b>78 mmHg por metro</b>. Recuerda este número: lo usaremos para entender la postura (lección 1.4).',
          draw({ ink, S }) { tankScene(ink, 1.5, { rho: 1060, blood: true }); },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'forma', title: '¿Y la forma del recipiente?', short: 'La forma', num: '4',
      beats: [
        {
          kind: 'do', cam: CAM.shapes,
          ...(() => {
            const c = askChoice({
              key: 'shape', choices: [
                { id: 'a', label: 'en (a): tiene más agua encima', why: 'Hay más agua, pero mira la derivación: lo que importa es la columna justo encima del punto.' },
                { id: 'c', label: 'en (c): su fondo es más grande', why: 'Un fondo más grande recibe más fuerza total, pero no más presión: $P$ = $F/A$.' },
                { id: 'eq', label: 'es igual en los tres', correct: true },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Mismo líquido, misma altura $h$, formas muy distintas.' };
          })(),
          prompt: '¿En cuál es mayor la presión en el fondo?',
          success: 'Igual en los tres: es lo que dice $P$ = $P_0$ + $ρ$ $g$ $h$, donde no aparece la forma. Se llama <b>paradoja hidrostática</b>.',
          draw({ ink, S }) { shapesScene(ink, { reveal: S.g.shape === 'eq' }); },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.shapes,
          caption: '¿Y el agua de más en (a)? Las paredes inclinadas la sostienen (flechas). En (c) ocurre lo contrario: las paredes empujan hacia abajo y compensan el agua que falta.',
          draw({ ink }, t) { shapesScene(ink, { reveal: true, walls: ramp(t, 0.4, 0.8) }); },
        },
      ],
    },
    // ============================================================ 5
    {
      id: 'ejemplos', title: 'De ejemplo a problema', short: 'Ejemplos', num: '5',
      beats: [
        earStep(1, 'Ejemplo resuelto. A 4 m de profundidad, ¿con qué fuerza empuja el agua el tímpano (unos 3 cm²)? Primero, la presión.'),
        earStep(2, 'La fuerza necesita el área en m².'),
        earStep(3, 'Unos 12 N, como sostener 1,2 kg con el tímpano. Por eso duele, y por eso los buceadores «compensan» igualando la presión del oído medio.'),
        {
          kind: 'do', cam: CAM.tankP, panel: 'work',
          ...askNumber({ key: 'ear10', label: '$F$ =', unit: 'N', answer: 98000 * 3e-4, rel: 0.02, wrong: [[98000, 'Esa es la presión. Falta multiplicar por el área.', 0.02], [98000 * 3, 'El área va en m²: 3 × 10⁻⁴.', 0.02]] }),
          caption: (S) => S.g.ear10?.msg ?? (S.g.ear10?.wrong ? 'Mismo paso 3 que en el ejemplo.' : 'Ahora a 10 m. Te damos el primer paso; termina tú.'),
          prompt: '¿Con qué fuerza empuja el agua el tímpano a 10 m?',
          success: '98 000 Pa · 3 × 10⁻⁴ m² ≈ 29 N: casi 3 kg sobre el tímpano.',
          work: (S) => [
            { h: 'Semi-resuelto' }, { given: [['$h$', '10 m'], ['$A$', '3 cm²']] },
            { step: 1, text: 'Presión manométrica:', math: '1000·9,8·10 = 98 000 Pa', state: 'done' },
            { step: 2, text: 'Tu turno: fuerza sobre el tímpano.', state: S.g.ear10?.ok ? 'done' : 'now' },
            ...(S.g.ear10?.ok ? [{ result: '$F$ ≈ 29 N', ok: true }] : []),
          ],
          draw({ ink }) { diverScene(ink, 2.6, { label: '10 m', arrows: 1 }); },
        },
        {
          kind: 'do', cam: CAM.tankP, panel: 'work',
          ...askNumber({
            key: 'P1', label: '$P_1$ =', unit: 'kPa', answer: (P_ATM + 700 * G * 8) / 1000, rel: 0.005,
            wrong: [[(700 * G * 8) / 1000, 'Esa es solo la parte manométrica. El tanque está abierto: suma $P_0$ = 101,3 kPa.', 0.01], [(P_ATM + 1025 * G * 8) / 1000, 'Usaste la densidad del agua salada. Sobre la interfase hay petróleo: 700 kg/m³.', 0.005]],
          }),
          caption: (S) => S.g.P1?.msg ?? (S.g.P1?.wrong ? 'Sobre la interfase solo hay petróleo y aire.' : 'Sin ayuda: el ejercicio del tanque de la clase. Ve capa por capa, de arriba abajo.'),
          prompt: '¿Cuál es la presión absoluta $P_1$ en la interfase petróleo–agua? (kPa)',
          success: '$P_1$ = 101 325 + 700·9,8·8 = 156 205 Pa ≈ 156,2 kPa.',
          work: (S) => [{ h: 'Independiente' }, { given: [['$h_1$', '8,00 m de petróleo'], ['$ρ_1$', '700 kg/m³'], ['$h_2$', '5,00 m de agua salada'], ['$ρ_2$', '1025 kg/m³'], ['$P_0$', '101 325 Pa']] }, ...(S.g.P1?.ok ? [{ result: '$P_1$ = 156,2 kPa', ok: true }] : [])],
          draw({ ink }) { oilTank(ink, { at: 1 }); },
        },
        {
          kind: 'do', cam: CAM.tankP, panel: 'work',
          ...askNumber({
            key: 'Pb', label: '$P_{fondo}$ =', unit: 'kPa', answer: (P_ATM + 700 * G * 8 + 1025 * G * 5) / 1000, rel: 0.005,
            wrong: [[(P_ATM + 1025 * G * 13) / 1000, 'Usaste agua salada en toda la altura. Cada capa aporta con su propia densidad.', 0.005], [(700 * G * 8 + 1025 * G * 5) / 1000, 'Falta la presión atmosférica: pide la absoluta.', 0.01]],
          }),
          caption: (S) => S.g.Pb?.msg ?? (S.g.Pb?.wrong ? 'Desde $P_1$, suma la columna de agua salada.' : 'Sigue bajando.'),
          prompt: '¿Cuál es la presión absoluta en el fondo? (kPa)',
          success: '$P_{fondo}$ = 156 205 + 1025·9,8·5 = 206 430 Pa ≈ 206,4 kPa: unas 2 atmósferas.',
          work: (S) => [{ h: 'Independiente' }, { given: [['$P_1$', '156 205 Pa'], ['$h_2$', '5,00 m'], ['$ρ_2$', '1025 kg/m³']] }, ...(S.g.Pb?.ok ? [{ result: '$P_{fondo}$ = 206,4 kPa', ok: true }] : [])],
          draw({ ink }) { oilTank(ink, { at: 2 }); },
        },
      ],
    },
    // ============================================================ 6
    practiceChapter({ num: '6', seed: 61202, kinds: ['depth', 'ratio', 'abs', 'shape', 'force', 'findh'], make: makeProblem, draw: drawProblem, cam: practiceCam }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '7',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica 1.2 · Resumen',
          title: 'Presión y profundidad',
          ideas: [
            'El agua de abajo sostiene el peso de la columna de arriba: <span class="m"><i>P</i> = <i>P</i><sub>0</sub> + <i>ρgh</i></span>. Lo construiste tú, paso a paso.',
            'La presión manométrica es proporcional a la profundidad: pendiente <span class="m"><i>ρg</i></span> = 9,8 kPa/m en agua, ≈ 78 mmHg/m en sangre.',
            'El área se cancela: la forma y la cantidad de líquido no importan (paradoja hidrostática).',
            'Fuerza sobre una superficie: <span class="m"><i>F</i> = <i>P</i>·<i>A</i></span>. Con varias capas, se suma capa por capa con su propia densidad.',
          ],
          next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#manometros">1.3 · Medir la presión ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};
