// ============================================================
// 3D v3 — real cadastral site, surveyed neighbour buildings,
// corner-lot dwelling, on-demand rendering.
// House frame: u 0(east)→19(west), v 0(front/south)→16+(rear)
// World: x = site east, z = −site north.
// ============================================================
let scene, camera, renderer, sun, hemi, composer, fxaaPass, ssaoPass;
let extG, roofG, siteCtxG, lotG, intGround, intUpper;
let view = 'exterior', autoRot = false, roofOn = true;
let rotY = -0.7, rotX = 0.27, dist = 46, tgt = { x: 0, y: 2.8, z: -2 };
let needsRender = true, heroVisible = true;
const invalidate = () => { needsRender = true; };
const reshadow = () => { renderer.shadowMap.needsUpdate = true; needsRender = true; };

const S2W = p => [p[0], -p[1]];
const HF = HOUSE_FRAME;
function hw(u, v) { const s = houseToSite(u, v); return [s[0], -s[1]]; }
const ROT = -11.7 * Math.PI / 180;   // house grid rotation in world

// ---------- procedural textures ----------
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  return t;
}
// Derive a tangent-space normal map from a colour texture's luminance (Sobel height field).
function normalTex(colorTex, strength) {
  const srcC = colorTex.image, w = srcC.width, h = srcC.height;
  const src = srcC.getContext('2d').getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const octx = out.getContext('2d'), dst = octx.createImageData(w, h);
  const L = (x, y) => { x = (x + w) % w; y = (y + h) % h; const i = (y * w + x) * 4; return (src[i] * .299 + src[i + 1] * .587 + src[i + 2] * .114) / 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x - 1, y) - L(x + 1, y)) * strength;
    const dy = (L(x, y - 1) - L(x, y + 1)) * strength;
    const len = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    dst.data[i] = (dx / len * .5 + .5) * 255;
    dst.data[i + 1] = (dy / len * .5 + .5) * 255;
    dst.data[i + 2] = (1 / len * .5 + .5) * 255;
    dst.data[i + 3] = 255;
  }
  octx.putImageData(dst, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.copy(colorTex.repeat); t.anisotropy = 8;
  return t;
}
const TEX = {};
function makeTextures() {
  TEX.brick = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6f655a'; g.fillRect(0, 0, w, h);     // recessed mortar (dark)
    const bw = 84, bh = 32;
    for (let y = 0, r = 0; y < h; y += bh, r++) for (let x = -bw; x < w + bw; x += bw) {
      const ox = (r % 2) * bw / 2;
      const base = 120 + Math.floor(Math.random() * 36);
      // brick face with a soft inner gradient so it reads slightly proud of the mortar
      const bx = x + ox + 3, by = y + 3, bwi = bw - 6, bhi = bh - 6;
      const grd = g.createLinearGradient(bx, by, bx, by + bhi);
      grd.addColorStop(0, `rgb(${base + 8},${base - 2},${base - 14})`);
      grd.addColorStop(1, `rgb(${base - 10},${base - 19},${base - 30})`);
      g.fillStyle = grd; g.fillRect(bx, by, bwi, bhi);
      // subtle clinker speckle on the face
      for (let s = 0; s < 18; s++) {
        const t = base + (Math.random() - .5) * 40;
        g.fillStyle = `rgba(${t},${t - 9},${t - 20},.5)`;
        g.fillRect(bx + Math.random() * bwi, by + Math.random() * bhi, 2, 2);
      }
    }
  }, 3.0, 1.5);
  TEX.render = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ece6da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(${190 + Math.random() * 40},${186 + Math.random() * 38},${172 + Math.random() * 36},.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    }
  }, 4, 4);
  TEX.roof = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#41454c'; g.fillRect(0, 0, w, h);
    const th = 44;                                       // concrete-tile course height
    for (let y = 0, r = 0; y < h; y += th, r++) {
      // each tile course: shaded body + a raised leading lip + deep shadow gap below
      const grd = g.createLinearGradient(0, y, 0, y + th);
      grd.addColorStop(0, '#4b4f57'); grd.addColorStop(.82, '#3a3d44'); grd.addColorStop(1, '#2a2c31');
      g.fillStyle = grd; g.fillRect(0, y, w, th);
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, y + 2, w, 3);   // lip highlight
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, y + th - 4, w, 4);     // shadow gap
      // vertical tile joints, offset each course
      for (let x = 0; x < w; x += 64) {
        g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(x + (r % 2 ? 32 : 0), y + 4, 3, th - 7);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x + (r % 2 ? 35 : 3), y + 4, 1, th - 7);
      }
    }
  }, 5, 5);
  // soft large-scale tonal blobs so a tiled lawn doesn't read as one flat colour
  const grassPatches = (g, w, h, tones) => {
    for (let i = 0; i < 26; i++) {
      const cx = Math.random() * w, cy = Math.random() * h, r = 30 + Math.random() * 90;
      const t = tones[Math.floor(Math.random() * tones.length)];
      const bl = g.createRadialGradient(cx, cy, 2, cx, cy, r);
      bl.addColorStop(0, t); bl.addColorStop(1, t.replace(/[\d.]+\)$/, '0)'));
      g.fillStyle = bl; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    }
  };
  TEX.grass = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5d8748'; g.fillRect(0, 0, w, h);
    grassPatches(g, w, h, ['rgba(74,108,56,.5)', 'rgba(96,140,66,.45)', 'rgba(120,128,72,.30)', 'rgba(58,92,46,.5)']);
    for (let i = 0; i < 14000; i++) {
      const v = Math.random();
      g.fillStyle = `rgba(${60 + v * 50},${112 + v * 52},${48 + v * 36},.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 2.6);
    }
  }, 7, 7);
  TEX.lawn = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#679251'; g.fillRect(0, 0, w, h);
    // alternating mow stripes (lighter / darker bands)
    for (let x = 0; x < w; x += 96) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 48, h); g.fillStyle = 'rgba(0,0,0,.045)'; g.fillRect(x + 48, 0, 48, h); }
    grassPatches(g, w, h, ['rgba(86,132,62,.45)', 'rgba(110,150,74,.4)', 'rgba(132,138,82,.26)', 'rgba(70,108,54,.45)']);
    for (let i = 0; i < 14000; i++) {
      const v = Math.random();
      g.fillStyle = `rgba(${68 + v * 52},${126 + v * 52},${54 + v * 36},.45)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 2.8);
    }
  }, 3, 3);
  TEX.asphalt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4200; i++) {
      const v = 48 + Math.random() * 36;
      g.fillStyle = `rgba(${v},${v},${v + 4},.6)`; g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
  }, 6, 6);
  TEX.agg = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9b948a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const v = 110 + Math.random() * 80;
      g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, .9 + Math.random() * 1.4, 0, 7); g.fill();
    }
    // control joints
    g.strokeStyle = 'rgba(60,55,48,.55)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  }, 3, 3);
  TEX.cloud = canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const cx = 40 + Math.random() * (w - 80), cy = 36 + Math.random() * (h - 70), r = 22 + Math.random() * 30;
      const gr = g.createRadialGradient(cx, cy, 2, cx, cy, r);
      gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    }
  }, 1, 1);
  TEX.paver = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8e887e'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      const v = 128 + Math.random() * 26;
      g.fillStyle = `rgb(${v},${v - 5},${v - 14})`; g.fillRect(x + 2, y + 2, 60, 60);
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
  TEX.num13 = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1a1d24'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#E2A07A'; g.font = '700 78px IBM Plex Mono, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('13', w / 2, h / 2 + 4);
  }, 1, 1);
  TEX.pebble = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a847a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 120 + Math.random() * 90, r = 2 + Math.random() * 3.5;
      g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1.2, 0, 7); g.fill();
    }
  }, 2, 2);
  TEX.conc = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b6b1a7'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      const v = 160 + Math.random() * 40;
      g.fillStyle = `rgba(${v},${v - 4},${v - 10},.45)`; g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
  }, 4, 4);
}

