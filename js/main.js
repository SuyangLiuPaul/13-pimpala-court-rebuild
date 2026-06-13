// ============================================================
// page wiring v3 — trilingual rendering, scrollspy, reveal, 3D boot
// ============================================================
const $ = s => document.querySelector(s);
const fmt = n => '$' + n.toLocaleString('en-AU');

// ---- language ----
let LANG = localStorage.getItem('pimpala-lang');
if (!LANG) {
  const nl = (navigator.language || 'en').toLowerCase();
  LANG = nl.startsWith('zh') ? (nl.includes('tw') || nl.includes('hk') || nl.includes('hant') ? 'tw' : 'zh') : 'en';
}

function renderAll() {
  const L = I18N[LANG];
  document.documentElement.lang = LANG === 'en' ? 'en' : (LANG === 'tw' ? 'zh-Hant' : 'zh-Hans');
  document.title = L.title;

  // nav
  $('#navLinks').innerHTML = Object.entries(L.nav).map(([k, v]) => `<a href="#${k}" data-sec="${k}">${v}</a>`).join('');
  // language toggle — rendered into both the nav and the always-visible top-right float
  const langBtns = ['en', 'zh', 'tw'].map(l =>
    `<button class="lang ${l === LANG ? 'active' : ''}" data-lang="${l}">${I18N[l].langName}</button>`).join('');
  ['#langSwitch', '#langFloat'].forEach(sel => { const el = $(sel); if (el) el.innerHTML = langBtns; });
  document.querySelectorAll('#langSwitch .lang, #langFloat .lang').forEach(b => b.addEventListener('click', () => {
    LANG = b.dataset.lang; localStorage.setItem('pimpala-lang', LANG); renderAll();
  }));

  // hero
  $('#heroSubtitle').textContent = L.hero.subtitle;
  $('#heroHint').innerHTML = L.hero.hint;
  $('#viewBtns').innerHTML = Object.entries(L.hero.views).map(([k, v], i) =>
    `<button class="hbtn ${i === 0 ? 'active' : ''}" data-view3d="${k}">${v}</button>`).join('') +
    `<button class="hbtn" id="roofBtn">${L.hero.roofHide}</button>` +
    `<button class="hbtn" id="rotBtn">${L.hero.rotate}</button>` +
    `<button class="hbtn zoom" id="zoomIn" aria-label="zoom in">＋</button>` +
    `<button class="hbtn zoom" id="zoomOut" aria-label="zoom out">－</button>`;
  $('#sunTag').textContent = L.hero.sun;
  if (L.hero.now) $('#nowBtn').textContent = L.hero.now;
  $('#sunNote').textContent = L.hero.sunNote;
  $('#scrollCue').textContent = '▼ ' + L.hero.scroll;
  $('#statbar').innerHTML = L.hero.stats.map(s => `<div><b>${s[0]}</b><span>${s[1]}</span></div>`).join('');

  // 01 site
  $('#siteKicker').textContent = L.site.kicker;
  $('#siteH2').textContent = L.site.h2;
  $('#siteLede').textContent = L.site.lede;
  $('#factsTitle').textContent = L.site.factsTitle;
  $('#factList').innerHTML = L.site.facts.map(r =>
    `<div class="factrow"><span class="k">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('');
  $('#compTitle').textContent = L.site.compTitle;
  $('#compList').innerHTML = PROPERTY.comparables.map(c =>
    `<div class="factrow"><span class="k">${c.addr}</span><span class="v">${c.price} · ${c.date}</span></div>`).join('');
  $('#marketLine').textContent = L.site.market;

  // 02 rules
  $('#rulesKicker').textContent = L.rules.kicker;
  $('#rulesH2').textContent = L.rules.h2;
  $('#rulesLede').textContent = L.rules.lede;
  $('#rulesTable thead').innerHTML = `<tr>${L.rules.head.map((h, i) => `<th${i === 1 ? ' style="width:40%"' : ''}>${h}</th>`).join('')}</tr>`;
  $('#rulesTable tbody').innerHTML = L.rules.rows.map(r => `
    <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
    <td><span class="badge pass">${L.rules.pass}</span></td></tr>`).join('');

  // 03 design
  $('#designKicker').textContent = L.design.kicker;
  $('#designH2').textContent = L.design.h2;
  $('#designLede').textContent = L.design.lede;
  $('#coverageTitle').textContent = L.design.coverageTitle;
  $('#coverageBody').textContent = L.design.coverageBody;
  $('#accomTitle').textContent = L.design.accomTitle;
  $('#accomList').innerHTML = L.design.accom.map(i => `<li>${i}</li>`).join('');
  $('#areasTitle').textContent = L.design.areasTitle;
  const a = DESIGN.areas, al = L.design.areaLabels;
  $('#areaList').innerHTML = [
    [al.ground, a.groundRoofed + ' m²'],
    [al.breakdown, `${a.garage} / ${a.alfresco} / ${a.porch} m²`],
    [al.upper, a.upper + ' m²'],
    [al.total, `${a.totalUnderRoof} m² · ${DESIGN.squares} sq`],
    [al.living, a.internalLiving + ' m²'],
    [al.driveway, a.driveway + ' m²'],
    [al.garden, `${a.gardenArea} m² = ${a.gardenPct} %`],
    [al.yard, `${a.seclusionYard} m² (12.4 × 3.9 m)`],
    [al.coverage, a.coveragePct + ' % / 60 %'],
    [al.perm, a.permeabilityPct + ' % / ≥20 %'],
    [al.ridge, DESIGN.envelope.ridge + ' m / ≤9 m'],
  ].map(r => `<div class="factrow"><span class="k">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('');
  $('#exclTitle').textContent = L.design.exclTitle;
  $('#exclList').innerHTML = L.design.excl.map(i => `<li>${i}</li>`).join('');
  $('#exclNote').textContent = L.design.exclNote;

  // 04 plans
  $('#plansKicker').textContent = L.plans.kicker;
  $('#plansH2').textContent = L.plans.h2;
  $('#roomNote').textContent = L.plans.roomNote;
  drawSitePlan($('#sitePlan'));
  drawFloorPlan($('#groundPlan'), GROUND_ROOMS, GROUND_WINGS, L.plans.groundTitle, L.plans.groundCaption);
  drawFloorPlan($('#upperPlan'), UPPER_ROOMS, UPPER_WINGS, L.plans.upperTitle, L.plans.upperCaption);

  // 05 costs
  $('#costsKicker').textContent = L.costs.kicker;
  $('#costsH2').textContent = L.costs.h2;
  $('#costLede').textContent = L.costs.lede;
  $('#costTable thead').innerHTML = `<tr><th>${L.costs.head[0]}</th><th class="num">${L.costs.head[1]}</th><th class="num">${L.costs.head[2]}</th><th>${L.costs.head[3]}</th></tr>`;
  $('#costTable tbody').innerHTML = COSTS.rows.map(r => {
    const t = L.costs.rows[r.id];
    return `<tr class="${r.alt ? 'alt' : ''}"><td>${t[0]}</td>
      <td class="num">${fmt(r.low)}</td><td class="num">${fmt(r.high)}</td>
      <td class="small muted">${t[1]}</td></tr>`;
  }).join('');
  $('#costTable tfoot').innerHTML = `
    <tr><td>${L.costs.totalLabel}</td>
    <td class="num">${fmt(COSTS.totals.low)}</td><td class="num">${fmt(COSTS.totals.high)}</td>
    <td class="small">≈ ${fmt(Math.round(COSTS.totals.low / DESIGN.areas.totalUnderRoof / 10) * 10)}–${fmt(Math.round(COSTS.totals.high / DESIGN.areas.totalUnderRoof / 10) * 10)} ${L.costs.totalNote}</td></tr>`;
  $('#payTitle').textContent = L.costs.payTitle;
  $('#payments').innerHTML = '';
  const bar = document.createElement('div'); bar.className = 'paybar';
  COSTS.paymentStages.forEach((pct, i) => {
    const seg = document.createElement('div');
    seg.className = 'payseg'; seg.style.flex = pct;
    seg.innerHTML = `<b>${pct}%</b><span>${L.costs.payStages[i]}</span>`;
    bar.appendChild(seg);
  });
  $('#payments').appendChild(bar);
  const pn = document.createElement('p'); pn.className = 'small muted'; pn.textContent = L.costs.payNote;
  $('#payments').appendChild(pn);
  $('#feasTitle').textContent = L.costs.feasTitle;
  $('#feasibility').textContent = L.costs.feasibility;

  // 06 timeline
  $('#tlKicker').textContent = L.timeline.kicker;
  $('#tlH2').textContent = L.timeline.h2;
  $('#tlLede').textContent = L.timeline.lede;
  drawGantt($('#gantt'), L.timeline.phases.map(p => p[0]), L.timeline.caption);
  $('#tlDetails').innerHTML = L.timeline.phases.map((p, i) =>
    `<div class="factrow"><span class="k">${String(i + 1).padStart(2, '0')} · ${p[0]}</span><span class="v" style="text-align:right">${p[1]}</span></div>`).join('');

  // 07 process
  $('#procKicker').textContent = L.process.kicker;
  $('#procH2').textContent = L.process.h2;
  $('#stepList').innerHTML = L.process.steps.map((s, i) => `
    <div class="step reveal"><div class="n">${String(i + 1).padStart(2, '0')}</div>
    <div><h4>${s[0]}</h4><p>${s[1]}</p></div></div>`).join('');

  // 08 sources
  $('#srcKicker').textContent = L.sources.kicker;
  $('#srcH2').textContent = L.sources.h2;
  $('#srcList').innerHTML = SOURCES.map(s =>
    `<div class="srcrow"><b>${s.k}</b><span>${s.v}</span></div>`).join('');
  $('#disclaimer').textContent = L.sources.disclaimer;
  $('#footerLine').innerHTML = L.footer;

  // 3D HUD buttons are recreated on every render — re-bind and restore state
  bindHudButtons();
  if (typeof renderer !== 'undefined' && renderer) {
    document.querySelectorAll('[data-view3d]').forEach(x => x.classList.toggle('active', x.dataset.view3d === view));
    $('#roofBtn').textContent = roofOn ? L.hero.roofHide : L.hero.roofShow;
    $('#rotBtn').classList.toggle('active', autoRot);
  }
  hookReveal();
}

// ---- scrollspy ----
function hookSpy() {
  const secs = ['site', 'rules', 'design', 'plans', 'costs', 'timeline', 'process', 'sources'];
  const obs = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      document.querySelectorAll('#navLinks a').forEach(a =>
        a.classList.toggle('active', a.dataset.sec === e.target.id));
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  secs.forEach(id => { const s = document.getElementById(id); if (s) obs.observe(s); });
}

// ---- reveal on scroll ----
let revealObs;
function hookReveal() {
  if (!revealObs) {
    revealObs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
    }), { threshold: .08 });
  }
  document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObs.observe(el));
}

// ---- boot ----
// each step is isolated so a failure in one (e.g. WebGL/3D on a constrained
// device) never leaves the language toggle or the HUD controls unbound.
function safe(label, fn) { try { fn(); } catch (e) { console.error('[boot] ' + label, e); } }
safe('renderAll', renderAll);
safe('initScene', initScene);
safe('bindCanvasControls', bindCanvasControls);
safe('hookSpy', hookSpy);
