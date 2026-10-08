// Physics world: particles/rigid shapes integrated with substepped XPBD
// ("Small Steps in Physics Simulation", Macklin et al. 2019).
//
// Every force that acts on a body during a frame is recorded in that body's
// free-body diagram (body._fbd), averaged over the substeps. The renderer,
// inspector and equation panels all read those numbers, so what the learner
// sees is exactly what the integrator used.
//
// Entities are plain JSON-friendly objects. Runtime-only fields start with "_"
// and are skipped by snapshot().

import * as V from '../core/vec.js';

const DEFAULT_GRAVITY = { x: 0, y: -9.81 };

export const SHAPES = ['point', 'ball', 'box'];

export class World {
  constructor({ gravity = DEFAULT_GRAVITY, substeps = 20, iterations = 2, airDrag = 0 } = {}) {
    this.gravity = V.clone(gravity);
    this.substeps = substeps;
    this.iterations = iterations;
    this.airDrag = airDrag; // linear drag coefficient b in F = -b v (N·s/m)
    this.time = 0;
    this.nextId = 1;
    this.bodies = [];
    this.segments = [];
    this.springs = [];
    this.rods = [];
    this.sliders = [];
    this.motors = [];
    this.forces = [];
    this.events = [];
    this._prevPairs = new Set();
    this._contacts = [];
  }

  // ---------------------------------------------------------------- creation

  _id(prefix) {
    return `${prefix}${this.nextId++}`;
  }

  _uniqueName(base) {
    const taken = new Set(this.all().map((e) => e.name));
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
  }

  addBody(spec = {}) {
    const shape = spec.shape ?? 'ball';
    const body = {
      kind: 'body',
      id: spec.id ?? this._id('b'),
      name: this._uniqueName(spec.name ?? (shape === 'point' ? 'P' : shape === 'box' ? 'box' : 'ball')),
      shape,
      pos: V.clone(spec.pos ?? V.ZERO),
      vel: V.clone(spec.vel ?? V.ZERO),
      mass: spec.mass ?? 1,
      radius: spec.radius ?? (shape === 'point' ? 0.06 : 0.25),
      w: spec.w ?? 0.6,
      h: spec.h ?? 0.4,
      angle: spec.angle ?? 0,
      restitution: spec.restitution ?? 0.5,
      friction: spec.friction ?? 0.3,
      fixed: spec.fixed ?? false,
      collide: spec.collide ?? shape !== 'point',
      trail: spec.trail ?? false,
      color: spec.color ?? null,
      style: { ...(spec.style ?? {}) },
      locked: spec.locked ?? false, // learner cannot drag it
    };
    this.bodies.push(body);
    return body;
  }

  addSegment(spec) {
    const seg = {
      kind: 'segment',
      id: spec.id ?? this._id('s'),
      name: this._uniqueName(spec.name ?? 'ground'),
      a: V.clone(spec.a),
      b: V.clone(spec.b),
      friction: spec.friction ?? 0.4,
      restitution: spec.restitution ?? 0.4,
      style: { hatch: true, ...(spec.style ?? {}) },
      locked: spec.locked ?? true,
    };
    this.segments.push(seg);
    return seg;
  }

  addSpring(spec) {
    const a = this.get(spec.a);
    const b = this.get(spec.b);
    const spring = {
      kind: 'spring',
      id: spec.id ?? this._id('k'),
      name: this._uniqueName(spec.name ?? 'spring'),
      a: a.id,
      b: b.id,
      k: spec.k ?? 20,
      rest: spec.rest ?? V.dist(a.pos, b.pos),
      damping: spec.damping ?? 0,
      coils: spec.coils ?? 8,
      width: spec.width ?? 0.18,
      style: { ...(spec.style ?? {}) },
    };
    this.springs.push(spring);
    return spring;
  }

  addRod(spec) {
    const a = this.get(spec.a);
    const b = this.get(spec.b);
    const rod = {
      kind: 'rod',
      id: spec.id ?? this._id('r'),
      name: this._uniqueName(spec.name ?? 'rod'),
      a: a.id,
      b: b.id,
      length: spec.length ?? V.dist(a.pos, b.pos),
      rope: spec.rope ?? false,
      visible: spec.visible ?? true,
      style: { ...(spec.style ?? {}) },
    };
    this.rods.push(rod);
    return rod;
  }

