// Scratch-style block editor built from plain DOM.
//
// - Drag blocks from the palette into the script area; dragging a placed
//   block carries every block below it (as in Scratch).
// - Drop inside a C-block's mouth to nest; drop on the palette to delete.
// - Inputs are live: editing a value updates the program immediately, and
//   expressions are validated as you type.
// - Hovering a block highlights the scene objects it refers to, and hovering
//   a scene object highlights the blocks that use it.

import { BLOCKS, CATEGORIES, KEYS, parseTemplate, makeBlock, walk, referencedNames } from './defs.js';
import { tryCompile } from '../core/expr.js';

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) el.append(c);
  return el;
};

export class BlockEditor {
  /**
   * host: { names(kind) → string[], onChange(program), onHover(names|null) }
   */
  constructor(root, host) {
    this.root = root;
    this.host = host;
    this.program = { scripts: [] };
    this.allowed = null;
    this.drag = null;
    this.errors = new Map();
    this.active = new Set();
    this.linkedNames = new Set();

    this.paletteEl = h('div', { class: 'palette', 'aria-label': 'Block palette' });
    this.scriptsEl = h('div', { class: 'scripts', 'aria-label': 'Program' });
    this.marker = h('div', { class: 'drop-marker' });
    root.replaceChildren(this.paletteEl, this.scriptsEl);
    this.scriptsEl.append(this.marker);

    root.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', () => this.cancelDrag());
  }

  setAllowed(types) {
    this.allowed = types ? new Set(types) : null;
    this.renderPalette();
  }

  setProgram(program) {
    this.program = program;
    this.render();
  }

  changed() {
    this.host.onChange(this.program);
  }

  // ---------------------------------------------------------------- render

  renderPalette() {
    const groups = [];
    for (const [cat, info] of Object.entries(CATEGORIES)) {
      const types = Object.keys(BLOCKS).filter((t) => BLOCKS[t].cat === cat && (!this.allowed || this.allowed.has(t)));
      if (types.length === 0) continue;
      const names = { body: this.host.names('body')[0], spring: this.host.names('spring')[0], motor: this.host.names('motor')[0], force: this.host.names('force')[0] };
      groups.push(
        h('div', { class: 'palette-group' },
          h('div', { class: 'palette-title', style: `--cat:${info.color}` }, info.label),
          types.map((t) => {
            const el = this.renderBlock(makeBlock(t, {}, null, names), true);
            el.dataset.template = t;
            return el;
          })),
      );
    }
    this.paletteEl.replaceChildren(...groups);
  }

  render() {
    const frag = this.program.scripts.map((s) =>
      h('div', { class: `script${s.blocks[0] && BLOCKS[s.blocks[0].type]?.shape === 'hat' ? '' : ' is-loose'}`, dataset: { script: s.id } },
        s.blocks.map((b) => this.renderBlock(b, false))));
    if (frag.length === 0) {
      frag.push(h('div', { class: 'scripts-empty' }, 'Drag blocks here to program the simulation.'));
    }
    this.scriptsEl.replaceChildren(...frag, this.marker);
    this.refreshState();
  }

  renderBlock(block, inPalette) {
    const def = BLOCKS[block.type];
    const cat = CATEGORIES[def.cat];
    const row = h('div', { class: 'block-row' });
    for (const part of parseTemplate(def.text)) {
      if (part.text !== undefined) row.append(h('span', { class: 'block-text' }, part.text));
      else row.append(this.renderSlot(block, part, inPalette));
    }
    const el = h('div', {
      class: `block shape-${def.shape}${def.cap ? ' is-cap' : ''}`,
      style: `--cat:${cat.color}`,
      dataset: { id: block.id },
    }, row);
    if (def.shape === 'c') {
      const mouth = h('div', { class: 'block-mouth', dataset: { mouth: block.id } },
        (block.children ?? []).map((c) => this.renderBlock(c, inPalette)));
      el.append(mouth, h('div', { class: 'block-foot' }));
    }
    if (!inPalette) {
      el.addEventListener('pointerenter', () => this.host.onHover(referencedNames(block)));
      el.addEventListener('pointerleave', () => this.host.onHover(null));
    }
    return el;
  }

