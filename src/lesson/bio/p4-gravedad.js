// Biofísica 1.4 — La sangre y la gravedad  (Semana 7, bloque «Presión»)
// Guion: docs/biofisica-presion-guion.md, lección 1.4.
//
// Todo lo de 1.2 aplicado al cuerpo: la sangre es una columna de líquido.
// El estudiante predice, mide con un sensor, calcula con los 78 mmHg/m que
// obtuvo en 1.2, descubre un error de medición real (el brazo colgando),
// construye la cadena causal de la hipotensión ortostática y razona sobre
// las venas, la bomba muscular y el edema.

import { ramp, clamp, lerp, easeInOut, snap } from '../core/anim.js';
import {
  UI_ES, G, MMHG, n, gauge, figure, bed, readout, table, rect, titleCard, summaryCard,
  practiceChapter, askNumber, askChoice, orderChain, createWorkPanel, pick,
} from './kit.js';

const RHO_B = 1060;
const H = 1.75;
const HEART_U = 0.72;
const PER_M = (RHO_B * G) / MMHG; // ≈ 78 mmHg per metre of blood

const CAM = {
  title: { xmin: -2.8, xmax: 3.6, ymin: -0.6, ymax: 2.3 },
  body: { xmin: -2.4, xmax: 3.7, ymin: -0.75, ymax: 2.25 },
  bodyP: { xmin: -2.2, xmax: 3.0, ymin: -0.6, ymax: 2.2 },
  chain: { xmin: -3, xmax: 3, ymin: -2, ymax: 2 },
  legs: { xmin: -2.6, xmax: 3.8, ymin: -0.6, ymax: 2.2 },
};

/**
 * Patient standing (ang = 0) or lying (ang = −π/2) with a pressure probe at
 * fraction u of body height. Mean arterial pressure is 100 mmHg at the heart.
 */
function bodyScene(ink, ang, u, o = {}) {
  const lie = clamp(-ang / (Math.PI / 2));
  const at = { x: lerp(0, -0.9, lie), y: lerp(0, 0.42 + 0.13 * H * 0.6, lie) };
  if (lie > 0.02) bed(ink, 'bed', -1.05, 1.05, 0.42, { op: lie });
  if (lie < 0.98) ink.ground('floor', { x: -1.4, y: 0 }, { x: 1.4, y: 0 }, { op: 1 - lie });
  const fig = figure(ink, 'fig', at, H, ang, { op: o.op, sx: 1 - 0.4 * lie });
  const hy = fig.heart.y;
  ink.line('heart-ref', { x: -2.1, y: hy }, { x: 2.4, y: hy }, 'dashdot', { op: o.refOp ?? 1, layer: 'annotations' });
  ink.text('heart-refl', { x: -2.1, y: hy }, 'nivel del corazón', { op: o.refOp ?? 1, dy: -8, size: 13, anchor: 'start', cls: 'mid' });
  if (u === null || u === undefined) return { fig };
  const probe = fig.W(0, u);
  const dh = o.dh ?? hy - probe.y;
  const Pm = 100 + PER_M * dh;
  if (Math.abs(dh) > 0.12 && !o.noDim) ink.dimension('dh', { x: 1.55, y: hy }, { x: 1.55, y: probe.y }, 0, `Δ$h$ = ${n(Math.abs(dh), 2)} m`, { size: 14 });
  ink.line('probe-h', probe, { x: 1.55, y: probe.y }, 'drop', { layer: 'annotations' });
  ink.circle('probe', probe, 6, 'ring-accent', { layer: 'vectors' });
  gauge(ink, 'gB', { x: 2.35, y: probe.y }, Pm, 220, { r: 22, label: o.showP === false ? '? mmHg' : `${n(Pm, 0)} mmHg`, size: 15 });
  return { probe, Pm, dh, fig };
}