  addSlider(spec) {
    const body = this.get(spec.body);
    const slider = {
      kind: 'slider',
      id: spec.id ?? this._id('l'),
      name: this._uniqueName(spec.name ?? 'slider'),
      body: body.id,
      origin: V.clone(spec.origin ?? body.pos),
      dir: V.norm(spec.dir ?? { x: 1, y: 0 }),
      min: spec.min ?? -Infinity,
      max: spec.max ?? Infinity,
      style: { ...(spec.style ?? {}) },
    };
    this.sliders.push(slider);
    return slider;
  }

  addMotor(spec) {
    const pivot = this.get(spec.pivot);
    const body = this.get(spec.body);
    const rel = V.sub(body.pos, pivot.pos);
    const motor = {
      kind: 'motor',
      id: spec.id ?? this._id('m'),
      name: this._uniqueName(spec.name ?? 'motor'),
      pivot: pivot.id,
      body: body.id,
      omega: spec.omega ?? 1,
      angle: V.angleOf(rel),
      radius: V.len(rel),
      enabled: spec.enabled ?? true,
      style: { ...(spec.style ?? {}) },
    };
    this.motors.push(motor);
    return motor;
  }

  addForce(spec) {
    const body = this.get(spec.body);
    const force = {
      kind: 'force',
      id: spec.id ?? this._id('f'),
      name: this._uniqueName(spec.name ?? 'F'),
      body: body.id,
      vec: V.clone(spec.vec ?? { x: 1, y: 0 }),
      enabled: spec.enabled ?? true,
      label: spec.label ?? null,
      style: { ...(spec.style ?? {}) },
    };
    this.forces.push(force);
    return force;
  }

  // ----------------------------------------------------------------- queries

  all() {
    return [
      ...this.bodies, ...this.segments, ...this.springs, ...this.rods,
      ...this.sliders, ...this.motors, ...this.forces,
    ];
  }

  get(idOrEntity) {
    if (idOrEntity && typeof idOrEntity === 'object') return idOrEntity;
    for (const list of this._lists()) {
      for (const e of list) if (e.id === idOrEntity) return e;
    }
    return null;
  }

  byName(name) {
    for (const list of this._lists()) {
      for (const e of list) if (e.name === name) return e;
    }
    return null;
  }

  _lists() {
    return [this.bodies, this.segments, this.springs, this.rods, this.sliders, this.motors, this.forces];
  }

  /** Remove an entity and everything that depends on it. */
  remove(id) {
    const e = this.get(id);
    if (!e) return;
    const drop = (list, pred) => list.filter((x) => !pred(x));
    const key = `${e.kind}s`;
    if (Array.isArray(this[key])) this[key] = this[key].filter((x) => x.id !== id);
    if (e.kind === 'body') {
      this.springs = drop(this.springs, (s) => s.a === id || s.b === id);
      this.rods = drop(this.rods, (r) => r.a === id || r.b === id);
      this.sliders = drop(this.sliders, (s) => s.body === id);
      this.motors = drop(this.motors, (m) => m.body === id || m.pivot === id);
      this.forces = drop(this.forces, (f) => f.body === id);
    }
  }

  invMass(b) {
    if (b.fixed || b._drag || b._motor || !(b.mass > 0)) return 0;
    return 1 / b.mass;
  }

  isDynamic(b) {
    return this.invMass(b) > 0;
  }

  springLength(s) {
    return V.dist(this.get(s.a).pos, this.get(s.b).pos);
  }

  /** Spring tension (N, positive when stretched) at the current state. */
  springForce(s) {
    const a = this.get(s.a), b = this.get(s.b);
    const d = V.sub(b.pos, a.pos);
    const L = V.len(d);
    const u = L > 1e-9 ? V.scale(d, 1 / L) : { x: 1, y: 0 };
    const vrel = V.dot(V.sub(b.vel, a.vel), u);
    return s.k * (L - s.rest) + s.damping * vrel;
  }

  netForce(b) {
    let f = { x: 0, y: 0 };
    if (b._fbd) for (const item of b._fbd.values()) f = V.add(f, item.vec);
    return f;
  }

  energy() {
    let kinetic = 0, gravity = 0, elastic = 0;
    for (const b of this.bodies) {
      if (b.fixed || !(b.mass > 0)) continue;
      kinetic += 0.5 * b.mass * V.len2(b.vel);
      gravity += -b.mass * V.dot(this.gravity, b.pos);
    }
    for (const s of this.springs) {
      const ext = this.springLength(s) - s.rest;
      elastic += 0.5 * s.k * ext * ext;
    }
    return { kinetic, gravity, elastic, total: kinetic + gravity + elastic };
  }