let MAT = {};
function makeMaterials() {
  const M = (o) => new THREE.MeshStandardMaterial(o);
  MAT = {
    brick: M({ map: TEX.brick, roughness: .94 }),
    render: M({ map: TEX.render, roughness: .82 }),
    renderDark: M({ color: 0x4b4f55, roughness: .8 }),
    roof: M({ map: TEX.roof, roughness: .85, side: THREE.DoubleSide }),
    fascia: M({ color: 0x2e3136, roughness: .55 }),
    glass: M({ color: 0x33454e, roughness: .04, metalness: .92, transparent: true, opacity: .9, envMapIntensity: 2.1 }),
    frame: M({ color: 0x191b1e, roughness: .45, metalness: .3 }),
    door: M({ color: 0x4f3a28, roughness: .6 }),
    garage: M({ map: TEX.garage, roughness: .5, metalness: .35 }),
    grass: M({ map: TEX.grass, roughness: 1 }),
    lawn: M({ map: TEX.lawn, roughness: 1 }),
    asphalt: M({ map: TEX.asphalt, roughness: .96 }),
    agg: M({ map: TEX.agg, roughness: .92 }),
    paver: M({ map: TEX.paver, roughness: .9 }),
    pebble: M({ map: TEX.pebble, roughness: .95 }),
    conc: M({ map: TEX.conc, roughness: .92 }),
    fence: M({ map: TEX.fence, roughness: .95 }),
    nbr: M({ color: 0xbdb5a8, roughness: .95 }),
    nbr2: M({ color: 0xc9c2b4, roughness: .95 }),
    nbrRoof: M({ color: 0x4a463f, roughness: .9 }),
    nbrRoof2: M({ color: 0x5d5046, roughness: .9 }),
    kerb: M({ color: 0x8e8a82, roughness: .9 }),
    trunk: M({ color: 0x5d4530, roughness: .95 }),
    leaf: M({ color: 0x4d7a3a, roughness: 1 }),
    leaf2: M({ color: 0x5d8a44, roughness: 1 }),
    leaf3: M({ color: 0x37592a, roughness: 1 }),     // shadowed canopy underside
    solar: M({ color: 0x10141f, roughness: .25, metalness: .55 }),
    steel: M({ color: 0xc4c8cc, roughness: .3, metalness: .6 }),
    floorG: M({ color: 0xb6a583, roughness: .85 }),      // deeper engineered-oak (was washing out)
    floorTile: M({ color: 0xc1baa9, roughness: .6 }),    // warm grey tile
    carpet: M({ color: 0xa3957d, roughness: 1 }),        // deeper wool beige
    bath: M({ color: 0xa3bfc3, roughness: .7 }),         // deeper blue-grey
    intWall: M({ color: 0xddd4c3, roughness: .96 }),     // warm off-white (was stark)
    cab: M({ color: 0xece7dc, roughness: .55 }),
    stone: M({ color: 0x2c2d33, roughness: .3, metalness: .2 }),
    wood: M({ color: 0x9a7a52, roughness: .8 }),
    dwood: M({ color: 0x5e4733, roughness: .8 }),
    doona: M({ color: 0xf5f2ec, roughness: .92 }),
    sofa: M({ color: 0x66788a, roughness: .95 }),
    screen: M({ color: 0x0e1013, roughness: .3 }),
    white: M({ color: 0xf4f2ee, roughness: .5 }),
    carBody2: M({ color: 0xd9dde2, roughness: .35, metalness: .55 }),
    carGlass: M({ color: 0x141d24, roughness: .08, metalness: .6 }),
    tyre: M({ color: 0x14161a, roughness: .9 }),
  };
  // automotive 2-coat paint: metallic base + glossy clearcoat that mirrors the sky
  MAT.carPaint = new THREE.MeshPhysicalMaterial({
    color: 0xbcc6d0, metalness: .65, roughness: .42,
    clearcoat: 1.0, clearcoatRoughness: .06,
  });
  // proper tangent-space normal maps (real surface relief, not a flat box)
  const NV = (s) => new THREE.Vector2(s, s);
  const nm = (mat, tex, str, scale) => { mat.normalMap = normalTex(tex, str); mat.normalScale = NV(scale); };
  nm(MAT.brick, TEX.brick, 14, .85);     // deep mortar joints
  nm(MAT.roof, TEX.roof, 12, 1.0);       // tile steps
  nm(MAT.render, TEX.render, 4, .25);    // fine acrylic-render tooth
  nm(MAT.agg, TEX.agg, 8, .55);          // exposed-aggregate pebbles
  nm(MAT.paver, TEX.paver, 9, .6);       // paver joints
  nm(MAT.fence, TEX.fence, 8, .5);       // paling gaps
  nm(MAT.grass, TEX.grass, 6, .5);
  nm(MAT.lawn, TEX.lawn, 6, .5);
  nm(MAT.conc, TEX.conc, 4, .25);
  // keep IBL subtle on matte surfaces so sun/shadow contrast survives;
  // strong only on glass and metals (default envMapIntensity is 1.0 — set explicitly)
  for (const k in MAT) {
    if (k === 'glass') continue;
    MAT[k].envMapIntensity = (MAT[k].metalness && MAT[k].metalness > .4) ? .85 : .3;
  }
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
// horizontal slab from world [x,z] pts, top at y+thick
function flatPoly(g, pts, y, thick, mat, texScale) {
  const geo = new THREE.ExtrudeGeometry(shapeFromPts(pts), { depth: thick, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  if (texScale) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * texScale, uv.getY(i) * texScale);
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y + thick; m.receiveShadow = true; g.add(m); return m;
}

// wall with openings
function panel(g, x0, x1, y0, y1, T, mat) {
  const w = x1 - x0, h = y1 - y0;
  if (w <= .004 || h <= .004) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, T), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
  m.castShadow = true; m.receiveShadow = true; g.add(m);
}
// Window with a recessed reveal: light rendered lining around the opening
// (direction-agnostic — full wall depth), a slim aluminium frame, glazing bars,
// and a projecting sill. The centred glass sits ~T/2 behind each face so the
// opening reads as a real deep reveal instead of a flat sticker.
function glazing(g, x0, x1, y0, y1, T, sillOut) {
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const box = (bw, bh, bd, x, y, z, m, cast) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    e.position.set(x, y, z); e.castShadow = cast !== false; e.receiveShadow = true; g.add(e); return e;
  };
  const lin = .055;                                   // reveal lining thickness
  box(w, lin, T * .94, cx, y1 - lin / 2, 0, MAT.render, false);        // head reveal
  box(w, lin, T * .94, cx, y0 + lin / 2, 0, MAT.render, false);        // sill reveal
  box(lin, h - lin * 2, T * .94, x0 + lin / 2, cy, 0, MAT.render, false); // left jamb
  box(lin, h - lin * 2, T * .94, x1 - lin / 2, cy, 0, MAT.render, false); // right jamb
  // centred (recessed) glass
  box(w - lin * 2 - .02, h - lin * 2 - .02, T * .16, cx, cy, 0, MAT.glass, false);
  // slim dark frame on the glass plane
  const f = .05;
  box(w - lin * 2, f, T * .34, cx, y1 - lin - f / 2, 0, MAT.frame, false);
  box(w - lin * 2, f, T * .34, cx, y0 + lin + f / 2, 0, MAT.frame, false);
  box(f, h - lin * 2, T * .34, x0 + lin + f / 2, cy, 0, MAT.frame, false);
  box(f, h - lin * 2, T * .34, x1 - lin - f / 2, cy, 0, MAT.frame, false);
  // glazing bars on larger windows
  if (w > 1.5) box(f * .8, h - lin * 2, T * .3, cx, cy, 0, MAT.frame, false);
  if (h > 1.5) box(w - lin * 2, f * .8, T * .3, cx, cy, 0, MAT.frame, false);
  // projecting render sill
  if (sillOut) box(w + .14, .07, T * 1.4, cx, y0 - .035, 0, MAT.render);
}
function wallRun(group, a, b, H, T, mat, openings, yBase = 0) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = new THREE.Group();
  const spans = (openings || []).map(o => ({ x0: o.at - o.w / 2, x1: o.at + o.w / 2, o })).sort((p, q) => p.x0 - q.x0);
  let prev = 0;
  for (const s of spans) {
    if (s.x0 > prev + .004) panel(g, prev, s.x0, 0, H, T, mat);
    const t = s.o.type || 'window';
    const sill = t === 'window' ? (s.o.sill ?? .9) : 0;
    const head = Math.min(H, s.o.head ?? (t === 'garage' ? 2.45 : 2.18));
    if (sill > .004) panel(g, s.x0, s.x1, 0, sill, T, mat);
    if (head < H - .004) panel(g, s.x0, s.x1, head, H, T, mat);
    if (t === 'window') glazing(g, s.x0, s.x1, sill, head, T, true);
    if (t === 'door') { const d = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0 - .08, head - .06, T * .5), s.o.glass ? MAT.glass : MAT.door); d.position.set((s.x0 + s.x1) / 2, head / 2, 0); d.castShadow = true; g.add(d); }
    if (t === 'stacker') glazing(g, s.x0, s.x1, .04, head, T, false);
    if (t === 'garage') {
      const gw = s.x1 - s.x0 - .12, gh = head - .08, gcx = (s.x0 + s.x1) / 2, rows = 5, rh = gh / rows;
      const d = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, T * .42), MAT.garage);
      d.position.set(gcx, gh / 2 + .04, 0); d.castShadow = true; g.add(d);
      for (let i = 1; i < rows; i++) {                                   // recessed section grooves
        const gr = new THREE.Mesh(new THREE.BoxGeometry(gw, .03, T * .5), MAT.fascia);
        gr.position.set(gcx, .04 + i * rh, T * .03); g.add(gr);
      }
      for (let i = 0; i < rows - 1; i++) {                               // raised panel ribs
        const rib = new THREE.Mesh(new THREE.BoxGeometry(gw * .9, rh * .5, T * .05), MAT.garage);
        rib.position.set(gcx, .04 + i * rh + rh / 2, T * .22); g.add(rib);
      }
      for (let k = 0; k < 4; k++) {                                      // top row of lites
        const win = new THREE.Mesh(new THREE.BoxGeometry(gw / 5.5, rh * .5, T * .22), MAT.glass);
        win.position.set(gcx - gw * .3 + k * gw * .2, .04 + (rows - .5) * rh, T * .12); g.add(win);
      }
    }
    prev = s.x1;
  }
  if (prev < len - .004) panel(g, prev, len, 0, H, T, mat);
  g.position.set(a[0], yBase, a[1]);
  g.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  group.add(g); return g;
}

// hip roof over house-coord rectangle
function hipRoof(g, u0, v0, u1, v1, yEave, pitchDeg, eave, opts = {}) {
  const p00 = hw(u0 - eave, v0 - eave), p10 = hw(u1 + eave, v0 - eave),
        p11 = hw(u1 + eave, v1 + eave), p01 = hw(u0 - eave, v1 + eave);
  const W = Math.abs(u1 - u0) + 2 * eave, D = Math.abs(v1 - v0) + 2 * eave;
  const rise = Math.tan(pitchDeg * Math.PI / 180) * (Math.min(W, D) / 2);
  const yR = yEave + rise;
  let r1, r2;
  if (D >= W) { const m = W / 2; r1 = hw((u0 + u1) / 2, v0 - eave + m); r2 = hw((u0 + u1) / 2, v1 + eave - m); }
  else { const m = D / 2; r1 = hw(u0 - eave + m, (v0 + v1) / 2); r2 = hw(u1 + eave - m, (v0 + v1) / 2); }
  const V = [];
  const quad = (A, Bp, R2, R1) => { V.push(A[0], yEave, A[1], Bp[0], yEave, Bp[1], R2[0], yR, R2[1], A[0], yEave, A[1], R2[0], yR, R2[1], R1[0], yR, R1[1]); };
  quad(p00, p10, r1, r1); quad(p10, p11, r2, r1); quad(p11, p01, r2, r2); quad(p01, p00, r1, r2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(V, 3));
  geo.computeVertexNormals();
  const pos = geo.attributes.position, uv = [];
  for (let i = 0; i < pos.count; i++) uv.push(pos.getX(i) * .28, pos.getZ(i) * .28);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const roof = new THREE.Mesh(geo, MAT.roof);
  roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  // ridge capping
  const rl = Math.hypot(r2[0] - r1[0], r2[1] - r1[1]);
  if (rl > .3) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(rl + .25, .12, .22), MAT.fascia);
    cap.position.set((r1[0] + r2[0]) / 2, yR + .04, (r1[1] + r2[1]) / 2);
    cap.rotation.y = -Math.atan2(r2[1] - r1[1], r2[0] - r1[0]);
    cap.castShadow = true; g.add(cap);
  }
  // fascia + gutter
  for (const [A, Bp] of [[p00, p10], [p10, p11], [p11, p01], [p01, p00]]) {
    const len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
    const f = new THREE.Mesh(new THREE.BoxGeometry(len, .24, .13), MAT.fascia);
    f.position.set((A[0] + Bp[0]) / 2, yEave - .02, (A[1] + Bp[1]) / 2);
    f.rotation.y = -Math.atan2(Bp[1] - A[1], Bp[0] - A[0]);
    f.castShadow = true; g.add(f);
  }
  if (!opts.noSoffit) {
    const sg = new THREE.ExtrudeGeometry(shapeFromPts([p00, p10, p11, p01]), { depth: .05, bevelEnabled: false });
    sg.rotateX(Math.PI / 2);
    const sm = new THREE.Mesh(sg, MAT.render); sm.position.y = yEave - .06; g.add(sm);
  }
  return { yR, r1, r2 };
}

