// Statics S.2–S.3 — Inside a beam: shear force and bending moment.
// Implements docs/lesson-statics-s2-s3-script.md.
//
// Structure per idea: introduce (watch) → explore (do) → worked example
// (watch, paused at every step) → guided practice (do) → problem set with
// mastery (four correct in a row).

import * as V from '../../core/vec.js';
import { ramp, clamp, lerp, easeOut, easeInOut, snap, num } from '../core/anim.js';
import { createWorkPanel } from '../core/workpanel.js';
import { solveBeam } from './beam.js';

// ------------------------------------------------------------------ layout

const BEAM_H = 0.3;
const Y_V = -2.85;
const Y_M = -5.45;
const KV = 0.07; // m per kN
const KM = 0.045; // m per kN·m
const F0 = 12;
const L0 = 6;

const cams = (L = L0) => ({
  title: { xmin: -1.5, xmax: L + 1.5, ymin: -1.6, ymax: 5.2 },
  beam: { xmin: -1.6, xmax: L + 1.6, ymin: -2.55, ymax: 2.5 },
  diag: { xmin: -1.8, xmax: L + 1.6, ymin: -6.9, ymax: 2.4 },
});
const CAM = cams();

const f1 = (v) => num(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1);
const f2 = (v) => num(v, Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? (Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1) : 2);

// --------------------------------------------------------------- drawing

function rectW(ink, key, x0, y0, x1, y1, cls, o = {}) {
  if ((o.op ?? 1) <= 0.002) return;
  const a = ink.S({ x: x0, y: y1 }), b = ink.S({ x: x1, y: y0 });
  ink.P.el(o.layer ?? 'bodies', key, 'rect', {
    x: a.x.toFixed(2), y: a.y.toFixed(2), width: Math.max(0, b.x - a.x).toFixed(2), height: Math.max(0, b.y - a.y).toFixed(2),
    class: cls, opacity: o.op !== undefined && o.op < 0.999 ? o.op.toFixed(2) : null,
  });
}

/** Beam on a pin (A) and a roller (B), with loads, reactions and dimensions. */
function beamScene(ink, beam, o = {}) {
  const L = beam.L;
  const op = o.op ?? 1;
  ink.pinSupport('supA', { x: 0, y: 0 }, { op: op * (o.supportOp ?? 1) });
  ink.rollerSupport('supB', { x: L, y: 0 }, { op: op * (o.supportOp ?? 1) });
  ink.text('lblA', { x: 0, y: 0 }, 'A', { op: op * (o.supportOp ?? 1), dx: -26, dy: 14, size: 18 });
  ink.text('lblB', { x: L, y: 0 }, 'B', { op: op * (o.supportOp ?? 1), dx: 26, dy: 14, size: 18 });
  if (!o.noBeam) {
    rectW(ink, 'beam', 0, 0, L, BEAM_H, 'part', { op: op * (o.beamOp ?? 1) });
    ink.line('beam-cl', { x: -0.35, y: BEAM_H / 2 }, { x: L + 0.35, y: BEAM_H / 2 }, 'dashdot', { op: op * (o.beamOp ?? 1), layer: 'bodies' });
  }
  for (const [i, l] of beam.loads.entries()) loadArrow(ink, `F${i}`, l, { op: op * (o.loadOp ?? 1), draw: o.loadDraw, label: o.loadLabels?.[i] });
  if (o.reactions) reactions(ink, beam, { op: op * (o.reactionOp ?? 1), values: o.reactionValues !== false });
  if (o.dims) dims(ink, beam, { op: op * (o.dimOp ?? 1) });
}

function loadArrow(ink, key, l, o = {}) {
  const top = BEAM_H + 1.25;
  ink.arrow(key, { x: l.x, y: top }, { x: l.x, y: BEAM_H + 0.02 }, 'ink heavy', { op: o.op, draw: o.draw, head: 12, headW: 4 });
  ink.text(`${key}-l`, { x: l.x, y: top }, o.label ?? `$F$ = ${f1(l.F)} kN`, { op: o.op, dy: -10, size: 17 });
}

function reactions(ink, beam, o = {}) {
  const len = (R) => 0.3 + Math.abs(R) * 0.05;
  const y0 = -0.3;
  for (const [key, x, R, name] of [['RA', 0, beam.Ay, 'A'], ['RB', beam.L, beam.By, 'B']]) {
    if (Math.abs(R) < 1e-6) continue;
    const from = { x, y: y0 - len(R) }, to = { x, y: y0 };
    ink.arrow(key, R >= 0 ? from : to, R >= 0 ? to : from, 'ink heavy', { op: o.op, head: 11, headW: 3.8 });
    ink.text(`${key}-l`, from, o.values ? `$${name}_y$ = ${f2(Math.abs(R))} kN` : `$${name}_y$`, { op: o.op, dy: 20, size: 16 });
  }
}

function dims(ink, beam, o = {}) {
  const y = -1.75;
  for (const [i, l] of beam.loads.entries()) {
    if (l.x > 0.05) ink.dimension(`dim-a${i}`, { x: 0, y }, { x: l.x, y }, 0, `${f2(l.x)} m`, { op: o.op, size: 15 });
  }
  ink.dimension('dim-L', { x: 0, y: y - 0.42 }, { x: beam.L, y: y - 0.42 }, 0, `$L$ = ${f2(beam.L)} m`, { op: o.op, size: 15 });
}

/**
 * Free body of the left piece [0, x]: the right piece set aside (ghosted),
 * internal V and M drawn in their positive directions at the cut face.
 */
function cutScene(ink, beam, x, o = {}) {
  const L = beam.L;
  const gap = o.gap ?? 0.5;
  const ghost = o.ghostOp ?? 0.22;
  // Left piece.
  ink.pinSupport('supA', { x: 0, y: 0 }, {});
  ink.text('lblA', { x: 0, y: 0 }, 'A', { dx: -26, dy: 14, size: 18 });
  rectW(ink, 'beamL', 0, 0, x, BEAM_H, 'part');
  ink.line('beam-cl', { x: -0.35, y: BEAM_H / 2 }, { x: x + 0.15, y: BEAM_H / 2 }, 'dashdot', { layer: 'bodies' });
  // Right piece, set aside.
  rectW(ink, 'beamR', x + gap, 0, L + gap, BEAM_H, 'ghost', { op: ghost * 3 });
  ink.rollerSupport('supB', { x: L + gap, y: 0 }, { op: ghost });
  ink.text('lblB', { x: L + gap, y: 0 }, 'B', { op: ghost, dx: 26, dy: 14, size: 18 });
  for (const [i, l] of beam.loads.entries()) {
    const left = l.x < x;
    loadArrow(ink, `F${i}`, { ...l, x: left ? l.x : l.x + gap }, { op: left ? 1 : ghost });
  }
  // Reactions: A acts on the left piece.
  if (o.reactions !== false) {
    const len = 0.3 + beam.Ay * 0.05;
    ink.arrow('RA', { x: 0, y: -0.3 - len }, { x: 0, y: -0.3 }, 'ink heavy', { head: 11, headW: 3.8 });
    ink.text('RA-l', { x: 0, y: -0.3 - len }, `$A_y$ = ${f2(beam.Ay)} kN`, { dy: 20, size: 16 });
  }
  internalForces(ink, beam, x, { values: o.values, op: o.internalOp ?? 1, labels: o.labels });
  // The cut itself.
  ink.line('cut', { x: x + gap / 2, y: -0.55 }, { x: x + gap / 2, y: BEAM_H + 1.6 }, 'cutline', { op: o.cutOp ?? 1, layer: 'annotations' });
}