  momentum(ids = null) {
    let p = { x: 0, y: 0 };
    for (const b of this.bodies) {
      if (ids && !ids.includes(b.id)) continue;
      if (b.fixed || !(b.mass > 0)) continue;
      p = V.addScaled(p, b.vel, b.mass);
    }
    return p;
  }

  centerOfMass(ids = null) {
    let m = 0, c = { x: 0, y: 0 };
    for (const b of this.bodies) {
      if (ids && !ids.includes(b.id)) continue;
      if (b.fixed || !(b.mass > 0)) continue;
      m += b.mass;
      c = V.addScaled(c, b.pos, b.mass);
    }
    return m > 0 ? V.scale(c, 1 / m) : c;
  }

  // ----------------------------------------------------------- interaction

  /** Begin/continue a kinematic drag of body toward target (world coords). */
  setDrag(id, target) {
    const b = this.get(id);
    if (!b) return;
    if (!b._drag) b._drag = { from: V.clone(b.pos), to: V.clone(target) };
    else b._drag.to = V.clone(target);
  }

  endDrag(id, maxSpeed = 25) {
    const b = this.get(id);
    if (!b) return;
    b._drag = null;
    const s = V.len(b.vel);
    if (s > maxSpeed) b.vel = V.scale(b.vel, maxSpeed / s);
  }

  /** Project position constraints without advancing time (re-assembles linkages). */
  relax(iterations = 60) {
    for (const m of this.motors) this._placeMotor(m);
    for (let i = 0; i < iterations; i++) {
      for (const r of this.rods) this._solveRod(r, 0);
      for (const s of this.sliders) this._solveSlider(s, 0);
    }
  }

  // ------------------------------------------------------------- stepping

  step(dt) {
    const n = Math.max(1, this.substeps | 0);
    const h = dt / n;
    for (const b of this.bodies) {
      b._fbd = new Map();
      b._vFrame = V.clone(b.vel);
      b._motor = null;
      if (b._drag) b._drag.from = V.clone(b.pos);
    }
    for (const m of this.motors) {
      if (!m.enabled) continue;
      const b = this.get(m.body);
      if (b) b._motor = m.id;
      m._torque = 0;
    }
    for (const r of this.rods) r._tension = 0;
    for (const s of this.springs) s._tension = 0;
    this._pairs = new Set();
    this._pairInfo = new Map();

    for (let i = 0; i < n; i++) this._substep(h, i, n);

    for (const b of this.bodies) {
      b._acc = V.scale(V.sub(b.vel, b._vFrame), 1 / dt);
      b._scriptF = null;
      if (b._drag) b._drag.from = V.clone(b.pos);
      if (b.trail) {
        if (!b._trail) b._trail = [];
        b._trail.push({ x: b.pos.x, y: b.pos.y, t: this.time });
        if (b._trail.length > 1500) b._trail.splice(0, b._trail.length - 1500);
      }
    }
    for (const m of this.motors) {
      if (!m.enabled) continue;
      // The motor supplies whatever torque keeps the crank on schedule.
      const tip = this.get(m.body), pivot = this.get(m.pivot);
      if (!tip || !pivot) continue;
      const r = V.sub(tip.pos, pivot.pos);
      const reaction = V.neg(this.netForce(tip));
      m._torque = V.cross(r, reaction);
    }
    for (const key of this._pairs) {
      if (!this._prevPairs.has(key)) this.events.push({ type: 'touch', ...this._pairInfo.get(key), time: this.time });
    }
    this._prevPairs = this._pairs;
  }

  _fbd(b, key, vec, meta, w) {
    if (!b._fbd) b._fbd = new Map();
    const item = b._fbd.get(key);
    if (item) item.vec = V.addScaled(item.vec, vec, w);
    else b._fbd.set(key, { vec: V.scale(vec, w), ...meta });
  }

