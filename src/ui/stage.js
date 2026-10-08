// The stage: owns the SVG, camera and painter, assembles the per-frame view
// from the level + learner choices, and turns pointer input into edits of the
// physics world (dragging bodies, vector tips, level handles, dimensions…).

import * as V from '../core/vec.js';
import { Painter, Camera } from '../render/painter.js';
import { renderScene } from '../render/scene.js';
import { line as dLine } from '../render/draft.js';
import { fmt } from '../render/mathtext.js';

export const TOOLS = {
  select: { label: 'Select & move', icon: 'M5 3l12 9-5 1 3 6-2 1-3-6-4 3z' },
  point: { label: 'Add point', icon: 'M12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6' },
  ball: { label: 'Add ball', icon: 'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16' },
  box: { label: 'Add box', icon: 'M5 7h14v10H5z' },
  spring: { label: 'Connect with spring', icon: 'M3 12h3l2-5 3 10 3-10 3 10 2-5h2' },
  rod: { label: 'Connect with rod', icon: 'M5 17L19 7M5 17a2 2 0 1 1 0 .1M19 7a2 2 0 1 1 0 .1' },
  force: { label: 'Add a force', icon: 'M4 12h13M13 7l5 5-5 5' },
  pin: { label: 'Pin / unpin', icon: 'M12 5v9M8 14h8l-4 5z' },
  delete: { label: 'Delete', icon: 'M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12' },
};

