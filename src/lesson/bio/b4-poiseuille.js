// Biofísica B.4 — Resistencia hidráulica y ley de Poiseuille (Semana 10),
// con el puente a la mecánica respiratoria (Semana 11).
// Guion: docs/biofisica-unidad-2-guion.md, sección B.4.

import { ramp, clamp, lerp, easeInOut, snap } from '../core/anim.js';
import {
  UI_ES, MMHG, n, sci, rect, shape, vessel, cells, axes, curve, readout, formula, section,
  titleCard, summaryCard, practiceChapter, askNumber, askChoice, createWorkPanel, pick,
} from './kit.js';

const CAM = {
  title: { xmin: -4.2, xmax: 4.2, ymin: -2.0, ymax: 2.6 },
  tube: { xmin: -4.4, xmax: 4.4, ymin: -1.9, ymax: 2.4 },
  tubeP: { xmin: -4.2, xmax: 4.2, ymin: -2.0, ymax: 2.4 },
  pois: { xmin: -4.4, xmax: 9.6, ymin: -1.9, ymax: 3.2 },
  organs: { xmin: -0.6, xmax: 9.6, ymin: -1.1, ymax: 3.8 },
  net: { xmin: -0.6, xmax: 9.6, ymin: -1.6, ymax: 3.0 },
  airway: { xmin: -3.6, xmax: 3.6, ymin: -2.0, ymax: 2.2 },
  lung: { xmin: -3.2, xmax: 5.2, ymin: -1.0, ymax: 3.9 },
};

// ------------------------------------------------------- Poiseuille tube

/** Straight tube of radius r (world) with a parabolic profile and moving cells. */
function poisTube(ink, r, t, o = {}) {
  const x0 = o.x0 ?? -3.8, x1 = o.x1 ?? 3.2;
  vessel(ink, 'pt', x0, x1, () => r, { streamlines: false, wall: 0.09 });
  const vmax = (o.vmax ?? 1) * (r / 0.8) ** 2; // mean speed ∝ r² at fixed ΔP (Q ∝ r⁴, A ∝ r²)
  cells(ink, 'pt-c', x0, x1, () => r, () => Math.max(0.03, vmax), t, { per: 5, speed: 0.7, lanes: [-0.6, -0.2, 0.2, 0.6], profile: (s) => 2 * (1 - s * s) + 0.04 });
  if (o.profile !== false) {
    const xs = x1 - 0.9;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const s = -1 + (2 * i) / 24;
      pts.push({ x: xs + 0.7 * vmax * (1 - s * s), y: s * r });
    }
    ink.line('pt-ax', { x: xs, y: -r }, { x: xs, y: r }, 'thin', { layer: 'annotations' });
    ink.poly('pt-prof', pts, 'blue', { layer: 'vectors' });
  }
  if (o.labels !== false) {
    ink.arrow('pt-P1', { x: x0 - 0.75, y: 0 }, { x: x0 - 0.1, y: 0 }, 'accent heavy', { head: 11, headW: 3.8 });
    ink.text('pt-P1l', { x: x0 - 0.75, y: 0 }, '$P_1$', { dy: -12, size: 17, cls: 'accent-tx' });
    ink.text('pt-P2l', { x: x1 + 0.4, y: 0 }, '$P_2$', { dy: 6, size: 17 });
    ink.dimension('pt-L', { x: x0, y: -r - 0.09 }, { x: x1, y: -r - 0.09 }, 26, '$L$', { size: 16 });
    ink.dimension('pt-r', { x: x0 + 0.6, y: 0 }, { x: x0 + 0.6, y: r }, -16, '$r$', { size: 16 });
  }
}

function qrGraph(ink, rr, o = {}) {
  const P = axes(ink, 'qr', { x: 5.2, y: 0, w: 3.6, h: 2.6 }, { xmax: 1, ymax: 1, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.25, 0.5, 0.75, 1], xlabel: '$r/r_0$', ylabel: '$Q/Q_0$', grid: true });
  curve(ink, 'qr-c', P, (x) => x ** 4, 0, 1, 'wave', { op: o.curveOp ?? 1 });
  curve(ink, 'qr-l', P, (x) => x, 0, 1, 'ghost', { op: o.linOp ?? 0 });
  if (o.linOp) ink.text('qr-ll', P(0.62, 0.62), 'si fuera proporcional', { dx: -6, dy: -6, size: 12, anchor: 'end', cls: 'mid', op: o.linOp });
  if (rr !== null && rr !== undefined) {
    ink.line('qr-v', P(rr, 0), P(rr, rr ** 4), 'drop', { layer: 'annotations' });
    ink.line('qr-h', P(0, rr ** 4), P(rr, rr ** 4), 'drop', { layer: 'annotations' });
    ink.circle('qr-p', P(rr, rr ** 4), 5, 'dot-accent', { layer: 'vectors' });
  }
}

// ---------------------------------------------- organs in parallel (shock)

const ORGANS = [
  { name: 'Cerebro', R: 6.5, vital: true },
  { name: 'Corazón', R: 22, vital: true },
  { name: 'Riñones', R: 4.6, vital: false },
  { name: 'Intestino', R: 3.8, vital: false },
  { name: 'Piel', R: 10, vital: false },
  { name: 'Músculo', R: 5.5, vital: false },
];

/** Arterial pressure and organ flows for a cardiac output (mL/s) and constriction factor. */
export function circulation(CO, k) {
  const R = ORGANS.map((o) => o.R * (o.vital ? 1 : k));
  const G = R.reduce((a, r) => a + 1 / r, 0);
  const Rt = 1 / G;
  const P = CO * Rt;
  return { P, Rt, Q: R.map((r) => P / r) };
}

