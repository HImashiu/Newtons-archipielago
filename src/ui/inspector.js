// Inspector: every parameter of the selected object as a live, two-way bound
// control (slider + number), the quantities derived from it, and the
// relationships it takes part in (springs, rods, forces, blocks using it).
// Hovering a row highlights the matching objects/vectors in the scene.

import * as V from '../core/vec.js';
import { mathHtml, fmt, escapeXml } from '../render/mathtext.js';
import { referencedNames, walk } from '../blocks/defs.js';

const num = (key, sym, label, unit, min, max, step, extra = {}) => ({ type: 'num', key, sym, label, unit, min, max, step, ...extra });

const FIELDS = {
  body: [
    num('mass', '$m$', 'mass', 'kg', 0.1, 20, 0.1, { when: (b) => !b.fixed, refs: (b) => [`fbd:${b.id}:W`, b.id] }),
    num('radius', '$r$', 'radius', 'm', 0.05, 1.5, 0.01, { when: (b) => b.shape === 'ball' }),
    num('w', '$w$', 'width', 'm', 0.1, 3, 0.05, { when: (b) => b.shape === 'box' }),
    num('h', '$h$', 'height', 'm', 0.1, 3, 0.05, { when: (b) => b.shape === 'box' }),
    num('x', '$x$', 'position x', 'm', -20, 20, 0.05, { get: (b) => b.pos.x, set: (b, v, s) => s.moveBody(b, { x: v, y: b.pos.y }) }),
    num('y', '$y$', 'position y', 'm', -20, 20, 0.05, { get: (b) => b.pos.y, set: (b, v, s) => s.moveBody(b, { x: b.pos.x, y: v }) }),
    num('vx', '$v_x$', 'velocity x', 'm/s', -20, 20, 0.1, { when: (b) => !b.fixed, get: (b) => b.vel.x, set: (b, v) => { b.vel = { x: v, y: b.vel.y }; }, refs: (b) => [`vel:${b.id}`] }),
    num('vy', '$v_y$', 'velocity y', 'm/s', -20, 20, 0.1, { when: (b) => !b.fixed, get: (b) => b.vel.y, set: (b, v) => { b.vel = { x: b.vel.x, y: v }; }, refs: (b) => [`vel:${b.id}`] }),
    num('friction', '$μ$', 'friction', '', 0, 1.5, 0.01, { when: (b) => b.collide, refs: (b) => [...frictionRefs(b)] }),
    num('restitution', '$e$', 'bounciness', '', 0, 1, 0.01, { when: (b) => b.collide }),
    { type: 'bool', key: 'fixed', label: 'pinned in place', tier: 2 },
    { type: 'bool', key: 'trail', label: 'trace path', set: (b, v) => { b.trail = v; if (!v) b._trail = []; } },
  ],
  spring: [
    num('k', '$k$', 'stiffness', 'N/m', 0, 400, 1),
    num('rest', '$L_0$', 'rest length', 'm', 0.05, 10, 0.01),
    num('damping', '$c$', 'damping', 'N·s/m', 0, 20, 0.05, { tier: 2 }),
  ],
  rod: [
    num('length', '$L$', 'length', 'm', 0.05, 10, 0.01, { set: (r, v, s) => { r.length = v; s.sim.world.relax(80); } }),
  ],
  force: [
    num('fx', '$F_x$', 'x part', 'N', -100, 100, 0.5, { get: (f) => f.vec.x, set: (f, v) => { f.vec = { x: v, y: f.vec.y }; } }),
    num('fy', '$F_y$', 'y part', 'N', -100, 100, 0.5, { get: (f) => f.vec.y, set: (f, v) => { f.vec = { x: f.vec.x, y: v }; } }),
    num('mag', '$|\\v{F}|$', 'size', 'N', 0, 100, 0.5, { get: (f) => V.len(f.vec), set: (f, v) => { const a = V.angleOf(f.vec); f.vec = V.fromAngle(a, v); } }),
    num('dir', '$φ$', 'direction', '°', -180, 180, 1, { get: (f) => V.deg(V.angleOf(f.vec)), set: (f, v) => { f.vec = V.fromAngle(V.rad(v), V.len(f.vec)); } }),
    { type: 'bool', key: 'enabled', label: 'acting' },
  ],
  motor: [
    num('omega', '$ω$', 'angular speed', 'rad/s', -10, 10, 0.1),
    { type: 'bool', key: 'enabled', label: 'motor on', set: (m, v, s) => { m.enabled = v; if (v) { const w = s.sim.world; const p = w.get(m.pivot), b = w.get(m.body); m.angle = V.angleOf(V.sub(b.pos, p.pos)); } } },
  ],
  segment: [
    num('friction', '$μ$', 'friction', '', 0, 1.5, 0.01),
    num('restitution', '$e$', 'bounciness', '', 0, 1, 0.01),
  ],
  slider: [],
};

