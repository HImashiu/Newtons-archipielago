// Block interpreter. Each running script is a generator ("thread") advanced
// once per simulation frame, like Scratch: loops yield at the end of every
// iteration, `wait` yields until simulation time has passed. Blocks act on
// the live physics world, and expressions read live physics values, so the
// program and the simulation are one system.

import { tryCompile } from '../core/expr.js';
import * as V from '../core/vec.js';
import { BLOCKS, KEYS } from './defs.js';

export class BlockError extends Error {
  constructor(blockId, message) {
    super(message);
    this.blockId = blockId;
  }
}

/** Physics properties an expression may read, by entity kind. */
export const PROPS = {
  body: {
    x: (w, b) => b.pos.x, y: (w, b) => b.pos.y, vx: (w, b) => b.vel.x, vy: (w, b) => b.vel.y,
    speed: (w, b) => V.len(b.vel), ax: (w, b) => b._acc?.x ?? 0, ay: (w, b) => b._acc?.y ?? 0,
    mass: (w, b) => b.mass, m: (w, b) => b.mass, fx: (w, b) => w.netForce(b).x, fy: (w, b) => w.netForce(b).y,
    px: (w, b) => b.mass * b.vel.x, py: (w, b) => b.mass * b.vel.y,
    ke: (w, b) => 0.5 * b.mass * V.len2(b.vel),
  },
  spring: {
    k: (w, s) => s.k, rest: (w, s) => s.rest, length: (w, s) => w.springLength(s),
    stretch: (w, s) => w.springLength(s) - s.rest, force: (w, s) => w.springForce(s), damping: (w, s) => s.damping,
  },
  rod: { length: (w, r) => r.length, tension: (w, r) => r._tension ?? 0 },
  motor: { angle: (w, m) => m.angle, omega: (w, m) => m.omega, torque: (w, m) => m._torque ?? 0 },
  force: { fx: (w, f) => f.vec.x, fy: (w, f) => f.vec.y, mag: (w, f) => V.len(f.vec) },
  slider: {},
  segment: {},
};

export function makeScope(world) {
  return {
    lookup(name, prop) {
      if (prop === null) {
        if (name === 't' || name === 'time') return world.time;
        if (name === 'g') return V.len(world.gravity);
        const e = world.byName(name);
        if (e) throw new Error(`Use a property, e.g. ${name}.${Object.keys(PROPS[e.kind] ?? { x: 0 })[0] ?? 'x'}`);
        throw new Error(`Unknown name "${name}"`);
      }
      const e = world.byName(name);
      if (!e) throw new Error(`No object named "${name}"`);
      const getter = PROPS[e.kind]?.[prop];
      if (!getter) throw new Error(`${name} has no property "${prop}" (try ${Object.keys(PROPS[e.kind] ?? {}).join(', ')})`);
      return getter(world, e);
    },
  };
}

export class Interpreter {
  /**
   * host: { world, pause(), say(bodyId, text), plot(name, value), onStop() }
   */
  constructor(host) {
    this.host = host;
    this.threads = [];
    this.errors = new Map();
    this.condEdges = new Map();
    this.program = { scripts: [] };
  }

  get world() {
    return this.host.world;
  }

  setProgram(program) {
    this.program = program;
  }

  reset() {
    this.threads = [];
    this.errors = new Map();
    this.condEdges = new Map();
  }

  /** Blocks currently executing (for the editor's glow). */
  activeBlocks() {
    const ids = new Set();
    for (const t of this.threads) if (!t.done && t.current) ids.add(t.current);
    return ids;
  }

  hats(type) {
    return this.program.scripts.filter((s) => s.blocks[0]?.type === type);
  }

  startScript(s) {
    // Restart semantics: a hat that fires while its script runs restarts it.
    this.threads = this.threads.filter((t) => t.script !== s.id);
    const thread = { script: s.id, current: s.blocks[0].id, done: false };
    thread.gen = this.run(s.blocks.slice(1), thread);
    this.threads.push(thread);
  }

  /** Green flag. */
  start() {
    this.reset();
    for (const s of this.hats('whenFlag')) this.startScript(s);
    for (const s of this.hats('whenCond')) this.condEdges.set(s.id, this.safeCond(s.blocks[0]));
  }

  key(name) {
    for (const s of this.hats('whenKey')) if (s.blocks[0].args.key === name) this.startScript(s);
  }

  /** Feed world events (touch) in after a physics step. */
  handleEvents(events) {
    const w = this.world;
    for (const ev of events) {
      if (ev.type !== 'touch') continue;
      const ea = w.get(ev.a), eb = w.get(ev.b);
      for (const s of this.hats('whenTouch')) {
        const { a, b } = s.blocks[0].args;
        const match = (x, y) => x && x.name === a && (b === 'anything' || (b === 'ground' && y?.kind === 'segment') || y?.name === b);
        if (match(ea, eb) || match(eb, ea)) this.startScript(s);
      }
    }
  }

  safeCond(block) {
    try {
      return !!this.num(block, 'cond');
    } catch {
      return false;
    }
  }

  /** Advance every thread by one frame. Called before each physics step. */
  tick() {
    for (const s of this.hats('whenCond')) {
      const now = this.safeCond(s.blocks[0]);
      if (now && !this.condEdges.get(s.id)) this.startScript(s);
      this.condEdges.set(s.id, now);
    }
    for (const t of this.threads) {
      if (t.done) continue;
      try {
        const r = t.gen.next();
        if (r.done) t.done = true;
      } catch (e) {
        t.done = true;
        const id = e.blockId ?? t.current;
        this.errors.set(id, e.message);
      }
    }
    this.threads = this.threads.filter((t) => !t.done);
  }

