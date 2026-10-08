// The rule panel for Lesson 1: an object card (the cart's properties), the
// clock, and the rule editor. Tiles are quantities with units; the editor
// checks dimensions live and explains mismatches in words.

import { QUANTITIES, OPERATORS, analyse, unitName, describeUnit, render } from '../rule.js';
import { scrubber } from '../core/scrub.js';
import { num } from '../core/anim.js';
import { mathHtml } from '../../render/mathtext.js';

const TILE_ORDER = ['x', 'v', 'dt', '+', '×'];
const SYM = { x: '$x$', v: '$v$', dt: 'Δ$t$', '+': '+', '×': '×' };

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
};

function tileEl(tok, placed) {
  const isOp = tok in OPERATORS;
  const el = h('button', `tile${isOp ? ' tile-op' : ` tile-q tile-${tok}`}${placed ? ' is-placed' : ''}`);
  el.type = 'button';
  el.dataset.tok = tok;
  el.innerHTML = `<span class="tile-sym">${mathHtml(SYM[tok])}</span>${isOp ? '' : `<span class="tile-unit">${unitName(QUANTITIES[tok].dims)}</span>`}`;
  el.setAttribute('aria-label', isOp ? OPERATORS[tok].name : `${QUANTITIES[tok].name} (${unitName(QUANTITIES[tok].dims)})`);
  return el;
}

