// Beginner levels: one idea at a time, soft visuals, plain-word labels.
// Points → objects → position → distance → motion → forces → gravity.

import { B, script } from '../blocks/defs.js';
import { V, ground, inRect, N } from './kit.js';

const dist = (w, a, b) => V.dist(w.get(a).pos, w.get(b).pos);

export const beginner = [
  // ---------------------------------------------------------------- B1
  {
    id: 'b1-point', tier: 1, fig: 'B1', title: 'A point', concept: 'Points',
    intro: [
      'A <b>point</b> marks a place. It has no size and no mass — it is only a location.',
      'Drag <b>P</b> onto the target. Then press <b>▶ Run</b> to run P’s little program on the left.',
    ],
    world: { gravity: { x: 0, y: 0 } },
    view: { xmin: -4, xmax: 4, ymin: -2.2, ymax: 2.8 },
    features: {},
    tools: ['select'],
    blocks: ['whenFlag', 'say', 'wait'],
    inspect: ['body.x', 'body.y'],
    gravityParam: false,
    build(w) {
      const P = w.addBody({ shape: 'point', name: 'P', pos: { x: -2, y: 0 }, collide: false, style: { protected: true } });
      return { P: P.id };
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('say', { body: 'P', msg: 'Hello! I just mark a place.' }))] }),
    zones: ({ world, state }) => [{ type: 'circle', key: 'target', c: { x: 2, y: 1 }, r: 0.25, label: 'target', reached: V.dist(world.get(state.P).pos, { x: 2, y: 1 }) < 0.2 }],
    goals: [
      { id: 'drag', text: 'Drag <b>P</b> onto the target.', check: ({ world, state }) => V.dist(world.get(state.P).pos, { x: 2, y: 1 }) < 0.2 },
      { id: 'run', text: 'Press <b>▶ Run</b> and read what P says.', check: ({ sim }) => sim.started && sim.world.time > 0.4 },
    ],
  },

  // ---------------------------------------------------------------- B2
  {
    id: 'b2-objects', tier: 1, fig: 'B2', title: 'Objects', concept: 'Size & mass',
    intro: [
      '<b>Objects</b> take up space and have <b>mass</b> (how much stuff they contain, in kilograms).',
      'Points don’t: watch the ball pass straight through point <b>P</b> — but bump into the box.',
      'Click the ball to change its mass, then run again.',
    ],
    view: { xmin: -5.2, xmax: 5.2, ymin: -0.8, ymax: 3.2 },
    features: { scaleBar: true },
    tools: ['select'],
    blocks: ['whenFlag', 'setVel', 'setMass', 'say', 'wait'],
    inspect: ['body.mass', 'body.radius', 'body.w', 'body.h'],
    gravityParam: false,
    build(w) {
      ground(w, { friction: 0.3, restitution: 0.3 });
      const ball = w.addBody({ shape: 'ball', name: 'ball', pos: { x: -4, y: 0.3 }, radius: 0.3, mass: 1, friction: 0.02, restitution: 0.5, style: { protected: true } });
      const box = w.addBody({ shape: 'box', name: 'box', pos: { x: 0, y: 0.4 }, w: 0.8, h: 0.8, mass: 1, friction: 0.4, restitution: 0.5, style: { protected: true } });
      const P = w.addBody({ shape: 'point', name: 'P', pos: { x: -2, y: 0.3 }, fixed: true, collide: false, locked: true });
      return { ball: ball.id, box: box.id, P: P.id };
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('setVel', { body: 'ball', vx: '4', vy: '0' }))] }),
    onEvents({ world, state }, events) {
      for (const e of events) {
        if (e.type === 'touch' && [e.a, e.b].includes(state.ball) && [e.a, e.b].includes(state.box)) state.runtime.hit = true;
      }
    },
    zones: ({ world, state }) => {
      const z = { xmin: 2.5, xmax: 4, ymin: 0, ymax: 1.1 };
      const box = world.get(state.box);
      return [{ type: 'rect', key: 'goal', ...z, label: 'goal', reached: inRect(box.pos, z) && V.len(box.vel) < 0.05 }];
    },
    goals: [
      { id: 'bump', text: 'Press <b>▶ Run</b>: the ball bumps the box (but passes through P).', check: ({ state }) => state.runtime.hit },
      {
        id: 'zone', text: 'Make the box slide into the goal. <i>Hint: a heavier ball hits harder.</i>',
        check: ({ world, state, sim }) => sim.started && inRect(world.get(state.box).pos, { xmin: 2.5, xmax: 4, ymin: 0, ymax: 1.1 }) && V.len(world.get(state.box).vel) < 0.05,
      },
    ],
    equations: ({ world, state }) => {
      const ball = world.get(state.ball), box = world.get(state.box);
      return [
        { key: 'm', label: 'ball', tex: `mass = ${N(ball.mass, 1)} kg`, refs: [ball.id] },
        { key: 'mb', label: 'box', tex: `mass = ${N(box.mass, 1)} kg`, refs: [box.id] },
      ];
    },
  },

  // ---------------------------------------------------------------- B3
  {
    id: 'b3-position', tier: 1, fig: 'B3', title: 'Position', concept: 'Where is it?',
    intro: [
      '<b>Position</b> says where something is. We measure it from the <b>origin</b> (0, 0): first how far <b>across</b> (x), then how far <b>up</b> (y), in metres.',
      'The dashed lines show the ball’s x and y. Drag it to (3, 2).',
    ],
    world: { gravity: { x: 0, y: 0 } },
    view: { xmin: -4.5, xmax: 4.5, ymin: -1.4, ymax: 3.8 },
    features: { grid: true, axes: true, coords: false },
    tools: ['select'],
    blocks: ['whenFlag', 'setPos', 'say', 'wait'],
    inspect: ['body.x', 'body.y'],
    gravityParam: false,
    build(w) {
      const ball = w.addBody({ shape: 'ball', name: 'ball', pos: { x: -2, y: 1 }, radius: 0.22, collide: false, style: { protected: true } });
      return { ball: ball.id };
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('setPos', { body: 'ball', x: '0', y: '0' }))] }),
    annotations: ({ world, state }) => [{ type: 'coord', key: 'c', p: world.get(state.ball).pos, ref: state.ball }],
    zones: ({ world, state }) => {
      const p = world.get(state.ball).pos;
      return [
        { type: 'circle', key: 'a', c: { x: 3, y: 2 }, r: 0.2, label: '(3, 2)', reached: V.dist(p, { x: 3, y: 2 }) < 0.12 },
        { type: 'circle', key: 'b', c: { x: -2, y: 3 }, r: 0.2, label: '(−2, 3)', reached: V.dist(p, { x: -2, y: 3 }) < 0.06 },
      ];
    },
    goals: [
      { id: 'drag', text: 'Drag the ball to position <b>(3, 2)</b>.', check: ({ world, state }) => V.dist(world.get(state.ball).pos, { x: 3, y: 2 }) < 0.12 },
      { id: 'block', text: 'Change the numbers in the <b>set position</b> block so ▶ Run puts the ball at <b>(−2, 3)</b>.', check: ({ world, state, sim }) => sim.started && V.dist(world.get(state.ball).pos, { x: -2, y: 3 }) < 0.06 },
    ],
    equations: ({ world, state }) => {
      const p = world.get(state.ball).pos;
      return [{ key: 'pos', label: 'ball position', tex: `($x$, $y$) = (${N(p.x)}, ${N(p.y)}) m`, refs: [state.ball] }];
    },
  },

  // ---------------------------------------------------------------- B4
  {
    id: 'b4-distance', tier: 1, fig: 'B4', title: 'Distance', concept: 'How far apart?',
    intro: [
      'The <b>distance</b> between two points is the length of the straight line joining them.',
      'Drag A and B. The dashed lines show how far <i>across</i> and how far <i>up</i> — the distance is always the longest side.',
    ],
    world: { gravity: { x: 0, y: 0 } },
    view: { xmin: -4.5, xmax: 4.5, ymin: -2.2, ymax: 3.3 },
    features: { grid: true },
    tools: ['select'],
    blocks: ['whenFlag', 'setPos', 'say', 'wait'],
    inspect: ['body.x', 'body.y'],
    gravityParam: false,
    build(w) {
      const A = w.addBody({ shape: 'point', name: 'A', pos: { x: -3, y: -1 }, collide: false, style: { protected: true } });
      const Bp = w.addBody({ shape: 'point', name: 'B', pos: { x: 0.5, y: 0.2 }, collide: false, style: { protected: true } });
      return { A: A.id, B: Bp.id };
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('say', { body: 'A', msg: '{hypot(B.x-A.x, B.y-A.y)} m to B' }))] }),
    annotations: ({ world, state }) => {
      const a = world.get(state.A).pos, b = world.get(state.B).pos;
      const corner = { x: b.x, y: a.y };
      const out = [];
      if (Math.abs(b.x - a.x) > 0.05 && Math.abs(b.y - a.y) > 0.05) {
        out.push({ type: 'refline', key: 'across', a, b: corner, cls: 'leg' });
        out.push({ type: 'refline', key: 'up', a: corner, b, cls: 'leg' });
        out.push({ type: 'note', key: 'acrossl', at: { x: (a.x + b.x) / 2, y: a.y - (b.y > a.y ? 0.35 : -0.25) }, text: `across ${N(Math.abs(b.x - a.x), 1)} m`, cls: 'muted' });
        out.push({ type: 'note', key: 'upl', at: { x: b.x + (b.x > a.x ? 0.12 : -0.12), y: (a.y + b.y) / 2 }, text: `up ${N(Math.abs(b.y - a.y), 1)} m`, cls: 'muted', align: b.x > a.x ? 'start' : 'end' });
      }
      out.push({ type: 'distance', key: 'd', a, b, text: `distance = ${N(V.dist(a, b))} m` });
      return out;
    },
    goals: [
      { id: 'four', text: 'Make the distance between A and B exactly <b>4.00 m</b>.', check: ({ world, state }) => Math.abs(dist(world, state.A, state.B) - 4) < 0.02 },
      {
        id: 'slant', text: 'Make it 4.00 m again — but with a <b>slanted</b> line (B higher than A). <i>Try 2.4 m across.</i>',
        check: ({ world, state }) => Math.abs(dist(world, state.A, state.B) - 4) < 0.02 && world.get(state.B).pos.y - world.get(state.A).pos.y > 0.5 && Math.abs(world.get(state.B).pos.x - world.get(state.A).pos.x) > 0.5,
      },
    ],
    equations: ({ world, state }) => {
      const a = world.get(state.A).pos, b = world.get(state.B).pos;
      return [{ key: 'd', label: 'distance', tex: `√(across² + up²) = √(${N(Math.abs(b.x - a.x), 1)}² + ${N(Math.abs(b.y - a.y), 1)}²) = ${N(V.dist(a, b))} m`, refs: ['d'] }];
    },
  },

  // ---------------------------------------------------------------- B5
  {
    id: 'b5-motion', tier: 1, fig: 'B5', title: 'Motion', concept: 'Speed = distance ÷ time',
    intro: [
      'When an object <b>moves</b>, its position changes with time. The dots are snapshots taken every ½ second: equal gaps mean a steady <b>speed</b>.',
      'This cart rolls on a frictionless track, so it keeps the speed you give it.',
    ],
    view: { xmin: -1.2, xmax: 8.2, ymin: -0.9, ymax: 2.6 },
    features: { trails: 'dots', velocity: true, values: true, scaleBar: true },
    strobe: 0.5,
    scales: { v: 0.45 },
    editVelocity: true,
    tools: ['select'],
    blocks: ['whenFlag', 'setVel', 'wait', 'hold', 'say'],
    inspect: ['body.vx', 'body.mass'],
    derived: ['speed'],
    gravityParam: false,
    build(w) {
      ground(w, { friction: 0, restitution: 0 });
      const cart = w.addBody({ shape: 'box', name: 'cart', pos: { x: 0, y: 0.25 }, w: 0.9, h: 0.5, friction: 0, trail: true, style: { wheels: true, protected: true }, locked: true });
      return { cart: cart.id };
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('setVel', { body: 'cart', vx: '1', vy: '0' }))] }),
    onStart({ world, state }) {
      state.runtime.x0 = world.get(state.cart).pos.x;
      state.runtime.arrive = null;
    },
    onFrame({ world, state }) {
      const c = world.get(state.cart);
      const rt = state.runtime;
      if (rt.arrive == null && rt.prevX < 6 && c.pos.x >= 6) rt.arrive = world.time - (c.pos.x - 6) / Math.max(1e-6, c.vel.x);
      rt.prevX = c.pos.x;
    },
    zones: ({ state }) => [{ type: 'rect', key: 'flag', xmin: 5.95, xmax: 6.05, ymin: 0, ymax: 1.6, label: 'flag  (x = 6 m)', reached: state.runtime.arrive != null }],
    goals: [
      { id: 't3', text: 'Make the cart reach the flag at exactly <b>3 s</b>.', check: ({ state }) => state.runtime.arrive != null && Math.abs(state.runtime.arrive - 3) < 0.08 },
      { id: 't15', text: 'Now make it arrive at <b>1.5 s</b>.', check: ({ state }) => state.runtime.arrive != null && Math.abs(state.runtime.arrive - 1.5) < 0.05 },
    ],
    equations: ({ world, state, sim }) => {
      const c = world.get(state.cart);
      const d = c.pos.x - (state.runtime.x0 ?? 0);
      const t = world.time;
      const rows = [{ key: 'v', label: 'speed', tex: `speed = distance ÷ time${sim.started && t > 0.05 ? ` = ${N(d)} m ÷ ${N(t)} s = ${N(d / t)} m/s` : ''}`, refs: [`vel:${c.id}`] }];
      if (state.runtime.arrive != null) rows.push({ key: 'arr', label: 'arrived', tex: `flag reached at $t$ = ${N(state.runtime.arrive)} s`, refs: ['flag'] });
      return rows;
    },
  },

  // ---------------------------------------------------------------- B6
  {
    id: 'b6-forces', tier: 1, fig: 'B6', title: 'Forces', concept: 'Pushes & pulls',
    intro: [
      'A <b>force</b> is a push or a pull, measured in newtons (N). Arrows show each force: longer arrow, stronger force.',
      '<b>Friction</b> pushes back against sliding. Drag the tip of the <b>push</b> arrow to change it.',
    ],
    view: { xmin: -1.6, xmax: 6.4, ymin: -1.2, ymax: 2.6 },
    features: { forces: 'all', values: true, scaleBar: true },
    scales: { f: 0.045 },
    forceSnap: 0.5,
    tools: ['select'],
    blocks: ['whenFlag', 'wait', 'toggleForce', 'setForce', 'say'],
    inspect: ['body.mass', 'body.friction', 'force.fx', 'force.enabled'],
    derived: ['speed', 'net force'],
    gravityParam: false,
    build(w) {
      ground(w, { friction: 0.5, restitution: 0 });
      const box = w.addBody({ shape: 'box', name: 'box', pos: { x: 0, y: 0.3 }, w: 0.8, h: 0.6, mass: 2, friction: 0.5, restitution: 0, locked: true, style: { protected: true } });
      const push = w.addForce({ body: box.id, name: 'push', vec: { x: 15, y: 0 }, style: { protected: true } });
      return { box: box.id, push: push.id };
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('wait', { s: '1' }), B('toggleForce', { force: 'push', on: 'off' }))] }),
    onFrame({ world, state }) {
      const box = world.get(state.box), push = world.get(state.push);
      if (push.enabled && V.len(box.vel) > 0.02 && push.vec.x >= 9.9 && push.vec.x <= 11 && Math.abs(push.vec.y) < 0.01) state.runtime.smallest = true;
    },
    zones: ({ world, state }) => {
      const z = { xmin: 3.5, xmax: 5, ymin: 0, ymax: 1 };
      const box = world.get(state.box);
      return [{ type: 'rect', key: 'zone', ...z, label: 'stop here', reached: inRect(box.pos, z) && V.len(box.vel) < 0.01 }];
    },
    goals: [
      { id: 'smallest', text: 'Find the <b>smallest push</b> that gets the box moving (it is between 10 N and 11 N).', check: ({ state }) => state.runtime.smallest },
      {
        id: 'stop', text: 'Make the box <b>stop</b> inside the zone. <i>Change the push or the wait time.</i>',
        check: ({ world, state, sim }) => sim.started && world.time > 0.5 && inRect(world.get(state.box).pos, { xmin: 3.5, xmax: 5, ymin: 0, ymax: 1 }) && V.len(world.get(state.box).vel) < 0.01,
      },
    ],
    equations: ({ world, state }) => {
      const box = world.get(state.box), push = world.get(state.push);
      const support = box.mass * Math.abs(world.gravity.y);
      const mu = Math.sqrt(box.friction * world.segments[0].friction);
      const fmax = mu * support;
      const p = push.enabled ? push.vec.x : 0;
      return [
        { key: 'fmax', label: 'friction can hold up to', tex: `${N(mu)} × ${N(support)} N = ${N(fmax)} N`, refs: [box.id] },
        { key: 'cmp', label: 'push vs. friction', tex: p > fmax ? `${N(p)} N > ${N(fmax)} N → it slides` : `${N(p)} N ≤ ${N(fmax)} N → friction wins`, refs: [state.push], ok: p > fmax },
      ];
    },
  },

  // ---------------------------------------------------------------- B7
  {
    id: 'b7-gravity', tier: 1, fig: 'B7', title: 'Gravity', concept: 'Falling',
    intro: [
      '<b>Gravity</b> pulls everything down. The pull on an object is its <b>weight</b> = mass × <i>g</i>. On Earth <i>g</i> = 9.81 m/s².',
      'Look at the snapshot dots: the gaps grow — falling things speed up.',
    ],
    view: { xmin: -2.5, xmax: 5.5, ymin: -0.7, ymax: 6.2 },
    features: { forces: 'all', values: true, trails: 'dots', scaleBar: true },
    strobe: 0.1,
    scales: { f: 0.08 },
    tools: ['select'],
    blocks: ['whenFlag', 'setGravity', 'setPos', 'wait', 'say', 'setMass'],
    inspect: ['body.mass', 'body.x', 'body.y'],
    derived: ['speed'],
    build(w) {
      ground(w, { friction: 0.8, restitution: 0.2 });
      w.addSegment({ a: { x: 2.5, y: 0 }, b: { x: 2.5, y: 0.6 }, name: 'basketL', style: { hatch: false }, restitution: 0.1 });
      w.addSegment({ a: { x: 3.5, y: 0.6 }, b: { x: 3.5, y: 0 }, name: 'basketR', style: { hatch: false }, restitution: 0.1 });
      const ball = w.addBody({ shape: 'ball', name: 'ball', pos: { x: 0, y: 5 }, radius: 0.22, mass: 1, restitution: 0.2, friction: 0.6, trail: true, style: { protected: true } });
      return { ball: ball.id };
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('say', { body: 'ball', msg: 'Here I go!' }))] }),
    onStart({ state }) {
      state.runtime.landed = null;
    },
    onFrame({ world, state }) {
      const b = world.get(state.ball);
      const rt = state.runtime;
      if (!rt.landed && b.pos.y < 0.5 && V.len(b.vel) < 0.3 && b.pos.x > 2.5 && b.pos.x < 3.5) {
        rt.landed = { t: world.time, g: -world.gravity.y };
        rt.landings = [...(rt.landings ?? []), rt.landed.g];
      }
    },
    zones: ({ state }) => [{ type: 'rect', key: 'basket', xmin: 2.5, xmax: 3.5, ymin: 0, ymax: 0.6, label: 'basket', reached: !!state.runtime.landed }],
    goals: [
      { id: 'drop', text: 'Drag the ball above the basket and ▶ Run to drop it in.', check: ({ state }) => (state.runtime.landings ?? []).length > 0 },
      { id: 'moon', text: 'Change gravity to the Moon’s (<b>1.62 m/s²</b>) and drop it in again. Watch the speed of the fall.', check: ({ state }) => (state.runtime.landings ?? []).some((g) => Math.abs(g - 1.62) < 0.02) },
    ],
    equations: ({ world, state }) => {
      const b = world.get(state.ball);
      const g = -world.gravity.y;
      const rows = [{ key: 'W', label: 'weight', tex: `mass × $g$ = ${N(b.mass, 1)} kg × ${N(g)} m/s² = ${N(b.mass * g)} N`, refs: [`fbd:${b.id}:W`] }];
      if (state.runtime.landed) rows.push({ key: 't', label: 'fall time', tex: `${N(state.runtime.landed.t)} s`, refs: ['basket'] });
      return rows;
    },
  },

  // ------------------------------------------------------------ playground
  {
    id: 'b8-playground', tier: 1, fig: 'B8', title: 'Playground', concept: 'Free play', sandbox: true,
    intro: [
      'Build anything you like. Pick a tool above the stage, then click in the scene: add balls, boxes and points, connect them with springs, and give them pushes.',
      'Program them with any block, press <b>▶ Run</b>, and <b>↺ Reset</b> to go back to your setup.',
    ],
    view: { xmin: -6, xmax: 6, ymin: -0.8, ymax: 5.2 },
    features: { forces: 'applied', trails: 'line', scaleBar: true },
    tools: ['select', 'ball', 'box', 'point', 'spring', 'force', 'pin', 'delete'],
    derived: ['speed', 'net force', 'length', 'stretch', 'force'],
    build(w) {
      ground(w, { friction: 0.4, restitution: 0.5 });
      w.addBody({ shape: 'ball', name: 'ball', pos: { x: -4, y: 0.3 }, radius: 0.3, trail: true, restitution: 0.7 });
      w.addBody({ shape: 'box', name: 'box', pos: { x: 1.5, y: 0.35 }, w: 0.7, h: 0.7, mass: 1 });
      const hook = w.addBody({ shape: 'point', name: 'hook', pos: { x: 4, y: 4.5 }, fixed: true });
      const bob = w.addBody({ shape: 'ball', name: 'bob', pos: { x: 4, y: 2.6 }, radius: 0.25, mass: 1, trail: true });
      w.addSpring({ a: hook.id, b: bob.id, k: 30, rest: 1.4, name: 'spring' });
      return {};
    },
    program: () => ({ scripts: [script(B('whenFlag'), B('setVel', { body: 'ball', vx: '4', vy: '5' }))] }),
    goals: [],
  },
];