function organScene(ink, CO, k, o = {}) {
  const c = circulation(CO, k);
  const base = circulation(83, 1);
  const P = axes(ink, 'or', { x: 0.6, y: 0, w: 8.4, h: 2.8 }, { xmax: 6, ymax: 30, yticks: [0, 10, 20, 30], ylabel: '$Q$ (mL/s)' });
  ORGANS.forEach((org, i) => {
    const q = c.Q[i];
    const x0 = P(i + 0.2, 0).x, x1 = P(i + 0.8, 0).x;
    rect(ink, `or-b${i}`, x0, 0, x1, P(0, Math.min(q, 29.5)).y, org.vital ? 'blood-2' : 'part');
    ink.line(`or-ref${i}`, { x: x0 - 0.05, y: P(0, base.Q[i]).y }, { x: x1 + 0.05, y: P(0, base.Q[i]).y }, 'dashed', { layer: 'annotations' });
    ink.text(`or-n${i}`, P(i + 0.5, 0), org.name, { dy: 20, size: 14, cls: org.vital ? 'accent-tx' : 'mid' });
    ink.text(`or-q${i}`, P(i + 0.5, Math.min(q, 29.5)), n(q, 1), { dy: -8, size: 13, cls: 'halo' });
  });
  ink.text('or-ref', P(6, base.Q[5]), '- - normal', { dx: 4, dy: 4, size: 12, anchor: 'start', cls: 'mid' });
  return c;
}

// --------------------------------------------- series / parallel network

function networkScene(ink, mode, N, o = {}) {
  // Inlet on the left, outlet on the right; resistors drawn as narrow vessels.
  const y = 1;
  ink.line('nw-in', { x: 0, y }, { x: 1.2, y }, 'ink heavy', { layer: 'statics' });
  ink.line('nw-out', { x: 7.8, y }, { x: 9, y }, 'ink heavy', { layer: 'statics' });
  ink.text('nw-P1', { x: 0, y }, '$P_1$', { dy: -10, size: 16, anchor: 'start' });
  ink.text('nw-P2', { x: 9, y }, '$P_2$', { dy: -10, size: 16, anchor: 'end' });
  const res = (key, xa, xb, yy, label) => {
    ink.line(`${key}-a`, { x: xa, y: yy }, { x: xa + 0.35, y: yy }, 'ink heavy', { layer: 'statics' });
    ink.line(`${key}-b`, { x: xb - 0.35, y: yy }, { x: xb, y: yy }, 'ink heavy', { layer: 'statics' });
    rect(ink, `${key}-r`, xa + 0.35, yy - 0.13, xb - 0.35, yy + 0.13, 'part', { layer: 'statics' });
    if (label) ink.text(`${key}-l`, { x: (xa + xb) / 2, y: yy + 0.13 }, label, { dy: -8, size: 15 });
  };
  if (mode === 'serie') {
    const w = 6.6 / N;
    for (let i = 0; i < N; i++) res(`nw-s${i}`, 1.2 + i * w, 1.2 + (i + 1) * w, y, `$R_${i + 1}$`);
  } else {
    const ys = Array.from({ length: N }, (_, i) => y + (N === 1 ? 0 : 1.6 * (i / (N - 1) - 0.5)));
    ink.line('nw-bl', { x: 1.2, y: ys[0] }, { x: 1.2, y: ys[ys.length - 1] }, 'ink heavy', { layer: 'statics' });
    ink.line('nw-br', { x: 7.8, y: ys[0] }, { x: 7.8, y: ys[ys.length - 1] }, 'ink heavy', { layer: 'statics' });
    ys.forEach((yy, i) => res(`nw-p${i}`, 1.2, 7.8, yy, N <= 4 ? `$R_${i + 1}$` : null));
  }
}

// ------------------------------------------------------- airways, Boyle

function bronchiole(ink, key, c, r, o = {}) {
  section(ink, key, c, r, o.wall ?? 0.22, {});
  if (o.mucus) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = -0.9 + (1.6 * i) / 24;
      pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
    }
    for (let i = 24; i >= 0; i--) {
      const a = -0.9 + (1.6 * i) / 24;
      pts.push({ x: c.x + (r * 0.72 + 0.05 * Math.sin(i)) * Math.cos(a), y: c.y + (r * 0.72 + 0.05 * Math.sin(i)) * Math.sin(a) });
    }
    shape(ink, `${key}-m`, pts, 'plaque', { layer: 'vectors' });
  }
  ink.text(`${key}-l`, { x: c.x, y: c.y - r - (o.wall ?? 0.22) }, o.label ?? '', { dy: 24, size: 15 });
}