  // -------------------------------------------------------------- values

  num(block, slot) {
    const src = block.args[slot];
    const c = tryCompile(src);
    if (c.error) throw new BlockError(block.id, `${slot}: ${c.error}`);
    let v;
    try {
      v = c.fn(makeScope(this.world));
    } catch (e) {
      throw new BlockError(block.id, e.message);
    }
    if (!Number.isFinite(v)) throw new BlockError(block.id, `${slot} is not a finite number`);
    return v;
  }

  entity(block, slot, kind) {
    const name = block.args[slot];
    const e = this.world.byName(name);
    if (!e || (kind && e.kind !== kind)) throw new BlockError(block.id, `No ${kind ?? 'object'} named "${name}"`);
    return e;
  }

  text(block, slot) {
    return String(block.args[slot] ?? '').replace(/\{([^}]+)\}/g, (_, src) => {
      const c = tryCompile(src);
      if (c.error) return `{${src}}`;
      try {
        const v = c.fn(makeScope(this.world));
        return Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : '—';
      } catch {
        return `{${src}}`;
      }
    });
  }

  // ------------------------------------------------------------ execution

  *run(blocks, thread) {
    for (const b of blocks) {
      thread.current = b.id;
      const def = BLOCKS[b.type];
      if (!def) continue;
      switch (b.type) {
        case 'wait': {
          const until = this.world.time + this.num(b, 's') - 1e-9;
          yield;
          while (this.world.time < until) yield;
          break;
        }
        case 'waitUntil':
          while (!this.num(b, 'cond')) yield;
          break;
        case 'repeat': {
          const n = Math.floor(this.num(b, 'n'));
          for (let i = 0; i < n; i++) {
            yield* this.run(b.children ?? [], thread);
            thread.current = b.id;
            yield;
          }
          break;
        }
        case 'forever':
          for (;;) {
            yield* this.run(b.children ?? [], thread);
            thread.current = b.id;
            yield;
          }
        case 'if':
          if (this.num(b, 'cond')) yield* this.run(b.children ?? [], thread);
          break;
        case 'stop':
          this.host.pause();
          return;
        default:
          this.exec(b);
      }
    }
  }

  exec(b) {
    const w = this.world;
    switch (b.type) {
      case 'setPos': {
        const e = this.entity(b, 'body', 'body');
        e.pos = { x: this.num(b, 'x'), y: this.num(b, 'y') };
        e._trail = [];
        break;
      }
      case 'setVel': {
        const e = this.entity(b, 'body', 'body');
        e.vel = { x: this.num(b, 'vx'), y: this.num(b, 'vy') };
        break;
      }
      case 'changeVel': {
        const e = this.entity(b, 'body', 'body');
        e.vel = V.add(e.vel, { x: this.num(b, 'dvx'), y: this.num(b, 'dvy') });
        break;
      }
      case 'launch': {
        const e = this.entity(b, 'body', 'body');
        e.vel = V.fromAngle(V.rad(this.num(b, 'angle')), this.num(b, 'speed'));
        break;
      }
      case 'hold': {
        const e = this.entity(b, 'body', 'body');
        e.vel = { x: 0, y: 0 };
        break;
      }
      case 'applyForce': {
        const e = this.entity(b, 'body', 'body');
        const f = { x: this.num(b, 'fx'), y: this.num(b, 'fy') };
        e._scriptF = e._scriptF ? V.add(e._scriptF, f) : f;
        break;
      }
      case 'impulse': {
        const e = this.entity(b, 'body', 'body');
        if (w.isDynamic(e)) e.vel = V.addScaled(e.vel, { x: this.num(b, 'jx'), y: this.num(b, 'jy') }, 1 / e.mass);
        break;
      }
      case 'setForce': {
        const f = this.entity(b, 'force', 'force');
        f.vec = { x: this.num(b, 'fx'), y: this.num(b, 'fy') };
        break;
      }
      case 'toggleForce': {
        const f = this.entity(b, 'force', 'force');
        f.enabled = b.args.on !== 'off';
        break;
      }
      case 'setGravity':
        w.gravity = { x: 0, y: -Math.abs(this.num(b, 'g')) };
        break;
      case 'setMass': {
        const e = this.entity(b, 'body', 'body');
        const m = this.num(b, 'm');
        if (!(m > 0)) throw new BlockError(b.id, 'Mass must be positive');
        e.mass = m;
        break;
      }
      case 'setK': {
        const s = this.entity(b, 'spring', 'spring');
        s.k = Math.max(0, this.num(b, 'k'));
        break;
      }
      case 'setDamping': {
        const s = this.entity(b, 'spring', 'spring');
        s.damping = Math.max(0, this.num(b, 'c'));
        break;
      }
      case 'setMotor': {
        const m = this.entity(b, 'motor', 'motor');
        m.omega = this.num(b, 'w');
        break;
      }
      case 'setFriction': {
        const e = this.entity(b, 'body', 'body');
        e.friction = Math.max(0, this.num(b, 'mu'));
        break;
      }
      case 'setBounce': {
        const e = this.entity(b, 'body', 'body');
        e.restitution = Math.max(0, Math.min(1, this.num(b, 'e')));
        break;
      }
      case 'say': {
        const e = this.entity(b, 'body', 'body');
        this.host.say(e.id, this.text(b, 'msg'));
        break;
      }
      case 'trace': {
        const e = this.entity(b, 'body', 'body');
        e.trail = b.args.on !== 'off';
        if (!e.trail) e._trail = [];
        break;
      }
      case 'plot':
        this.host.plot(String(b.args.name || 'value'), this.num(b, 'value'));
        break;
      default:
        break;
    }
  }
}

export { KEYS };