function internalForces(ink, beam, x, o = {}) {
  const op = o.op ?? 1;
  if (op <= 0) return;
  const Vv = beam.V(x), Mv = beam.M(x);
  // Positive shear on the right face of the left piece acts downward.
  ink.arrow('Vint', { x: x + 0.07, y: BEAM_H + 0.85 }, { x: x + 0.07, y: BEAM_H + 0.03 }, 'accent heavy', { op, head: 11, headW: 3.8 });
  ink.text('Vint-l', { x: x + 0.07, y: BEAM_H + 0.85 }, o.values ? `$V$ = ${f2(Vv)} kN` : '$V$', { op, dx: -8, dy: -8, size: 17, cls: 'accent-tx halo', anchor: 'end' });
  // Positive moment on that face is counterclockwise.
  ink.moment('Mint', { x: x - 0.02, y: BEAM_H / 2 }, 30, true, { op, cls: 'accent', start: -Math.PI * 0.55 });
  ink.text('Mint-l', { x: x - 0.02, y: BEAM_H / 2 }, o.values ? `$M$ = ${f2(Mv)} kN·m` : '$M$', { op, dx: -18, dy: 52, size: 17, cls: 'accent-tx halo', anchor: 'end' });
}

/** Axes and hatched diagrams for V and M, aligned under the beam. */
function diagrams(ink, beam, o = {}) {
  const L = beam.L;
  const op = o.op ?? 1;
  const { shear, moment } = beam.samples();
  for (const [key, y0, name, unit] of [['dV', Y_V, '$V$', 'kN'], ['dM', Y_M, '$M$', 'kN·m']]) {
    ink.line(`${key}-base`, { x: -0.2, y: y0 }, { x: L + 0.3, y: y0 }, 'ink', { op, layer: 'annotations' });
    ink.text(`${key}-name`, { x: -0.35, y: y0 }, `${name}`, { op, dx: -6, dy: 6, anchor: 'end', size: 20 });
    ink.text(`${key}-unit`, { x: -0.35, y: y0 }, `(${unit})`, { op, dx: -6, dy: 26, anchor: 'end', size: 13, cls: 'mid' });
  }
  if (o.shear !== false) ink.diagram('dV', shear, Y_V, KV, { op: op * (o.shearOp ?? 1), draw: o.shearDraw });
  if (o.moment !== false) ink.diagram('dM', moment, Y_M, KM, { op: op * (o.momentOp ?? 1), draw: o.momentDraw });
  if (o.values) {
    const vo = op * (o.valuesOp ?? 1);
    // Shear: label each constant segment once.
    const segs = [];
    for (let i = 0; i + 1 < shear.length; i++) if (shear[i + 1].x > shear[i].x + 1e-9) segs.push([shear[i], shear[i + 1]]);
    segs.forEach(([p, q], i) => {
      const mid = (p.x + q.x) / 2;
      const vm = (p.v + q.v) / 2;
      ink.text(`dV-v${i}`, { x: mid, y: Y_V + vm * KV }, f2(vm), { op: vo, dy: vm >= 0 ? -8 : 20, size: 15, cls: 'halo' });
    });
    const m = beam.maxMoment();
    if (Math.abs(m.M) > 1e-6) {
      ink.text('dM-max', { x: m.x, y: Y_M + m.M * KM }, `${f2(m.M)}`, { op: vo, dy: m.M >= 0 ? -10 : 22, size: 15, cls: 'halo' });
      ink.circle('dM-maxdot', { x: m.x, y: Y_M + m.M * KM }, 3.2, 'dot', { op: vo, layer: 'vectors' });
    }
  }
  if (o.projections) {
    for (const [i, l] of beam.loads.entries()) {
      ink.line(`proj${i}`, { x: l.x, y: -0.35 }, { x: l.x, y: Y_M - 0.3 }, 'dashdot', { op: op * 0.8, layer: 'grid' });
    }
  }
}

function readout(ink, lines, o = {}) {
  lines.forEach((t, i) => ink.textS(`ro${i}`, ink.W - 30, 40 + i * 28, t, { anchor: 'end', size: 19, op: o.op, layer: 'screen' }));
}

// ------------------------------------------------------------- practice

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS = ['Ay', 'V', 'M', 'match', 'max'];

