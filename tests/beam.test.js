import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveBeam } from '../src/lesson/s2/beam.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('single point load: reactions, shear jump, peak moment F·a·b/L', () => {
  const b = solveBeam({ L: 6, loads: [{ x: 2, F: 12 }] });
  near(b.Ay, 8);
  near(b.By, 4);
  near(b.V(1.5), 8);
  near(b.V(4), -4);
  near(b.V(2, -1), 8);
  near(b.V(2, 1), -4);
  near(b.M(1.5), 12);
  near(b.M(4), 8);
  near(b.M(2), 16);
  near(b.M(6), 0);
  const m = b.maxMoment();
  near(m.x, 2);
  near(m.M, (12 * 2 * 4) / 6);
});

test('midspan load gives FL/4', () => {
  const b = solveBeam({ L: 6, loads: [{ x: 3, F: 12 }] });
  near(b.maxMoment().M, 18);
});

test('two symmetric loads: V = 0 and constant M between them', () => {
  const b = solveBeam({ L: 6, loads: [{ x: 2, F: 12 }, { x: 4, F: 12 }] });
  near(b.Ay, 12);
  near(b.By, 12);
  near(b.V(3), 0);
  near(b.M(2), 24);
  near(b.M(3), 24);
  near(b.M(4), 24);
});

test('uniform load: qL/2 reactions, qL²/8 at midspan, dM/dx = V', () => {
  const b = solveBeam({ L: 6, q: 4 });
  near(b.Ay, 12);
  near(b.By, 12);
  near(b.M(3), 18);
  const m = b.maxMoment();
  near(m.x, 3);
  near(m.M, 18);
  const h = 1e-5;
  for (const x of [0.5, 1.7, 3.2, 5.1]) near((b.M(x + h) - b.M(x - h)) / (2 * h), b.V(x), 1e-6);
});

test('diagram samples include both sides of every jump', () => {
  const { shear, moment } = solveBeam({ L: 6, loads: [{ x: 2, F: 12 }] }).samples();
  assert.deepEqual(shear.map((p) => [p.x, p.v]), [[0, 8], [2, 8], [2, -4], [6, -4]]);
  assert.deepEqual(moment.map((p) => [p.x, p.v]), [[0, 0], [2, 16], [6, 0]]);
});