  _substep(h, i, n) {
    const w = 1 / n;
    const g = this.gravity;
    const forces = new Map();
    const push = (b, f) => forces.set(b.id, V.add(forces.get(b.id) ?? V.ZERO, f));

    // 1. external forces -------------------------------------------------
    for (const b of this.bodies) {
      if (!this.isDynamic(b)) continue;
      const W = V.scale(g, b.mass);
      if (W.x !== 0 || W.y !== 0) {
        push(b, W);
        this._fbd(b, 'W', W, { kind: 'weight', label: 'W', ref: b.id }, w);
      }
      if (this.airDrag > 0) {
        const D = V.scale(b.vel, -this.airDrag);
        push(b, D);
        this._fbd(b, 'D', D, { kind: 'drag', label: 'D', ref: b.id }, w);
      }
      if (b._scriptF) {
        push(b, b._scriptF);
        this._fbd(b, 'P', b._scriptF, { kind: 'script', label: 'F_{prog}', ref: b.id }, w);
      }
    }
    for (const f of this.forces) {
      if (!f.enabled) continue;
      const b = this.get(f.body);
      if (!b || !this.isDynamic(b)) continue;
      push(b, f.vec);
      this._fbd(b, `F:${f.id}`, f.vec, { kind: 'applied', label: f.label ?? f.name, ref: f.id }, w);
    }
    for (const s of this.springs) {
      const a = this.get(s.a), b = this.get(s.b);
      const d = V.sub(b.pos, a.pos);
      const L = V.len(d);
      const u = L > 1e-9 ? V.scale(d, 1 / L) : { x: 1, y: 0 };
      const T = s.k * (L - s.rest) + s.damping * V.dot(V.sub(b.vel, a.vel), u);
      s._tension += T * w;
      const fa = V.scale(u, T);
      const meta = { kind: 'spring', label: s.style.forceLabel ?? 'F_s', ref: s.id };
      if (this.isDynamic(a)) push(a, fa);
      if (this.isDynamic(b)) push(b, V.neg(fa));
      this._fbd(a, `S:${s.id}`, fa, meta, w);
      this._fbd(b, `S:${s.id}`, V.neg(fa), meta, w);
    }

    // 2. integrate --------------------------------------------------------
    for (const b of this.bodies) {
      b._v0 = V.clone(b.vel);
      b._prev = V.clone(b.pos);
      if (b._drag) {
        b.pos = V.lerp(b._drag.from, b._drag.to, (i + 1) / n);
        continue;
      }
      if (b._motor) continue;
      const im = this.invMass(b);
      if (im === 0) continue;
      const F = forces.get(b.id) ?? V.ZERO;
      b.vel = V.addScaled(b.vel, F, h * im);
      b.pos = V.addScaled(b.pos, b.vel, h);
    }
    for (const m of this.motors) {
      if (!m.enabled) continue;
      m.angle += m.omega * h;
      this._placeMotor(m);
    }

    // 3. position constraints --------------------------------------------
    for (const r of this.rods) r._lambda = 0;
    for (const s of this.sliders) { s._lambda = 0; s._limit = 0; }
    const contacts = this._detectContacts();
    for (let it = 0; it < this.iterations; it++) {
      for (const r of this.rods) this._solveRod(r, h);
      for (const s of this.sliders) this._solveSlider(s, h);
    }
    for (const c of contacts) this._solveContact(c);

    // 4. velocities --------------------------------------------------------
    for (const b of this.bodies) {
      if (b.fixed) { b.vel = { x: 0, y: 0 }; continue; }
      b.vel = V.scale(V.sub(b.pos, b._prev), 1 / h);
    }

    // 5. velocity-level contact response (restitution, Coulomb friction) ----
    const gMag = V.len(g);
    for (const c of contacts) this._contactVelocity(c, h, gMag, w);

    // 6. constraint forces into the free-body diagrams ---------------------
    const ih2 = 1 / (h * h);
    for (const r of this.rods) {
      if (!r._lambda) continue;
      const a = this.get(r.a), b = this.get(r.b);
      const u = V.norm(V.sub(b.pos, a.pos));
      const fb = V.scale(u, r._lambda * ih2);
      r._tension += -r._lambda * ih2 * w;
      const meta = { kind: 'constraint', label: r.style.forceLabel ?? 'T', ref: r.id };
      this._fbd(b, `R:${r.id}`, fb, meta, w);
      this._fbd(a, `R:${r.id}`, V.neg(fb), meta, w);
    }
    for (const s of this.sliders) {
      const b = this.get(s.body);
      if (s._lambda) {
        const nrm = V.perp(s.dir);
        this._fbd(b, `N:${s.id}`, V.scale(nrm, s._lambda * ih2), { kind: 'normal', label: 'N', ref: s.id }, w);
      }
      if (s._limit) {
        this._fbd(b, `L:${s.id}`, V.scale(s.dir, s._limit * ih2), { kind: 'normal', label: 'N_{stop}', ref: s.id }, w);
      }
    }
    for (const c of contacts) {
      if (c.lambda <= 0) continue;
      const fn = V.scale(c.n, c.lambda * ih2);
      const otherId = c.b ? c.b.id : c.seg.id;
      this._fbd(c.a, `N:${otherId}`, fn, { kind: 'normal', label: 'N', ref: otherId }, w);
      if (c.b) this._fbd(c.b, `N:${c.a.id}`, V.neg(fn), { kind: 'normal', label: 'N', ref: c.a.id }, w);
      if (c.stick) {
        const fs = V.scale(c.stick, ih2);
        this._fbd(c.a, `f:${otherId}`, fs, { kind: 'friction', label: 'f', ref: otherId }, w);
        if (c.b) this._fbd(c.b, `f:${c.a.id}`, V.neg(fs), { kind: 'friction', label: 'f', ref: c.a.id }, w);
      }
    }

    this.time += h;
  }

