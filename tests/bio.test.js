import { test } from 'node:test';
import assert from 'node:assert/strict';
import { n, close } from '../src/lesson/bio/kit.js';
import { p1 } from '../src/lesson/bio/p1-presion.js';
import { p2 } from '../src/lesson/bio/p2-profundidad.js';
import { p3 } from '../src/lesson/bio/p3-medir.js';
import { p4 } from '../src/lesson/bio/p4-gravedad.js';
import { p5, arterial, meanPressure } from '../src/lesson/bio/p5-arterial.js';
import { windkessel } from '../src/lesson/bio/scenes-pared.js';
import { etaBlood } from '../src/lesson/bio/scenes-flujo.js';
import { circulation } from '../src/lesson/bio/scenes-resistencia.js';
import { q1 } from '../src/lesson/bio/q1-elasticidad.js';
import { q2 } from '../src/lesson/bio/q2-amortiguador.js';
import { q3 } from '../src/lesson/bio/q3-laplace.js';
import { r1 } from '../src/lesson/bio/r1-caudal.js';
import { r2 } from '../src/lesson/bio/r2-bernoulli.js';
import { r3 } from '../src/lesson/bio/r3-regimen.js';
import { s1 } from '../src/lesson/bio/s1-poiseuille.js';
import { s2 } from '../src/lesson/bio/s2-redes.js';
import { s3 } from '../src/lesson/bio/s3-respiracion.js';

test('Spanish number format: decimal comma, thin-space thousands, true minus', () => {
  assert.equal(n(1.3, 2), '1,30');
  assert.equal(n(101325), '101 325');
  assert.equal(n(13504, 0), '13 504');
  assert.equal(n(-4, 0), '−4');
  assert.equal(n(0.007, 3), '0,007');
});

test('arterial waveform spans diastolic to systolic pressure', () => {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < 1000; i++) {
    const p = arterial(i / 1000);
    min = Math.min(min, p);
    max = Math.max(max, p);
  }
  assert.ok(Math.abs(max - 120) < 1.5, `max ${max}`);
  assert.ok(Math.abs(min - 80) < 2.5, `min ${min}`);
});

test('mean arterial pressure: the waveform mean sits below the simple average, near the ⅓ rule', () => {
  const m = meanPressure();
  assert.ok(m < 100 && Math.abs(m - (80 + 40 / 3)) < 4, `mean ${m}`);
});

test('learner-paced lessons: every watch beat of the presión block waits for the learner', () => {
  for (const lesson of [p1, p2, p3, p4, p5, q1, q2, q3, r1, r2, r3, s1, s2, s3]) {
    assert.equal(lesson.pauseAll, true);
    for (const ch of lesson.chapters) for (const b of ch.beats) if (b.kind === 'watch') assert.notEqual(b.pause, false);
  }
});

test('Windkessel: stiffer aorta raises systolic, lowers diastolic, widens pulse pressure', () => {
  const young = windkessel(1.1), stiff = windkessel(0.45);
  assert.ok(stiff.sys > young.sys + 20);
  assert.ok(stiff.dia < young.dia - 15);
  // Mean pressure is set by cardiac output × resistance, not by compliance.
  const mean = (w) => { let s = 0; for (let i = 0; i < 800; i++) s += w.at(i / 1000); return s / 800; };
  assert.ok(Math.abs(mean(young) - mean(stiff)) < 2);
  assert.ok(Math.abs(mean(young) - (70 / 0.8) * 1.12) < 2);
});

test('shock model: selective vasoconstriction restores pressure and brain flow', () => {
  const normal = circulation(83, 1);
  const bleed = circulation(50, 1);
  const comp = circulation(50, 1.8);
  assert.ok(bleed.P < normal.P * 0.7);
  assert.ok(comp.P > bleed.P * 1.4);
  assert.ok(comp.Q[0] > bleed.Q[0] * 1.4); // brain
  const total = (c) => c.Q.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total(comp) - 50) < 1e-9); // flows add up to the cardiac output
});

test('blood viscosity rises with hematocrit (≈ 3.7 mPa·s at 45 %)', () => {
  assert.ok(Math.abs(etaBlood(0.45) - 3.7) < 0.1);
  assert.ok(etaBlood(0.65) > etaBlood(0.45) && etaBlood(0.45) > etaBlood(0.25));
});

for (const lesson of [p1, p2, p3, p4, p5, q1, q2, q3, r1, r2, r3, s1, s2, s3]) {
  test(`${lesson.code}: generated practice problems are well-formed and reach mastery`, () => {
    const beat = lesson.chapters.find((c) => c.id === 'practice').beats[0];
    const S = lesson.state();
    beat.enter(S);
    const api = { player: { clearAnswers() {} } };
    const kinds = new Set();
    for (let k = 0; k < 40; k++) {
      const p = S.practice.prob;
      kinds.add(p.kind);
      assert.ok(p.ask && p.hint && p.solution.length, `${p.kind} is missing text`);
      if (p.choices) {
        assert.equal(p.choices.filter((c) => c.correct).length, 1, `${p.kind} needs one correct choice`);
        beat.act(S, p.choices.find((c) => c.correct).id, undefined, api);
      } else {
        assert.ok(Number.isFinite(p.number.answer), `${p.kind} answer`);
        beat.act(S, 'ans', p.number.answer, api);
      }
      assert.equal(S.practice.status, 'right');
      beat.act(S, 'next', undefined, api);
    }
    assert.ok(beat.done(S));
    assert.ok(kinds.size >= 4, `only ${[...kinds]}`);
  });

  test(`${lesson.code}: every guided number beat accepts its own answer`, () => {
    for (const ch of lesson.chapters) {
      for (const b of ch.beats) {
        if (b.answer === undefined || !b.act) continue;
        const S = lesson.state();
        b.act(S, 'x', b.answer * 1.5 + 7);
        assert.ok(!b.done(S));
        b.act(S, 'x', b.answer);
        assert.ok(b.done(S), `${ch.id}`);
      }
    }
  });
}

test('worked-example arithmetic quoted in the lessons', () => {
  assert.ok(close(1000 * 9.8 * 4 * 3e-4, 11.76, 0.001));                       // tímpano
  assert.ok(close(101325 + 700 * 9.8 * 8 + 1025 * 9.8 * 5, 206430, 1e-6));     // tanque
  assert.ok(close((1060 * 9.8 * 1.3) / 133.3, 101.3, 0.002));                   // corazón–tobillo
  assert.ok(close(0.5 * 1060 * (0.9 ** 2 - 0.3 ** 2), 381.6, 0.001));          // Bernoulli
  assert.ok(close((1060 * 0.3 * 0.025) / 0.004, 1987.5, 1e-9));                 // Reynolds
  assert.ok(close(0.3 ** 4, 0.0081, 1e-9));                                     // carótida
  assert.ok(close((760 * 3) / 3.05, 747.5, 0.0002));                            // Boyle
});