export function makeProblem(rnd, kind) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const L = pick([4, 5, 6, 8]);
  const positions = [];
  for (let x = 1; x <= L - 1 + 1e-9; x += 0.5) positions.push(x);
  const a = pick(positions);
  const F = pick([6, 8, 10, 12, 16, 20]);
  const beam = solveBeam({ L, loads: [{ x: a, F }] });
  const cuts = positions.concat([0.5, L - 0.5]).filter((x) => Math.abs(x - a) > 0.25);
  const xc = pick(cuts);
  const b = L - a;
  const p = { kind, L, a, F, beam, xc };
  switch (kind) {
    case 'Ay':
      Object.assign(p, {
        ask: 'Find the reaction at A, $A_y$.', unit: 'kN', answer: beam.Ay, label: '$A_y$ =',
        hint: 'Take moments about B, so $B_y$ drops out: $A_y$·$L$ = $F$·($L$ − $a$).',
        solution: [
          { text: 'Moments about B:', math: `$A_y$·${f2(L)} − ${f2(F)}·${f2(b)} = 0` },
          { text: 'So', math: `$A_y$ = ${f2(F)}·${f2(b)} / ${f2(L)} = ${f2(beam.Ay)} kN` },
        ],
      });
      break;
    case 'V':
      Object.assign(p, {
        ask: `Find the shear $V$ at $x$ = ${f2(xc)} m.`, unit: 'kN', answer: beam.V(xc), label: '$V$ =',
        hint: `Keep the left piece [0, ${f2(xc)}]. Up: $A_y$ = ${f2(beam.Ay)} kN. Down: ${a < xc ? 'the load, and ' : ''}$V$.`,
        solution: [
          { text: 'Reaction:', math: `$A_y$ = ${f2(F)}·${f2(b)} / ${f2(L)} = ${f2(beam.Ay)} kN` },
          { text: 'Vertical forces on the left piece:', math: a < xc ? `${f2(beam.Ay)} − ${f2(F)} − $V$ = 0` : `${f2(beam.Ay)} − $V$ = 0` },
          { text: 'So', math: `$V$ = ${f2(beam.V(xc))} kN` },
        ],
      });
      break;
    case 'M':
      Object.assign(p, {
        ask: `Find the bending moment $M$ at $x$ = ${f2(xc)} m.`, unit: 'kN·m', answer: beam.M(xc), label: '$M$ =',
        hint: `Moments about the cut: $M$ = $A_y$·$x$${a < xc ? ' − $F$·($x$ − $a$)' : ''}.`,
        solution: [
          { text: 'Reaction:', math: `$A_y$ = ${f2(beam.Ay)} kN` },
          { text: 'Moments about the cut, left piece:', math: a < xc ? `$M$ = ${f2(beam.Ay)}·${f2(xc)} − ${f2(F)}·${f2(xc - a)}` : `$M$ = ${f2(beam.Ay)}·${f2(xc)}` },
          { text: 'So', math: `$M$ = ${f2(beam.M(xc))} kN·m` },
        ],
      });
      break;
    case 'max':
      Object.assign(p, {
        ask: 'Find the largest bending moment, $M_{max}$.', unit: 'kN·m', answer: beam.maxMoment().M, label: '$M_{max}$ =',
        hint: 'It occurs under the load, where $V$ changes sign: $M_{max}$ = $A_y$·$a$.',
        solution: [
          { text: 'Reaction:', math: `$A_y$ = ${f2(beam.Ay)} kN` },
          { text: 'Peak under the load:', math: `$M_{max}$ = ${f2(beam.Ay)}·${f2(a)} = ${f2(beam.maxMoment().M)} kN·m` },
        ],
      });
      break;
    default: {
      // Which shear diagram matches? Correct, sign-flipped, and mirrored.
      const mirror = solveBeam({ L, loads: [{ x: L - a, F }] });
      const flipped = { samples: () => ({ shear: beam.samples().shear.map((s) => ({ x: s.x, v: -s.v })) }) };
      let options = [
        { id: 'ok', samples: beam.samples().shear },
        { id: 'flip', samples: flipped.samples().shear },
        { id: 'mirror', samples: mirror.samples().shear },
      ];
      if (Math.abs(a - L / 2) < 1e-9) options[2] = { id: 'tri', samples: beam.samples().moment.map((s) => ({ x: s.x, v: s.v / Math.max(1, beam.maxMoment().M) * beam.Ay })) };
      for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
      Object.assign(p, {
        kind: 'match', ask: 'Which is the shear-force diagram for this beam?', options,
        hint: 'Start at A with $V$ = $A_y$ (positive). Where is the jump, and which way does the load push $V$?',
        solution: [
          { text: 'Start at A:', math: `$V$ = $A_y$ = ${f2(beam.Ay)} kN` },
          { text: `Under the load at ${f2(a)} m, $V$ drops by ${f2(F)} kN:`, math: `$V$ = ${f2(beam.Ay - F)} kN until B` },
        ],
      });
    }
  }
  return p;
}

function newProblem(S) {
  const pr = S.practice;
  const kind = pr.count < KINDS.length ? KINDS[pr.count] : KINDS[Math.floor(pr.rnd() * KINDS.length)];
  pr.prob = makeProblem(pr.rnd, kind);
  pr.tries = 0;
  pr.status = 'ask';
  pr.picked = null;
  pr.count++;
}

const close = (v, ans) => Math.abs(v - ans) <= Math.max(0.05, 0.01 * Math.abs(ans));

// ------------------------------------------------------- guided feedback

function guidedNumber(S, key, answer, wrongMsgs) {
  return {
    controls: (S2) => (S2.g[key]?.ok ? [] : [{ type: 'number', id: key, unit: key === 'M' ? 'kN·m' : 'kN', label: `$${key}$ =`, state: S2.g[key]?.wrong ? 'wrong' : null }]),
    act(S2, id, v) {
      const ok = close(v, answer);
      S2.g[key] = { ok, wrong: !ok, v, msg: ok ? null : (wrongMsgs.find(([w]) => close(v, w))?.[1] ?? null) };
    },
    done: (S2) => !!S2.g[key]?.ok,
  };
}

// ----------------------------------------------------------------- lesson

const beamOf = (S) => solveBeam({ L: L0, loads: [{ x: S.a, F: F0 }] });
const B1 = solveBeam({ L: L0, loads: [{ x: 2, F: F0 }] });
const B2 = solveBeam({ L: L0, loads: [{ x: 2, F: F0 }, { x: 4, F: F0 }] });

const given1 = { given: [['$L$', '6 m'], ['$F$', '12 kN'], ['$a$', '2 m (from A)']] };