  _placeMotor(m) {
    const b = this.get(m.body), p = this.get(m.pivot);
    if (!b || !p) return;
    b.pos = V.add(p.pos, V.fromAngle(m.angle, m.radius));
  }

  _solveRod(r, h) {
    const a = this.get(r.a), b = this.get(r.b);
    const wa = this.invMass(a), wb = this.invMass(b);
    const d = V.sub(b.pos, a.pos);
    const L = V.len(d);
    if (L < 1e-9) return;
    const C = L - r.length;
    if (r.rope && C < 0) return;
    const ws = wa + wb;
    if (ws === 0) {
      // Both ends are driven: still report the force needed, but cannot move.
      return;
    }
    const u = V.scale(d, 1 / L);
    const dl = -C / ws;
    a.pos = V.addScaled(a.pos, u, -wa * dl);
    b.pos = V.addScaled(b.pos, u, wb * dl);
    if (h > 0) r._lambda += dl;
  }

  _solveSlider(s, h) {
    const b = this.get(s.body);
    const wb = this.invMass(b);
    if (wb === 0) return;
    const nrm = V.perp(s.dir);
    const rel = V.sub(b.pos, s.origin);
    const C = V.dot(nrm, rel);
    b.pos = V.addScaled(b.pos, nrm, -C);
    if (h > 0) s._lambda += -C / wb;
    const t = V.dot(s.dir, V.sub(b.pos, s.origin));
    let corr = 0;
    if (t < s.min) corr = s.min - t;
    else if (t > s.max) corr = s.max - t;
    if (corr !== 0) {
      b.pos = V.addScaled(b.pos, s.dir, corr);
      if (h > 0) s._limit += corr / wb;
    }
  }

  // ------------------------------------------------------------- contacts

  _detectContacts() {
    const out = [];
    const bodies = this.bodies.filter((b) => b.collide);
    for (const a of bodies) {
      if (this.invMass(a) === 0) continue;
      for (const seg of this.segments) {
        const c = contactBodySegment(a, seg);
        if (c) out.push(c);
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        if (this.invMass(a) === 0 && this.invMass(b) === 0) continue;
        if (a.style.group && a.style.group === b.style.group) continue;
        const c = contactBodies(a, b);
        if (c) out.push(c);
      }
    }
    for (const c of out) {
      const ida = c.a.id;
      const idb = c.b ? c.b.id : c.seg.id;
      const key = ida < idb ? `${ida}|${idb}` : `${idb}|${ida}`;
      this._pairs.add(key);
      this._pairInfo.set(key, { a: ida, b: idb });
      c.lambda = 0;
      c.e = Math.min(c.a.restitution, c.b ? c.b.restitution : c.seg.restitution);
      c.mu = Math.sqrt(c.a.friction * (c.b ? c.b.friction : c.seg.friction));
    }
    return out;
  }

