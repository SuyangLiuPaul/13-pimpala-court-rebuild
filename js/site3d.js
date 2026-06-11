// ============================================================
// Photoreal-leaning 3D: real cadastral site + proposed dwelling
// House frame: u 0(east)→20(west), v 0(front)→18.5(rear)
// World: x = site east, z = -site north (three.js z towards viewer/south)
// ============================================================
let scene, camera, renderer, sun, hemi;
let extG, gndG, upG, roofG, siteCtxG, lotG;
let view = 'exterior', autoRot = false, roofOn = true;
let rotY = -0.65, rotX = 0.33, dist = 50, tgt = { x: 0, y: 2.2, z: -2 };
const S2W = p => [p[0], -p[1]];   // site XY -> world x,z

const HF = HOUSE_FRAME;
function hw(u, v) { const s = houseToSite(u, v); return [s[0], -s[1]]; } // house -> world [x,z]

// ---------- procedural canvas textures ----------
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}
const TEX = {};
function makeTextures() {
  TEX.brick = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8d8377'; g.fillRect(0, 0, w, h);
    const bw = 42, bh = 16;
    for (let y = 0, r = 0; y < h; y += bh, r++) {
      for (let x = -bw; x < w + bw; x += bw) {
        const ox = (r % 2) * bw / 2;
        const tone = 118 + Math.floor(Math.random() * 34);
        g.fillStyle = `rgb(${tone},${tone - 9},${tone - 22})`;
        g.fillRect(x + ox + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
  }, 3.2, 1.6);
  TEX.render = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ece6da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(${190 + Math.random() * 40},${186 + Math.random() * 38},${172 + Math.random() * 36},.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    }
  }, 4, 4);
  TEX.roof = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3d4046'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 21) {
      g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(0, y, w, 4);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, y + 4, w, 2);
      for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x + (y % 42 ? 16 : 0), y + 4, 2, 17); }
    }
  }, 4, 4);
  TEX.grass = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5d8748'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const v = Math.random();
      g.fillStyle = `rgba(${60 + v * 50},${112 + v * 52},${48 + v * 36},.55)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.6, 2.6);
    }
  }, 9, 9);
  TEX.lawn = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#669150'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const v = Math.random();
      g.fillStyle = `rgba(${68 + v * 52},${126 + v * 52},${54 + v * 36},.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.6, 2.8);
    }
    // mow stripes
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 32, h); }
  }, 4, 4);
  TEX.asphalt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4200; i++) {
      const v = 48 + Math.random() * 36;
      g.fillStyle = `rgba(${v},${v},${v + 4},.6)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
  }, 6, 6);
  TEX.agg = canvasTex(256, 256, (g, w, h) => {  // exposed aggregate driveway
    g.fillStyle = '#9b948a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const v = 110 + Math.random() * 80;
      g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, .9 + Math.random() * 1.4, 0, 7); g.fill();
    }
  }, 3, 3);
  TEX.paver = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8e887e'; g.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const v = 128 + Math.random() * 26;
      g.fillStyle = `rgb(${v},${v - 5},${v - 14})`; g.fillRect(x + 2, y + 2, s - 4, s - 4);
    }
  }, 3, 3);
  TEX.fence = canvasTex(256, 128, (g, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const v = 120 + Math.random() * 36;
      g.fillStyle = `rgb(${v},${v * .78},${v * .55})`; g.fillRect(x, 0, 14, h);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 13, 0, 3, h);
    }
  }, 6, 1);
  TEX.garage = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#cfd2d6'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 36) {
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, y, w, 5);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, y + 5, w, 3);
    }
  }, 1, 1);
}

// ---------- materials ----------
let MAT = {};
function makeMaterials() {
  MAT = {
    brick: new THREE.MeshStandardMaterial({ map: TEX.brick, roughness: .94 }),
    render: new THREE.MeshStandardMaterial({ map: TEX.render, roughness: .82 }),
    renderDark: new THREE.MeshStandardMaterial({ color: 0x4b4f55, roughness: .8 }),
    roof: new THREE.MeshStandardMaterial({ map: TEX.roof, roughness: .85, side: THREE.DoubleSide }),
    fascia: new THREE.MeshStandardMaterial({ color: 0x2e3136, roughness: .55 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x6fa8c2, roughness: .06, metalness: .55, transparent: true, opacity: .5 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x191b1e, roughness: .45, metalness: .3 }),
    door: new THREE.MeshStandardMaterial({ color: 0x4f3a28, roughness: .6 }),
    garage: new THREE.MeshStandardMaterial({ map: TEX.garage, roughness: .5, metalness: .35 }),
    grass: new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }),
    lawn: new THREE.MeshStandardMaterial({ map: TEX.lawn, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ map: TEX.asphalt, roughness: .96 }),
    agg: new THREE.MeshStandardMaterial({ map: TEX.agg, roughness: .92 }),
    paver: new THREE.MeshStandardMaterial({ map: TEX.paver, roughness: .9 }),
    conc: new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: .92 }),
    fence: new THREE.MeshStandardMaterial({ map: TEX.fence, roughness: .95 }),
    nbr: new THREE.MeshStandardMaterial({ color: 0xb9b0a2, roughness: .95 }),
    nbrRoof: new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: .9 }),
    kerb: new THREE.MeshStandardMaterial({ color: 0x8e8a82, roughness: .9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5d4530, roughness: .95 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4d7a3a, roughness: 1 }),
    floorG: new THREE.MeshStandardMaterial({ color: 0xcdbfa3, roughness: .85 }),
    floorTile: new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: .6 }),
    carpet: new THREE.MeshStandardMaterial({ color: 0xb6aa96, roughness: 1 }),
    bath: new THREE.MeshStandardMaterial({ color: 0xc2d8da, roughness: .7 }),
    intWall: new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .95 }),
    cab: new THREE.MeshStandardMaterial({ color: 0xf0ece3, roughness: .55 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x2c2d33, roughness: .3, metalness: .2 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: .8 }),
    doona: new THREE.MeshStandardMaterial({ color: 0xf5f2ec, roughness: .92 }),
    sofa: new THREE.MeshStandardMaterial({ color: 0x66788a, roughness: .95 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: .3, metalness: .6 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x0e1013, roughness: .3 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: .5 }),
  };
}

// ---------- primitives ----------
function B(g, w, h, d, x, y, z, m, cast = true) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; g.add(o); return o;
}
function shapeFromPts(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath(); return s;
}
// flat polygon on ground (site pts -> world), y-up extrude thin
function flatPoly(g, sitePts, y, thick, mat, texScale) {
  const pts = sitePts.map(p => [p[0], p[1]]);
  const sh = shapeFromPts(pts);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  if (texScale) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * texScale, uv.getY(i) * texScale);
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y + thick; m.receiveShadow = true; m.castShadow = false;
  g.add(m); return m;
}

// wall with openings — local x along length, built at origin then placed
function panel(g, x0, x1, y0, y1, T, mat) {
  const w = x1 - x0, h = y1 - y0;
  if (w <= .004 || h <= .004) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, T), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
  m.castShadow = true; m.receiveShadow = true; g.add(m);
}
function glazing(g, x0, x1, y0, y1, T) {
  const w = x1 - x0, h = y1 - y0;
  const gl = new THREE.Mesh(new THREE.BoxGeometry(w - .1, h - .1, T * .25), MAT.glass);
  gl.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); g.add(gl);
  const f = .07;
  panelM(g, x0, x1, y0, y0 + f, T * 1.12, MAT.frame); panelM(g, x0, x1, y1 - f, y1, T * 1.12, MAT.frame);
  panelV(g, x0, x0 + f, y0, y1, T * 1.12, MAT.frame); panelV(g, x1 - f, x1, y0, y1, T * 1.12, MAT.frame);
  // mid mullion for wide windows
  if (w > 1.9) panelV(g, (x0 + x1) / 2 - f / 2, (x0 + x1) / 2 + f / 2, y0, y1, T * 1.12, MAT.frame);
}
function panelM(g, x0, x1, y0, y1, T, m) { panel(g, x0, x1, y0, y1, T, m); }
function panelV(g, x0, x1, y0, y1, T, m) { panel(g, x0, x1, y0, y1, T, m); }
function wallRun(group, a, b, H, T, mat, openings, yBase = 0) {
  // a,b world [x,z]; openings: {at(center m along), w, type, sill, head}
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = new THREE.Group();
  const spans = (openings || []).map(o => ({ x0: o.at - o.w / 2, x1: o.at + o.w / 2, o })).sort((p, q) => p.x0 - q.x0);
  let prev = 0;
  for (const s of spans) {
    if (s.x0 > prev + .004) panel(g, prev, s.x0, 0, H, T, mat);
    const t = s.o.type || 'window';
    const sill = t === 'window' ? (s.o.sill ?? .9) : .0;
    const head = Math.min(H, s.o.head ?? (t === 'garage' ? 2.45 : 2.18));
    if (sill > .004) panel(g, s.x0, s.x1, 0, sill, T, mat);
    if (head < H - .004) panel(g, s.x0, s.x1, head, H, T, mat);
    if (t === 'window') glazing(g, s.x0, s.x1, sill, head, T);
    if (t === 'door') { const d = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0 - .08, head - .06, T * .5), s.o.glass ? MAT.glass : MAT.door); d.position.set((s.x0 + s.x1) / 2, (head) / 2, 0); d.castShadow = true; g.add(d); }
    if (t === 'stacker') glazing(g, s.x0, s.x1, .04, head, T);
    if (t === 'garage') { const d = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0 - .1, head - .08, T * .45), MAT.garage); d.position.set((s.x0 + s.x1) / 2, head / 2, 0); g.add(d); }
    prev = s.x1;
  }
  if (prev < len - .004) panel(g, prev, len, 0, H, T, mat);
  g.position.set(a[0], yBase, a[1]);
  g.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  group.add(g); return g;
}

// hip roof over rectangle defined in house coords
function hipRoof(g, u0, v0, u1, v1, yEave, pitchDeg, eave) {
  const p00 = hw(u0 - eave / 1, v0 - eave), p10 = hw(u1 + eave, v0 - eave),
        p11 = hw(u1 + eave, v1 + eave), p01 = hw(u0 - eave, v1 + eave);
  const W = Math.abs(u1 - u0) + 2 * eave, D = Math.abs(v1 - v0) + 2 * eave;
  const rise = Math.tan(pitchDeg * Math.PI / 180) * (Math.min(W, D) / 2);
  const yR = yEave + rise;
  // ridge along the LONG axis
  let r1, r2;
  if (D >= W) { const m = W / 2; r1 = hw((u0 + u1) / 2, v0 - eave + m); r2 = hw((u0 + u1) / 2, v1 + eave - m); }
  else { const m = D / 2; r1 = hw(u0 - eave + m, (v0 + v1) / 2); r2 = hw(u1 + eave - m, (v0 + v1) / 2); }
  const V = [];
  const tri = (A, B, C) => { V.push(A[0], yEave, A[1], B[0], yEave, B[1], C[0], yR, C[1]); };
  const quad = (A, B, R2, R1) => { V.push(A[0], yEave, A[1], B[0], yEave, B[1], R2[0], yR, R2[1], A[0], yEave, A[1], R2[0], yR, R2[1], R1[0], yR, R1[1]); };
  quad(p00, p10, r1, r1); // front slope (tri if pyramidal)
  quad(p10, p11, r2, r1);
  quad(p11, p01, r2, r2);
  quad(p01, p00, r1, r2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(V, 3));
  geo.computeVertexNormals();
  // planar UVs
  const pos = geo.attributes.position, uv = [];
  for (let i = 0; i < pos.count; i++) uv.push(pos.getX(i) * .28, pos.getZ(i) * .28);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const roof = new THREE.Mesh(geo, MAT.roof);
  roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  // fascia + gutter box around eave perimeter
  const per = [[p00, p10], [p10, p11], [p11, p01], [p01, p00]];
  for (const [A, Bp] of per) {
    const len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
    const f = new THREE.Mesh(new THREE.BoxGeometry(len, .24, .12), MAT.fascia);
    f.position.set((A[0] + Bp[0]) / 2, yEave - .02, (A[1] + Bp[1]) / 2);
    f.rotation.y = -Math.atan2(Bp[1] - A[1], Bp[0] - A[0]);
    f.castShadow = true; g.add(f);
  }
  // flat soffit under eaves
  const sof = shapeFromPts([p00, p10, p11, p01].map(p => [p[0], p[1]]));
  const sg = new THREE.ExtrudeGeometry(sof, { depth: .05, bevelEnabled: false });
  sg.rotateX(Math.PI / 2);
  const sm = new THREE.Mesh(sg, MAT.render); sm.position.y = yEave - .06; g.add(sm);
}

// ============================================================
// build site context
// ============================================================
function buildSiteCtx() {
  siteCtxG = new THREE.Group();
  // base ground
  const base = new THREE.Mesh(new THREE.CircleGeometry(120, 48), MAT.grass);
  base.rotation.x = -Math.PI / 2; base.position.y = -.06; base.receiveShadow = true;
  siteCtxG.add(base);
  // roads as ribbons
  for (const r of SITE.roads) {
    if (r.pts.length < 2) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = S2W(r.pts[i]), b = S2W(r.pts[i + 1]);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(len + .9, .05, 6.6), MAT.asphalt);
      seg.position.set((a[0] + b[0]) / 2, -.012, (a[1] + b[1]) / 2);
      seg.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      seg.receiveShadow = true; siteCtxG.add(seg);
      const k1 = new THREE.Mesh(new THREE.BoxGeometry(len + .9, .12, .3), MAT.kerb);
      k1.position.set((a[0] + b[0]) / 2, .01, (a[1] + b[1]) / 2); k1.rotation.y = seg.rotation.y;
      k1.translateZ(3.45); siteCtxG.add(k1);
      const k2 = k1.clone(); k2.translateZ(-6.9); siteCtxG.add(k2);
    }
  }
  // neighbour parcels + generic houses
  for (const n of SITE.neighbours) {
    flatPoly(siteCtxG, n.ring.slice(0, -1).map(p => [p[0], -p[1]]), -.05, .045, MAT.grass, .12);
    if (n.area < 100) continue; // pedestrian link sliver
    const c = S2W(n.centroid);
    const hgroup = new THREE.Group();
    const hx = 10.5, hz = 8.5, hh = 2.9;
    B(hgroup, hx, hh, hz, 0, hh / 2, 0, MAT.nbr);
    // simple neighbour hip roof — 4-sided pyramid scaled to cover the box + eaves
    const rr = 5;
    const rg = new THREE.ConeGeometry(rr, 2.3, 4);
    const rm = new THREE.Mesh(rg, MAT.nbrRoof);
    rm.position.set(0, hh + 1.15, 0); rm.rotation.y = Math.PI / 4;
    rm.scale.set((hx + 1.0) / (rr * Math.SQRT2), 1, (hz + 1.0) / (rr * Math.SQRT2));
    rm.castShadow = true; hgroup.add(rm);
    hgroup.position.set(c[0], 0, c[1]);
    hgroup.rotation.y = -11.7 * Math.PI / 180;
    siteCtxG.add(hgroup);
  }
  // street trees on verges (outside the lot — context only)
  const trees = [[-2, -24.5], [14, -22], [-20, -19], [24, 6], [-26, 16], [18, 26]];
  for (const t of trees) tree(siteCtxG, ...S2W(t), 1 + Math.random() * .4);
}
function tree(g, x, z, s) {
  const o = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.14 * s, .2 * s, 1.7 * s, 8), MAT.trunk);
  tr.position.y = .85 * s; tr.castShadow = true; o.add(tr);
  for (let i = 0; i < 3; i++) {
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry((.85 - i * .14) * s, 1), MAT.leaf);
    lf.position.set((Math.random() - .5) * s * .8, (1.9 + i * .55) * s, (Math.random() - .5) * s * .8);
    lf.castShadow = true; o.add(lf);
  }
  o.position.set(x, 0, z); g.add(o);
}

// ============================================================
// our lot: lawn, fence, driveway, terrace — no pool, no garden beds
// ============================================================
function buildLot() {
  lotG = new THREE.Group();
  flatPoly(lotG, SITE.lot.slice(0, -1).map(p => [p[0], -p[1]]), -.04, .06, MAT.lawn, .25);
  // boundary fences (sides + rear, not frontage)
  const fenceEdges = [[0, 1], [6, 7], [7, 8]];
  for (const [i, j] of fenceEdges) {
    const a = S2W(SITE.lot[i]), b = S2W(SITE.lot[j]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const f = new THREE.Mesh(new THREE.BoxGeometry(len, 1.95, .07), MAT.fence);
    f.position.set((a[0] + b[0]) / 2, .975, (a[1] + b[1]) / 2);
    f.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    f.castShadow = true; f.receiveShadow = true; lotG.add(f);
  }
  // driveway: garage face to frontage
  flatPoly(lotG, [hw(13.3, 2.45), hw(19.7, 2.45), hw(20.6, -5.6), hw(14.3, -6.6)], 0, .055, MAT.agg, .4);
  // path to porch
  flatPoly(lotG, [hw(5.0, .1), hw(6.8, .1), hw(6.8, -7.6), hw(5.0, -7.4)], 0, .05, MAT.conc, .5);
  // rear open terrace (unroofed — counts as garden area)
  flatPoly(lotG, [hw(2.0, 18.55), hw(12.0, 18.55), hw(12.0, 21.4), hw(2.0, 21.4)], 0, .05, MAT.paver, .45);
  // letterbox
  const lb = new THREE.Group();
  B(lb, .35, .9, .35, 0, .45, 0, MAT.renderDark);
  B(lb, .42, .25, .42, 0, 1.0, 0, MAT.fascia);
  const lp = hw(8.6, -7.0); lb.position.set(lp[0], 0, lp[1]); lotG.add(lb);
  // clothesline (rear, service)
  const cl = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.6, 8), MAT.steel); pole.position.y = .8; cl.add(pole);
  B(cl, 2.2, .03, 1.4, 0, 1.55, 0, MAT.steel, false);
  const cp = hw(17.5, 18.6); cl.position.set(cp[0], 0, cp[1]); lotG.add(cl);
}

// ============================================================
// the dwelling
// ============================================================
const GH = 2.74, FT = .36, UH = 2.59;     // ground ceiling, floor structure, upper ceiling
const UY = GH + FT;                        // upper floor level 3.10
const EAVE_E = UY + UH;                    // east wing eave 5.69
const EAVE_W_G = GH + .35;                 // garage wing parapet/eave where single storey

function buildExterior() {
  extG = new THREE.Group();
  // slab edges
  flatPoly(extG, [hw(0, 0), hw(13, 0), hw(13, 18.5), hw(0, 18.5)].map((p, i) => p), -.01, .14, MAT.conc, .3);
  flatPoly(extG, [hw(13, 2.5), hw(20, 2.5), hw(20, 16.5), hw(13, 16.5)], -.01, .14, MAT.conc, .3);

  // ---------- EAST WING ground walls (brick) ----------
  // front (v0): porch recess at u4.2–7.4 → wall has door inside recess; study window u7.4–12.8
  wallRun(extG, hw(0, 0), hw(4.2, 0), GH, .24, MAT.brick, [{ at: 2.1, w: 1.9, type: 'window', sill: .9 }]);
  // porch recess: side cheeks + internal front wall with entry door
  wallRun(extG, hw(4.2, 2.3), hw(7.4, 2.3), GH, .24, MAT.brick, [{ at: 1.6, w: 1.5, type: 'door' }]);
  wallRun(extG, hw(4.2, 0), hw(4.2, 2.3), GH, .24, MAT.brick, []);
  wallRun(extG, hw(7.4, 0), hw(7.4, 2.3), GH, .24, MAT.brick, []);
  wallRun(extG, hw(7.4, 0), hw(13, 0), GH, .24, MAT.brick, [{ at: 2.8, w: 2.6, type: 'window', sill: .75 }]);
  // east side (u=0): guest window, rumpus window, family window
  wallRun(extG, hw(0, 0), hw(0, 18.5), GH, .24, MAT.brick, [
    { at: 2.1, w: 1.8, type: 'window' }, { at: 8.1, w: 1.8, type: 'window' }, { at: 15.2, w: 2.6, type: 'window', sill: .65 }]);
  // rear (v=18.5): stacker doors to terrace + kitchen window
  wallRun(extG, hw(13, 18.5), hw(0, 18.5), GH, .24, MAT.brick, [
    { at: 9.5, w: 4.6, type: 'stacker', head: 2.4 }, { at: 2.0, w: 2.2, type: 'window', sill: 1.0 }]);
  // west side of east wing exposed v16.5–18.5 strip (next to alfresco)
  wallRun(extG, hw(13, 16.5), hw(13, 18.5), GH, .24, MAT.brick, []);

  // ---------- WEST WING ground (garage + service, brick) ----------
  wallRun(extG, hw(13.2, 2.5), hw(19.8, 2.5), GH, .24, MAT.brick, [{ at: 3.3, w: 5.2, type: 'garage', head: 2.4 }]);
  wallRun(extG, hw(13, 2.5), hw(13, 0), GH, .24, MAT.brick, []); // return to east wing front line? (link wall)
  wallRun(extG, hw(20, 2.5), hw(20, 12.9), GH, .24, MAT.brick, [
    { at: 7.6, w: 1.2, type: 'window', sill: 1.4, head: 2.0 }, { at: 9.6, w: 1.0, type: 'door' }]);
  wallRun(extG, hw(13.2, 2.5), hw(13, 2.5), GH, .24, MAT.brick, []);
  // service band rear wall at v12.9 (alfresco beyond is open)
  wallRun(extG, hw(20, 12.9), hw(13, 12.9), GH, .24, MAT.brick, [{ at: 3.5, w: 2.4, type: 'stacker', head: 2.3 }]);
  // alfresco: open on rear + east — corner posts
  [[13.5, 16.3], [19.5, 16.3]].forEach(([u, v]) => {
    const p = hw(u, v);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.18, GH, .18), MAT.fascia);
    post.position.set(p[0], GH / 2, p[1]); post.castShadow = true; extG.add(post);
  });

  // ---------- UPPER (render) ----------
  upG = new THREE.Group();
  // east wing upper: inset east side to u0.8
  wallRun(upG, hw(0.8, 0), hw(13, 0), UH, .2, MAT.render, [
    { at: 2.2, w: 2.0, type: 'window', sill: .9 }, { at: 9.4, w: 2.0, type: 'window', sill: .9 }], UY);
  wallRun(upG, hw(0.8, 0), hw(0.8, 18.5), UH, .2, MAT.render, [
    { at: 2.2, w: 1.8, type: 'window' }, { at: 10.8, w: 1.8, type: 'window' }, { at: 15.8, w: 2.2, type: 'window', sill: .8 }], UY);
  wallRun(upG, hw(13, 18.5), hw(0.8, 18.5), UH, .2, MAT.render, [
    { at: 3.0, w: 2.4, type: 'window', sill: .8 }, { at: 8.3, w: 1.6, type: 'window' }, { at: 11.4, w: 1.4, type: 'window', sill: 1.2, head: 2.0 }], UY);
  wallRun(upG, hw(13, 0), hw(13, 18.5), UH, .2, MAT.render, [{ at: 5.5, w: 1.6, type: 'window' }], UY);
  // west wing upper over garage u13–19, v2.5–9.1
  wallRun(upG, hw(13, 2.5), hw(19, 2.5), UH, .2, MAT.render, [{ at: 3.0, w: 2.2, type: 'window', sill: .9 }], UY);
  wallRun(upG, hw(19, 2.5), hw(19, 9.1), UH, .2, MAT.render, [{ at: 3.3, w: 1.6, type: 'window' }], UY);
  wallRun(upG, hw(19, 9.1), hw(13, 9.1), UH, .2, MAT.render, [], UY);
  // upper floor slab band (between storeys) — subtle dark trim
  flatPoly(upG, [hw(.7, -.06), hw(13.1, -.06), hw(13.1, 18.6), hw(.7, 18.6)], UY - FT, FT, MAT.renderDark, .2);
  flatPoly(upG, [hw(12.9, 2.42), hw(19.1, 2.42), hw(19.1, 9.2), hw(12.9, 9.2)], UY - FT, FT, MAT.renderDark, .2);

  // ---------- roofs ----------
  roofG = new THREE.Group();
  hipRoof(roofG, 0.8, 0, 13, 18.5, UY + UH, 22.5, .5);
  hipRoof(roofG, 13, 2.5, 19, 9.1, UY + UH, 22.5, .45);
  // single-storey roofs: garage front strip (v2.5 face is under upper), service band + alfresco get skillion at ground level
  hipRoof(roofG, 13, 9.1, 20, 16.5, GH + .25, 14, .42);   // low hip over service + alfresco
  hipRoof(roofG, 19, 2.5, 20, 9.1, GH + .25, 12, .3);     // west sliver over garage edge

  // porch canopy
  const pc = new THREE.Group();
  flatPoly(pc, [hw(4.0, -1.6), hw(7.6, -1.6), hw(7.6, 2.4), hw(4.0, 2.4)], GH + .12, .14, MAT.renderDark, .3);
  [[4.35, -1.25], [7.25, -1.25]].forEach(([u, v]) => {
    const p = hw(u, v);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.16, GH + .1, .16), MAT.fascia);
    post.position.set(p[0], (GH + .1) / 2, p[1]); post.castShadow = true; pc.add(post);
  });
  extG.add(pc);
  extG.add(upG);
}

// ---------- interiors (dollhouse views) ----------
let intGround, intUpper;
const LP = 1.25; // low partition height
function intWallU(g, u, v0, v1, y0, gap) { // wall along v at fixed u
  const a = hw(u, v0), b = hw(u, v1);
  segWall(g, a, b, y0, gap);
}
function intWallV(g, v, u0, u1, y0, gap) {
  const a = hw(u0, v), b = hw(u1, v);
  segWall(g, a, b, y0, gap);
}
function segWall(g, a, b, y0, gap) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dir = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const mk = (s0, s1) => {
    if (s1 - s0 < .05) return;
    const w = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, LP, .1), MAT.intWall);
    w.position.set(a[0] + dir[0] * (s0 + s1) / 2, y0 + LP / 2, a[1] + dir[1] * (s0 + s1) / 2);
    w.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    w.castShadow = true; g.add(w);
  };
  if (!gap) mk(0, len);
  else { const m = len / 2; mk(0, m - gap / 2); mk(m + gap / 2, len); }
}
function zone(g, u0, v0, u1, v1, mat, y) {
  flatPoly(g, [hw(u0, v0), hw(u1, v0), hw(u1, v1), hw(u0, v1)], y + .005, .04, mat, .3);
}
function furnish(g, kind, u, v, rotDeg, y0, opt) {
  const o = new THREE.Group();
  const M = MAT;
  if (kind === 'bed') {
    const w = opt && opt.master ? 1.9 : 1.5;
    B(o, w, .3, 2.05, 0, .26, 0, M.wood); B(o, w - .06, .2, 1.98, 0, .5, .02, M.doona);
    B(o, w, .7, .12, 0, .5, -1.06, M.wood);
    B(o, w * .4, .12, .4, -w * .24, .62, -.72, M.white); B(o, w * .4, .12, .4, w * .24, .62, -.72, M.white);
  } else if (kind === 'sofa') {
    B(o, 2.4, .34, .92, 0, .28, 0, M.sofa); B(o, 2.4, .46, .2, 0, .56, -.36, M.sofa);
    B(o, .24, .46, .92, -1.1, .46, 0, M.sofa); B(o, .24, .46, .92, 1.1, .46, 0, M.sofa);
  } else if (kind === 'tv') {
    B(o, 1.9, .38, .4, 0, .19, 0, M.wood); B(o, 1.75, .95, .06, 0, .95, -.1, M.screen);
  } else if (kind === 'dining') {
    B(o, 2.1, .08, 1.05, 0, .73, 0, M.wood);
    [[-.9, -.4], [.9, -.4], [-.9, .4], [.9, .4]].forEach(([a, b]) => B(o, .08, .7, .08, a, .35, b, M.wood));
  } else if (kind === 'island') {
    B(o, 2.4, .88, 1.0, 0, .44, 0, M.cab); B(o, 2.55, .06, 1.12, 0, .9, 0, M.stone);
  } else if (kind === 'bench') {
    const L = (opt && opt.len) || 2.6;
    B(o, L, .86, .62, 0, .43, 0, M.cab); B(o, L, .06, .66, 0, .89, 0, M.stone);
    B(o, L, .9, .05, 0, 1.4, -.3, M.cab, false);
  } else if (kind === 'fridge') {
    B(o, .9, 1.95, .72, 0, .98, 0, M.steel);
  } else if (kind === 'vanity') {
    B(o, 1.1, .8, .5, 0, .4, 0, M.cab); B(o, 1.16, .05, .54, 0, .84, 0, M.stone);
  } else if (kind === 'wc') {
    B(o, .4, .42, .55, 0, .21, 0, M.white); B(o, .42, .5, .16, 0, .6, -.2, M.white);
  } else if (kind === 'shower') {
    B(o, 1.0, .05, 1.0, 0, .03, 0, M.stone);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.9, 1.0), M.glass); gl.position.set(-.5, .98, 0); o.add(gl);
  } else if (kind === 'bath') {
    B(o, 1.7, .55, .8, 0, .28, 0, M.white);
  } else if (kind === 'desk') {
    B(o, 1.5, .06, .7, 0, .73, 0, M.wood);
    B(o, .5, .4, .05, 0, 1.0, .1, M.screen);
  } else if (kind === 'wudu') {
    B(o, 1.5, .2, .45, 0, .1, 0, M.stone);
    [-0.4, 0.4].forEach(x => { const t = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .45, 6), M.steel); t.position.set(x, .45, -.15); o.add(t); });
    B(o, 1.2, .08, .35, 0, .42, .25, M.wood);
  } else if (kind === 'car') {
    B(o, 1.8, .5, 4.2, 0, .5, 0, M.renderDark); B(o, 1.6, .42, 2.2, 0, .95, -.1, M.screen);
    [[-.82, 1.35], [.82, 1.35], [-.82, -1.35], [.82, -1.35]].forEach(([x, z]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .24, 14), M.screen);
      t.rotation.z = Math.PI / 2; t.position.set(x, .34, z); o.add(t);
    });
  } else if (kind === 'wr') { // wardrobe
    B(o, (opt && opt.len) || 2.0, 1.9, .55, 0, .95, 0, M.wood);
  }
  const p = hw(u, v);
  o.position.set(p[0], y0, p[1]);
  o.rotation.y = -((rotDeg || 0) * Math.PI / 180) - 11.7 * Math.PI / 180;
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.add(o);
}

function buildInteriorGround() {
  intGround = new THREE.Group();
  // floor zones
  zone(intGround, 0, 0, 13, 18.5, MAT.floorG, 0);
  zone(intGround, 13, 2.5, 20, 16.5, MAT.floorTile, 0);
  zone(intGround, .2, 0, 4.2, 5.9, MAT.carpet, .01);            // guest suite
  zone(intGround, 7.6, 3.6, 12.8, 8.2, MAT.carpet, .01);        // theatre
  zone(intGround, .2, 10.4, 2.0, 12.2, MAT.bath, .01);          // powder
  zone(intGround, 14.6, 8.6, 17.6, 12.9, MAT.floorTile, .01);
  // partitions (low, dollhouse)
  intWallU(intGround, 4.2, 0, 5.9, 0, 1.0);      // guest | entry
  intWallV(intGround, 5.9, .2, 4.2, 0, .9);      // guest ens
  intWallU(intGround, 7.4, 0, 8.2, 0, 1.0);      // entry|study/theatre
  intWallV(intGround, 3.6, 7.4, 12.8, 0, 1.0);   // study | theatre
  intWallV(intGround, 8.2, 7.4, 13, 0, 1.6);     // theatre | hub
  intWallU(intGround, 4.2, 5.9, 12.2, 0, 1.2);   // rumpus | gallery
  intWallV(intGround, 10.4, .2, 4.2, 0, .9);     // rumpus rear
  intWallV(intGround, 12.2, .2, 7.4, 0, 1.4);    // service band
  intWallV(intGround, 12.2, 7.4, 13, 0, 0);
  intWallU(intGround, 2.0, 10.4, 12.2, 0, .8);   // powder|store
  intWallV(intGround, 8.6, 13.2, 19.8, 0, 1.0);  // garage | service
  intWallU(intGround, 14.6, 8.6, 12.9, 0, .8);   // mud | wet kitchen
  intWallU(intGround, 17.6, 8.6, 12.9, 0, .8);   // wet k | laundry
  intWallV(intGround, 12.9, 13, 20, 0, 1.8);     // service | alfresco
  // stair
  stair(intGround, 4.35, 7.0, 0, UY);
  // furniture
  furnish(intGround, 'bed', 2.2, 2.2, 180, 0);
  furnish(intGround, 'desk', 10.1, 1.6, 180, 0);
  furnish(intGround, 'sofa', 10.2, 6.6, 0, 0); furnish(intGround, 'tv', 10.2, 4.2, 180, 0);
  furnish(intGround, 'sofa', 3.2, 15.0, -90, 0); furnish(intGround, 'tv', 1.1, 15.0, 90, 0);
  furnish(intGround, 'dining', 8.5, 15.8, 0, 0);
  furnish(intGround, 'island', 9.7, 15.9, 90, 0);
  furnish(intGround, 'bench', 11.9, 16.2, -90, 0, { len: 3.6 });
  furnish(intGround, 'fridge', 11.6, 13.2, 0, 0);
  furnish(intGround, 'bench', 16.1, 9.3, 0, 0, { len: 2.6 });   // wet kitchen
  furnish(intGround, 'fridge', 14.0, 9.3, 0, 0);
  furnish(intGround, 'wudu', 13.8, 12.4, 0, 0);
  furnish(intGround, 'bench', 18.8, 10.7, -90, 0, { len: 2.2 });// laundry
  furnish(intGround, 'wc', 1.0, 11.0, 0, 0); furnish(intGround, 'vanity', 1.6, 11.9, 180, 0);
  furnish(intGround, 'car', 15.0, 5.4, 0, 0); furnish(intGround, 'car', 17.9, 5.4, 0, 0);
  furnish(intGround, 'dining', 16.5, 14.6, 0, 0);               // alfresco table
}
function stair(g, u0, v0, y0, rise) {
  const steps = 14, run = .27, w = 1.35;
  for (let i = 0; i < steps; i++) {
    const p = hw(u0 + w / 2, v0 + run * (i + .5));
    const st = new THREE.Mesh(new THREE.BoxGeometry(w, .045, run + .03), MAT.white);
    st.position.set(p[0], y0 + rise * (i + 1) / steps, p[1]);
    st.rotation.y = -11.7 * Math.PI / 180;
    st.castShadow = true; g.add(st);
  }
}
function buildInteriorUpper() {
  intUpper = new THREE.Group();
  // slab with stair void
  zone(intUpper, .8, 0, 13, 18.5, MAT.carpet, UY - .04);
  zone(intUpper, 13, 2.5, 19, 9.1, MAT.carpet, UY - .04);
  zone(intUpper, 8.2, 14.9, 11.0, 18.3, MAT.bath, UY - .02);
  zone(intUpper, 8.6, 4.2, 12.2, 7.0, MAT.bath, UY - .02);
  zone(intUpper, 13.0, 6.4, 15.4, 9.1, MAT.bath, UY - .02);
  // partitions
  intWallV(intUpper, 4.4, .8, 5.0, UY, .9);
  intWallU(intUpper, 5.0, .2, 4.4, UY, 0);
  intWallU(intUpper, 8.6, .2, 7.0, UY, 1.0);
  intWallV(intUpper, 4.2, 8.6, 12.8, UY, .9);
  intWallV(intUpper, 7.0, 8.6, 12.8, UY, .9);
  intWallU(intUpper, 5.4, 8.6, 18.3, UY, 1.0);
  intWallV(intUpper, 8.6, .8, 5.4, UY, 1.1);
  intWallV(intUpper, 13.4, .8, 5.4, UY, 1.1);
  intWallV(intUpper, 14.9, 5.4, 12.8, UY, 1.3);
  intWallU(intUpper, 8.2, 14.9, 18.3, UY, .8);
  intWallU(intUpper, 11.0, 14.9, 18.3, UY, 0);
  intWallV(intUpper, 9.0, 8.6, 12.8, UY, 1.0);
  intWallV(intUpper, 6.4, 13.0, 19.0, UY, 1.0);
  intWallU(intUpper, 15.4, 6.4, 9.1, UY, .8);
  // furniture
  furnish(intUpper, 'bed', 3.0, 16.0, 0, UY, { master: true });
  furnish(intUpper, 'wr', 6.8, 17.8, 0, UY, { len: 2.6 });
  furnish(intUpper, 'vanity', 9.6, 17.7, 0, UY); furnish(intUpper, 'bath', 9.6, 15.6, 0, UY); furnish(intUpper, 'shower', 10.4, 16.6, 90, UY);
  furnish(intUpper, 'bed', 2.9, 2.4, 180, UY);
  furnish(intUpper, 'bed', 10.7, 2.2, 180, UY);
  furnish(intUpper, 'bed', 16.3, 4.4, -90, UY);
  furnish(intUpper, 'sofa', 3.0, 11.0, 90, UY); furnish(intUpper, 'tv', 4.9, 11.0, -90, UY);
  furnish(intUpper, 'desk', 10.7, 12.0, 0, UY);
  furnish(intUpper, 'vanity', 9.8, 5.0, 180, UY); furnish(intUpper, 'shower', 11.6, 6.3, 0, UY);
  furnish(intUpper, 'wc', 11.6, 4.8, 0, UY);
  furnish(intUpper, 'vanity', 13.8, 7.6, -90, UY); furnish(intUpper, 'shower', 14.6, 8.5, 180, UY);
}

// ============================================================
// init / lights / camera / controls
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  const skyTex = canvasTex(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#79a6d2'); gr.addColorStop(.55, '#aac7e0'); gr.addColorStop(.78, '#d9e2e6'); gr.addColorStop(1, '#e8e4da');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xc3d2dc, 90, 220);

  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 500);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c3d'), antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  hemi = new THREE.HemisphereLight(0xcfe2ff, 0x6e6a58, .6); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sr = 46; Object.assign(sun.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 1, far: 160 });
  sun.shadow.bias = -.00035;
  scene.add(sun);
  setSun(10.5);  // 10:30 am default
  scene.add(new THREE.AmbientLight(0xffffff, .12));

  makeTextures(); makeMaterials();
  buildSiteCtx(); buildLot(); buildExterior(); buildInteriorGround(); buildInteriorUpper();
  gndG = intGround; upGI = intUpper;
  scene.add(siteCtxG, lotG, extG, roofG, intGround, intUpper);
  applyView(); updateCam();
  document.getElementById('loading').style.opacity = '0';
  animate();
}
let upGI;

// winter-sun path for Melbourne (-37.86°): azimuth E→N→W, low elevation; slider hour 7..19
function setSun(hour) {
  const t = (hour - 7) / 12;                       // 0..1
  const az = (90 - t * 180) * Math.PI / 180;       // E → N → W (southern hemisphere: sun tracks through NORTH)
  const el = Math.sin(t * Math.PI) * 48 * Math.PI / 180 + .06;
  const R = 90;
  sun.position.set(R * Math.sin(az) * Math.cos(el), R * Math.sin(el), -R * Math.cos(az) * Math.cos(el));
  sun.intensity = .6 + Math.sin(t * Math.PI) * 1.5;
  const warm = Math.pow(Math.abs(t - .5) * 2, 2);
  sun.color.setHSL(.09 - warm * .045, .55 + warm * .3, .82 - warm * .12);
  hemi.intensity = .35 + Math.sin(t * Math.PI) * .3;
}

function applyView() {
  const ext = view === 'exterior' || view === 'site';
  extG.visible = ext; roofG.visible = ext && roofOn;
  if (intGround) intGround.visible = view === 'ground';
  if (intUpper) intUpper.visible = view === 'upper' ;
  siteCtxG.visible = true;
  if (view === 'ground') { extG.visible = false; }
  if (view === 'upper') { extG.visible = false; }
}
function updateCam() {
  camera.position.set(
    tgt.x + dist * Math.sin(rotY) * Math.cos(rotX),
    tgt.y + dist * Math.sin(rotX),
    tgt.z + dist * Math.cos(rotY) * Math.cos(rotX));
  camera.lookAt(tgt.x, tgt.y, tgt.z);
}
function setView(v) {
  view = v;
  if (v === 'exterior') { dist = 50; rotX = .33; rotY = -.65; tgt = { x: 0, y: 2.4, z: 0 }; }
  if (v === 'site') { dist = 86; rotX = .85; rotY = .45; tgt = { x: 0, y: 0, z: -4 }; }
  if (v === 'ground') { dist = 42; rotX = 1.08; rotY = -.35; tgt = { x: 1, y: 0, z: -3.5 }; }
  if (v === 'upper') { dist = 42; rotX = 1.08; rotY = -.35; tgt = { x: 1, y: UY, z: -3.5 }; }
  applyView(); updateCam();
}

function bindControls() {
  const el = renderer.domElement;
  let drag = false, px = 0, py = 0;
  el.addEventListener('mousedown', e => { drag = true; px = e.clientX; py = e.clientY; });
  addEventListener('mouseup', () => drag = false);
  addEventListener('mousemove', e => {
    if (!drag) return;
    rotY -= (e.clientX - px) * .008; rotX += (e.clientY - py) * .008;
    rotX = Math.max(.06, Math.min(1.45, rotX)); px = e.clientX; py = e.clientY; updateCam();
  });
  el.addEventListener('wheel', e => { e.preventDefault(); dist += e.deltaY * .03; dist = Math.max(12, Math.min(130, dist)); updateCam(); }, { passive: false });
  let td = 0;
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { drag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; }
    else if (e.touches.length === 2) td = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && drag) {
      rotY -= (e.touches[0].clientX - px) * .008; rotX += (e.touches[0].clientY - py) * .008;
      rotX = Math.max(.06, Math.min(1.45, rotX)); px = e.touches[0].clientX; py = e.touches[0].clientY; updateCam();
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      dist += (td - d) * .07; dist = Math.max(12, Math.min(130, dist)); td = d; updateCam();
    }
  }, { passive: false });
  el.addEventListener('touchend', () => drag = false);

  document.querySelectorAll('[data-view3d]').forEach(b => b.addEventListener('click', function () {
    document.querySelectorAll('[data-view3d]').forEach(x => x.classList.remove('active'));
    this.classList.add('active'); setView(this.dataset.view3d);
  }));
  document.getElementById('roofBtn').addEventListener('click', function () {
    roofOn = !roofOn; this.textContent = roofOn ? 'Hide roof' : 'Show roof'; applyView();
  });
  document.getElementById('rotBtn').addEventListener('click', function () {
    autoRot = !autoRot; this.classList.toggle('active', autoRot);
  });
  document.getElementById('sunSlider').addEventListener('input', function () {
    setSun(parseFloat(this.value));
    document.getElementById('sunLabel').textContent = `${String(Math.floor(this.value)).padStart(2, '0')}:${this.value % 1 ? '30' : '00'}`;
  });
}
function animate() {
  requestAnimationFrame(animate);
  if (autoRot) { rotY += .002; updateCam(); }
  renderer.render(scene, camera);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
