// Keyed immediate-mode painter over a retained SVG tree.
//
// Each frame the scene calls el(layer, key, tag, attrs) for everything it wants
// on screen. Elements are reused by key (so pointer capture, CSS transitions and
// hover state survive across frames) and only changed attributes touch the DOM.
// Anything not drawn in a frame is removed by end().

const NS = 'http://www.w3.org/2000/svg';

export const LAYERS = [
  'grid', 'zones', 'trails', 'statics', 'connectors', 'bodies', 'vectors',
  'annotations', 'labels', 'handles', 'bubbles', 'screen',
];

export class Painter {
  constructor(svg) {
    this.svg = svg;
    this.layers = {};
    for (const name of LAYERS) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `layer layer-${name}`);
      svg.appendChild(g);
      this.layers[name] = g;
    }
    this.nodes = new Map();
    this.frame = 0;
  }

  begin() {
    this.frame++;
    this.cursor = {};
  }

  el(layer, key, tag, attrs = {}, content = null) {
    let node = this.nodes.get(key);
    if (node && node.tag !== tag) {
      node.el.remove();
      node = null;
    }
    if (!node) {
      const el = document.createElementNS(NS, tag);
      node = { el, tag, attrs: {}, content: null, layer };
      this.layers[layer].appendChild(el);
      this.nodes.set(key, node);
    } else if (node.layer !== layer) {
      this.layers[layer].appendChild(node.el);
      node.layer = layer;
    }
    node.seen = this.frame;
    // Keep paint order equal to call order within a layer, moving nodes only
    // when the order actually changed.
    const parent = this.layers[layer];
    const last = this.cursor[layer];
    const expected = last ? last.nextSibling : parent.firstChild;
    if (node.el !== expected) parent.insertBefore(node.el, expected);
    this.cursor[layer] = node.el;
    const prev = node.attrs;
    for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) {
        if (k in prev) { node.el.removeAttribute(k); delete prev[k]; }
        continue;
      }
      const s = typeof v === 'number' ? (Number.isFinite(v) ? +v.toFixed(2) + '' : '0') : String(v);
      if (prev[k] !== s) {
        node.el.setAttribute(k, s);
        prev[k] = s;
      }
    }
    for (const k in prev) {
      if (!(k in attrs)) { node.el.removeAttribute(k); delete prev[k]; }
    }
    if (content !== null && content !== node.content) {
      if (tag === 'text' || tag === 'tspan') node.el.innerHTML = content;
      else node.el.textContent = content;
      node.content = content;
    }
    return node.el;
  }

  end() {
    for (const [key, node] of this.nodes) {
      if (node.seen !== this.frame) {
        node.el.remove();
        this.nodes.delete(key);
      }
    }
  }

  clear() {
    for (const node of this.nodes.values()) node.el.remove();
    this.nodes.clear();
  }
}

/** World ↔ screen mapping. World y points up, screen y points down. */
export class Camera {
  constructor({ cx = 0, cy = 0, scale = 60 } = {}) {
    this.cx = cx;
    this.cy = cy;
    this.scale = scale; // px per metre
    this.W = 800;
    this.H = 600;
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
  }

  toScreen(p) {
    return { x: (p.x - this.cx) * this.scale + this.W / 2, y: this.H / 2 - (p.y - this.cy) * this.scale };
  }

  toWorld(sx, sy) {
    return { x: (sx - this.W / 2) / this.scale + this.cx, y: (this.H / 2 - sy) / this.scale + this.cy };
  }

  /** Fit a world-space rectangle into the viewport with a margin in px. */
  fit({ xmin, xmax, ymin, ymax }, margin = 40) {
    const sx = (this.W - 2 * margin) / Math.max(1e-6, xmax - xmin);
    const sy = (this.H - 2 * margin) / Math.max(1e-6, ymax - ymin);
    this.scale = Math.max(5, Math.min(sx, sy));
    this.cx = (xmin + xmax) / 2;
    this.cy = (ymin + ymax) / 2;
  }

  visibleBounds() {
    const a = this.toWorld(0, this.H);
    const b = this.toWorld(this.W, 0);
    return { xmin: a.x, ymin: a.y, xmax: b.x, ymax: b.y };
  }
}
