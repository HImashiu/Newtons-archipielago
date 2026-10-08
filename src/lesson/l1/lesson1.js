// Lesson 1 — Describing Motion. Implements docs/lesson-01-script.md.
//
// World layout (metres): track A at y = 0, track B at y = LANE_B, the number
// line at y = NL_Y. The position–time graph starts as a "time runs down"
// diagram hanging from the number line (layout A) and rotates into textbook
// orientation (layout B) below the track.

import * as V from '../../core/vec.js';
import { ramp, clamp, lerp, lerpP, easeOut, easeInOut, snap, num } from '../core/anim.js';
import { createRulePanel, substitution } from './panel.js';
import { judge, evaluate, analyse, CORRECT_RULE } from '../rule.js';

// ------------------------------------------------------------------ layout

const LANE_B = 1.3;
const NL_Y = -0.8;
const TRACK = [-1.7, 9.9];
const X_LO = -1.45, X_HI = 9.75;
const T_MAX = 4;

const CAM = {
  title: { xmin: -1.6, xmax: 10.2, ymin: -1.1, ymax: 5.4 },
  close: { xmin: -0.9, xmax: 6.4, ymin: -1.3, ymax: 1.7 },
  pos: { xmin: -2.0, xmax: 10.3, ymin: -2.1, ymax: 1.9 },
  two: { xmin: -2.0, xmax: 10.3, ymin: -2.1, ymax: 3.0 },
  graphA: { xmin: -2.2, xmax: 10.4, ymin: -4.9, ymax: 1.8 },
  graphB: { xmin: -2.0, xmax: 10.3, ymin: -6.75, ymax: 1.6 },
};

// Graph: layout A (u = 0, time runs down from O) → layout B (u = 1, textbook).
const GA = { o: { x: 0, y: NL_Y }, kx: 1, kt: 0.82 };
const GB = { o: { x: 0.55, y: -5.75 }, kx: 0.43, kt: 2.15 };
function G(u) {
  const ang = (Math.PI / 2) * u;
  const ex = V.fromAngle(ang, lerp(GA.kx, GB.kx, u));
  const et = V.fromAngle(ang - Math.PI / 2, lerp(GA.kt, GB.kt, u));
  const o = lerpP(GA.o, GB.o, u);
  const map = (x, t) => ({ x: o.x + ex.x * x + et.x * t, y: o.y + ex.y * x + et.y * t });
  map.ex = V.norm(ex);
  map.et = V.norm(et);
  map.inverse = (p) => {
    // Solve o + ex·x + et·t = p (2×2).
    const det = ex.x * et.y - ex.y * et.x;
    const dx = p.x - o.x, dy = p.y - o.y;
    return { x: (dx * et.y - dy * et.x) / det, t: (ex.x * dy - ex.y * dx) / det };
  };
  return map;
}
const GBm = G(1);

// ------------------------------------------------------------ primitives

function track(ink, key, y, o = {}) {
  ink.ground(key, { x: TRACK[0], y }, { x: TRACK[1], y }, o);
}

function numberLine(ink, o = {}) {
  const op = o.op ?? 1;
  const draw = o.draw ?? 1;
  const origin = o.origin ?? 0;
  if (op <= 0 || draw <= 0) return;
  ink.arrow('nl-axis', { x: X_LO, y: NL_Y }, { x: X_HI, y: NL_Y }, 'ink', { op, draw, layer: 'annotations' });
  let d = '';
  const tickOp = op * clamp((draw - 0.15) / 0.85);
  for (let k = Math.ceil(X_LO + 0.2 - origin); origin + k <= X_HI - 0.4; k++) {
    const p = ink.S({ x: origin + k, y: NL_Y });
    if ((p.x - ink.S({ x: X_LO, y: NL_Y }).x) / (ink.S({ x: X_HI, y: NL_Y }).x - ink.S({ x: X_LO, y: NL_Y }).x) > draw) continue;
    d += `M${p.x.toFixed(1)},${(p.y - 5).toFixed(1)}V${(p.y + 5).toFixed(1)}`;
    if (o.labels !== false) ink.text(`nl-l${k}`, { x: origin + k, y: NL_Y }, k < 0 ? `−${-k}` : `${k}`, { op: tickOp * (k === 0 ? 0 : 1), dy: 22, size: 15, cls: 'mid' });
    const half = ink.S({ x: origin + k + 0.5, y: NL_Y });
    if (origin + k + 0.5 < X_HI - 0.4) d += `M${half.x.toFixed(1)},${(half.y - 2.5).toFixed(1)}V${(half.y + 2.5).toFixed(1)}`;
  }
  ink.path('nl-ticks', d, 'thin', { op: tickOp, layer: 'annotations' });
  ink.text('nl-unit', { x: X_HI, y: NL_Y }, '$x$ (m)', { op: tickOp, dy: -12, dx: -2, anchor: 'end', size: 16 });
  // Origin: open circle on the axis, labelled O as on a drawing.
  const oOp = op * (o.originOp ?? 1) * clamp((draw - 0.1) / 0.3);
  ink.pin('nl-O', { x: origin, y: NL_Y }, { op: oOp, r: 4.6 });
  ink.text('nl-Ol', { x: origin, y: NL_Y }, 'O', { op: oOp, dx: -9, dy: -10, anchor: 'end', size: 17 });
}

/** Dash-dot projection from a cart's reference point down to the axis. */
function projection(ink, key, x, lane, o = {}) {
  ink.line(key, { x, y: lane + 0.335 }, { x, y: NL_Y }, 'dashdot', { ...o, layer: 'annotations' });
}

function positionDim(ink, x, origin, o = {}) {
  if (Math.abs(x - origin) < 0.05) return;
  ink.dimension('xdim', { x: origin, y: NL_Y }, { x, y: NL_Y }, 46, `$x$ = ${num(x - origin, 1)} m`, o);
}

function clock(ink, t, o = {}) {
  if ((o.op ?? 1) <= 0) return;
  const s = { x: ink.W - 26, y: 34 };
  ink.P.el('screen', 'clock', 'text', { x: s.x, y: s.y, 'text-anchor': 'end', 'font-size': 19, class: 'tx clock', opacity: o.op < 1 ? o.op.toFixed(2) : null },
    `<tspan font-style="italic">t</tspan><tspan> = ${num(t, 2)} s</tspan>`);
}

function cartAt(ink, key, x, lane, o = {}) {
  ink.cart(key, x, { y: lane, ...o });
}

function balloonFor(ink, key, label, x, lane, o = {}) {
  ink.balloon(key, { x: x - 0.75, y: lane + 1.05 }, label, { x: x - 0.25, y: lane + 0.45 }, o);
}