// ============================================================
// street context — real surveyed buildings
// ============================================================
function nbrBuilding(g, b, idx) {
  const pts = b.ring.slice(0, -1).map(p => [p[0], -p[1]]);
  const c = [b.c[0], -b.c[1]];
  const h = b.type === 'garage' ? 2.55 : 2.9;
  flatPoly(g, pts, 0, h, idx % 2 ? MAT.nbr : MAT.nbr2, .1).castShadow = true;
  // hipped roof: outer eave ring (6% overhang) → inner ring at +rise
  const outer = pts.map(p => [c[0] + (p[0] - c[0]) * 1.07, c[1] + (p[1] - c[1]) * 1.07]);
  const inner = pts.map(p => [c[0] + (p[0] - c[0]) * 0.42, c[1] + (p[1] - c[1]) * 0.42]);
  const rise = b.type === 'garage' ? 0.9 : 1.85;
  const V = [];
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    V.push(outer[i][0], h, outer[i][1], outer[j][0], h, outer[j][1], inner[j][0], h + rise, inner[j][1]);
    V.push(outer[i][0], h, outer[i][1], inner[j][0], h + rise, inner[j][1], inner[i][0], h + rise, inner[i][1]);
  }
  for (let i = 1; i < inner.length - 1; i++) {
    V.push(inner[0][0], h + rise, inner[0][1], inner[i][0], h + rise, inner[i][1], inner[i + 1][0], h + rise, inner[i + 1][1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(V, 3));
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, idx % 3 ? MAT.nbrRoof : MAT.nbrRoof2);
  roof.material.side = THREE.DoubleSide;
  roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
}

function roadRibbon(g, pts, width, mat, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = S2W(pts[i]), b = S2W(pts[i + 1]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(len + width * .14, .05, width), mat);
    seg.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    seg.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    seg.receiveShadow = true; seg.castShadow = false; g.add(seg);
  }
}

function buildSiteCtx() {
  siteCtxG = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CircleGeometry(130, 48), MAT.grass);
  base.rotation.x = -Math.PI / 2; base.position.y = -.07; base.receiveShadow = true;
  siteCtxG.add(base);
  for (const r of SITE.roads) {
    if (r.pts.length < 2) continue;
    roadRibbon(siteCtxG, r.pts, 6.6, MAT.asphalt, -.012);
    // kerbs
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = S2W(r.pts[i]), b = S2W(r.pts[i + 1]);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ry = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (const s of [3.45, -3.45]) {
        const k = new THREE.Mesh(new THREE.BoxGeometry(len + .45, .13, .3), MAT.kerb);
        k.position.set((a[0] + b[0]) / 2, .005, (a[1] + b[1]) / 2);
        k.rotation.y = ry; k.translateZ(s); k.castShadow = false; siteCtxG.add(k);
      }
    }
    // concrete footpath offset 4.6 m each side
    roadRibbon(siteCtxG, r.pts.map(p => p), 1.4, MAT.conc, -.008);
  }
  // court bowl (turning head) at the dead end of Pimpala
  const bowl = S2W(SITE.meta.bowl);
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, .05, 36), MAT.asphalt);
  bd.position.set(bowl[0], -.012, bowl[1]); bd.receiveShadow = true; siteCtxG.add(bd);
  const bk = new THREE.Mesh(new THREE.TorusGeometry(7.65, .14, 6, 36), MAT.kerb);
  bk.rotation.x = Math.PI / 2; bk.position.set(bowl[0], .01, bowl[1]); siteCtxG.add(bk);

  for (const n of SITE.neighbours) {
    flatPoly(siteCtxG, n.ring.slice(0, -1).map(p => [p[0], -p[1]]), -.055, .045, MAT.grass, .12);
  }
  SITE.buildings.forEach((b, i) => nbrBuilding(siteCtxG, b, i));

  // street trees on verges (context outside the lot)
  [[-19.5, -20], [-21, 14], [-18, 40], [12, -23.5], [38, -20], [-17, 64], [30, 28], [-37, 30], [40, 50]]
    .forEach((t, i) => tree(siteCtxG, ...S2W(t), .9 + (i % 3) * .25));

  // clouds — billboard sprites high above the suburb
  const cloudMat = new THREE.SpriteMaterial({ map: TEX.cloud, transparent: true, opacity: .8, depthWrite: false });
  [[-60, 70, -90, 46], [40, 86, -120, 60], [110, 76, -40, 52], [-120, 92, 30, 64], [70, 82, 90, 56], [-30, 78, 110, 48]]
    .forEach(([x, y, z, s]) => {
      const c = new THREE.Sprite(cloudMat);
      c.position.set(x, y, z); c.scale.set(s, s * .42, 1);
      siteCtxG.add(c);
    });
}
function tree(g, x, z, s) {
  const o = new THREE.Group();
  // tapered trunk with a slight natural lean
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.09 * s, .21 * s, 2.0 * s, 8), MAT.trunk);
  tr.position.y = 1.0 * s; tr.rotation.z = (Math.random() - .5) * .09; tr.castShadow = true; o.add(tr);
  // a few branch stubs reaching into the canopy
  for (let b = 0; b < 3; b++) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(.04 * s, .07 * s, .9 * s, 6), MAT.trunk);
    const a = b * 2.1 + Math.random();
    br.position.set(Math.cos(a) * .25 * s, (1.7 + b * .2) * s, Math.sin(a) * .25 * s);
    br.rotation.set(Math.cos(a) * .7, 0, -Math.sin(a) * .7); br.castShadow = true; o.add(br);
  }
  // layered organic canopy from overlapping foliage clumps, varied tone & size
  const cy = 2.3 * s, R = 1.05 * s;
  for (let i = 0; i < 11; i++) {
    const ang = Math.random() * 6.28, rad = Math.random() * R * .72;
    const size = (.4 + Math.random() * .42) * s;
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), [MAT.leaf, MAT.leaf2, MAT.leaf3][i % 3]);
    lf.position.set(Math.cos(ang) * rad, cy + (Math.random() - .35) * R * .95, Math.sin(ang) * rad);
    lf.scale.set(1, .88, 1); lf.rotation.y = Math.random() * 3;
    lf.castShadow = true; lf.receiveShadow = true; o.add(lf);
  }
  o.position.set(x, 0, z); g.add(o);
}