function frictionRefs(b) {
  if (!b._fbd) return [];
  return [...b._fbd.keys()].filter((k) => k.startsWith('f:')).map((k) => `fbd:${b.id}:${k}`);
}

const DERIVED = {
  body: (w, b) => b.fixed ? [] : [
    ['speed', '$|\\v{v}|$', `${fmt(V.len(b.vel))} m/s`, [`vel:${b.id}`]],
    ['momentum', '$|\\v{p}|$ = $m|\\v{v}|$', `${fmt(b.mass * V.len(b.vel))} kg·m/s`, [`vel:${b.id}`]],
    ['kinetic energy', '$K$ = ½$mv$²', `${fmt(0.5 * b.mass * V.len2(b.vel))} J`, []],
    ['net force', '$|Σ\\v{F}|$', `${fmt(V.len(w.netForce(b)))} N`, [`net:${b.id}`]],
    ['acceleration', '$|\\v{a}|$', `${fmt(V.len(b._acc ?? V.ZERO))} m/s²`, [`acc:${b.id}`]],
  ],
  spring: (w, s) => {
    const L = w.springLength(s);
    return [
      ['length', '$L$', `${fmt(L)} m`, [s.id]],
      ['stretch', '$Δx$ = $L$ − $L_0$', `${fmt(L - s.rest)} m`, [s.id]],
      ['force', '$F_s$ = $k$Δ$x$', `${fmt(w.springForce(s))} N`, [s.id]],
      ['stored energy', '$U$ = ½$k$Δ$x$²', `${fmt(0.5 * s.k * (L - s.rest) ** 2)} J`, [s.id]],
    ];
  },
  rod: (w, r) => [['tension', '$T$', `${fmt(r._tension ?? 0)} N`, [r.id]]],
  motor: (w, m) => [
    ['crank angle', '$θ$', `${fmt(V.deg(V.wrapAngle(m.angle)), 1)}°`, [m.id]],
    ['torque', '$τ$', `${fmt(m._torque ?? 0)} N·m`, [m.id]],
    ['power', '$P$ = $τω$', `${fmt((m._torque ?? 0) * m.omega)} W`, [m.id]],
  ],
  force: () => [],
  segment: (w, s) => [['slope', '$α$', `${fmt(V.deg(Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x)), 1)}°`, [s.id]]],
  slider: () => [],
};

export class Inspector {
  constructor(root, sim) {
    this.root = root;
    this.sim = sim;
    this.inputs = [];
    this.derivedEls = [];
    root.addEventListener('pointerover', (e) => {
      const row = e.target.closest('[data-refs]');
      this.sim.linked = new Set(row ? row.dataset.refs.split(' ').filter(Boolean) : []);
    });
    root.addEventListener('pointerleave', () => { this.sim.linked = new Set(); });
    root.addEventListener('click', (e) => {
      const link = e.target.closest('[data-select]');
      if (link) this.sim.select(link.dataset.select);
    });
    sim.on('select', () => this.build());
    sim.on('structure', () => this.build());
    sim.on('level', () => this.build());
    sim.on('focus-name', () => this.root.querySelector('.name-input')?.focus());
  }

  moveBody(b, p) {
    this.stage?.placeBody(b, p);
  }