  _solveContact(c) {
    const wa = this.invMass(c.a);
    const wb = c.b ? this.invMass(c.b) : 0;
    const ws = wa + wb;
    if (ws === 0) return;
    // Re-measure penetration along the contact normal after other constraints moved things.
    const pen = c.pen + this._penDelta(c);
    if (pen <= 0) return;
    const lambda = pen / ws;
    c.a.pos = V.addScaled(c.a.pos, c.n, wa * lambda);
    if (c.b) c.b.pos = V.addScaled(c.b.pos, c.n, -wb * lambda);
    c.lambda += lambda;

    // Static friction at position level: cancel tangential slip during this
    // substep when it is within the friction cone (|Δx_t| < μ·Δx_n).
    const da = V.sub(c.a.pos, c.a._prev);
    const db = c.b ? V.sub(c.b.pos, c.b._prev) : V.ZERO;
    const dp = V.sub(da, db);
    const dpt = V.addScaled(dp, c.n, -V.dot(dp, c.n));
    const slip = V.len(dpt);
    if (slip > 0 && slip < c.mu * pen) {
      c.a.pos = V.addScaled(c.a.pos, dpt, -wa / ws);
      if (c.b) c.b.pos = V.addScaled(c.b.pos, dpt, wb / ws);
      c.stick = V.scale(dpt, -1 / ws); // impulse·h, converted to a force later
    }
  }

  _penDelta(c) {
    // How far the pair moved toward each other along n since detection.
    const da = V.dot(V.sub(c.a.pos, c.aPos), c.n);
    const db = c.b ? V.dot(V.sub(c.b.pos, c.bPos), c.n) : 0;
    return -(da - db);
  }

  _contactVelocity(c, h, gMag, w) {
    if (!(c.lambda > 0)) return;
    const wa = this.invMass(c.a);
    const wb = c.b ? this.invMass(c.b) : 0;
    const ws = wa + wb;
    if (ws === 0) return;
    const vb = c.b ? c.b.vel : V.ZERO;
    const vb0 = c.b ? c.b._v0 : V.ZERO;
    const vrel = V.sub(c.a.vel, vb);
    const vn = V.dot(vrel, c.n);
    const vt = V.addScaled(vrel, c.n, -vn);
    const vtl = V.len(vt);
    let dv = { x: 0, y: 0 };
    if (vtl > 1e-9) {
      const df = Math.min((c.mu * c.lambda * ws) / h, vtl);
      dv = V.scale(vt, -df / vtl);
    }
    const vn0 = V.dot(V.sub(c.a._v0, vb0), c.n);
    const e = Math.abs(vn0) <= 2 * gMag * h ? 0 : c.e;
    const dvn = -vn + Math.max(-e * vn0, 0);
    dv = V.addScaled(dv, c.n, dvn);
    c.a.vel = V.addScaled(c.a.vel, dv, wa / ws);
    if (c.b) c.b.vel = V.addScaled(c.b.vel, dv, -wb / ws);

    // Friction & impulsive normal parts for the free-body diagram.
    const otherId = c.b ? c.b.id : c.seg.id;
    const fFric = V.scale(V.addScaled(dv, c.n, -dvn), 1 / (ws * h));
    if (V.len2(fFric) > 0) {
      this._fbd(c.a, `f:${otherId}`, fFric, { kind: 'friction', label: 'f', ref: otherId }, w);
      if (c.b) this._fbd(c.b, `f:${c.a.id}`, V.neg(fFric), { kind: 'friction', label: 'f', ref: c.a.id }, w);
    }
    if (dvn > 0) {
      const fImp = V.scale(c.n, dvn / (ws * h));
      this._fbd(c.a, `N:${otherId}`, fImp, { kind: 'normal', label: 'N', ref: otherId }, w);
      if (c.b) this._fbd(c.b, `N:${c.a.id}`, V.neg(fImp), { kind: 'normal', label: 'N', ref: c.a.id }, w);
    }
  }

  // --------------------------------------------------------- persistence

  snapshot() {
    const strip = (e) => {
      const o = {};
      for (const [k, v] of Object.entries(e)) if (!k.startsWith('_')) o[k] = v;
      return o;
    };
    return JSON.stringify({
      gravity: this.gravity, substeps: this.substeps, iterations: this.iterations,
      airDrag: this.airDrag, time: this.time, nextId: this.nextId,
      bodies: this.bodies.map(strip), segments: this.segments.map(strip),
      springs: this.springs.map(strip), rods: this.rods.map(strip),
      sliders: this.sliders.map(strip), motors: this.motors.map(strip),
      forces: this.forces.map(strip),
    }, (k, v) => (v === Infinity ? 'Infinity' : v === -Infinity ? '-Infinity' : v));
  }

