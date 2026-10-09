// Hydrostatics drawings shared by the «Presión» lessons: an open tank with a
// probe and gauge, the column of liquid above an area, the P–h graph, vessels
// of different shapes, a two-layer tank and a diver.

import { G, n, rect, shape, tank, gauge, axes, curve, surfaceMark, figure } from './kit.js';

export const RHO_W = 1000;
export const TANK = { x0: 0, x1: 3, y0: 0, depth: 3, top: 3.4 };

/**
 * Open tank; optional probe at `depth` (world m) with a gauge. o.scale maps
 * world metres to the real depth shown in labels (e.g. 4/2.4).
 */
export function tankScene(ink, depth, o = {}) {
  const surf = TANK.y0 + TANK.depth;
  const rho = o.rho ?? RHO_W;
  tank(ink, 'tk', TANK.x0, TANK.x1, TANK.y0, TANK.top, [{ h: TANK.depth, cls: o.blood ? 'blood-2' : 'fluid' }], { op: o.op });
  ink.text('tk-p0', { x: 2.5, y: TANK.top }, '$P_0$ (aire)', { op: o.op, dy: -6, size: 15, cls: 'mid' });
  if (depth === null || depth === undefined) return null;
  const y = surf - depth;
  const scale = o.scale ?? 1;
  const hReal = depth * scale;
  if (o.column) {
    const co = o.columnOp ?? 1;
    rect(ink, 'col', 1.3, y, 1.7, surf, 'fluid-3', { op: co, layer: 'trails' });
    ink.poly('col-o', [{ x: 1.3, y: surf }, { x: 1.3, y }, { x: 1.7, y }, { x: 1.7, y: surf }], 'dashed', { op: co, layer: 'statics' });
    ink.line('col-A', { x: 1.3, y }, { x: 1.7, y }, 'accent heavy', { op: co, layer: 'vectors' });
    ink.text('col-Al', { x: 1.7, y }, '$A$', { op: co, dx: 8, dy: 16, size: 16, anchor: 'start', cls: 'accent-tx' });
    if (o.weight) {
      ink.arrow('col-W', { x: 1.5, y: (y + surf) / 2 + 0.25 }, { x: 1.5, y: (y + surf) / 2 - 0.35 }, 'ink heavy', { op: o.weight, head: 11, headW: 3.8 });
      ink.text('col-Wl', { x: 1.5, y: (y + surf) / 2 }, '$W$', { op: o.weight, dx: 14, dy: 6, size: 17, anchor: 'start', cls: 'halo' });
    }
    if (o.push) {
      ink.arrow('col-up', { x: 1.5, y: y - 0.65 }, { x: 1.5, y: y - 0.04 }, 'blue heavy', { op: o.push, head: 11, headW: 3.8 });
      ink.text('col-upl', { x: 1.5, y: y - 0.65 }, '$P$·$A$', { op: o.push, dx: 12, dy: 10, size: 16, anchor: 'start', cls: 'blue-tx halo' });
      ink.arrow('col-p0', { x: 1.5, y: surf + 0.6 }, { x: 1.5, y: surf + 0.04 }, 'blue', { op: o.push, head: 9, headW: 3 });
      ink.text('col-p0l', { x: 1.5, y: surf + 0.6 }, '$P_0$·$A$', { op: o.push, dx: 12, dy: 4, size: 15, anchor: 'start', cls: 'blue-tx halo' });
    }
  }
  ink.dimension('dim-h', { x: TANK.x0, y: surf }, { x: TANK.x0, y }, 24, o.hLabel ?? `$h$ = ${n(hReal, 2)} m`, { op: o.op, size: 15 });
  if (o.probe !== false) {
    ink.line('probe-s', { x: 2.2, y }, { x: TANK.x1 + 0.45, y }, 'thin', { op: o.op, layer: 'statics' });
    ink.circle('probe', { x: 2.2, y }, 4.5, 'ring-accent', { op: o.op, layer: 'vectors' });
    const Pg = rho * G * hReal;
    gauge(ink, 'gP', { x: TANK.x1 + 0.75, y }, Pg, rho * G * 3.2 * scale, { op: o.op, label: o.gaugeLabel === false ? null : `${n(Pg / 1000, 1)} kPa`, size: 15 });
    return Pg;
  }
  return null;
}

/** Graph of gauge pressure against depth with recorded points. */
export function phGraph(ink, marks, o = {}) {
  const rho = o.rho ?? RHO_W;
  const P = axes(ink, 'ph', { x: 5.4, y: 0, w: 2.9, h: 3 }, {
    xmax: 3, ymax: 32, xticks: [0, 1, 2, 3], yticks: [0, 10, 20, 30], xlabel: '$h$ (m)', ylabel: '$P$ − $P_0$ (kPa)', grid: true, op: o.op,
  });
  marks.forEach((h, i) => ink.dot(`phm${i}`, P(h, (rho * G * h) / 1000), { r: 3.6, cls: 'dot-accent', layer: 'vectors', op: o.op }));
  if (o.line) curve(ink, 'ph-line', P, (h) => (rho * G * h) / 1000, 0, 3, 'ink heavy', { op: o.line });
  if (o.slope) {
    ink.poly('ph-tri', [P(1, (rho * G) / 1000), P(2, (rho * G) / 1000), P(2, (2 * rho * G) / 1000)], 'accent-thin', { layer: 'annotations', op: o.slope });
    ink.text('ph-tri-l', P(2, (1.5 * rho * G) / 1000), `+${n((rho * G) / 1000, 1)} kPa por metro`, { dx: 8, dy: 4, size: 13, anchor: 'start', cls: 'accent-tx halo', op: o.slope });
  }
  return P;
}

