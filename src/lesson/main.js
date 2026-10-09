// Entry point: picks a lesson (?lesson=…), wires the header course menu.

import { Player } from './core/player.js';
import { lesson1 } from './l1/lesson1.js';
import { statics } from './s2/statics.js';
import { p1 } from './bio/p1-presion.js';
import { p2 } from './bio/p2-profundidad.js';
import { p3 } from './bio/p3-medir.js';
import { p4 } from './bio/p4-gravedad.js';
import { p5 } from './bio/p5-arterial.js';
import { q1 } from './bio/q1-elasticidad.js';
import { q2 } from './bio/q2-amortiguador.js';
import { q3 } from './bio/q3-laplace.js';
import { r1 } from './bio/r1-caudal.js';
import { r2 } from './bio/r2-bernoulli.js';
import { r3 } from './bio/r3-regimen.js';
import { s1 } from './bio/s1-poiseuille.js';
import { s2 as s2r } from './bio/s2-redes.js';
import { s3 } from './bio/s3-respiracion.js';

export const COURSE = [
  { unit: 'Unit 1 · Kinematics', lessons: [{ id: 'motion', code: 'Lesson 1', title: 'Describing Motion', lesson: lesson1 }] },
  { unit: 'Statics · Beams', lessons: [{ id: 'beam', code: 'S.2–S.3', title: 'Inside a Beam', lesson: statics }] },
  {
    unit: 'Biofísica · Presión (Semana 7)',
    lessons: [
      { id: 'presion', code: '1.1', title: '¿Qué es la presión?', lesson: p1 },
      { id: 'profundidad', code: '1.2', title: 'Presión y profundidad', lesson: p2 },
      { id: 'manometros', code: '1.3', title: 'Medir la presión', lesson: p3 },
      { id: 'gravedad', code: '1.4', title: 'La sangre y la gravedad', lesson: p4 },
      { id: 'arterial', code: '1.5', title: 'Presión arterial', lesson: p5 },
    ],
  },
  {
    unit: 'Biofísica · La pared del vaso (Semana 8)',
    lessons: [
      { id: 'elasticidad', code: '2.1', title: q1.title, lesson: q1 },
      { id: 'amortiguador', code: '2.2', title: q2.title, lesson: q2 },
      { id: 'laplace', code: '2.3', title: q3.title, lesson: q3 },
    ],
  },
  {
    unit: 'Biofísica · Flujo (Semana 9)',
    lessons: [
      { id: 'caudal', code: '3.1', title: r1.title, lesson: r1 },
      { id: 'bernoulli', code: '3.2', title: r2.title, lesson: r2 },
      { id: 'regimen', code: '3.3', title: r3.title, lesson: r3 },
    ],
  },
  {
    unit: 'Biofísica · Resistencia (Semanas 10–11)',
    lessons: [
      { id: 'poiseuille', code: '4.1', title: s1.title, lesson: s1 },
      { id: 'redes', code: '4.2', title: s2r.title, lesson: s2r },
      { id: 'respiracion', code: '4.3', title: s3.title, lesson: s3 },
    ],
  },
];

// A lesson is chosen with a bare #anchor (works in shared links) or ?lesson=.
const params = new URLSearchParams(location.search);
const all = COURSE.flatMap((u) => u.lessons);
const ALIAS = { pared: 'elasticidad', flujo: 'caudal' };
const raw = location.hash.replace('#', '') || params.get('lesson');
const wanted = ALIAS[raw] ?? raw;
const entry = all.find((l) => l.id === wanted) ?? all[0];
window.addEventListener('hashchange', () => location.reload());

document.querySelector('.lx-lesson').textContent = entry.code;
document.querySelector('.lx-name').textContent = entry.title;
document.title = `${entry.title} — Scratch Physics`;
document.documentElement.lang = entry.lesson.lang ?? 'en';
if (entry.lesson.lang === 'es') document.querySelector('.lx-title').title = 'Todas las lecciones';

// Course menu (click the lesson title in the header).
const menu = document.querySelector('.course-menu');
const toggle = document.querySelector('.lx-title');
menu.innerHTML = COURSE.map((u) => `<div class="cm-unit">${u.unit}</div>${u.lessons.map((l) =>
  `<a class="cm-lesson${l === entry ? ' is-current' : ''}" href="#${l.id}"><span class="cm-code">${l.code}</span>${l.title}</a>`).join('')}`).join('');
toggle.addEventListener('click', (e) => {
  e.stopPropagation();
  menu.hidden = !menu.hidden;
  toggle.setAttribute('aria-expanded', String(!menu.hidden));
});
document.addEventListener('click', (e) => { if (!e.target.closest('.course-menu')) menu.hidden = true; });

const player = new Player(document.querySelector('.lx'), entry.lesson);

// Deep link to a chapter for review: ?chapter=graphs
const ch = params.get('chapter');
if (ch) {
  const seg = player.segs.find((s) => s.ch.id === ch);
  if (seg) player.enter(seg.index);
}

// Exposed for automated checks and debugging.
window.lesson = player;
