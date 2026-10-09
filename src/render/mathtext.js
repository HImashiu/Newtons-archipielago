// Minimal math typesetting for SVG <text> labels.
//
//   "$F_s$ = 12.0 N"      → italic F, subscript s, upright "= 12.0 N"
//   "$\v{v}_{0}$"         → bold-italic vector v with subscript 0
//   "$m\v{g}$"            → italic m, bold-italic g
//   "$θ_2$ = 30°"         → Greek italic theta with subscript
//
// Inside $…$ single letters are italic, words of 2+ letters (sin, cos, max…)
// are upright, digits are upright. Outside $…$ everything is upright text.

export function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const LETTER = /[A-Za-zͰ-Ͽ]/;

function readGroup(src, i) {
  // Returns [content, nextIndex] for {group} or a single character.
  if (src[i] === '{') {
    let depth = 1, j = i + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
      j++;
    }
    return [src.slice(i + 1, j - 1), j];
  }
  return [src[i] ?? '', i + 1];
}

function mathRuns(src, out, style) {
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([a-z]+)/.exec(src.slice(i));
      const cmd = m ? m[1] : '';
      i += 1 + cmd.length;
      const [arg, next] = readGroup(src, i);
      i = next;
      if (cmd === 'v') mathRuns(arg, out, { ...style, bold: true, italic: true, vector: true });
      else if (cmd === 'rm') out.push({ text: arg, ...style, italic: false });
      else if (cmd === 'dot') { mathRuns(arg, out, style); out.push({ text: '̇', ...style, italic: false }); }
      else if (cmd === 'hat') { mathRuns(arg, out, { ...style, bold: true, italic: false }); out.push({ text: '̂', ...style }); }
      else mathRuns(arg, out, style);
      continue;
    }
    if (c === '_' || c === '^') {
      const [arg, next] = readGroup(src, i + 1);
      i = next;
      const shift = c === '_' ? 'sub' : 'sup';
      mathRuns(arg, out, { ...style, shift });
      continue;
    }
    if (c === 'Δ') {
      // Difference operator: upright, and never part of a word.
      out.push({ text: c, ...style, italic: false });
      i++;
      continue;
    }
    if (LETTER.test(c)) {
      let j = i;
      while (j < src.length && LETTER.test(src[j]) && src[j] !== 'Δ') j++;
      const word = src.slice(i, j);
      if (word.length === 1 || style.vector) out.push({ text: word, ...style, italic: style.italic ?? true });
      else out.push({ text: word, ...style, italic: false });
      i = j;
      continue;
    }
    let j = i;
    while (j < src.length && !LETTER.test(src[j]) && !'\\_^'.includes(src[j])) j++;
    out.push({ text: src.slice(i, j).replace(/-/g, '−'), ...style, italic: false });
    i = j;
  }
}

/** Parse a label into styled runs. */
export function parseMath(label) {
  const out = [];
  const parts = String(label ?? '').split('$');
  parts.forEach((part, idx) => {
    if (part === '') return;
    if (idx % 2 === 1) mathRuns(part, out, {});
    else out.push({ text: part, italic: false });
  });
  return out;
}

/**
 * Convert a label into <tspan> markup for a text of the given font size (px).
 * Sub/superscripts use explicit dy offsets so they render identically in all
 * browsers and in exported SVG.
 */
export function mathMarkup(label, fontSize = 14) {
  const runs = parseMath(label);
  let baseline = 0; // current vertical offset in px
  let html = '';
  for (const r of runs) {
    const target = r.shift === 'sub' ? fontSize * 0.32 : r.shift === 'sup' ? -fontSize * 0.42 : 0;
    const dy = target - baseline;
    baseline = target;
    const attrs = [];
    if (dy !== 0) attrs.push(`dy="${+dy.toFixed(2)}"`);
    if (r.shift) attrs.push(`font-size="${+(fontSize * 0.7).toFixed(2)}"`);
    if (r.italic) attrs.push('font-style="italic"');
    if (r.bold) attrs.push('font-weight="700"');
    html += `<tspan ${attrs.join(' ')}>${escapeXml(r.text)}</tspan>`;
  }
  if (baseline !== 0) html += `<tspan dy="${+(-baseline).toFixed(2)}">​</tspan>`;
  return html;
}

/** Rough advance-width estimate for layout (no DOM measurement needed). */
export function estimateWidth(label, fontSize = 14) {
  let w = 0;
  for (const r of parseMath(label)) {
    const s = r.shift ? 0.7 : 1;
    for (const ch of r.text) w += (/[mwMW]/.test(ch) ? 0.82 : /[il.,:;'|]/.test(ch) ? 0.3 : /\s/.test(ch) ? 0.3 : 0.56) * s;
  }
  return w * fontSize;
}

/** Format a number for labels with sensible significant figures. */
export function fmt(v, digits = 2) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(1).replace('-', '−');
  const s = v.toFixed(a >= 100 ? Math.max(0, digits - 2) : a >= 10 ? Math.max(0, digits - 1) : digits);
  return (s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s).replace('-', '−');
}

/** Convert a label into HTML (for panels outside the SVG). */
export function mathHtml(label) {
  let html = '';
  for (const r of parseMath(label)) {
    let t = escapeXml(r.text);
    if (r.italic) t = `<i>${t}</i>`;
    if (r.bold) t = `<b>${t}</b>`;
    if (r.shift === 'sub') t = `<sub>${t}</sub>`;
    else if (r.shift === 'sup') t = `<sup>${t}</sup>`;
    html += t;
  }
  return html;
}