// ============================================================
// our lot — lawn, fences, Pimpala driveway, terrace (no pool, no beds)
// ============================================================
function buildLot() {
  lotG = new THREE.Group();
  flatPoly(lotG, SITE.lot.slice(0, -1).map(p => [p[0], -p[1]]), -.045, .065, MAT.lawn, .25);
  // fences: east [0,1], rear [7,8] — palings + capping rail + posts
  for (const [i, j] of [[0, 1], [7, 8]]) {
    const a = S2W(SITE.lot[i]), b = S2W(SITE.lot[j]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ry = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    const f = new THREE.Mesh(new THREE.BoxGeometry(len, 1.95, .07), MAT.fence);
    f.position.set((a[0] + b[0]) / 2, .975, (a[1] + b[1]) / 2);
    f.rotation.y = ry; f.castShadow = true; f.receiveShadow = true; lotG.add(f);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len, .07, .12), MAT.dwood);
    cap.position.set((a[0] + b[0]) / 2, 1.96, (a[1] + b[1]) / 2); cap.rotation.y = ry; lotG.add(cap);
    const nPosts = Math.round(len / 2.4);
    for (let k = 0; k <= nPosts; k++) {
      const t = k / nPosts;
      const post = new THREE.Mesh(new THREE.BoxGeometry(.11, 1.9, .11), MAT.dwood);
      post.position.set(a[0] + (b[0] - a[0]) * t, .95, a[1] + (b[1] - a[1]) * t);
      post.rotation.y = ry; post.castShadow = true; lotG.add(post);
    }
  }
  // side fence along Pimpala behind the driveway (privacy to side street, ≤2 m allowed behind frontage line)
  const a = S2W(SITE.lot[6]), b = S2W(SITE.lot[7]);
  const fl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const seg = .42; // upper 58% of the west boundary fenced; driveway opening at lower part
  const fa = [a[0] + (b[0] - a[0]) * seg, a[1] + (b[1] - a[1]) * seg];
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(fl * (1 - seg), 1.8, .07), MAT.fence);
  f2.position.set((fa[0] + b[0]) / 2, .9, (fa[1] + b[1]) / 2);
  f2.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  f2.castShadow = true; lotG.add(f2);

  // driveway: Pimpala crossover sweeping to the south-facing garage door
  flatPoly(lotG, [[22.6, 3.4], [22.6, 7.4], [18.6, 7.0], [15.4, 5.2], [14.2, 2.5], [13.6, -1.6], [18.2, -1.6], [18.6, 2.5]].map(p => hw(...p)), 0, .055, MAT.agg, .4);
  // crossover apron over the verge
  flatPoly(lotG, [[22.6, 3.0], [22.6, 7.8], [25.6, 8.2], [25.6, 2.6]].map(p => hw(...p)), -.01, .05, MAT.conc, .4);
  // path to porch from driveway
  flatPoly(lotG, [[13.6, -.2], [13.6, -1.6], [7.0, -2.6], [7.0, -.9]].map(p => hw(...p)), 0, .045, MAT.conc, .5);
  // rear terrace in the north yard (unroofed pavers)
  flatPoly(lotG, [[1.6, 16.75], [8.4, 16.75], [8.4, 19.0], [1.6, 19.0]].map(p => hw(...p)), 0, .05, MAT.paver, .45);
  // letterbox at the splay corner
  const lb = new THREE.Group();
  B(lb, .34, .9, .34, 0, .45, 0, MAT.renderDark); B(lb, .4, .24, .4, 0, 1.0, 0, MAT.fascia);
  const lp = hw(21.4, .2); lb.position.set(lp[0], 0, lp[1]); lotG.add(lb);
  // clothesline rear
  const cl = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.6, 8), MAT.steel); pole.position.y = .8; cl.add(pole);
  B(cl, 2.1, .03, 1.3, 0, 1.55, 0, MAT.steel, false);
  const cp = hw(10.8, 17.5); cl.position.set(cp[0], 0, cp[1]); lotG.add(cl);

  // ---- low-maintenance pebble foundation strip (no garden beds) + clipped shrubs ----
  flatPoly(lotG, [[0, -.55], [12.4, -.55], [12.4, 0], [0, 0]].map(p => hw(...p)), 0, .04, MAT.pebble, .6);   // front strip
  flatPoly(lotG, [[-.55, 0], [0, 0], [0, 16.7], [-.55, 16.7]].map(p => hw(...p)), 0, .04, MAT.pebble, .6);   // east strip
  flatPoly(lotG, [[0, 16.7], [12.4, 16.7], [12.4, 17.0], [0, 17.0]].map(p => hw(...p)), 0, .04, MAT.pebble, .6); // rear strip
  // a few architectural clipped shrubs flanking the entry porch + along the front
  [[5.0, -0.9], [6.6, -0.9], [9.5, -0.35], [11.6, -0.35], [-0.3, 3.0], [-0.3, 9.0]].forEach(([u, v], i) => shrub(lotG, u, v, .35 + (i % 2) * .12));

  // ---- kerbside 3-bin set tucked beside the garage (lived-in scale prop) ----
  wheelieBin(lotG, 13.0, 0.4, 0xb23a2a, Math.PI);   // red lid — general waste
  wheelieBin(lotG, 13.6, 0.4, 0xddc24a, Math.PI);   // yellow lid — recycling
  wheelieBin(lotG, 14.2, 0.4, 0x5a9440, Math.PI);   // green lid — FOGO

  // ---- electric car parked on the driveway + EV charge pedestal ----
  evCar(lotG, 16.3, 0.4, MAT.carBlue || MAT.steel);
  // wall charger box near the garage door
  const wc = new THREE.Group();
  B(wc, .26, .42, .14, 0, 1.2, 0, MAT.white);
  const wcLed = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .02), new THREE.MeshStandardMaterial({ color: 0x6fc0e0, emissive: 0x2a7090, emissiveIntensity: .9 }));
  wcLed.position.set(0, 1.32, -.08); wc.add(wcLed);
  const wcp = hw(12.9, 1.7); wc.position.set(wcp[0], 0, wcp[1]); wc.rotation.y = ROT; lotG.add(wc);
  // charge cable (thin curved tube from charger to the car port)
  const cab = new THREE.Mesh(new THREE.TorusGeometry(.5, .025, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x111316, roughness: .7 }));
  const cabp = hw(14.2, 1.0); cab.position.set(cabp[0], .55, cabp[1]); cab.rotation.set(Math.PI / 2, ROT, 0); lotG.add(cab);
}

// a kerbside wheelie bin (Australian 3-bin system: general / recycling / FOGO)
const binBody = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: .72 });
function wheelieBin(g, u, v, lidHex, rot) {
  const o = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.48, .92, .56), binBody);
  body.position.y = .5; body.castShadow = true; body.receiveShadow = true; o.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(.51, .08, .6), new THREE.MeshStandardMaterial({ color: lidHex, roughness: .55 }));
  lid.position.set(0, .98, -.02); lid.rotation.x = -.06; lid.castShadow = true; o.add(lid);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.46, .05, .05), binBody);
  bar.position.set(0, .96, .3); o.add(bar);                       // front lift bar
  [-.18, .18].forEach(wx => {
    const wl = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .06, 10), MAT.fascia);
    wl.rotation.z = Math.PI / 2; wl.position.set(wx, .085, .24); o.add(wl);
  });
  const p = hw(u, v); o.position.set(p[0], 0, p[1]); o.rotation.y = (rot || 0) + ROT; g.add(o);
}

// a potted plant (container, not a garden bed) — tapered pot + soft foliage
function pottedPlant(g, u, v, s) {
  const o = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.2 * s, .15 * s, .42 * s, 14), MAT.renderDark);
  pot.position.y = .21 * s; pot.castShadow = true; pot.receiveShadow = true; o.add(pot);
  for (let i = 0; i < 5; i++) {
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry((.16 + Math.random() * .1) * s, 1), i % 2 ? MAT.leaf : MAT.leaf3);
    lf.position.set((Math.random() - .5) * .26 * s, (.5 + Math.random() * .35) * s, (Math.random() - .5) * .26 * s);
    lf.scale.y = 1.25; lf.castShadow = true; o.add(lf);
  }
  const p = hw(u, v); o.position.set(p[0], 0, p[1]); g.add(o);
}

// front-entry detailing: house number, sconce, doormat, flanking planters
function buildEntry() {
  // number plaque "13" on the wall beside the door
  const num = new THREE.Mesh(new THREE.PlaneGeometry(.32, .32), new THREE.MeshStandardMaterial({ map: TEX.num13, roughness: .6, side: THREE.DoubleSide }));
  const np = hw(7.32, 2.36); num.position.set(np[0], 1.75, np[1]); num.rotation.y = ROT; extG.add(num);
  // wall sconce by the door (small box + warm emissive face)
  const sc = new THREE.Group();
  B(sc, .12, .26, .1, 0, 0, 0, MAT.fascia);
  const glo = new THREE.Mesh(new THREE.BoxGeometry(.09, .2, .03), new THREE.MeshStandardMaterial({ color: 0xffe7b0, emissive: 0xffcaa0, emissiveIntensity: .9 }));
  glo.position.z = .06; sc.add(glo);
  const scp = hw(4.45, 2.31); sc.position.set(scp[0], 1.9, scp[1]); sc.rotation.y = ROT; extG.add(sc);
  // doormat at the threshold
  flatPoly(extG, [[5.0, 1.7], [6.6, 1.7], [6.6, 2.2], [5.0, 2.2]].map(p => hw(...p)), .14, .02, MAT.dwood, .3);
  // flanking potted plants
  pottedPlant(extG, 4.55, 1.85, 1.0);
  pottedPlant(extG, 7.05, 1.85, 1.0);
}

// a clipped architectural shrub (low maintenance, not a flower bed)
function shrub(g, u, v, s) {
  const o = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s * (1 - i * .12), 1), i % 2 ? MAT.leaf : MAT.leaf2);
    b.position.set((i - 1) * s * .35, s * .7 + i * s * .18, (i % 2 ? .12 : -.1) * s);
    b.scale.y = .82; b.castShadow = true; b.receiveShadow = true; o.add(b);
  }
  const p = hw(u, v); o.position.set(p[0], 0, p[1]); g.add(o);
}

// a sleeker electric car (rounded body, light colour, charge port)
function evCar(g, u, v, mat) {
  const o = new THREE.Group();
  B(o, 1.85, .42, 4.3, 0, .46, 0, MAT.carPaint);                  // lower body (clearcoat)
  B(o, 1.7, .5, 2.6, 0, .82, -.05, MAT.carPaint);                 // cabin
  B(o, 1.56, .42, 2.2, 0, .86, -.05, MAT.carGlass || MAT.screen); // glasshouse
  B(o, 1.7, .04, 4.0, 0, .04, 0, MAT.fascia, false);             // shadow skirt
  const wy = .33, wr = .33;
  [[-.83, 1.45], [.83, 1.45], [-.83, -1.45], [.83, -1.45]].forEach(([wx, wz]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, .22, 16), MAT.tyre || MAT.screen);
    t.rotation.z = Math.PI / 2; t.position.set(wx, wy, wz); t.castShadow = true; o.add(t);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .24, 12), MAT.steel);
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, wy, wz); o.add(hub);   // alloy hub
  });
  // charge port glow on the rear quarter
  const port = new THREE.Mesh(new THREE.BoxGeometry(.04, .12, .12), new THREE.MeshStandardMaterial({ color: 0x6fc0e0, emissive: 0x2a7090, emissiveIntensity: .7 }));
  port.position.set(.93, .55, 1.7); o.add(port);
  const p = hw(u, v); o.position.set(p[0], 0, p[1]); o.rotation.y = ROT;
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.add(o);
}

// ============================================================
// the dwelling (v3)
// ============================================================
const GH = 2.74, FT = .36, UH = 2.59, UY = GH + FT;