  renderSlot(block, part, inPalette) {
    const value = block.args[part.slot] ?? '';
    const set = (v) => {
      block.args[part.slot] = v;
      if (!inPalette) this.changed();
    };
    const optionsFor = (kind) => {
      if (kind === 'key') return KEYS;
      if (kind === 'onoff') return ['on', 'off'];
      if (kind === 'target') return [...this.host.names('body'), 'ground', 'anything'];
      return this.host.names(kind);
    };
    if (['body', 'spring', 'motor', 'force', 'target', 'key', 'onoff'].includes(part.kind)) {
      const opts = optionsFor(part.kind);
      const list = opts.includes(value) || value === '' ? opts : [value, ...opts];
      const sel = h('select', { class: `slot slot-${part.kind}`, 'aria-label': part.slot },
        list.map((o) => h('option', { value: o, selected: o === value }, o)));
      if (!opts.includes(value) && value !== '') sel.classList.add('has-error');
      sel.addEventListener('change', () => { set(sel.value); sel.classList.toggle('has-error', !optionsFor(part.kind).includes(sel.value)); });
      return sel;
    }
    const input = h('input', {
      class: `slot slot-${part.kind}`, value, spellcheck: 'false', autocomplete: 'off',
      'aria-label': part.slot, size: Math.max(2, String(value).length),
    });
    const validate = () => {
      if (part.kind === 'text') return;
      const c = tryCompile(input.value);
      input.classList.toggle('has-error', !!c.error);
      input.title = c.error ?? 'Number or expression, e.g. 2*ball.x or sin(t)';
    };
    validate();
    input.addEventListener('input', () => {
      input.size = Math.max(2, input.value.length);
      validate();
      set(input.value);
    });
    return input;
  }

  /** Update running glow / error / linked highlights without re-rendering. */
  refreshState() {
    for (const el of this.scriptsEl.querySelectorAll('.block')) {
      const id = el.dataset.id;
      el.classList.toggle('is-running', this.active.has(id));
      const err = this.errors.get(id);
      el.classList.toggle('has-runtime-error', !!err);
      if (err) el.title = err;
      else el.removeAttribute('title');
    }
    walk(this.program, (b) => {
      const el = this.scriptsEl.querySelector(`.block[data-id="${b.id}"]`);
      if (!el) return;
      const linked = this.linkedNames.size > 0 && referencedNames(b).some((n) => this.linkedNames.has(n));
      el.classList.toggle('is-linked', linked);
    });
  }

  setRuntime(active, errors) {
    const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
    const errKeys = new Set(errors.keys());
    if (same(active, this.active) && same(errKeys, new Set(this.errors.keys()))) return;
    this.active = new Set(active);
    this.errors = new Map(errors);
    this.refreshState();
  }

  setLinkedNames(names) {
    const next = new Set(names ?? []);
    if (next.size === this.linkedNames.size && [...next].every((n) => this.linkedNames.has(n))) return;
    this.linkedNames = next;
    this.refreshState();
  }

  // ------------------------------------------------------------ model ops

  findBlock(id) {
    let found = null;
    walk(this.program, (b, list, index) => {
      if (b.id === id) found = { block: b, list, index };
    });
    return found;
  }

  /** Remove block `id` and the blocks after it in its list; returns them. */
  detach(id) {
    const f = this.findBlock(id);
    if (!f) return [];
    const taken = f.list.splice(f.index);
    this.program.scripts = this.program.scripts.filter((s) => s.blocks.length > 0);
    return taken;
  }

  // ------------------------------------------------------------ dragging

  onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('input, select, option')) return;
    const blockEl = e.target.closest('.block');
    if (!blockEl) return;
    e.preventDefault();
    const rect = blockEl.getBoundingClientRect();
    this.drag = {
      pending: true,
      startX: e.clientX,
      startY: e.clientY,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      blockEl,
      fromPalette: !!blockEl.closest('.palette'),
    };
  }

  beginDrag() {
    const d = this.drag;
    let blocks;
    if (d.fromPalette) {
      const tpl = d.blockEl.closest('[data-template]')?.dataset.template ?? d.blockEl.dataset.template;
      const names = { body: this.host.names('body')[0], spring: this.host.names('spring')[0], motor: this.host.names('motor')[0], force: this.host.names('force')[0] };
      blocks = [makeBlock(tpl, {}, null, names)];
    } else {
      blocks = this.detach(d.blockEl.dataset.id);
      this.render();
    }
    d.blocks = blocks;
    d.pending = false;
    d.ghost = h('div', { class: 'drag-ghost' }, blocks.map((b) => this.renderBlock(b, true)));
    document.body.append(d.ghost);
    this.root.classList.add('is-dragging');
  }

  onPointerMove(e) {
    const d = this.drag;
    if (!d) return;
    if (d.pending) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
      this.beginDrag();
    }
    const x = e.clientX - d.offX, y = e.clientY - d.offY;
    d.ghost.style.transform = `translate(${x}px, ${y}px)`;
    d.target = this.findDropTarget(x, y, e);
    this.showMarker(d.target);
  }

  onPointerUp(e) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (d.pending) return;
    d.ghost.remove();
    this.root.classList.remove('is-dragging');
    this.marker.style.display = 'none';
    const overPalette = this.paletteEl.contains(document.elementFromPoint(e.clientX, e.clientY));
    if (overPalette) {
      this.render();
      this.changed();
      return;
    }
    const t = d.target;
    if (t && t.kind === 'insert') {
      t.list.splice(t.index, 0, ...d.blocks);
    } else if (this.scriptsEl.contains(document.elementFromPoint(e.clientX, e.clientY)) || !d.fromPalette) {
      this.program.scripts.push({ id: `s${Date.now().toString(36)}`, blocks: d.blocks });
    }
    this.render();
    this.changed();
  }

  cancelDrag() {
    if (!this.drag) return;
    if (!this.drag.pending) {
      this.drag.ghost.remove();
      if (!this.drag.fromPalette) this.program.scripts.push({ id: `s${Date.now().toString(36)}`, blocks: this.drag.blocks });
      this.render();
      this.changed();
    }
    this.drag = null;
    this.root.classList.remove('is-dragging');
    this.marker.style.display = 'none';
  }

  findDropTarget(x, y) {
    const d = this.drag;
    const first = d.blocks[0];
    const isHat = BLOCKS[first.type].shape === 'hat';
    const lastCap = BLOCKS[d.blocks[d.blocks.length - 1].type].cap;
    const area = this.scriptsEl.getBoundingClientRect();
    if (x + 40 < area.left || x > area.right || y + 20 < area.top || y > area.bottom) return null;
    let best = null;
    const consider = (px, py, target) => {
      const dist = Math.hypot(px - x, py - y);
      if (dist < 48 && (!best || dist < best.dist)) best = { ...target, dist, px, py };
    };
    if (!isHat) {
      for (const el of this.scriptsEl.querySelectorAll('.block')) {
        const f = this.findBlock(el.dataset.id);
        if (!f) continue;
        const def = BLOCKS[f.block.type];
        const r = el.getBoundingClientRect();
        // After this block (unless it is a cap block such as "forever").
        if (!def.cap && !(lastCap && f.index < f.list.length - 1)) {
          consider(r.left, r.bottom, { kind: 'insert', list: f.list, index: f.index + 1, width: r.width });
        }
        // Inside a C-block mouth.
        if (def.shape === 'c') {
          const mouth = el.querySelector(':scope > .block-mouth');
          const mr = mouth.getBoundingClientRect();
          if (!(lastCap && (f.block.children ?? []).length > 0)) {
            consider(mr.left, mr.top, { kind: 'insert', list: f.block.children, index: 0, width: mr.width });
          }
        }
      }
      // Top of a loose (hat-less) script.
      for (const s of this.program.scripts) {
        if (BLOCKS[s.blocks[0]?.type]?.shape === 'hat') continue;
        const el = this.scriptsEl.querySelector(`.block[data-id="${s.blocks[0].id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!lastCap) consider(r.left, r.top - r.height * 0.5, { kind: 'insert', list: s.blocks, index: 0, width: r.width, top: r.top });
      }
    } else {
      for (const s of this.program.scripts) {
        if (BLOCKS[s.blocks[0]?.type]?.shape === 'hat') continue;
        const el = this.scriptsEl.querySelector(`.block[data-id="${s.blocks[0].id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        consider(r.left, r.top - 30, { kind: 'insert', list: s.blocks, index: 0, width: r.width, top: r.top });
      }
    }
    return best;
  }

  showMarker(t) {
    if (!t) {
      this.marker.style.display = 'none';
      return;
    }
    const area = this.scriptsEl.getBoundingClientRect();
    const y = (t.top ?? t.py) - area.top + this.scriptsEl.scrollTop;
    this.marker.style.display = 'block';
    this.marker.style.transform = `translate(${t.px - area.left + this.scriptsEl.scrollLeft}px, ${y - 2}px)`;
    this.marker.style.width = `${Math.min(220, t.width)}px`;
  }
}
