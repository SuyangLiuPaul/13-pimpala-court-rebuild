// Build site_geometry.json — all geometry in local meters.
// Origin: centroid of lot 13. +x = east, +y = north (equirectangular at lot latitude).
const fs = require('fs');
const props = require('./props_full.json');
const roads = require('./roads.json');

const LAT0 = -37.86332, LON0 = 145.221547; // lot centroid approx
const rad = d => d * Math.PI / 180;
const MLAT = 111132.954 - 559.822 * Math.cos(2 * rad(LAT0)) + 1.175 * Math.cos(4 * rad(LAT0));
const MLON = (Math.PI / 180) * 6378137 * Math.cos(rad(LAT0)) / Math.sqrt(1 - 0.00669438 * Math.sin(rad(LAT0)) ** 2);
const toXY = (lon, lat) => [+( (lon - LON0) * MLON ).toFixed(2), +(( lat - LAT0) * MLAT ).toFixed(2)];

function ringArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  return Math.abs(a) / 2;
}
function centroid(pts) {
  let cx = 0, cy = 0, n = 0;
  for (let i = 0; i < pts.length - 1; i++) { cx += pts[i][0]; cy += pts[i][1]; n++; }
  return [+(cx / n).toFixed(2), +(cy / n).toFixed(2)];
}

const lots = [];
for (const f of props.features) {
  const addr = f.properties.add_ezi_address;
  if (!f.geometry) continue;
  const ring = f.geometry.coordinates[0][0].map(c => toXY(c[0], c[1]));
  lots.push({
    address: addr,
    short: addr.replace(' WANTIRNA 3152', '').replace(' WANTIRNA SOUTH 3152', ''),
    ring,
    area: +ringArea(ring).toFixed(1),
    centroid: centroid(ring),
    isSubject: addr === '13 PIMPALA COURT WANTIRNA 3152',
  });
}

// Existing house footprint at 13 (OSM way 1411696488, surveyed 2025)
const osmHouse = [
  [145.2216541, -37.8633115], [145.2215301, -37.8632763], [145.2215128, -37.8633142],
  [145.2214572, -37.8632984], [145.2214325, -37.8633523], [145.2214918, -37.8633692],
  [145.2214981, -37.8633553], [145.2216185, -37.8633895], [145.2216541, -37.8633115],
].map(c => toXY(c[0], c[1]));

const roadLines = [];
for (const w of roads.elements) {
  if (!w.tags || !['residential', 'trunk'].includes(w.tags.highway)) continue;
  roadLines.push({ name: w.tags.name || '', pts: w.geometry.map(g => toXY(g.lon, g.lat)) });
}

const subject = lots.find(l => l.isSubject);
const out = {
  meta: {
    address: '13 Pimpala Court, Wantirna VIC 3152',
    datum: 'GDA2020 (EPSG:7844) Vicmap parcel_view, projected to local metres',
    originLatLon: [LAT0, LON0],
    lotAreaM2: subject.area,
    existingHouseAreaM2: +ringArea(osmHouse).toFixed(1),
  },
  lot: subject.ring,
  existingHouse: osmHouse,
  neighbours: lots.filter(l => !l.isSubject),
  roads: roadLines,
};
fs.writeFileSync('./site_geometry.json', JSON.stringify(out, null, 1));
console.log('lot area:', subject.area, 'm2 | existing house footprint:', out.meta.existingHouseAreaM2, 'm2');
console.log('lot ring:', JSON.stringify(subject.ring));
console.log('existing house:', JSON.stringify(osmHouse));
console.log('neighbours:', out.neighbours.length, '| roads:', roadLines.length);