export const statics = {
  id: 'statics-s2',
  code: 'S.2–S.3',
  title: 'Inside a Beam',
  cam: CAM.beam,
  pad: 40,
  panels: { work: createWorkPanel() },
  state: () => ({
    a: 2, cutX: 1.5, bins: new Set(), trace: [], answer: null, answerFail: null, g: {}, a2: 2,
    practice: { rnd: rngFrom(20261009), count: 0, streak: 0, solved: 0, attempted: 0, prob: null, status: 'ask', tries: 0 },
  }),
  chapters: [
    // =============================================================== title
    {
      id: 'intro', title: 'Inside a Beam', short: 'Intro', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: `<div class="title-card">
          <div class="eyebrow">Statics · Lessons S.2–S.3</div>
          <h1>Inside a Beam</h1>
          <p class="sub">Shear forces, bending moments, and the diagrams engineers use to see where a beam will fail.</p>
          <button class="begin" data-action="next">Begin <span aria-hidden="true">›</span></button>
          <div class="meta">About 40 minutes · Worked examples · Practice set</div>
        </div>`,
        draw({ ink }, t) {
          beamScene(ink, B1, { supportOp: ramp(t, 0.2, 0.8), beamOp: ramp(t, 0.6, 0.8), loadDraw: ramp(t, 1.4, 0.8), op: 0.9 });
        },
      }],
    },
    // ============================================================ 1 setup
    {
      id: 'setup', title: 'The beam', short: 'The beam', num: '1',
      beats: [
        {
          kind: 'watch', dur: 8, cam: CAM.beam,
          caption: [
            [0, 'A beam rests on two supports: a <b>pin</b> at A and a <b>roller</b> at B, 6 m apart.'],
            [8, 'A load $F$ = 12 kN presses down on it, 2 m from A.'],
          ],
          draw({ ink }, t) {
            beamScene(ink, B1, { supportOp: ramp(t, 0.3, 1.2), beamOp: ramp(t, 1.4, 1.2), loadDraw: ramp(t, 8.4, 1.2), loadOp: ramp(t, 8.2, 0.3), dims: true, dimOp: ramp(t, 3.4, 1) });
          },
        },
        {
          kind: 'watch', dur: 10, cam: CAM.beam, panel: 'work',
          caption: [
            [0, 'To stay put, the supports push back. These pushes are the <b>reactions</b> $A_y$ and $B_y$.'],
            [8.5, 'Equilibrium decides how they share the load. Moments about A give $B_y$ first.'],
            [17, 'Then the vertical forces give $A_y$. The nearer support carries more.'],
          ],
          work: (S, t) => [
            { h: 'Given' }, given1, { h: 'Reactions' },
            ...(t > 9 ? [{ step: 1, text: 'Moments about A:', math: '$B_y$·6 − 12·2 = 0   →   $B_y$ = 4 kN', state: t > 17 ? 'done' : 'now' }] : []),
            ...(t > 17 ? [{ step: 2, text: 'Vertical forces:', math: '$A_y$ + $B_y$ − 12 = 0   →   $A_y$ = 8 kN', state: 'now' }] : []),
          ],
          draw({ ink }, t) {
            beamScene(ink, B1, { reactions: true, reactionOp: ramp(t, 1.5, 1.2), reactionValues: t > 17, dims: true });
          },
        },
        {
          kind: 'do', cam: CAM.beam, panel: 'work',
          caption: 'Every position of the load gives a new pair of reactions.',
          prompt: 'Drag the load toward B and watch how the supports share it.',
          success: 'The support nearer the load carries more of it — and the two reactions always add up to $F$.',
          work: (S) => {
            const b = beamOf(S);
            return [
              { h: 'Given' }, { given: [['$L$', '6 m'], ['$F$', '12 kN'], ['$a$', `${f2(S.a)} m`]] },
              { h: 'Reactions' },
              { step: 1, text: 'Moments about A:', math: `$B_y$ = $F$·$a$ / $L$ = 12·${f2(S.a)} / 6 = ${f2(b.By)} kN`, state: 'now' },
              { step: 2, text: 'Vertical forces:', math: `$A_y$ = $F$ − $B_y$ = ${f2(b.Ay)} kN`, state: 'now' },
            ];
          },
          draw({ ink, S }) {
            beamScene(ink, beamOf(S), { reactions: true, dims: true });
          },
          handles: (S) => [{ key: 'load', p: { x: S.a, y: BEAM_H + 1.25 }, r: 28, cursor: 'ew-resize', drag: (S2, p) => { S2.a = clamp(snap(p.x, 0.5), 0.5, L0 - 0.5); } }],
          done: (S) => S.a >= 4.5,
          skip(S) { S.a = 5; },
        },
        {
          kind: 'watch', dur: 4, cam: CAM.beam,
          caption: 'We’ll keep the load at 2 m from A for the rest of the lesson.',
          draw({ ink, S }, t) {
            const a = lerp(S.a, 2, easeInOut(clamp((t - 0.6) / 2)));
            beamScene(ink, solveBeam({ L: L0, loads: [{ x: a, F: F0 }] }), { reactions: true, dims: true });
          },
        },
      ],
    },
    // ============================================================== 2 cut
    {
      id: 'cut', title: 'Cutting the beam', short: 'The cut', num: '2',
      beats: [
        {
          kind: 'watch', dur: 18, cam: CAM.beam,
          caption: [
            [0, 'What does the beam feel <em>inside</em>? Imagine cutting it at a distance $x$ from A.'],
            [7.5, 'On its own, the left piece would fall and turn. The right piece was holding it up — with a force and a twist.'],
            [17, 'These are the internal <b>shear force</b> $V$ and <b>bending moment</b> $M$.'],
          ],
          draw({ ink }, t) {
            const x = 1.5;
            const g = 0.5 * easeInOut(clamp((t - 4.2) / 2));
            if (t < 4.2) {
              beamScene(ink, B1, { reactions: true });
              ink.line('cut', { x, y: -0.55 }, { x, y: BEAM_H + 1.6 }, 'cutline', { draw: ramp(t, 1.2, 1.4), layer: 'annotations' });
              ink.text('cut-x', { x, y: BEAM_H + 1.6 }, '$x$ = 1.5 m', { op: ramp(t, 2.2, 0.5), dy: -10, size: 16, cls: 'accent-tx' });
            } else {
              cutScene(ink, B1, x, { gap: g, ghostOp: lerp(1, 0.22, ramp(t, 4.2, 2)), internalOp: ramp(t, 17, 1), cutOp: 0 });
            }
          },
        },
        {
          kind: 'watch', dur: 14, cam: CAM.beam,
          caption: [
            [0, 'Both pieces feel these forces — equal and opposite, by Newton’s third law.'],
            [7.5, 'By convention, this is <b>positive</b>: shear that pushes the left face up and the right face down, and moments that bend the beam into a smile.'],
          ],
          draw({ ink }, t) { signConvention(ink, t); },
        },
      ],
    },
    // ========================================================== 3 explore
    {
      id: 'explore', title: 'Explore the cut', short: 'Explore', num: '3',
      beats: [{
        kind: 'do', cam: CAM.beam,
        caption: (S) => (S.bins.size < 3 ? 'The left piece stays in equilibrium wherever you cut — $V$ and $M$ adjust to make it so.' : 'Watch $V$ when the cut passes the load at 2 m.'),
        prompt: 'Drag the cut along the beam. Watch $V$ and $M$ change.',
        success: '$V$ stays at 8 kN until the cut passes the load — then it drops by 12 kN, to −4 kN. $M$ changes everywhere.',
        draw({ ink, S }) {
          cutScene(ink, B1, S.cutX, { values: true });
          readout(ink, [`$x$ = ${f2(S.cutX)} m`, `$V$ = ${f2(B1.V(S.cutX))} kN`, `$M$ = ${f2(B1.M(S.cutX))} kN·m`]);
        },
        handles: (S) => [{ key: 'cut', p: { x: S.cutX + 0.25, y: -0.55 }, r: 26, cursor: 'ew-resize', drag: (S2, p) => {
          S2.cutX = clamp(snap(p.x - 0.25, 0.1), 0.1, L0 - 0.1);
          S2.bins.add(Math.floor(S2.cutX));
        } }],
        done: (S) => S.bins.size >= 5 && [...S.bins].some((b) => b < 2) && [...S.bins].some((b) => b >= 2),
        skip(S) { [0, 1, 2, 3, 4, 5].forEach((b) => S.bins.add(b)); },
      }],
    },
    // ===================================================== 4 worked example
    {
      id: 'example', title: 'Worked example', short: 'Example', num: '4',
      beats: [
        exampleStep(1, 'Worked example: find $V$ and $M$ at $x$ = 1.5 m. First, isolate the left piece and draw every force on it.', { V: false }),
        exampleStep(2, 'Forces must balance. Taking up as positive: $A_y$ up, $V$ down.', { V: true }),
        exampleStep(3, 'Moments must balance too. Take them about the cut, so $V$ (which passes through it) drops out.', { V: true, M: true, arm: true }),
      ],
    },
    // ======================================================= 5 guided
    {
      id: 'guided', title: 'Your turn', short: 'Your turn', num: '5',
      beats: [
        {
          kind: 'do', cam: CAM.beam, panel: 'work',
          caption: (S) => ({ Ay: 'The load at 2 m is left of the cut — so it acts on the left piece too.', AyFBy: 'B is on the right piece, which we set aside. Only forces on the left piece count.' })[S.answer] ?? 'Same beam, but now the cut is at $x$ = 4 m — to the right of the load.',
          prompt: 'Which forces act on the left piece, besides $V$ and $M$?',
          choices: [
            { id: 'Ay', label: '$A_y$ only' },
            { id: 'AyF', label: '$A_y$ and $F$', correct: true },
            { id: 'AyFBy', label: '$A_y$, $F$ and $B_y$' },
          ],
          answered: (S) => S.answer,
          choose(S, id) { S.answer = id; },
          success: 'Right: $A_y$ and the load $F$ are both on the left piece.',
          work: () => [{ h: 'Given' }, given1, { h: 'Cut at $x$ = 4 m' }, { step: 1, text: 'Isolate the left piece [0, 4 m].', state: 'now' }],
          draw({ ink }) { cutScene(ink, B1, 4); },
          done: (S) => S.answer === 'AyF',
          skip(S) { S.answer = 'AyF'; },
        },
        {
          kind: 'do', cam: CAM.beam, panel: 'work',
          ...guidedNumber(null, 'V', -4, [[4, 'Check the sign: 8 − 12 = −4. A negative answer simply means $V$ acts opposite to the way we drew it.'], [20, '$F$ pushes down, like $V$: both are subtracted.'], [8, 'That is $A_y$ alone. The load is on the left piece too.']]),
          caption: (S) => S.g.V?.msg ?? (S.g.V?.wrong ? 'Not quite. Up is positive: $A_y$ up; $F$ and $V$ down.' : 'Sum the vertical forces on the left piece.'),
          prompt: 'Find the shear $V$ at $x$ = 4 m.',
          success: '$V$ = −4 kN. The minus sign says the real shear points opposite to our positive arrow.',
          work: (S) => [
            { h: 'Given' }, given1, { h: 'Cut at $x$ = 4 m' },
            { step: 1, text: 'Left piece: $A_y$ = 8 kN up, $F$ = 12 kN down.', state: 'done' },
            { step: 2, text: 'Vertical forces:', math: '$A_y$ − $F$ − $V$ = 0   →   8 − 12 − $V$ = 0', state: 'now' },
            ...(S.g.V?.ok ? [{ result: '$V$ = −4 kN', ok: true }] : []),
          ],
          draw({ ink, S }) { cutScene(ink, B1, 4, { values: !!S.g.V?.ok }); },
          skip(S) { S.g.V = { ok: true }; },
        },
        {
          kind: 'do', cam: CAM.beam, panel: 'work',
          ...guidedNumber(null, 'M', 8, [[32, 'You left out the load. It sits 2 m from the cut and turns the piece the other way: subtract 12 × 2.'], [56, 'The load turns the left piece the opposite way to $A_y$: subtract its moment.'], [-8, 'Check the sign of $M$: 8·4 − 12·2 = 32 − 24.']]),
          caption: (S) => S.g.M?.msg ?? (S.g.M?.wrong ? 'Not quite. Each force times its distance from the cut.' : 'Now the moments about the cut. Each force times its distance to the cut.'),
          prompt: 'Find the bending moment $M$ at $x$ = 4 m.',
          success: '$M$ = 8 kN·m: $A_y$ turns the piece one way (8 × 4 = 32), the load the other (12 × 2 = 24).',
          work: (S) => [
            { h: 'Given' }, given1, { h: 'Cut at $x$ = 4 m' },
            { step: 1, text: 'Left piece: $A_y$ = 8 kN at 4 m from the cut; $F$ = 12 kN at 2 m from the cut.', state: 'done' },
            { step: 2, text: 'Vertical forces:', math: '$V$ = −4 kN', state: 'done' },
            { step: 3, text: 'Moments about the cut:', math: '$M$ − $A_y$·4 + $F$·2 = 0   →   $M$ − 32 + 24 = 0', state: 'now' },
            ...(S.g.M?.ok ? [{ result: '$M$ = 8 kN·m', ok: true }] : []),
          ],
          draw({ ink, S }) {
            cutScene(ink, B1, 4, { values: !!S.g.M?.ok });
            ink.dimension('armA', { x: 0, y: -2.25 }, { x: 4, y: -2.25 }, 0, 'arm of $A_y$: 4 m', { size: 14 });
            ink.dimension('armF', { x: 2, y: -1.8 }, { x: 4, y: -1.8 }, 0, 'arm of $F$: 2 m', { size: 14 });
          },
          skip(S) { S.g.M = { ok: true }; },
        },
      ],
    },
    // ======================================================= 6 diagrams
    {
      id: 'diagrams', title: 'The diagrams', short: 'Diagrams', num: '6',
      beats: [
        {
          kind: 'do', cam: CAM.diag,
          caption: 'Below the beam are two empty graphs, aligned with it: one for $V$, one for $M$.',
          prompt: 'Drag the cut again — this time every position leaves a mark below.',
          success: 'Those marks trace the <b>shear-force diagram</b> and the <b>bending-moment diagram</b>.',
          enter(S) { S.trace = S.trace ?? []; S.bins2 = S.bins2 ?? new Set(); if (S.bins2.size === 0) S.cutX = 0.3; },
          draw({ ink, S }) {
            cutScene(ink, B1, S.cutX, { values: true, reactions: true });
            diagrams(ink, B1, { shear: false, moment: false });
            for (const [i, p] of S.trace.entries()) {
              ink.dot(`tv${i}`, { x: p.x, y: Y_V + p.V * KV }, { r: 3, cls: 'dot-accent', layer: 'vectors' });
              ink.dot(`tm${i}`, { x: p.x, y: Y_M + p.M * KM }, { r: 3, cls: 'dot-accent', layer: 'vectors' });
            }
            ink.line('trace-v', { x: S.cutX, y: -0.6 }, { x: S.cutX, y: Y_M - 0.2 }, 'accent-thin', { layer: 'grid', op: 0.5 });
          },
          handles: (S) => [{ key: 'cut', p: { x: S.cutX + 0.25, y: -0.55 }, r: 26, cursor: 'ew-resize', drag: (S2, p) => {
            S2.cutX = clamp(snap(p.x - 0.25, 0.1), 0.1, L0 - 0.1);
            const x = S2.cutX;
            if (!S2.trace.some((q) => Math.abs(q.x - x) < 0.05)) S2.trace.push({ x, V: B1.V(x), M: B1.M(x) });
            S2.bins2.add(Math.floor(x * 2));
          } }],
          done: (S) => S.bins2.size >= 9,
          skip(S) { for (let k = 0; k < 12; k++) { S.bins2.add(k); const x = k / 2 + 0.25; S.trace.push({ x, V: B1.V(x), M: B1.M(x) }); } },
        },
        {
          kind: 'watch', dur: 16, cam: CAM.diag,
          caption: [
            [0, 'Joined up, they show what every section of the beam carries.'],
            [6.5, '$V$ is 8 kN, then jumps down by $F$ = 12 kN under the load, to −4 kN.'],
            [14, '$M$ climbs to its peak, 16 kN·m, right under the load — then falls back to zero at B.'],
          ],
          draw({ ink }, t) {
            beamScene(ink, B1, { reactions: true });
            diagrams(ink, B1, { shearDraw: ramp(t, 1, 3, easeOut), momentDraw: ramp(t, 4, 3, easeOut), values: true, valuesOp: ramp(t, 6.5, 0.8), projections: true });
          },
        },
        {
          kind: 'watch', dur: 20, cam: CAM.diag,
          caption: [
            [0, 'Look at the slopes. Where $V$ = 8 kN, $M$ rises 8 kN·m every metre…'],
            [7.5, '…and where $V$ = −4 kN, $M$ falls 4 kN·m every metre. <b>The slope of $M$ is $V$.</b>'],
            [16, 'So $M$ peaks where $V$ changes sign. And at a pin or a roller, $M$ = 0.'],
          ],
          draw({ ink }, t) {
            beamScene(ink, B1, { reactions: true });
            diagrams(ink, B1, { values: true, projections: true });
            slopeMark(ink, 'sl1', 0, 1, B1, { op: ramp(t, 1, 0.8) });
            slopeMark(ink, 'sl2', 3, 4, B1, { op: ramp(t, 8, 0.8) });
          },
        },
        {
          kind: 'do', cam: CAM.diag,
          caption: (S) => ({ supports: 'At a pin or roller nothing resists turning, so $M$ = 0 there. Look for the peak of the $M$ diagram.', mid: 'At midspan (3 m) $M$ = 12 kN·m — less than under the load.' })[S.answerFail] ?? 'A beam usually fails where the bending moment is largest.',
          prompt: 'Where is this beam most likely to fail in bending?',
          choices: [
            { id: 'supports', label: 'at the supports' },
            { id: 'load', label: 'under the load', correct: true },
            { id: 'mid', label: 'at midspan' },
          ],
          answered: (S) => S.answer2,
          choose(S, id) { S.answer2 = id; if (id !== 'load') S.answerFail = id; },
          success: 'Under the load, where $M$ = 16 kN·m — the peak of the moment diagram.',
          draw({ ink }) {
            beamScene(ink, B1, { reactions: true });
            diagrams(ink, B1, { values: true, projections: true });
          },
          done: (S) => S.answer2 === 'load',
          skip(S) { S.answer2 = 'load'; },
        },
        {
          kind: 'do', cam: CAM.diag,
          caption: (S) => `Largest moment now: ${f2(beamOf2(S).maxMoment().M)} kN·m, at ${f2(beamOf2(S).maxMoment().x)} m.`,
          prompt: 'Move the load to make the largest bending moment as big as possible.',
          success: 'At midspan: $M_{max}$ = $FL$/4 = 18 kN·m. A load in the middle is the hardest on the beam.',
          draw({ ink, S }) {
            const b = beamOf2(S);
            beamScene(ink, b, { reactions: true });
            diagrams(ink, b, { values: true, projections: true });
          },
          handles: (S) => [{ key: 'load', p: { x: S.a2, y: BEAM_H + 1.25 }, r: 28, cursor: 'ew-resize', drag: (S2, p) => { S2.a2 = clamp(snap(p.x, 0.25), 0.5, L0 - 0.5); } }],
          done: (S) => Math.abs(S.a2 - 3) < 0.01,
          skip(S) { S.a2 = 3; },
        },
      ],
    },
    // ================================================ 7 worked example 2
    {
      id: 'example2', title: 'Two loads', short: 'Two loads', num: '7',
      beats: [
        twoLoadStep(1, 'Worked example: two loads of 12 kN, at 2 m and 4 m. By symmetry, each support carries half: 12 kN.'),
        twoLoadStep(2, 'Shear: start at $A_y$ = 12 kN. Each load steps $V$ down by 12 kN — to 0, then to −12 kN.'),
        twoLoadStep(3, '$M$ changes by the <b>area under $V$</b>: +12 × 2 = 24 kN·m, then 0 × 2 = 0, then −12 × 2. Between the loads $V$ = 0, so $M$ stays at 24 kN·m.'),
      ],
    },
    // ========================================================= 8 practice
    {
      id: 'practice', title: 'Practice', short: 'Practice', num: '8',
      beats: [{
        kind: 'do', panel: 'work', skippable: true,
        cam: (S) => {
          const p = S.practice.prob;
          const c = cams(p?.L ?? L0);
          return p?.kind === 'match' ? c.diag : c.beam;
        },
        enter(S) { if (!S.practice.prob) newProblem(S); },
        caption: (S) => {
          const pr = S.practice;
          if (pr.status === 'right') return `✓ Correct. ${pr.why ?? ''}`;
          if (pr.status === 'reveal') return 'Here is the worked solution. Study it, then try a fresh problem.';
          if (pr.tries === 1) return `Not quite. Hint: ${pr.prob.hint}`;
          return 'Problems change every time. Get four right in a row to finish.';
        },
        prompt: (S) => S.practice.prob.ask,
        success: 'Four in a row — you can find reactions, $V$, $M$ and read the diagrams. Practice set complete.',
        controls: (S) => {
          const pr = S.practice;
          if (pr.streak >= 4) return [];
          if (pr.status !== 'ask') return [{ type: 'button', id: 'next', label: 'Next problem ›', primary: true }];
          const p = pr.prob;
          if (p.kind === 'match') return p.options.map((o, i) => ({ type: 'choice', id: o.id, label: `(${'abc'[i]})`, state: pr.picked === o.id ? (o.id === 'ok' ? 'right' : 'wrong') : null }));
          return [{ type: 'number', id: 'ans', label: p.label, unit: p.unit, state: pr.tries ? 'wrong' : null }];
        },
        act(S, id, v, api) {
          const pr = S.practice;
          const p = pr.prob;
          if (id === 'next') { newProblem(S); api.player.clearAnswers(); return; }
          const ok = p.kind === 'match' ? id === 'ok' : close(v, p.answer);
          if (p.kind === 'match') pr.picked = id;
          pr.attempted++;
          if (ok) {
            pr.streak++;
            pr.solved++;
            pr.status = 'right';
            pr.why = p.kind === 'match' ? 'It starts at $A_y$ and drops by $F$ under the load.' : `${p.label.replace(' =', '')} = ${f2(p.answer)} ${p.unit}.`;
          } else {
            pr.tries++;
            pr.streak = 0;
            if (pr.tries >= 2) pr.status = 'reveal';
          }
        },
        work: (S) => {
          const pr = S.practice;
          const p = pr.prob;
          const dots = [0, 1, 2, 3].map((i) => (i < pr.streak ? '●' : '○')).join(' ');
          const lines = [
            { html: `<div class="mastery"><span class="m-label">Mastery</span><span class="m-dots">${dots}</span><span class="m-sub">4 in a row · ${pr.solved} solved</span></div>` },
            { h: `Problem ${pr.count}` },
            { given: [['$L$', `${f2(p.L)} m`], ['$F$', `${f2(p.F)} kN`], ['$a$', `${f2(p.a)} m (from A)`]] },
          ];
          if (pr.status !== 'ask') {
            lines.push({ h: 'Solution' });
            p.solution.forEach((s, i) => lines.push({ step: i + 1, ...s, state: 'done' }));
          }
          return lines;
        },
        draw({ ink, S }) {
          const pr = S.practice;
          const p = pr.prob;
          const solved = pr.status !== 'ask';
          if (p.kind === 'V' || p.kind === 'M') {
            beamScene(ink, p.beam, { reactions: true, reactionValues: solved, dims: true });
            ink.line('pcut', { x: p.xc, y: -0.55 }, { x: p.xc, y: BEAM_H + 1.6 }, 'cutline', { layer: 'annotations' });
            ink.text('pcut-l', { x: p.xc, y: BEAM_H + 1.6 }, `cut at $x$ = ${f2(p.xc)} m`, { dy: -10, size: 15, cls: 'accent-tx' });
          } else if (p.kind === 'match') {
            beamScene(ink, p.beam, { reactions: true, reactionValues: solved });
            matchOptions(ink, p, pr);
          } else {
            beamScene(ink, p.beam, { reactions: true, reactionValues: solved, dims: true });
          }
        },
        done: (S) => S.practice.streak >= 4,
        skip(S) { S.practice.streak = 4; },
      }],
    },
    // ========================================================== summary
    {
      id: 'summary', title: 'Summary', short: 'Summary', num: '9',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: `<div class="summary-card">
          <div class="eyebrow">Statics S.2–S.3 · Summary</div>
          <h2>What a beam feels inside</h2>
          <ol class="ideas">
            <li><span class="n">1</span><div>Cut the beam and keep one piece: the internal <b>shear</b> <span class="m"><i>V</i></span> and <b>moment</b> <span class="m"><i>M</i></span> keep it in equilibrium.</div></li>
            <li><span class="n">2</span><div>Find them with <span class="m">Σ<i>F<sub>y</sub></i> = 0</span> and <span class="m">Σ<i>M</i> = 0</span> about the cut. A negative result means the opposite direction.</div></li>
            <li><span class="n">3</span><div>The diagrams plot <span class="m"><i>V</i>(<i>x</i>)</span> and <span class="m"><i>M</i>(<i>x</i>)</span>: <span class="m"><i>V</i></span> jumps by <span class="m"><i>F</i></span> under a point load.</div></li>
            <li><span class="n">4</span><div>The slope of <span class="m"><i>M</i></span> is <span class="m"><i>V</i></span>, and <span class="m"><i>M</i></span> changes by the area under <span class="m"><i>V</i></span>. The beam is most stressed where <span class="m"><i>M</i></span> peaks.</div></li>
          </ol>
          <div class="next-row">
            <button class="ghost-btn" data-action="restart">Replay lesson</button>
            <div class="next-lesson"><span class="eyebrow">Next</span> S.4 · Distributed loads <span class="soon">coming soon</span></div>
          </div>
        </div>`,
        draw() {},
      }],
    },
  ],
};