function boyleScene(ink, V, o = {}) {
  // A piston–cylinder model of the thorax: diaphragm = piston.
  const x0 = -1.2, x1 = 1.2;
  const top = 2.6;
  const bottom = top - V * 0.9;
  rect(ink, 'by-gas', x0, bottom, x1, top, 'fluid', { layer: 'trails' });
  ink.poly('by-wall', [{ x: x0, y: 0 }, { x: x0, y: top }, { x: -0.18, y: top }], 'ink heavy', { layer: 'statics' });
  ink.poly('by-wall2', [{ x: 0.18, y: top }, { x: x1, y: top }, { x: x1, y: 0 }], 'ink heavy', { layer: 'statics' });
  ink.line('by-tr1', { x: -0.18, y: top }, { x: -0.18, y: top + 0.6 }, 'ink heavy', { layer: 'statics' });
  ink.line('by-tr2', { x: 0.18, y: top }, { x: 0.18, y: top + 0.6 }, 'ink heavy', { layer: 'statics' });
  ink.text('by-tr', { x: 0.18, y: top + 0.5 }, 'tráquea', { dx: 8, dy: 4, size: 13, anchor: 'start', cls: 'mid' });
  rect(ink, 'by-pist', x0 + 0.03, bottom - 0.2, x1 - 0.03, bottom, 'piston');
  ink.text('by-d', { x: 0, y: bottom - 0.2 }, 'diafragma', { dy: 20, size: 14, cls: 'mid' });
  ink.text('by-t', { x: x1, y: top - 0.3 }, 'tórax (modelo)', { dx: 12, size: 14, anchor: 'start', cls: 'mid' });
  ink.text('by-v', { x: x1, y: top - 0.65 }, `$V$ = ${n(V, 2)} L`, { dx: 12, size: 15, anchor: 'start' });
  if (o.air) {
    const dir = o.air;
    ink.arrow('by-air', dir > 0 ? { x: 0, y: top + 0.95 } : { x: 0, y: top + 0.15 }, dir > 0 ? { x: 0, y: top + 0.15 } : { x: 0, y: top + 0.95 }, 'blue heavy', { head: 11, headW: 3.8 });
    ink.text('by-airl', { x: 0, y: top + 0.95 }, dir > 0 ? 'entra aire' : 'sale aire', { dx: -10, dy: 4, size: 14, anchor: 'end', cls: 'blue-tx' });
  }
}

// ---------------------------------------------------------- practice

function makeProblem(rnd, kind) {
  switch (kind) {
    case 'ratio': {
      const f = pick(rnd, [2, 3, 1.5]);
      const ans = f ** 4;
      return {
        kind, ask: `Si el radio de un vaso se reduce a 1/${n(f)} de su valor, a igual presión, ¿cuántas veces disminuye el flujo?`,
        given: [['$r_2$', `$r_1$/${n(f)}`]], number: { label: '÷', unit: 'veces', answer: ans }, rr: 1 / f,
        hint: 'Poiseuille: $Q$ ∝ $r$⁴. Eleva el factor a la cuarta potencia.',
        solution: [{ text: 'Poiseuille:', math: '$Q_1/Q_2$ = ($r_1/r_2$)⁴' }, { text: 'Sustituyendo:', math: `${n(f)}⁴ = ${n(ans, 2)}` }],
        why: `El flujo cae ${n(ans, 2)} veces.`,
      };
    }
    case 'pct': {
      const red = pick(rnd, [10, 20, 30, 40, 50, 70]);
      const rr = 1 - red / 100;
      const ans = rr ** 4 * 100;
      return {
        kind, ask: `Una placa reduce el radio de una arteria un ${red} %. A igual presión, ¿qué porcentaje del flujo original queda?`,
        given: [['reducción del radio', `${red} %`]], number: { label: '$Q$ =', unit: '% de $Q_0$', answer: ans, rel: 0.03 }, rr,
        hint: `El radio queda en ${n(rr, 2)} de su valor; el flujo, en ese número elevado a 4.`,
        solution: [{ text: 'Radio restante:', math: `$r$/$r_0$ = ${n(rr, 2)}` }, { text: 'Flujo:', math: `${n(rr, 2)}⁴ = ${n(rr ** 4, 4)} → ${n(ans, 1)} %` }],
        why: `Queda el ${n(ans, 1)} % del flujo.`,
      };
    }
    case 'ohm': {
      const dP = pick(rnd, [80, 90, 95, 100]);
      const Q = pick(rnd, [70, 80, 90, 100]);
      return {
        kind, ask: `Entre la aorta y la aurícula derecha hay una diferencia de presión de ${dP} mmHg y el gasto cardíaco es ${Q} mL/s. ¿Cuál es la resistencia periférica total?`,
        given: [['Δ$P$', `${dP} mmHg`], ['$Q$', `${Q} mL/s`]],
        number: { label: '$R$ =', unit: 'URP', answer: dP / Q }, rr: 0.8,
        hint: '$R$ = Δ$P$/$Q$. 1 URP = 1 mmHg·s/mL.',
        solution: [{ text: 'Despejando de $Q$ = Δ$P$/$R$:', math: `$R$ = ${dP}/${Q} = ${n(dP / Q, 2)} mmHg·s/mL` }],
        why: `$R$ ≈ ${n(dP / Q, 2)} URP.`,
      };
    }
    case 'series': {
      const Rs = [pick(rnd, [1, 2, 3]), pick(rnd, [2, 4, 5]), pick(rnd, [3, 6])];
      return {
        kind, ask: `Tres vasos en serie con resistencias ${Rs.join(', ')} (unidades arbitrarias). ¿Resistencia total?`,
        given: Rs.map((r, i) => [`$R_${i + 1}$`, `${r}`]), number: { label: '$R_t$ =', unit: '', answer: Rs.reduce((a, b) => a + b, 0) }, mode: 'serie', N: 3,
        hint: 'En serie, la sangre atraviesa una resistencia tras otra: se suman.',
        solution: [{ text: 'En serie:', math: `$R_t$ = ${Rs.join(' + ')} = ${Rs.reduce((a, b) => a + b, 0)}` }],
        why: `$R_t$ = ${Rs.reduce((a, b) => a + b, 0)}.`,
      };
    }
    case 'parallel': {
      const N = pick(rnd, [2, 3, 4, 5]);
      const R = pick(rnd, [6, 12, 20, 60]);
      return {
        kind, ask: `${N} capilares idénticos, cada uno con resistencia ${R}, están en paralelo. ¿Resistencia total?`,
        given: [['$N$', `${N}`], ['$R$ de cada uno', `${R}`]], number: { label: '$R_t$ =', unit: '', answer: R / N }, mode: 'paralelo', N,
        hint: 'En paralelo: 1/$R_t$ = Σ 1/$R_i$. Con $N$ resistencias iguales, $R_t$ = $R$/$N$.',
        solution: [{ text: 'En paralelo:', math: `1/$R_t$ = ${N}·(1/${R})` }, { text: 'Total:', math: `$R_t$ = ${R}/${N} = ${n(R / N, 2)}` }],
        why: `$R_t$ = ${n(R / N, 2)}: menor que cada una.`,
      };
    }
    case 'visc': {
      const f = pick(rnd, [1.5, 2]);
      return {
        kind, ask: `En una policitemia la viscosidad de la sangre se multiplica por ${n(f)}. Para mantener el mismo caudal, ¿por cuánto debe multiplicarse la diferencia de presión?`,
        given: [['$η_2$', `${n(f)}·$η_1$`]], number: { label: '×', unit: '', answer: f }, rr: 0.9,
        hint: '$R$ = 8 $η$ $L$ / ($π$ $r$⁴) es proporcional a $η$; y Δ$P$ = $Q$·$R$.',
        solution: [{ text: 'Resistencia proporcional a la viscosidad:', math: `$R_2$ = ${n(f)}·$R_1$` }, { text: 'A igual $Q$:', math: `Δ$P_2$ = ${n(f)}·Δ$P_1$` }],
        why: `Δ$P$ × ${n(f)}: más trabajo cardíaco.`,
      };
    }
    default: {
      const V1 = pick(rnd, [2.5, 3, 3.5]);
      const dV = pick(rnd, [0.05, 0.1, 0.15]);
      const P2 = (760 * V1) / (V1 + dV);
      return {
        kind: 'boyle', ask: `Los pulmones contienen ${n(V1, 1)} L de aire a 760 mmHg. El tórax se expande ${n(dV * 1000, 0)} mL antes de que entre aire. ¿Qué presión alveolar resulta (temperatura constante)?`,
        given: [['$P_1$', '760 mmHg'], ['$V_1$', `${n(V1, 1)} L`], ['$V_2$', `${n(V1 + dV, 2)} L`]],
        number: { label: '$P_2$ =', unit: 'mmHg', answer: P2, rel: 0.002 }, V: V1 + dV,
        hint: 'Boyle–Mariotte: $P_1$ $V_1$ = $P_2$ $V_2$.',
        solution: [{ text: 'Boyle:', math: `$P_2$ = 760·${n(V1, 1)}/${n(V1 + dV, 2)} = ${n(P2, 1)} mmHg` }, { text: 'Por debajo de la atmosférica:', math: `${n(P2 - 760, 1)} mmHg → entra aire` }],
        why: `$P_2$ ≈ ${n(P2, 1)} mmHg: el aire entra.`,
      };
    }
  }
}

