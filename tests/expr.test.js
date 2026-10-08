import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, tryCompile } from '../src/core/expr.js';

const scope = {
  lookup(name, prop) {
    if (name === 't') return 2;
    if (name === 'ball' && prop === 'x') return 3;
    if (name === 'ball' && prop === 'vy') return -1;
    throw new Error(`unknown ${name}.${prop}`);
  },
};

test('arithmetic and precedence', () => {
  assert.equal(compile('1 + 2 * 3')(scope), 7);
  assert.equal(compile('(1 + 2) * 3')(scope), 9);
  assert.equal(compile('2 ^ 3 ^ 2')(scope), 512);
  assert.equal(compile('-2 ^ 2')(scope), -4);
  assert.equal(compile('10 % 4')(scope), 2);
  assert.equal(compile('.5 + 1.5e1')(scope), 15.5);
});

test('names, properties and functions', () => {
  assert.equal(compile('-20 * ball.x')(scope), -60);
  assert.equal(compile('t * 2')(scope), 4);
  assert.ok(Math.abs(compile('sin(pi / 2)')(scope) - 1) < 1e-12);
  assert.equal(compile('max(1, ball.x, 2)')(scope), 3);
  assert.equal(compile('2·3 − 1')(scope), 5);
});

test('comparisons and logic yield 1 / 0', () => {
  assert.equal(compile('ball.x > 2 && ball.vy < 0')(scope), 1);
  assert.equal(compile('ball.x < 2 || !1')(scope), 0);
  assert.equal(compile('ball.x >= 3')(scope), 1);
});

test('constant detection', () => {
  assert.equal(compile('2 * pi').isConstant, true);
  assert.equal(compile('2 * ball.x').isConstant, false);
});

test('errors are reported, not thrown, by tryCompile', () => {
  assert.ok(tryCompile('2 +').error);
  assert.ok(tryCompile('foo(1)').error);
  assert.ok(tryCompile('3 $ 4').error);
  assert.ok(tryCompile('').error);
  assert.ok(tryCompile('ball.').error);
});