function probeHandle(S) {
  const lie = clamp(-S.ang / (Math.PI / 2));
  const at = { x: lerp(0, -0.9, lie), y: lerp(0, 0.42 + 0.13 * H * 0.6, lie) };
  const c = Math.cos(S.ang), s = Math.sin(S.ang);
  const p = { x: at.x - S.u * H * s, y: at.y + S.u * H * c };
  return [{ key: 'probe', p, r: 22, drag: (S2, q) => {
    const dx = q.x - at.x, dy = q.y - at.y;
    S2.u = clamp(snap((-dx * s + dy * c) / H, 0.01), 0.03, 0.93);
  } }];
}

/** Arm hanging beside the body with a cuff on it, Δh below the heart. */
function armScene(ink, drop, o = {}) {
  ink.ground('floor', { x: -1.4, y: 0 }, { x: 1.4, y: 0 });
  const fig = figure(ink, 'fig', { x: 0, y: 0 }, H, 0, {});
  const hy = fig.heart.y;
  ink.line('heart-ref', { x: -2.1, y: hy }, { x: 2.6, y: hy }, 'dashdot', { layer: 'annotations' });
  ink.text('heart-refl', { x: -2.1, y: hy }, 'nivel del corazón', { dy: -8, size: 13, anchor: 'start', cls: 'mid' });
  const cuffY = hy - drop;
  const ax = 0.27;
  rect(ink, 'cuff', ax - 0.11, cuffY - 0.09, ax + 0.11, cuffY + 0.09, 'cuff');
  if (drop > 0.03) ink.dimension('arm-dh', { x: 0.75, y: hy }, { x: 0.75, y: cuffY }, 0, `${n(drop * 100, 0)} cm`, { size: 14 });
  const read = o.Psys + PER_M * drop;
  gauge(ink, 'cuff-g', { x: 1.9, y: cuffY }, o.hide ? 0 : read, 220, { r: 24, label: o.hide ? 'lee ? mmHg' : `lee ${n(read, 0)} mmHg`, size: 15 });
  ink.line('cuff-line', { x: ax + 0.11, y: cuffY }, { x: 1.9 - 0.3, y: cuffY }, 'ink', { layer: 'statics' });
}

/** Legs with veins: venous pressure at the ankle, still vs walking. */
function legScene(ink, walking, t, o = {}) {
  ink.ground('floor', { x: -1.4, y: 0 }, { x: 1.4, y: 0 });
  const phase = walking ? Math.sin(t * 4) : 0;
  figure(ink, 'fig', { x: 0, y: 0 }, H, 0, {});
  // A vein drawn along the leg, with valves (small chevrons).
  const vx = 0.05;
  ink.line('vein', { x: vx, y: 0.08 }, { x: vx, y: 0.9 }, 'blue heavy', { layer: 'vectors' });
  for (let i = 0; i < 4; i++) {
    const y = 0.2 + i * 0.2;
    const open = walking ? 0.5 + 0.5 * Math.sin(t * 4 + i) : 1;
    ink.poly(`valve${i}`, [{ x: vx - 0.035, y: y - 0.03 }, { x: vx, y: y + 0.01 * open }, { x: vx + 0.035, y: y - 0.03 }], 'blue', { layer: 'vectors' });
  }
  const Pv = walking ? 25 + 6 * phase : 90;
  gauge(ink, 'ven-g', { x: 1.6, y: 0.15 }, Pv, 120, { r: 24, label: `vena del tobillo: ${n(Pv, 0)} mmHg`, size: 15 });
  ink.line('ven-l', { x: vx + 0.05, y: 0.15 }, { x: 1.6 - 0.3, y: 0.15 }, 'drop', { layer: 'annotations' });
  if (walking) ink.text('pump', { x: -0.5, y: 0.5 }, 'los músculos de la pantorrilla exprimen la vena', { dx: -8, size: 13, anchor: 'end', cls: 'mid' });
}

