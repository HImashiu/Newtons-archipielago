// Wires the sandbox together: simulation, stage, block editor and panels.

import { Sim, TIER_NAMES } from './ui/sim.js';
import { Stage, TOOLS } from './ui/stage.js';
import { BlockEditor } from './blocks/editor.js';
import { Inspector } from './ui/inspector.js';
import { EquationsPanel } from './ui/equations.js';
import { Plot } from './ui/plot.js';
import { TIERS, LEVELS, levelById } from './levels/index.js';
import * as store from './ui/store.js';

const $ = (id) => document.getElementById(id);

const sim = new Sim();
const stage = new Stage($('stage'), sim);
const inspector = new Inspector($('inspector'), sim);
inspector.stage = stage;
const equations = new EquationsPanel($('equations'), sim);
const plot = new Plot($('plot'), sim);

const idsForNames = (names) => new Set((names ?? []).map((n) => sim.world.byName(n)?.id).filter(Boolean));

const editor = new BlockEditor($('blocks'), {
  names: (kind) => sim.world.all().filter((e) => (kind === 'body' ? e.kind === 'body' : e.kind === kind)).map((e) => e.name),
  onChange: (program) => sim.setProgram(program),
  onHover: (names) => { sim.linked = idsForNames(names); },
});

// ------------------------------------------------------------------ levels

function loadLevel(level) {
  sim.load(level);
  store.setPref('level', level.id);
  stage.setTool('select');
  stage.fitLevel();
  editor.setAllowed(level.blocks ?? null);
  editor.setProgram(sim.program);
  renderMission();
  renderToolbar();
  renderViewMenu();
  const tier = TIER_NAMES[level.tier];
  $('tier-chip').textContent = tier;
  $('tier-chip').dataset.tier = level.tier;
  $('level-name').textContent = `${level.fig} · ${level.title}`;
  document.body.dataset.tier = level.tier;
  const i = LEVELS.indexOf(level);
  $('prev-level').disabled = i <= 0;
  $('next-level').disabled = i >= LEVELS.length - 1;
  document.title = `${level.title} — Scratch Physics`;
}

function renderMission() {
  const lvl = sim.level;
  $('concept').textContent = lvl.concept;
  $('mission-title').textContent = lvl.title;
  $('intro').innerHTML = lvl.intro.map((p) => `<p>${p}</p>`).join('');
  renderGoals();
}

function renderGoals() {
  const lvl = sim.level;
  const goals = lvl.goals ?? [];
  $('goals').innerHTML = goals.map((g) => `<li class="${sim.goalsDone.has(g.id) ? 'is-done' : ''}"><span class="tick" aria-hidden="true"></span><span>${g.text}</span></li>`).join('');
  $('goals').hidden = goals.length === 0;
  const i = LEVELS.indexOf(lvl);
  $('next-btn').hidden = !(sim.isComplete() && i < LEVELS.length - 1);
}

function renderToolbar() {
  const tools = sim.level.tools ?? ['select'];
  const bar = $('toolbar');
  bar.hidden = tools.length <= 1;
  bar.innerHTML = tools.map((t) => `<button class="tool${stage.tool === t ? ' is-active' : ''}" data-tool="${t}" title="${TOOLS[t].label}" aria-label="${TOOLS[t].label}" aria-pressed="${stage.tool === t}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${TOOLS[t].icon}"/></svg><span>${TOOLS[t].short}</span></button>`).join('');
}

function renderViewMenu() {
  const menu = $('view-menu');
  menu.innerHTML = sim.options.map((o) => {
    const v = sim.features[o.key];
    if (o.options) {
      return `<label class="menu-row"><span>${o.label}</span><select data-key="${o.key}">${o.options.map(([val, lbl]) => `<option value="${val}"${String(v ?? '') === val ? ' selected' : ''}>${lbl}</option>`).join('')}</select></label>`;
    }
    return `<label class="menu-row"><span>${o.label}</span><input type="checkbox" data-key="${o.key}"${v ? ' checked' : ''}></label>`;
  }).join('');
}