  build() {
    const sim = this.sim;
    const e = sim.selection ? sim.world.get(sim.selection) : null;
    this.inputs = [];
    this.derivedEls = [];
    const frag = document.createDocumentFragment();
    if (e) {
      frag.append(this.header(e));
      for (const f of FIELDS[e.kind] ?? []) {
        if (f.tier && sim.tier < f.tier) continue;
        if (sim.level.inspect && !sim.level.inspect.includes(`${e.kind}.${f.key}`) && !sim.level.inspect.includes(e.kind)) continue;
        if (f.when && !f.when(e)) continue;
        frag.append(this.field(e, f));
      }
      // Beginner levels only show the quantities they have introduced.
      const allow = sim.level.derived ?? (sim.tier === 1 ? [] : null);
      const derived = (DERIVED[e.kind] ?? (() => []))(sim.world, e).filter((d) => !allow || allow.includes(d[0]));
      if (derived.length) {
        const box = document.createElement('div');
        box.className = 'derived';
        derived.forEach((d, i) => {
          const row = document.createElement('div');
          row.className = 'derived-row';
          row.dataset.refs = d[3].join(' ');
          row.innerHTML = `<span class="d-label">${escapeXml(d[0])}</span><span class="d-sym">${mathHtml(d[1])}</span><span class="d-val"></span>`;
          box.append(row);
          this.derivedEls.push({ el: row.querySelector('.d-val'), key: d[0], entity: e });
        });
        frag.append(box);
      }
      frag.append(this.relations(e));
    } else {
      const hint = document.createElement('p');
      hint.className = 'muted small';
      hint.textContent = sim.tier === 1 ? 'Click an object to see and change it.' : 'Select an object to edit its parameters. Drag on empty space to pan, scroll to zoom.';
      frag.append(hint);
    }
    frag.append(this.sceneSection());
    this.root.replaceChildren(frag);
    this.update();
  }

  header(e) {
    const div = document.createElement('div');
    div.className = 'insp-head';
    const kind = { body: e.shape === 'point' ? 'point' : e.shape, spring: 'spring', rod: 'rod', force: 'force', motor: 'motor', segment: 'surface', slider: 'slider' }[e.kind] ?? e.kind;
    div.innerHTML = `<span class="kind-chip kind-${e.kind}">${escapeXml(kind)}</span>`;
    const input = document.createElement('input');
    input.className = 'name-input';
    input.value = e.name;
    input.setAttribute('aria-label', 'Name (used by blocks)');
    input.title = 'Name — blocks refer to objects by this name';
    input.addEventListener('change', () => {
      if (!this.sim.rename(e, input.value)) input.value = e.name;
    });
    div.append(input);
    const canDelete = !e.locked && !e.style?.protected && this.sim.level.tools?.includes('delete');
    if (canDelete) {
      const del = document.createElement('button');
      del.className = 'icon-btn';
      del.title = 'Delete';
      del.textContent = '✕';
      del.addEventListener('click', () => {
        this.sim.world.remove(e.id);
        this.sim.select(null);
        this.sim.structureChanged();
      });
      div.append(del);
    }
    return div;
  }

  field(e, f) {
    const row = document.createElement('div');
    row.className = 'field';
    row.dataset.refs = (f.refs ? f.refs(e) : [e.id]).join(' ');
    const get = f.get ?? ((x) => x[f.key]);
    const set = (v) => {
      if (f.set) f.set(e, v, this);
      else e[f.key] = v;
      this.sim.level.onEdit?.(this.sim.ctx, e, f.key);
      this.sim.emit('edit');
    };
    if (f.type === 'bool') {
      row.classList.add('field-bool');
      const id = `f-${e.id}-${f.key}`;
      row.innerHTML = `<input type="checkbox" id="${id}"><label for="${id}">${escapeXml(f.label)}</label>`;
      const cb = row.querySelector('input');
      cb.checked = !!get(e);
      cb.addEventListener('change', () => set(cb.checked));
      this.inputs.push({ el: cb, read: () => !!get(e), bool: true });
      return row;
    }
    row.innerHTML = `<label class="f-label"><span class="f-sym">${mathHtml(f.sym)}</span><span class="f-name">${escapeXml(f.label)}</span></label>
      <input type="range" min="${f.min}" max="${f.max}" step="${f.step}" aria-label="${escapeXml(f.label)}">
      <input type="number" step="${f.step}" aria-label="${escapeXml(f.label)} value">
      <span class="f-unit">${escapeXml(f.unit)}</span>`;
    const [range, number] = row.querySelectorAll('input');
    const apply = (raw) => {
      const v = parseFloat(raw);
      if (!Number.isFinite(v)) return;
      set(f.min >= 0 && f.key !== 'dir' ? Math.max(f.min === 0 ? 0 : 1e-3, v) : v);
    };
    range.addEventListener('input', () => { number.value = range.value; apply(range.value); });
    number.addEventListener('change', () => apply(number.value));
    this.inputs.push({ el: number, range, read: () => get(e), step: f.step });
    return row;
  }

