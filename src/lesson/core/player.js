// The lesson player: makes a lesson feel like a video you can touch.
//
// A lesson is a list of chapters; each chapter is a list of beats:
//   watch — plays for `dur` seconds; draw(api, t) is a pure function of t,
//           so the timeline can be scrubbed back and forth like a video.
//   do    — the timeline waits until done(S) is true; the learner acts on
//           the drawing (handles, clicks) or in a side panel.
//   card  — a full-stage typeset card (title, summary).
// The camera eases from each beat's framing to the next, captions change
// with the beat, and draggable things get a consistent affordance.

import { Ink } from './ink.js';
import { clamp, lerp, easeInOut } from './anim.js';
import { mathHtml } from '../../render/mathtext.js';

const DO_WEIGHT = 3.2; // timeline width of an interactive beat, in "seconds"
const SPEEDS = [1, 1.25, 1.5, 0.75];

// Interface words; a lesson may override them (e.g. ui: { chapter: 'Capítulo' }).
const UI = {
  chapter: 'Chapter', yourTurn: 'Your turn', nextStep: 'Next step', cont: 'Continue', check: 'Check',
  skip: 'Skip this step', play: 'Play', pause: 'Pause', speed: 'Playback speed',
};

/** Seconds a learner needs to read a caption (≈ 150 words per minute + a beat). */
export function readTime(text) {
  const words = String(text).replace(/<[^>]*>/g, ' ').replace(/\$/g, '').split(/\s+/).filter(Boolean).length;
  return 1.6 + words / 2.5;
}

/**
 * Stretch a watch beat so every caption can be read before the next one, and
 * the last one before the beat ends; then hold briefly.
 */
function paceBeat(seg) {
  if (seg.kind !== 'watch') return;
  const caps = Array.isArray(seg.caption) ? seg.caption : typeof seg.caption === 'string' ? [[0, seg.caption]] : [];
  let need = seg.dur;
  caps.forEach(([t0, text], i) => {
    const end = t0 + readTime(text);
    need = Math.max(need, end);
    const next = caps[i + 1];
    if (next && next[0] < end - 0.3 && typeof window !== 'undefined' && window.location?.search.includes('debug')) {
      console.warn(`Caption "${text.slice(0, 40)}…" needs ${(end - t0).toFixed(1)} s but the next starts after ${(next[0] - t0).toFixed(1)} s`);
    }
  });
  seg.dur = need + (seg.hold ?? 1.2);
}

function mathify(text) {
  // Captions: plain HTML with $math$ spans set in Computer Modern italic.
  return String(text).split(/(\$[^$]*\$)/g).map((part) => (part.startsWith('$') && part.endsWith('$') && part.length > 1
    ? `<span class="m">${mathHtml(part)}</span>`
    : part)).join('');
}

export class Player {
  constructor(root, lesson) {
    this.root = root;
    this.lesson = lesson;
    this.S = lesson.state();
    this.segs = [];
    lesson.chapters.forEach((ch, ci) => ch.beats.forEach((b, bi) => {
      const seg = { ...b, ch, ci, bi, index: this.segs.length };
      paceBeat(seg);
      this.segs.push(seg);
    }));
    this.i = 0;
    this.t = 0;
    this.playing = true;
    this.speed = 1;
    this.drag = null;
    this.hover = null;
    this.panelName = null;
    this.doneAt = new Map();

    const $ = (s) => root.querySelector(s);
    this.svg = $('.stage-svg');
    this.stageEl = $('.stage');
    this.overlay = $('.stage-overlay');
    this.captionEl = $('.caption');
    this.promptEl = $('.prompt');
    this.choicesEl = $('.choices');
    this.continueBtn = $('.continue');
    this.skipBtn = $('.skip');
    this.panelEl = $('.panel');
    this.playBtn = $('.play');
    this.timelineEl = $('.timeline');
    this.chapterLabel = $('.chapter-label');
    this.speedBtn = $('.speed');
    this.chapterCard = $('.chapter-card');
    this.ink = new Ink(this.svg);
    this.ui = { ...UI, ...(lesson.ui ?? {}) };
    this.skipBtn.textContent = this.ui.skip;

    this.buildTimeline();
    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(this.stageEl);
    this.resize();
    this.enter(0);
    this.last = performance.now();
    requestAnimationFrame((n) => this.loop(n));
  }

  get seg() {
    return this.segs[this.i];
  }

  get api() {
    return { ink: this.ink, S: this.S, player: this, t: this.t, seg: this.seg };
  }

  // ------------------------------------------------------------ navigation

