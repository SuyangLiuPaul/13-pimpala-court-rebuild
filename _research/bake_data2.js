// v2: bakes real geometry incl. OSM building footprints + court bowl into js/data_geometry.js
const fs = require('fs');
const geo = require('./site_geometry.json');
const osm = require('./buildings.json');

const LAT0 = -37.86332, LON0 = 145.221547;
const rad = d => d * Math.PI / 180;
const MLAT = 111132.954 - 559.822 * Math.cos(2 * rad(LAT0)) + 1.175 * Math.cos(4 * rad(LAT0));
const MLON = (Math.PI / 180) * 6378137 * Math.cos(rad(LAT0)) / Math.sqrt(1 - 0.00669438 * Math.sin(rad(LAT0)) ** 2);
const toXY = (lon, lat) => [+(((lon - LON0) * MLON)).toFixed(2), +(((lat - LAT0) * MLAT)).toFixed(2)];

// parcels for the site plan
const near = geo.neighbours.filter(n => Math.hypot(n.centroid[0], n.centroid[1]) < 80)
  .map(n => ({ short: n.short, ring: n.ring, centroid: n.centroid, area: n.area }));

// roads (incl. full Pimpala with the bowl end at ~(-15,85))
const roads = geo.roads
  .map(r => ({ name: r.name, pts: r.pts.filter(p => Math.hypot(p[0], p[1]) < 115) }))
  .filter(r => r.pts.length > 1);

// real buildings (exclude our own existing house — kept separately)
const buildings = [];
for (const w of osm.elements) {
  if (w.id === 1411696488) continue;            // 13 Pimpala existing house (separate)
  const ring = w.geometry.map(g => toXY(g.lon, g.lat));
  let cx = 0, cy = 0; ring.slice(0, -1).forEach(p => { cx += p[0]; cy += p[1]; });
  const n = ring.length - 1, c = [cx / n, cy / n];
  if (Math.hypot(c[0], c[1]) > 92) continue;
  const t = w.tags || {};
  buildings.push({
    num: t['addr:housenumber'] || '',
    st: (t['addr:street'] || '').replace(' Court', ' Ct').replace(' Drive', ' Dr').replace(' Crescent', ' Cr').replace(' Street', ' St'),
    type: t.building === 'garage' ? 'garage' : 'house',
    ring, c: [+c[0].toFixed(1), +c[1].toFixed(1)],
  });
}

const data = {
  meta: { ...geo.meta, cornerLot: 'SE corner of Pimpala Court (west frontage) and Benwerrin Drive (south); splay at junction', bowl: [-15.4, 85.2] },
  lot: geo.lot,
  existingHouse: geo.existingHouse,
  neighbours: near,
  roads,
  buildings,
};
fs.writeFileSync('../js/data_geometry.js',
  '// Real geometry: Vicmap cadastre + OSM buildings (surveyed 2025), local metres, +y = true north\nconst SITE = ' + JSON.stringify(data) + ';\n');
console.log('buildings baked:', buildings.length, '| houses:', buildings.filter(b => b.type === 'house').length, '| size:', JSON.stringify(data).length);
