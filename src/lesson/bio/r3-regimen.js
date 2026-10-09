// Biofísica 3.3 — Flujo laminar, turbulento y viscosidad  (Semanas 8–9)
// Guion: docs/biofisica-pared-flujo-resistencia-guion.md, lección 3.3.
//
// Pregunta: ¿por qué se oye un soplo? El estudiante explora qué variables
// desordenan el flujo (velocidad, diámetro, viscosidad) y deduce de qué
// depende el número de Reynolds antes de verlo escrito; lo calcula en la aorta y
// en una estenosis, y después mide cómo el hematocrito cambia la viscosidad.

import { clamp, snap } from '../core/anim.js';
import { UI_ES, n, table, formula, titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick } from './kit.js';
import { regimeScene, profileScene, etaBlood } from './scenes-flujo.js';

const RHO = 1060;
const CAM = { title: { xmin: -4.4, xmax: 4.4, ymin: -1.9, ymax: 2.4 }, tube: { xmin: -4.4, xmax: 4.4, ymin: -1.9, ymax: 2.4 }, prof: { xmin: -4.4, xmax: 6.4, ymin: -1.9, ymax: 2.4 } };

const re = (v, D, eta) => (RHO * v * D) / eta;

function makeProblem(rnd, kind) {
  switch (kind) {
    case 're': {
      const v = pick(rnd, [0.1, 0.2, 0.3, 0.5, 1.0]);
      const D = pick(rnd, [0.5, 1, 2, 2.5]);
      const R = re(v, D / 100, 0.004);
      return { kind, ask: `Sangre ($ρ$ = 1060, $η$ = 0,004 Pa·s) a ${n(v, 1)} m/s en un vaso de ${n(D)} cm de diámetro. ¿$Re$?`, given: [['$v$', `${n(v, 1)} m/s`], ['$D$', `${n(D)} cm`]], number: { label: '$Re$ =', unit: '', answer: R }, hint: '$Re$ = $ρ$ $v$ $D$/$η$ en SI ($D$ en m).', solution: [{ text: 'Reynolds:', math: `1060·${n(v, 1)}·${n(D / 100, 3)}/0,004 = ${n(R, 0)}` }], why: `$Re$ ≈ ${n(R, 0)}: ${R < 2000 ? 'laminar' : 'turbulento'}.`, Re: R };
    }
    case 'regime': {
      const R = pick(rnd, [300, 1200, 1800, 4500, 6000, 9000]);
      return { kind, ask: `En un vaso $Re$ ≈ ${n(R, 0)}. ¿Régimen esperado?`, given: [['$Re$', n(R, 0)]], choices: [{ id: 'l', label: 'laminar, silencioso', correct: R < 2000 }, { id: 't', label: 'turbulento: puede oírse un soplo', correct: R >= 2000 }], hint: 'Umbral ≈ 2000.', solution: [{ text: R < 2000 ? '< 2000: laminar' : '> 2000: turbulento', math: '' }], why: R < 2000 ? 'Laminar.' : 'Turbulento.', Re: R };
    }
    case 'factor': {
      const f = pick(rnd, [['la velocidad se triplica', 3], ['el diámetro se duplica', 2], ['la viscosidad se duplica', 0.5], ['la velocidad baja a la mitad', 0.5]]);
      return { kind, ask: `Si ${f[0]} (y lo demás no cambia), ¿por cuánto se multiplica $Re$?`, given: [['cambio', f[0]]], number: { label: '×', unit: '', answer: f[1] }, hint: '$Re$ es proporcional a $v$ y a $D$, e inversamente proporcional a $η$.', solution: [{ text: 'Proporcionalidad:', math: `× ${n(f[1], 1)}` }], why: `× ${n(f[1], 1)}.`, Re: 2000 * f[1] };
    }
    default: {
      const h = pick(rnd, [0.25, 0.35, 0.45, 0.55, 0.65]);
      return { kind: 'eta', ask: `Con hematocrito ${n(h * 100)} %, ¿viscosidad de la sangre según el modelo $η$ ≈ 1,2·e^{2,5·Hct} mPa·s?`, given: [['Hct', `${n(h, 2)}`]], number: { label: '$η$ ≈', unit: 'mPa·s', answer: etaBlood(h), rel: 0.03 }, hint: 'Sustituye Hct como fracción.', solution: [{ text: 'Modelo:', math: `1,2·e^{${n(2.5 * h, 3)}} = ${n(etaBlood(h), 1)} mPa·s` }], why: `≈ ${n(etaBlood(h), 1)} mPa·s.`, hct: h };
    }
  }
}

