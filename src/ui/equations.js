// Live equations panel. Each row is a relationship evaluated with the current
// simulation numbers; hovering a row highlights the objects and vectors it
// talks about in the scene (and vice versa: hovering those highlights the row).

import { mathHtml } from '../render/mathtext.js';

export class EquationsPanel {
  constructor(root, sim) {
    this.root = root;
    this.sim = sim;
    this.rows = new Map();
    this.frame = 0;
    root.addEventListener('pointerover', (e) => {
      const row = e.target.closest('[data-refs]');
      this.sim.linked = new Set(row ? row.dataset.refs.split(' ').filter(Boolean) : []);
    });
    root.addEventListener('pointerleave', () => { this.sim.linked = new Set(); });
    sim.on('level', () => { this.root.replaceChildren(); this.rows.clear(); this.update(true); });
  }

  update(force = false) {
    if (!force && this.frame++ % 4 !== 0) return;
    const sim = this.sim;
    let eqs = [];
    try {
      eqs = sim.level.equations?.(sim.ctx) ?? [];
    } catch (e) {
      console.error(e);
    }
    this.root.closest('.panel')?.toggleAttribute('hidden', eqs.length === 0);
    const seen = new Set();
    for (const eq of eqs) {
      seen.add(eq.key);
      let row = this.rows.get(eq.key);
      if (!row) {
        row = document.createElement('div');
        row.className = 'eq-row';
        row.innerHTML = '<div class="eq-label"></div><div class="eq-math"></div>';
        this.root.append(row);
        this.rows.set(eq.key, row);
      }
      row.dataset.refs = (eq.refs ?? []).join(' ');
      const label = eq.label ?? '';
      const math = eq.html ?? mathHtml(eq.tex ?? '');
      const l = row.firstChild, m = row.lastChild;
      if (l.textContent !== label) l.textContent = label;
      if (m.innerHTML !== math) m.innerHTML = math;
      const hot = (eq.refs ?? []).some((r) => r === sim.hover || r === sim.selection);
      row.classList.toggle('is-hot', hot);
      row.classList.toggle('is-ok', eq.ok === true);
      row.classList.toggle('is-bad', eq.ok === false);
    }
    for (const [key, row] of this.rows) {
      if (!seen.has(key)) {
        row.remove();
        this.rows.delete(key);
      }
    }
  }
}
