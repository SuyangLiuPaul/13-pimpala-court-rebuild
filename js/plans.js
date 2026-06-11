// ============================================================
// SVG drawing: site plan (real cadastre) + floor plans + gantt
// House frame: u 0(east)→20(west), v 0(front)→18.5(rear)
// ============================================================
const HOUSE_FRAME = {
  ORIG: [8.99, -7.57],            // site-XY of east wing front-east corner
  uIn: [-0.979, 0.203],           // unit vector: house u axis (towards west)
  vIn: [0.203, 0.979],            // unit vector: house v axis (towards rear/north-ish)
};
function houseToSite(u, v) {
  const { ORIG, uIn, vIn } = HOUSE_FRAME;
  return [ORIG[0] + u * uIn[0] + v * vIn[0], ORIG[1] + u * uIn[1] + v * vIn[1]];
}

// ---------- room schedules ----------
const GROUND_ROOMS = [
  // east wing
  { l: 'Guest Bed 5', a: '15.2', u0: .2, v0: .2, u1: 4.2, v1: 4.0 },
  { l: 'Ens 5', u0: .2, v0: 4.0, u1: 2.4, v1: 5.9 },
  { l: 'Robe', u0: 2.4, v0: 4.0, u1: 4.2, v1: 5.9 },
  { l: 'Porch', open: true, u0: 4.2, v0: 0, u1: 7.4, v1: 2.3 },
  { l: 'Entry', u0: 4.2, v0: 2.3, u1: 7.4, v1: 5.9 },
  { l: 'Gallery', u0: 4.2, v0: 5.9, u1: 7.4, v1: 12.2, stair: { u0: 4.3, v0: 7.0, u1: 5.7, v1: 11.2 } },
  { l: 'Study', a: '18.9', u0: 7.4, v0: .2, u1: 12.8, v1: 3.6 },
  { l: 'Theatre', a: '23.9', u0: 7.6, v0: 3.6, u1: 12.8, v1: 8.2 },
  { l: 'Rumpus', a: '18.0', u0: .2, v0: 5.9, u1: 4.2, v1: 10.4 },
  { l: 'Powder', u0: .2, v0: 10.4, u1: 2.0, v1: 12.2 },
  { l: 'Store', u0: 2.0, v0: 10.4, u1: 4.2, v1: 12.2 },
  { l: 'Hub · Meals', a: '21.8', u0: 7.4, v0: 8.2, u1: 13.0, v1: 12.2 },
  { l: 'Family', a: '38.6', u0: .2, v0: 12.2, u1: 6.6, v1: 18.3 },
  { l: 'Dining', a: '18.6', u0: 6.6, v0: 13.4, u1: 10.4, v1: 18.3 },
  { l: 'Kitchen', a: '15.8', u0: 10.4, v0: 14.2, u1: 12.8, v1: 18.3 },
  { l: 'WIP', u0: 10.4, v0: 12.2, u1: 12.8, v1: 14.2 },
  // west wing
  { l: 'Garage', a: '40.3', u0: 13.2, v0: 2.5, u1: 19.8, v1: 8.6 },
  { l: 'Mud · Wudu', u0: 13.0, v0: 8.6, u1: 14.6, v1: 12.9 },
  { l: 'Wet Kitchen', a: '12.9', u0: 14.6, v0: 8.6, u1: 17.6, v1: 12.9 },
  { l: 'Laundry', u0: 17.6, v0: 8.6, u1: 20.0, v1: 12.9 },
  { l: 'Alfresco', a: '25.2', open: true, u0: 13.0, v0: 12.9, u1: 20.0, v1: 16.5 },
];
const UPPER_ROOMS = [
  { l: 'Bed 3', a: '16.8', u0: .8, v0: .2, u1: 5.0, v1: 4.4 },
  { l: 'Void', open: true, u0: 5.0, v0: .2, u1: 8.6, v1: 4.2 },
  { l: 'Bed 4', a: '16.8', u0: 8.6, v0: .2, u1: 12.8, v1: 4.2 },
  { l: 'Bath', u0: 8.6, v0: 4.2, u1: 11.0, v1: 7.0 },
  { l: 'WC', u0: 11.0, v0: 4.2, u1: 12.2, v1: 7.0 },
  { l: 'Linen', u0: 12.2, v0: 4.2, u1: 12.8, v1: 7.0 },
  { l: 'Landing', u0: 4.2, v0: 4.2, u1: 8.6, v1: 14.9, stair: { u0: 4.3, v0: 7.0, u1: 5.7, v1: 11.2 } },
  { l: 'Retreat', a: '22.1', u0: .8, v0: 8.6, u1: 5.4, v1: 13.4 },
  { l: 'Gym · Flex', a: '24.8', u0: 8.6, v0: 9.0, u1: 12.8, v1: 14.9 },
  { l: 'Master Bed', a: '22.5', u0: .8, v0: 13.4, u1: 5.4, v1: 18.3 },
  { l: 'WIR', u0: 5.4, v0: 14.9, u1: 8.2, v1: 18.3 },
  { l: 'Ensuite', a: '9.5', u0: 8.2, v0: 11 + 3.9, u1: 11.0, v1: 18.3 },
  { l: 'Bed 2', a: '19.2', u0: 13.6, v0: 2.5, u1: 19.0, v1: 6.4 },
  { l: 'Ens 2', u0: 13.0, v0: 6.4, u1: 15.4, v1: 9.1 },
  { l: 'Hall', u0: 15.4, v0: 6.4, u1: 19.0, v1: 9.1 },
];
// wing outlines per floor (u0,v0,u1,v1)
const GROUND_WINGS = [[0, 0, 13.0, 18.5], [13.0, 2.5, 20.0, 16.5]];
const UPPER_WINGS = [[0.8, 0, 13.0, 18.5], [13.0, 2.5, 19.0, 9.1]];

