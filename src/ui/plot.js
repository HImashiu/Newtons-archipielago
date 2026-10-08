// Time-series plot of simulation quantities (level series + values the
// learner's program plots with the "plot" block).

import { niceStep } from '../render/draft.js';
import { mathMarkup, mathHtml, fmt, escapeXml } from '../render/mathtext.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['var(--plot-1)', 'var(--plot-2)', 'var(--plot-3)', 'var(--plot-4)', 'var(--plot-5)'];

export class Plot {
  constructor(root, sim) {
    this.root = root;
    this.sim = sim;
    this.hidden = new Set();
    this.window = 10;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'plot-svg');
    this.legend = document.createElement('div');
    this.legend.className = 'plot-legend';
    root.replaceChildren(this.legend, this.svg);
    this.legend.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-key]');
      if (!chip) return;
      const k = chip.dataset.key;
      if (this.hidden.has(k)) this.hidden.delete(k);
      else this.hidden.add(k);
      this.legendSig = null;
    });
    this.legend.addEventListener('pointerover', (e) => {
      const chip = e.target.closest('[data-refs]');
      this.sim.linked = new Set(chip ? chip.dataset.refs.split(' ').filter(Boolean) : []);
    });
    this.legend.addEventListener('pointerleave', () => { this.sim.linked = new Set(); });
    sim.on('level', () => { this.hidden = new Set(); this.legendSig = null; });
    this.frame = 0;
  }

  update() {
    if (this.frame++ % 2 !== 0) return;
    const sim = this.sim;
    const series = sim.series();
    const panel = this.root.closest('.plot-pane');
    const visible = series.length > 0 && sim.features.plot !== false;
    if (panel) panel.hidden = !visible;
    if (!visible) return;
    const sig = series.map((s) => `${s.key}:${this.hidden.has(s.key)}`).join('|');
    if (sig !== this.legendSig) {
      this.legendSig = sig;
      this.legend.innerHTML = series.map((s, i) => `<button class="chip${this.hidden.has(s.key) ? ' is-off' : ''}" data-key="${escapeXml(s.key)}" data-refs="${escapeXml((s.refs ?? []).join(' '))}" style="--c:${s.color ?? COLORS[i % COLORS.length]}"><span class="swatch"></span>${mathHtml(s.label)}${s.unit ? ` <span class="unit">(${escapeXml(s.unit)})</span>` : ''}</button>`).join('');
    }
    const r = this.svg.getBoundingClientRect();
    const W = Math.max(100, r.width), H = Math.max(60, r.height);
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const hist = sim.history;
    const tNow = sim.world.time;
    const t1 = Math.max(this.window, tNow);
    const t0 = t1 - this.window;
    let ymin = Infinity, ymax = -Infinity;
    const active = series.map((s, i) => ({ ...s, color: s.color ?? COLORS[i % COLORS.length] })).filter((s) => !this.hidden.has(s.key));
    for (const h of hist) {
      if (h.t < t0) continue;
      for (const s of active) {
        const v = h.values[s.key];
        if (Number.isFinite(v)) { ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); }
      }
    }
    if (!Number.isFinite(ymin)) { ymin = -1; ymax = 1; }
    if (ymax - ymin < 1e-6) { ymin -= 1; ymax += 1; }
    const pad = (ymax - ymin) * 0.08;
    ymin -= pad; ymax += pad;
    const L = 44, R = 10, T = 8, B = 20;
    const X = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
    const Y = (v) => T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B);
    let grid = '', labels = '';
    const ys = niceStep(ymax - ymin, 4);
    for (let v = Math.ceil(ymin / ys) * ys; v <= ymax; v += ys) {
      grid += `M${L},${Y(v).toFixed(1)}H${W - R}`;
      labels += `<text x="${L - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" class="plot-tick">${escapeXml(fmt(v, ys < 1 ? 2 : 0))}</text>`;
    }
    for (let t = Math.ceil(t0); t <= t1; t += 1) {
      grid += `M${X(t).toFixed(1)},${T}V${H - B}`;
      if (t % 2 === 0) labels += `<text x="${X(t).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="plot-tick">${t}</text>`;
    }
    labels += `<text x="${W - R}" y="${H - 6}" text-anchor="end" class="plot-tick">${mathMarkup('$t$ (s)', 10)}</text>`;
    let lines = '';
    for (const s of active) {
      let d = '';
      let pen = false;
      for (const h of hist) {
        if (h.t < t0) continue;
        const v = h.values[s.key];
        if (!Number.isFinite(v)) { pen = false; continue; }
        d += `${pen ? 'L' : 'M'}${X(h.t).toFixed(1)},${Y(v).toFixed(1)}`;
        pen = true;
      }
      lines += `<path d="${d}" class="plot-line${s.dashed ? ' dashed' : ''}" style="stroke:${s.color}"/>`;
    }
    const zero = ymin < 0 && ymax > 0 ? `<path d="M${L},${Y(0).toFixed(1)}H${W - R}" class="plot-zero"/>` : '';
    this.svg.innerHTML = `<path d="${grid}" class="plot-grid"/>${zero}<path d="M${L},${T}V${H - B}H${W - R}" class="plot-axis"/>${labels}${lines}`;
  }
}