  enter(i, t = 0) {
    i = clamp(i, 0, this.segs.length - 1);
    const prev = this.seg;
    if (prev && prev.index !== i) prev.leave?.(this.S, this.api);
    const changed = !prev || prev.index !== i || this.firstEnter === undefined;
    this.firstEnter = false;
    this.i = i;
    this.t = t;
    const seg = this.seg;
    if (changed) seg.enter?.(this.S, this.api);
    this.drag = null;
    this.successShown = false;
    this.root.dataset.kind = seg.kind;
    this.root.dataset.chapter = seg.ch.id;
    this.chapterLabel.innerHTML = `<span class="ch-num">${seg.ch.num ?? ''}</span>${seg.ch.title}`;
    this.mountPanel();
    this.mountOverlay();
    if (changed && seg.bi === 0 && seg.kind !== 'card' && this.chapterCard) {
      this.chapterCard.innerHTML = `<span class="cc-num">${this.ui.chapter} ${seg.ch.num}</span><span class="cc-title">${seg.ch.title}</span>`;
      this.chapterCard.classList.remove('is-on');
      void this.chapterCard.offsetWidth;
      this.chapterCard.classList.add('is-on');
    } else if (changed && seg.kind === 'card' && this.chapterCard) {
      this.chapterCard.classList.remove('is-on');
    }
    this.renderCaption(true);
    this.updateTimeline();
  }

  next() {
    if (this.i < this.segs.length - 1) {
      this.enter(this.i + 1);
      this.playing = true;
    }
  }

  prev() {
    if (this.t > 1.5 && this.seg.kind === 'watch') this.enter(this.i, 0);
    else this.enter(this.i - 1);
  }

  togglePlay() {
    if (this.seg.kind !== 'watch') return;
    this.playing = !this.playing;
    if (this.playing && this.t >= this.seg.dur) this.t = 0;
    this.updatePlay();
  }

