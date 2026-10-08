import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, evaluate, judge, unitName, render } from '../src/lesson/rule.js';

const env = { x0: 1, v: 1, dt: 0.5 };

test('units of tiles and products', () => {
  assert.equal(unitName(analyse(['x']).dims), 'm');
  assert.equal(unitName(analyse(['v']).dims), 'm/s');
  assert.equal(unitName(analyse(['v', '×', 'dt']).dims), 'm');
  assert.equal(unitName(analyse(['x', '×', 'v']).dims), 'm²/s');
});

test('adding unlike quantities is refused with an explanation', () => {
  const a = analyse(['x', '+', 'v']);
  assert.equal(a.ok, false);
  assert.match(a.error, /m \+ m\/s: you can't add a position and a velocity/);
});

test('incomplete and malformed sequences', () => {
  assert.equal(analyse(['x', '+']).complete, false);
  assert.match(analyse(['+', 'x']).error, /Start with a quantity/);
  assert.match(analyse(['x', 'v']).error, /Put \+ or ×/);
});

test('evaluation follows precedence (× before +)', () => {
  assert.equal(evaluate(['x', '+', 'v', '×', 'dt'], { x: 1, v: 2, dt: 0.5 }), 2);
  assert.equal(evaluate(['dt', '×', 'v', '+', 'x'], { x: 1, v: 2, dt: 0.5 }), 2);
});

test('judge accepts any equivalent correct rule', () => {
  assert.equal(judge(['x', '+', 'v', '×', 'dt'], env).correct, true);
  assert.equal(judge(['dt', '×', 'v', '+', 'x'], env).correct, true);
});

test('judge explains the consequence of wrong-but-valid rules', () => {
  assert.match(judge(['x'], env).message, /never moves/);
  assert.match(judge(['v', '×', 'dt'], env).message, /forgets where the cart already was/);
  assert.match(judge(['x', '+', 'x'], env).message, /runs away/);
  assert.match(judge(['x', '+', 'v', '×', 'dt', '+', 'v', '×', 'dt'], env).message, /moves at 2\.00 m\/s, not 1\.0 m\/s/);
  assert.match(judge(['v'], env).message, /gives m\/s/);
});

test('render with substitution', () => {
  assert.equal(render(['x', '+', 'v', '×', 'dt']), 'x + v × Δt');
  assert.equal(render(['x', '+', 'v', '×', 'dt'], { x: 1, v: 1, dt: 0.5 }), '1.00 + 1.00 × 0.50');
});
