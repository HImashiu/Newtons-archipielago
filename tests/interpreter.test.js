import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/physics/world.js';
import { Interpreter } from '../src/blocks/interpreter.js';
import { B, script } from '../src/blocks/defs.js';

const DT = 1 / 60;

function setup(program) {
  const world = new World({ gravity: { x: 0, y: 0 } });
  world.addBody({ name: 'ball', pos: { x: 0, y: 0 }, mass: 2 });
  const said = [];
  const host = { world, paused: false, pause() { this.paused = true; }, say: (id, t) => said.push(t), plot() {} };
  const interp = new Interpreter(host);
  interp.setProgram(program);
  interp.start();
  const frame = () => {
    interp.tick();
    world.step(DT);
    interp.handleEvents(world.events);
    world.events = [];
  };
  return { world, interp, host, said, frame };
}

test('flag script sets velocity and waits in simulation time', () => {
  const { world, frame } = setup({
    scripts: [script(B('whenFlag'), B('setVel', { body: 'ball', vx: '2', vy: '0' }), B('wait', { s: '1' }), B('hold', { body: 'ball' }))],
  });
  for (let i = 0; i < 30; i++) frame();
  assert.ok(Math.abs(world.byName('ball').vel.x - 2) < 1e-9);
  for (let i = 0; i < 40; i++) frame();
  assert.equal(world.byName('ball').vel.x, 0);
  assert.ok(Math.abs(world.byName('ball').pos.x - 2) < 0.05);
});

test('forever + push applies a continuous force (F = m a)', () => {
  const { world, frame } = setup({
    scripts: [script(B('whenFlag'), B('forever', {}, [B('applyForce', { body: 'ball', fx: '4', fy: '0' })]))],
  });
  for (let i = 0; i < 60; i++) frame();
  // a = F/m = 2 m/s² for 1 s.
  assert.ok(Math.abs(world.byName('ball').vel.x - 2) < 0.05, `${world.byName('ball').vel.x}`);
});

test('expressions read live physics (a spring written in blocks)', () => {
  const { world, frame } = setup({
    scripts: [script(B('whenFlag'), B('setPos', { body: 'ball', x: '1', y: '0' }), B('forever', {}, [B('applyForce', { body: 'ball', fx: '-8 * ball.x', fy: '0' })]))],
  });
  // ω = √(k/m) = 2 rad/s → half period π/2 s: the ball reaches x ≈ -1.
  for (let i = 0; i < Math.round((Math.PI / 2) / DT) + 1; i++) frame();
  assert.ok(Math.abs(world.byName('ball').pos.x + 1) < 0.06, `${world.byName('ball').pos.x}`);
});

test('repeat runs its body n times, one iteration per frame', () => {
  const { world, frame } = setup({
    scripts: [script(B('whenFlag'), B('repeat', { n: '3' }, [B('impulse', { body: 'ball', jx: '2', jy: '0' })]))],
  });
  for (let i = 0; i < 10; i++) frame();
  assert.ok(Math.abs(world.byName('ball').vel.x - 3) < 1e-9);
});

test('say interpolates expressions; errors are reported on the block', () => {
  const bad = B('setVel', { body: 'ball', vx: 'nope.x', vy: '0' });
  const { said, interp, frame } = setup({
    scripts: [
      script(B('whenFlag'), B('say', { body: 'ball', msg: 'm = {ball.mass} kg' })),
      script(B('whenFlag'), bad),
    ],
  });
  frame();
  assert.deepEqual(said, ['m = 2.00 kg']);
  assert.match(interp.errors.get(bad.id), /No object named "nope"/);
});

test('when-touch hats fire on contact', () => {
  const world = new World();
  world.addSegment({ a: { x: -5, y: 0 }, b: { x: 5, y: 0 }, restitution: 0 });
  world.addBody({ name: 'ball', pos: { x: 0, y: 1 }, restitution: 0 });
  const said = [];
  const interp = new Interpreter({ world, pause() {}, say: (id, t) => said.push(t), plot() {} });
  interp.setProgram({ scripts: [script(B('whenTouch', { a: 'ball', b: 'ground' }), B('say', { body: 'ball', msg: 'bump' }))] });
  interp.start();
  for (let i = 0; i < 60; i++) {
    interp.tick();
    world.step(DT);
    interp.handleEvents(world.events);
    world.events = [];
  }
  interp.tick();
  assert.deepEqual(said, ['bump']);
});

test('pause block stops the simulation host', () => {
  const { host, frame } = setup({ scripts: [script(B('whenFlag'), B('stop'))] });
  frame();
  assert.equal(host.paused, true);
});
