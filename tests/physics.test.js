import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/physics/world.js';
import * as V from '../src/core/vec.js';

const DT = 1 / 60;
const run = (world, seconds) => {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) world.step(DT);
};

test('free fall matches y = y0 - g t^2 / 2', () => {
  const w = new World();
  const b = w.addBody({ shape: 'ball', pos: { x: 0, y: 10 } });
  run(w, 1);
  assert.ok(Math.abs(b.pos.y - (10 - 9.81 / 2)) < 0.01, `y=${b.pos.y}`);
  assert.ok(Math.abs(b.vel.y + 9.81) < 0.01);
});

test('projectile: horizontal velocity is constant without drag', () => {
  const w = new World();
  const b = w.addBody({ pos: { x: 0, y: 50 }, vel: { x: 3, y: 4 } });
  run(w, 2);
  assert.ok(Math.abs(b.pos.x - 6) < 1e-6);
  assert.ok(Math.abs(b.pos.y - (50 + 8 - 0.5 * 9.81 * 4)) < 0.02);
});

test('free-body diagram sums to m·a', () => {
  const w = new World();
  w.addSegment({ a: { x: -10, y: 0 }, b: { x: 10, y: 0 }, friction: 0.5 });
  const box = w.addBody({ shape: 'box', pos: { x: 0, y: 0.2 }, w: 0.6, h: 0.4, mass: 2, friction: 0.5 });
  w.addForce({ body: box.id, vec: { x: 20, y: 0 } });
  run(w, 0.5);
  w.step(DT);
  const net = w.netForce(box);
  const ma = V.scale(box._acc, box.mass);
  assert.ok(Math.abs(net.x - ma.x) < 0.05, `net ${net.x} vs ma ${ma.x}`);
  assert.ok(Math.abs(net.y - ma.y) < 0.05, `net ${net.y} vs ma ${ma.y}`);
  // Coulomb friction: |f| = μN, N = mg.
  const N = box._fbd.get(`N:${w.segments[0].id}`).vec.y;
  const f = box._fbd.get(`f:${w.segments[0].id}`).vec.x;
  assert.ok(Math.abs(N - 2 * 9.81) < 0.05, `N=${N}`);
  assert.ok(Math.abs(f + 0.5 * N) < 0.05, `f=${f}`);
  // a = (F - μ m g) / m
  assert.ok(Math.abs(box._acc.x - (20 - 0.5 * 2 * 9.81) / 2) < 0.05);
});

test('static friction holds when push < μ m g', () => {
  const w = new World();
  w.addSegment({ a: { x: -10, y: 0 }, b: { x: 10, y: 0 }, friction: 0.5 });
  const box = w.addBody({ shape: 'box', pos: { x: 0, y: 0.2 }, mass: 2, friction: 0.5 });
  w.addForce({ body: box.id, vec: { x: 5, y: 0 } });
  run(w, 2);
  assert.ok(Math.abs(box.pos.x) < 1e-6, `x=${box.pos.x}`);
  // Static friction exactly balances the push.
  const f = box._fbd.get(`f:${w.segments[0].id}`).vec.x;
  assert.ok(Math.abs(f + 5) < 1e-3, `f=${f}`);
});

test('block on incline slides iff tan α > μ', () => {
  for (const [alphaDeg, slides] of [[20, false], [35, true]]) {
    const w = new World();
    const a = V.rad(alphaDeg);
    const dir = V.fromAngle(a);
    w.addSegment({ a: { x: 0, y: 0 }, b: V.scale(dir, 10), friction: 0.5 });
    const start = V.add(V.scale(dir, 5), V.scale(V.perp(dir), 0.2));
    const box = w.addBody({ shape: 'box', pos: start, angle: a, mass: 1, friction: 0.5, h: 0.4 });
    run(w, 1);
    const moved = V.dist(box.pos, start);
    assert.equal(moved > 0.05, slides, `α=${alphaDeg}° moved ${moved}`);
  }
});

test('spring oscillator period T = 2π√(m/k)', () => {
  const w = new World({ gravity: { x: 0, y: 0 } });
  const anchor = w.addBody({ shape: 'point', pos: { x: 0, y: 0 }, fixed: true });
  const m = w.addBody({ pos: { x: 1.5, y: 0 }, mass: 2, collide: false });
  w.addSpring({ a: anchor.id, b: m.id, k: 50, rest: 1 });
  const crossings = [];
  let prev = m.pos.x - 1;
  for (let i = 0; i < 600; i++) {
    w.step(DT);
    const x = m.pos.x - 1;
    if (prev < 0 && x >= 0) crossings.push(w.time);
    prev = x;
  }
  const T = crossings[2] - crossings[1];
  const expected = 2 * Math.PI * Math.sqrt(2 / 50);
  assert.ok(Math.abs(T - expected) / expected < 0.01, `T=${T}, expected ${expected}`);
  // Energy roughly conserved for an undamped spring.
  const e = w.energy();
  assert.ok(Math.abs(e.total - 0.5 * 50 * 0.25) < 0.1, `E=${e.total}`);
});

test('elastic collision of equal masses swaps velocities, conserves momentum', () => {
  const w = new World({ gravity: { x: 0, y: 0 } });
  const a = w.addBody({ pos: { x: -2, y: 0 }, vel: { x: 2, y: 0 }, restitution: 1, radius: 0.25 });
  const b = w.addBody({ pos: { x: 0, y: 0 }, restitution: 1, radius: 0.25 });
  run(w, 2);
  assert.ok(Math.abs(a.vel.x) < 0.02, `va=${a.vel.x}`);
  assert.ok(Math.abs(b.vel.x - 2) < 0.02, `vb=${b.vel.x}`);
  assert.ok(Math.abs(w.momentum().x - 2) < 1e-6);
});

