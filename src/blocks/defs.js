// Block definitions. A block's `text` is a template: {slot:kind} marks an input.
//
// Slot kinds
//   num    expression input (numbers, or live physics like ball.x * 2)
//   cond   expression input read as true/false (ball.y < 0.5)
//   text   free text; {expr} pieces inside are evaluated (say "v = {ball.vx}")
//   body | spring | motor | force   dropdown of scene entities of that kind
//   target dropdown of bodies + "ground" + "anything"
//   key    dropdown of keyboard keys
//   onoff  on / off

export const CATEGORIES = {
  events: { label: 'Events', color: '#d9a400' },
  motion: { label: 'Motion', color: '#4c97ff' },
  forces: { label: 'Forces', color: '#ff5a5f' },
  world: { label: 'World', color: '#36a85c' },
  control: { label: 'Control', color: '#ff9f1a' },
  output: { label: 'Output', color: '#9966ff' },
};

export const BLOCKS = {
  // events -----------------------------------------------------------------
  whenFlag: { cat: 'events', shape: 'hat', text: 'when ▶ run clicked' },
  whenTouch: { cat: 'events', shape: 'hat', text: 'when {a:body} touches {b:target}', defaults: { b: 'anything' } },
  whenKey: { cat: 'events', shape: 'hat', text: 'when {key:key} key pressed', defaults: { key: 'space' } },
  whenCond: { cat: 'events', shape: 'hat', text: 'when {cond:cond} becomes true', defaults: { cond: 't > 2' } },

  // motion -----------------------------------------------------------------
  setPos: { cat: 'motion', shape: 'stack', text: 'set position of {body:body} to x {x:num} y {y:num} m', defaults: { x: '0', y: '0' } },
  setVel: { cat: 'motion', shape: 'stack', text: 'set velocity of {body:body} to vx {vx:num} vy {vy:num} m/s', defaults: { vx: '1', vy: '0' } },
  changeVel: { cat: 'motion', shape: 'stack', text: 'change velocity of {body:body} by Δvx {dvx:num} Δvy {dvy:num}', defaults: { dvx: '0.5', dvy: '0' } },
  launch: { cat: 'motion', shape: 'stack', text: 'launch {body:body} at {speed:num} m/s, angle {angle:num}°', defaults: { speed: '8', angle: '45' } },
  hold: { cat: 'motion', shape: 'stack', text: 'stop {body:body} moving' },

  // forces -----------------------------------------------------------------
  applyForce: { cat: 'forces', shape: 'stack', text: 'push {body:body} with Fx {fx:num} Fy {fy:num} N', defaults: { fx: '5', fy: '0' } },
  impulse: { cat: 'forces', shape: 'stack', text: 'kick {body:body} with Jx {jx:num} Jy {jy:num} N·s', defaults: { jx: '2', jy: '0' } },
  setForce: { cat: 'forces', shape: 'stack', text: 'set force {force:force} to Fx {fx:num} Fy {fy:num} N', defaults: { fx: '10', fy: '0' } },
  toggleForce: { cat: 'forces', shape: 'stack', text: 'turn force {force:force} {on:onoff}', defaults: { on: 'on' } },

  // world -----------------------------------------------------------------
  setGravity: { cat: 'world', shape: 'stack', text: 'set gravity to {g:num} m/s²', defaults: { g: '9.81' } },
  setMass: { cat: 'world', shape: 'stack', text: 'set mass of {body:body} to {m:num} kg', defaults: { m: '2' } },
  setK: { cat: 'world', shape: 'stack', text: 'set stiffness of {spring:spring} to {k:num} N/m', defaults: { k: '40' } },
  setDamping: { cat: 'world', shape: 'stack', text: 'set damping of {spring:spring} to {c:num} N·s/m', defaults: { c: '1' } },
  setMotor: { cat: 'world', shape: 'stack', text: 'set {motor:motor} speed to {w:num} rad/s', defaults: { w: '2' } },
  setFriction: { cat: 'world', shape: 'stack', text: 'set friction of {body:body} to μ {mu:num}', defaults: { mu: '0.3' } },
  setBounce: { cat: 'world', shape: 'stack', text: 'set bounciness of {body:body} to e {e:num}', defaults: { e: '0.8' } },

  // control ----------------------------------------------------------------
  wait: { cat: 'control', shape: 'stack', text: 'wait {s:num} s', defaults: { s: '1' } },
  repeat: { cat: 'control', shape: 'c', text: 'repeat {n:num}', defaults: { n: '10' } },
  forever: { cat: 'control', shape: 'c', cap: true, text: 'forever' },
  if: { cat: 'control', shape: 'c', text: 'if {cond:cond} then', defaults: { cond: 'ball.y < 1' } },
  waitUntil: { cat: 'control', shape: 'stack', text: 'wait until {cond:cond}', defaults: { cond: 'ball.y < 0.5' } },
  stop: { cat: 'control', shape: 'stack', cap: true, text: 'pause simulation' },

  // output -----------------------------------------------------------------
  say: { cat: 'output', shape: 'stack', text: '{body:body} says {msg:text}', defaults: { msg: 'Hello!' } },
  trace: { cat: 'output', shape: 'stack', text: 'trace path of {body:body} {on:onoff}', defaults: { on: 'on' } },
  plot: { cat: 'output', shape: 'stack', text: 'plot {value:num} as {name:text}', defaults: { value: 'ball.y', name: 'height' } },
};