  relations(e) {
    const w = this.sim.world;
    const items = [];
    const name = (x) => `<button class="link" data-select="${x.id}">${escapeXml(x.name)}</button>`;
    if (e.kind === 'body') {
      for (const s of w.springs) if (s.a === e.id || s.b === e.id) items.push(`spring ${name(s)} to ${name(w.get(s.a === e.id ? s.b : s.a))}`);
      for (const r of w.rods) if (r.a === e.id || r.b === e.id) items.push(`rod ${name(r)} to ${name(w.get(r.a === e.id ? r.b : r.a))}`);
      for (const f of w.forces) if (f.body === e.id) items.push(`force ${name(f)} acts on it`);
      for (const m of w.motors) if (m.body === e.id) items.push(`driven by ${name(m)}`);
      for (const s of w.sliders) if (s.body === e.id) items.push(`slides along ${name(s)}`);
    } else if (['spring', 'rod'].includes(e.kind)) {
      items.push(`connects ${name(w.get(e.a))} and ${name(w.get(e.b))}`);
    } else if (e.kind === 'force') {
      items.push(`acts on ${name(w.get(e.body))}`);
    } else if (e.kind === 'motor') {
      items.push(`turns ${name(w.get(e.body))} about ${name(w.get(e.pivot))}`);
    }
    let blocks = 0;
    walk(this.sim.program, (b) => { if (referencedNames(b).includes(e.name)) blocks++; });
    if (blocks) items.push(`used by ${blocks} block${blocks > 1 ? 's' : ''} (hover to see)`);
    const div = document.createElement('div');
    div.className = 'relations';
    if (items.length) div.innerHTML = `<div class="sub-title">Connections</div><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    div.dataset.refs = e.id;
    div.addEventListener('pointerenter', () => this.sim.emit('names-linked', [e.name]));
    div.addEventListener('pointerleave', () => this.sim.emit('names-linked', []));
    return div;
  }

  sceneSection() {
    const sim = this.sim;
    const div = document.createElement('div');
    div.className = 'scene-params';
    div.innerHTML = '<div class="sub-title">Scene</div>';
    const params = [...(sim.level.params ?? [])];
    if (sim.level.gravityParam !== false) {
      params.push({ key: 'g', sym: '$g$', label: 'gravity', unit: 'm/s²', min: 0, max: 25, step: 0.01, get: (c) => -c.world.gravity.y, set: (c, v) => { c.world.gravity = { x: 0, y: -v }; } });
    }
    if (sim.tier >= 2 && sim.level.dragParam !== false) {
      params.push({ key: 'drag', sym: '$b$', label: 'air drag', unit: 'N·s/m', min: 0, max: 2, step: 0.01, get: (c) => c.world.airDrag, set: (c, v) => { c.world.airDrag = v; } });
    }
    for (const p of params) {
      const pseudo = { id: `param-${p.key}` };
      const f = {
        ...p, type: 'num', refs: () => p.refs ?? [],
        get: () => p.get(sim.ctx),
        set: (_, v) => { p.set(sim.ctx, v); },
      };
      div.append(this.field(pseudo, f));
    }
    // Time scale (slow motion) is a view of time, not physics, so it is always available.
    const ts = document.createElement('div');
    ts.className = 'field field-select';
    ts.innerHTML = `<label class="f-label"><span class="f-sym">⏱</span><span class="f-name">playback speed</span></label>
      <select aria-label="playback speed"><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select>`;
    const sel = ts.querySelector('select');
    sel.value = String(sim.timeScale);
    sel.addEventListener('change', () => { sim.timeScale = parseFloat(sel.value); });
    div.append(ts);
    return div;
  }

  /** Refresh displayed values from the live simulation. */
  update() {
    for (const inp of this.inputs) {
      if (document.activeElement === inp.el || document.activeElement === inp.range) continue;
      const v = inp.read();
      if (inp.bool) {
        inp.el.checked = v;
        continue;
      }
      const decimals = inp.step >= 1 ? 0 : inp.step >= 0.1 ? 1 : 2;
      const s = Number.isFinite(v) ? v.toFixed(decimals) : '';
      if (inp.el.value !== s) inp.el.value = s;
      if (inp.range && inp.range.value !== s) inp.range.value = s;
    }
    if (this.derivedEls.length) {
      const e = this.derivedEls[0].entity;
      if (!this.sim.world.get(e.id)) return;
      const rows = (DERIVED[e.kind] ?? (() => []))(this.sim.world, e);
      for (const d of this.derivedEls) {
        const text = rows.find((r) => r[0] === d.key)?.[2] ?? '';
        if (d.el.textContent !== text) d.el.textContent = text.replace('-', '−');
      }
    }
  }
}