function renderMap() {
  const current = sim.level;
  $('map-tiers').innerHTML = TIERS.map((t) => `
    <section class="map-tier" data-tier="${t.tier}">
      <h3><span class="tier-chip" data-tier="${t.tier}">${t.name}</span></h3>
      <p class="muted small">${t.blurb}</p>
      ${t.soon ? '<p class="soon">Coming next</p>' : ''}
      <ol class="map-levels">${t.levels.map((l) => {
        const done = sim.isComplete(l);
        return `<li><button class="map-level${l === current ? ' is-current' : ''}${done ? ' is-done' : ''}" data-level="${l.id}">
          <span class="fig">${l.fig}</span><span class="t">${l.title}</span><span class="c muted">${l.concept}</span>${done ? '<span class="done-mark" aria-label="completed">✓</span>' : ''}</button></li>`;
      }).join('')}</ol>
    </section>`).join('');
}

// ------------------------------------------------------------- transport

function updateTransport() {
  const run = $('run');
  run.classList.toggle('is-running', sim.running);
  run.querySelector('.run-label').textContent = sim.running ? 'Pause' : sim.started ? 'Resume' : 'Run';
  run.title = sim.running ? 'Pause' : 'Run the simulation and the program';
  $('reset').disabled = !sim.started;
  document.body.classList.toggle('is-started', sim.started);
}

$('run').addEventListener('click', () => sim.toggle());
$('step').addEventListener('click', () => sim.stepOnce());
$('reset').addEventListener('click', () => sim.reset());
$('reset-program').addEventListener('click', () => {
  sim.resetProgram();
  editor.setProgram(sim.program);
});
$('prev-level').addEventListener('click', () => loadLevel(LEVELS[LEVELS.indexOf(sim.level) - 1]));
$('next-level').addEventListener('click', () => loadLevel(LEVELS[LEVELS.indexOf(sim.level) + 1]));
$('next-btn').addEventListener('click', () => loadLevel(LEVELS[LEVELS.indexOf(sim.level) + 1]));
$('export').addEventListener('click', () => stage.exportSVG());

$('open-map').addEventListener('click', () => {
  renderMap();
  $('map').showModal();
});
$('close-map').addEventListener('click', () => $('map').close());
$('map').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-level]');
  if (btn) {
    loadLevel(levelById(btn.dataset.level));
    $('map').close();
  } else if (e.target === $('map')) $('map').close();
});

$('toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (b) stage.setTool(b.dataset.tool);
});

$('view-btn').addEventListener('click', (e) => {
  const menu = $('view-menu');
  menu.hidden = !menu.hidden;
  $('view-btn').setAttribute('aria-expanded', String(!menu.hidden));
  e.stopPropagation();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu')) {
    $('view-menu').hidden = true;
    $('view-btn').setAttribute('aria-expanded', 'false');
  }
});
$('view-menu').addEventListener('change', (e) => {
  const el = e.target.closest('[data-key]');
  if (!el) return;
  sim.features[el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value;
});

// Keyboard: program "when key pressed" hats, plus a few editing shortcuts.
const KEYMAP = { ' ': 'space', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'a', d: 'd', w: 'w', s: 's' };
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, [contenteditable]')) return;
  if (KEYMAP[e.key] && sim.running) {
    sim.interp.key(KEYMAP[e.key]);
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape') {
    sim.select(null);
    stage.setTool('select');
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sim.selection && sim.level.tools?.includes('delete')) {
    const ent = sim.world.get(sim.selection);
    if (ent && !ent.locked && !ent.style?.protected) {
      sim.world.remove(ent.id);
      sim.select(null);
      sim.structureChanged();
    }
  }
});

// ------------------------------------------------------------ sim events

sim.on('run', updateTransport);
sim.on('goals', renderGoals);
sim.on('tool', renderToolbar);
sim.on('program', () => editor.setProgram(sim.program));
sim.on('structure', () => editor.renderPalette());
sim.on('hover', (ref) => {
  // Scene → blocks: highlight the blocks that use the hovered object.
  const id = ref && ref.includes(':') ? ref.split(':')[1] : ref;
  const ent = id ? sim.world.get(id) : null;
  editor.setLinkedNames(ent ? [ent.name] : []);
});
sim.on('names-linked', (names) => editor.setLinkedNames(names));

// ------------------------------------------------------------------ loop

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  sim.update(dt);
  stage.render();
  inspector.update();
  equations.update();
  plot.update();
  editor.setRuntime(sim.interp.activeBlocks(), sim.interp.errors);
  requestAnimationFrame(loop);
}

loadLevel(levelById(new URLSearchParams(location.search).get('level')) ?? levelById(store.getPref('level', null)) ?? LEVELS[0]);
requestAnimationFrame(loop);

// Exposed for debugging and automated checks.
window.scratchPhysics = { sim, stage, editor, loadLevel, LEVELS };
