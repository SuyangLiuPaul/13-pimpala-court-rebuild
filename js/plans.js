// ============================================================
// SVG drawing v3: cadastral site plan + floor plans + gantt
// House frame: u 0(east)→19(west), v 0(front/south)→16+(rear/north)
// ============================================================
const HOUSE_FRAME = {
  ORIG: [8.99, -7.57],
  uIn: [-0.979, 0.203],
  vIn: [0.203, 0.979],
};
function houseToSite(u, v) {
  const { ORIG, uIn, vIn } = HOUSE_FRAME;
  return [ORIG[0] + u * uIn[0] + v * vIn[0], ORIG[1] + u * uIn[1] + v * vIn[1]];
}

// ---------- room schedules (v3: east wing 12.4×16.0, west wing 6.6×14.0) ----------
const GROUND_ROOMS = [
  // east wing (u 0–12.4, v 0–16.0)
  { l: 'Guest Bed 5', a: '15.2', u0: .2, v0: .2, u1: 4.2, v1: 4.0 },
  { l: 'Ens 5', u0: .2, v0: 4.0, u1: 2.4, v1: 5.9 },
  { l: 'Robe', u0: 2.4, v0: 4.0, u1: 4.2, v1: 5.9 },
  { l: 'Porch', open: true, u0: 4.2, v0: 0, u1: 7.4, v1: 2.3 },
  { l: 'Entry', u0: 4.2, v0: 2.3, u1: 7.4, v1: 5.9 },
  { l: 'Gallery', u0: 4.2, v0: 5.9, u1: 7.4, v1: 11.6, stair: { u0: 4.3, v0: 6.6, u1: 5.7, v1: 10.8 } },
  { l: 'Study', a: '16.3', u0: 7.4, v0: .2, u1: 12.2, v1: 3.6 },
  { l: 'Theatre', a: '18.4', u0: 7.6, v0: 3.6, u1: 12.2, v1: 7.6 },
  { l: 'Rumpus', a: '16.4', u0: .2, v0: 5.9, u1: 4.2, v1: 9.8 },
  { l: 'Powder', u0: .2, v0: 9.8, u1: 2.0, v1: 11.6 },
  { l: 'Store', u0: 2.0, v0: 9.8, u1: 4.2, v1: 11.6 },
  { l: 'Hub · Meals', a: '19.8', u0: 7.4, v0: 7.6, u1: 12.4, v1: 11.6 },
  { l: 'Family', a: '26.9', u0: .2, v0: 11.6, u1: 6.4, v1: 15.8 },
  { l: 'Dining', a: '13.4', u0: 6.4, v0: 11.6, u1: 9.6, v1: 15.8 },
  { l: 'Kitchen', a: '10.9', u0: 9.6, v0: 11.6, u1: 12.2, v1: 15.8 },
  // west wing (u 12.4–19.0, v 2.5–16.5)
  { l: 'Garage', a: '37.8', u0: 12.6, v0: 2.5, u1: 18.8, v1: 8.6 },
  { l: 'Mud · Wudu', u0: 12.4, v0: 8.6, u1: 14.2, v1: 12.9 },
  { l: 'Wet Kitchen', a: '11.2', u0: 14.2, v0: 8.6, u1: 16.8, v1: 12.9 },
  { l: 'Ldry', u0: 16.8, v0: 8.6, u1: 19.0, v1: 10.8 },
  { l: 'WIP', u0: 16.8, v0: 10.8, u1: 19.0, v1: 12.9 },
  { l: 'Alfresco', a: '23.8', open: true, u0: 12.4, v0: 12.9, u1: 19.0, v1: 16.5 },
];
const UPPER_ROOMS = [
  { l: 'Bed 3', a: '16.8', u0: .8, v0: .2, u1: 5.0, v1: 4.4 },
  { l: 'Void', open: true, u0: 5.0, v0: .2, u1: 8.6, v1: 4.2 },
  { l: 'Bed 4', a: '14.6', u0: 8.6, v0: .2, u1: 12.2, v1: 4.2 },
  { l: 'Bath', u0: 8.6, v0: 4.2, u1: 11.0, v1: 7.0 },
  { l: 'WC', u0: 11.0, v0: 4.2, u1: 12.2, v1: 7.0 },
  { l: 'Landing', u0: 4.2, v0: 4.2, u1: 8.6, v1: 11.8, stair: { u0: 4.3, v0: 6.6, u1: 5.7, v1: 10.8 } },
  { l: 'Retreat', a: '15.8', u0: .8, v0: 8.4, u1: 5.2, v1: 11.8 },
  { l: 'Gym · Flex', a: '17.6', u0: 8.6, v0: 7.0, u1: 12.2, v1: 11.8 },
  { l: 'Master Bed', a: '19.6', u0: .8, v0: 11.8, u1: 5.8, v1: 15.8 },
  { l: 'WIR', u0: 5.8, v0: 12.6, u1: 8.4, v1: 15.8 },
  { l: 'Ensuite', a: '8.3', u0: 8.4, v0: 12.6, u1: 11.0, v1: 15.8 },
  { l: 'Linen', u0: 11.0, v0: 12.6, u1: 12.4, v1: 15.8 },
  { l: 'Bed 2', a: '19.2', u0: 13.0, v0: 2.5, u1: 18.4, v1: 6.4 },
  { l: 'Ens 2', u0: 12.4, v0: 6.4, u1: 14.8, v1: 9.1 },
  { l: 'Hall', u0: 14.8, v0: 6.4, u1: 19.0, v1: 9.1 },
];
const GROUND_WINGS = [[0, 0, 12.4, 16.0], [12.4, 2.5, 19.0, 16.5]];
const UPPER_WINGS = [[0.8, 0, 12.4, 16.0], [12.4, 2.5, 19.0, 9.1]];