test('perfectly inelastic collision keeps momentum', () => {
  const w = new World({ gravity: { x: 0, y: 0 } });
  const a = w.addBody({ pos: { x: -2, y: 0 }, vel: { x: 3, y: 0 }, mass: 2, restitution: 0 });
  const b = w.addBody({ pos: { x: 0, y: 0 }, mass: 1, restitution: 0 });
  run(w, 2);
  assert.ok(Math.abs(a.vel.x - 2) < 0.02 && Math.abs(b.vel.x - 2) < 0.02, `${a.vel.x} ${b.vel.x}`);
});

test('ball bounces with restitution e', () => {
  const w = new World();
  w.addSegment({ a: { x: -5, y: 0 }, b: { x: 5, y: 0 }, restitution: 1 });
  const b = w.addBody({ pos: { x: 0, y: 0.25 }, vel: { x: 0, y: -5 }, restitution: 0.6, radius: 0.25 });
  w.step(DT);
  // Rebounds at e·5 = 3 m/s, then gravity acts for the rest of the frame.
  assert.ok(Math.abs(b.vel.y - (3 - 9.81 * DT)) < 0.05, `vy=${b.vel.y}`);
});

test('pendulum rod keeps its length and small-angle period', () => {
  const w = new World();
  const pivot = w.addBody({ shape: 'point', pos: { x: 0, y: 0 }, fixed: true });
  const L = 2;
  const theta0 = 0.1;
  const bob = w.addBody({ pos: { x: L * Math.sin(theta0), y: -L * Math.cos(theta0) }, collide: false });
  w.addRod({ a: pivot.id, b: bob.id });
  const crossings = [];
  let prev = bob.pos.x;
  for (let i = 0; i < 60 * 8; i++) {
    w.step(DT);
    if (prev > 0 && bob.pos.x <= 0) crossings.push(w.time);
    prev = bob.pos.x;
    assert.ok(Math.abs(V.dist(bob.pos, pivot.pos) - L) < 1e-3);
  }
  const T = crossings[2] - crossings[1];
  const expected = 2 * Math.PI * Math.sqrt(L / 9.81);
  assert.ok(Math.abs(T - expected) / expected < 0.01, `T=${T} vs ${expected}`);
  // Rod tension at the bottom ≈ m g (1 + θ0²) for small swings.
  assert.ok(w.rods[0]._tension > 9 && w.rods[0]._tension < 10.5);
});

test('four-bar linkage keeps link lengths while the motor turns', () => {
  const w = new World({ gravity: { x: 0, y: 0 } });
  const O2 = w.addBody({ shape: 'point', pos: { x: 0, y: 0 }, fixed: true });
  const O4 = w.addBody({ shape: 'point', pos: { x: 4, y: 0 }, fixed: true });
  const A = w.addBody({ shape: 'point', pos: { x: 0, y: 1 }, mass: 0.5 });
  const B = w.addBody({ shape: 'point', pos: { x: 3.5, y: 2.5 }, mass: 0.5 });
  w.addRod({ a: O2.id, b: A.id, length: 1 });
  w.addRod({ a: A.id, b: B.id, length: 4 });
  w.addRod({ a: O4.id, b: B.id, length: 3 });
  w.relax(200);
  w.addMotor({ pivot: O2.id, body: A.id, omega: 2 });
  for (let i = 0; i < 400; i++) {
    w.step(DT);
    for (const r of w.rods) {
      const L = V.dist(w.get(r.a).pos, w.get(r.b).pos);
      assert.ok(Math.abs(L - r.length) < 5e-3, `${r.name} ${L} vs ${r.length}`);
    }
  }
});

test('slider constraint keeps body on its line', () => {
  const w = new World();
  const b = w.addBody({ shape: 'box', pos: { x: 0, y: 1 }, collide: false });
  w.addSlider({ body: b.id, origin: { x: 0, y: 1 }, dir: { x: 1, y: 0 } });
  w.addForce({ body: b.id, vec: { x: 2, y: 0 } });
  run(w, 1);
  assert.ok(Math.abs(b.pos.y - 1) < 1e-6);
  assert.ok(Math.abs(b.pos.x - 1) < 0.01, `x=${b.pos.x}`);
  const N = b._fbd.get(`N:${w.sliders[0].id}`).vec.y;
  assert.ok(Math.abs(N - 9.81) < 0.01, `N=${N}`);
});

test('touch events fire once per new contact', () => {
  const w = new World();
  w.addSegment({ a: { x: -5, y: 0 }, b: { x: 5, y: 0 }, restitution: 0 });
  w.addBody({ pos: { x: 0, y: 1 }, restitution: 0 });
  run(w, 2);
  assert.equal(w.events.filter((e) => e.type === 'touch').length, 1);
});

test('snapshot / restore round-trips state', () => {
  const w = new World();
  const b = w.addBody({ pos: { x: 1, y: 2 } });
  const snap = w.snapshot();
  run(w, 1);
  w.restore(snap);
  assert.deepEqual(w.get(b.id).pos, { x: 1, y: 2 });
  assert.equal(w.time, 0);
});
