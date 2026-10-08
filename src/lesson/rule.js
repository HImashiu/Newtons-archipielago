// Rule tiles: the redesigned "blocks". A rule says how a property changes in
// one tick of the clock, e.g.   x ← x + v · Δt
// Every tile is a physical quantity with a unit; the rule is checked with
// dimensional analysis as it is built, and whatever valid rule the learner
// builds is exactly what the simulation runs.

/** Quantities available in Lesson 1. dims = exponents of (m, s). */
export const QUANTITIES = {
  x: { sym: 'x', name: 'position', dims: { m: 1, s: 0 } },
  v: { sym: 'v', name: 'velocity', dims: { m: 1, s: -1 } },
  dt: { sym: 'Δt', name: 'time step', dims: { m: 0, s: 1 } },
};

export const OPERATORS = {
  '+': { sym: '+', name: 'plus' },
  '×': { sym: '×', name: 'times' },
};

export function unitName({ m, s }) {
  if (m === 0 && s === 0) return '1';
  const pow = (u, e) => (e === 1 ? u : `${u}${{ 2: '²', 3: '³', '-1': '⁻¹', '-2': '⁻²' }[e] ?? `^${e}`}`);
  const num = [], den = [];
  if (m > 0) num.push(pow('m', m));
  if (s > 0) num.push(pow('s', s));
  if (m < 0) den.push(pow('m', -m));
  if (s < 0) den.push(pow('s', -s));
  const n = num.join('·') || '1';
  return den.length ? `${n}/${den.join('·')}` : n;
}

const KIND_OF = { 'm/1': 'a position', 'm/s': 'a velocity', 's/1': 'a time', '1/1': 'a plain number' };
export function describeUnit(d) {
  const name = unitName(d);
  return KIND_OF[`${name}/1`] ?? KIND_OF[name] ?? `${name}`;
}

const same = (a, b) => a.m === b.m && a.s === b.s;

/**
 * Analyse a tile sequence (sum of products). Returns
 *   { ok, complete, dims, error, terms }
 * where error is a learner-facing explanation.
 */
export function analyse(tokens) {
  if (tokens.length === 0) return { ok: false, complete: false, error: null };
  // Alternate operand / operator.
  for (let i = 0; i < tokens.length; i++) {
    const isOp = tokens[i] in OPERATORS;
    if (i % 2 === 0 && isOp) return { ok: false, complete: false, error: 'Start with a quantity, then put an operation between quantities.' };
    if (i % 2 === 1 && !isOp) return { ok: false, complete: false, error: `Put + or × between ${QUANTITIES[tokens[i - 1]]?.sym ?? 'quantities'} and ${QUANTITIES[tokens[i]]?.sym}.` };
  }
  if (tokens[tokens.length - 1] in OPERATORS) return { ok: false, complete: false, error: null };
  // Split into product terms.
  const terms = [[]];
  tokens.forEach((t, i) => {
    if (t === '+') terms.push([]);
    else if (i % 2 === 0) terms[terms.length - 1].push(t);
  });
  const termDims = terms.map((term) => term.reduce((d, q) => ({ m: d.m + QUANTITIES[q].dims.m, s: d.s + QUANTITIES[q].dims.s }), { m: 0, s: 0 }));
  for (let i = 1; i < termDims.length; i++) {
    if (!same(termDims[i], termDims[0])) {
      const a = unitName(termDims[0]), b = unitName(termDims[i]);
      return {
        ok: false, complete: true, terms, termDims,
        error: `${a} + ${b}: you can't add ${describeUnit(termDims[0])} and ${describeUnit(termDims[i])}.`,
      };
    }
  }
  return { ok: true, complete: true, dims: termDims[0], terms, termDims };
}

/** Evaluate a valid rule with values { x, v, dt }. */
export function evaluate(tokens, env) {
  const a = analyse(tokens);
  if (!a.ok) return NaN;
  return a.terms.reduce((sum, term) => sum + term.reduce((p, q) => p * env[q], 1), 0);
}

/** The rule written with symbols and, optionally, numbers substituted. */
export function render(tokens, env = null, fmt = (v) => v.toFixed(2)) {
  return tokens.map((t) => {
    if (t in OPERATORS) return ` ${OPERATORS[t].sym} `;
    return env ? fmt(env[t], t) : QUANTITIES[t].sym;
  }).join('');
}

/**
 * Run a rule for n steps from x0 and say what the learner should notice.
 * Returns { xs, verdict, correct, message }.
 */
export function judge(tokens, { x0, v, dt, n = 8 }) {
  const a = analyse(tokens);
  if (!a.ok || !a.complete) return { correct: false, xs: [], message: a.error ?? 'Finish the rule first.' };
  if (!same(a.dims, QUANTITIES.x.dims)) {
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
