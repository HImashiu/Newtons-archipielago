// Biofísica 4.2 — Redes y regulación  (Semana 10, bloque «Resistencia»)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 4.2.
//
// Pregunta: tras una hemorragia, ¿cómo mantiene el cuerpo la presión y el
// flujo al cerebro? El estudiante arma redes en serie y en paralelo, anota la
// resistencia total, deduce las reglas, calcula la RPT en URP y regula un
// modelo de choque hemorrágico órgano por órgano.

import { UI_ES, n, table, formula, titleCard, summaryCard, practiceChapter, askNumber, askChoice, orderChain, createWorkPanel, pick } from './kit.js';
import { circulation, organScene, networkScene } from './scenes-resistencia.js';

const CAM = {
  title: { xmin: -0.6, xmax: 9.6, ymin: -1.2, ymax: 3.2 },
  net: { xmin: -0.6, xmax: 9.6, ymin: -1.4, ymax: 3.0 },
  org: { xmin: -0.6, xmax: 9.8, ymin: -1.0, ymax: 3.5 },
  chain: { xmin: -3, xmax: 3, ymin: -2, ymax: 2 },
};

const R1 = 6; // resistencia de cada vaso del experimento (URP)
const rTot = (mode, N) => (mode === 'serie' ? R1 * N : R1 / N);

const SHOCK = [
  'Hemorragia: se pierde volumen y cae el gasto cardiaco',
  'Cae la presión arterial (PAM = GC × RPT)',
  'Los barorreceptores lo detectan y activan el simpático',
  'Las arteriolas de piel, intestino, riñón y músculo se contraen',
  'Su radio baja, su resistencia sube (× 1/r⁴) y la RPT aumenta',
  'La PAM se recupera y el flujo se desvía a cerebro y corazón',
];

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'serie': {
      const a = pick(rnd, [2, 3, 4, 5]), b = pick(rnd, [1, 2, 6]), c = pick(rnd, [3, 4, 8]);
      return { kind, ask: `Tres segmentos en serie (arteria, arteriola, capilar) tienen ${a}, ${b} y ${c} URP. ¿Resistencia total?`, given: [['$R$', `${a}, ${b}, ${c} URP`]], number: { label: '$R_T$ =', unit: 'URP', answer: a + b + c }, hint: 'En serie se suman.', solution: [{ text: 'Serie:', math: `${a} + ${b} + ${c} = ${a + b + c} URP` }], why: `${a + b + c} URP: siempre mayor que la mayor.`, mode: 'serie', N: 3 };
    }
    case 'paralelo': {
      const N = pick(rnd, [2, 3, 4]), R = pick(rnd, [6, 12, 24]);
      return { kind, ask: `${N} órganos idénticos de ${R} URP cada uno están en paralelo. ¿Resistencia total?`, given: [['$N$', `${N}`], ['$R$', `${R} URP`]], number: { label: '$R_T$ =', unit: 'URP', answer: R / N }, hint: '1/$R_T$ = Σ 1/$R_i$.', solution: [{ text: 'Paralelo idéntico:', math: `${R}/${N} = ${n(R / N, 2)} URP` }], why: `${n(R / N, 2)} URP: menor que cualquiera.`, mode: 'paralelo', N };
    }
    case 'urp': {
      const P = pick(rnd, [85, 90, 95, 100]), L = pick(rnd, [4, 5, 6]);
      const Q = (L * 1000) / 60;
      return { kind, ask: `PAM = ${P} mmHg y gasto cardiaco ${L} L/min. ¿RPT en URP (mmHg·s/mL)?`, given: [['PAM', `${P} mmHg`], ['GC', `${L} L/min`]], number: { label: 'RPT =', unit: 'URP', answer: P / Q, d: 2 }, hint: 'Pasa el GC a mL/s: × 1000/60.', solution: [{ text: 'GC:', math: `${L} L/min = ${n(Q, 1)} mL/s` }, { text: 'RPT:', math: `${P}/${n(Q, 1)} = ${n(P / Q, 2)} URP` }], why: `${n(P / Q, 2)} URP.`, mode: 'paralelo', N: 3 };
    }
    default: {
      const f = pick(rnd, [1.2, 1.4, 1.5]);
      return { kind: 'eta', ask: `Con hematocrito alto la viscosidad sube × ${n(f)}. Para mantener el mismo gasto, la PAM (normal 90 mmHg) debe ser…`, given: [['$η$', `× ${n(f)}`]], number: { label: 'PAM =', unit: 'mmHg', answer: 90 * f }, hint: '$R$ ∝ $η$ y Δ$P$ = $Q$ $R$.', solution: [{ text: 'Proporcional:', math: `90 × ${n(f)} = ${n(90 * f)} mmHg` }], why: `${n(90 * f)} mmHg: más trabajo para el corazón.`, mode: 'serie', N: 2 };
    }
  }
}