// ---------- svg helpers ----------
const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const poly = (pts, attrs, parent) => el('polygon', { points: pts.map(p => p.join(',')).join(' '), ...attrs }, parent);
const pline = (pts, attrs, parent) => el('polyline', { points: pts.map(p => p.join(',')).join(' '), ...attrs }, parent);
function txt(x, y, s, attrs, parent) { const t = el('text', { x, y, ...attrs }, parent); t.textContent = s; return t; }

// ============================================================
// SITE PLAN — true cadastral geometry + real building outlines
// ============================================================
function drawSitePlan(svg) {
  svg.innerHTML = '';
  const W = 880, H = 800, sc = 10.6;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const cx = W / 2 - 16, cy = H / 2 - 10;
  const X = p => [cx + p[0] * sc, cy - p[1] * sc];
  const g = el('g', {}, svg);

  // roads
  for (const r of SITE.roads) {
    if (r.pts.length < 2) continue;
    pline(r.pts.map(X), { fill: 'none', stroke: '#262b36', 'stroke-width': sc * 7.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    pline(r.pts.map(X), { fill: 'none', stroke: '#343a48', 'stroke-width': sc * 6.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  }
  // court bowl
  const bowl = X(SITE.meta.bowl);
  el('circle', { cx: bowl[0], cy: bowl[1], r: 7.6 * sc, fill: '#343a48', stroke: '#262b36', 'stroke-width': 2 }, g);

  // neighbour parcels
  for (const n of SITE.neighbours) {
    poly(n.ring.map(X), { fill: '#171c28', stroke: '#323b52', 'stroke-width': 1.1 }, g);
  }
  // real neighbour buildings (OSM)
  for (const b of SITE.buildings) {
    poly(b.ring.map(X), { fill: b.type === 'garage' ? '#2a3040' : '#333b4e', stroke: '#49536e', 'stroke-width': 1 }, g);
    if (b.num && b.type === 'house') {
      txt(...X(b.c), b.num, { fill: '#71809f', 'font-size': 10.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
    }
  }

  // subject lot + garden tint
  poly(SITE.lot.map(X), { fill: '#20301d', stroke: '#E2A07A', 'stroke-width': 2.4 }, g);
  poly(SITE.lot.map(X), { fill: '#3d6134', opacity: .33 }, g);

  // driveway from Pimpala Ct (west) sweeping to the south-facing garage door
  const drv = [[22.6, 3.4], [22.6, 7.4], [18.6, 7.0], [15.4, 5.2], [14.2, 2.5], [13.6, -1.6], [18.2, -1.6], [18.6, 2.5]].map(p => houseToSite(...p));
  poly(drv.map(X), { fill: '#6e6a62', stroke: '#85807a', 'stroke-width': 1 }, g);
  // open paved terrace, NE yard edge
  const terr = [houseToSite(1.6, 16.05), houseToSite(8.4, 16.05), houseToSite(8.4, 18.3), houseToSite(1.6, 18.3)];
  poly(terr.map(X), { fill: '#7c766c', opacity: .85 }, g);

  // existing house — dashed (demolish)
  poly(SITE.existingHouse.map(X), { fill: 'none', stroke: '#c4593a', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }, g);

  // new footprint
  poly(DESIGN.footprintXY.east.map(X), { fill: '#efe7d8', stroke: '#171a22', 'stroke-width': 2 }, g);
  poly(DESIGN.footprintXY.west.map(X), { fill: '#e7ddc9', stroke: '#171a22', 'stroke-width': 2 }, g);
  const ec = DESIGN.footprintXY.east;
  const eMid = [(ec[0][0] + ec[2][0]) / 2, (ec[0][1] + ec[2][1]) / 2];
  txt(...X(eMid), 'NEW DWELLING', { fill: '#171a22', 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  txt(...X([eMid[0], eMid[1] - 1.7]), '54 sq · 2 storey', { fill: '#555', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  const wc = DESIGN.footprintXY.west;
  txt(...X([(wc[0][0] + wc[2][0]) / 2, (wc[0][1] + wc[2][1]) / 2]), 'GARAGE', { fill: '#444', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  // north yard label
  txt(...X(houseToSite(6, 18.0)), 'N yard 49 m²', { fill: '#9fd08a', 'font-size': 10.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);

  // setback dims
  function dim(a, b, label, dx = 0, dy = -4) {
    const A = X(a), B = X(b);
    el('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: '#9fc4d6', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, g);
    txt((A[0] + B[0]) / 2 + dx, (A[1] + B[1]) / 2 + dy, label, { fill: '#9fc4d6', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  }
  const HF = HOUSE_FRAME;
  const off = (p, vec, m) => [p[0] + m * vec[0], p[1] + m * vec[1]];
  dim(houseToSite(6.5, 0), off(houseToSite(6.5, 0), HF.vIn, -8.06), '8.06 m');
  dim(houseToSite(19, 7), off(houseToSite(19, 7), HF.uIn, 2.0), '2.0 m', -20);
  dim(houseToSite(0, 8), off(houseToSite(0, 8), HF.uIn, -1.2), '1.2 m', 20);
  dim(houseToSite(6.5, 16.0), off(houseToSite(6.5, 16.0), HF.vIn, 3.9), '3.9 m');

  // boundary labels
  const L = SITE.lot;
  const blab = (i, j, s, dx = 0, dy = 0) => {
    const m = X([(L[i][0] + L[j][0]) / 2, (L[i][1] + L[j][1]) / 2]);
    txt(m[0] + dx, m[1] + dy, s, { fill: '#E2A07A', 'font-size': 11.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  };
  blab(0, 1, '32.08 m', 40, 0); blab(6, 7, '21.56 m', -42, 0); blab(7, 0, '23.05 m', 0, -10);
  blab(5, 6, 'splay', -34, 10);

  // street names — corrected: Pimpala along WEST, Benwerrin along SOUTH
  const pl = X([-21.5, 26]);
  txt(pl[0], pl[1], 'PIMPALA COURT', { fill: '#7b8497', 'font-size': 12, 'text-anchor': 'middle', 'letter-spacing': '.16em', 'font-family': 'var(--mono)', transform: `rotate(-75 ${pl[0]} ${pl[1]})` }, g);
  txt(...X([8, -23.5]), 'BENWERRIN DRIVE', { fill: '#7b8497', 'font-size': 12, 'text-anchor': 'middle', 'letter-spacing': '.16em', 'font-family': 'var(--mono)' }, g);
  const bl = X(SITE.meta.bowl);
  txt(bl[0], bl[1] + 4, 'court bowl', { fill: '#5b6b8c', 'font-size': 9.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);

  // north arrow + scale + legend
  const nx = W - 60, ny = 86;
  el('line', { x1: nx, y1: ny + 26, x2: nx, y2: ny - 18, stroke: '#E2A07A', 'stroke-width': 2 }, g);
  poly([[nx, ny - 26], [nx - 7, ny - 10], [nx + 7, ny - 10]], { fill: '#E2A07A' }, g);
  txt(nx, ny + 42, 'N', { fill: '#E2A07A', 'font-size': 15, 'text-anchor': 'middle', 'font-weight': 700 }, g);
  const sx = 40, sy = H - 34;
  el('line', { x1: sx, y1: sy, x2: sx + 10 * sc, y2: sy, stroke: '#aab', 'stroke-width': 2 }, g);
  [0, 5, 10].forEach(m => { el('line', { x1: sx + m * sc, y1: sy - 5, x2: sx + m * sc, y2: sy + 5, stroke: '#aab', 'stroke-width': 1.5 }, g); txt(sx + m * sc, sy + 18, m + ' m', { fill: '#aab', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g); });
  const leg = [['#efe7d8', 'New dwelling · roofed 290.8 m²'], ['#c4593a', 'Existing house — demolish'], ['#6e6a62', 'Driveway from Pimpala Ct (50 m²)'], ['#3d6134', 'Garden area 338 m² = 49.8 %'], ['#333b4e', 'Neighbouring buildings (surveyed)']];
  leg.forEach((it, i) => {
    el('rect', { x: 40, y: 26 + i * 21, width: 13, height: 13, fill: it[0], rx: 2 }, g);
    txt(60, 37 + i * 21, it[1], { fill: '#c9cfdb', 'font-size': 11.5, 'font-family': 'var(--mono)' }, g);
  });
}

// ============================================================
// FLOOR PLANS
// ============================================================
function drawFloorPlan(svg, rooms, wings, title, totalLabel) {
  svg.innerHTML = '';
  const sc = 35, padL = 72, padT = 74;
  const W = 19.0 * sc + padL + 64, H = 16.5 * sc + padT + 88;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const X = (u, v) => [padL + (19.0 - u) * sc, padT + (16.5 - v) * sc];
  const g = el('g', {}, svg);

  for (const w of wings) {
    poly([X(w[0], w[1]), X(w[2], w[1]), X(w[2], w[3]), X(w[0], w[3])], { fill: '#f4efe4', stroke: '#11141b', 'stroke-width': 5 }, g);
  }
  for (const r of rooms) {
    poly([X(r.u0, r.v0), X(r.u1, r.v0), X(r.u1, r.v1), X(r.u0, r.v1)], {
      fill: r.open ? '#e4ecdf' : '#faf6ec',
      stroke: '#3a3a3a', 'stroke-width': 1.6,
      'stroke-dasharray': r.open ? '7 4' : 'none',
    }, g);
    const c = X((r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2);
    const small = (r.u1 - r.u0) * (r.v1 - r.v0) < 8;
    txt(c[0], c[1] - (r.a ? 4 : -3), r.l, { fill: '#1d212b', 'font-size': small ? 9.5 : 12, 'font-weight': 600, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
    if (r.a) txt(c[0], c[1] + 11, r.a + ' m²', { fill: '#8a8377', 'font-size': 9.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
    if (r.stair) {
      for (let i = 0; i <= 12; i++) {
        const v = r.stair.v0 + (r.stair.v1 - r.stair.v0) * i / 12;
        el('line', { x1: X(r.stair.u0, v)[0], y1: X(r.stair.u0, v)[1], x2: X(r.stair.u1, v)[0], y2: X(r.stair.u1, v)[1], stroke: '#777', 'stroke-width': 1 }, g);
      }
    }
  }
  function hdim(u0, u1, v, label, below) {
    const A = X(u0, v), B = X(u1, v); const y = A[1] + (below ? 32 : -26);
    el('line', { x1: A[0], y1: y, x2: B[0], y2: y, stroke: '#9fc4d6', 'stroke-width': 1 }, g);
    [A[0], B[0]].forEach(x => el('line', { x1: x, y1: y - 5, x2: x, y2: y + 5, stroke: '#9fc4d6', 'stroke-width': 1 }, g));
    txt((A[0] + B[0]) / 2, y - 6, label, { fill: '#9fc4d6', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  }
  function vdim(v0, v1, u, label) {
    const A = X(u, v0), B = X(u, v1); const x = A[0] - 30;
    el('line', { x1: x, y1: A[1], x2: x, y2: B[1], stroke: '#9fc4d6', 'stroke-width': 1 }, g);
    [A[1], B[1]].forEach(y => el('line', { x1: x - 5, y1: y, x2: x + 5, y2: y, stroke: '#9fc4d6', 'stroke-width': 1 }, g));
    txt(x - 10, (A[1] + B[1]) / 2, label, { fill: '#9fc4d6', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)', transform: `rotate(-90 ${x - 10} ${(A[1] + B[1]) / 2})` }, g);
  }
  const ew = wings[0], ww = wings[1];
  hdim(ew[0], ew[2], ew[3], (ew[2] - ew[0]).toFixed(1) + ' m', false);
  hdim(ww[0], ww[2], ww[3], (ww[2] - ww[0]).toFixed(1) + ' m', false);
  vdim(ew[1], ew[3], 19.0, (ew[3] - ew[1]).toFixed(1) + ' m');
  hdim(ew[0], ew[2], 0, (ew[2] - ew[0]).toFixed(1) + ' m', true);

  // north arrow (true north tilts 11.7° west of plan-up)
  const nx = W - 54, ny = 64, a = -11.7 * Math.PI / 180;
  const dx = Math.sin(a) * 30, dy = -Math.cos(a) * 30;
  el('line', { x1: nx - dx * .6, y1: ny - dy * .6, x2: nx + dx, y2: ny + dy, stroke: '#E2A07A', 'stroke-width': 2 }, g);
  poly([[nx + dx * 1.25, ny + dy * 1.25], [nx + dx * .75 - dy * .22, ny + dy * .75 + dx * .22], [nx + dx * .75 + dy * .22, ny + dy * .75 - dx * .22]], { fill: '#E2A07A' }, g);
  txt(nx, ny + 46, 'N', { fill: '#E2A07A', 'font-size': 14, 'text-anchor': 'middle', 'font-weight': 700 }, g);

  txt(padL, H - 22, totalLabel, { fill: '#c9cfdb', 'font-size': 13, 'font-family': 'var(--mono)' }, g);
  txt(padL, 28, title, { fill: '#E2A07A', 'font-size': 15, 'letter-spacing': '.2em', 'font-family': 'var(--mono)' }, g);
}

// ============================================================
// GANTT (i18n-aware: phase names passed in)
// ============================================================
function drawGantt(svg, phaseNames, caption) {
  svg.innerHTML = '';
  const months = TIMELINE_TOTAL, rowH = 42, padL = 224, padT = 44;
  const W = 980, chartW = W - padL - 30, H = TIMELINE_BARS.length * rowH + padT + 56;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const g = el('g', {}, svg);
  const mx = m => padL + m / months * chartW;
  for (let m = 0; m <= months; m += 2) {
    el('line', { x1: mx(m), y1: padT - 8, x2: mx(m), y2: H - 46, stroke: '#242936', 'stroke-width': 1 }, g);
    txt(mx(m), padT - 16, 'M' + m, { fill: '#67708a', 'font-size': 10.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  }
  const colors = ['#9fc4d6', '#9fc4d6', '#9fc4d6', '#e3c887', '#e3c887', '#c4593a', '#E2A07A', '#E2A07A', '#E2A07A', '#E2A07A', '#E2A07A', '#6fae54'];
  TIMELINE_BARS.forEach((t, i) => {
    const y = padT + i * rowH;
    txt(padL - 12, y + 17, phaseNames[i], { fill: '#dfe3ec', 'font-size': 12.5, 'text-anchor': 'end', 'font-family': 'var(--mono)' }, g);
    el('rect', { x: mx(t.start), y: y + 4, width: Math.max(10, t.dur / months * chartW), height: 19, rx: 4, fill: colors[i], opacity: .92 }, g);
    txt(mx(t.start + t.dur) + 8, y + 17, t.dur + ' mo', { fill: '#67708a', 'font-size': 10, 'font-family': 'var(--mono)' }, g);
  });
  txt(padL, H - 18, caption, { fill: '#8b93a8', 'font-size': 12, 'font-family': 'var(--mono)' }, g);
}