export const r3 = {
  id: 'bio-r3', code: '3.3', title: 'Régimen de flujo y viscosidad', lang: 'es', ui: UI_ES, pauseAll: true,
  cam: CAM.tube, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, v: 0.3, D: 2.5, eta: 4, seen: new Set(), hct: 0.45, hrows: [] }),
  chapters: [
    {
      id: 'intro', title: 'Régimen de flujo y viscosidad', short: 'Inicio', num: '',
      beats: [{ kind: 'card', cam: CAM.title, card: titleCard({ eyebrow: 'Biofísica · Flujo · Lección 3.3', title: 'Laminar, turbulento y viscoso', sub: 'La sangre normal fluye en silencio, pero una válvula estrecha produce un soplo que se oye con el estetoscopio. ¿Qué cambió?', meta: 'Unos 25 minutos · Semana 8 · Exploración · Reynolds · Hematocrito · Práctica' }), draw({ ink }, t) { regimeScene(ink, 800 + 2600 * (0.5 - 0.5 * Math.cos(t * 0.6)), t); } }],
    },
    {
      id: 'soplo', title: 'Dos maneras de fluir', short: 'Regímenes', num: '1',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.tube, caption: 'Flujo <b>laminar</b>: el fluido avanza en capas paralelas, en silencio y con poca pérdida de energía. Así fluye casi toda la sangre del cuerpo.', draw({ ink }, t) { regimeScene(ink, 800, t); } },
        { kind: 'watch', dur: 4, cam: CAM.tube, caption: 'Flujo <b>turbulento</b>: remolinos, mezcla y pérdida de energía. La pared vibra y se oye un <b>soplo</b>. Ocurre en estenosis, válvulas enfermas… y bajo el manguito del tensiómetro (ruidos de Korotkoff).', draw({ ink }, t) { regimeScene(ink, 6000, t); } },
      ],
    },
    {
      id: 'explorar', title: '¿Qué lo desordena?', short: 'Explorar', num: '2',
      beats: [
        {
          kind: 'do', cam: CAM.tube,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `$v$ = ${n(S.v, 2)} m/s · $D$ = ${n(S.D, 1)} cm · $η$ = ${n(S.eta, 1)} mPa·s`,
          prompt: 'Cambia una cosa cada vez y descubre qué cambios vuelven el flujo turbulento.',
          controls: (S) => [
            { type: 'button', id: 'v+', label: 'más velocidad' }, { type: 'button', id: 'v-', label: 'menos velocidad' },
            { type: 'button', id: 'D+', label: 'más diámetro' }, { type: 'button', id: 'D-', label: 'menos diámetro' },
            { type: 'button', id: 'e+', label: 'más viscosa' }, { type: 'button', id: 'e-', label: 'menos viscosa' },
          ],
          act(S, id) {
            const f = id.endsWith('+') ? 1.6 : 1 / 1.6;
            if (id[0] === 'v') S.v = clamp(S.v * f, 0.05, 2);
            if (id[0] === 'D') S.D = clamp(S.D * f, 0.5, 4);
            if (id[0] === 'e') S.eta = clamp(S.eta * f, 1, 12);
            S.seen.add(id);
          },
          success: 'Más velocidad o más diámetro desordenan el flujo; más viscosidad lo ordena. La densidad también cuenta.',
          draw({ ink, S }) { regimeScene(ink, re(S.v, S.D / 100, S.eta / 1000), S.tt ?? 0); },
          done: (S) => ['v+', 'D+', 'e+'].every((k) => S.seen.has(k)) || S.seen.size >= 4,
          skip(S) { ['v+', 'D+', 'e+'].forEach((k) => S.seen.add(k)); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...(() => { const c = askChoice({ key: 'form', choices: [
            { id: 'ok', label: '$ρ$ $v$ $D$ / $η$', correct: true },
            { id: 'a', label: '$η$ $v$ $D$ / $ρ$', why: 'Viste que más viscosidad ORDENA el flujo: $η$ debe ir abajo.' },
            { id: 'b', label: '$ρ$ $η$ / ($v$ $D$)', why: 'Más velocidad y más diámetro aumentan el desorden: deben ir arriba.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Combina lo que observaste en un solo número que crezca cuando el flujo tiende a desordenarse.' }; })(),
          prompt: '¿Cuál debe ser ese número?',
          success: 'Es el <b>número de Reynolds</b>: $Re$ = $ρ$ $v$ $D$ / $η$ (sin unidades). Por debajo de ≈ 2000, laminar; por encima, cada vez más turbulento.',
          draw({ ink }, t) { regimeScene(ink, 1500, t); formula(ink, 'fr', '$Re$ = $ρ$ $v$ $D$ / $η$', { fy: 0.08 }); },
        },
      ],
    },
    {
      id: 'calcular', title: 'Aorta y estenosis', short: 'Calcular', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.tube,
          ...askNumber({ key: 'ao', label: '$Re$ =', unit: '', answer: re(0.3, 0.025, 0.004), wrong: [[re(0.3, 2.5, 0.004), '2,5 cm = 0,025 m.', 0.03], [re(0.3, 0.025, 4), 'La viscosidad en SI: 4 mPa·s = 0,004 Pa·s.', 0.05]] }),
          caption: (S) => S.g.ao?.msg ?? (S.g.ao?.wrong ? 'Todo en SI.' : 'Aorta: $ρ$ = 1060 kg/m³, $v$ = 0,30 m/s, $D$ = 2,5 cm, $η$ = 0,004 Pa·s.'),
          prompt: 'Calcula $Re$ en la aorta.',
          success: '$Re$ ≈ 1990: en el límite. En el pico de la sístole ($v$ > 1 m/s) el flujo aórtico se perturba un instante; en el resto del cuerpo, con vasos más finos y sangre más lenta, es laminar.',
          draw({ ink }, t) { regimeScene(ink, 1990, t); },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...askNumber({ key: 'st', label: '$Re$ ≈', unit: '', answer: 1990 * 3, rel: 0.05, wrong: [[1990 * 9, 'Re es proporcional a $v$, no a $v$².', 0.05]] }),
          caption: (S) => S.g.st?.msg ?? (S.g.st?.wrong ? '$Re$ ∝ $v$.' : 'Una estenosis valvular triplica la velocidad de la sangre (el diámetro del chorro casi no cambia).'),
          prompt: '¿Cuánto vale ahora $Re$ aproximadamente?',
          success: '≈ 6000: claramente turbulento. Por eso una estenosis se <b>ausculta</b> como un soplo.',
          draw({ ink }, t) { regimeScene(ink, 6000, t); },
        },
      ],
    },
    {
      id: 'viscosidad', title: 'Viscosidad de la sangre', short: 'Viscosidad', num: '4',
      beats: [
        { kind: 'watch', dur: 4, cam: CAM.prof, caption: 'La <b>viscosidad</b> $η$ es el rozamiento interno entre capas. La capa pegada a la pared no se mueve y la central va más rápido: perfil parabólico. Agua ≈ 0,7 mPa·s (37 °C), plasma ≈ 1,2, sangre ≈ 3–4.', draw({ ink }, t) { profileScene(ink, 0.45, t); } },
        {
          kind: 'do', cam: CAM.prof,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `Hematocrito ${n(S.hct * 100, 0)} % → $η$ ≈ ${n(etaBlood(S.hct), 1)} mPa·s`,
          prompt: 'Mide la viscosidad con tres hematocritos: anemia, normal y policitemia.',
          controls: () => [{ type: 'button', id: '0.25', label: 'Anemia · 25 %' }, { type: 'button', id: '0.45', label: 'Normal · 45 %' }, { type: 'button', id: '0.65', label: 'Policitemia · 65 %' }],
          act(S, id) { S.hct = Number(id); if (!S.hrows.some((r) => r === S.hct)) { S.hrows.push(S.hct); S.hrows.sort(); } },
          success: 'Pasar de 45 % a 65 % de hematocrito casi duplica la viscosidad. La viscosidad también sube con las proteínas plasmáticas y al bajar la temperatura.',
          draw({ ink, S }) { profileScene(ink, S.hct, S.tt ?? 0); table(ink, 'tb', [{ h: 'Hct', w: 60 }, { h: 'η (mPa·s)', w: 90 }], S.hrows.map((h) => [`${n(h * 100)} %`, n(etaBlood(h), 1)]), { y: 18, empty: '—' }); },
          done: (S) => S.hrows.length >= 3, skip(S) { S.hrows = [0.25, 0.45, 0.65]; },
        },
        {
          kind: 'do', cam: CAM.prof,
          ...(() => { const c = askChoice({ key: 'dh', choices: [
            { id: 'ok', label: 'pierde agua del plasma: el hematocrito sube y la sangre se vuelve más viscosa', correct: true },
            { id: 'heat', label: 'la fiebre la hace más viscosa', why: 'Al subir la temperatura la viscosidad baja.' },
            { id: 'an', label: 'se vuelve anémico', why: 'No pierde glóbulos rojos; pierde agua.' },
          ] }); return { ...c, caption: (S) => c.feedback(S) ?? 'Caso 2: paciente hipertenso (150/100) con hematocrito elevado por deshidratación.' }; })(),
          prompt: '¿Qué cambia en su sangre?',
          success: 'Más viscosidad → más resistencia (lección 4.1) → el corazón debe empujar más. En la policitemia vera: cefalea, rubicundez, riesgo trombótico.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { profileScene(ink, 0.58, S.tt ?? 0); },
        },
      ],
    },
    practiceChapter({ num: '5', seed: 73303, kinds: ['re', 'factor', 'regime', 'eta'], make: makeProblem, draw: (ink, p, s, t) => (p.kind === 'eta' ? profileScene(ink, p.hct, t) : regimeScene(ink, s || p.kind !== 're' ? p.Re : 1000, t)), cam: (S) => (S.practice?.prob?.kind === 'eta' ? CAM.prof : CAM.tube) }),
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '6',
      beats: [{ kind: 'card', cam: CAM.title, card: summaryCard({ eyebrow: 'Biofísica 3.3 · Resumen', title: 'Laminar, turbulento y viscoso', ideas: [
        'Laminar: capas ordenadas, silencioso. Turbulento: remolinos, pérdida de energía, soplos.',
        'Lo descubriste: más velocidad y más diámetro desordenan; más viscosidad ordena → <span class="m"><i>Re</i> = <i>ρvD</i>/<i>η</i></span>, umbral ≈ 2000.',
        'Aorta: <span class="m"><i>Re</i></span> ≈ 2000; estenosis (v × 3): ≈ 6000 → soplo.',
        'Viscosidad de la sangre ≈ 3–4 mPa·s: sube con el hematocrito y las proteínas, baja con la temperatura.',
      ], next: '<span class="eyebrow">Siguiente bloque</span> <a class="cm-next" href="#poiseuille">4.1 · Ley de Poiseuille ›</a>' }), draw() {} }],
    },
  ],
};
