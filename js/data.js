// ============================================================
// 13 Pimpala Court Wantirna — project dataset (researched June 2026)
// Every figure carries a source in SOURCES below.
// ============================================================

const PROPERTY = {
  address: '13 Pimpala Court, Wantirna VIC 3152',
  lotPlan: 'Lot 36 LP117445',
  lotArea: 678.9,                  // m2, computed from Vicmap cadastral polygon (GDA2020)
  frontage: 21.5,                  // m curved court frontage + 5.5 m splay to pedestrian link
  eastBoundary: 32.08, westBoundary: 21.56, rearBoundary: 23.05, splay: 5.51,
  rearFacesNorth: true,            // rear boundary bearing ~85° => backyard gets northern sun
  zone: 'NRZ4 — Neighbourhood Residential Zone, Schedule 4 (Knox)',
  zoneNote: '“Knox Neighbourhood Areas”. Rezoned from GRZ2 by Amendment GC172 (23 Dec 2020). Schedule varies only front-fence height; all other standards are state defaults.',
  overlays: 'None',                // Vicmap plan_overlay query: zero overlays intersect the lot
  existing: {
    built: 'c. 1978 (last sold 23 Feb 1978 for $58,220 — held 48 years)',
    desc: 'Single-storey brick-veneer house, 4 bed, 2 car',
    floorArea: 180,                // m2 (CoreLogic) — OSM-surveyed footprint 140 m2 + garage
    footprint: 140.3,
  },
  avm: { low: 1200000, high: 1300000, date: '8 Jun 2026', source: 'CoreLogic AVM via propertyvalue.com.au' },
  comparables: [
    { addr: '11 Pimpala Ct (776 m²)', price: '$1,121,000', date: 'Apr 2025' },
    { addr: '2 Pimpala Ct (679 m²)',  price: '$1,000,000', date: 'Feb 2024' },
    { addr: '9 Pimpala Ct (658 m²)',  price: '$1,090,000', date: 'Apr 2022' },
    { addr: '1 Pimpala Ct',           price: '$1,180,000', date: 'Apr 2022' },
  ],
  market: 'Wantirna median house $1.2 M, +10.5 % p.a., 163 sales in 12 months, ~28 days on market (CoreLogic, Jun 2026)',
};

// ---------- planning & building rules that bind this build ----------
const RULES = [
  { rule: 'Planning permit for one new dwelling', req: 'Not required — lot ≥ 300 m² (Cl. 32.09-5, VC282 8 Sep 2025). Building permit only.', design: '678.9 m² lot → building-permit pathway', pass: true },
  { rule: 'Maximum building height', req: '9 m & max 2 storeys — mandatory “whether or not a planning permit is required” (Cl. 32.09-11; Building Reg 75)', design: 'Ridge ≈ 8.65 m, 2 storeys', pass: true },
  { rule: 'Minimum garden area (lot > 650 m²)', req: '35 % = 237.6 m² — mandatory (Cl. 32.09-4 + Building Reg 76A). Open land ≥1 m wide; driveway & roofed areas excluded. Lawn, paving, unroofed terraces all qualify — no planted garden required.', design: '285.4 m² = 42.0 %', pass: true },
  { rule: 'Maximum site coverage', req: '60 % (Building Reg 76; NRZ4 schedule silent → default)', design: '338.5 m² = 49.9 %', pass: true },
  { rule: 'Minimum permeability', req: '20 % permeable surfaces (Building Reg 77)', design: '≈ 35 % (lawn + garden margins)', pass: true },
  { rule: 'Street setback', req: 'Average of adjoining dwellings’ front walls, or 9 m, whichever is less (Building Reg 74, Table 74)', design: '7.5–8.4 m (adjoining avg ≈ 7.5 m — confirm at feature survey)', pass: true },
  { rule: 'Side & rear setbacks', req: 'Reg 79 Table: ≥1.0 m up to 3.6 m wall height; 1 m + 0.3 m/m above 3.6 m; 2 m + 1 m/m above 6.9 m', design: 'Ground walls ≥1.0 m (min 1.02 m); upper walls ≥2.0 m (need 1.9 m @ 6.6 m)', pass: true },
  { rule: 'Walls on boundaries', req: 'Reg 80: ≤3.2 m avg height, length ≤10 m + 25 % of remaining boundary', design: 'None proposed — all walls set back', pass: true },
  { rule: 'Energy efficiency', req: '7-star NatHERS + Whole-of-Home ≥60 (NCC 2022, VIC since 1 May 2024)', design: 'North-facing living, eaves 450–600 mm, double glazing', pass: true },
  { rule: 'Front fence height', req: 'NRZ4 schedule: 1.2 m (street not in TZ2)', design: 'Open frontage / ≤1.2 m if fenced', pass: true },
];

