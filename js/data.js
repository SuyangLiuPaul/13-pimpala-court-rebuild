// ============================================================
// 13 Pimpala Court Wantirna — project dataset (researched June 2026)
// v3: corner-lot corrected (Pimpala Ct west = side street 2.0 m,
// Benwerrin Dr south = front), POS-compliant NE rear yard.
// Numbers only — translated text lives in js/i18n.js.
// ============================================================

const PROPERTY = {
  address: '13 Pimpala Court, Wantirna VIC 3152',
  lotPlan: 'Lot 36 LP117445',
  lotArea: 678.9,
  eastBoundary: 32.08, westBoundary: 21.56, rearBoundary: 23.05, splay: 5.51, frontage: 21.5,
  avm: { low: 1200000, high: 1300000, date: '2026-06-08' },
  comparables: [
    { addr: '11 Pimpala Ct (776 m²)', price: '$1,121,000', date: '2025-04' },
    { addr: '2 Pimpala Ct (679 m²)', price: '$1,000,000', date: '2024-02' },
    { addr: '9 Pimpala Ct (658 m²)', price: '$1,090,000', date: '2022-04' },
    { addr: '1 Pimpala Ct', price: '$1,180,000', date: '2022-04' },
  ],
};

const DESIGN = {
  beds: 5, baths: 4.5, cars: 2, squares: 54.4,
  areas: {
    groundRoofed: 290.8,        // incl. garage 40.3, alfresco 23.8, porch 7.0
    upper: 215.0,
    totalUnderRoof: 505.8,
    internalLiving: 434.7,
    garage: 40.3, alfresco: 23.8, porch: 7.0,
    driveway: 50, openPaving: 46,
    gardenArea: 338.1, gardenPct: 49.8,
    coveragePct: 42.8, permeabilityPct: 43.0,
    seclusionYard: 48.9,        // NE secluded POS, 12.4 × 3.9 m, north-facing
  },
  envelope: {
    eastWing: { w: 12.4, d: 16.0 },
    westWing: { w: 6.6, d: 14.0 },
    ridge: 8.46, groundCeiling: 2.74, upperCeiling: 2.59, roofPitch: 22.5,
  },
  footprintXY: {
    east: [[8.99, -7.57], [-3.15, -5.05], [0.10, 10.61], [12.24, 8.09]],
    west: [[-2.64, -2.61], [-9.10, -1.27], [-6.26, 12.44], [0.20, 11.10]],
  },
  setbacks: { front: 8.06, sideStreet: 2.0, east: 1.2, rearYard: 3.9, westWingRear: 1.46 },
};

const COSTS = {
  rows: [
    { id: 'demo', low: 35000, high: 55000 },
    { id: 'utility', low: 1500, high: 3500 },
    { id: 'surveys', low: 4500, high: 7500 },
    { id: 's29a', low: 1200, high: 2500 },
    { id: 'permit', low: 5500, high: 9500 },
    { id: 'knox', low: 600, high: 900 },
    { id: 'build', low: 1165000, high: 1415000 },
    { id: 'custom', low: 1470000, high: 1820000, alt: true },
    { id: 'sitecosts', low: 35000, high: 70000 },
    { id: 'driveway', low: 18000, high: 30000 },
    { id: 'fencing', low: 9000, high: 16000 },
    { id: 'flooring', low: 30000, high: 48000 },
    { id: 'contingency', low: 100000, high: 135000 },
  ],
  totals: { low: 1405300, high: 1792900 },
  paymentStages: [5, 10, 15, 35, 25, 10],
};

const TIMELINE_BARS = [
  { start: 0, dur: 1.5 }, { start: 1, dur: 2 }, { start: 1.5, dur: 3.5 }, { start: 4.5, dur: 1 },
  { start: 5, dur: 2.5 }, { start: 7.5, dur: 1 }, { start: 8.5, dur: 2 }, { start: 10.5, dur: 2.5 },
  { start: 13, dur: 3.5 }, { start: 16.5, dur: 3.5 }, { start: 20, dur: 1.5 }, { start: 21.5, dur: 1.5 },
];
const TIMELINE_TOTAL = 23;