// ------------------------------------------------------- beat factories

function beamOf2(S) {
  return solveBeam({ L: L0, loads: [{ x: S.a2, F: F0 }] });
}

function exampleStep(n, caption, show) {
  return {
    kind: 'watch', dur: 4, pause: true, cam: CAM.beam, panel: 'work',
    caption,
    work: () => {
      const st = (k) => (k < n ? 'done' : 'now');
      return [
        { h: 'Given' }, given1, { h: 'Cut at $x$ = 1.5 m' },
        { step: 1, text: 'Left piece [0, 1.5 m]: only $A_y$ = 8 kN, plus the unknowns $V$ and $M$ at the cut.', state: st(1) },
        ...(n >= 2 ? [{ step: 2, text: 'Vertical forces (up +):', math: '$A_y$ − $V$ = 0   →   $V$ = 8 kN', state: st(2) }] : []),
        ...(n >= 3 ? [{ step: 3, text: 'Moments about the cut:', math: '$M$ − $A_y$·1.5 = 0   →   $M$ = 12 kN·m', state: st(3) }] : []),
      ];
    },
    draw({ ink }, t) {
      cutScene(ink, B1, 1.5, { values: n >= 3 ? true : false, internalOp: 1 });
      if (show.arm) ink.dimension('armA', { x: 0, y: -1.85 }, { x: 1.5, y: -1.85 }, 0, 'arm of $A_y$: 1.5 m', { size: 14, op: ramp(t, 0.5, 0.6) });
    },
  };
}

