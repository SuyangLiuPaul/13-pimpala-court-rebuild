// Generates js/data.js — bakes real geometry + research constants for the site.
const fs = require('fs');
const geo = require('./site_geometry.json');

// keep neighbours whose centroid is within 60m of origin
const near = geo.neighbours.filter(n => Math.hypot(n.centroid[0], n.centroid[1]) < 80)
  .map(n => ({ short: n.short, ring: n.ring, centroid: n.centroid, area: n.area }));

// roads: keep Pimpala Court + Milpera Crescent segments within 90m
const roads = geo.roads
  .map(r => ({ name: r.name, pts: r.pts.filter(p => Math.hypot(p[0], p[1]) < 110) }))
  .filter(r => r.pts.length > 1);

const data = {
  meta: geo.meta,
  lot: geo.lot,
  existingHouse: geo.existingHouse,
  neighbours: near,
  roads,
};

const js = `// ============================================================
// 13 Pimpala Court, Wantirna VIC 3152 — knockdown-rebuild dataset
// Geometry: Vicmap parcel_view (GDA2020), projected to local metres.
// Origin = lot centroid. +x east, +y true north. Generated ${'2026-06-11'}.
// ============================================================
const SITE = ${JSON.stringify(data)};
`;
fs.writeFileSync('../js/data_geometry.js', js);
console.log('wrote js/data_geometry.js | neighbours kept:', near.length, '| roads:', roads.length);