// ---------- the new house ----------
const DESIGN = {
  name: 'Pimpala 63 — maximised two-storey family home',
  storeys: 2, beds: 5, baths: 4.5, cars: 2,
  study: true, theatre: true, rumpus: true, retreat: true,
  kitchens: 'Dry (display) kitchen + enclosed wet/wok kitchen + walk-in pantry',
  wudu: 'Wudu station in mudroom (garage entry)',
  noPool: true, noGardenBeds: true,
  outdoor: 'Roofed alfresco 25 m² + open paved terrace; plain lawn — no pool, no landscaped beds',
  areas: {
    groundRoofed: 338.5,      // incl. garage 43.6, alfresco 25, porch 7.4
    upper: 250.0,
    totalUnderRoof: 588.5,    // m2
    squares: 63.3,
    internalLiving: 512.5,    // excl. garage / alfresco / porch
    garage: 43.6, alfresco: 25.0, porch: 7.4,
    driveway: 55, openPaving: 46,
    gardenArea: 285.4, gardenPct: 42.0,
    coveragePct: 49.9, permeabilityPct: 35.3,
  },
  envelope: {
    eastWing: { w: 13.0, d: 18.5 },   // main living wing, hugs east boundary at 1.2 m
    westWing: { w: 7.0, d: 14.0 },    // garage/service wing, 1.0 m off west boundary
    ridge: 8.65, groundCeiling: 2.74, upperCeiling: 2.59, roofPitch: 22.5,
  },
  // site-XY footprint corners (local metres, origin = lot centroid, +y = true north)
  footprintXY: {
    east: [[8.99,-7.57],[-3.74,-4.93],[0.01,13.18],[12.74,10.54]],
    west: [[-3.22,-2.49],[-10.08,-1.07],[-7.24,12.64],[-0.38,11.22]],
  },
  rotationDeg: 11.7,  // house grid rotation vs true E-W (aligned to east boundary)
};

// ---------- costs (AUD, 2026 Melbourne — ranges, GST inc.) ----------
const COSTS = {
  recommended: 'Premium volume / semi-custom builder (e.g. Metricon Signature, Henley Reserve class)',
  rows: [
    { item: 'Demolition — 180 m² brick veneer (1978), incl. asbestos survey & licensed removal allowance, tree clearing, temp fencing', low: 35000, high: 55000, note: 'BV $55–85/m²; asbestos +$5–15k typical for pre-1990' },
    { item: 'Utility abolishment (gas + power) & water/sewer cap-off', low: 1500, high: 3500, note: 'AusNet portal; allow 4–8 weeks lead' },
    { item: 'Surveys & reports — re-establishment + feature survey, soil/geotech, NatHERS 7★ assessment', low: 4500, high: 7500, note: '' },
    { item: 'Section 29A consent + demolition building permit', low: 1200, high: 2500, note: 'Statutory 15 business days' },
    { item: 'Construction building permit (private surveyor) + levies', low: 5500, high: 9500, note: 'Incl. VBA levy on $1.4 M works' },
    { item: 'Knox asset protection fee + stormwater report (LPOD)', low: 600, high: 900, note: '$350 + $240.65 (FY 2025-26)' },
    { item: 'NEW BUILD — 588 m² (63 sq) double-storey, 7-star, premium volume builder', low: 1350000, high: 1650000, note: '$2,300–$2,800/m²; AIQS benchmark $3,289/m² for medium-spec 2-storey' },
    { item: '— or fully custom builder (alternative)', low: 1710000, high: 2120000, note: '$2,900–$3,600/m²', alt: true },
    { item: 'Site costs & connections — slab class M/H-D allowance, new water/power/NBN/sewer connections', low: 35000, high: 70000, note: 'Confirmed by soil report' },
    { item: 'Driveway + crossover (council spec) + open paving 46 m²', low: 18000, high: 30000, note: 'Exposed aggregate $120–180/m²; road-opening permit $325' },
    { item: 'Boundary fencing contribution + plain turf finish (no garden beds)', low: 9000, high: 16000, note: 'Fencing Act half-share with 3 neighbours' },
    { item: 'Flooring, blinds, flyscreens, letterbox, clothesline (if not in contract)', low: 30000, high: 48000, note: 'Often excluded from base price' },
    { item: 'Contingency ~8 %', low: 110000, high: 150000, note: 'RLB forecasts +4.0 % Melbourne escalation in 2026' },
  ],
  totals: { low: 1600300, high: 2042900 },           // volume-builder path (excl. custom alt row)
  paymentStages: [
    { stage: 'Deposit', pct: 5 }, { stage: 'Base', pct: 10 }, { stage: 'Frame', pct: 15 },
    { stage: 'Lock-up', pct: 35 }, { stage: 'Fixing', pct: 25 }, { stage: 'Completion', pct: 10 },
  ],   // Domestic Building Contracts Act 1995 (Vic) s.40 caps
  feasibility: 'Land (AVM mid $1.25 M) + project ($1.6–2.0 M) ≈ $2.85–3.25 M all-in. New 60+ sq homes on ~700 m² in Wantirna/Glen Waverley corridor transact above $2.6 M; this is a long-hold family home play, not a flip.',
};