const ORTHO = [
  'El paciente se pone de pie',
  'La columna de sangre bajo el corazón sube la presión en las venas de las piernas ($ρ$ $g$ $h$)',
  'Las venas, muy distensibles, se dilatan y retienen sangre (≈ 500 mL)',
  'Vuelve menos sangre al corazón: cae el retorno venoso',
  'El corazón expulsa menos sangre en cada latido: cae el volumen sistólico',
  'Cae la presión arterial',
  'Llega menos sangre al cerebro, que está por encima del corazón: mareo',
];

// ---------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'level': {
      const dh = pick(rnd, [0.2, 0.3, 0.4, 0.5, 0.9, 1.1, 1.3]);
      const below = rnd() < 0.55;
      const ans = 100 + (below ? 1 : -1) * PER_M * dh;
      return {
        kind, ask: `De pie, con PAM = 100 mmHg en el corazón, ¿cuál es la PAM en un punto ${n(dh, 2)} m ${below ? 'por debajo' : 'por encima'} del corazón?`,
        given: [['$ρ_{sangre}$', '1060 kg/m³'], ['Δ$h$', `${n(dh, 2)} m ${below ? 'abajo' : 'arriba'}`]],
        number: { label: '$P$ =', unit: 'mmHg', answer: ans, d: 0, rel: 0.03 }, dh, below,
        hint: `≈ 78 mmHg por metro de sangre (1060·9,8/133,3). ${below ? 'Por debajo se suma.' : 'Por encima se resta.'}`,
        solution: [{ text: 'Diferencia:', math: `78·${n(dh, 2)} ≈ ${n(PER_M * dh, 1)} mmHg` }, { text: below ? 'Se suma:' : 'Se resta:', math: `100 ${below ? '+' : '−'} ${n(PER_M * dh, 1)} = ${n(ans, 0)} mmHg` }],
        why: `≈ ${n(ans, 0)} mmHg.`,
      };
    }
    case 'arm': {
      const cm = pick(rnd, [10, 15, 20, 25, 30]);
      const up = rnd() < 0.35;
      const err = (PER_M * cm) / 100;
      const ans = 120 + (up ? -1 : 1) * err;
      return {
        kind, ask: `La presión sistólica real (a la altura del corazón) es 120 mmHg. Se mide con el brazo ${cm} cm ${up ? 'por encima' : 'por debajo'} del corazón. ¿Qué lectura se obtiene?`,
        given: [['real', '120 mmHg'], ['brazo', `${cm} cm ${up ? 'arriba' : 'abajo'}`]],
        number: { label: 'lectura =', unit: 'mmHg', answer: ans, d: 0, rel: 0.02 }, drop: up ? -cm / 100 : cm / 100,
        hint: 'Corrige con 78 mmHg por metro (0,78 mmHg por cm).',
        solution: [{ text: 'Error hidrostático:', math: `0,78·${cm} ≈ ${n(err, 1)} mmHg` }, { text: up ? 'Brazo alto: lee de menos.' : 'Brazo bajo: lee de más.', math: `${n(ans, 0)} mmHg` }],
        why: `≈ ${n(ans, 0)} mmHg: ${up ? 'falsa hipotensión' : 'falsa hipertensión'}.`,
      };
    }
    case 'dh': {
      const dP = pick(rnd, [20, 31, 50, 78, 100]);
      return {
        kind, ask: `En una persona de pie, la PAM en un punto es ${dP} mmHg mayor que en el corazón. ¿Cuántos metros por debajo del corazón está?`,
        given: [['Δ$P$', `${dP} mmHg`], ['$ρ_{sangre}$', '1060 kg/m³']],
        number: { label: 'Δ$h$ =', unit: 'm', answer: dP / PER_M, d: 2 }, dh: dP / PER_M, below: true,
        hint: 'Δ$h$ = Δ$P$ / ($ρ$ $g$), con Δ$P$ en Pa.',
        solution: [{ text: 'En Pa:', math: `${dP}·133,3 = ${n(dP * MMHG, 0)} Pa` }, { text: 'Altura:', math: `${n(dP * MMHG, 0)} / (1060·9,8) = ${n(dP / PER_M, 2)} m` }],
        why: `Δ$h$ ≈ ${n(dP / PER_M, 2)} m.`,
      };
    }
    case 'ortho': {
      const [s1, d1, s2, d2] = pick(rnd, [[130, 85, 90, 60], [120, 80, 112, 76], [140, 90, 115, 80], [125, 80, 118, 78], [135, 85, 110, 70]]);
      const yes = s1 - s2 >= 20 || d1 - d2 >= 10;
      return {
        kind, ask: `Sentado: ${s1}/${d1} mmHg. A los 3 minutos de pie: ${s2}/${d2} mmHg. ¿Cumple el criterio de hipotensión ortostática (caída ≥ 20 de la sistólica o ≥ 10 de la diastólica)?`,
        given: [['sentado', `${s1}/${d1}`], ['de pie', `${s2}/${d2}`]],
        choices: [{ id: 'y', label: 'sí', correct: yes }, { id: 'n', label: 'no', correct: !yes }],
        hint: 'Calcula las dos caídas y compáralas con 20 y 10 mmHg.',
        solution: [{ text: 'Caídas:', math: `sistólica ${s1 - s2}, diastólica ${d1 - d2} mmHg` }, { text: yes ? 'Supera al menos un umbral.' : 'No alcanza ningún umbral.', math: '' }],
        why: yes ? 'Sí: hipotensión ortostática.' : 'No: respuesta normal al ponerse de pie.',
      };
    }
    default: {
      return {
        kind: 'lying', ask: 'Un paciente acostado boca arriba: ¿cómo es la PAM en los pies comparada con la del corazón?',
        given: [['postura', 'decúbito supino']],
        choices: [{ id: 'more', label: 'mucho mayor, como de pie' }, { id: 'same', label: 'casi igual', correct: true }, { id: 'less', label: 'mucho menor' }],
        hint: 'Lo que cuenta es la diferencia de altura vertical respecto al corazón.',
        solution: [{ text: 'Acostado, Δ$h$ ≈ 0:', math: 'la presión es casi uniforme (≈ 100 mmHg)' }],
        why: 'Casi igual: acostado no hay columna vertical.',
      };
    }
  }
}