function twoLoadStep(n, caption) {
  return {
    kind: 'watch', dur: 6, pause: true, cam: CAM.diag, panel: 'work',
    caption,
    work: () => {
      const st = (k) => (k < n ? 'done' : 'now');
      return [
        { h: 'Given' }, { given: [['$L$', '6 m'], ['$F_1$ = $F_2$', '12 kN'], ['at', '2 m and 4 m']] },
        { step: 1, text: 'Reactions (symmetry):', math: '$A_y$ = $B_y$ = 12 kN', state: st(1) },
        ...(n >= 2 ? [{ step: 2, text: 'Shear, left to right:', math: '12  →  12 − 12 = 0  →  0 − 12 = −12 kN', state: st(2) }] : []),
        ...(n >= 3 ? [{ step: 3, text: 'Moment = running area under $V$:', math: '0 → 24 → 24 → 0 kN·m', state: st(3) }] : []),
      ];
    },
    draw({ ink }, t) {
      beamScene(ink, B2, { reactions: true, reactionValues: true, loadLabels: ['$F_1$ = 12 kN', '$F_2$ = 12 kN'] });
      diagrams(ink, B2, {
        shear: n >= 2, moment: n >= 3, shearDraw: n === 2 ? ramp(t, 0.4, 3) : 1, momentDraw: n === 3 ? ramp(t, 0.4, 3) : 1,
        values: n >= 2, valuesOp: n === 2 ? ramp(t, 3, 0.6) : 1, projections: true,
      });
      if (n === 3) {
        // Shade the area under V that builds each part of M.
        ink.text('area1', { x: 1, y: Y_V + 6 * KV }, '+24', { size: 14, cls: 'accent-tx halo', op: ramp(t, 1, 0.5) });
        ink.text('area3', { x: 5, y: Y_V - 6 * KV }, '−24', { size: 14, cls: 'accent-tx halo', op: ramp(t, 2.2, 0.5), dy: 6 });
      }
    },
  };
}