function buildExterior() {
  extG = new THREE.Group();
  // slabs
  flatPoly(extG, [hw(0, 0), hw(12.4, 0), hw(12.4, 16.7), hw(0, 16.7)], -.01, .15, MAT.conc, .3);
  flatPoly(extG, [hw(12.4, 2.5), hw(19, 2.5), hw(19, 16.5), hw(12.4, 16.5)], -.01, .15, MAT.conc, .3);

  // ---- EAST WING ground (brick) ----
  wallRun(extG, hw(0, 0), hw(4.2, 0), GH, .24, MAT.brick, [{ at: 2.1, w: 1.9, type: 'window', sill: .9 }]);
  wallRun(extG, hw(4.2, 2.3), hw(7.4, 2.3), GH, .24, MAT.brick, [{ at: 1.6, w: 1.5, type: 'door' }]);
  wallRun(extG, hw(4.2, 0), hw(4.2, 2.3), GH, .24, MAT.brick, []);
  wallRun(extG, hw(7.4, 0), hw(7.4, 2.3), GH, .24, MAT.brick, []);
  wallRun(extG, hw(7.4, 0), hw(12.4, 0), GH, .24, MAT.brick, [{ at: 2.5, w: 2.4, type: 'window', sill: .75 }]);
  wallRun(extG, hw(0, 0), hw(0, 16.7), GH, .24, MAT.brick, [
    { at: 2.1, w: 1.8, type: 'window' }, { at: 7.8, w: 1.8, type: 'window' }, { at: 14.0, w: 2.4, type: 'window', sill: .65 }]);
  wallRun(extG, hw(12.4, 16.7), hw(0, 16.7), GH, .24, MAT.brick, [
    { at: 8.4, w: 4.4, type: 'stacker', head: 2.4 }, { at: 1.9, w: 2.0, type: 'window', sill: 1.0 }]);
  wallRun(extG, hw(12.4, 0), hw(12.4, 2.5), GH, .24, MAT.brick, []);

  // ---- WEST WING ground ----
  wallRun(extG, hw(12.6, 2.5), hw(18.8, 2.5), GH, .24, MAT.brick, [{ at: 3.1, w: 5.0, type: 'garage', head: 2.4 }]);
  wallRun(extG, hw(19, 2.5), hw(19, 12.9), GH, .24, MAT.brick, [
    { at: 7.4, w: 1.2, type: 'window', sill: 1.4, head: 2.0 }, { at: 9.4, w: 1.0, type: 'door' }]);
  wallRun(extG, hw(19, 12.9), hw(12.4, 12.9), GH, .24, MAT.brick, [{ at: 3.3, w: 2.4, type: 'stacker', head: 2.3 }]);
  // alfresco posts under the upper-floor edge (open east + north)
  [[12.8, 16.2], [18.7, 16.2]].forEach(([u, v]) => {
    const p = hw(u, v);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.18, GH + .3, .18), MAT.fascia);
    post.position.set(p[0], (GH + .3) / 2, p[1]); post.castShadow = true; extG.add(post);
  });
  // alfresco west privacy wall (to Pimpala)
  wallRun(extG, hw(19, 12.9), hw(19, 16.5), GH, .24, MAT.brick, []);

  // ---- UPPER (render) — now spans the full west wing too (bed 6 + media) ----
  const upG = new THREE.Group();
  wallRun(upG, hw(0.8, 0), hw(12.4, 0), UH, .2, MAT.render, [
    { at: 2.2, w: 2.0, type: 'window', sill: .9 }, { at: 8.8, w: 2.0, type: 'window', sill: .9 }], UY);
  wallRun(upG, hw(0.8, 0), hw(0.8, 16.7), UH, .2, MAT.render, [
    { at: 2.2, w: 1.8, type: 'window' }, { at: 9.8, w: 1.8, type: 'window' }, { at: 14.4, w: 2.0, type: 'window', sill: .8 }], UY);
  wallRun(upG, hw(12.4, 16.7), hw(0.8, 16.7), UH, .2, MAT.render, [
    { at: 2.7, w: 2.2, type: 'window', sill: .8 }, { at: 7.2, w: 1.4, type: 'window', sill: 1.2, head: 2.0 }, { at: 10.6, w: 1.4, type: 'window' }], UY);
  wallRun(upG, hw(12.4, 15.9), hw(12.4, 16.7), UH, .2, MAT.render, [], UY);
  wallRun(upG, hw(12.4, 2.5), hw(19, 2.5), UH, .2, MAT.render, [{ at: 3.4, w: 2.2, type: 'window', sill: .9 }], UY);
  wallRun(upG, hw(19, 2.5), hw(19, 15.9), UH, .2, MAT.render, [
    { at: 3.3, w: 1.6, type: 'window' }, { at: 8.4, w: 2.0, type: 'window', sill: .9 }, { at: 12.0, w: 1.6, type: 'window' }], UY);
  wallRun(upG, hw(19, 15.9), hw(12.4, 15.9), UH, .2, MAT.render, [{ at: 3.3, w: 1.8, type: 'window', sill: .9 }], UY);
  // inter-storey band (the west band cantilevers 0.6 m over the alfresco edge)
  flatPoly(upG, [hw(.7, -.06), hw(12.5, -.06), hw(12.5, 16.8), hw(.7, 16.8)], UY - FT, FT, MAT.renderDark, .2);
  flatPoly(upG, [hw(12.3, 2.42), hw(19.1, 2.42), hw(19.1, 16.55), hw(12.3, 16.55)], UY - FT, FT, MAT.renderDark, .2);
  extG.add(upG);

  // porch canopy
  flatPoly(extG, [hw(4.0, -1.6), hw(7.6, -1.6), hw(7.6, 2.4), hw(4.0, 2.4)], GH + .12, .14, MAT.renderDark, .3);
  [[4.35, -1.25], [7.25, -1.25]].forEach(([u, v]) => {
    const p = hw(u, v);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.16, GH + .1, .16), MAT.fascia);
    post.position.set(p[0], (GH + .1) / 2, p[1]); post.castShadow = true; extG.add(post);
  });

  // detail: downpipes at corners
  [[0.15, .3], [0.15, 16.4], [12.25, .3], [18.85, 2.8], [18.85, 15.6]].forEach(([u, v]) => {
    const p = hw(u, v);
    const dp = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, GH, 8), MAT.fascia);
    dp.position.set(p[0], GH / 2, p[1]); extG.add(dp);
  });
  // AC condenser + meter box on the east wall
  const ac = new THREE.Group();
  B(ac, .9, .75, .38, 0, .45, 0, MAT.steel);
  const ap = hw(-0.35, 10.8); ac.position.set(ap[0], 0, ap[1]); ac.rotation.y = ROT; extG.add(ac);
  const mb = new THREE.Group();
  B(mb, .45, .6, .14, 0, 1.2, 0, MAT.white);
  const mp = hw(19.15, 4.2); mb.position.set(mp[0], 0, mp[1]); mb.rotation.y = ROT; extG.add(mb);

  // ---- roofs ----
  roofG = new THREE.Group();
  const main = hipRoof(roofG, 0.8, 0, 12.4, 16.7, UY + UH, 22.5, .5);
  hipRoof(roofG, 12.4, 2.5, 19, 15.9, UY + UH, 22.5, .45);
  // east ground strip skillion (covers u 0–0.8 inset)
  flatPoly(roofG, [hw(-0.35, -.3), hw(1.0, -.3), hw(1.0, 17.0), hw(-0.35, 17.0)], GH + .18, .1, MAT.fascia, .2);

  // ---- 13.2 kW solar array (32 panels) across the west-facing slopes ----
  const pitch = 22.5 * Math.PI / 180, ridgeY = main.yR;
  // ridgeU = u of the ridge; panels sit on the west slope (u > ridgeU)
  function solarArray(ridgeU, centreU, centreV, rows, cols) {
    const g = new THREE.Group();
    const pw = 1.02, pl = 1.68, gap = .04;          // portrait panels
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (r - (rows - 1) / 2) * (pw + gap);   // local-x = up/down slope
      const z = (c - (cols - 1) / 2) * (pl + gap);   // local-z = along ridge
      const pn = new THREE.Mesh(new THREE.BoxGeometry(pw, .05, pl), MAT.solar);
      pn.position.set(x, 0, z); pn.castShadow = false; g.add(pn);
      // cell grid lines
      B(pn, pw, .055, .015, 0, 0, -pl / 4, MAT.steel, false);
      B(pn, pw, .055, .015, 0, 0, pl / 4, MAT.steel, false);
      B(pn, .015, .055, pl, 0, 0, 0, MAT.steel, false);
    }
    // mounting rails just under the array
    B(g, rows * (pw + gap), .04, .05, 0, -.05, -cols * (pl + gap) / 2 + .3, MAT.steel, false);
    B(g, rows * (pw + gap), .04, .05, 0, -.05, cols * (pl + gap) / 2 - .3, MAT.steel, false);
    const y = ridgeY - (centreU - ridgeU) * Math.tan(pitch) + .09;
    const p = hw(centreU, centreV);
    g.position.set(p[0], y, p[1]);
    g.rotation.y = ROT; g.rotation.z = pitch;
    roofG.add(g);
  }
  solarArray(6.6, 9.5, 8.4, 3, 7);     // main roof — 21 panels
  solarArray(15.7, 17.4, 9.0, 2, 5);   // garage roof — 10 panels
  // small skylight on the east slope for the void
  const sky = new THREE.Mesh(new THREE.BoxGeometry(1.4, .08, 1.4), MAT.glass);
  const skyP = hw(4.0, 4.0); sky.position.set(skyP[0], ridgeY - (6.6 - 4.0) * Math.tan(pitch) + .1, skyP[1]);
  sky.rotation.y = ROT; sky.rotation.z = -pitch; roofG.add(sky);

  // ---- roof penetrations on the bare east slope (vertical fittings) ----
  const slopeY = (u, ridgeU) => ridgeY - Math.abs(ridgeU - u) * Math.tan(pitch);
  const whirly = (u, v, ridgeU = 6.6) => {                 // wind-driven roof vent
    const y = slopeY(u, ridgeU), p = hw(u, v);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.14, .17, .1, 12), MAT.fascia);
    base.position.set(p[0], y + .05, p[1]); roofG.add(base);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.16, 14, 8, 0, 6.3, 0, 1.5), MAT.steel);
    dome.position.set(p[0], y + .11, p[1]); dome.castShadow = true; roofG.add(dome);
  };
  const flue = (u, v, h, ridgeU = 6.6) => {                // plumbing / range flue
    const y = slopeY(u, ridgeU), p = hw(u, v);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, h, 10), MAT.fascia);
    pipe.position.set(p[0], y + h / 2, p[1]); pipe.castShadow = true; roofG.add(pipe);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .05, 10), MAT.fascia);
    cap.position.set(p[0], y + h + .03, p[1]); roofG.add(cap);
  };
  whirly(3.4, 5.6); whirly(2.8, 12.0);                     // two vents, main east slope
  flue(2.3, 14.4, .7);                                     // kitchen flue near wet wing
  flue(15.4, 11.5, .6, 15.7);                              // garage-wing flue
  // slim TV antenna on the main ridge
  const ant = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.5, 6), MAT.fascia);
  mast.position.y = .75; ant.add(mast);
  for (let i = 0; i < 5; i++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(.55 - i * .07, .015, .015), MAT.fascia); arm.position.set(0, 1.0 + i * .11, 0); ant.add(arm); }
  const antP = hw(6.6, 2.6); ant.position.set(antP[0], ridgeY, antP[1]); ant.rotation.y = ROT;
  ant.traverse(m => { if (m.isMesh) m.castShadow = true; }); roofG.add(ant);

  buildEnergy();
  buildEntry();
}

