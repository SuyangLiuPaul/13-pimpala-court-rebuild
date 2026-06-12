# 13 Pimpala Court, Wantirna — Knockdown-Rebuild Study

An interactive, fully-researched feasibility study for demolishing the existing 1978
brick-veneer house at 13 Pimpala Court, Wantirna VIC 3152 and building the largest
compliant two-storey home the rules allow — **no pool, no landscaped garden, maximum house**.

## What's real here

- **Lot geometry** — drawn from the Victorian Government's Vicmap cadastre
  (parcel PFI 3393075, GDA2020), projected to local metres: **678.9 m²**, with the
  rear boundary facing true north.
- **Zoning** — NRZ4 (Knox), no overlays, verified by point query against the
  `plan_zone` / `plan_overlay` WFS layers and the current Knox Planning Scheme text
  (consolidated through amendments VC282/VC288/VC300, 2025–26).
- **Siting maths** — the L-shaped 63-square concept was solved against the actual
  parcel polygon: ≥1.0 m ground setbacks (reg 79), ≥7.4 m street setback (reg 74),
  49.9 % site coverage (60 % cap, reg 76), 42 % garden area (35 % mandatory minimum,
  reg 76A + clause 32.09-4), 8.65 m ridge (9 m mandatory NRZ cap).
- **Costs & timeline** — 2026 Melbourne ranges with sources listed on the page
  (AIQS BCI benchmark, demolition guides, Knox FY2025-26 fees, DBCA payment caps).

## Stack

Static site — no build step. Three.js (r128) renders the dwelling and the surveyed
site context; the floor plans, site plan and Gantt are generated SVG.

```
index.html
css/style.css
js/data_geometry.js   ← baked Vicmap/OSM geometry (local metres)
js/data.js            ← researched facts: rules, costs, timeline, sources
js/plans.js           ← SVG generators (site plan, floor plans, gantt)
js/site3d.js          ← Three.js scene
js/main.js            ← page wiring
_research/            ← reproducible scripts that produced the geometry + design
```

Run locally: any static server, e.g. `npx http-server .`

## Disclaimer

Concept study only — not architectural, planning, legal or financial advice.
Verify against a current Planning Property Report, feature survey and soil report.
Geometry © State of Victoria (Vicmap); road centrelines © OpenStreetMap contributors.

## v3 notes

- Corner-lot siting corrected from aerial + OSM survey: Pimpala Ct is the **west side street**
  (2.0 m setback), Benwerrin Dr the front; driveway re-uses the court access.
- Real neighbouring building footprints (OpenStreetMap, surveyed 2025) render in the
  3D street context and site plan; Pimpala court bowl modelled at the surveyed position.
- Trilingual UI: English / 简体 / 繁體 (auto-detects browser language, persists choice).
- Rendering is on-demand with cached shadow maps — near-zero GPU when idle.