export const KEYS = ['space', 'left', 'right', 'up', 'down', 'a', 'd', 'w', 's'];

/** Split a block template into text pieces and slot descriptors. */
export function parseTemplate(text) {
  const parts = [];
  const re = /\{(\w+)(?::(\w+))?\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ slot: m[1], kind: m[2] ?? m[1] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function slotsOf(type) {
  return parseTemplate(BLOCKS[type].text).filter((p) => p.slot);
}

let counter = 0;
export function newId() {
  counter++;
  return `blk${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/**
 * Create a block instance. `args` override defaults; entity slots default to
 * the first matching entity name supplied in `names`.
 */
export function makeBlock(type, args = {}, children = null, names = {}) {
  const def = BLOCKS[type];
  if (!def) throw new Error(`Unknown block type ${type}`);
  const block = { id: newId(), type, args: {} };
  for (const s of slotsOf(type)) {
    let v = args[s.slot] ?? def.defaults?.[s.slot];
    if (v === undefined) {
      if (['body', 'target'].includes(s.kind)) v = names.body ?? '';
      else if (s.kind === 'spring') v = names.spring ?? '';
      else if (s.kind === 'motor') v = names.motor ?? '';
      else if (s.kind === 'force') v = names.force ?? '';
      else if (s.kind === 'onoff') v = 'on';
      else v = '';
    }
    block.args[s.slot] = String(v);
  }
  if (def.shape === 'c') block.children = children ?? [];
  return block;
}

/** Shorthand used by level files: B('setVel', {vx: 2}) / B('forever', {}, [...]) */
export const B = (type, args, children) => makeBlock(type, args, children);
export const script = (...blocks) => ({ id: newId(), blocks });

/** Deep-clone a program giving every block a fresh id. */
export function cloneProgram(program) {
  const cloneBlock = (b) => ({ ...b, id: newId(), args: { ...b.args }, children: b.children ? b.children.map(cloneBlock) : undefined });
  return { scripts: program.scripts.map((s) => ({ id: newId(), blocks: s.blocks.map(cloneBlock) })) };
}

/** Visit every block in a program. */
export function walk(program, fn) {
  const visit = (list, parent) => list.forEach((b, i) => {
    fn(b, list, i, parent);
    if (b.children) visit(b.children, b);
  });
  for (const s of program.scripts) visit(s.blocks, null);
}

/** Entity names referenced by a block's dropdown slots. */
export function referencedNames(block) {
  const names = [];
  for (const s of slotsOf(block.type)) {
    if (['body', 'target', 'spring', 'motor', 'force'].includes(s.kind)) names.push(block.args[s.slot]);
    if (['num', 'cond', 'text'].includes(s.kind)) {
      const m = String(block.args[s.slot] ?? '').match(/[A-Za-z_][\w]*(?=\.)/g);
      if (m) names.push(...m);
    }
  }
  return names;
}
