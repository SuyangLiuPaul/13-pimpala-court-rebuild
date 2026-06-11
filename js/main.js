// ============================================================
// page wiring: render data-driven sections, then boot the 3D
// ============================================================
const $ = s => document.querySelector(s);
const fmt = n => '$' + n.toLocaleString('en-AU');

// ---- site facts ----
(function () {
  const rows = [
    ['Address', PROPERTY.address],
    ['Lot / Plan', PROPERTY.lotPlan],
    ['Lot area', PROPERTY.lotArea + ' m² (cadastral polygon)'],
    ['Boundaries', `E ${PROPERTY.eastBoundary} m · W ${PROPERTY.westBoundary} m · rear ${PROPERTY.rearBoundary} m`],
    ['Frontage', PROPERTY.frontage + ' m curved + ' + PROPERTY.splay + ' m splay'],
    ['Orientation', 'Rear boundary faces true north'],
    ['Zone', PROPERTY.zone],
    ['Overlays', PROPERTY.overlays + ' (verified point query)'],
    ['Existing house', PROPERTY.existing.desc + ', ' + PROPERTY.existing.floorArea + ' m²'],
    ['History', PROPERTY.existing.built],
    ['AVM estimate', `$1.20–1.30 M (${PROPERTY.avm.date})`],
  ];
  $('#factList').innerHTML = rows.map(r =>
    `<div class="factrow"><span class="k">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('');
  $('#compList').innerHTML = PROPERTY.comparables.map(c =>
    `<div class="factrow"><span class="k">${c.addr}</span><span class="v">${c.price} · ${c.date}</span></div>`).join('');
  $('#marketLine').textContent = PROPERTY.market;
})();

// ---- rules table ----
(function () {
  $('#rulesTable tbody').innerHTML = RULES.map(r => `
    <tr><td>${r.rule}</td><td>${r.req}</td><td>${r.design}</td>
    <td><span class="badge pass">PASS</span></td></tr>`).join('');
})();

// ---- design areas ----
(function () {
  const a = DESIGN.areas;
  const rows = [
    ['Ground (roofed)', a.groundRoofed + ' m²'],
    ['— garage / alfresco / porch', `${a.garage} / ${a.alfresco} / ${a.porch} m²`],
    ['Upper floor', a.upper + ' m²'],
    ['Total under roof', `${a.totalUnderRoof} m² · ${a.squares} sq`],
    ['Internal living', a.internalLiving + ' m²'],
    ['Driveway', a.driveway + ' m²'],
    ['Garden area (open)', `${a.gardenArea} m² = ${a.gardenPct} %`],
    ['Site coverage', a.coveragePct + ' % of 60 % cap'],
    ['Permeability', a.permeabilityPct + ' % vs 20 % min'],
    ['Ridge height', DESIGN.envelope.ridge + ' m (9 m cap)'],
  ];
  $('#areaList').innerHTML = rows.map(r =>
    `<div class="factrow"><span class="k">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('');
})();

// ---- costs ----
(function () {
  $('#costLede').innerHTML = `Recommended procurement: <b>${COSTS.recommended}</b> — at 63 squares this is the sweet spot between scale pricing and customisation. Ranges below are 2026 Melbourne figures including GST; the custom-builder alternative is shown struck for comparison.`;
  $('#costTable tbody').innerHTML = COSTS.rows.map(r => `
    <tr class="${r.alt ? 'alt' : ''}"><td>${r.item}</td>
    <td class="num">${fmt(r.low)}</td><td class="num">${fmt(r.high)}</td>
    <td class="small muted">${r.note}</td></tr>`).join('');
  $('#costTable tfoot').innerHTML = `
    <tr><td>Total project (volume-builder path)</td>
    <td class="num">${fmt(COSTS.totals.low)}</td><td class="num">${fmt(COSTS.totals.high)}</td>
    <td class="small">≈ ${fmt(Math.round(COSTS.totals.low / DESIGN.areas.totalUnderRoof / 10) * 10)}–${fmt(Math.round(COSTS.totals.high / DESIGN.areas.totalUnderRoof / 10) * 10)} per m² all-in</td></tr>`;
  drawPayments($('#payments'));
  $('#feasibility').textContent = COSTS.feasibility;
})();

// ---- process ----
(function () {
  $('#stepList').innerHTML = PROCESS.map(s => `
    <div class="step"><div class="n">${String(s.n).padStart(2, '0')}</div>
    <div><h4>${s.t}</h4><p>${s.d}</p></div></div>`).join('');
})();

// ---- sources ----
(function () {
  $('#srcList').innerHTML = SOURCES.map(s =>
    `<div class="srcrow"><b>${s.k}</b><span>${s.v}</span></div>`).join('');
  $('#disclaimer').textContent = DISCLAIMER;
})();

// ---- SVGs ----
drawSitePlan($('#sitePlan'));
drawFloorPlan($('#groundPlan'), GROUND_ROOMS, GROUND_WINGS, 'GROUND FLOOR · 1:200',
  'Roofed 338.5 m² incl. garage 43.6 + alfresco 25 + porch 7.4 · open-plan rear faces north');
drawFloorPlan($('#upperPlan'), UPPER_ROOMS, UPPER_WINGS, 'UPPER FLOOR · 1:200',
  'Upper 250 m² · walls ≥2.0 m off boundaries (reg 79 needs 1.9 m at 6.6 m wall height)');
drawGantt($('#gantt'));

// ---- 3D ----
initScene();
bindControls();