function drawProblem(ink, p, solved) {
  if (p.kind === 'arm') { armScene(ink, p.drop, { Psys: 120, hide: !solved }); return; }
  if (p.kind === 'lying') { bodyScene(ink, -Math.PI / 2, 0.05, { showP: false }); return; }
  if (p.kind === 'ortho') { bodyScene(ink, 0, 0.95, { showP: false }); return; }
  const u = clamp(HEART_U + ((p.below ? -1 : 1) * (p.dh ?? 0.5)) / H, 0.03, 0.95);
  bodyScene(ink, 0, u, { showP: false });
}

// ------------------------------------------------------------- lesson

export const p4 = {
  id: 'bio-p4', code: '1.4', title: 'La sangre y la gravedad', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.body, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, ang: 0, target: 0, u: 0.5, rows: [], lieSeen: false, walking: false, walkSeen: false }),
  chapters: [
    {
      id: 'intro', title: 'La sangre y la gravedad', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Presión · Lección 1.4',
          title: 'La sangre y la gravedad',
          sub: '¿Por qué un paciente se marea al levantarse y por qué se hinchan los tobillos? La sangre también es una columna de líquido.',
          meta: 'Unos 30 minutos · Semana 7 · Sensor · Error de medición · Cadena causal · Práctica',
        }),
        draw({ ink }) { bodyScene(ink, 0, null, { refOp: 0.6 }); },
      }],
    },
    // ============================================================ 1
    {
      id: 'caso', title: 'Un paciente se marea', short: 'El caso', num: '1',
      beats: [
        {
          kind: 'watch', dur: 4, cam: CAM.body,
          caption: 'Hombre de 65 años, hipertenso. Sentado: 130/85 mmHg. A los 3 minutos de pie: 90/60 mmHg, y refiere mareo. Al final de esta lección podrás explicar, paso a paso, qué le pasa.',
          draw({ ink }) { bodyScene(ink, 0, null); },
        },
        {
          kind: 'do', cam: CAM.body,
          ...(() => {
            const c = askChoice({
              key: 'where', choices: [
                { id: 'head', label: 'en la cabeza', why: 'La cabeza está por encima del corazón: hay una columna de sangre menos que sostener… al revés. Piensa en el buzo de 1.2.' },
                { id: 'heart', label: 'en el corazón, porque es la bomba', why: 'El corazón genera la presión, pero la gravedad se suma por debajo y se resta por encima, como en el tanque.' },
                { id: 'feet', label: 'en los tobillos', correct: true },
                { id: 'same', label: 'igual en todo el cuerpo', why: 'Sería así en el espacio, sin gravedad. Aquí, la sangre es una columna de 1,7 m.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Predice antes de medir. Recuerda lo que aprendiste en 1.2.' };
          })(),
          prompt: 'De pie, ¿dónde crees que la presión arterial media es mayor?',
          success: 'En los tobillos: es el punto más profundo de la columna de sangre. Vamos a medirlo.',
          draw({ ink }) { bodyScene(ink, 0, null); },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'columna', title: 'La sangre es una columna', short: 'Medir', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.body,
          caption: (S) => `Anotadas: ${['cabeza', 'corazón', 'tobillo'].filter((k) => S.rows.some((r) => r.k === k)).join(', ') || 'ninguna'}.`,
          prompt: 'Mueve el sensor y anota la presión en la <b>cabeza</b>, el <b>corazón</b> y el <b>tobillo</b>.',
          controls: () => [{ type: 'button', id: 'rec', label: 'Anotar medición', primary: true }],
          act(S, id) {
            if (id !== 'rec') return;
            const k = S.u > 0.85 ? 'cabeza' : Math.abs(S.u - HEART_U) < 0.05 ? 'corazón' : S.u < 0.1 ? 'tobillo' : null;
            const dh = H * (HEART_U - S.u);
            if (k && !S.rows.some((r) => r.k === k)) S.rows.push({ k, dh, P: 100 + PER_M * dh });
          },
          success: 'De la cabeza al tobillo, la presión media pasa de ≈ 70 a ≈ 190 mmHg. Cada metro de sangre suma ≈ 78 mmHg: el número que calculaste en 1.2.',
          draw({ ink, S }) {
            const r = bodyScene(ink, 0, S.u);
            table(ink, 'tb', [{ h: 'punto', w: 80 }, { h: 'Δh (m)', w: 80 }, { h: 'PAM (mmHg)', w: 100 }], S.rows.map((x) => [x.k, `${x.dh >= 0 ? '−' : '+'}${n(Math.abs(x.dh), 2)}`, n(x.P, 0)]), { y: 22, empty: '—' });
            return r;
          },
          handles: (S) => probeHandle(S),
          done: (S) => ['cabeza', 'corazón', 'tobillo'].every((k) => S.rows.some((r) => r.k === k)),
          skip(S) { S.rows = [{ k: 'cabeza', dh: -0.38, P: 70 }, { k: 'corazón', dh: 0, P: 100 }, { k: 'tobillo', dh: 1.17, P: 191 }]; },
        },
        {
          kind: 'do', cam: CAM.bodyP, panel: 'work',
          ...askNumber({ key: 'ankle', label: 'Δ$P$ =', unit: 'mmHg', answer: PER_M * 1.3, rel: 0.02, wrong: [[RHO_B * G * 1.3, 'Ese valor está en Pa. Divide entre 133,3.', 0.02], [1.3, 'Multiplica la altura por la presión por metro.', 0.05]] }),
          caption: (S) => S.g.ankle?.msg ?? (S.g.ankle?.wrong ? '78 mmHg por cada metro de sangre.' : 'Caso 01 de la clase: del corazón al tobillo hay 1,30 m. Usa tu resultado de 1.2: 78 mmHg por metro.'),
          prompt: '¿Cuánto mayor es la presión en el tobillo que en el corazón?',
          success: '78 · 1,30 ≈ 101 mmHg (o bien 1060·9,8·1,30 = 13 504 Pa). En las venas del tobillo pasa lo mismo: por eso los tobillos se hinchan (edema maleolar) tras muchas horas de pie.',
          work: (S) => [{ h: 'Caso 01' }, { given: [['$h$', '1,30 m'], ['$ρ_{sangre}$', '1060 kg/m³'], ['por metro', '≈ 78 mmHg']] }, ...(S.g.ankle?.ok ? [{ result: 'Δ$P$ ≈ 101 mmHg', ok: true }] : [])],
          draw({ ink }) { const r = bodyScene(ink, 0, 0.02, { dh: 1.3, noDim: true, showP: false }); ink.dimension('c1', { x: -0.55, y: r.fig.heart.y }, { x: -0.55, y: 0.035 }, 0, '$h$ = 1,30 m', { size: 15 }); },
        },
        {
          kind: 'do', cam: CAM.bodyP, panel: 'work',
          ...askNumber({ key: 'head', label: '$P_{cabeza}$ =', unit: 'mmHg', answer: 100 - PER_M * 0.4, rel: 0.03, wrong: [[100 + PER_M * 0.4, 'El cerebro está por encima: ahí la presión es menor. Resta.', 0.03], [PER_M * 0.4, 'Ese es Δ$P$. La presión en la cabeza es 100 menos Δ$P$.', 0.03]] }),
          caption: (S) => S.g.head?.msg ?? (S.g.head?.wrong ? 'Por encima del corazón, la presión es menor.' : 'El cerebro está unos 0,40 m por encima del corazón. PAM en el corazón: 100 mmHg.'),
          prompt: '¿Cuál es la PAM a la altura del cerebro, de pie?',
          success: '100 − 78·0,40 ≈ 69 mmHg. El cerebro trabaja con un margen pequeño: si la presión en el corazón cae, es lo primero que lo nota.',
          work: (S) => [{ h: 'Datos' }, { given: [['Δ$h$', '0,40 m (por encima)'], ['PAM corazón', '100 mmHg']] }, ...(S.g.head?.ok ? [{ result: '$P_{cabeza}$ ≈ 69 mmHg', ok: true }] : [])],
          draw({ ink, S }) { bodyScene(ink, 0, 0.95, { showP: !!S.g.head?.ok }); },
        },
      ],
    },
    // ============================================================ 3
    {
      id: 'medicion', title: 'Acostado y en la consulta', short: 'Medición', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.body,
          tick(S, dt) { S.ang += (S.target - S.ang) * (1 - Math.exp(-dt * 3.2)); },
          caption: (S) => (S.target < -1 ? 'Acostado, todo el cuerpo queda casi a la altura del corazón.' : 'De pie: mueve el sensor y luego acuesta al paciente.'),
          prompt: 'Acuesta al paciente y vuelve a mover el sensor de la cabeza a los pies.',
          controls: (S) => [
            { type: 'button', id: 'pie', label: 'De pie', primary: S.target === 0 },
            { type: 'button', id: 'acostado', label: 'Acostado', primary: S.target < -1 },
          ],
          act(S, id) { S.target = id === 'acostado' ? -Math.PI / 2 : 0; if (id === 'acostado') S.lieSeen = true; },
          success: 'Acostado, Δ$h$ ≈ 0 en todo el cuerpo: la presión es casi uniforme (≈ 100 mmHg). La gravedad solo importa en la dirección vertical.',
          draw({ ink, S }) { const r = bodyScene(ink, S.ang, S.u); readout(ink, [`Δ$h$ = ${n(r.dh, 2)} m`, `$P$ ≈ ${n(r.Pm, 0)} mmHg`]); },
          handles: (S) => probeHandle(S),
          done: (S) => S.lieSeen && Math.abs(S.ang + Math.PI / 2) < 0.1,
          skip(S) { S.lieSeen = true; S.target = S.ang = -Math.PI / 2; },
          leave(S) { S.ang = 0; S.target = 0; },
        },
        {
          kind: 'do', cam: CAM.body,
          ...askNumber({ key: 'arm', label: 'lectura =', unit: 'mmHg', answer: 120 + PER_M * 0.25, rel: 0.02, wrong: [[120 - PER_M * 0.25, 'El brazo está por debajo del corazón: allí la presión es mayor.', 0.02], [120, 'La altura del manguito sí importa: hay 25 cm de columna de sangre.']] }),
          caption: (S) => S.g.arm?.msg ?? (S.g.arm?.wrong ? '0,78 mmHg por cada cm de diferencia de altura.' : 'En la consulta, el paciente deja el brazo colgando a un lado: el manguito queda 25 cm por debajo del corazón. Su sistólica real (a la altura del corazón) es 120 mmHg.'),
          prompt: '¿Qué presión sistólica marcará el tensiómetro?',
          success: '120 + 0,78·25 ≈ 140 mmHg: ¡una falsa hipertensión! Por eso la presión se mide con el brazo apoyado a la altura del corazón.',
          draw({ ink, S }) { armScene(ink, 0.25, { Psys: 120, hide: !S.g.arm?.ok }); },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'ortostatica', title: 'Explica el mareo', short: 'El mareo', num: '4',
      beats: [
        (() => {
          const ch = orderChain({ key: 'ortho', steps: ORTHO });
          return {
            kind: 'do', cam: CAM.chain, ...ch,
            caption: (S) => (ch.wrongId(S) ? 'Ese paso existe, pero no viene ahora. ¿Qué es lo inmediato?' : 'Vuelve al paciente de 65 años. Construye la explicación eslabón por eslabón.'),
            prompt: 'Elige qué ocurre después.',
            success: 'Esa es la hipotensión ortostática. Normalmente los barorreceptores la corrigen en segundos (taquicardia y vasoconstricción); con la edad, la hipertensión y la rigidez arterial, la respuesta es más lenta.',
            draw({ ink, S }) { ch.draw(ink, S); },
          };
        })(),
        {
          kind: 'do', cam: CAM.body,
          ...(() => {
            const c = askChoice({
              key: 'crit', choices: [
                { id: 'yes', label: 'sí: la sistólica cae 40 y la diastólica 25 mmHg', correct: true },
                { id: 'no', label: 'no: 90/60 sigue siendo una presión normal', why: 'No importa solo el valor final, sino cuánto cae al ponerse de pie.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Criterio clínico: caída de la sistólica ≥ 20 mmHg o de la diastólica ≥ 10 mmHg en los 3 minutos de bipedestación.' };
          })(),
          prompt: 'De 130/85 a 90/60 mmHg: ¿cumple el criterio de hipotensión ortostática?',
          success: 'Sí, de sobra. Y ahora puedes explicar por qué con física: la columna de sangre ($ρ$ $g$ $h$) actuando sobre venas distensibles.',
          draw({ ink }) { bodyScene(ink, 0, 0.95, { showP: false }); },
        },
      ],
    },
    // ============================================================ 5
    {
      id: 'venas', title: 'Las venas y la bomba muscular', short: 'Las venas', num: '5',
      beats: [
        {
          kind: 'do', cam: CAM.legs,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => (S.walking ? 'Caminando: cada contracción exprime la vena y las válvulas impiden que la sangre baje.' : 'De pie e inmóvil: la vena del tobillo soporta toda la columna de sangre hasta el corazón.'),
          prompt: 'Compara la presión en la vena del tobillo de pie quieto y caminando.',
          controls: (S) => [
            { type: 'button', id: 'still', label: 'Quieto', primary: !S.walking },
            { type: 'button', id: 'walk', label: 'Caminando', primary: S.walking },
          ],
          act(S, id) { S.walking = id === 'walk'; if (S.walking) S.walkSeen = true; },
          success: 'Quieto: ≈ 90 mmHg en la vena del tobillo. Caminando: ≈ 25 mmHg. Las válvulas «cortan» la columna en tramos y la bomba muscular la vacía.',
          draw({ ink, S }) { legScene(ink, S.walking, S.tt ?? 0); },
          done: (S) => S.walkSeen,
          skip(S) { S.walkSeen = true; },
        },
        {
          kind: 'do', cam: CAM.legs,
          ...(() => {
            const c = askChoice({
              key: 'soldier', choices: [
                { id: 'pump', label: 'inmóvil no hay bomba muscular: la sangre se acumula en las piernas', correct: true },
                { id: 'heat', label: 'por el calor del uniforme', why: 'El calor puede ayudar (vasodilatación), pero el mecanismo central es hidrostático.' },
                { id: 'tired', label: 'por cansancio muscular', why: 'Al contrario: precisamente porque los músculos no se mueven.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'En los desfiles, algunos soldados que permanecen firmes e inmóviles durante mucho tiempo se desmayan.' };
          })(),
          prompt: '¿Por qué?',
          success: 'Sin bomba muscular, la sangre se acumula en las venas de las piernas, igual que en la cadena del capítulo 4. Por eso se les enseña a contraer las pantorrillas.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { legScene(ink, false, S.tt ?? 0); },
        },
        {
          kind: 'do', cam: CAM.legs,
          ...(() => {
            const c = askChoice({
              key: 'edema', choices: [
                { id: 'cap', label: 'la presión alta en los capilares de los pies empuja líquido hacia los tejidos', correct: true },
                { id: 'salt', label: 'los pies retienen más sal', why: 'La sal influye en el volumen total, pero no explica por qué el edema aparece abajo y empeora de pie.' },
                { id: 'grav', label: 'la gravedad atrae el líquido de los tejidos directamente', why: 'El líquido sale de los capilares porque la presión dentro de ellos es mayor: la gravedad actúa a través de $ρ$ $g$ $h$.' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Un paciente con insuficiencia venosa nota los tobillos hinchados al final del día, y mejor por la mañana.' };
          })(),
          prompt: '¿Por qué el edema maleolar empeora al permanecer de pie?',
          success: 'De pie, la presión en venas y capilares del tobillo es alta ($ρ$ $g$ $h$) y empuja líquido al intersticio. Acostado (Δ$h$ ≈ 0) se reabsorbe. Elevar las piernas ayuda por la misma razón.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { legScene(ink, false, S.tt ?? 0); },
        },
      ],
    },
    // ============================================================ 6
    practiceChapter({ num: '6', seed: 61404, kinds: ['level', 'arm', 'ortho', 'dh', 'lying'], make: makeProblem, draw: drawProblem, cam: () => CAM.body }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '7',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica 1.4 · Resumen',
          title: 'La sangre y la gravedad',
          ideas: [
            'La sangre es una columna de líquido: de pie, cada metro bajo el corazón suma ≈ 78 mmHg (<span class="m">Δ<i>P</i> = <i>ρg</i>Δ<i>h</i></span>); por encima, resta.',
            'Tobillo ≈ 200 mmHg, cerebro ≈ 69 mmHg. Acostado, la presión es casi uniforme.',
            'Medir con el brazo colgando (25 cm bajo el corazón) suma ≈ 20 mmHg: el manguito debe estar a la altura del corazón.',
            'Hipotensión ortostática: de pie → venas distendidas → menos retorno venoso → menos volumen sistólico → menos presión → mareo.',
            'Válvulas y bomba muscular protegen las venas de las piernas; sin ellas aparecen el desmayo y el edema maleolar.',
          ],
          next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#arterial">1.5 · Presión arterial ›</a>',
        }),
        draw() {},
      }],
    },
  ],
};