// ---------- timeline (months, realistic Melbourne 2026) ----------
const TIMELINE = [
  { phase: 'Feasibility & finance', start: 0, dur: 1.5, detail: 'Budget, lending pre-approval, builder shortlist (3 quotes), this report' },
  { phase: 'Surveys & reports', start: 1, dur: 2, detail: 'Re-establishment + feature survey, soil class, arborist check, NatHERS modelling' },
  { phase: 'Design development', start: 1.5, dur: 3.5, detail: 'Plans to building-permit level, engineering, fixed-price tender, colour selections' },
  { phase: 'Contract & insurance', start: 4.5, dur: 1, detail: 'HIA/MBA contract, 5 % deposit, Domestic Building Insurance certificate' },
  { phase: 'Permits & disconnections', start: 5, dur: 2.5, detail: 'S.29A consent (15 bus. days), demolition + construction building permits, asset protection ($350), gas/power abolishment (4–8 wks lead)' },
  { phase: 'Demolition & site clear', start: 7.5, dur: 1, detail: 'Asbestos removal first, then knock-down: 1–3 weeks on site' },
  { phase: 'Base stage (slab)', start: 8.5, dur: 2, detail: 'Cut & fill, drainage, waffle/raft slab — 10 % progress payment' },
  { phase: 'Frame', start: 10.5, dur: 2.5, detail: 'Two-storey frame + trusses — 15 %' },
  { phase: 'Lock-up', start: 13, dur: 3.5, detail: 'Roof, brickwork, windows, external doors — 35 %' },
  { phase: 'Fixing', start: 16.5, dur: 3.5, detail: 'Plaster, cabinetry, two kitchens, bathrooms, wudu station — 25 %' },
  { phase: 'Completion & PCI', start: 20, dur: 1.5, detail: 'Painting, appliances, commissioning, inspections — 10 %' },
  { phase: 'Occupancy & externals', start: 21.5, dur: 1.5, detail: 'Occupancy permit, driveway & crossover, fencing, turf, handover' },
];
const TIMELINE_TOTAL = 23; // months — fast path ~18 with volume builder

