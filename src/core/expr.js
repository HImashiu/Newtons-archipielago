// A tiny, safe expression language for block inputs.
//
//   2*ball.x - 3          sin(t) * 4          ball.y < 0.5 && ball.vy < 0
//
// Grammar (lowest to highest precedence):
//   or      := and ('||' and)*
//   and     := cmp ('&&' cmp)*
//   cmp     := sum (('<' | '>' | '<=' | '>=' | '==' | '!=') sum)?
//   sum     := product (('+' | '-') product)*
//   product := unary (('*' | '/' | '%') unary)*
//   unary   := ('-' | '+' | '!') unary | power
//   power   := atom ('^' unary)?
//   atom    := number | name ('.' name)? | name '(' args ')' | '(' or ')'
//
// compile() returns a function (scope) => number. Names are resolved at run
// time through scope.lookup(name, prop), so expressions follow live physics.

const FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos,
  atan: Math.atan, atan2: Math.atan2, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
  log: Math.log, ln: Math.log, min: Math.min, max: Math.max, sign: Math.sign,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, hypot: Math.hypot,
  deg: (r) => (r * 180) / Math.PI, rad: (d) => (d * Math.PI) / 180,
};

const CONSTANTS = { pi: Math.PI, PI: Math.PI, e: Math.E, true: 1, false: 0 };

export class ExprError extends Error {}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new ExprError(`Bad number near "${src.slice(i, i + 6)}"`);
      tokens.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_Ͱ-Ͽ]/.test(c)) {
      const m = /^[A-Za-z_Ͱ-Ͽ][A-Za-z0-9_Ͱ-Ͽ]*/.exec(src.slice(i));
      tokens.push({ t: 'name', v: m[0] });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if ('+-*/%^()<>,.!'.includes(c)) {
      tokens.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '×' || c === '·') { tokens.push({ t: 'op', v: '*' }); i++; continue; }
    if (c === '−') { tokens.push({ t: 'op', v: '-' }); i++; continue; }
    throw new ExprError(`Unexpected "${c}"`);
  }
  return tokens;
}

export function compile(src) {
  const text = String(src ?? '').trim();
  if (text === '') throw new ExprError('Empty input');
  const tokens = tokenize(text);
  let pos = 0;
  const names = new Set();

  const peek = () => tokens[pos];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const expect = (v) => {
    if (!isOp(v)) throw new ExprError(`Expected "${v}"`);
    pos++;
  };

  function parseOr() {
    let left = parseAnd();
    while (isOp('||')) {
      pos++;
      const l = left, r = parseAnd();
      left = (s) => (l(s) || r(s) ? 1 : 0);
    }
    return left;
  }
  function parseAnd() {
    let left = parseCmp();
    while (isOp('&&')) {
      pos++;
      const l = left, r = parseCmp();
      left = (s) => (l(s) && r(s) ? 1 : 0);
    }
    return left;
  }
  function parseCmp() {
    const left = parseSum();
    const tok = peek();
    if (tok && tok.t === 'op' && ['<', '>', '<=', '>=', '==', '!='].includes(tok.v)) {
      pos++;
      const right = parseSum();
      const l = left, r = right;
      switch (tok.v) {
        case '<': return (s) => (l(s) < r(s) ? 1 : 0);
        case '>': return (s) => (l(s) > r(s) ? 1 : 0);
        case '<=': return (s) => (l(s) <= r(s) ? 1 : 0);
        case '>=': return (s) => (l(s) >= r(s) ? 1 : 0);
        case '==': return (s) => (Math.abs(l(s) - r(s)) < 1e-9 ? 1 : 0);
        default: return (s) => (Math.abs(l(s) - r(s)) >= 1e-9 ? 1 : 0);
      }
    }
    return left;
  }
  function parseSum() {
    let left = parseProduct();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].v;
      const l = left, r = parseProduct();
      left = op === '+' ? (s) => l(s) + r(s) : (s) => l(s) - r(s);
    }
    return left;
  }
  function parseProduct() {
    let left = parseUnary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = tokens[pos++].v;
      const l = left, r = parseUnary();
      if (op === '*') left = (s) => l(s) * r(s);
      else if (op === '/') left = (s) => l(s) / r(s);
      else left = (s) => l(s) % r(s);
    }
    return left;
  }
  function parseUnary() {
    if (isOp('-')) { pos++; const e = parseUnary(); return (s) => -e(s); }
    if (isOp('+')) { pos++; return parseUnary(); }
    if (isOp('!')) { pos++; const e = parseUnary(); return (s) => (e(s) ? 0 : 1); }
    return parsePower();
  }
  function parsePower() {
    const base = parseAtom();
    if (isOp('^')) {
      pos++;
      const ex = parseUnary();
      return (s) => Math.pow(base(s), ex(s));
    }
    return base;
  }
  function parseAtom() {
    const tok = peek();
    if (!tok) throw new ExprError('Unexpected end of input');
    if (tok.t === 'num') { pos++; const v = tok.v; return () => v; }
    if (isOp('(')) {
      pos++;
      const e = parseOr();
      expect(')');
      return e;
    }
    if (tok.t === 'name') {
      pos++;
      const name = tok.v;
      if (isOp('(')) {
        pos++;
        const fn = FUNCTIONS[name];
        if (!fn) throw new ExprError(`Unknown function "${name}"`);
        const args = [];
        if (!isOp(')')) {
          args.push(parseOr());
          while (isOp(',')) { pos++; args.push(parseOr()); }
        }
        expect(')');
        return (s) => fn(...args.map((a) => a(s)));
      }
      if (isOp('.')) {
        pos++;
        const prop = peek();
        if (!prop || prop.t !== 'name') throw new ExprError(`Expected a property after "${name}."`);
        pos++;
        names.add(name);
        return (s) => s.lookup(name, prop.v);
      }
      if (name in CONSTANTS) { const v = CONSTANTS[name]; return () => v; }
      names.add(name);
      return (s) => s.lookup(name, null);
    }
    throw new ExprError(`Unexpected "${tok.v}"`);
  }

  const fn = parseOr();
  if (pos < tokens.length) throw new ExprError(`Unexpected "${tokens[pos].v}"`);
  const isConstant = names.size === 0;
  fn.names = names;
  fn.isConstant = isConstant;
  return fn;
}

const cache = new Map();

/** Compile with memoisation; returns {fn} or {error}. */
export function tryCompile(src) {
  const key = String(src ?? '');
  if (cache.has(key)) return cache.get(key);
  let out;
  try {
    out = { fn: compile(key) };
  } catch (e) {
    out = { error: e.message };
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, out);
  return out;
}