/** Motion-diagram dots for x(t) = x0 + v t, every 0.5 s up to tEnd. */
function motionDots(ink, key, x0, v, lane, tEnd, o = {}) {
  for (let k = 0; k * 0.5 <= tEnd + 1e-9; k++) {
    const x = x0 + v * k * 0.5;
    ink.dot(`${key}-${k}`, { x, y: lane + 0.335 }, { op: (o.op ?? 1) * (o.dotOp ? o.dotOp(k) : 1), cls: o.cls ?? 'dot' });
    if (o.labels) {
      const lo = (o.op ?? 1) * (o.labelOp ? o.labelOp(k) : 1);
      ink.text(`${key}-t${k}`, { x, y: lane + 0.335 }, k % 2 === 0 ? `${k / 2}` : `${k / 2}`, { op: lo, dy: -13, size: 13, cls: 'mid' });
    }
  }
}

function ghosts(ink, key, x0, v, lane, tNow, o = {}) {
  for (let k = 0; k * 0.5 <= tNow + 1e-9; k++) {
    const age = tNow - k * 0.5;
    const flash = 1 - ramp(age, 0, 0.35);
    cartAt(ink, `${key}-g${k}`, x0 + v * k * 0.5, lane, { ghost: true, op: (o.op ?? 1) * (0.55 + 0.45 * flash) });
    ink.dot(`${key}-d${k}`, { x: x0 + v * k * 0.5, y: lane + 0.335 }, { op: o.op ?? 1 });
  }
}

// -------------------------------------------------------------- the graph