// all-electric plant: battery + heat-pump hot water on the service wall (Pimpala side)
function buildEnergy() {
  // Tesla-Powerwall-style battery on the west (Pimpala) wall of the service wing
  const bat = new THREE.Group();
  B(bat, .76, 1.15, .16, 0, .85, 0, MAT.renderDark);
  B(bat, .6, .9, .03, 0, .85, -.09, MAT.steel, false);     // face panel
  const led = new THREE.Mesh(new THREE.BoxGeometry(.12, .04, .02), new THREE.MeshStandardMaterial({ color: 0x6fd0a0, emissive: 0x2f8060, emissiveIntensity: .8 }));
  led.position.set(.22, 1.28, -.09); bat.add(led);
  const bp = hw(19.12, 13.2); bat.position.set(bp[0], 0, bp[1]); bat.rotation.y = ROT + Math.PI / 2; extG.add(bat);
  // heat-pump hot-water unit (compressor box + slim tank) beside it
  const hp = new THREE.Group();
  B(hp, .6, .5, .34, 0, .55, 0, MAT.steel);                // compressor
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .04, 16), MAT.fascia);
  fan.rotation.z = Math.PI / 2; fan.position.set(0, .55, -.18); hp.add(fan);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, 1.6, 16), MAT.white);
  tank.position.set(.55, .8, 0); hp.add(tank);
  const hpP = hw(19.12, 14.6); hp.position.set(hpP[0], 0, hpP[1]); hp.rotation.y = ROT + Math.PI / 2; extG.add(hp);
}

// ---------- interiors (dollhouse) ----------
const LP = 1.25;
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
const iwU = (g, u, v0, v1, y, gap) => segWall(g, hw(u, v0), hw(u, v1), y, gap);
const iwV = (g, v, u0, u1, y, gap) => segWall(g, hw(u0, v), hw(u1, v), y, gap);
function zone(g, u0, v0, u1, v1, mat, y) {
  flatPoly(g, [hw(u0, v0), hw(u1, v0), hw(u1, v1), hw(u0, v1)], y + .005, .04, mat, .3);
}
function furnish(g, kind, u, v, rotDeg, y0, opt) {
  const o = new THREE.Group(); const M = MAT;
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
    B(o, 2.0, .08, 1.0, 0, .73, 0, M.dwood);
    [[-.85, -.38], [.85, -.38], [-.85, .38], [.85, .38]].forEach(([a, b2]) => B(o, .08, .7, .08, a, .35, b2, M.dwood));
  } else if (kind === 'island') {
    B(o, 2.3, .88, 1.0, 0, .44, 0, M.cab); B(o, 2.45, .06, 1.1, 0, .9, 0, M.stone);
  } else if (kind === 'bench') {
    const L = (opt && opt.len) || 2.6;
    B(o, L, .86, .62, 0, .43, 0, M.cab); B(o, L, .06, .66, 0, .89, 0, M.stone);
    B(o, L, .9, .05, 0, 1.4, -.3, M.cab, false);
  } else if (kind === 'fridge') { B(o, .9, 1.95, .72, 0, .98, 0, M.steel);
  } else if (kind === 'vanity') { B(o, 1.1, .8, .5, 0, .4, 0, M.cab); B(o, 1.16, .05, .54, 0, .84, 0, M.stone);
  } else if (kind === 'wc') { B(o, .4, .42, .55, 0, .21, 0, M.white); B(o, .42, .5, .16, 0, .6, -.2, M.white);
  } else if (kind === 'shower') {
    B(o, 1.0, .05, 1.0, 0, .03, 0, M.stone);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.9, 1.0), M.glass); gl.position.set(-.5, .98, 0); o.add(gl);
  } else if (kind === 'bath') { B(o, 1.7, .55, .8, 0, .28, 0, M.white);
  } else if (kind === 'desk') {
    B(o, 1.5, .06, .7, 0, .73, 0, M.dwood); B(o, .5, .4, .05, 0, 1.0, .1, M.screen);
  } else if (kind === 'wudu') {
    B(o, 1.4, .2, .45, 0, .1, 0, M.stone);
    [-0.35, 0.35].forEach(x => { const t = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .45, 6), M.steel); t.position.set(x, .45, -.15); o.add(t); });
    B(o, 1.1, .08, .35, 0, .42, .25, M.wood);
  } else if (kind === 'car') {
    B(o, 1.8, .5, 4.2, 0, .5, 0, M.renderDark); B(o, 1.6, .42, 2.2, 0, .95, -.1, M.screen);
    [[-.82, 1.35], [.82, 1.35], [-.82, -1.35], [.82, -1.35]].forEach(([x, z]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .24, 14), M.screen);
      t.rotation.z = Math.PI / 2; t.position.set(x, .34, z); o.add(t);
    });
  } else if (kind === 'wr') { B(o, (opt && opt.len) || 2.0, 1.9, .55, 0, .95, 0, M.wood); }
  const p = hw(u, v);
  o.position.set(p[0], y0, p[1]);
  o.rotation.y = -((rotDeg || 0) * Math.PI / 180) + ROT;
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.add(o);
}
function stair(g, u0, v0, y0, rise) {
  const steps = 14, run = .27, w = 1.35;
  for (let i = 0; i < steps; i++) {
    const p = hw(u0 + w / 2, v0 + run * (i + .5));
    const st = new THREE.Mesh(new THREE.BoxGeometry(w, .045, run + .03), MAT.white);
    st.position.set(p[0], y0 + rise * (i + 1) / steps, p[1]);
    st.rotation.y = ROT; st.castShadow = true; g.add(st);
  }
}

// clean dollhouse helpers: colour-coded floor rooms + a low perimeter curb,
// NO chunky internal partitions (those read as a crude maze).
function room(g, u0, v0, u1, v1, mat, y) {
  flatPoly(g, [hw(u0, v0), hw(u1, v0), hw(u1, v1), hw(u0, v1)], (y || 0) + .012, .03, mat, .35);
  // thin dark inlay border so each room reads as a distinct plate
  const T = .05, h = .035;
  for (const [a, b, c, d] of [[u0, v0, u1, v0], [u1, v0, u1, v1], [u1, v1, u0, v1], [u0, v1, u0, v0]]) {
    const A = hw(a, b), B = hw(c, d), len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, T), MAT.fascia);
    m.position.set((A[0] + B[0]) / 2, (y || 0) + .05, (A[1] + B[1]) / 2);
    m.rotation.y = -Math.atan2(B[1] - A[1], B[0] - A[0]); g.add(m);
  }
}
function curb(g, u0, v0, u1, v1, y) {
  const h = .42, T = .12;
  for (const [a, b, c, d] of [[u0, v0, u1, v0], [u1, v0, u1, v1], [u1, v1, u0, v1], [u0, v1, u0, v0]]) {
    const A = hw(a, b), B = hw(c, d), len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, T), MAT.intWall);
    m.position.set((A[0] + B[0]) / 2, (y || 0) + h / 2, (A[1] + B[1]) / 2);
    m.rotation.y = -Math.atan2(B[1] - A[1], B[0] - A[0]); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
}
// proper room-divider wall: mid-height so you still see in from the top-down
// dollhouse angle, with a warm timber top cap + a doorway gap. Casts shadows
// (breaks up the washed-out floor) and clearly reads as a wall, not a stub.
const WI = 1.6;
function rwall(g, a, b, y0, gap) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dir = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const ry = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  const seg = (s0, s1) => {
    if (s1 - s0 < .06) return;
    const mid = (s0 + s1) / 2, ln = s1 - s0;
    const w = new THREE.Mesh(new THREE.BoxGeometry(ln, WI, .1), MAT.intWall);
    w.position.set(a[0] + dir[0] * mid, y0 + WI / 2, a[1] + dir[1] * mid);
    w.rotation.y = ry; w.castShadow = true; w.receiveShadow = true; g.add(w);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(ln, .045, .13), MAT.dwood);
    cap.position.set(a[0] + dir[0] * mid, y0 + WI + .02, a[1] + dir[1] * mid);
    cap.rotation.y = ry; g.add(cap);
  };
  if (!gap) seg(0, len); else { const m = len / 2; seg(0, m - gap / 2); seg(m + gap / 2, len); }
}
const rU = (g, u, v0, v1, y, gap) => rwall(g, hw(u, v0), hw(u, v1), y, gap);
const rV = (g, v, u0, u1, y, gap) => rwall(g, hw(u0, v), hw(u1, v), y, gap);

