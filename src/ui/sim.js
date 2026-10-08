// Application state: the current level, its physics world, the learner's
// block program, run/pause/reset semantics, history for plots and goals.
//
// Editing while stopped edits the *setup*; pressing Run snapshots the setup,
// Reset restores it. Editing while running/paused changes the live world.

import { World } from '../physics/world.js';
import { Interpreter } from '../blocks/interpreter.js';
import { cloneProgram } from '../blocks/defs.js';
import * as store from './store.js';

export const FRAME = 1 / 60;

export const TIER_STYLE = { 1: 'soft', 2: 'technical', 3: 'drafting' };
export const TIER_NAMES = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

/** View options the learner can toggle, and the tier at which each unlocks. */
export const VIEW_OPTIONS = [
  { key: 'names', label: 'Names', tier: 1 },
  { key: 'values', label: 'Values on vectors', tier: 1 },
  { key: 'grid', label: 'Grid', tier: 1 },
  { key: 'coords', label: 'Coordinates', tier: 1 },
  { key: 'trails', label: 'Motion trail', tier: 1, options: [['', 'off'], ['dots', 'strobe dots'], ['line', 'line']] },
  { key: 'forces', label: 'Forces', tier: 1, options: [['off', 'off'], ['applied', 'pushes only'], ['all', 'free-body diagram']] },
  { key: 'velocity', label: 'Velocity', tier: 1 },
  { key: 'axes', label: 'Axes', tier: 2 },
  { key: 'acceleration', label: 'Acceleration', tier: 2 },
  { key: 'components', label: 'Components', tier: 2 },
  { key: 'net', label: 'Net force ΣF', tier: 2 },
  { key: 'prediction', label: 'Predicted path', tier: 2 },
  { key: 'dimensions', label: 'Dimensions', tier: 2 },
  { key: 'frames', label: 'Coordinate frames', tier: 2 },
  { key: 'angles', label: 'Angles', tier: 3 },
  { key: 'reactions', label: 'Support reactions', tier: 3 },
  { key: 'titleBlock', label: 'Title block', tier: 3 },
];

const BASE_FEATURES = {
  names: true, values: false, grid: false, coords: false, trails: '', forces: 'off', velocity: false,
  axes: false, acceleration: false, components: false, net: false, prediction: false, dimensions: false,
  frames: false, angles: false, reactions: false, titleBlock: false, plainLabels: false, scaleBar: false,
};

export class Sim {
  constructor() {
    this.listeners = new Map();
    this.world = new World();
    this.interp = new Interpreter(this);
    this.timeScale = 1;
    this.selection = null;
    this.hover = null;
    this.linked = new Set();
    this.acc = 0;
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }

  emit(type, data) {
    for (const fn of this.listeners.get(type) ?? []) fn(data);
  }

  get ctx() {
    return { world: this.world, state: this.state, sim: this, level: this.level };
  }

  get tier() {
    return this.level?.tier ?? 1;
  }

  // ---------------------------------------------------------------- levels

  load(level) {
    this.level = level;
    this.world = new World(level.world ?? {});
    this.state = level.build(this.world) ?? {};
    this.state.runtime = {};
    this.style = level.style ?? TIER_STYLE[level.tier];
    this.features = { ...BASE_FEATURES, plainLabels: level.tier === 1, ...level.features };
    this.options = VIEW_OPTIONS.filter((o) => o.tier <= level.tier || o.key in (level.features ?? {}));
    const saved = store.loadProgram(level.id);
    this.program = saved ?? cloneProgram(level.program ? level.program(this.state) : { scripts: [] });
    this.started = false;
    this.running = false;
    this.setupSnap = null;
    this.selection = null;
    this.hover = null;
    this.linked = new Set();
    this.history = [];
    this.blockPlots = new Map();
    this.bubbles = new Map();
    this.goalsDone = new Set(store.goalsFor(level.id));
    this.interp.reset();
    this.interp.setProgram(this.program);
    level.init?.(this.ctx);
    this.emit('level', level);
    this.emit('structure');
    this.emit('run');
  }

  resetProgram() {
    this.program = cloneProgram(this.level.program ? this.level.program(this.state) : { scripts: [] });
    store.saveProgram(this.level.id, null);
    this.interp.setProgram(this.program);
    this.emit('program');
  }

  setProgram(program) {
    this.program = program;
    this.interp.setProgram(program);
    store.saveProgram(this.level.id, program);
  }

  // ------------------------------------------------------------- transport

  begin() {
    if (this.started) return;
    this.setupSnap = this.world.snapshot();
    this.setupRuntime = JSON.stringify(this.state.runtime ?? {});
    for (const b of this.world.bodies) b._trail = [];
    this.started = true;
    this.history = [];
    this.interp.setProgram(this.program);
    this.interp.start();
    this.level.onStart?.(this.ctx);
  }

  run() {
    this.begin();
    this.running = true;
    this.acc = 0;
    this.emit('run');
  }

  pause() {
    this.running = false;
    this.emit('run');
  }

  toggle() {
    if (this.running) this.pause();
    else this.run();
  }