// ---------- step-by-step process ----------
const PROCESS = [
  { n: 1, t: 'Confirm feasibility', d: 'Order title & re-establishment survey for Lot 36 LP117445. No planning permit is needed (lot ≥ 300 m², no overlays) — your approvals run through a private building surveyor, which removes ~6 months of council planning risk.' },
  { n: 2, t: 'Pick the builder before final design', d: 'For a 63-square home, premium volume builders (Metricon Signature, Henley Reserve, Carlisle) price 20–30 % below custom. Take this concept to 3 builders for fixed-price tenders on the same brief.' },
  { n: 3, t: 'Lock the design to the rules', d: 'Keep ridge ≤ 9 m / 2 storeys, coverage ≤ 60 %, garden area ≥ 237.6 m², ground side walls ≥ 1.0 m, upper walls ≥ 1.9 m from boundaries, street setback ≈ adjoining average. This concept passes all ten checks with margin.' },
  { n: 4, t: 'Sign under the DBCA', d: 'Major Domestic Building Contract: deposit capped 5 %, progress 10/15/35/25/10. Builder must hold Domestic Building Insurance (works > $16k) before taking the deposit.' },
  { n: 5, t: 'Order utility abolishment early', d: 'Gas & electricity abolishment (full meter removal, not just disconnect) via AusNet portal — typical 4–8 weeks, can blow out; this is the most common pre-demolition delay.' },
  { n: 6, t: 'Demolition approvals', d: 'Section 29A report & consent from Knox (statutory 15 business days, valid 12 months) + demolition building permit + Knox asset protection permit ($350) + pre-works condition inspection.' },
  { n: 7, t: 'Demolish', d: 'Licensed asbestos removal first (1978 house — assume eaves/wet-area sheeting), then 1–3 weeks demolition incl. slab and crossover. Keep site fenced.' },
  { n: 8, t: 'Build (12–15 months)', d: 'Base → frame → lock-up → fixing → completion. Independent stage inspections recommended (~$600–900 each ×4). Pay only on certified stages.' },
  { n: 9, t: 'Occupancy & finish', d: 'Occupancy permit, then driveway/crossover to Knox spec, boundary fencing (half-share), plain turf. Move in.' },
];

// ---------- sources ----------
const SOURCES = [
  { k: 'Lot geometry & area (678.9 m²)', v: 'Vicmap parcel_view WFS (opendata.maps.vic.gov.au), parcel PFI 3393075, GDA2020' },
  { k: 'Zone NRZ4 / no overlays', v: 'Vicmap plan_zone & plan_overlay WFS point query; confirmed by CoreLogic property record' },
  { k: 'NRZ4 schedule text', v: 'Knox Planning Scheme 32.09-s4 via api.app.planning.vic.gov.au (VC282 consolidation, Sep 2025)' },
  { k: 'Clause 32.09 (permit trigger 300 m², 9 m / 2-storey mandatory height, 35 % garden area)', v: 'Knox Planning Scheme Cl. 32.09 current text (amendments VC282/VC288/VC300, 2025–26)' },
  { k: 'Garden-area definition & inclusions', v: 'Building Regulations 2018 reg 76A; DTP Planning Practice Note 84 (Dec 2023)' },
  { k: 'Siting standards', v: 'Building Regulations 2018 Part 5 — regs 73–80 & Schedule 6 item 35 (Knox NRZ listed), version 029 as at 1 May 2026' },
  { k: 'Existing house & sale history', v: 'CoreLogic / propertyvalue.com.au record: 678 m², Lot 36 LP117445, 4 bed, sold $58,220 on 23 Feb 1978; AVM $1.2–1.3 M (8 Jun 2026)' },
  { k: 'Demolition & asbestos costs', v: 'Melbourne demolition cost guides 2025-26 (MD Demolition, Varcon, All Gone): BV $55–85/m², asbestos +$5–15k' },
  { k: 'Build rates', v: 'Volume $2,100–3,600/m², custom $2,700–5,500/m² (Melbourne KDR guides 2026); AIQS BCI Mar-2026 medium 2-storey $3,289/m² inc GST; RLB +4.0 % 2026 escalation' },
  { k: 'Knox fees', v: 'Knox City Council FY2025-26: asset protection $350, stormwater report $240.65, road opening $325' },
  { k: 'Progress payments & insurance', v: 'Domestic Building Contracts Act 1995 (Vic) s.40; DBI threshold $16,000 (consumer.vic.gov.au)' },
  { k: '7-star energy', v: 'NCC 2022 in VIC from 1 May 2024 — 7★ NatHERS + WoH 60; HIA cost impact ≈ $3,700 (Melbourne)' },
  { k: 'S.29A & utility timeframes', v: 'Building Act 1993 s.29A — 15 business days; AusNet abolishment 4–8 weeks (2025-26 guidance)' },
  { k: 'Sales comparables & market', v: 'CoreLogic via propertyvalue/onthehouse; Barry Plant & Domain street records (2022–2025)' },
];

const DISCLAIMER = 'Concept study only — not architectural, planning, legal or financial advice. Costs are indicative 2026 ranges; obtain fixed quotes. Setback to adjoining dwellings and slab class require a licensed feature survey and soil report. Verify all planning data against a current Planning Property Report and title before committing.';