function buildInteriorGround() {
  intGround = new THREE.Group();
  // base slabs
  zone(intGround, 0, 0, 12.4, 16.7, MAT.floorG, 0);
  zone(intGround, 12.4, 2.5, 19, 16.5, MAT.floorTile, 0);
  // colour-coded rooms (carpet=bed/living warm, bath=blue-grey, tile=wet, conc=garage)
  room(intGround, .2, .2, 4.2, 4.0, MAT.carpet);       // guest bed 5
  room(intGround, .2, 4.0, 2.4, 5.9, MAT.bath);        // ens 5
  room(intGround, 2.4, 4.0, 4.2, 5.9, MAT.carpet);     // robe
  room(intGround, 7.4, .2, 12.2, 3.6, MAT.floorG);     // study
  room(intGround, 7.6, 3.6, 12.2, 7.6, MAT.carpet);    // theatre
  room(intGround, .2, 5.9, 4.2, 9.8, MAT.carpet);      // rumpus
  room(intGround, .2, 9.8, 2.0, 11.6, MAT.bath);       // powder
  room(intGround, 7.4, 7.6, 12.4, 11.6, MAT.floorTile);// hub/meals
  room(intGround, .2, 11.6, 12.2, 16.5, MAT.floorG);   // family/dining/kitchen
  room(intGround, 12.6, 2.5, 18.8, 8.6, MAT.conc);     // garage
  room(intGround, 12.4, 8.6, 19, 12.9, MAT.floorTile); // mud/wet kitchen/laundry
  room(intGround, 12.4, 12.9, 19, 16.5, MAT.paver);    // alfresco
  // perimeter outline (low curb) + proper mid-height room dividers
  curb(intGround, 0, 0, 12.4, 16.7, 0);
  curb(intGround, 12.4, 2.5, 19, 16.5, 0);
  rU(intGround, 4.2, 0, 5.9, 0, 1.0);       // guest suite | entry
  rV(intGround, 5.9, .2, 4.2, 0, .9);       // guest | ensuite
  rU(intGround, 7.4, 0, 7.6, 0, 1.0);       // entry | study
  rV(intGround, 3.6, 7.4, 12.2, 0, 1.0);    // study | theatre
  rV(intGround, 7.6, 7.4, 12.4, 0, 1.6);    // theatre | hub (wide opening)
  rU(intGround, 4.2, 5.9, 11.6, 0, 1.2);    // rumpus/service | gallery
  rV(intGround, 9.8, .2, 4.2, 0, .9);       // rumpus | powder
  rV(intGround, 11.6, .2, 7.4, 0, 1.4);     // front rooms | family (open)
  rU(intGround, 2.0, 9.8, 11.6, 0, .8);     // powder | store
  rV(intGround, 8.6, 12.6, 18.8, 0, 1.0);   // garage | service
  rU(intGround, 14.2, 8.6, 12.9, 0, .8);    // mud | wet kitchen
  rU(intGround, 16.8, 8.6, 12.9, 0, .8);    // wet kitchen | laundry
  rV(intGround, 12.9, 12.4, 19, 0, 1.8);    // service | alfresco (open)
  stair(intGround, 4.35, 6.6, 0, UY);
  // furniture
  furnish(intGround, 'bed', 2.2, 2.2, 180, 0);
  furnish(intGround, 'desk', 9.8, 1.4, 180, 0);
  furnish(intGround, 'sofa', 9.9, 6.2, 0, 0); furnish(intGround, 'tv', 9.9, 4.1, 180, 0);
  furnish(intGround, 'sofa', 3.1, 14.2, -90, 0); furnish(intGround, 'tv', 1.1, 14.2, 90, 0);
  furnish(intGround, 'dining', 8.0, 14.4, 0, 0);
  furnish(intGround, 'island', 10.4, 13.8, 90, 0);
  furnish(intGround, 'bench', 11.4, 15.2, -90, 0, { len: 2.8 });
  furnish(intGround, 'fridge', 11.7, 12.2, 0, 0);
  furnish(intGround, 'bench', 15.5, 9.2, 0, 0, { len: 2.4 });
  furnish(intGround, 'fridge', 13.2, 9.3, 0, 0);
  furnish(intGround, 'wudu', 13.3, 12.3, 0, 0);
  furnish(intGround, 'bench', 18.4, 9.7, -90, 0, { len: 1.9 });
  furnish(intGround, 'wc', 1.0, 10.4, 0, 0); furnish(intGround, 'vanity', 1.6, 11.3, 180, 0);
  furnish(intGround, 'car', 14.2, 5.4, 0, 0); furnish(intGround, 'car', 17.0, 5.4, 0, 0);
  furnish(intGround, 'dining', 15.7, 14.6, 0, 0);
}
function buildInteriorUpper() {
  intUpper = new THREE.Group();
  zone(intUpper, .8, 0, 12.4, 16.7, MAT.carpet, UY - .04);
  zone(intUpper, 12.4, 2.5, 19, 15.9, MAT.carpet, UY - .04);
  // rooms
  room(intUpper, .8, 8.4, 5.2, 16.5, MAT.carpet, UY - .02);  // master suite
  room(intUpper, 8.4, 13.2, 11.0, 16.5, MAT.bath, UY - .02); // ensuite
  room(intUpper, .8, .2, 5.0, 4.4, MAT.carpet, UY - .02);    // bed 3
  room(intUpper, 8.6, .2, 12.2, 4.2, MAT.carpet, UY - .02);  // bed 4
  room(intUpper, 8.6, 4.2, 12.2, 7.0, MAT.bath, UY - .02);   // main bath
  room(intUpper, .8, 7.0, 5.2, 11.8, MAT.carpet, UY - .02);  // retreat
  room(intUpper, 8.6, 7.0, 12.2, 11.8, MAT.carpet, UY - .02);// gym
  room(intUpper, 13.0, 2.5, 18.4, 6.4, MAT.carpet, UY - .02);// bed 2
  room(intUpper, 12.4, 6.4, 14.8, 9.1, MAT.bath, UY - .02);  // ens 2
  room(intUpper, 12.4, 9.1, 19, 12.7, MAT.floorG, UY - .02); // media lounge
  room(intUpper, 13.0, 12.7, 19, 15.9, MAT.carpet, UY - .02);// bed 6
  curb(intUpper, .8, 0, 12.4, 16.7, UY);
  curb(intUpper, 12.4, 2.5, 19, 15.9, UY);
  // mid-height room dividers (bedrooms / baths / suites read as real rooms)
  rV(intUpper, 4.4, .8, 5.0, UY, .9);       // bed 3 | landing
  rU(intUpper, 8.6, .2, 7.0, UY, 1.0);      // landing | bed 4 / bath
  rV(intUpper, 4.2, 8.6, 12.2, UY, .9);     // bed 4 | bath
  rV(intUpper, 7.0, 8.6, 12.2, UY, .9);     // bath | gym
  rU(intUpper, 5.2, .8, 11.8, UY, 1.0);     // west rooms | landing
  rV(intUpper, 7.0, .8, 5.2, UY, 1.1);      // bed 3 | retreat
  rV(intUpper, 11.8, .8, 5.4, UY, 1.1);     // retreat | master
  rU(intUpper, 8.4, 13.2, 16.5, UY, .8);    // master | WIR/ensuite
  rV(intUpper, 6.4, 12.4, 19, UY, 1.0);     // bed 2 | hall
  rU(intUpper, 14.8, 6.4, 9.1, UY, .8);     // ens 2 | hall
  rV(intUpper, 9.1, 12.4, 19, UY, 1.2);     // hall | media lounge
  rV(intUpper, 12.7, 12.4, 19, UY, .9);     // media | bed 6
  stair(intUpper, 4.35, 6.6, 0, UY);
  furnish(intUpper, 'bed', 3.0, 14.6, 0, UY, { master: true });
  furnish(intUpper, 'wr', 7.1, 15.9, 0, UY, { len: 2.4 });
  furnish(intUpper, 'vanity', 9.7, 15.9, 0, UY); furnish(intUpper, 'bath', 9.7, 14.1, 0, UY); furnish(intUpper, 'shower', 10.4, 15.0, 90, UY);
  furnish(intUpper, 'bed', 2.9, 2.4, 180, UY);
  furnish(intUpper, 'bed', 10.4, 2.2, 180, UY);
  furnish(intUpper, 'bed', 15.7, 4.4, -90, UY);
  furnish(intUpper, 'sofa', 2.9, 10.4, 90, UY); furnish(intUpper, 'tv', 4.7, 10.4, -90, UY);
  furnish(intUpper, 'desk', 10.4, 9.2, 0, UY);
  furnish(intUpper, 'vanity', 9.8, 5.0, 180, UY); furnish(intUpper, 'shower', 11.5, 6.3, 0, UY);
  furnish(intUpper, 'wc', 11.6, 4.8, 0, UY);
  furnish(intUpper, 'vanity', 13.4, 7.6, -90, UY); furnish(intUpper, 'shower', 14.2, 8.4, 180, UY);
  // media lounge + bed 6 (new upper west wing)
  furnish(intUpper, 'sofa', 15.6, 11.4, 0, UY); furnish(intUpper, 'tv', 15.6, 9.6, 180, UY);
  furnish(intUpper, 'bed', 16.2, 14.4, -90, UY);
  furnish(intUpper, 'wr', 13.7, 14.3, 90, UY, { len: 2.6 });
}

// ============================================================
// scene / lights / loop
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  // equirect sky: blue zenith → warm hazy horizon → soft ground bounce, with a
  // broad sun glow + high cloud streaks. Used as the skybox AND (via PMREM) the
  // reflection environment, so glass and car paint mirror a believable sky.
  const skyTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2766b6');      // zenith
    gr.addColorStop(.30, '#4f8fcf');
    gr.addColorStop(.44, '#8fb8de');
    gr.addColorStop(.49, '#cadbe8');
    gr.addColorStop(.5, '#e6ebe8');     // thin horizon haze
    gr.addColorStop(.55, '#c9cec2');
    gr.addColorStop(1, '#7d8a6e');      // nadir ground bounce
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // soft warm sun glow (approx sun azimuth/elevation), wide falloff
    const sx = w * 0.62, sy = h * 0.30;
    const glow = g.createRadialGradient(sx, sy, 4, sx, sy, w * 0.22);
    glow.addColorStop(0, 'rgba(255,248,228,.95)');
    glow.addColorStop(.25, 'rgba(255,240,205,.55)');
    glow.addColorStop(1, 'rgba(255,240,205,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(sx, sy, w * 0.22, 0, 7); g.fill();
    // faint high cloud streaks above the horizon
    for (let i = 0; i < 26; i++) {
      const cy = h * (0.30 + Math.random() * 0.16), cx = Math.random() * w, cw = 40 + Math.random() * 130;
      const cl = g.createRadialGradient(cx, cy, 2, cx, cy, cw);
      cl.addColorStop(0, 'rgba(255,255,255,.16)'); cl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cl; g.beginPath(); g.ellipse(cx, cy, cw, cw * 0.22, 0, 0, 7); g.fill();
    }
  });
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xc8d6dc, 150, 300);
  scene.userData.skyTex = skyTex;   // PMREM environment is built after the renderer exists

  const heroEl = document.getElementById('hero');
  // tighter near/far so SSAO + shadow depth precision is usable at house scale
  camera = new THREE.PerspectiveCamera(38, heroEl.clientWidth / heroEl.clientHeight, .4, 280);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c3d'), antialias: true });
  renderer.setSize(heroEl.clientWidth, heroEl.clientHeight, false); // CSS keeps the canvas at 100%
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;            // static scene: render shadows on demand
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  // image-based lighting: PMREM from the SAME sky texture → glass/metal/car
  // paint reflect the real skybox (sun glow, blue zenith, hazy horizon).
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromEquirectangular(scene.userData.skyTex).texture;
  pmrem.dispose();

  hemi = new THREE.HemisphereLight(0xcfe2ff, 0x6e6a58, .42); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
  const fineShadows = matchMedia('(pointer: fine)').matches;
  sun.castShadow = true; sun.shadow.mapSize.set(fineShadows ? 4096 : 2048, fineShadows ? 4096 : 2048);
  const sr = 52; Object.assign(sun.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 1, far: 170 });
  sun.shadow.bias = -.0004;
  scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.AmbientLight(0xffffff, .05));

  makeTextures(); makeMaterials();
  buildSiteCtx(); buildLot(); buildExterior(); buildInteriorGround(); buildInteriorUpper();
  scene.add(siteCtxG, lotG, extG, roofG, intGround, intUpper);
  studioSun();    // default: flattering studio light; the slider engages the true solar path
  applyView(); updateCam();
  reshadow();
  setupComposer(heroEl.clientWidth, heroEl.clientHeight, fineShadows);
  document.getElementById('loading').style.opacity = '0';

  // pause rendering when the hero is off-screen
  new IntersectionObserver(es => {
    heroVisible = es[0].isIntersecting;
    if (heroVisible) invalidate();
  }, { threshold: .02 }).observe(heroEl);

  // iOS Safari can drop the WebGL context under memory pressure — recover gracefully
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    document.getElementById('loading').style.opacity = '1';
  }, false);
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    document.getElementById('loading').style.opacity = '0';
    reshadow();
  }, false);

  animate();
}

