// Entry point for the lesson player.

import { Player } from './core/player.js';
import { lesson1 } from './l1/lesson1.js';

const player = new Player(document.querySelector('.lx'), lesson1);

// Deep link to a chapter for review: ?chapter=graphs
const ch = new URLSearchParams(location.search).get('chapter');
if (ch) {
  const seg = player.segs.find((s) => s.ch.id === ch);
  if (seg) player.enter(seg.index);
}

// Exposed for automated checks and debugging.
window.lesson = player;