  restore(json) {
    const s = JSON.parse(json, (k, v) => (v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v));
    Object.assign(this, {
      gravity: s.gravity, substeps: s.substeps, iterations: s.iterations, airDrag: s.airDrag,
      time: s.time, nextId: s.nextId, bodies: s.bodies, segments: s.segments,
      springs: s.springs, rods: s.rods, sliders: s.sliders, motors: s.motors, forces: s.forces,
    });
    this.events = [];
    this._prevPairs = new Set();
  }
}

// ------------------------------------------------------------ narrow phase

function boxAxes(b) {
  const u = V.fromAngle(b.angle);
  return { u, v: V.perp(u) };
}

/** Half-extent of a body measured along unit direction n. */
function extentAlong(b, n) {
  if (b.shape === 'box') {
    const { u, v } = boxAxes(b);
    return (Math.abs(V.dot(n, u)) * b.w) / 2 + (Math.abs(V.dot(n, v)) * b.h) / 2;
  }
  return b.shape === 'point' ? 0 : b.radius;
}

function makeContact(a, b, seg, n, pen) {
  return { a, b, seg, n, pen, aPos: V.clone(a.pos), bPos: b ? V.clone(b.pos) : null };
}

export function contactBodySegment(a, seg) {
  const { point: q } = V.closestOnSegment(a.pos, seg.a, seg.b);
  const d = V.sub(a.pos, q);
  let dl = V.len(d);
  let n;
  if (dl < 1e-9) {
    n = V.norm(V.perp(V.sub(seg.b, seg.a)));
    dl = 0;
  } else {
    n = V.scale(d, 1 / dl);
  }
  const pen = extentAlong(a, n) - dl;
  return pen > 0 ? makeContact(a, null, seg, n, pen) : null;
}

export function contactBodies(a, b) {
  if (a.shape !== 'box' && b.shape !== 'box') {
    const d = V.sub(a.pos, b.pos);
    const dl = V.len(d);
    const r = extentAlong(a, V.ZERO) + extentAlong(b, V.ZERO);
    if (dl >= r) return null;
    const n = dl > 1e-9 ? V.scale(d, 1 / dl) : { x: 0, y: 1 };
    return makeContact(a, b, null, n, r - dl);
  }
  if (a.shape === 'box' && b.shape === 'box') return contactBoxBox(a, b);
  const flip = a.shape === 'box';
  const box = flip ? a : b;
  const ball = flip ? b : a;
  const { u, v } = boxAxes(box);
  const rel = V.sub(ball.pos, box.pos);
  const lx = V.dot(rel, u), ly = V.dot(rel, v);
  const hx = box.w / 2, hy = box.h / 2;
  const r = ball.shape === 'point' ? 0 : ball.radius;
  const inside = Math.abs(lx) <= hx && Math.abs(ly) <= hy;
  let nLocal, pen;
  if (inside) {
    const px = hx - Math.abs(lx), py = hy - Math.abs(ly);
    if (px < py) { nLocal = { x: Math.sign(lx) || 1, y: 0 }; pen = px + r; }
    else { nLocal = { x: 0, y: Math.sign(ly) || 1 }; pen = py + r; }
  } else {
    const cx = Math.max(-hx, Math.min(hx, lx)), cy = Math.max(-hy, Math.min(hy, ly));
    const dx = lx - cx, dy = ly - cy;
    const dl = Math.hypot(dx, dy);
    if (dl >= r) return null;
    nLocal = { x: dx / dl, y: dy / dl };
    pen = r - dl;
  }
  // Normal pointing from box toward ball, in world space.
  const n = V.add(V.scale(u, nLocal.x), V.scale(v, nLocal.y));
  // Contacts store the normal pointing toward body a.
  return makeContact(a, b, null, flip ? V.neg(n) : n, pen);
}

function contactBoxBox(a, b) {
  const axes = [boxAxes(a).u, boxAxes(a).v, boxAxes(b).u, boxAxes(b).v];
  const d = V.sub(a.pos, b.pos);
  let best = null;
  for (const ax of axes) {
    const overlap = extentAlong(a, ax) + extentAlong(b, ax) - Math.abs(V.dot(d, ax));
    if (overlap <= 0) return null;
    if (!best || overlap < best.pen) best = { pen: overlap, n: V.dot(d, ax) >= 0 ? ax : V.neg(ax) };
  }
  return makeContact(a, b, null, best.n, best.pen);
}