export class Stage {
  constructor(container, sim) {
    this.container = container;
    this.sim = sim;
    this.svg = container.querySelector('svg');
    this.painter = new Painter(this.svg);
    this.camera = new Camera();
    this.tool = 'select';
    this.drag = null;
    this.pending = null; // first endpoint while connecting
    this.pointerWorld = null;

    this.editor = document.createElement('input');
    this.editor.className = 'inline-editor';
    this.editor.type = 'text';
    this.editor.hidden = true;
    container.append(this.editor);
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.commitInline();
      if (e.key === 'Escape') this.closeInline();
    });
    this.editor.addEventListener('blur', () => this.commitInline());

    this.svg.addEventListener('pointerdown', (e) => this.onDown(e));
    this.svg.addEventListener('pointermove', (e) => this.onMove(e));
    this.svg.addEventListener('pointerup', (e) => this.onUp(e));
    this.svg.addEventListener('pointercancel', (e) => this.onUp(e));
    this.svg.addEventListener('pointerleave', () => { if (!this.drag) this.setHover(null); });
    this.svg.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.svg.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    const W = Math.max(200, Math.round(r.width));
    const H = Math.max(200, Math.round(r.height));
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('width', W);
    this.svg.setAttribute('height', H);
    const first = this.camera.W === 800 && this.camera.H === 600;
    this.camera.resize(W, H);
    if (first || this.fitOnResize) this.fitLevel();
  }

  fitLevel() {
    const lvl = this.sim.level;
    if (!lvl) return;
    const b = lvl.view ?? { xmin: -5, xmax: 5, ymin: -1, ymax: 5 };
    this.camera.fit(b, 30);
    this.fitOnResize = true;
  }

  setTool(tool) {
    this.tool = tool;
    this.pending = null;
    this.container.dataset.tool = tool;
    this.sim.emit('tool', tool);
  }

  // ------------------------------------------------------------ view

  buildView() {
    const sim = this.sim;
    const lvl = sim.level;
    const ctx = sim.ctx;
    const call = (fn, fallback) => {
      try {
        return fn ? fn(ctx) : fallback;
      } catch (e) {
        console.error(e);
        return fallback;
      }
    };
    const bubbles = new Map();
    for (const [id, b] of sim.bubbles) bubbles.set(id, b.text);
    const linked = new Set(sim.linked);
    const zones = call(lvl.zones, []);
    return {
      style: sim.style,
      features: sim.features,
      selection: sim.selection,
      hover: sim.hover,
      linked,
      tool: this.tool,
      vScale: lvl.scales?.v ?? 0.35,
      fScale: lvl.scales?.f ?? 0.05,
      aScale: lvl.scales?.a ?? 0.12,
      strobe: lvl.strobe ?? 0.25,
      annotations: call(lvl.annotations, []),
      zones,
      handles: call(lvl.handles, []).filter((h) => !h.when || h.when(ctx)),
      bubbles,
      predict: call(lvl.predict, sim.selection ? [sim.selection] : []),
      componentFrame: call(lvl.componentFrame, 0),
      editVelocity: lvl.editVelocity ?? sim.tier >= 2,
      editForces: lvl.editForces ?? true,
      title: { fig: lvl.fig ?? '', name: lvl.title.toUpperCase() },
    };
  }

  render() {
    this.svg.dataset.style = this.sim.style;
    this.view = this.buildView();
    renderScene(this.painter, this.camera, this.sim.world, this.view);
    this.renderPending();
  }

  renderPending() {
    const P = this.painter;
    // Painter.end() already ran; draw the rubber band directly.
    let band = this.svg.querySelector('.rubber-band');
    if (this.pending && this.pointerWorld) {
      const a = this.camera.toScreen(this.pending.pos);
      const b = this.camera.toScreen(this.pointerWorld);
      if (!band) {
        band = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        band.setAttribute('class', 'rubber-band');
        P.layers.handles.append(band);
      }
      band.setAttribute('d', dLine(a, b));
    } else if (band) band.remove();
  }

  // --------------------------------------------------------- pointer

  toWorld(e) {
    const r = this.svg.getBoundingClientRect();
    return this.camera.toWorld(e.clientX - r.left, e.clientY - r.top);
  }

  snap(p, e, step = this.sim.level.snap ?? (this.sim.features.grid ? 0.1 : 0)) {
    if (!step || e.altKey || e.shiftKey) return p;
    return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
  }

  hitOf(e) {
    const el = e.target.closest?.('[data-hit]');
    if (!el) return null;
    const raw = el.getAttribute('data-hit');
    const i = raw.indexOf(':');
    return { kind: raw.slice(0, i), id: raw.slice(i + 1) };
  }

  refOf(e) {
    const el = e.target.closest?.('[data-ref]');
    return el ? el.getAttribute('data-ref') : null;
  }

  setHover(ref) {
    if (this.sim.hover === ref) return;
    this.sim.hover = ref;
    this.sim.emit('hover', ref);
  }

  onDown(e) {
    if (e.button !== 0 && e.button !== 1) return;
    this.closeInline();
    const p = this.toWorld(e);
    const hit = this.hitOf(e);
    const world = this.sim.world;
    this.svg.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY };

    if (e.button === 1 || (!hit && this.tool === 'select')) {
      this.drag = { kind: 'pan', start, cam: { cx: this.camera.cx, cy: this.camera.cy }, moved: false };
      return;
    }

    // Creation / editing tools.
    if (this.tool !== 'select') {
      this.applyTool(this.tool, hit, p, e);
      return;
    }

    switch (hit.kind) {
      case 'body': {
        const b = world.get(hit.id);
        this.sim.select(b.id);
        this.drag = { kind: 'body', id: b.id, off: V.sub(b.pos, p), start, moved: false };
        break;
      }
      case 'select':
      case 'spring':
      case 'rod':
      case 'slider':
      case 'seg':
      case 'motor':
        this.sim.select(hit.id);
        this.drag = { kind: 'none', start, moved: false };
        break;
      case 'vtip':
      case 'vtip0':
        this.sim.select(hit.id);
        this.drag = { kind: 'vel', id: hit.id, start, moved: false };
        break;
      case 'ftip':
        this.sim.select(hit.id);
        this.drag = { kind: 'force', id: hit.id, start, moved: false };
        break;
      case 'handle':
        this.drag = { kind: 'handle', key: hit.id, start, moved: false };
        break;
      case 'sega':
      case 'segb':
        this.sim.select(hit.id);
        this.drag = { kind: hit.kind, id: hit.id, start, moved: false };
        break;
      case 'dim':
        this.drag = { kind: 'dim', key: hit.id, start, moved: false, client: { x: e.clientX, y: e.clientY } };
        break;
      default:
        this.drag = { kind: 'none', start, moved: false };
    }
  }

  onMove(e) {
    const p = this.toWorld(e);
    this.pointerWorld = p;
    const d = this.drag;
    if (!d) {
      this.setHover(this.refOf(e));
      return;
    }
    if (!d.moved && Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) < 3) return;
    d.moved = true;
    const sim = this.sim;
    const world = sim.world;
    switch (d.kind) {
      case 'pan':
        this.camera.cx = d.cam.cx - (e.clientX - d.start.x) / this.camera.scale;
        this.camera.cy = d.cam.cy + (e.clientY - d.start.y) / this.camera.scale;
        this.fitOnResize = false;
        break;
      case 'body': {
        const b = world.get(d.id);
        if (!b) break;
        const target = this.snap(V.add(p, d.off), e);
        if (sim.running) {
          world.setDrag(b.id, target);
        } else {
          this.placeBody(b, target);
        }
        break;
      }
      case 'vel': {
        const b = world.get(d.id);
        const vS = this.view?.vScale ?? 0.35;
        let v = V.scale(V.sub(p, b.pos), 1 / vS);
        if (!e.altKey && !e.shiftKey) v = { x: Math.round(v.x * 10) / 10, y: Math.round(v.y * 10) / 10 };
        b.vel = v;
        break;
      }
      case 'force': {
        const f = world.get(d.id);
        const b = world.get(f.body);
        const fS = this.view?.fScale ?? 0.05;
        let v = V.scale(V.sub(p, b.pos), 1 / fS);
        const q = sim.level.forceSnap ?? 0.5;
        if (!e.altKey && !e.shiftKey) v = { x: Math.round(v.x / q) * q, y: Math.round(v.y / q) * q };
        f.vec = v;
        break;
      }
      case 'handle': {
        const h = (this.view?.handles ?? []).find((x) => x.key === d.key);
        if (h) h.drag(sim.ctx, this.snap(p, e, h.snap ?? 0), e);
        break;
      }
      case 'sega':
      case 'segb': {
        const s = world.get(d.id);
        s[d.kind === 'sega' ? 'a' : 'b'] = this.snap(p, e);
        break;
      }
      default:
        break;
    }
  }

  onUp(e) {
    const d = this.drag;
    this.drag = null;
    if (this.svg.hasPointerCapture?.(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
    if (!d) return;
    const world = this.sim.world;
    if (d.kind === 'pan' && !d.moved) this.sim.select(null);
    if (d.kind === 'body') {
      const b = world.get(d.id);
      if (b) {
        if (b._drag && this.sim.running) world.endDrag(b.id);
        b._drag = null;
      }
      this.sim.emit('edit');
    }
    if (d.kind === 'dim' && !d.moved) this.openInline(d.key, d.client);
    if (['vel', 'force', 'handle', 'sega', 'segb'].includes(d.kind)) this.sim.emit('edit');
  }

  /** Move a body while paused/stopped, keeping linkages assembled. */
  placeBody(b, target) {
    const world = this.sim.world;
    const motor = world.motors.find((m) => m.body === b.id);
    if (motor) {
      const pivot = world.get(motor.pivot);
      motor.angle = V.angleOf(V.sub(target, pivot.pos));
      target = V.add(pivot.pos, V.fromAngle(motor.angle, motor.radius));
    }
    const slider = world.sliders.find((s) => s.body === b.id);
    if (slider) {
      const t = V.clamp(V.dot(V.sub(target, slider.origin), slider.dir), slider.min, slider.max);
      target = V.addScaled(slider.origin, slider.dir, t);
    }
    b.pos = target;
    if (!this.sim.started) b._trail = [];
    b._drag = { from: target, to: target };
    world.relax(30);
    b._drag = null;
    this.sim.level.onEdit?.(this.sim.ctx, b);
  }

  onWheel(e) {
    e.preventDefault();
    const r = this.svg.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const before = this.camera.toWorld(sx, sy);
    const k = Math.exp(-e.deltaY * 0.0015);
    this.camera.scale = V.clamp(this.camera.scale * k, 8, 600);
    const after = this.camera.toWorld(sx, sy);
    this.camera.cx += before.x - after.x;
    this.camera.cy += before.y - after.y;
    this.fitOnResize = false;
  }

  onDoubleClick(e) {
    const hit = this.hitOf(e);
    if (hit && hit.kind === 'body') {
      this.sim.select(hit.id);
      this.sim.emit('focus-name');
    }
  }

  // ------------------------------------------------------------ tools

  applyTool(tool, hit, p, e) {
    const sim = this.sim;
    const world = sim.world;
    const sp = this.snap(p, e);
    const bodyHit = hit && ['body', 'select'].includes(hit.kind) ? world.get(hit.id) : null;
    const done = () => {
      sim.structureChanged();
      sim.emit('edit');
    };
    switch (tool) {
      case 'point':
      case 'ball':
      case 'box': {
        // A point marks a location, so new points start pinned in place
        // (the pin tool frees them to act as massive particles).
        const b = world.addBody({
          shape: tool, pos: sp, mass: tool === 'point' ? 0.5 : 1,
          radius: tool === 'point' ? 0.06 : 0.3, w: 0.7, h: 0.5, trail: tool !== 'point',
          fixed: tool === 'point',
          style: tool === 'point' && sim.tier >= 2 ? { support: 'pin' } : {},
        });
        sim.select(b.id);
        this.setTool('select');
        done();
        break;
      }
      case 'spring':
      case 'rod': {
        let target = bodyHit;
        if (!target) {
          target = world.addBody({ shape: 'point', pos: sp, fixed: true, name: 'anchor', style: { support: sim.tier >= 2 ? 'pin' : null } });
        }
        if (!this.pending) {
          this.pending = target;
          done();
          return;
        }
        if (target.id === this.pending.id) return;
        const c = tool === 'spring'
          ? world.addSpring({ a: this.pending.id, b: target.id, k: 30 })
          : world.addRod({ a: this.pending.id, b: target.id });
        this.pending = null;
        sim.select(c.id);
        this.setTool('select');
        done();
        break;
      }
      case 'force': {
        if (!bodyHit || bodyHit.fixed) return;
        const f = world.addForce({ body: bodyHit.id, vec: { x: 5, y: 0 }, name: 'F' });
        sim.select(f.id);
        this.setTool('select');
        done();
        break;
      }
      case 'pin': {
        if (!bodyHit) return;
        bodyHit.fixed = !bodyHit.fixed;
        bodyHit.vel = { x: 0, y: 0 };
        if (bodyHit.fixed && bodyHit.shape === 'point') bodyHit.style.support = bodyHit.style.support ?? (sim.tier >= 2 ? 'pin' : null);
        sim.select(bodyHit.id);
        done();
        break;
      }
      case 'delete': {
        if (!hit) return;
        const id = hit.id;
        const ent = world.get(id);
        if (!ent || ent.locked || ent.style?.protected) return;
        world.remove(id);
        if (sim.selection === id) sim.select(null);
        done();
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------- inline dimension edit

  openInline(key, client) {
    const ann = (this.view?.annotations ?? []).find((a) => a.key === key && a.edit);
    if (!ann) return;
    const r = this.container.getBoundingClientRect();
    this.inline = { key };
    this.editor.hidden = false;
    this.editor.value = fmt(ann.edit.value, 3).replace('−', '-');
    this.editor.style.left = `${client.x - r.left - 40}px`;
    this.editor.style.top = `${client.y - r.top - 14}px`;
    this.editor.setAttribute('aria-label', ann.edit.label ?? 'value');
    this.editor.title = `${ann.edit.label ?? ''} (${ann.edit.unit ?? ''}) — Enter to apply`;
    this.editor.focus();
    this.editor.select();
  }

  commitInline() {
    if (!this.inline) return;
    const ann = (this.view?.annotations ?? []).find((a) => a.key === this.inline.key && a.edit);
    const v = parseFloat(this.editor.value.replace('−', '-'));
    if (ann && Number.isFinite(v)) {
      const lo = ann.edit.min ?? -Infinity, hi = ann.edit.max ?? Infinity;
      ann.edit.apply(this.sim.ctx, V.clamp(v, lo, hi));
      this.sim.emit('edit');
    }
    this.closeInline();
  }

  closeInline() {
    this.inline = null;
    this.editor.hidden = true;
  }

  // ------------------------------------------------------------ export

  exportSVG() {
    const clone = this.svg.cloneNode(true);
    const src = this.svg.querySelectorAll('*');
    const dst = clone.querySelectorAll('*');
    const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-style', 'font-weight', 'paint-order', 'display', 'visibility'];
    const drop = [];
    src.forEach((el, i) => {
      if (el.matches('.hit-line, .hit-area, .tip-handle, .level-handle, .handle, .selection-ring, .rubber-band')) drop.push(dst[i]);
      const cs = getComputedStyle(el);
      const style = props.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
      dst[i].setAttribute('style', style);
      dst[i].removeAttribute('class');
      dst[i].removeAttribute('data-hit');
      dst[i].removeAttribute('data-ref');
    });
    drop.forEach((n) => n.remove());
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', getComputedStyle(this.svg).getPropertyValue('--paper').trim() || '#fff');
    clone.insertBefore(bg, clone.firstChild);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scratch-physics-${this.sim.level.id}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