  // ----------------------------------------------------------------- loop

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const seg = this.seg;
    if (seg.kind === 'watch') {
      if (this.playing && !this.scrubbing) this.t += dt * this.speed;
      if (this.t >= seg.dur && !this.scrubbing) {
        // Worked-example steps wait for the learner before moving on.
        if (this.playing && !seg.pause && this.i < this.segs.length - 1) this.enter(this.i + 1);
        else this.t = seg.dur;
      }
      const atPause = !!seg.pause && this.t >= seg.dur;
      if (atPause !== this.atPause) {
        this.atPause = atPause;
        this.renderCaption(true);
      }
    } else {
      this.t += dt;
      seg.tick?.(this.S, dt, this.api);
      const done = !!seg.done?.(this.S, this.api);
      if (done && !this.doneAt.has(seg.index)) this.doneAt.set(seg.index, performance.now());
      if (done !== this.successShown) {
        this.successShown = done;
        this.renderCaption(true);
        this.updateTimeline();
      }
    }
    this.render();
    requestAnimationFrame((n) => this.loop(n));
  }

  // --------------------------------------------------------------- camera

  camOf(i, t) {
    const seg = this.segs[i];
    const c = typeof seg.cam === 'function' ? seg.cam(this.S, t) : seg.cam;
    return c ?? this.lesson.cam;
  }

  currentCam() {
    const cur = this.camOf(this.i, this.t);
    if (this.i === 0) return cur;
    const from = this.camOf(this.i - 1, Infinity);
    const u = easeInOut(clamp(this.t / (this.seg.camDur ?? 2.2)));
    if (u >= 1) return cur;
    return {
      xmin: lerp(from.xmin, cur.xmin, u), xmax: lerp(from.xmax, cur.xmax, u),
      ymin: lerp(from.ymin, cur.ymin, u), ymax: lerp(from.ymax, cur.ymax, u),
    };
  }

  resize() {
    const r = this.stageEl.getBoundingClientRect();
    this.ink.resize(Math.max(200, r.width), Math.max(200, r.height));
  }

  // --------------------------------------------------------------- render

  render() {
    const seg = this.seg;
    const api = this.api;
    this.ink.frame(this.currentCam(), this.lesson.pad ?? 36);
    this.ink.begin();
    try {
      seg.draw?.(api, this.t);
      const handles = this.handles();
      for (const h of handles) {
        if (h.hidden) continue;
        this.ink.handle(`hd-${h.key}`, h.p, this.drag?.key === h.key || this.hover === h.key, this.t);
      }
    } catch (e) {
      console.error(e);
    }
    this.ink.end();
    if (this.panel?.update) this.panel.update(this.S, api);
    if (typeof seg.caption === 'function' || typeof seg.prompt === 'function' || typeof seg.success === 'function' || Array.isArray(seg.caption)) this.renderCaption(false);
    this.updateProgress();
  }

  handles() {
    const seg = this.seg;
    if (!seg.handles) return [];
    try {
      return seg.handles(this.S, this.api) ?? [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  // ------------------------------------------------------------- captions

  captionText() {
    const seg = this.seg;
    const S = this.S;
    if (seg.kind === 'do') {
      if (this.successShown && seg.success) return typeof seg.success === 'function' ? seg.success(S) : seg.success;
      const c = typeof seg.caption === 'function' ? seg.caption(S) : seg.caption;
      return c ?? '';
    }
    if (Array.isArray(seg.caption)) {
      let text = '';
      for (const [t0, txt] of seg.caption) if (this.t >= t0) text = txt;
      return text;
    }
    return typeof seg.caption === 'function' ? seg.caption(S, this.t) : seg.caption ?? '';
  }

  renderCaption(force) {
    const seg = this.seg;
    const text = this.captionText();
    if (force || text !== this.lastCaption) {
      this.lastCaption = text;
      this.captionEl.classList.remove('is-in');
      void this.captionEl.offsetWidth;
      this.captionEl.innerHTML = mathify(text);
      this.captionEl.classList.add('is-in');
    }
    const prompt = seg.kind === 'do' && !this.successShown ? (typeof seg.prompt === 'function' ? seg.prompt(this.S) : seg.prompt) : null;
    const promptHtml = prompt ? `<span class="your-turn">${this.ui.yourTurn}</span><span class="prompt-text">${mathify(prompt)}</span>` : '';
    if (force || promptHtml !== this.lastPrompt) {
      this.lastPrompt = promptHtml;
      this.promptEl.innerHTML = promptHtml;
      this.promptEl.hidden = !prompt;
    }
    const paused = seg.kind === 'watch' && seg.pause && this.t >= seg.dur;
    const showContinue = ((seg.kind === 'do' && this.successShown) || paused) && this.i < this.segs.length - 1;
    this.continueBtn.hidden = !showContinue;
    this.continueBtn.querySelector('.label').textContent = seg.continueLabel ?? (paused ? this.ui.nextStep : this.ui.cont);
    this.renderControls(force);
    this.skipBtn.hidden = !(seg.kind === 'do' && !this.successShown && seg.skippable !== false);
    this.root.classList.toggle('is-success', seg.kind === 'do' && this.successShown);
  }

  /**
   * Answer controls under the prompt. A do-beat may declare
   *   controls(S) → [{ type: 'choice' | 'number' | 'button', id, label, unit, state, disabled, primary }]
   *   act(S, id, value)
   * or the shorthand choices / answered / choose for a single multiple choice.
   */
  renderControls(force) {
    const seg = this.seg;
    const S = this.S;
    let ctrls = null;
    if (seg.kind === 'do') {
      if (seg.controls) ctrls = seg.controls(S) ?? null;
      else if (seg.choices) {
        const picked = seg.answered?.(S);
        ctrls = seg.choices.map((c) => ({ type: 'choice', id: c.id, label: c.label, state: picked === c.id ? (c.correct ? 'right' : 'wrong') : null, disabled: this.successShown }));
      }
    }
    const key = ctrls ? `${seg.index}:${JSON.stringify(ctrls)}` : '';
    if (!force && key === this.lastControls) return;
    this.lastControls = key;
    this.choicesEl.hidden = !ctrls || ctrls.length === 0;
    if (!ctrls) { this.choicesEl.replaceChildren(); return; }
    const focused = document.activeElement?.closest?.('.num-entry')?.dataset.id;
    this.numValues = this.numValues ?? {};
    this.choicesEl.innerHTML = ctrls.map((c) => {
      if (c.type === 'number') {
        const v = this.numValues[`${seg.index}:${c.id}`] ?? '';
        return `<span class="num-entry${c.state ? ` is-${c.state}` : ''}" data-id="${c.id}">${c.label ? `<span class="ne-label">${mathify(c.label)}</span>` : ''}<input inputmode="decimal" autocomplete="off" spellcheck="false" value="${v}" aria-label="${(c.aria ?? c.label ?? 'answer').replace(/[$"<>]/g, '')}"${c.disabled ? ' disabled' : ''}><span class="ne-unit">${c.unit ?? ''}</span><button type="button" class="ne-check"${c.disabled ? ' disabled' : ''}>${this.ui.check}</button></span>`;
      }
      if (c.type === 'button') return `<button type="button" class="ctrl-btn${c.primary ? ' primary' : ''}" data-id="${c.id}"${c.disabled ? ' disabled' : ''}>${mathify(c.label)}</button>`;
      return `<button type="button" class="choice${c.state ? ` is-${c.state}` : ''}" data-id="${c.id}"${c.disabled ? ' disabled' : ''}>${mathify(c.label)}</button>`;
    }).join('');
    const act = (id, value) => {
      if (seg.act) seg.act(S, id, value, this.api);
      else seg.choose?.(S, id);
      this.renderCaption(true);
    };
    this.choicesEl.querySelectorAll('.choice, .ctrl-btn').forEach((b) => b.addEventListener('click', () => act(b.dataset.id)));
    this.choicesEl.querySelectorAll('.num-entry').forEach((box) => {
      const input = box.querySelector('input');
      const id = box.dataset.id;
      const submit = () => {
        const raw = input.value.trim().replace('−', '-').replace(',', '.');
        const v = parseFloat(raw);
        if (!Number.isFinite(v)) { input.focus(); return; }
        act(id, v);
      };
      input.addEventListener('input', () => { this.numValues[`${seg.index}:${id}`] = input.value; });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      box.querySelector('.ne-check').addEventListener('click', submit);
      if (focused === id) input.focus();
    });
  }

  /** Clear typed answers for this beat (e.g. when a new problem is generated). */
  clearAnswers() {
    if (!this.numValues) return;
    for (const k of Object.keys(this.numValues)) if (k.startsWith(`${this.seg.index}:`)) delete this.numValues[k];
    this.lastControls = null;
  }

  // --------------------------------------------------------------- panels

  mountPanel() {
    const name = this.seg.panel ?? null;
    this.root.classList.toggle('has-panel', !!name);
    if (name !== this.panelName) {
      this.panelName = name;
      this.panel = name ? this.lesson.panels[name] : null;
      this.panelEl.replaceChildren();
      if (this.panel) this.panel.mount(this.panelEl, this.S, this.api);
    }
    if (this.panel) this.panel.setMode?.(this.seg.panelMode, this.S, this.api);
  }

  mountOverlay() {
    const card = this.seg.card;
    this.overlay.hidden = !card;
    this.root.classList.toggle('has-card', !!card);
    if (card) {
      this.overlay.innerHTML = typeof card === 'function' ? card(this.S) : card;
      this.overlay.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.action;
        if (a === 'next') this.next();
        if (a === 'restart') { this.S = this.lesson.state(); this.doneAt.clear(); this.enter(0); }
        if (a === 'goto') this.enter(Number(b.dataset.seg));
      }));
    }
  }

  // ------------------------------------------------------------- timeline

  segWeight(s) {
    return s.kind === 'watch' ? s.dur : DO_WEIGHT;
  }

  buildTimeline() {
    const chapters = this.lesson.chapters;
    const bar = document.createElement('div');
    bar.className = 'tl-bar';
    this.segEls = [];
    chapters.forEach((ch) => {
      const segs = this.segs.filter((s) => s.ch === ch);
      const total = segs.reduce((a, s) => a + this.segWeight(s), 0);
      const g = document.createElement('div');
      g.className = 'tl-chapter';
      g.style.flexGrow = String(total);
      g.dataset.chapter = ch.id;
      const track = document.createElement('div');
      track.className = 'tl-track';
      for (const s of segs) {
        const el = document.createElement('div');
        el.className = `tl-seg tl-${s.kind}`;
        el.style.flexGrow = String(this.segWeight(s));
        el.innerHTML = s.kind === 'do' ? '<span class="tl-fill"></span><span class="tl-diamond"></span>' : '<span class="tl-fill"></span>';
        el.title = s.kind === 'do' ? this.ui.yourTurn : '';
        track.append(el);
        this.segEls[s.index] = el;
      }
      const label = document.createElement('div');
      label.className = 'tl-label';
      label.textContent = ch.short ?? ch.title;
      g.append(track, label);
      bar.append(g);
    });
    this.timelineEl.replaceChildren(bar);
    this.bar = bar;
    const pick = (e) => {
      for (const s of this.segs) {
        const r = this.segEls[s.index].getBoundingClientRect();
        if (e.clientX >= r.left - 3 && e.clientX <= r.right + 3) {
          const u = clamp((e.clientX - r.left) / Math.max(1, r.width));
          return { i: s.index, t: s.kind === 'watch' ? u * s.dur : 0 };
        }
      }
      return null;
    };
    bar.addEventListener('pointerdown', (e) => {
      const hit = pick(e);
      if (!hit) return;
      bar.setPointerCapture(e.pointerId);
      this.scrubbing = true;
      this.wasPlaying = this.playing;
      if (hit.i !== this.i) this.enter(hit.i, hit.t);
      else this.t = hit.t;
    });
    bar.addEventListener('pointermove', (e) => {
      if (!this.scrubbing) return;
      const hit = pick(e);
      if (!hit) return;
      if (hit.i !== this.i) this.enter(hit.i, hit.t);
      else if (this.seg.kind === 'watch') this.t = hit.t;
    });
    const end = () => {
      if (!this.scrubbing) return;
      this.scrubbing = false;
      this.playing = this.wasPlaying ?? true;
      this.updatePlay();
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  updateTimeline() {
    this.segs.forEach((s) => {
      const el = this.segEls[s.index];
      el.classList.toggle('is-current', s.index === this.i);
      el.classList.toggle('is-past', s.index < this.i);
      el.classList.toggle('is-done', this.doneAt.has(s.index));
    });
    this.timelineEl.querySelectorAll('.tl-chapter').forEach((g) => g.classList.toggle('is-current', g.dataset.chapter === this.seg.ch.id));
    this.updatePlay();
  }

  updateProgress() {
    const s = this.seg;
    const el = this.segEls[s.index];
    const u = s.kind === 'watch' ? clamp(this.t / s.dur) : this.successShown ? 1 : 0;
    const fill = el.firstChild;
    const w = `${(u * 100).toFixed(2)}%`;
    if (fill.style.width !== w) fill.style.width = w;
  }

  updatePlay() {
    const watch = this.seg.kind === 'watch';
    this.playBtn.disabled = !watch;
    this.playBtn.classList.toggle('is-playing', watch && this.playing);
    this.playBtn.setAttribute('aria-label', watch && this.playing ? this.ui.pause : this.ui.play);
  }

  // ---------------------------------------------------------------- input

  bindInput() {
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.speedBtn?.addEventListener('click', () => {
      this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
      this.speedBtn.textContent = `${this.speed}×`;
      this.speedBtn.setAttribute('aria-label', `${this.ui.speed} ${this.speed}×`);
    });
    this.continueBtn.addEventListener('click', () => this.next());
    this.skipBtn.addEventListener('click', () => {
      this.seg.skip?.(this.S, this.api);
      this.next();
    });
    document.addEventListener('keydown', (e) => {
      // Keys belong to the control that has focus (inputs, scrubbable numbers,
      // the panel); buttons keep Space/Enter for their own activation.
      if (e.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], .panel')) return;
      if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.key === 'ArrowRight') {
        this.next();
      } else if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'Enter' && !this.continueBtn.hidden) {
        e.preventDefault();
        this.next();
      }
    });

    const pos = (e) => {
      const r = this.svg.getBoundingClientRect();
      return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    };
    const nearest = (sx, sy) => {
      let best = null;
      for (const h of this.handles()) {
        if (h.disabled) continue;
        const s = this.ink.S(h.p);
        const d = Math.hypot(s.x - sx, s.y - sy);
        if (d <= (h.r ?? 22) && (!best || d < best.d)) best = { h, d };
      }
      return best?.h ?? null;
    };
    this.svg.addEventListener('pointerdown', (e) => {
      const { sx, sy } = pos(e);
      const h = nearest(sx, sy);
      const w = this.ink.toWorld(sx, sy);
      if (h) {
        this.svg.setPointerCapture(e.pointerId);
        const s = this.ink.S(h.p);
        this.drag = { key: h.key, off: { x: s.x - sx, y: s.y - sy } };
        e.preventDefault();
        return;
      }
      if (this.seg.click) this.seg.click(this.S, w, this.api);
      else if (this.seg.kind === 'watch') this.togglePlay();
    });
    this.svg.addEventListener('pointermove', (e) => {
      const { sx, sy } = pos(e);
      if (this.drag) {
        const h = this.handles().find((x) => x.key === this.drag.key);
        if (h) h.drag(this.S, this.ink.toWorld(sx + this.drag.off.x, sy + this.drag.off.y), this.api);
        return;
      }
      const h = nearest(sx, sy);
      this.hover = h?.key ?? null;
      this.svg.style.cursor = h ? (h.cursor ?? 'grab') : this.seg.click ? 'crosshair' : this.seg.kind === 'watch' ? 'pointer' : 'default';
    });
    const up = (e) => {
      if (!this.drag) return;
      const h = this.handles().find((x) => x.key === this.drag.key);
      h?.release?.(this.S, this.api);
      this.drag = null;
      if (this.svg.hasPointerCapture?.(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
    };
    this.svg.addEventListener('pointerup', up);
    this.svg.addEventListener('pointercancel', up);
  }
}