function drawProblem(ink, p, solved, t) {
  if (p.kind === 'series' || p.kind === 'parallel') { networkScene(ink, p.mode, p.N); return; }
  if (p.kind === 'boyle') { boyleScene(ink, p.V, { air: solved ? 1 : 0 }); return; }
  poisTube(ink, 0.8 * (p.rr ?? 1), t, { labels: true });
}

const practiceCam = (S) => ({ series: CAM.net, parallel: CAM.net, boyle: CAM.lung })[S.practice?.prob?.kind] ?? CAM.tubeP;

// ------------------------------------------------------------- lesson

function coroStep(k, caption) {
  return {
    kind: 'watch', dur: 4, pause: true, cam: CAM.tubeP, panel: 'work', caption,
    work: () => {
      const st = (j) => (j < k ? 'done' : 'now');
      return [
        { h: 'Datos' }, { given: [['Δ$P$', '20 mmHg = 2666 Pa'], ['$η$', '0,004 Pa·s'], ['$L$', '3 cm = 0,03 m'], ['$r$ normal', '2 mm = 0,002 m'], ['$r$ estenosis', '1 mm']] },
        { step: 1, text: 'Flujo normal (Poiseuille):', math: '$Q_0$ = $π$·(0,002)⁴·2666 / (8·0,004·0,03) ≈ 1,4 × 10⁻⁴ m³/s', state: st(1) },
        ...(k >= 2 ? [{ step: 2, text: 'Con la mitad del radio:', math: '$Q$ = $Q_0$·(½)⁴ = $Q_0$/16 ≈ 8,7 × 10⁻⁶ m³/s', state: st(2) }] : []),
        ...(k >= 3 ? [{ step: 3, text: 'Reducción:', math: '1 − 1/16 = 93,75 %', state: st(3) }] : []),
        ...(k >= 3 ? [{ note: 'El modelo ideal sobreestima el valor absoluto (el flujo coronario real es de pocos mL/s); lo robusto es la proporción.' }] : []),
      ];
    },
    draw({ ink }, t) {
      const r = k === 1 ? 0.8 : lerp(0.8, 0.4, easeInOut(clamp(t / 2.5)));
      poisTube(ink, r, t, {});
      ink.text('co-l', { x: -0.3, y: -1.15 }, k === 1 ? 'coronaria sana · $r$ = 2 mm' : 'estenosis · $r$ = 1 mm', { size: 15, cls: k === 1 ? '' : 'accent-tx' });
    },
  };
}

