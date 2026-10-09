// Entry point: picks a lesson (?lesson=…), wires the header course menu.

import { Player } from './core/player.js';
import { lesson1 } from './l1/lesson1.js';
import { statics } from './s2/statics.js';

export const COURSE = [
  { unit: 'Unit 1 · Kinematics', lessons: [{ id: 'motion', code: 'Lesson 1', title: 'Describing Motion', lesson: lesson1 }] },
  { unit: 'Statics · Beams', lessons: [{ id: 'beam', code: 'S.2–S.3', title: 'Inside a Beam', lesson: statics }] },
];

const params = new URLSearchParams(location.search);
const all = COURSE.flatMap((u) => u.lessons);
const entry = all.find((l) => l.id === params.get('lesson')) ?? all[0];

document.querySelector('.lx-lesson').textContent = entry.code;
document.querySelector('.lx-name').textContent = entry.title;
document.title = `${entry.title} — Scratch Physics`;

// Course menu (click the lesson title in the header).
const menu = document.querySelector('.course-menu');
const toggle = document.querySelector('.lx-title');
menu.innerHTML = COURSE.map((u) => `<div class="cm-unit">${u.unit}</div>${u.lessons.map((l) =>
  `<a class="cm-lesson${l === entry ? ' is-current' : ''}" href="?lesson=${l.id}"><span class="cm-code">${l.code}</span>${l.title}</a>`).join('')}`).join('');
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
