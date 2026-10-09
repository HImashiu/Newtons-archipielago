// Tile editor: builds a rule  target ← … from quantity and operator tiles.
//
// Modes
//   build   free building from the tray (click or drag; click placed to remove)
//   blank   a worked rule with empty slots (▢); learners fill only the holes
//   locked  read-only display of the rule
//
// The editor shows the units under every tile and checks dimensions live.

import { OPERATORS, HOLE, unitName, sameDims } from '../rule.js';
import { mathHtml } from '../../render/mathtext.js';

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
};

export function createTileEditor({ system, target, tray, onChange }) {
  const Q = system.quantities;
  const tq = Q[target];
  let tokens = [];
  let mode = 'build';
  let holes = new Set();
  let listeners = null;

  const tileEl = (tok, placed) => {
    if (tok === HOLE) {
      const hole = h('span', 'tile tile-hole', '<span class="tile-sym">▢</span><span class="tile-unit">?</span>');
      hole.setAttribute('aria-label', 'empty tile');
      return hole;
    }
    const isOp = tok in OPERATORS;
    const el = h('button', `tile${isOp ? ' tile-op' : ` tile-q tile-${tok}`}${placed ? ' is-placed' : ''}`);
    el.type = 'button';
    el.dataset.tok = tok;
    const sym = isOp ? OPERATORS[tok].sym : Q[tok].math;
    el.innerHTML = `<span class="tile-sym">${mathHtml(sym)}</span>${isOp ? '' : `<span class="tile-unit">${unitName(Q[tok].dims)}</span>`}`;
    el.setAttribute('aria-label', isOp ? OPERATORS[tok].name : `${Q[tok].name} (${unitName(Q[tok].dims)})`);
    return el;
  };

  const root = h('div', 'tile-editor');
  const line = h('div', 'rule-line');
  line.append(h('span', 'rule-lhs', `${mathHtml(tq.math)}<span class="rule-arrow">←</span>`));
  const slot = h('div', 'slot');
  slot.setAttribute('aria-label', 'Rule');
  line.append(slot);
  const check = h('div', 'rule-check');
  const trayEl = h('div', 'tray');
  for (const tok of tray) trayEl.append(tileEl(tok, false));
  const hint = h('div', 'tray-hint');
  root.append(line, check, trayEl, hint);

  function render() {
    slot.replaceChildren(...tokens.map((tok, i) => {
      const t = tileEl(tok, true);
      t.dataset.index = String(i);
      if (mode === 'blank' && holes.has(i) && tok !== HOLE) t.classList.add('is-filled');
      if (mode === 'blank' && !holes.has(i)) t.classList.add('is-given');
      return t;
    }));
    if (tokens.length === 0) slot.append(h('span', 'slot-empty', 'drop tiles here'));
    slot.classList.toggle('is-locked', mode === 'locked');
    trayEl.hidden = mode === 'locked';
    hint.hidden = mode === 'locked';
    hint.textContent = mode === 'blank'
      ? 'Drag a tile onto the empty box ▢, or click a tile to fill it.'
      : 'Click or drag a tile into the rule; click a placed tile to remove it.';
    const a = system.analyse(tokens);
    let html = '';
    if (tokens.length === 0 || a.hole) html = '';
    else if (a.ok) {
      const good = sameDims(a.dims, tq.dims);
      html = `<span class="unit-eq">= ${unitName(a.dims)}</span> <span class="${good ? 'ok' : 'bad'}">${good
        ? `✓ ${system.describe(a.dims)} — units agree with ${tq.sym}`
        : `✗ ${system.describe(a.dims)}, but ${tq.sym} is ${system.describe(tq.dims)} (${unitName(tq.dims)})`}</span>`;
    } else if (a.error) html = `<span class="bad">✗ ${a.error}</span>`;
    else html = '<span class="muted">…keep going</span>';
    check.innerHTML = html;
  }

  function changed() {
    render();
    onChange?.(tokens.slice());
  }

  function place(tok, index = null) {
    if (mode === 'build') {
      tokens.splice(index ?? tokens.length, 0, tok);
    } else if (mode === 'blank') {
      const open = [...holes].sort((a, b) => a - b);
      const target = index !== null && holes.has(index) ? index : open.find((i) => tokens[i] === HOLE) ?? open[0];
      if (target === undefined) return;
      tokens[target] = tok;
    }
    changed();
  }

  function remove(i) {
    if (mode === 'build') tokens.splice(i, 1);
    else if (mode === 'blank' && holes.has(i)) tokens[i] = HOLE;
    else return;
    changed();
  }

  // ------------------------------------------------------- pointer input
  function bind() {
    let drag = null;
    const overSlot = (e) => {
      const r = slot.getBoundingClientRect();
      return e.clientX > r.left - 20 && e.clientX < r.right + 20 && e.clientY > r.top - 24 && e.clientY < r.bottom + 24;
    };
    const indexAt = (clientX) => {
      const tiles = [...slot.querySelectorAll('.tile:not(.is-ghosted)')];
      if (mode === 'blank') {
        // Nearest hole to the pointer.
        let best = null;
        for (const t of tiles) {
          const i = Number(t.dataset.index);
          if (!holes.has(i)) continue;
          const r = t.getBoundingClientRect();
          const d = Math.abs(clientX - (r.left + r.width / 2));
          if (!best || d < best.d) best = { i, d };
        }
        return best?.i ?? null;
      }
      for (const t of tiles) {
        const r = t.getBoundingClientRect();
        if (clientX < r.left + r.width / 2) return Number(t.dataset.index);
      }
      return tokens.length;
    };
    const onDown = (e) => {
      const t = e.target.closest('.tile[data-tok]');
      if (!t || mode === 'locked') return;
      const from = t.dataset.index !== undefined ? Number(t.dataset.index) : null;
      if (mode === 'blank' && from !== null && !holes.has(from)) return;
      e.preventDefault();
      drag = { tok: t.dataset.tok, from, x: e.clientX, y: e.clientY, moved: false, src: t };
    };
    const onMove = (e) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
      if (!drag.moved) {
        drag.moved = true;
        drag.ghost = tileEl(drag.tok, false);
        drag.ghost.classList.add('tile-ghost');
        document.body.append(drag.ghost);
        if (drag.from !== null) drag.src.classList.add('is-ghosted');
      }
      drag.ghost.style.transform = `translate(${e.clientX - 18}px, ${e.clientY - 20}px)`;
      slot.classList.toggle('is-target', overSlot(e));
    };
    const onUp = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      slot.classList.remove('is-target');
      d.ghost?.remove();
      if (!d.moved) {
        if (d.from === null) place(d.tok);
        else remove(d.from);
        return;
      }
      const over = overSlot(e);
      if (mode === 'build') {
        if (d.from !== null) tokens.splice(d.from, 1);
        if (over) {
          let idx = indexAt(e.clientX);
          if (d.from !== null && idx > d.from) idx -= 1;
          tokens.splice(Math.min(idx, tokens.length), 0, d.tok);
        }
        changed();
      } else if (mode === 'blank') {
        if (d.from !== null) tokens[d.from] = HOLE;
        if (over) {
          const idx = indexAt(e.clientX);
          if (idx !== null) tokens[idx] = d.tok;
        }
        changed();
      }
    };
    listeners?.abort();
    listeners = new AbortController();
    const opt = { signal: listeners.signal };
    root.addEventListener('pointerdown', onDown, opt);
    window.addEventListener('pointermove', onMove, opt);
    window.addEventListener('pointerup', onUp, opt);
  }
  bind();
  render();

  return {
    el: root,
    get tokens() { return tokens.slice(); },
    /** Set the rule. In blank mode, HOLE entries mark the editable slots. */
    set(newTokens, newMode = mode, holeIdx = null) {
      tokens = newTokens.slice();
      mode = newMode;
      holes = new Set(holeIdx ?? tokens.map((t, i) => (t === HOLE ? i : -1)).filter((i) => i >= 0));
      root.dataset.mode = mode;
      render();
    },
    destroy() { listeners?.abort(); },
  };
}