export const b4 = {
  id: 'bio-b4', code: 'B.4', title: 'Resistencia y ley de Poiseuille', lang: 'es', ui: UI_ES,
  cam: CAM.pois, pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({ g: {}, rr: 1, rrSeen: new Set(), CO: 83, k: 1, shock: new Set(), mode: 'serie', N: 3, V: 2.8, vSeen: new Set() }),
  chapters: [
    {
      id: 'intro', title: 'Resistencia y ley de Poiseuille', short: 'Inicio', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: titleCard({
          eyebrow: 'Biofísica · Unidad 2 · Lección B.4',
          title: 'Resistencia y ley de Poiseuille',
          sub: 'Por qué el radio es el regulador más potente del flujo: estenosis, asma, policitemia y shock, con una sola ecuación.',
          meta: 'Unos 55 minutos · Semanas 10–11 · Casos clínicos · Práctica',
        }),
        draw({ ink }, t) { poisTube(ink, 0.8, t, { labels: false, x0: -4, x1: 4 }); },
      }],
    },
    // ============================================================ 1
    {
      id: 'hemodinamica', title: 'Flujo, presión y resistencia', short: 'Q = ΔP/R', num: '1',
      beats: [
        {
          kind: 'watch', dur: 22, cam: CAM.tube,
          caption: [
            [0, 'La <b>hemodinámica</b> relaciona tres magnitudes: el flujo $Q$, la diferencia de presión Δ$P$ que lo impulsa y la <b>resistencia</b> $R$ que se le opone.'],
            [9, '$Q$ = Δ$P$/$R$. Es la misma forma que la ley de Ohm: el corazón genera la presión, las arteriolas regulan la resistencia.'],
            [16, 'En clínica la resistencia se mide en <b>URP</b> (unidades de resistencia periférica): 1 URP = 1 mmHg·s/mL.'],
          ],
          draw({ ink }, t) {
            poisTube(ink, 0.8, t, { profile: false });
            formula(ink, 'f-ohm', '$Q$ = Δ$P$ / $R$', { op: ramp(t, 9, 0.8), fy: 0.1 });
          },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...askNumber({ key: 'urp', label: '$R$ =', unit: 'URP', answer: 1, rel: 0.02, wrong: [[100, 'Usa el caudal en mL/s: 100 mL/s, no 6000 mL/min.'], [0.0167, 'Revisa las unidades del caudal: 6 L/min = 100 mL/s.', 0.05]] }),
          caption: (S) => S.g.urp?.msg ?? (S.g.urp?.wrong ? '$R$ = Δ$P$/$Q$ con Δ$P$ en mmHg y $Q$ en mL/s.' : 'Durante un esfuerzo moderado: presión media 100 mmHg (aorta) y casi 0 en la aurícula derecha; gasto cardíaco 6 L/min = 100 mL/s.'),
          prompt: '¿Cuál es la resistencia periférica total?',
          success: '$R$ = 100/100 = 1 URP. En reposo suele estar cerca de 1 URP; con vasoconstricción intensa puede llegar a 4.',
          draw({ ink }, t) { poisTube(ink, 0.8, t, { profile: false }); },
        },
      ],
    },
    // ============================================================ 2
    {
      id: 'poiseuille', title: 'Ley de Poiseuille', short: 'Poiseuille', num: '2',
      beats: [
        {
          kind: 'watch', dur: 24, cam: CAM.tube,
          caption: [
            [0, 'Para un flujo laminar en un tubo cilíndrico, Poiseuille encontró cuánto vale el caudal.'],
            [5.5, '$Q$ = $π$ $r$⁴ Δ$P$ / (8 $η$ $L$). Aumenta con la diferencia de presión y, sobre todo, con el radio; disminuye con la viscosidad y la longitud.'],
            [15, 'Comparando con $Q$ = Δ$P$/$R$, la resistencia hidrodinámica es $R$ = 8 $η$ $L$ / ($π$ $r$⁴).'],
          ],
          draw({ ink }, t) {
            poisTube(ink, 0.8, t, {});
            formula(ink, 'f-p', t < 15 ? '$Q$ = $π$ $r$⁴ Δ$P$ / (8 $η$ $L$)' : '$R$ = 8 $η$ $L$ / ($π$ $r$⁴)', { op: ramp(t, 5.5, 0.8), fy: 0.08 });
          },
        },
        {
          kind: 'do', cam: CAM.tube,
          ...(() => {
            const c = askChoice({
              key: 'pred', choices: [
                { id: 'half', label: 'a la mitad', why: 'Eso pasaría si $Q$ fuera proporcional a $r$. Pero en Poiseuille el radio está elevado a la cuarta.' },
                { id: 'quarter', label: 'a la cuarta parte', why: 'Eso sería $r$². El área cae a la cuarta parte, pero además la sangre va más lenta: $Q$ ∝ $r$⁴.' },
                { id: 'sixteenth', label: 'a la dieciseisava parte', correct: true },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Predice antes de ver: Δ$P$, $η$ y $L$ no cambian.' };
          })(),
          prompt: 'Si el radio de un vaso se reduce a la mitad, el flujo se reduce…',
          success: '(½)⁴ = 1/16. Una pequeña reducción del radio produce una gran caída del flujo.',
          draw({ ink }, t) { poisTube(ink, 0.8, t, {}); },
        },
        {
          kind: 'do', cam: CAM.pois,
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          caption: (S) => `$r$ = ${n(S.rr * 100, 0)} % de $r_0$  →  $Q$ = ${n(S.rr ** 4 * 100, 1)} % de $Q_0$   ·   $R$ = ${n(1 / S.rr ** 4, 1)} × $R_0$`,
          prompt: 'Arrastra la pared del vaso para estrecharlo y mira la curva de $Q$ frente a $r$.',
          success: 'La curva es muy empinada cerca de $r_0$: con un 80 % del radio queda solo el 41 % del flujo. El radio es el regulador más potente de la resistencia vascular.',
          draw({ ink, S }) {
            poisTube(ink, 0.8 * S.rr, S.tt ?? 0, { x1: 2.8 });
            qrGraph(ink, S.rr, { linOp: 1 });
          },
          handles: (S) => [{ key: 'r', p: { x: -1.5, y: 0.8 * S.rr + 0.09 }, r: 24, cursor: 'ns-resize', drag: (S2, p) => {
            S2.rr = clamp(snap((p.y - 0.09) / 0.8, 0.05), 0.25, 1);
            S2.rrSeen.add(S2.rr <= 0.5 ? 'half' : S2.rr >= 0.95 ? 'full' : 'mid');
          } }],
          done: (S) => S.rrSeen.has('half'),
          skip(S) { S.rr = 0.5; S.rrSeen.add('half'); },
        },
      ],
    },
    // ============================================================ 3
    {
      id: 'casos', title: 'El radio importa: casos clínicos', short: 'Casos r⁴', num: '3',
      beats: [
        {
          kind: 'do', cam: CAM.airway,
          ...askNumber({ key: 'asma', label: 'el flujo cae', unit: 'veces', answer: 16, wrong: [[2, 'Eso sería si $Q$ ∝ $r$. Poiseuille: $Q$ ∝ $r$⁴.'], [4, 'Eso sería $r$²; el flujo depende de $r$⁴.'], [8, '2³ = 8; es la cuarta potencia: 2⁴.']] }),
          caption: (S) => S.g.asma?.msg ?? (S.g.asma?.wrong ? '$Q$ ∝ $r$⁴.' : 'Caso 1 · Asma bronquial: en el broncoespasmo, el edema, el moco y la contracción del músculo liso reducen el radio bronquiolar a la mitad.'),
          prompt: 'Según Poiseuille, ¿cuántas veces disminuye el flujo de aire?',
          success: '16 veces. Por eso aparecen disnea, sibilancias (flujo turbulento) y espiración prolongada. Los broncodilatadores devuelven el radio.',
          draw({ ink }) {
            bronchiole(ink, 'b1', { x: -1.5, y: 0.2 }, 1.0, { label: 'bronquiolo sano' });
            bronchiole(ink, 'b2', { x: 1.6, y: 0.2 }, 0.5, { wall: 0.6, mucus: true, label: 'bronquiolo inflamado' });
          },
        },
        {
          kind: 'do', cam: CAM.pois,
          ...askNumber({ key: 'car', label: '$Q$ =', unit: '% de $Q_0$', answer: 0.81, rel: 0.03, wrong: [[24.01, 'Ese es el resultado con el 70 % del radio. Aquí el radio se reduce un 70 %: queda el 30 %.'], [30, 'Ese es el radio que queda. El flujo depende de su cuarta potencia.']] }),
          caption: (S) => S.g.car?.msg ?? (S.g.car?.wrong ? 'Queda $r$ = 0,30·$r_0$; calcula 0,30⁴.' : 'Caso 4 · Estenosis carotídea: una placa reduce el radio de la carótida interna en un 70 %.'),
          prompt: 'A igual presión, ¿qué porcentaje del flujo cerebral original pasaría según Poiseuille?',
          success: '0,3⁴ ≈ 0,0081: menos del 1 %. En la realidad la autorregulación y la circulación colateral compensan en parte, pero explica el riesgo de AIT, amaurosis fugaz y ACV.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { poisTube(ink, 0.8 * 0.3, S.tt ?? 0, { x1: 2.8 }); qrGraph(ink, 0.3); },
        },
        coroStep(1, 'Caso clínico: hombre de 55 años con angina de esfuerzo. La ecografía muestra una coronaria con el diámetro reducido a la mitad en 3 cm. Primero, el flujo normal.'),
        coroStep(2, 'Con la estenosis, el radio pasa de 2 mm a 1 mm. El flujo se divide entre 2⁴.'),
        coroStep(3, 'El flujo se reduce un 93,75 %. Al esforzarse, el miocardio pide más oxígeno del que llega: angina. Es la base de la isquemia coronaria.'),
        {
          kind: 'do', cam: CAM.tubeP, panel: 'work',
          ...askNumber({ key: 'r20', label: '$Q$ =', unit: '% de $Q_0$', answer: 40.96, rel: 0.02, wrong: [[80, 'Ese es el radio. El flujo es $r$⁴.'], [59.04, 'Esa es la reducción. Se pide lo que queda.']] }),
          caption: (S) => S.g.r20?.msg ?? (S.g.r20?.wrong ? '0,8⁴ = ?' : 'Una arteria pierde solo un 20 % de su radio por una placa incipiente.'),
          prompt: '¿Qué porcentaje del flujo queda, a igual presión?',
          success: '0,8⁴ ≈ 0,41: queda el 41 %. Un estrechamiento «pequeño» ya reduce el flujo a menos de la mitad.',
          work: (S) => [{ h: 'Datos' }, { given: [['$r$', '0,80·$r_0$'], ['Δ$P$, $η$, $L$', 'iguales']] }, { step: 1, text: 'Poiseuille:', math: '$Q/Q_0$ = ($r/r_0$)⁴', state: 'now' }, ...(S.g.r20?.ok ? [{ result: '$Q$ ≈ 41 % de $Q_0$', ok: true }] : [])],
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) { poisTube(ink, 0.64, S.tt ?? 0); },
        },
      ],
    },
    // ============================================================ 4
    {
      id: 'regulacion', title: 'Viscosidad, presión y regulación', short: 'Regulación', num: '4',
      beats: [
        {
          kind: 'do', cam: CAM.tube,
          ...(() => {
            const c = askChoice({
              key: 'poli', choices: [
                { id: 'a', label: 'aumenta la resistencia y el corazón debe generar más presión', correct: true },
                { id: 'b', label: 'el flujo aumenta porque hay más células', why: 'Más células no significa más flujo: $Q$ ∝ 1/$η$. A igual presión, el flujo baja.' },
                { id: 'c', label: 'no cambia nada: la viscosidad no aparece en la ley de Poiseuille', why: 'Sí aparece: $R$ = 8 $η$ $L$ / ($π$ $r$⁴).' },
              ],
            });
            return { ...c, caption: (S) => c.feedback(S) ?? 'Caso 2 · Policitemia vera: hematocrito elevado, sangre más viscosa.' };
          })(),
          prompt: '¿Qué pasa con el flujo sanguíneo si aumenta la viscosidad?',
          success: 'Viscosidad ↑ → resistencia ↑ → flujo ↓ a igual presión. Para mantener el flujo, el corazón trabaja más: sobrecarga cardíaca e hipertensión. Tratamiento: flebotomía.',
          tick(S, dt) { S.tt = (S.tt ?? 0) + dt; },
          draw({ ink, S }) {
            vessel(ink, 'pv', -3.8, 3.8, () => 0.8, { streamlines: false });
            cells(ink, 'pv-c', -3.8, 3.8, () => 0.8, () => 0.35, S.tt ?? 0, { per: 14, lanes: [-0.7, -0.45, -0.2, 0.05, 0.3, 0.55, 0.75], speed: 0.6, profile: (s) => 1 - s * s + 0.1 });
          },
        },
        {
          kind: 'watch', dur: 20, cam: CAM.organs,
          caption: [
            [0, 'Los órganos están en <b>paralelo</b>: todos reciben la misma presión arterial, y cada uno toma $Q_i$ = $P$/$R_i$.'],
            [8.5, 'Caso 3 · Shock hipovolémico: una hemorragia reduce el gasto cardíaco. La presión arterial cae y con ella el flujo a todos los órganos.'],
            [16, '¿Cómo compensa el organismo?'],
          ],
          draw({ ink }, t) {
            const CO = t < 8.5 ? 83 : lerp(83, 50, easeInOut(clamp((t - 9) / 3)));
            const c = organScene(ink, CO, 1);
            readout(ink, [`Gasto cardíaco: ${n(CO, 0)} mL/s`, `Presión arterial media: ${n(c.P, 0)} mmHg`]);
          },
        },
        {
          kind: 'do', cam: CAM.organs,
          caption: (S) => {
            const c = circulation(S.CO, S.k);
            return `Gasto ${n(S.CO, 0)} mL/s · PAM ${n(c.P, 0)} mmHg · cerebro ${n(c.Q[0], 1)} mL/s`;
          },
          prompt: 'Activa la vasoconstricción selectiva: contrae los vasos de piel, intestino, riñones y músculo.',
          controls: (S) => [
            { type: 'button', id: 'k1', label: 'Sin compensación', primary: S.k === 1 },
            { type: 'button', id: 'k3', label: 'Vasoconstricción selectiva', primary: S.k > 1 },
          ],
          act(S, id) { S.k = id === 'k3' ? 1.8 : 1; S.CO = 50; S.shock.add(id); },
          success: 'Al aumentar la resistencia de los lechos no vitales, sube la resistencia total y la presión arterial se recupera ($P$ = $Q$·$R$). Cerebro y corazón, sin contraerse, reciben más flujo. Junto con la taquicardia y la activación simpática: piel fría, pálida.',
          draw({ ink, S }) {
            const c = organScene(ink, S.CO, S.k);
            readout(ink, [`Gasto cardíaco: ${n(S.CO, 0)} mL/s`, `PAM: ${n(c.P, 0)} mmHg`]);
          },
          enter(S) { S.CO = 50; },
          done: (S) => S.shock.has('k3'),
          skip(S) { S.k = 1.8; S.shock.add('k3'); },
        },
      ],
    },
    // ============================================================ 5
    {
      id: 'serie-paralelo', title: 'Resistencias en serie y en paralelo', short: 'Serie y paralelo', num: '5',
      beats: [
        {
          kind: 'watch', dur: 22, cam: CAM.net,
          caption: [
            [0, 'En <b>serie</b>, la sangre atraviesa una resistencia tras otra (aorta → arterias → arteriolas…). Las resistencias se suman: $R_t$ = $R_1$ + $R_2$ + $R_3$ + …'],
            [10, 'En <b>paralelo</b>, el flujo se reparte entre varios caminos (capilares, órganos). Se suman las inversas: 1/$R_t$ = 1/$R_1$ + 1/$R_2$ + …'],
            [17.5, 'En paralelo la resistencia total es <b>menor</b> que la de cualquier rama: la red capilar facilita la perfusión.'],
          ],
          draw({ ink }, t) {
            networkScene(ink, t < 10 ? 'serie' : 'paralelo', t < 10 ? 3 : 4);
            formula(ink, 'f-sp', t < 10 ? '$R_t$ = $R_1$ + $R_2$ + $R_3$' : '1/$R_t$ = 1/$R_1$ + 1/$R_2$ + 1/$R_3$ + 1/$R_4$', { op: t < 10 ? ramp(t, 3.5, 0.8) : ramp(t, 10.5, 0.8), fy: 0.08 });
          },
        },
        {
          kind: 'do', cam: CAM.net,
          ...askNumber({ key: 'par', label: '$R_t$ =', unit: '', answer: 2, wrong: [[18, 'Las sumaste como en serie. En paralelo se suman las inversas.'], [0.5, 'Ese es 1/$R_t$. Falta invertir.']] }),
          caption: (S) => S.g.par?.msg ?? (S.g.par?.wrong ? '1/$R_t$ = 1/6 + 1/6 + 1/6.' : 'Tres capilares idénticos, cada uno con resistencia 6 (unidades arbitrarias), en paralelo.'),
          prompt: '¿Cuál es la resistencia total?',
          success: '1/$R_t$ = 3/6 → $R_t$ = 2: un tercio de cada una. Con millones de capilares en paralelo, su resistencia conjunta es menor que la de las arteriolas.',
          draw({ ink }) { networkScene(ink, 'paralelo', 3); },
        },
      ],
    },
    // ============================================================ 6
    {
      id: 'respiracion', title: 'Del flujo sanguíneo al aire', short: 'Respiración', num: '6',
      beats: [
        {
          kind: 'watch', dur: 24, cam: CAM.lung,
          caption: [
            [0, 'El aire también es un fluido, y las mismas leyes rigen la respiración (Semana 11). Para que entre, la presión alveolar debe ser menor que la atmosférica.'],
            [9.5, 'El diafragma se contrae y baja: el volumen del tórax aumenta. Por la ley de <b>Boyle–Mariotte</b>, $P_1$ $V_1$ = $P_2$ $V_2$ a temperatura constante, la presión baja.'],
            [18.5, 'El aire entra por la tráquea hasta igualar presiones. En la espiración, el diafragma se relaja y el proceso se invierte.'],
          ],
          draw({ ink }, t) {
            const V = 2.6 + 0.35 * (0.5 - 0.5 * Math.cos(Math.max(0, t - 9.5) * 1.1));
            const breathingIn = Math.sin(Math.max(0, t - 9.5) * 1.1) > 0.05;
            boyleScene(ink, V, { air: t > 9.5 ? (breathingIn ? 1 : -1) : 0 });
            formula(ink, 'f-boy', '$P_1$ $V_1$ = $P_2$ $V_2$', { op: ramp(t, 9.5, 0.8), fx: 0.78, fy: 0.2 });
          },
        },
        {
          kind: 'do', cam: CAM.lung,
          ...askNumber({ key: 'boy', label: '$P_2$ =', unit: 'mmHg', answer: 747.5, rel: 0.001, wrong: [[772.7, 'Al aumentar el volumen la presión disminuye: $P_2$ = $P_1$ $V_1$ / $V_2$.', 0.002]] }),
          caption: (S) => S.g.boy?.msg ?? (S.g.boy?.wrong ? 'Boyle: $P_2$ = $P_1$·$V_1$/$V_2$.' : 'Los pulmones tienen 3,00 L de aire a 760 mmHg. Antes de que entre aire, el tórax se expande hasta 3,05 L.'),
          prompt: '¿Cuál es la presión alveolar en ese instante?',
          success: '$P_2$ = 760·3,00/3,05 ≈ 747,5 mmHg: unos 12 mmHg por debajo de la atmosférica, así que entra aire. (En la respiración tranquila basta con 1–3 mmHg.)',
          draw({ ink, S }) { boyleScene(ink, 3.05, { air: S.g.boy?.ok ? 1 : 0 }); },
        },
      ],
    },
    // ============================================================ 7
    practiceChapter({ num: '7', seed: 70407, kinds: ['ratio', 'pct', 'ohm', 'parallel', 'visc', 'series', 'boyle'], make: makeProblem, draw: drawProblem, cam: practiceCam }),
    // ============================================================ 8
    {
      id: 'summary', title: 'Resumen', short: 'Resumen', num: '8',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: summaryCard({
          eyebrow: 'Biofísica B.4 · Resumen',
          title: 'Resistencia y ley de Poiseuille',
          ideas: [
            '<span class="m"><i>Q</i> = Δ<i>P</i>/<i>R</i></span>: el corazón genera la presión, las arteriolas regulan la resistencia. 1 URP = 1 mmHg·s/mL.',
            'Poiseuille: <span class="m"><i>Q</i> = π<i>r</i>⁴Δ<i>P</i>/(8<i>ηL</i>)</span> y <span class="m"><i>R</i> = 8<i>ηL</i>/(π<i>r</i>⁴)</span>. El radio domina: mitad de radio, 1/16 del flujo.',
            'Asma (÷16), estenosis carotídea (70 % → < 1 %), coronaria (−94 %): pequeñas reducciones del radio, grandes caídas del flujo.',
            'Viscosidad ↑ (policitemia) → resistencia ↑ → más trabajo cardíaco. En el shock, la vasoconstricción selectiva sube <span class="m"><i>R</i></span> y protege cerebro y corazón.',
            'En serie se suman las resistencias; en paralelo, sus inversas. Boyle (<span class="m"><i>PV</i> = cte</span>) explica la entrada de aire a los pulmones.',
          ],
          next: '<span class="eyebrow">Para pensar</span> ¿Cómo usarías <span class="m"><i>Q</i> ∝ <i>r</i>⁴</span> para convencer a un paciente de dejar de fumar o controlar su hipertensión?',
        }),
        draw() {},
      }],
    },
  ],
};
