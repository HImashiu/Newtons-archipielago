// Working panel: the solution written out line by line, like a page of
// notes beside the drawing. A beat provides work(S, t) → lines:
//   { h: 'Given' }                                   section heading
//   { given: [['$L$', '6 m'], ['$F$', '12 kN']] }     data table
//   { step: 1, text: 'Sum of forces', math: '…', state: 'now' | 'done' | 'todo' }
//   { note: '…' }  { result: '…', ok: true | false }

import { mathHtml } from '../../render/mathtext.js';

const m = (s) => String(s ?? '').split(/(\$[^$]*\$)/g).map((p) => (p.startsWith('$') && p.endsWith('$') && p.length > 1 ? `<span class="m">${mathHtml(p)}</span>` : p)).join('');

function line(l) {
  if (l.h) return `<div class="w-h">${m(l.h)}</div>`;
  if (l.given) return `<dl class="w-given">${l.given.map(([k, v]) => `<div><dt>${m(k)}</dt><dd>${m(v)}</dd></div>`).join('')}</dl>`;
  if (l.step !== undefined) {
    return `<div class="w-step is-${l.state ?? 'done'}"><span class="w-n">${l.step}</span><div class="w-body">${l.text ? `<div class="w-text">${m(l.text)}</div>` : ''}${l.math ? `<div class="w-math">${String(l.math).split('→').map((c) => `<span class="w-chunk">${m(c.trim())}</span>`).join('<span class="w-arrow">→</span>')}</div>` : ''}</div></div>`;
  }
  if (l.result) return `<div class="w-result${l.ok === true ? ' ok' : l.ok === false ? ' bad' : ''}">${m(l.result)}</div>`;
  if (l.note) return `<div class="w-note">${m(l.note)}</div>`;
  if (l.html) return l.html;
  return '';
}

export function createWorkPanel() {
  let root = null;
  let last = '';
  return {
    mount(el) {
      root = document.createElement('div');
      root.className = 'pn work';
      el.append(root);
      last = '';
    },
    setMode() {},
    update(S, api) {
      if (!root) return;
      const lines = api.seg.work?.(S, api.t) ?? [];
      const html = lines.map(line).join('');
      if (html !== last) {
        root.innerHTML = html;
        last = html;
      }
    },
  };
}
