// Curriculum registry. Tiers unlock visual complexity step by step.

import { beginner } from './beginner.js';

export const TIERS = [
  { tier: 1, name: 'Beginner', blurb: 'Points, objects, position, distance, motion and forces — one idea at a time.', levels: beginner },
  { tier: 2, name: 'Intermediate', blurb: 'Vectors, coordinate frames, trajectories, collisions, springs and interacting bodies.', levels: [], soon: true },
  { tier: 3, name: 'Advanced', blurb: 'Engineering mechanisms: linkages, rolling bodies, springs, dampers, frames and equations of motion.', levels: [], soon: true },
];

export const LEVELS = TIERS.flatMap((t) => t.levels);

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) ?? null;
}