  reset() {
    if (this.setupSnap) this.world.restore(this.setupSnap);
    if (this.setupRuntime) this.state.runtime = JSON.parse(this.setupRuntime);
    for (const b of this.world.bodies) { b._trail = []; b._fbd = null; b._acc = null; }
    this.started = false;
    this.running = false;
    this.setupSnap = null;
    this.interp.reset();
    this.history = [];
    this.blockPlots = new Map();
    this.bubbles = new Map();
    this.level.onReset?.(this.ctx);
    this.emit('run');
    this.emit('structure');
  }

  stepOnce() {
    this.begin();
    this.running = false;
    this.frame();
    this.emit('run');
  }

  /** Advance by real elapsed seconds (called from requestAnimationFrame). */
  update(realDt) {
    if (!this.running) this.previewForces();
    if (this.running) {
      this.acc += Math.min(realDt, 0.1) * this.timeScale;
      let n = 0;
      while (this.acc >= FRAME && n < 6) {
        this.frame();
        this.acc -= FRAME;
        n++;
        if (!this.running) break;
      }
    }
    this.checkGoals();
    for (const [id, b] of this.bubbles) if (b.until < this.world.time && this.started) this.bubbles.delete(id);
  }

  /**
   * While stopped or paused, show the forces that would act right now by
   * stepping a throw-away copy of the world one frame. Learners can then see
   * and drag force vectors before pressing Run.
   */
  previewForces() {
    const f = this.features;
    if ((!f.forces || f.forces === 'off') && !f.net && !f.acceleration) return;
    const probe = new World();
    probe.restore(this.world.snapshot());
    probe.step(FRAME);
    for (const b of this.world.bodies) {
      const pb = probe.get(b.id);
      if (!pb) continue;
      b._fbd = pb._fbd;
      b._acc = pb._acc;
    }
  }

  frame() {
    this.blockPlots = new Map();
    this.interp.tick();
    this.world.step(FRAME);
    const events = this.world.events;
    this.world.events = [];
    this.interp.handleEvents(events);
    this.level.onEvents?.(this.ctx, events);
    this.level.onFrame?.(this.ctx);
    this.record();
  }

  // ------------------------------------------------------------- outputs

  say(bodyId, text) {
    this.bubbles.set(bodyId, { text, until: this.world.time + 2.5 });
  }

  plot(name, value) {
    this.blockPlots.set(name, value);
  }

  /** Series available to the plot: level-defined + block "plot" outputs. */
  series() {
    const out = [...(this.level.plot?.(this.ctx) ?? [])];
    for (const name of this.blockSeriesNames ?? []) out.push({ key: `blk:${name}`, label: name, block: true });
    return out;
  }

  record() {
    const t = this.world.time;
    const values = {};
    for (const s of this.level.plot?.(this.ctx) ?? []) {
      try {
        values[s.key] = s.get(this.ctx);
      } catch {
        values[s.key] = NaN;
      }
    }
    if (!this.blockSeriesNames) this.blockSeriesNames = new Set();
    for (const [name, v] of this.blockPlots) {
      values[`blk:${name}`] = v;
      this.blockSeriesNames.add(name);
    }
    this.history.push({ t, values });
    if (this.history.length > 60 * 40) this.history.splice(0, this.history.length - 60 * 40);
  }

  // --------------------------------------------------------------- goals

  checkGoals() {
    const goals = this.level?.goals ?? [];
    let changed = false;
    for (const g of goals) {
      if (this.goalsDone.has(g.id)) continue;
      let ok = false;
      try {
        ok = !!g.check(this.ctx);
      } catch {
        ok = false;
      }
      if (ok) {
        this.goalsDone.add(g.id);
        changed = true;
      }
    }
    if (changed) {
      store.saveGoals(this.level.id, [...this.goalsDone]);
      this.emit('goals');
    }
  }

  isComplete(level = this.level) {
    const done = level === this.level ? this.goalsDone : new Set(store.goalsFor(level.id));
    return (level.goals ?? []).length > 0 && level.goals.every((g) => done.has(g.id));
  }

  // ------------------------------------------------------------- editing

  select(id) {
    if (this.selection === id) return;
    this.selection = id;
    this.emit('select', id);
  }

  /** Call after adding/removing/renaming entities. */
  structureChanged() {
    this.emit('structure');
  }

  rename(entity, name) {
    const clean = String(name).trim().replace(/[^\wͰ-Ͽ]/g, '_');
    if (!clean || /^\d/.test(clean)) return false;
    if (this.world.all().some((e) => e !== entity && e.name === clean)) return false;
    const old = entity.name;
    entity.name = clean;
    // Keep the program pointing at the same object.
    const fix = (list) => list.forEach((b) => {
      for (const k of Object.keys(b.args)) {
        if (b.args[k] === old) b.args[k] = clean;
        else if (typeof b.args[k] === 'string') b.args[k] = b.args[k].replace(new RegExp(`\\b${old}\\.`, 'g'), `${clean}.`);
      }
      if (b.children) fix(b.children);
    });
    for (const s of this.program.scripts) fix(s.blocks);
    this.setProgram(this.program);
    this.emit('program');
    this.structureChanged();
    return true;
  }
}