export function createRulePanel(hooks) {
  let root, els = {}, mode = null, listeners = null;

  function mount(el, S) {
    root = h('div', 'pn');
    // Object card ------------------------------------------------------
    const card = h('section', 'pn-card');
    card.append(h('div', 'pn-head', '<span class="balloon-sm">A</span><span>Cart</span><span class="pn-kind">object</span>'));
    els.x = scrubber({ value: S.sim.x, step: 0.1, min: -1, max: 9.5, decimals: 2, label: 'position x', onChange: (v) => hooks.setX0(S, v) });
    els.v = scrubber({ value: S.sim.v, step: 0.1, min: -3, max: 3, decimals: 1, label: 'velocity v', onChange: (v) => hooks.setV(S, v) });
    card.append(prop('$x$', els.x, 'm', 'position'), prop('$v$', els.v, 'm/s', 'velocity'));
    // Clock ------------------------------------------------------------
    const clock = h('section', 'pn-card');
    clock.append(h('div', 'pn-head', '<span class="clock-ico" aria-hidden="true"></span><span>Clock</span>'));
    els.t = h('span', 'readout');
    els.dt = h('span', 'readout');
    clock.append(prop('$t$', els.t, 's', 'time'), prop('Δ$t$', els.dt, 's', 'one tick'));
    // Rule ---------------------------------------------------------------
    const rule = h('section', 'pn-card pn-rule');
    rule.append(h('div', 'pn-head', '<span>Rule</span><span class="pn-kind">runs every tick</span>'));
    const line = h('div', 'rule-line');
    line.append(h('span', 'rule-lhs', `${mathHtml('$x$')}<span class="rule-arrow">←</span>`));
    els.slot = h('div', 'slot');
    els.slot.setAttribute('aria-label', 'Rule: drop tiles here');
    line.append(els.slot);
    els.check = h('div', 'rule-check');
    els.tray = h('div', 'tray');
    for (const tok of TILE_ORDER) els.tray.append(tileEl(tok, false));
    els.trayHint = h('div', 'tray-hint', 'Click or drag a tile into the rule; click a placed tile to remove it.');
    els.subst = h('div', 'subst');
    els.actions = h('div', 'actions');
    els.result = h('div', 'result');
    rule.append(line, els.check, els.tray, els.trayHint, els.subst, els.result, els.actions);
    root.append(card, clock, rule);
    el.append(root);
    bindTiles(S);
    renderSlot(S);
  }

  function prop(sym, valueEl, unit, hint) {
    const row = h('div', 'prop');
    row.append(h('span', 'prop-sym', mathHtml(sym)), valueEl, h('span', 'prop-unit', unit), h('span', 'prop-hint', hint));
    return row;
  }

  function button(label, cls, fn) {
    const b = h('button', `pn-btn ${cls ?? ''}`, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function setMode(m, S) {
    mode = m;
    const building = m === 'build';
    root.dataset.mode = m;
    els.tray.hidden = !building;
    els.trayHint.hidden = !building;
    els.slot.classList.toggle('is-locked', !building);
    els.actions.replaceChildren();
    els.result.textContent = '';
    els.subst.textContent = '';
    const editX = m === 'challenge2';
    const editV = m === 'challenge1' || m === 'challenge2';
    els.x.setEnabled(editX);
    els.v.setEnabled(editV);
    if (m === 'build') els.actions.append(button('Test the rule', 'primary', () => hooks.test(S)));
    if (m === 'step') els.actions.append(button('Step <span class="kbd">+Δt</span>', 'primary', () => hooks.step(S)), button('Reset', '', () => hooks.reset(S)));
    if (m === 'challenge1' || m === 'challenge2') {
      els.actions.append(button('Run ▸', 'primary', () => hooks.run(S)), button('Reset', '', () => hooks.reset(S)));
    }
    renderSlot(S);
  }

  // --------------------------------------------------------------- tiles

  function renderSlot(S) {
    els.slot.replaceChildren(...S.rule.map((tok, i) => {
      const t = tileEl(tok, true);
      t.dataset.index = String(i);
      return t;
    }));
    if (S.rule.length === 0) els.slot.append(h('span', 'slot-empty', 'drop tiles here'));
    const a = analyse(S.rule);
    let html;
    if (S.rule.length === 0) html = '';
    else if (a.ok) {
      const isPos = a.dims.m === 1 && a.dims.s === 0;
      html = `<span class="unit-eq">= ${unitName(a.dims)}</span> <span class="${isPos ? 'ok' : 'bad'}">${isPos ? '✓ a position — units agree with x' : `✗ ${describeUnit(a.dims)}, but x is in metres`}</span>`;
    } else if (a.error) html = `<span class="bad">✗ ${a.error}</span>`;
    else html = '<span class="muted">…keep going</span>';
    els.check.innerHTML = html;
  }

  function bindTiles(S) {
    let drag = null;
    const insertIndex = (clientX) => {
      const tiles = [...els.slot.querySelectorAll('.tile:not(.is-ghosted)')];
      for (let i = 0; i < tiles.length; i++) {
        const r = tiles[i].getBoundingClientRect();
        if (clientX < r.left + r.width / 2) return Number(tiles[i].dataset.index);
      }
      return S.rule.length;
    };
    const onDown = (e) => {
      const t = e.target.closest('.tile');
      if (!t || mode !== 'build') return;
      e.preventDefault();
      drag = { tok: t.dataset.tok, from: t.dataset.index !== undefined ? Number(t.dataset.index) : null, x: e.clientX, y: e.clientY, moved: false, src: t };
      t.setPointerCapture?.(e.pointerId);
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
      const r = els.slot.getBoundingClientRect();
      const over = e.clientX > r.left - 20 && e.clientX < r.right + 20 && e.clientY > r.top - 24 && e.clientY < r.bottom + 24;
      els.slot.classList.toggle('is-target', over);
    };
    const onUp = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      els.slot.classList.remove('is-target');
      if (d.ghost) d.ghost.remove();
      if (!d.moved) {
        // Click: tray → append, slot → remove.
        if (d.from === null) S.rule.push(d.tok);
        else S.rule.splice(d.from, 1);
      } else {
        const r = els.slot.getBoundingClientRect();
        const over = e.clientX > r.left - 20 && e.clientX < r.right + 20 && e.clientY > r.top - 24 && e.clientY < r.bottom + 24;
        if (d.from !== null) S.rule.splice(d.from, 1);
        if (over) {
          let idx = insertIndex(e.clientX);
          if (d.from !== null && idx > d.from) idx -= 1;
          S.rule.splice(Math.min(idx, S.rule.length), 0, d.tok);
        }
      }
      hooks.ruleChanged(S);
      renderSlot(S);
    };
    listeners?.abort();
    listeners = new AbortController();
    const opt = { signal: listeners.signal };
    root.addEventListener('pointerdown', onDown, opt);
    window.addEventListener('pointermove', onMove, opt);
    window.addEventListener('pointerup', onUp, opt);
  }

  // -------------------------------------------------------------- update

  function update(S) {
    const sim = S.sim;
    els.x.set(sim.running || sim.steps.length > 1 ? sim.x : sim.x0);
    els.v.set(sim.v);
    els.t.textContent = num(sim.t, 2);
    els.dt.textContent = num(sim.dt, 2);
    const subst = sim.lastSubst ?? '';
    if (els.subst.innerHTML !== subst) els.subst.innerHTML = subst;
    const res = sim.message ?? '';
    if (els.result.dataset.msg !== res) {
      els.result.dataset.msg = res;
      els.result.innerHTML = res;
      els.result.className = `result${sim.messageOk === true ? ' ok' : sim.messageOk === false ? ' bad' : ''}`;
    }
    for (const b of els.actions.querySelectorAll('.primary')) b.disabled = !!sim.running;
  }

  return { mount, setMode, update, renderSlot: (S) => renderSlot(S) };
}

/** Substitution line, e.g.  x ← 1.00 + 1.0 × 0.50 = 1.50 m */
export function substitution(tokens, env, result) {
  // Negative values inside the expression get parentheses: 1.00 + (−2.0) × 0.05.
  let first = true;
  const fmt = (v, tok) => {
    const s = tok === 'v' ? num(v, 1) : num(v, 2);
    const out = v < 0 && !first ? `(${s})` : s;
    first = false;
    return out;
  };
  return `${mathHtml('$x$')} ← ${render(tokens, env, fmt)} = <b>${num(result, 2)} m</b>`;
}