function signConvention(ink, t) {
  // A short beam element between two cuts, with positive V and M on both faces.
  const x0 = 2.2, x1 = 3.8, y0 = -0.35, y1 = 0.65;
  const op = ramp(t, 0.3, 0.8);
  rectW(ink, 'elem', x0, y0, x1, y1, 'part', { op });
  ink.line('elem-cl', { x: x0 - 0.3, y: (y0 + y1) / 2 }, { x: x1 + 0.3, y: (y0 + y1) / 2 }, 'dashdot', { op, layer: 'bodies' });
  const vo = ramp(t, 2, 0.8);
  ink.arrow('vL', { x: x0 - 0.18, y: y0 - 0.15 }, { x: x0 - 0.18, y: y1 + 0.05 }, 'accent heavy', { op: vo, head: 11, headW: 3.8 });
  ink.arrow('vR', { x: x1 + 0.18, y: y1 + 0.15 }, { x: x1 + 0.18, y: y0 - 0.05 }, 'accent heavy', { op: vo, head: 11, headW: 3.8 });
  ink.text('vL-l', { x: x0 - 0.18, y: y1 + 0.05 }, '$V$', { op: vo, dy: -12, size: 18, cls: 'accent-tx' });
  ink.text('vR-l', { x: x1 + 0.18, y: y0 - 0.05 }, '$V$', { op: vo, dy: 26, size: 18, cls: 'accent-tx' });
  const mo = ramp(t, 4, 0.8);
  ink.moment('mL', { x: x0, y: (y0 + y1) / 2 }, 34, false, { op: mo, cls: 'accent', start: Math.PI * 0.45 });
  ink.moment('mR', { x: x1, y: (y0 + y1) / 2 }, 34, true, { op: mo, cls: 'accent', start: -Math.PI * 0.55 });
  ink.text('mL-l', { x: x0, y: (y0 + y1) / 2 }, '$M$', { op: mo, dx: -48, dy: 6, size: 18, cls: 'accent-tx', anchor: 'end' });
  ink.text('mR-l', { x: x1, y: (y0 + y1) / 2 }, '$M$', { op: mo, dx: 48, dy: 6, size: 18, cls: 'accent-tx', anchor: 'start' });
  ink.text('pos', { x: (x0 + x1) / 2, y: y1 }, 'positive $V$ and $M$', { op: ramp(t, 7.5, 0.6), dy: -64, size: 16, cls: 'mid' });
  // A sagging beam: positive moment bends it into a smile.
  const so = ramp(t, 9, 1);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push({ x: 4.9 + 1.4 * u, y: -0.9 + 0.35 * (2 * u - 1) ** 2 });
  }
  ink.poly('smile', pts, 'ink heavy', { op: so, layer: 'bodies' });
  ink.text('smile-l', { x: 5.6, y: -0.9 }, 'positive $M$: sagging', { op: so, dy: 28, size: 15, cls: 'mid' });
}