function graphAxes(ink, u, o = {}) {
  const g = G(u);
  const op = o.op ?? 1;
  const draw = o.draw ?? 1;
  if (op <= 0) return;
  const k = ink.k;
  // Time axis.
  ink.arrow('g-t', g(0, 0), g(0, T_MAX + 0.45), 'ink', { op, draw, layer: 'annotations' });
  const off = V.scale(g.ex, -1 / k); // one px against the x direction
  let d = '';
  for (let i = 1; i <= T_MAX * 2; i++) {
    const t = i / 2;
    if (t / (T_MAX + 0.45) > draw) continue;
    const p = ink.S(g(0, t));
    const n = V.norm({ x: off.x, y: -off.y });
    const len = i % 2 === 0 ? 6 : 3;
    d += `M${(p.x - n.x * len).toFixed(1)},${(p.y - n.y * len).toFixed(1)}L${(p.x + n.x * len).toFixed(1)},${(p.y + n.y * len).toFixed(1)}`;
    if (i % 2 === 0) ink.text(`g-tl${i}`, V.addScaled(g(0, t), off, u > 0.5 ? 0 : 16), `${t}`, { op: op * clamp((draw * (T_MAX + 0.45) - t) * 3), size: 14, cls: 'mid', anchor: u > 0.5 ? 'middle' : 'end', dy: u > 0.5 ? 22 : 5 });
  }
  ink.path('g-tticks', d, 'thin', { op, layer: 'annotations' });
  const tEnd = g(0, T_MAX + 0.45);
  ink.text('g-tunit', tEnd, '$t$ (s)', { op: op * clamp(draw * 3 - 2), size: 16, anchor: u > 0.5 ? 'end' : 'start', dx: u > 0.5 ? 0 : 10, dy: u > 0.5 ? -12 : 18 });
  // Graph's own position axis: coincides with the number line at u = 0.
  const xo = op * clamp(u * 4);
  if (xo > 0) {
    ink.arrow('g-x', g(-1, 0), g(X_HI - 0.4, 0), 'ink', { op: xo, layer: 'annotations' });
    let dx = '';
    for (let x = -1; x <= 8; x++) {
      const p = ink.S(g(x, 0));
      dx += `M${(p.x - 5).toFixed(1)},${p.y.toFixed(1)}H${(p.x + 5).toFixed(1)}`;
      if (x % 2 === 0 && x !== 0) ink.text(`g-xl${x}`, g(x, 0), `${x}`, { op: op * ramp(u, 0.75, 0.25), dx: -12, dy: 5, anchor: 'end', size: 14, cls: 'mid' });
    }
    ink.path('g-xticks', dx, 'thin', { op: op * ramp(u, 0.6, 0.3), layer: 'annotations' });
    ink.text('g-xunit', g(X_HI - 0.4, 0), '$x$ (m)', { op: op * ramp(u, 0.75, 0.25), dx: 12, dy: 4, anchor: 'start', size: 16 });
  }
  // Light grid rows (layout A) / grid (layout B).
  const rowOp = op * (1 - u) * (o.rows ?? 0);
  if (rowOp > 0.01) {
    let rd = '';
    for (let i = 1; i <= T_MAX * 2; i++) {
      const a = ink.S(g(X_LO + 0.1, i / 2)), b = ink.S(g(X_HI - 0.5, i / 2));
      rd += `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    }
    ink.path('g-rows', rd, 'grid', { op: rowOp, layer: 'grid' });
  }
  const gridOp = op * ramp(u, 0.8, 0.2) * (o.grid ?? 1);
  if (gridOp > 0.01) {
    let gd = '';
    for (let t = 1; t <= T_MAX; t++) {
      const a = ink.S(g(-1, t)), b = ink.S(g(9, t));
      gd += `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    }
    for (let x = 2; x <= 8; x += 2) {
      const a = ink.S(g(x, 0)), b = ink.S(g(x, T_MAX + 0.2));
      gd += `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    }
    ink.path('g-grid', gd, 'grid', { op: gridOp, layer: 'grid' });
  }
}

/** Straight x(t) line on the graph from t0 to t1, clipped to the axes. */
function graphLine(ink, key, x0, v, cls, o = {}) {
  const g = o.g ?? GBm;
  const t0 = o.t0 ?? 0;
  let t1 = o.t1 ?? T_MAX;
  // Clip to the plotted position range.
  if (v > 0) t1 = Math.min(t1, (9 - x0) / v);
  if (v < 0) t1 = Math.min(t1, (-1 - x0) / v);
  const draw = o.draw ?? 1;
  const tEnd = t0 + (t1 - t0) * draw;
  if (tEnd <= t0) return;
  ink.line(key, g(x0 + v * t0, t0), g(x0 + v * tEnd, tEnd), cls, { op: o.op, layer: 'vectors' });
}

function graphDot(ink, key, x, t, o = {}) {
  ink.dot(key, (o.g ?? GBm)(x, t), { op: o.op, cls: o.cls ?? 'dot', layer: 'vectors' });
}

/** Slope triangle with Δt and Δx dimensions on the textbook graph. */
function slopeTriangle(ink, key, x0, v, ta, tb, o = {}) {
  const op = o.op ?? 1;
  if (op <= 0) return;
  const g = GBm;
  const A = g(x0 + v * ta, ta), B = g(x0 + v * tb, tb), C = g(x0 + v * ta, tb);
  ink.poly(`${key}-tri`, [A, C, B], `thin ${o.cls ?? ''}`, { op, layer: 'annotations' });
  ink.dimension(`${key}-dt`, A, C, v >= 0 ? 24 : -24, `Δ$t$ = ${num(tb - ta, 0)} s`, { op, size: 14 });
  ink.dimension(`${key}-dx`, C, B, v >= 0 ? 26 : -26, `Δ$x$ = ${num(v * (tb - ta), 0)} m`, { op, size: 14 });
}

// ------------------------------------------------------------ the scene

/** The always-present base: track A, number line, origin. */
function base(ink, o = {}) {
  track(ink, 'trackA', 0, { op: o.trackOp ?? 1, draw: o.trackDraw ?? 1 });
  numberLine(ink, { op: o.nlOp ?? 1, draw: o.nlDraw ?? 1, origin: o.origin ?? 0 });
}

// --------------------------------------------------------------- the rule

const SIM_DT_BUILD = 0.5;

function resetSim(S, { x0 = S.sim.x0, v = S.sim.v, dt = S.sim.dt, flag = S.sim.flag } = {}) {
  S.sim = {
    ...S.sim, x0, v, dt, flag, x: x0, t: 0, steps: [{ t: 0, x: x0 }], running: false, acc: 0,
    lastSubst: '', arrive: null, message: S.sim.keepMessage ? S.sim.message : '', messageOk: null, stepFrom: null, stepAnim: 0,
  };
}

function ruleTokens(S) {
  const a = analyse(S.rule);
  const valid = a.ok && a.dims.m === 1 && a.dims.s === 0;
  return valid ? S.rule : CORRECT_RULE;
}

function stepSim(S) {
  const sim = S.sim;
  const tokens = ruleTokens(S);
  const env = { x: sim.x, v: sim.v, dt: sim.dt };
  const nx = evaluate(tokens, env);
  sim.stepFrom = sim.x;
  sim.stepAnim = 0;
  sim.lastSubst = substitution(tokens, env, nx);
  // Arrival at the flag (interpolated inside the tick).
  if (sim.flag !== null && sim.arrive === null) {
    const a = sim.x - sim.flag, b = nx - sim.flag;
    if (a === 0 || a * b < 0 || (b === 0 && a !== 0)) sim.arrive = sim.t + (b === a ? 0 : (a / (a - b)) * sim.dt);
  }
  sim.x = nx;
  sim.t = +(sim.t + sim.dt).toFixed(6);
  sim.steps.push({ t: sim.t, x: nx });
}

const panel = createRulePanel({
  setX0(S, v) {
    resetSim(S, { x0: v });
  },
  setV(S, v) {
    resetSim(S, { v });
  },
  ruleChanged(S) {
    S.ruleOk = false;
    S.sim.message = '';
    S.sim.messageOk = null;
    resetSim(S);
  },
  test(S) {
    resetSim(S, { x0: 1, v: 1, dt: SIM_DT_BUILD });
    const j = judge(S.rule, { x0: 1, v: 1, dt: SIM_DT_BUILD, n: 8 });
    S.tests = (S.tests ?? 0) + 1;
    if (!j.xs.length) {
      S.sim.message = j.message;
      S.sim.messageOk = false;
      return;
    }
    S.sim.pending = j;
    S.sim.running = true;
    S.sim.limit = 8;
    S.sim.message = '<span class="muted">Running your rule…</span>';
    S.sim.messageOk = null;
  },
  step(S) {
    if (S.sim.t >= T_MAX - 1e-9) resetSim(S);
    stepSim(S);
    S.stepsTaken = (S.stepsTaken ?? 0) + 1;
  },
  run(S) {
    resetSim(S);
    S.sim.running = true;
    S.sim.limit = Math.round(5 / S.sim.dt);
    S.sim.message = '';
    S.sim.messageOk = null;
  },
  reset(S) {
    resetSim(S);
  },
});

function tickSim(S, dt) {
  const sim = S.sim;
  sim.stepAnim = Math.min(1, (sim.stepAnim ?? 1) + dt / 0.35);
  if (!sim.running) return;
  sim.acc += dt;
  const period = Math.max(sim.dt, 0.05) * (sim.dt >= 0.25 ? 1 : 1);
  while (sim.acc >= period && sim.running) {
    sim.acc -= period;
    stepSim(S);
    const n = sim.steps.length - 1;
    const out = sim.x < -1.6 || sim.x > 10.5;
    // Challenges end shortly after the cart reaches the flag.
    const settled = sim.flag !== null && sim.arrive !== null && sim.t >= sim.arrive + 0.6;
    if (n >= sim.limit || out || settled) {
      sim.running = false;
      if (sim.pending) {
        const j = sim.pending;
        sim.pending = null;
        sim.message = j.message;
        sim.messageOk = j.correct;
        if (j.correct) S.ruleOk = true;
        else if ((S.tests ?? 0) >= 3) sim.message += ` <span class="hint">Hint: the new position is the old one plus the distance moved in one tick.</span>`;
      }
      S.onRunEnd?.(S);
    }
  }
}

/** Draw the stage for the rule and challenge chapters. */
function drawSim(ink, S, t, o = {}) {
  const sim = S.sim;
  base(ink);
  graphAxes(ink, 1);
  if (sim.flag !== null && sim.flag !== undefined) ink.flag('flag', sim.flag, o.flagLabel ?? null);
  if (o.expected) {
    graphLine(ink, 'g-exp', 1, 1, 'dashed', { t1: T_MAX });
    motionDots(ink, 'exp', 1, 1, 0, T_MAX, { op: 0.35, cls: 'dot-faint' });
  }
  // Learner's run: ghosts at each 0.5 s, graph polyline.
  const pts = sim.steps.filter((s) => s.t <= T_MAX + 1e-9 || o.longGraph);
  const every = Math.max(1, Math.round(0.5 / sim.dt));
  sim.steps.forEach((s, i) => {
    if (i % every !== 0 || i === sim.steps.length - 1) return;
    cartAt(ink, `run-g${i}`, s.x, 0, { ghost: true, op: 0.6 });
  });
  sim.steps.forEach((s, i) => {
    if (i % every !== 0) return;
    if (s.t <= T_MAX + 1e-9) graphDot(ink, `run-gd${i}`, clamp(s.x, -1, 9), s.t, { cls: 'dot-blue' });
  });
  if (pts.length > 1) ink.poly('run-line', pts.map((s) => GBm(clamp(s.x, -1, 9.2), Math.min(s.t, T_MAX + 0.3))), 'blue', { layer: 'vectors' });
  // The cart, with the last step drawn as an arrow (step mode).
  const showX = sim.stepFrom !== null && sim.stepAnim < 1 && !sim.running ? lerp(sim.stepFrom, sim.x, easeOut(sim.stepAnim)) : sim.x;
  cartAt(ink, 'cartA', showX, 0);
  // Balloon on the right: the step arrow uses the space to the left.
  ink.balloon('bA', { x: showX + 0.85, y: 1.1 }, 'A', { x: showX + 0.3, y: 0.45 });
  projection(ink, 'projA', showX, 0, { op: 0.8 });
  if (o.stepArrow && sim.stepFrom !== null && Math.abs(sim.x - sim.stepFrom) > 0.01) {
    const y = 0.85;
    ink.arrow('step-arrow', { x: sim.stepFrom, y }, { x: sim.x, y }, 'blue', { layer: 'vectors' });
    ink.text('step-lbl', { x: (sim.stepFrom + sim.x) / 2, y }, `$v$Δ$t$ = ${num(sim.x - sim.stepFrom, 2)} m`, { dy: -10, size: 15, cls: 'blue-tx' });
  }
  clock(ink, sim.t);
}

// ---------------------------------------------------------------- lesson

export const lesson1 = {
  id: 'lesson-1',
  title: 'Describing Motion',
  cam: CAM.pos,
  pad: 34,
  panels: { rule: panel },
  state: () => ({
    cartX: 2.5, origin: 0, preds: [], scrubT: 0.6, scrubSeen: new Set(), vC: 0.5, answer: null,
    rule: [], ruleOk: false, tests: 0, stepsTaken: 0, ch1: false, ch2: false,
    sim: { x0: 1, v: 1, dt: SIM_DT_BUILD, x: 1, t: 0, steps: [{ t: 0, x: 1 }], running: false, acc: 0, flag: null, message: '', messageOk: null, lastSubst: '', stepFrom: null, stepAnim: 1 },
  }),
  chapters: [
    // ================================================================ 0
    {
      id: 'intro', title: 'Describing Motion', short: 'Intro', num: '',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: `<div class="title-card">
          <div class="eyebrow">Lesson 1 · Kinematics</div>
          <h1>Describing Motion</h1>
          <p class="sub">Position, time and velocity — the language every later lesson is written in.</p>
          <button class="begin" data-action="next">Begin <span aria-hidden="true">›</span></button>
          <div class="meta">About 8 minutes · Interactive · No prior physics needed</div>
        </div>`,
        draw({ ink }, t) {
          track(ink, 'trackA', 0, { draw: ramp(t, 0.2, 1.6), op: 0.9 });
          const x = 1.2 + 0.9 * ((t * 0.55) % 8);
          const op = ramp(t, 1.2, 0.8) * 0.9;
          motionDots(ink, 'td', 1.2, 1.8, 0, Math.min(4, (x - 1.2) / 1.8), { op: op * 0.5 });
          cartAt(ink, 'cartA', x, 0, { op });
        },
      }],
    },
    // ================================================================ 1
    {
      id: 'where', title: 'Where?', short: 'Where?', num: '1',
      beats: [
        {
          kind: 'watch', dur: 6.5, cam: CAM.close,
          caption: [[0, 'Before we can describe motion, we need a way to say <em>where</em> something is.']],
          draw({ ink }, t) {
            track(ink, 'trackA', 0, { draw: ramp(t, 0.1, 1.6) });
            const x = lerp(-0.9, 2.5, easeOut(clamp((t - 1.3) / 3.2)));
            cartAt(ink, 'cartA', x, 0, { op: ramp(t, 1.1, 0.5) });
          },
        },
        {
          kind: 'watch', dur: 9, cam: CAM.pos,
          caption: [
            [0, 'Choose a reference point — the <b>origin O</b> — and a positive direction.'],
            [4.2, 'The <b>position</b> $x$ is the signed distance from O. Here, $x$ = 2.5 m.'],
          ],
          draw({ ink }, t) {
            track(ink, 'trackA', 0);
            cartAt(ink, 'cartA', 2.5, 0);
            numberLine(ink, { draw: ramp(t, 0.6, 2.2) });
            projection(ink, 'projA', 2.5, 0, { draw: ramp(t, 3.4, 0.8) });
            positionDim(ink, 2.5, 0, { op: ramp(t, 4.2, 0.6) });
          },
        },
        {
          kind: 'do', cam: CAM.pos,
          caption: 'Positions are read off the number line, in metres.',
          prompt: 'Drag the cart to $x$ = 6 m.',
          success: 'Exactly 6 m from the origin.',
          enter(S) { S.cartX = S.cartX ?? 2.5; },
          draw({ ink, S }) {
            base(ink, { origin: S.origin });
            cartAt(ink, 'cartA', S.cartX, 0, { accent: true });
            projection(ink, 'projA', S.cartX, 0);
            positionDim(ink, S.cartX, S.origin);
          },
          handles: (S) => [{ key: 'cart', p: { x: S.cartX, y: 0.335 }, r: 34, cursor: 'ew-resize', drag: (S2, p) => { S2.cartX = clamp(snap(p.x, 0.1), -1, 9); } }],
          done: (S) => Math.abs(S.cartX - S.origin - 6) < 0.051,
          skip(S) { S.cartX = 6; },
        },
        {
          kind: 'do', cam: CAM.pos,
          caption: 'The origin is ours to choose.',
          prompt: 'Now drag the origin O to the right, past the cart.',
          success: (S) => `The cart hasn’t moved, yet now $x$ = ${num(S.cartX - S.origin, 1)} m. Negative just means “on the negative side of O”.`,
          draw({ ink, S }) {
            base(ink, { origin: S.origin });
            cartAt(ink, 'cartA', S.cartX, 0);
            projection(ink, 'projA', S.cartX, 0);
            positionDim(ink, S.cartX, S.origin);
          },
          handles: (S) => [{ key: 'origin', p: { x: S.origin, y: NL_Y }, r: 26, cursor: 'ew-resize', drag: (S2, p) => { S2.origin = clamp(snap(p.x, 0.5), -1, 9); } }],
          done: (S) => S.cartX - S.origin < -0.45,
          skip(S) { S.origin = Math.min(9, S.cartX + 1.5); },
        },
        {
          kind: 'watch', dur: 7, cam: CAM.pos,
          caption: [
            [0, 'Position depends on where we put the origin. It is a label we choose — the motion itself doesn’t care.'],
            [3.6, 'Let’s put O back, and start the cart at $x$ = 1 m.'],
          ],
          draw({ ink, S }, t) {
            const o = lerp(S.origin, 0, easeInOut(clamp((t - 1) / 2)));
            const x = lerp(S.cartX, 1, easeInOut(clamp((t - 3.6) / 2.2)));
            base(ink, { origin: o });
            cartAt(ink, 'cartA', x, 0);
            projection(ink, 'projA', x, 0);
            positionDim(ink, x, o);
          },
        },
      ],
    },
    // ================================================================ 2
    {
      id: 'when', title: 'When?', short: 'When?', num: '2',
      beats: [
        {
          kind: 'watch', dur: 9, cam: CAM.pos,
          caption: [[0, 'Motion is position changing with time.'], [2.4, 'Let’s take a snapshot every half second.']],
          draw({ ink }, t) {
            base(ink);
            const tau = clamp(t - 2.4, 0, T_MAX);
            ghosts(ink, 'A', 1, 1, 0, tau, { op: 1 });
            cartAt(ink, 'cartA', 1 + tau, 0);
            clock(ink, tau, { op: ramp(t, 1.8, 0.5) });
          },
        },
        {
          kind: 'watch', dur: 9, cam: CAM.pos,
          caption: [
            [0, 'Keep only the dots: this is a <b>motion diagram</b>.'],
            [3.4, 'The time between dots is always the same, so the gaps show how fast the cart moves — here 0.5 m every 0.5 s.'],
          ],
          draw({ ink }, t) {
            base(ink);
            const g = 1 - ramp(t, 0.3, 1.2);
            for (let k = 0; k <= 8; k++) cartAt(ink, `A-g${k}`, 1 + k * 0.5, 0, { ghost: true, op: 0.55 * g });
            motionDots(ink, 'A', 1, 1, 0, T_MAX, { labels: true, labelOp: (k) => ramp(t, 1.4 + k * 0.12, 0.3) });
            ink.text('A-tunit', { x: 1 + 4 + 0.45, y: 0.335 }, '$t$ (s)', { op: ramp(t, 2.6, 0.4), dy: -13, size: 13, anchor: 'start', cls: 'mid' });
            ink.dimension('gap', { x: 1, y: 0.335 }, { x: 1.5, y: 0.335 }, -44, '0.5 m', { op: ramp(t, 3.6, 0.5), size: 14 });
            ink.dimension('gap2', { x: 3, y: 0.335 }, { x: 3.5, y: 0.335 }, -44, '0.5 m', { op: ramp(t, 4.4, 0.5), size: 14 });
            cartAt(ink, 'cartA', 5, 0, { op: 1 - ramp(t, 0.3, 1.2) });
            clock(ink, 4, { op: 1 - ramp(t, 0, 0.6) });
          },
        },
        {
          kind: 'do', cam: CAM.two, continueLabel: 'Reveal',
          caption: 'Cart B starts at the same place as A, but moves <b>twice as fast</b>.',
          prompt: (S) => `Predict: click on B’s track where B will be at $t$ = ${['0.5', '1.0', '1.5'][Math.min(2, S.preds.length)]} s.${S.preds.length ? ' <span class="muted">(click a marker to remove it)</span>' : ''}`,
          success: 'Prediction locked in. Let’s run B and see.',
          enter(S) { S.preds = S.preds ?? []; },
          draw({ ink, S }, t) {
            base(ink);
            motionDots(ink, 'A', 1, 1, 0, T_MAX, { labels: true });
            balloonFor(ink, 'bA', 'A', 1, 0);
            track(ink, 'trackB', LANE_B, { draw: ramp(t, 0, 0.9) });
            cartAt(ink, 'cartB', 1, LANE_B, { op: ramp(t, 0.5, 0.4) });
            balloonFor(ink, 'bB', 'B', 1, LANE_B, { op: ramp(t, 0.7, 0.4) });
            predMarkers(ink, S);
          },
          click(S, p) {
            if (Math.abs(p.y - (LANE_B + 0.35)) > 0.9) return;
            const hit = S.preds.findIndex((x) => Math.abs(x - p.x) < 0.18);
            if (hit >= 0) { S.preds.splice(hit, 1); return; }
            if (S.preds.length < 3) S.preds.push(clamp(snap(p.x, 0.05), -1, 9.5));
          },
          done: (S) => S.preds.length === 3,
          skip(S) { S.preds = [1.6, 2.4, 3.2]; },
        },
        {
          kind: 'watch', dur: 7.5, cam: CAM.two,
          caption: (S, t) => {
            if (t < 3.6) return 'B covers 1 m every half second…';
            const err = predError(S);
            if (!Number.isFinite(err)) return 'B’s dots are 1 m apart — twice A’s gaps, because it moves twice as far in the same time.';
            return err < 0.16
              ? `All three predictions within ${Math.max(5, Math.round(err * 100 / 5) * 5)} cm — spot on. B’s gaps are twice A’s, because it moves twice as far in the same time.`
              : `B’s dots are 1 m apart — twice A’s gaps, because it moves twice as far in the same time. Your predictions were off by up to ${num(err, 1)} m.`;
          },
          draw({ ink, S }, t) {
            base(ink);
            motionDots(ink, 'A', 1, 1, 0, T_MAX, { labels: true });
            balloonFor(ink, 'bA', 'A', 1, 0);
            track(ink, 'trackB', LANE_B);
            const tau = clamp(t - 0.6, 0, T_MAX);
            ghosts(ink, 'B', 1, 2, LANE_B, tau);
            cartAt(ink, 'cartB', 1 + 2 * tau, LANE_B);
            balloonFor(ink, 'bB', 'B', 1, LANE_B);
            predMarkers(ink, S, tau);
            clock(ink, tau);
          },
        },
      ],
    },
    // ================================================================ 3
    {
      id: 'graphs', title: 'From diagram to graph', short: 'Graphs', num: '3',
      beats: [
        {
          kind: 'watch', dur: 10.5, cam: CAM.graphA,
          caption: [
            [0, 'Let time run <b>downward</b>, starting at O.'],
            [2.8, 'Now drop each snapshot of A down to the row of its own time…'],
            [7.2, '…and the dots fall on a straight line.'],
          ],
          draw({ ink }, t) {
            base(ink);
            track(ink, 'trackB', LANE_B, { op: 1 - ramp(t, 0, 0.8) });
            motionDots(ink, 'A', 1, 1, 0, T_MAX, { labels: true, labelOp: () => 1 - ramp(t, 2, 0.6) });
            cartAt(ink, 'cartA', 5, 0);
            graphAxes(ink, 0, { draw: ramp(t, 0.6, 1.8), rows: ramp(t, 1.8, 0.8) });
            const g = G(0);
            for (let k = 0; k <= 8; k++) {
              const t0 = 2.8 + k * 0.48;
              const u = ramp(t, t0, 0.55, easeIn2);
              const x = 1 + k * 0.5;
              if (u <= 0) continue;
              const top = { x, y: 0.335 };
              const bot = g(x, k * 0.5);
              ink.line(`drop-${k}`, top, lerpP(top, bot, u), 'drop', { layer: 'annotations' });
              graphDot(ink, `gdot-${k}`, x, k * 0.5, { g, op: ramp(t, t0 + 0.45, 0.2) });
            }
            graphLine(ink, 'gA', 1, 1, 'ink heavy', { g, draw: ramp(t, 7.3, 1.6) });
          },
        },
        {
          kind: 'watch', dur: 8, cam: (S, t) => (t < 0.5 ? CAM.graphA : CAM.graphB), camDur: 0.01,
          caption: [[0, 'Physicists turn this picture on its side:'], [4.4, 'time to the right, position up. This is the <b>position–time graph</b>, $x$($t$).']],
          draw({ ink }, t) {
            // Camera and graph move together, so this beat drives its own framing.
            const u = ramp(t, 1.0, 3.2, easeInOut);
            ink.frame(lerpCam(CAM.graphA, CAM.graphB, ramp(t, 0.4, 3.8)), 34);
            base(ink);
            motionDots(ink, 'A', 1, 1, 0, T_MAX, { op: 0.9 });
            cartAt(ink, 'cartA', 5, 0);
            graphAxes(ink, u, { rows: 1 });
            const g = G(u);
            for (let k = 0; k <= 8; k++) {
              ink.line(`drop-${k}`, { x: 1 + k * 0.5, y: 0.335 }, G(0)(1 + k * 0.5, k * 0.5), 'drop', { op: 1 - ramp(t, 0, 0.8), layer: 'annotations' });
              graphDot(ink, `gdot-${k}`, 1 + k * 0.5, k * 0.5, { g });
            }
            graphLine(ink, 'gA', 1, 1, 'ink heavy', { g });
            ink.balloon('gbA', V.add(g(4.4, 3.4), { x: -0.55, y: 0.55 }), 'A', g(4.4, 3.4), { op: ramp(t, 4.6, 0.5) });
          },
        },
        {
          kind: 'do', cam: CAM.graphB,
          caption: 'Every point on the line is one moment: a time, and where the cart was then.',
          prompt: 'Drag the time marker along the graph. The cart follows.',
          success: 'Notice: the line slopes upward, but the cart only ever moves left and right. A graph is <b>not a picture of the path</b>.',
          draw({ ink, S }) {
            const tt = S.scrubT;
            const x = 1 + tt;
            base(ink);
            graphAxes(ink, 1);
            graphLine(ink, 'gA', 1, 1, 'ink heavy');
            ink.balloon('gbA', V.add(GBm(4.4, 3.4), { x: -0.55, y: 0.55 }), 'A', GBm(4.4, 3.4));
            const P = GBm(x, tt);
            ink.line('ph-v', GBm(-1, tt), GBm(9, tt), 'accent-thin', { layer: 'annotations' });
            ink.line('ph-h', P, { x: GBm(0, 0).x, y: P.y }, 'dashed', { layer: 'annotations' });
            ink.text('ph-xl', P, `$x$ = ${num(x, 1)} m`, { dx: -10, dy: -12, anchor: 'end', size: 15, cls: 'accent-tx' });
            ink.circle('ph-p', P, 5.5, 'dot-accent', { layer: 'vectors' });
            cartAt(ink, 'cartA', x, 0);
            projection(ink, 'projA', x, 0);
            ink.circle('ph-nl', { x, y: NL_Y }, 4.5, 'dot-accent', { layer: 'labels' });
            positionDim(ink, x, 0);
            clock(ink, tt);
          },
          handles: (S) => [{ key: 'time', p: GBm(-1, S.scrubT), r: 26, cursor: 'ew-resize', drag: (S2, p) => {
            S2.scrubT = clamp(snap(GBm.inverse(p).t, 0.05), 0, T_MAX);
            S2.scrubSeen.add(Math.round(S2.scrubT));
          } }],
          done: (S) => S.scrubSeen.size >= 4,
          skip(S) { [0, 1, 2, 3, 4].forEach((k) => S.scrubSeen.add(k)); },
        },
      ],
    },
    // ================================================================ 4
    {
      id: 'velocity', title: 'How fast?', short: 'How fast?', num: '4',
      beats: [
        {
          kind: 'watch', dur: 9.5, cam: CAM.graphB,
          caption: [
            [0, 'How fast is A? Compare how much its position changes with how much time passes.'],
            [4.6, 'That ratio is the <b>velocity</b>, $v$ = Δ$x$ / Δ$t$ = 2 m / 2 s = 1 m/s — the <b>slope</b> of the graph.'],
          ],
          draw({ ink }, t) {
            base(ink);
            graphAxes(ink, 1);
            graphLine(ink, 'gA', 1, 1, 'ink heavy');
            ink.balloon('gbA', V.add(GBm(4.4, 3.4), { x: -0.55, y: 0.55 }), 'A', GBm(4.4, 3.4));
            slopeTriangle(ink, 'triA', 1, 1, 1, 3, { op: ramp(t, 1.2, 0.8) });
            motionDots(ink, 'A', 1, 1, 0, T_MAX, { op: 0.9 });
            cartAt(ink, 'cartA', 5, 0);
          },
        },
        {
          kind: 'watch', dur: 6.5, cam: CAM.graphB,
          caption: [[0, 'B moves 2 m every second.'], [2.6, 'Its line is <b>steeper</b>: $v$ = 2 m/s. Steeper line, faster cart.']],
          draw({ ink }, t) {
            base(ink);
            graphAxes(ink, 1);
            graphLine(ink, 'gA', 1, 1, 'ink heavy', { op: 0.35 });
            graphLine(ink, 'gB', 1, 2, 'ink heavy', { draw: ramp(t, 0.4, 1.6) });
            ink.balloon('gbA', V.add(GBm(4.4, 3.4), { x: -0.55, y: 0.55 }), 'A', GBm(4.4, 3.4), { op: 0.5 });
            ink.balloon('gbB', V.add(GBm(6, 2.5), { x: -0.6, y: 0.5 }), 'B', GBm(6, 2.5), { op: ramp(t, 1.6, 0.4) });
            slopeTriangle(ink, 'triB', 1, 2, 1, 2, { op: ramp(t, 2.4, 0.6) });
            motionDots(ink, 'A', 1, 1, 0, T_MAX, { op: 0.4 });
            cartAt(ink, 'cartA', 5, 0, { op: 0.35 });
          },
        },
        {
          kind: 'do', cam: CAM.graphB,
          caption: 'Here is a new cart, C, starting at $x$ = 6 m. Its motion follows its line.',
          prompt: 'Drag the end of C’s line to give it a velocity of <b>−1.5 m/s</b>.',
          success: 'A line sloping <b>down</b> means a <b>negative velocity</b>: C moves toward −$x$ — even while its position is still positive.',
          draw({ ink, S }, t) {
            const v = S.vC;
            base(ink);
            graphAxes(ink, 1);
            graphLine(ink, 'gC', 6, v, 'blue heavy');
            const tEnd = endT(6, v);
            ink.text('gC-v', GBm(6 + v * tEnd * 0.55, tEnd * 0.55), `$v$ = ${num(v, 1)} m/s`, { dy: v >= 0 ? 26 : -14, dx: 8, size: 16, cls: 'blue-tx', anchor: 'start' });
            ink.balloon('gbC', V.add(GBm(6, 0), { x: 0.65, y: 0.6 }), 'C', GBm(6, 0.08));
            // C on the track: loop its motion so the line and the motion stay linked.
            const tau = Math.min((t % 5.5), tEnd);
            motionDots(ink, 'C', 6, v, 0, tEnd, { op: 0.55 });
            cartAt(ink, 'cartC', 6 + v * tau, 0);
            balloonFor(ink, 'bC', 'C', 6 + v * tau, 0);
            clock(ink, tau);
          },
          handles: (S) => {
            const tEnd = endT(6, S.vC);
            return [{ key: 'slope', p: GBm(6 + S.vC * tEnd, tEnd), r: 26, cursor: 'move', drag: (S2, p) => {
              const q = GBm.inverse(p);
              const tq = Math.max(0.8, Math.min(T_MAX, q.t));
              S2.vC = clamp(snap((q.x - 6) / tq, 0.1), -2.5, 2.5);
            } }];
          },
          done: (S) => Math.abs(S.vC + 1.5) < 0.05,
          skip(S) { S.vC = -1.5; },
        },
        {
          kind: 'do', cam: CAM.graphB,
          caption: (S) => (S.answer && S.answer !== 'pos'
            ? 'Look at the slopes: P rises 2 m every second, Q only 0.5 m. Same place, different speeds. Try again.'
            : 'Two carts, P and Q. Their lines cross at $t$ = 2 s.'),
          prompt: 'At $t$ = 2 s, the two carts have the same…',
          choices: [
            { id: 'pos', label: 'position', correct: true },
            { id: 'vel', label: 'velocity' },
            { id: 'both', label: 'position and velocity' },
          ],
          answered: (S) => S.answer,
          choose(S, id) { S.answer = id; },
          success: 'Right. Where lines cross, the carts are at the same place at the same time — but their slopes, their velocities, differ.',
          draw({ ink, S }) {
            base(ink);
            graphAxes(ink, 1);
            graphLine(ink, 'gP', 0, 2, 'ink heavy');
            graphLine(ink, 'gQ', 3, 0.5, 'ink heavy');
            ink.balloon('gbP', V.add(GBm(7, 3.5), { x: -0.7, y: 0.45 }), 'P', GBm(7, 3.5));
            ink.balloon('gbQ', V.add(GBm(4.75, 3.5), { x: 0.4, y: -0.6 }), 'Q', GBm(4.75, 3.5));
            const X = GBm(4, 2);
            ink.line('cross-v', GBm(-1, 2), X, 'dashed', { layer: 'annotations' });
            ink.line('cross-h', { x: GBm(0, 0).x, y: X.y }, X, 'dashed', { layer: 'annotations' });
            ink.circle('cross', X, 7, 'ring-accent', { layer: 'vectors' });
            const wrong = S.answer && S.answer !== 'pos';
            slopeTriangle(ink, 'triP', 0, 2, 0.5, 1.5, { op: wrong ? 1 : 0 });
            slopeTriangle(ink, 'triQ', 3, 0.5, 2.5, 3.5, { op: wrong ? 1 : 0 });
            cartAt(ink, 'cartP', 4, 0);
            ink.balloon('bP', { x: 3.25, y: 1.05 }, 'P', { x: 3.75, y: 0.45 });
            ink.balloon('bQ', { x: 4.75, y: 1.05 }, 'Q', { x: 4.25, y: 0.45 });
            clock(ink, 2);
          },
          done: (S) => S.answer === 'pos',
          skip(S) { S.answer = 'pos'; },
        },
      ],
    },
    // ================================================================ 5
    {
      id: 'rule', title: 'The rule', short: 'The rule', num: '5',
      beats: [
        {
          kind: 'watch', dur: 10, cam: CAM.graphB,
          caption: [
            [0, 'How does a simulation move a cart? It doesn’t know where the cart will be.'],
            [4.2, 'It repeats one <b>rule</b>, tick after tick: from where the cart is now, take one small step, $v$·Δ$t$.'],
          ],
          draw({ ink }, t) {
            base(ink);
            graphAxes(ink, 1, { op: 0.35 });
            const n = clamp(Math.floor((t - 4.2) / 1.2) + 1, 0, 4);
            const within = clamp(((t - 4.2) % 1.2) / 0.45);
            const xFrom = 1 + 0.5 * Math.max(0, n - 1);
            const x = n === 0 ? 1 : lerp(xFrom, 1 + 0.5 * n, easeOut(within));
            for (let k = 0; k < n; k++) ink.dot(`rd-${k}`, { x: 1 + 0.5 * k, y: 0.335 }, {});
            cartAt(ink, 'cartA', x, 0);
            if (n > 0) {
              ink.arrow('step', { x: xFrom, y: 0.95 }, { x: 1 + 0.5 * n, y: 0.95 }, 'blue', { draw: easeOut(within) });
              ink.text('stepl', { x: xFrom + 0.25, y: 0.95 }, '$v$Δ$t$', { dy: -10, size: 15, cls: 'blue-tx', op: ramp(within, 0.4, 0.2) });
            }
            clock(ink, n * 0.5, { op: ramp(t, 4, 0.4) });
          },
        },
        {
          kind: 'do', cam: CAM.graphB, panel: 'rule', panelMode: 'build',
          caption: 'Each tile is a quantity with a unit. The rule must give a <b>position</b>, in metres.',
          prompt: 'Build the rule for the cart’s next position, then press <b>Test the rule</b>.',
          success: 'That’s it: $x$ ← $x$ + $v$·Δ$t$. The simulation is now running <b>your</b> model.',
          enter(S) { S.sim.keepMessage = false; resetSim(S, { x0: 1, v: 1, dt: SIM_DT_BUILD, flag: null }); },
          tick: (S, dt) => tickSim(S, dt),
          draw({ ink, S }, t) { drawSim(ink, S, t, { expected: true }); },
          done: (S) => S.ruleOk,
          skip(S) { S.rule = [...CORRECT_RULE]; S.ruleOk = true; },
        },
        {
          kind: 'do', cam: CAM.graphB, panel: 'rule', panelMode: 'step',
          caption: 'Run the rule by hand. Watch the numbers go in and the new position come out.',
          prompt: (S) => `Press <b>Step</b> to advance one tick (${Math.min(3, S.stepsTaken - (S.stepBase ?? 0))} of 3).`,
          success: 'Read $x$, add $v$·Δ$t$, write the new $x$. That is all a simulation does — thousands of times a second.',
          enter(S) {
            if (!S.ruleOk) S.rule = [...CORRECT_RULE];
            resetSim(S, { x0: 1, v: 1, dt: SIM_DT_BUILD, flag: null });
            S.stepBase = S.stepsTaken;
          },
          tick: (S, dt) => tickSim(S, dt),
          draw({ ink, S }, t) { drawSim(ink, S, t, { stepArrow: true }); },
          done: (S) => S.stepsTaken - (S.stepBase ?? 0) >= 3,
        },
      ],
    },
    // ================================================================ 6
    {
      id: 'challenge', title: 'Your turn', short: 'Your turn', num: '6',
      beats: [
        {
          kind: 'do', cam: CAM.graphB, panel: 'rule', panelMode: 'challenge1',
          caption: (S) => arrivalCaption(S, 7, 3, 'Smaller ticks, smoother motion: Δ$t$ is now 0.05 s. The cart still moves by your rule.'),
          prompt: 'Reach the flag at $x$ = 7 m exactly when the clock reads <b>3.0 s</b>. Drag $v$ on the cart’s card, then <b>Run</b>.',
          success: 'Right on time: $v$ = Δ$x$ / Δ$t$ = 6 m / 3 s = 2 m/s.',
          enter(S) {
            if (!S.ruleOk) S.rule = [...CORRECT_RULE];
            S.onRunEnd = (S2) => { if (S2.sim.arrive !== null && Math.abs(S2.sim.arrive - 3) < 0.051 && Math.abs(S2.sim.x0 - 1) < 1e-6) S2.ch1 = true; };
            resetSim(S, { x0: 1, v: 1, dt: 0.05, flag: 7 });
          },
          leave(S) { S.onRunEnd = null; },
          tick: (S, dt) => tickSim(S, dt),
          draw({ ink, S }, t) { drawSim(ink, S, t, { flagLabel: '$x$ = 7 m' }); },
          done: (S) => S.ch1 || (S.sim.arrive !== null && Math.abs(S.sim.arrive - 3) < 0.051 && Math.abs(S.sim.x0 - 1) < 1e-6),
          skip(S) { S.ch1 = true; },
        },
        {
          kind: 'do', cam: CAM.graphB, panel: 'rule', panelMode: 'challenge2',
          caption: (S) => arrivalCaption(S, 0, 4, 'This time you choose the start too.'),
          prompt: 'Start at $x$ = 8 m and reach the origin at <b>4.0 s</b>. Set $x$ and $v$, then <b>Run</b>.',
          success: 'A negative velocity, $v$ = −2 m/s: your graph slopes down, and the cart moves toward −$x$.',
          enter(S) {
            if (!S.ruleOk) S.rule = [...CORRECT_RULE];
            S.onRunEnd = (S2) => { if (S2.sim.arrive !== null && Math.abs(S2.sim.arrive - 4) < 0.051 && Math.abs(S2.sim.x0 - 8) < 0.051) S2.ch2 = true; };
            resetSim(S, { x0: 2, v: 1, dt: 0.05, flag: 0 });
          },
          leave(S) { S.onRunEnd = null; },
          tick: (S, dt) => tickSim(S, dt),
          draw({ ink, S }, t) { drawSim(ink, S, t, { flagLabel: 'O' }); },
          done: (S) => S.ch2 || (S.sim.arrive !== null && Math.abs(S.sim.arrive - 4) < 0.051 && Math.abs(S.sim.x0 - 8) < 0.051),
          skip(S) { S.ch2 = true; },
        },
      ],
    },
    // ================================================================ 7
    {
      id: 'summary', title: 'Summary', short: 'Summary', num: '7',
      beats: [{
        kind: 'card', cam: CAM.title,
        card: `<div class="summary-card">
          <div class="eyebrow">Lesson 1 · Summary</div>
          <h2>Four ideas you now own</h2>
          <ol class="ideas">
            <li><span class="n">1</span><div><b>Position</b> <span class="m"><i>x</i></span> is measured from an origin you choose, with a sign and a unit.</div></li>
            <li><span class="n">2</span><div>A <b>motion diagram</b> takes snapshots at equal times; the gaps show how fast.</div></li>
            <li><span class="n">3</span><div><b>Velocity</b> is the slope of the position–time graph: <span class="m"><i>v</i> = Δ<i>x</i> / Δ<i>t</i></span>. Its sign is the direction.</div></li>
            <li><span class="n">4</span><div>A simulation repeats a <b>rule</b>: <span class="m"><i>x</i> ← <i>x</i> + <i>v</i>·Δ<i>t</i></span>. Units must agree.</div></li>
          </ol>
          <div class="next-row">
            <button class="ghost-btn" data-action="restart">Replay lesson</button>
            <div class="next-lesson"><span class="eyebrow">Next</span> Lesson 2 · Acceleration — when velocity changes <span class="soon">coming soon</span></div>
          </div>
        </div>`,
        draw() {},
      }],
    },
  ],
};

// ---------------------------------------------------------------- helpers

function easeIn2(u) {
  return u * u;
}

function lerpCam(a, b, u) {
  return { xmin: lerp(a.xmin, b.xmin, u), xmax: lerp(a.xmax, b.xmax, u), ymin: lerp(a.ymin, b.ymin, u), ymax: lerp(a.ymax, b.ymax, u) };
}

function endT(x0, v) {
  let t = T_MAX;
  if (v > 0) t = Math.min(t, (9 - x0) / v);
  if (v < 0) t = Math.min(t, (-1 - x0) / v);
  return t;
}

function predError(S) {
  const truth = [2, 3, 4];
  const sorted = [...S.preds].sort((a, b) => a - b);
  return sorted.length === 3 ? Math.max(...sorted.map((p, i) => Math.abs(p - truth[i]))) : Infinity;
}

function predMarkers(ink, S, tau = null) {
  const sorted = [...S.preds].sort((a, b) => a - b);
  const truth = [2, 3, 4];
  sorted.forEach((x, i) => {
    const y = LANE_B;
    ink.line(`pred-${i}`, { x, y: y + 0.02 }, { x, y: y + 0.72 }, 'accent', { layer: 'labels' });
    ink.circle(`pred-c${i}`, { x, y: y + 0.335 }, 5, 'ring-accent', { layer: 'labels' });
    ink.text(`pred-t${i}`, { x, y: y + 0.72 }, `${['0.5', '1.0', '1.5'][i]} s`, { dy: -7, size: 13, cls: 'accent-tx' });
    if (tau !== null && tau >= (i + 1) * 0.5) {
      const err = x - truth[i];
      if (Math.abs(err) > 0.15) {
        // Error shown as a dimension above the track, always on the top side.
        ink.dimension(`pred-e${i}`, { x: truth[i], y: y + 0.72 }, { x, y: y + 0.72 }, err > 0 ? -22 : 22, `${err > 0 ? '+' : '−'}${num(Math.abs(err), 1)} m`, { size: 13, cls: 'accent-dim', textCls: 'accent-tx' });
      } else {
        ink.text(`pred-ok${i}`, { x, y: y + 0.72 }, '✓', { dx: 20, dy: -4, size: 15, cls: 'ok-tx', anchor: 'start' });
      }
    }
  });
}

function arrivalCaption(S, flag, target, idle) {
  const sim = S.sim;
  if (sim.running && sim.arrive === null) return 'Running…';
  if (sim.steps.length <= 1) return idle;
  if (sim.arrive === null) return `The cart never reached the flag. It needs to cover ${num(Math.abs(flag - sim.x0), 0)} m — in which direction?`;
  const dtA = sim.arrive - target;
  if (Math.abs(dtA) < 0.051) return `Arrived at $t$ = ${num(sim.arrive, 2)} s.`;
  return `Arrived at $t$ = ${num(sim.arrive, 2)} s — ${dtA > 0 ? 'too slow' : 'too fast'}. What velocity covers ${num(Math.abs(flag - sim.x0), 1)} m in ${target} s?`;
}