// Studio light: archviz "cheat" sun from the SE that flatters the street facades.
// Moving the slider switches to the physically-true Melbourne solar path.
function studioSun() {
  sun.position.set(52, 64, 58);                    // high SSE — front + east faces lit
  sun.intensity = 2.25;
  sun.color.set(0xfff1dc);
  hemi.intensity = .4;
  if (renderer) reshadow();
}
// filmic colour grade: gentle contrast S-curve, split-tone (warm shadows /
// cool highlights), a touch of saturation, and a soft vignette — the archviz
// "rendered photo" look. Self-contained shader, no extra CDN dependency.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 1.07 },
    saturation: { value: 1.09 },
    warmth: { value: 0.045 },
    vignette: { value: 0.80 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float contrast, saturation, warmth, vignette; varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    '  c = (c - 0.5) * contrast + 0.5;',                                  // contrast around mid-grey
    '  float l = dot(c, vec3(0.299,0.587,0.114));',
    '  c = mix(vec3(l), c, saturation);',                                 // saturation
    '  c += warmth * vec3(1.0,0.55,-0.45) * (1.0 - l);',                  // warm shadows
    '  c += warmth * vec3(-0.35,0.05,0.5) * l * 0.6;',                    // cool highlights
    '  float d = length(vUv - 0.5) * 1.35;',                             // vignette
    '  c *= mix(1.0, 0.80, smoothstep(0.55, vignette + 0.45, d));',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}',
  ].join('\n'),
};

// post-processing: SSAO ambient occlusion (desktop) + colour grade + FXAA,
// composited on demand. Falls back to a plain render if addons failed to load.
let useComposer = false;
function setupComposer(w, h, desktop) {
  if (typeof THREE.EffectComposer !== 'function' || typeof THREE.RenderPass !== 'function') return;
  try {
    const pr = renderer.getPixelRatio();
    composer = new THREE.EffectComposer(renderer);
    composer.setSize(w, h);
    composer.addPass(new THREE.RenderPass(scene, camera));
    if (desktop && typeof THREE.SSAOPass === 'function') {
      ssaoPass = new THREE.SSAOPass(scene, camera, w, h);
      ssaoPass.kernelRadius = 5;
      ssaoPass.minDistance = 0.0015;
      ssaoPass.maxDistance = 0.10;
      composer.addPass(ssaoPass);
    }
    // subtle photographic glow on the brightest highlights (sky, sunlit render,
    // solar/glass speculars) — low strength + high threshold so it never washes out
    if (typeof THREE.UnrealBloomPass === 'function') {
      const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.26, 0.55, 0.82);
      composer.addPass(bloom);
    }
    if (typeof THREE.ShaderPass === 'function') {
      composer.addPass(new THREE.ShaderPass(GradeShader));   // colour grade + vignette
      if (THREE.FXAAShader) {
        fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
        fxaaPass.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
        composer.addPass(fxaaPass);
      }
    }
    useComposer = true;
  } catch (e) { useComposer = false; }
}
function renderFrame() {
  if (useComposer && composer) composer.render();
  else renderer.render(scene, camera);
}

function setSun(hour) {
  const t = (hour - 7) / 12;
  const az = (90 - t * 180) * Math.PI / 180;       // E → N → W (southern hemisphere)
  const el = Math.sin(t * Math.PI) * 48 * Math.PI / 180 + .06;
  const R = 95;
  sun.position.set(R * Math.sin(az) * Math.cos(el), R * Math.sin(el), -R * Math.cos(az) * Math.cos(el));
  sun.intensity = .8 + Math.sin(t * Math.PI) * 2.1;
  const warm = Math.pow(Math.abs(t - .5) * 2, 2);
  sun.color.setHSL(.09 - warm * .045, .55 + warm * .3, .82 - warm * .12);
  hemi.intensity = .22 + Math.sin(t * Math.PI) * .2;
  if (renderer) reshadow();
}

function applyView() {
  const ext = view === 'exterior' || view === 'site';
  extG.visible = ext;
  roofG.visible = ext && roofOn;
  intGround.visible = view === 'ground';
  intUpper.visible = view === 'upper';
  reshadow();
}
function updateCam() {
  camera.position.set(
    tgt.x + dist * Math.sin(rotY) * Math.cos(rotX),
    tgt.y + dist * Math.sin(rotX),
    tgt.z + dist * Math.cos(rotY) * Math.cos(rotX));
  camera.lookAt(tgt.x, tgt.y, tgt.z);
  invalidate();
}
function setView(v) {
  view = v;
  if (v === 'exterior') { dist = 46; rotX = .27; rotY = -.7; tgt = { x: 0, y: 2.8, z: 0 }; }
  if (v === 'site') { dist = 96; rotX = .85; rotY = -.5; tgt = { x: 0, y: 0, z: -14 }; }
  if (v === 'ground') { dist = 40; rotX = 1.08; rotY = -.35; tgt = { x: 0, y: 0, z: -3 }; }
  if (v === 'upper') { dist = 40; rotX = 1.08; rotY = -.35; tgt = { x: 0, y: UY, z: -3 }; }
  applyView(); updateCam();
}

// canvas + slider: bind ONCE (never re-bound on language switch)
function bindCanvasControls() {
  const el = renderer.domElement;
  let drag = false, px = 0, py = 0;
  el.addEventListener('mousedown', e => { drag = true; px = e.clientX; py = e.clientY; });
  addEventListener('mouseup', () => drag = false);
  addEventListener('mousemove', e => {
    if (!drag) return;
    rotY -= (e.clientX - px) * .008; rotX += (e.clientY - py) * .008;
    rotX = Math.max(.06, Math.min(1.45, rotX)); px = e.clientX; py = e.clientY; updateCam();
  });
  // plain wheel scrolls the PAGE; ctrl+wheel (and trackpad pinch) zooms the model
  el.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    dist += e.deltaY * .05; dist = Math.max(12, Math.min(140, dist)); updateCam();
  }, { passive: false });
  // touch: one finger scrolls the page; two fingers rotate + pinch-zoom the model
  let td = 0, tmx = 0, tmy = 0;
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      td = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      tmx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      tmy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    dist += (td - d) * .07; dist = Math.max(12, Math.min(140, dist)); td = d;
    rotY -= (mx - tmx) * .008; rotX += (my - tmy) * .008;
    rotX = Math.max(.06, Math.min(1.45, rotX)); tmx = mx; tmy = my;
    updateCam();
  }, { passive: false });

  document.getElementById('sunSlider').addEventListener('input', function () {
    setSun(parseFloat(this.value));
    document.getElementById('sunLabel').textContent =
      `${String(Math.floor(this.value)).padStart(2, '0')}:${this.value % 1 ? '30' : '00'}`;
  });
}

// HUD buttons: re-bound after every language re-render (buttons are recreated)
function bindHudButtons() {
  document.querySelectorAll('[data-view3d]').forEach(b => b.addEventListener('click', function () {
    document.querySelectorAll('[data-view3d]').forEach(x => x.classList.remove('active'));
    this.classList.add('active'); setView(this.dataset.view3d);
  }));
  document.getElementById('roofBtn').addEventListener('click', function () {
    roofOn = !roofOn;
    this.textContent = roofOn ? I18N[LANG].hero.roofHide : I18N[LANG].hero.roofShow;
    applyView(); invalidate();
  });
  document.getElementById('rotBtn').addEventListener('click', function () {
    autoRot = !autoRot; this.classList.toggle('active', autoRot); invalidate();
  });
  document.getElementById('zoomIn').addEventListener('click', () => {
    dist = Math.max(12, dist - 7); updateCam();
  });
  document.getElementById('zoomOut').addEventListener('click', () => {
    dist = Math.min(140, dist + 7); updateCam();
  });
}
function animate() {
  requestAnimationFrame(animate);
  if (!heroVisible) return;
  if (autoRot) { rotY += .002; updateCam(); }
  if (needsRender) { renderFrame(); needsRender = false; }
}
// Debounced resize: iOS Safari fires resize continuously while the URL bar
// collapses during scroll — resizing the GL canvas every frame janks the page.
let resizeT = 0, lastW = 0, lastH = 0;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    const heroEl = document.getElementById('hero');
    const w = heroEl.clientWidth, h = heroEl.clientHeight;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      if (ssaoPass) ssaoPass.setSize(w, h);
      if (fxaaPass) fxaaPass.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    }
    reshadow();
  }, 150);
});