function slopeMark(ink, key, xa, xb, beam, o = {}) {
  const A = { x: xa, y: Y_M + beam.M(xa) * KM }, B = { x: xb, y: Y_M + beam.M(xb) * KM };
  const C = { x: xb, y: A.y };
  ink.poly(`${key}-t`, [A, C, B], 'accent-thin', { op: o.op, layer: 'annotations' });
  const dm = beam.M(xb) - beam.M(xa);
  ink.text(`${key}-l`, B, `Δ$M$ = ${f2(dm)} kN·m in 1 m`, { op: o.op, dx: dm >= 0 ? -6 : 8, dy: dm >= 0 ? -22 : -14, size: 14, cls: 'accent-tx halo', anchor: dm >= 0 ? 'end' : 'start' });
  ink.circle(`${key}-v`, { x: (xa + xb) / 2, y: Y_V + beam.V((xa + xb) / 2) * KV }, 6, 'ring-accent', { op: o.op, layer: 'vectors' });
}

function matchOptions(ink, p, pr) {
  // Three candidate shear diagrams, stacked and aligned with the beam.
  const rows = [-2.55, -3.95, -5.35];
  const maxV = Math.max(...p.options.flatMap((o) => o.samples.map((s) => Math.abs(s.v))), 1);
  const k = 0.5 / maxV;
  p.options.forEach((opt, i) => {
    const y0 = rows[i];
    ink.line(`mo-b${i}`, { x: -0.2, y: y0 }, { x: p.L + 0.2, y: y0 }, 'ink', { layer: 'annotations' });
    ink.text(`mo-l${i}`, { x: -0.4, y: y0 }, `(${'abc'[i]})`, { dx: -4, dy: 6, anchor: 'end', size: 18 });
    const picked = pr.picked === opt.id;
    const cls = pr.status !== 'ask' && opt.id === 'ok' ? 'ok-diag' : picked ? 'bad-diag' : '';
    ink.diagram(`mo-d${i}`, opt.samples, y0, k, { cls });
  });
}
