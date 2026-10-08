// Scrubbable number: drag left/right to change a value, arrow keys to nudge,
// click to type. Values in the property cards are always "live".

import { num } from './anim.js';

export function scrubber({ value, step = 0.1, min = -Infinity, max = Infinity, decimals = 1, label = 'value', onChange }) {
  const el = document.createElement('span');
  el.className = 'scrub';
  el.tabIndex = 0;
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-label', label);
  let v = value;
  let enabled = true;

  const show = () => {
    el.textContent = num(v, decimals);
    el.setAttribute('aria-valuenow', String(v));
  };
  const set = (nv, fire = true) => {
    const c = Math.min(max, Math.max(min, Math.round(nv / step) * step));
    const changed = Math.abs(c - v) > 1e-12;
    v = +c.toFixed(6);
    show();
    if (fire && changed) onChange?.(v);
  };

  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    el.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, v, moved: false };
    el.classList.add('is-dragging');
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 2) drag.moved = true;
    set(drag.v + Math.round(dx / 7) * step);
  });
  const end = () => {
    if (!drag) return;
    const clicked = !drag.moved;
    drag = null;
    el.classList.remove('is-dragging');
    if (clicked) edit();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', (e) => {
    if (!enabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(v + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(v - step); e.preventDefault(); }
    if (e.key === 'Enter') edit();
  });

  function edit() {
    const input = document.createElement('input');
    input.className = 'scrub-input';
    input.value = String(v);
    input.setAttribute('aria-label', label);
    el.replaceWith(input);
    input.focus();
    input.select();
    const done = (commit) => {
      if (!input.isConnected) return;
      input.replaceWith(el);
      if (commit) {
        const nv = parseFloat(input.value.replace('−', '-').replace(',', '.'));
        if (Number.isFinite(nv)) set(nv);
      }
      el.focus();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') done(false);
    });
    input.addEventListener('blur', () => done(true));
  }

  show();
  // Show a live value from the simulation (not clamped: it is a readout).
  el.set = (nv) => {
    if (drag || document.activeElement === el) return;
    v = nv;
    show();
  };
  el.get = () => v;
  el.setEnabled = (on) => {
    enabled = on;
    el.classList.toggle('is-locked', !on);
    el.tabIndex = on ? 0 : -1;
  };
  return el;
}
