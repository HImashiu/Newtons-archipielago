// Rule tiles: the redesigned "blocks". A rule says how one property changes
// in one small step, e.g.   x ← x + v · Δt      or      M ← M + V · Δx
// Every tile is a physical quantity with a unit; rules are checked with
// dimensional analysis as they are built, and whatever valid rule the learner
// builds is exactly what the simulation runs.
//
// makeSystem(quantities) builds the engine for one vocabulary of tiles.
// Units are exponent maps over base units, e.g. { kN: 1, m: 1 } = kN·m.

export const BASE_UNITS = ['kN', 'm', 's'];
export const HOLE = '?';

export const OPERATORS = {
  '+': { sym: '+', name: 'plus' },
  '×': { sym: '×', name: 'times' },
};

const exp = (d, u) => d[u] ?? 0;
export const sameDims = (a, b) => BASE_UNITS.every((u) => exp(a, u) === exp(b, u));

export function unitName(d) {
  const pow = (u, e) => (e === 1 ? u : `${u}${{ 2: '²', 3: '³' }[e] ?? `^${e}`}`);
  const num = [], den = [];
  for (const u of BASE_UNITS) {
    const e = exp(d, u);
    if (e > 0) num.push(pow(u, e));
    if (e < 0) den.push(pow(u, -e));
  }
  const n = num.join('·') || '1';
  return den.length ? `${n}/${den.join('·')}` : n;
}

export function makeSystem(quantities, kinds = {}) {
  const describe = (d) => kinds[unitName(d)] ?? unitName(d);
  const isQ = (t) => t in quantities;

  /**
   * Analyse a tile sequence (sum of products). Returns
   *   { ok, complete, dims, error, terms }
   * where error is a learner-facing explanation.
   */
  function analyse(tokens) {
    if (tokens.length === 0) return { ok: false, complete: false, error: null };
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const isOp = t in OPERATORS;
      if (i % 2 === 0 && isOp) return { ok: false, complete: false, error: 'Start with a quantity, then put an operation between quantities.' };
      if (i % 2 === 1 && !isOp) {
        const a = quantities[tokens[i - 1]]?.sym ?? 'quantities';
        return { ok: false, complete: false, error: `Put + or × between ${a} and ${quantities[t]?.sym ?? 'the next tile'}.` };
      }
    }
    if (tokens[tokens.length - 1] in OPERATORS) return { ok: false, complete: false, error: null };
    if (tokens.includes(HOLE)) return { ok: false, complete: false, hole: true, error: null };
    const terms = [[]];
    tokens.forEach((t, i) => {
      if (t === '+') terms.push([]);
      else if (i % 2 === 0) terms[terms.length - 1].push(t);
    });
    const termDims = terms.map((term) => term.reduce((d, q) => {
      const out = { ...d };
      for (const u of BASE_UNITS) out[u] = exp(d, u) + exp(quantities[q].dims, u);
      return out;
    }, {}));
    for (let i = 1; i < termDims.length; i++) {
      if (!sameDims(termDims[i], termDims[0])) {
        const a = unitName(termDims[0]), b = unitName(termDims[i]);
        return {
          ok: false, complete: true, terms, termDims,
          error: `${a} + ${b}: you can't add ${describe(termDims[0])} and ${describe(termDims[i])}.`,
        };
      }
    }
    return { ok: true, complete: true, dims: termDims[0], terms, termDims };
  }

  function evaluate(tokens, env) {
    const a = analyse(tokens);
    if (!a.ok) return NaN;
    return a.terms.reduce((sum, term) => sum + term.reduce((p, q) => p * env[q], 1), 0);
  }

  /** The rule written with symbols, or with numbers substituted. */
  function render(tokens, env = null, fmt = (v) => v.toFixed(2)) {
    return tokens.map((t) => {
      if (t in OPERATORS) return ` ${OPERATORS[t].sym} `;
      if (t === HOLE) return ' ▢ ';
      return env ? fmt(env[t], t) : quantities[t].sym;
    }).join('');
  }

  return { quantities, kinds, describe, analyse, evaluate, render, isQ };
}

// ------------------------------------------------------------- Lesson 1

export const QUANTITIES = {
  x: { sym: 'x', math: '$x$', name: 'position', dims: { m: 1 } },
  v: { sym: 'v', math: '$v$', name: 'velocity', dims: { m: 1, s: -1 } },
  dt: { sym: 'Δt', math: 'Δ$t$', name: 'time step', dims: { s: 1 } },
};

export const L1 = makeSystem(QUANTITIES, { m: 'a position', 'm/s': 'a velocity', s: 'a time', 1: 'a plain number' });
export const { analyse, evaluate, render } = L1;
export const describeUnit = L1.describe;

/**
 * Run a Lesson 1 rule for n steps from x0 and say what the learner should
 * notice. Returns { xs, correct, message }.
 */
export function judge(tokens, { x0, v, dt, n = 8 }) {
  const a = analyse(tokens);
  if (!a.ok || !a.complete) return { correct: false, xs: [], message: a.error ?? (a.hole ? 'Fill the empty tile first.' : 'Finish the rule first.') };
  if (!sameDims(a.dims, QUANTITIES.x.dims)) {
    return { correct: false, xs: [], message: `This rule gives ${unitName(a.dims)} — ${describeUnit(a.dims)} — but x is a position, measured in metres.` };
  }
  const xs = [x0];
  let x = x0;
  for (let i = 0; i < n; i++) {
    x = evaluate(tokens, { x, v, dt });
    xs.push(x);
  }
  const expected = xs.map((_, i) => x0 + v * dt * i);
  const err = Math.max(...xs.map((xi, i) => Math.abs(xi - expected[i])));
  if (err < 1e-9) return { correct: true, xs, message: 'That’s the rule: every tick the cart moves on by v·Δt. It matches the motion we observed.' };
  if (xs.every((xi) => Math.abs(xi - x0) < 1e-9)) return { correct: false, xs, message: 'The cart never moves: this rule just copies x. Each tick should add the distance covered in Δt.' };
  if (xs.slice(1).every((xi) => Math.abs(xi - xs[1]) < 1e-9)) return { correct: false, xs, message: `The cart jumps to ${xs[1].toFixed(2)} m and stays there: the rule forgets where the cart already was.` };
  const growth = xs.length > 3 && Math.abs(xs[3] - xs[2]) > 1.5 * Math.abs(xs[2] - xs[1]) + 1e-9;
  if (growth) return { correct: false, xs, message: 'The steps keep getting bigger, so the cart runs away. A steady cart should move the same distance every tick.' };
  const speed = (xs[xs.length - 1] - xs[0]) / (dt * n);
  return { correct: false, xs, message: `The cart moves at ${speed.toFixed(2)} m/s, not ${v.toFixed(1)} m/s. Compare its dots with the dashed line.` };
}

export const CORRECT_RULE = ['x', '+', 'v', '×', 'dt'];