// ---------- helpers ----------
const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function poly(pts, attrs, parent) {
  return el('polygon', { points: pts.map(p => p.join(',')).join(' '), ...attrs }, parent);
}
function pline(pts, attrs, parent) {
  return el('polyline', { points: pts.map(p => p.join(',')).join(' '), ...attrs }, parent);
}
function txt(x, y, s, attrs, parent) {
  const t = el('text', { x, y, ...attrs }, parent); t.textContent = s; return t;
}

// ============================================================
// SITE PLAN — true cadastral geometry
// ============================================================
function drawSitePlan(svg) {
  const W = 860, H = 760, sc = 11.2;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const cx = W / 2 - 30, cy = H / 2 + 6;
  const X = p => [cx + p[0] * sc, cy - p[1] * sc];   // site XY -> screen (y up = north-ish)
  const g = el('g', {}, svg);

  // roads
  for (const r of SITE.roads) {
    if (r.pts.length < 2) continue;
    pline(r.pts.map(X), { fill: 'none', stroke: '#2e323c', 'stroke-width': sc * 7.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .85 }, g);
    pline(r.pts.map(X), { fill: 'none', stroke: '#3a3f4b', 'stroke-width': sc * 6.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  }
  // neighbour parcels
  for (const n of SITE.neighbours) {
    poly(n.ring.map(X), { fill: '#1c2230', stroke: '#39435a', 'stroke-width': 1.2 }, g);
    const num = n.short.split(' ')[0];
    const street = n.short.includes('PIMPALA') ? 'PIM' : n.short.includes('MILPERA') ? 'MIL' : n.short.includes('BENWERRIN') ? 'BEN' : '';
    if (street) txt(...X(n.centroid), `${num} ${street}`, { fill: '#5b6b8c', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  }
  // subject lot
  poly(SITE.lot.map(X), { fill: '#22301f', stroke: '#E2A07A', 'stroke-width': 2.4 }, g);

  // garden area tint (whole lot minus footprint/drive — indicative wash)
  poly(SITE.lot.map(X), { fill: '#3c5f33', opacity: .35 }, g);

  // driveway (front-west, court to garage face)
  const drive = [houseToSite(13.4, 2.5), houseToSite(19.6, 2.5), houseToSite(20.4, -5.3), houseToSite(14.4, -6.4)];
  poly(drive.map(X), { fill: '#6e6a62', stroke: '#85807a', 'stroke-width': 1 }, g);
  // open paved terrace (rear of family/dining, unroofed)
  const terr = [houseToSite(2.0, 18.5), houseToSite(12.0, 18.5), houseToSite(12.0, 21.2), houseToSite(2.0, 21.2)];
  poly(terr.map(X), { fill: '#7c766c', opacity: .85 }, g);

  // existing house — dashed, to be demolished
  poly(SITE.existingHouse.map(X), { fill: 'none', stroke: '#c4593a', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }, g);

  // new footprint
  poly(DESIGN.footprintXY.east.map(X), { fill: '#efe7d8', stroke: '#171a22', 'stroke-width': 2 }, g);
  poly(DESIGN.footprintXY.west.map(X), { fill: '#e7ddc9', stroke: '#171a22', 'stroke-width': 2 }, g);
  const ec = DESIGN.footprintXY.east, wc = DESIGN.footprintXY.west;
  txt(...X([(ec[0][0] + ec[2][0]) / 2, (ec[0][1] + ec[2][1]) / 2]), 'NEW DWELLING', { fill: '#171a22', 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  txt(...X([(ec[0][0] + ec[2][0]) / 2, (ec[0][1] + ec[2][1]) / 2 - 1.6]), '63 sq · 2 storey', { fill: '#444', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  txt(...X([(wc[0][0] + wc[2][0]) / 2, (wc[0][1] + wc[2][1]) / 2]), 'GARAGE WING', { fill: '#333', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);

  // setback dimension callouts
  function dim(a, b, label, off = 0) {
    const A = X(a), B = X(b);
    el('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: '#9fc4d6', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, g);
    txt((A[0] + B[0]) / 2 + off, (A[1] + B[1]) / 2 - 4, label, { fill: '#9fc4d6', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  }
  dim(houseToSite(6.5, 0), [houseToSite(6.5, 0)[0] - 7.9 * HOUSE_FRAME.vIn[0], houseToSite(6.5, 0)[1] - 7.9 * HOUSE_FRAME.vIn[1]], '7.9 m');
  dim(houseToSite(0, 9), [houseToSite(0, 9)[0] - 1.2 * HOUSE_FRAME.uIn[0], houseToSite(0, 9)[1] - 1.2 * HOUSE_FRAME.uIn[1]], '1.2 m', 16);
  dim(houseToSite(20, 10), [houseToSite(20, 10)[0] + 1.0 * HOUSE_FRAME.uIn[0], houseToSite(20, 10)[1] + 1.0 * HOUSE_FRAME.uIn[1]], '1.0 m', -16);
  dim(houseToSite(6.5, 18.5), [houseToSite(6.5, 18.5)[0] + 4.4 * HOUSE_FRAME.vIn[0], houseToSite(6.5, 18.5)[1] + 4.4 * HOUSE_FRAME.vIn[1]], '≥3.6 m');

  // boundary length labels
  const L = SITE.lot;
  const blab = (i, j, s, dx = 0, dy = 0) => {
    const m = X([(L[i][0] + L[j][0]) / 2, (L[i][1] + L[j][1]) / 2]);
    txt(m[0] + dx, m[1] + dy, s, { fill: '#E2A07A', 'font-size': 11.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  };
  blab(0, 1, '32.08 m', 38, 0); blab(6, 7, '21.56 m', -40, 0); blab(7, 0, '23.05 m', 0, -10);
  blab(3, 4, '21.5 m frontage', 10, 26); blab(5, 6, 'splay 5.5 m', -52, 8);

  // pedestrian link note
  txt(...X([-19.5, -13.8]), 'pedestrian link', { fill: '#5b6b8c', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  // street names
  txt(...X([2, -22.5]), 'PIMPALA COURT', { fill: '#7b8497', 'font-size': 12, 'text-anchor': 'middle', 'letter-spacing': '.18em', 'font-family': 'var(--mono)' }, g);

  // north arrow (true north = +y site = straight up on screen)
  const nx = W - 64, ny = 84;
  el('line', { x1: nx, y1: ny + 26, x2: nx, y2: ny - 18, stroke: '#E2A07A', 'stroke-width': 2 }, g);
  poly([[nx, ny - 26], [nx - 7, ny - 10], [nx + 7, ny - 10]], { fill: '#E2A07A' }, g);
  txt(nx, ny + 42, 'N', { fill: '#E2A07A', 'font-size': 15, 'text-anchor': 'middle', 'font-weight': 700 }, g);
  // scale bar
  const sx = 40, sy = H - 36;
  el('line', { x1: sx, y1: sy, x2: sx + 10 * sc, y2: sy, stroke: '#aab', 'stroke-width': 2 }, g);
  [0, 5, 10].forEach(m => { el('line', { x1: sx + m * sc, y1: sy - 5, x2: sx + m * sc, y2: sy + 5, stroke: '#aab', 'stroke-width': 1.5 }, g); txt(sx + m * sc, sy + 18, m + ' m', { fill: '#aab', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g); });
  // legend
  const leg = [['#efe7d8', 'New dwelling (roofed 338.5 m²)'], ['#c4593a', 'Existing house — demolish (dashed)'], ['#6e6a62', 'Driveway 55 m² (not garden area)'], ['#3c5f33', 'Garden area 285 m² = 42 % (lawn/paving)']];
  leg.forEach((it, i) => {
    el('rect', { x: 40, y: 26 + i * 21, width: 13, height: 13, fill: it[0], rx: 2 }, g);
    txt(60, 37 + i * 21, it[1], { fill: '#c9cfdb', 'font-size': 11.5, 'font-family': 'var(--mono)' }, g);
  });
}

// ============================================================
// FLOOR PLANS
// ============================================================
function drawFloorPlan(svg, rooms, wings, title, totalLabel) {
  const sc = 34, padL = 70, padT = 56;
  const W = 20.0 * sc + padL + 60, H = 18.5 * sc + padT + 84;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const X = (u, v) => [padL + (20.0 - u) * sc, padT + (18.5 - v) * sc]; // east→right, front→bottom
  const g = el('g', {}, svg);

  // wing slabs
  for (const w of wings) {
    const pts = [X(w[0], w[1]), X(w[2], w[1]), X(w[2], w[3]), X(w[0], w[3])];
    poly(pts, { fill: '#f4efe4', stroke: '#11141b', 'stroke-width': 5 }, g);
  }
  // rooms
  for (const r of rooms) {
    const pts = [X(r.u0, r.v0), X(r.u1, r.v0), X(r.u1, r.v1), X(r.u0, r.v1)];
    poly(pts, {
      fill: r.open ? '#e4ecdf' : '#faf6ec',
      stroke: '#3a3a3a', 'stroke-width': 1.6,
      'stroke-dasharray': r.open ? '7 4' : 'none',
    }, g);
    const cxy = X((r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2);
    const small = (r.u1 - r.u0) * (r.v1 - r.v0) < 8;
    txt(cxy[0], cxy[1] - (r.a ? 4 : -3), r.l, { fill: '#1d212b', 'font-size': small ? 9.5 : 12, 'font-weight': 600, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
    if (r.a) txt(cxy[0], cxy[1] + 11, r.a + ' m²', { fill: '#8a8377', 'font-size': 9.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
    if (r.stair) {
      for (let i = 0; i <= 12; i++) {
        const v = r.stair.v0 + (r.stair.v1 - r.stair.v0) * i / 12;
        el('line', { x1: X(r.stair.u0, v)[0], y1: X(r.stair.u0, v)[1], x2: X(r.stair.u1, v)[0], y2: X(r.stair.u1, v)[1], stroke: '#777', 'stroke-width': 1 }, g);
      }
    }
  }
  // overall dims
  function hdim(u0, u1, v, label, below) {
    const A = X(u0, v), B = X(u1, v); const y = A[1] + (below ? 30 : -26);
    el('line', { x1: A[0], y1: y, x2: B[0], y2: y, stroke: '#9fc4d6', 'stroke-width': 1 }, g);
    [[A[0]], [B[0]]].forEach(x => el('line', { x1: x[0], y1: y - 5, x2: x[0], y2: y + 5, stroke: '#9fc4d6', 'stroke-width': 1 }, g));
    txt((A[0] + B[0]) / 2, y - 6, label, { fill: '#9fc4d6', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  }
  function vdim(v0, v1, u, label) {
    const A = X(u, v0), B = X(u, v1); const x = A[0] - 30;
    el('line', { x1: x, y1: A[1], x2: x, y2: B[1], stroke: '#9fc4d6', 'stroke-width': 1 }, g);
    [[A[1]], [B[1]]].forEach(y => el('line', { x1: x - 5, y1: y[0], x2: x + 5, y2: y[0], stroke: '#9fc4d6', 'stroke-width': 1 }, g));
    txt(x - 10, (A[1] + B[1]) / 2, label, { fill: '#9fc4d6', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'var(--mono)', transform: `rotate(-90 ${x - 10} ${(A[1] + B[1]) / 2})` }, g);
  }
  hdim(0, 13.0, 18.5, '13.0 m', false);
  hdim(wings[1][0], wings[1][2], wings[1][3], (wings[1][2] - wings[1][0]).toFixed(1) + ' m', false);
  vdim(0, 18.5, 20.0, '18.5 m');
  hdim(wings === GROUND_WINGS ? 0 : 0.8, 13.0, 0, (wings === GROUND_WINGS ? '13.0' : '12.2') + ' m', true);

  // north arrow: house v-axis bearing 11.7°E ⇒ true north tilts 11.7° west of "up"
  const nx = W - 52, ny = 64, a = -11.7 * Math.PI / 180;
  const dx = Math.sin(a) * 30, dy = -Math.cos(a) * 30;
  el('line', { x1: nx - dx * .6, y1: ny - dy * .6, x2: nx + dx, y2: ny + dy, stroke: '#E2A07A', 'stroke-width': 2 }, g);
  poly([[nx + dx * 1.25, ny + dy * 1.25], [nx + dx * .75 - dy * .22, ny + dy * .75 + dx * .22], [nx + dx * .75 + dy * .22, ny + dy * .75 - dx * .22]], { fill: '#E2A07A' }, g);
  txt(nx, ny + 46, 'N', { fill: '#E2A07A', 'font-size': 14, 'text-anchor': 'middle', 'font-weight': 700 }, g);

  txt(padL, H - 22, totalLabel, { fill: '#c9cfdb', 'font-size': 13, 'font-family': 'var(--mono)' }, g);
  txt(padL, 28, title, { fill: '#E2A07A', 'font-size': 15, 'letter-spacing': '.2em', 'font-family': 'var(--mono)' }, g);
}

// ============================================================
// GANTT
// ============================================================
function drawGantt(svg) {
  const months = TIMELINE_TOTAL, rowH = 42, padL = 218, padT = 44;
  const W = 980, chartW = W - padL - 30, H = TIMELINE.length * rowH + padT + 56;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const g = el('g', {}, svg);
  const mx = m => padL + m / months * chartW;
  for (let m = 0; m <= months; m += 2) {
    el('line', { x1: mx(m), y1: padT - 8, x2: mx(m), y2: H - 46, stroke: '#262b37', 'stroke-width': 1 }, g);
    txt(mx(m), padT - 16, 'M' + m, { fill: '#67708a', 'font-size': 10.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g);
  }
  const colors = ['#9fc4d6', '#9fc4d6', '#9fc4d6', '#e3c887', '#e3c887', '#c4593a', '#E2A07A', '#E2A07A', '#E2A07A', '#E2A07A', '#E2A07A', '#6fae54'];
  TIMELINE.forEach((t, i) => {
    const y = padT + i * rowH;
    txt(padL - 12, y + 17, t.phase, { fill: '#dfe3ec', 'font-size': 12.5, 'text-anchor': 'end', 'font-family': 'var(--mono)' }, g);
    el('rect', { x: mx(t.start), y: y + 4, width: Math.max(10, t.dur / months * chartW), height: 19, rx: 4, fill: colors[i], opacity: .92 }, g);
    txt(mx(t.start + t.dur) + 8, y + 17, t.dur + ' mo', { fill: '#67708a', 'font-size': 10, 'font-family': 'var(--mono)' }, g);
  });
  txt(padL, H - 18, '≈ 23 months realistic end-to-end · fast path ~18 months with a volume builder fast-track program', { fill: '#8b93a8', 'font-size': 12, 'font-family': 'var(--mono)' }, g);
}

// ============================================================
// payment stages bar
// ============================================================
function drawPayments(container) {
  const wrap = document.createElement('div'); wrap.className = 'paybar';
  COSTS.paymentStages.forEach(s => {
    const seg = document.createElement('div');
    seg.className = 'payseg'; seg.style.flex = s.pct;
    seg.innerHTML = `<b>${s.pct}%</b><span>${s.stage}</span>`;
    wrap.appendChild(seg);
  });
  container.appendChild(wrap);
  const note = document.createElement('p'); note.className = 'small muted';
  note.textContent = 'Progress payment caps fixed by the Domestic Building Contracts Act 1995 (Vic) — a builder cannot lawfully front-load beyond these.';
  container.appendChild(note);
}