export const s2 = {
  id: 'bio-s2', code: '4.2', title: 'Redes y regulación', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.net, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, mode: 'serie', N: 1, rows: [], CO: 83, k: 1, seen: new Set() }),
  chapters: [
    {
      id: 'intro', title: 'Redes y regulación', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · Resistencia · Lección 4.2', title: 'Redes y regulación', sub: 'Un paciente pierde 1,5 L de sangre. Su cerebro sigue recibiendo casi el mismo flujo. ¿Cómo lo logra el cuerpo? La respuesta está en cómo se conectan los vasos.', meta: 'Unos 30 minutos · Semana 10 · Experimento · Choque hemorrágico · Práctica' }), draw({ ink }) { networkScene(ink, 'paralelo', 3); } }],
    },
    {
      id: 'pregunta', title: 'Una predicción', short: 'Pregunta', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.net, caption: 'El sistema circulatorio no es un solo tubo. La sangre pasa <b>en serie</b> por arterias → arteriolas → capilares → venas, y se reparte <b>en paralelo</b> entre los órganos: cerebro, corazón, riñones, intestino, músculo, piel.', draw({ ink }) { networkScene(ink, 'serie', 3); } },
        {
          kind: 'do', cam: CAM.net,
          controls: (S) => [['sube', 'aumenta'], ['igual', 'no cambia'], ['baja', 'disminuye']].map(([id, label]) => ({ type: 'choice', id, label, state: S.g.pred === id ? 'right' : null, disabled: !!S.g.pred })),
          act(S, id) { S.g.pred ??= id; },
          caption: 'Predicción: aún no hay respuesta correcta.',
          prompt: 'Si a una red de vasos en paralelo le agregas un vaso más, la resistencia total…',
          success: 'Guardado. Vamos a construir redes y medir.',
          draw({ ink }) { networkScene(ink, 'paralelo', 2); },
          done: (S) => !!S.g.pred, skip(S) { S.g.pred ??= 'sube'; },
        },
      ],
    },
    {
      id: 'redes', title: 'Medir: serie y paralelo', short: 'Serie/paralelo', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.net,
          caption: (S) => `Cada vaso: $R$ = ${R1} URP · ${S.N} en ${S.mode} → con Δ$P$ = 12 mmHg el caudal es ${n(12 / rTot(S.mode, S.N), 2)} mL/s → $R_T$ = ${n(rTot(S.mode, S.N), 2)} URP`,
          prompt: 'Arma redes de 1 a 4 vasos en serie y en paralelo. Anota al menos 3 de cada tipo.',
          controls: (S) => [
            { type: 'button', id: 'mode', label: S.mode === 'serie' ? 'Pasar a paralelo' : 'Pasar a serie' },
            { type: 'button', id: 'less', label: '− vaso', disabled: S.N <= 1 },
            { type: 'button', id: 'more', label: '+ vaso', disabled: S.N >= 4 },
            { type: 'button', id: 'rec', label: 'Anotar', primary: true },
          ],
          act(S, id) {
            if (id === 'mode') S.mode = S.mode === 'serie' ? 'paralelo' : 'serie';
            else if (id === 'less') S.N--;
            else if (id === 'more') S.N++;
            else if (!S.rows.some((r) => r.mode === S.mode && r.N === S.N)) S.rows.push({ mode: S.mode, N: S.N });
          },
          success: 'Compara las dos columnas de tu tabla: una crece con cada vaso y la otra se achica.',
          draw({ ink, S }) {
            networkScene(ink, S.mode, S.N);
            table(ink, 'tb', [{ h: 'red', w: 80 }, { h: 'N', w: 36 }, { h: 'R total (URP)', w: 90 }], S.rows.map((r) => [r.mode, String(r.N), n(rTot(r.mode, r.N), 2)]), { y: 18, empty: '—' });
          },
          done: (S) => S.rows.filter((r) => r.mode === 'serie').length >= 3 && S.rows.filter((r) => r.mode === 'paralelo').length >= 3,
          skip(S) { S.rows = [1, 2, 3].flatMap((N) => [{ mode: 'serie', N }, { mode: 'paralelo', N }]); },
        },
        {
          kind: 'do', cam: CAM.net,
          ...(() => { const c = askChoice({ key: 'rule', choices: [
            { id: 'ok', label: 'Serie: $R_T$ = Σ $R_i$ · Paralelo: 1/$R_T$ = Σ 1/$R_i$', correct: true },
            { id: 'a', label: 'Serie: 1/$R_T$ = Σ 1/$R_i$ · Paralelo: $R_T$ = Σ $R_i$', why: 'Al revés: en serie tu $R_T$ creció (6, 12, 18).' },
            { id: 'b', label: 'En ambos casos $R_T$ = Σ $R_i$', why: 'En paralelo mediste 6, 3, 2: bajó.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'En serie: 6, 12, 18… En paralelo: 6, 3, 2… (6/2, 6/3).' }; })(),
          prompt: '¿Qué reglas siguen tus datos?',
          success: (S) => `En serie la sangre atraviesa todas las resistencias: se suman. En paralelo cada vaso nuevo es un camino más: la resistencia total <b>baja</b> y siempre es menor que la más pequeña. Tu predicción: «${{ sube: 'aumenta', igual: 'no cambia', baja: 'disminuye' }[S.g.pred] ?? '—'}».`,
          draw({ ink }) { networkScene(ink, 'paralelo', 3); formula(ink, 'fr', 'serie: $R_T$ = $R_1$ + $R_2$ + …      paralelo: 1/$R_T$ = 1/$R_1$ + 1/$R_2$ + …', { fy: 0.08, size: 20 }); },
        },
        { kind: 'watch', dur: 4, cam: CAM.net, caption: 'Por eso los capilares, aunque cada uno es finísimo, no son la mayor resistencia: hay miles de millones en paralelo. La mayor caída de presión ocurre en las <b>arteriolas</b>, que además pueden cambiar su radio.', draw({ ink }) { networkScene(ink, 'paralelo', 6); } },
      ],
    },
    {
      id: 'rpt', title: 'Resistencia periférica total', short: 'RPT', num: '3',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.org, caption: 'Todo el circuito sistémico se resume en una ley: PAM − $P_{AD}$ ≈ PAM = GC × RPT. La RPT se mide en <b>URP</b> (unidades de resistencia periférica) = mmHg·s/mL.', draw({ ink }) { organScene(ink, 83, 1); formula(ink, 'fu', 'PAM = GC × RPT', { fy: 0.92 }); } },
        {
          kind: 'do', cam: CAM.org, panel: 'work',
          ...askNumber({ key: 'urp', label: 'RPT =', unit: 'URP', answer: 90 / 83.33, rel: 0.03, wrong: [[18, 'Dividiste por 5 L/min sin pasarlo a mL/s.'], [0.018, 'Pasa a mL/s: 5000/60.']] }),
          caption: (S) => S.g.urp?.msg ?? (S.g.urp?.wrong ? 'GC = 5000 mL / 60 s = 83,3 mL/s.' : 'Adulto sano: PAM = 90 mmHg, gasto cardiaco 5 L/min.'),
          prompt: '¿Cuál es su resistencia periférica total?',
          success: '≈ 1,1 URP, el valor normal en reposo (≈ 1 URP).',
          work: (S) => [{ h: 'Semi-resuelto' }, { step: 1, text: 'GC en mL/s:', math: '5000/60 = 83,3 mL/s', state: 'done' }, { step: 2, text: 'Tu turno: RPT = PAM/GC.', state: S.g.urp?.ok ? 'done' : 'now' }],
          draw({ ink }) { organScene(ink, 83, 1); },
        },
      ],
    },
    {
      id: 'choque', title: 'Choque hemorrágico', short: 'Choque', num: '4',
      beats: [
        {
          kind: 'do', cam: CAM.org,
          caption: (S) => { const c = circulation(S.CO, S.k); return `GC = ${n(S.CO)} mL/s · constricción × ${n(S.k)} → PAM = ${n(c.P, 0)} mmHg · cerebro ${n(c.Q[0], 1)} mL/s`; },
          prompt: 'Primero provoca la hemorragia. Luego activa la respuesta simpática. Observa el cerebro.',
          controls: (S) => [
            { type: 'button', id: 'bleed', label: S.CO < 83 ? 'Reponer volumen' : 'Hemorragia (GC 83 → 50 mL/s)' },
            { type: 'button', id: 'symp', label: S.k > 1 ? 'Apagar simpático' : 'Vasoconstricción simpática', primary: S.CO < 83 && S.k === 1 },
          ],
          act(S, id) { if (id === 'bleed') S.CO = S.CO < 83 ? 83 : 50; else S.k = S.k > 1 ? 1 : 1.8; S.seen.add(`${S.CO}-${S.k}`); },
          success: 'Solo con hemorragia: PAM ≈ 52 mmHg y todo cae. Con vasoconstricción de los órganos no vitales: PAM ≈ 80 mmHg y el cerebro casi recupera su flujo, a costa de piel, intestino, riñón y músculo (palidez, frialdad, oliguria).',
          draw({ ink, S }) { organScene(ink, S.CO, S.k); },
          done: (S) => S.seen.has('50-1') && S.seen.has('50-1.8'), skip(S) { S.CO = 50; S.k = 1.8; S.seen.add('50-1'); S.seen.add('50-1.8'); },
        },
        (() => { const ch = orderChain({ key: 'shock', steps: SHOCK }); return { kind: 'do', cam: CAM.chain, ...ch, caption: (S) => (ch.wrongId(S) ? 'Ese paso viene más adelante.' : 'Ordena lo que acabas de ver, eslabón por eslabón.'), prompt: 'Elige qué ocurre después.', success: 'Los vasos en paralelo permiten redistribuir: al cerrar unos caminos, la presión sube y la sangre va por los que quedan abiertos.', draw({ ink, S }) { ch.draw(ink, S); } }; })(),
        {
          kind: 'do', cam: CAM.org, panel: 'work',
          ...askNumber({ key: 'poly', label: 'PAM =', unit: 'mmHg', answer: 126, wrong: [[64.3, 'Más viscosidad → más resistencia → se necesita más presión, no menos.']] }),
          caption: (S) => S.g.poly?.msg ?? (S.g.poly?.wrong ? 'Δ$P$ = $Q$ $R$ y $R$ ∝ $η$.' : 'Independiente: en una policitemia (hematocrito 65 %) la viscosidad sube × 1,4. Normalmente PAM = 90 mmHg.'),
          prompt: '¿Qué PAM haría falta para mantener el mismo gasto?',
          success: '126 mmHg. Con la RPT alta el corazón trabaja más; por eso la policitemia se asocia a hipertensión, trombosis y sobrecarga cardiaca (y se trata con flebotomía).',
          work: (S) => [{ h: 'Independiente' }, { given: [['$η$', '× 1,4'], ['PAM', '90 mmHg'], ['GC', 'igual']] }, ...(S.g.poly?.ok ? [{ result: '126 mmHg', ok: true }] : [])],
          draw({ ink }) { organScene(ink, 83, 1); },
        },
      ],
    },
    practiceChapter({ num: '5', seed: 74202, kinds: ['serie', 'paralelo', 'urp', 'eta'], make: makeProblem, draw: (ink, p) => { networkScene(ink, p.mode, p.N); }, cam: () => CAM.net }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 4.2 · Resumen', title: 'Redes y regulación', ideas: [
        'Serie: <span class="m"><i>R<sub>T</sub></i> = Σ<i>R<sub>i</sub></i></span>. Paralelo: <span class="m">1/<i>R<sub>T</sub></i> = Σ1/<i>R<sub>i</sub></i></span>, siempre menor que la menor.',
        'PAM = GC × RPT; la RPT normal ≈ 1 URP (mmHg·s/mL). Las arteriolas son la mayor resistencia y la regulan.',
        'Choque hemorrágico: la vasoconstricción simpática de órganos no vitales sube la RPT y protege cerebro y corazón.',
        'Policitemia: más viscosidad → más RPT → más presión y trabajo cardiaco.',
      ], next: '<span class="eyebrow">Siguiente</span> <a class="cm-next" href="#respiracion">4.3 · Respiración ›</a>' }), draw() {} }],
    },
  ],
};
