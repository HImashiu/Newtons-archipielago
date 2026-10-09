// The rule panel for Lesson 1: an object card (the cart's properties), the
// clock, and the rule editor. Tiles are quantities with units; the editor
// checks dimensions live and explains mismatches in words.

import { L1 } from '../rule.js';
import { createTileEditor } from '../core/tiles.js';
import { scrubber } from '../core/scrub.js';
import { num } from '../core/anim.js';
import { mathHtml } from '../../render/mathtext.js';

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
};

export function createRulePanel(hooks) {
  let root, els = {}, mode = null;

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
    els.editor = createTileEditor({
      system: L1, target: 'x', tray: ['x', 'v', 'dt', '+', '×'],
      onChange: (tokens) => { S.rule = tokens; hooks.ruleChanged(S); },
    });
    els.subst = h('div', 'subst');
    els.actions = h('div', 'actions');
    els.result = h('div', 'result');
    rule.append(els.editor.el, els.subst, els.result, els.actions);
    root.append(card, clock, rule);
    el.append(root);
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
    root.dataset.mode = m;
    els.editor.set(S.rule, m === 'build' || m === 'blank' ? m : 'locked');
    els.actions.replaceChildren();
    els.result.textContent = '';
    els.subst.textContent = '';
    els.x.setEnabled(m === 'challenge2');
    els.v.setEnabled(m === 'challenge1' || m === 'challenge2');
    if (m === 'build' || m === 'blank') els.actions.append(button('Test the rule', 'primary', () => hooks.test(S)));
    if (m === 'step') els.actions.append(button('Step <span class="kbd">+Δt</span>', 'primary', () => hooks.step(S)), button('Reset', '', () => hooks.reset(S)));
    if (m === 'challenge1' || m === 'challenge2') {
      els.actions.append(button('Run ▸', 'primary', () => hooks.run(S)), button('Reset', '', () => hooks.reset(S)));
    }
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

  return { mount, setMode, update };
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
  return `${mathHtml('$x$')} ← ${L1.render(tokens, env, fmt)} = <b>${num(result, 2)} m</b>`;
}