/** Three vessels of different shape filled to the same depth. */
export function shapesScene(ink, o = {}) {
  const h = 2;
  const vessels = [
    { x: 0.2, top: [0.0, 2.2], bottom: [0.6, 1.6] },
    { x: 3.2, top: [0.75, 1.35], bottom: [0.75, 1.35] },
    { x: 5.8, top: [0.9, 1.5], bottom: [0, 2.4] },
  ];
  vessels.forEach((v, i) => {
    const [tl, tr] = v.top, [bl, br] = v.bottom;
    const pts = [{ x: v.x + bl, y: 0 }, { x: v.x + br, y: 0 }, { x: v.x + tr, y: h }, { x: v.x + tl, y: h }];
    shape(ink, `sv${i}`, pts, 'fluid', { layer: 'trails' });
    ink.poly(`svw${i}`, [{ x: v.x + tl - (bl - tl) * 0.15, y: h + 0.3 }, pts[3], pts[0], pts[1], pts[2], { x: v.x + tr - (br - tr) * 0.15, y: h + 0.3 }], 'ink heavy', { layer: 'statics' });
    surfaceMark(ink, `svs${i}`, v.x + (tl + tr) / 2 + 0.2, h);
    const c = (bl + br) / 2;
    gauge(ink, `svg${i}`, { x: v.x + c, y: -0.45 }, o.reveal ? h : 0.0001, 3.2, { r: 17 });
    ink.line(`svgl${i}`, { x: v.x + c, y: 0 }, { x: v.x + c, y: -0.45 + 0.13 }, 'ink', { layer: 'statics' });
    ink.text(`svn${i}`, { x: v.x + c, y: -0.45 }, ['(a)', '(b)', '(c)'][i], { dy: 40, size: 16 });
    if (o.walls && tl !== bl) {
      // Slanted walls push on the liquid: up where the vessel widens upward
      // (it carries liquid), down where it narrows (it holds liquid in).
      for (const side of [0, 1]) {
        const a = side ? { x: v.x + br, y: 0 } : { x: v.x + bl, y: 0 };
        const b = side ? { x: v.x + tr, y: h } : { x: v.x + tl, y: h };
        for (const u of [0.35, 0.7]) {
          const p = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
          let nx = -dy / L, ny = dx / L;
          if ((side === 0 && nx < 0) || (side === 1 && nx > 0)) { nx = -nx; ny = -ny; }
          ink.arrow(`svf${i}-${side}-${u}`, { x: p.x - nx * 0.45, y: p.y - ny * 0.45 }, p, 'accent', { head: 8, headW: 2.8, op: o.walls });
        }
      }
    }
  });
  ink.dimension('sv-h', { x: -0.2, y: 0 }, { x: -0.2, y: h }, -2, '$h$', { size: 16 });
}

/** Tank with petroleum over salt water (the course's exercise). */
export function oilTank(ink, o = {}) {
  const top = tank(ink, 'ot', 0, 3, 0, 3.6, [{ h: 1.5, cls: 'fluid', label: 'agua salada · 1025 kg/m³' }, { h: 1.8, cls: 'fluid-2', label: 'petróleo · 700 kg/m³' }], { labelSize: 15 });
  ink.dimension('ot-h1', { x: 3, y: top }, { x: 3, y: 1.5 }, -24, '$h_1$ = 8,00 m', { size: 14 });
  ink.dimension('ot-h2', { x: 3, y: 1.5 }, { x: 3, y: 0 }, -24, '$h_2$ = 5,00 m', { size: 14 });
  ink.text('ot-p0', { x: 1.5, y: 3.6 }, '$P_0$', { dy: -4, size: 16 });
  ink.circle('ot-P1', { x: 0.5, y: 1.5 }, 5, o.at === 1 ? 'ring-accent' : 'pin', { layer: 'vectors' });
  ink.text('ot-P1l', { x: 0.5, y: 1.5 }, '$P_1$', { dx: 10, dy: -8, size: 16, anchor: 'start', cls: 'halo' });
  ink.circle('ot-Pb', { x: 1.5, y: 0.06 }, 5, o.at === 2 ? 'ring-accent' : 'pin', { layer: 'vectors' });
  ink.text('ot-Pbl', { x: 1.5, y: 0.06 }, '$P_{fondo}$', { dx: 10, dy: -8, size: 16, anchor: 'start', cls: 'halo' });
}

/** A diver in a tall tank; returns the ear's position. */
export function diverScene(ink, depth, o = {}) {
  const surf = 3.2;
  tank(ink, 'dv', -0.4, 3.4, 0, 3.6, [{ h: surf, cls: 'fluid' }]);
  const ear = { x: 1.5, y: surf - depth };
  // A small swimmer, head down: rotate the mannequin.
  figure(ink, 'dvf', { x: ear.x + 0.07, y: ear.y + 1.0 }, 1.1, Math.PI, { heart: false, op: 0.9 });
  ink.circle('dv-ear', ear, 5, 'ring-accent', { layer: 'vectors' });
  ink.dimension('dv-h', { x: -0.4, y: surf }, { x: -0.4, y: ear.y }, 24, o.label ?? `${n(depth * (o.scale ?? 1), 0)} m`, { size: 15 });
  if (o.arrows) {
    for (const [k, a] of [['l', Math.PI], ['r', 0], ['u', Math.PI / 2], ['d', -Math.PI / 2]]) {
      const u = { x: Math.cos(a), y: Math.sin(a) };
      const L = 0.15 + 0.08 * depth * o.arrows;
      ink.arrow(`dv-a${k}`, { x: ear.x + u.x * (L + 0.12), y: ear.y + u.y * (L + 0.12) }, { x: ear.x + u.x * 0.1, y: ear.y + u.y * 0.1 }, 'blue', { head: 7, headW: 2.4 });
    }
  }
  return ear;
}

