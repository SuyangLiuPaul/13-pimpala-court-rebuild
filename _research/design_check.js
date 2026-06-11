// Design + compliance check for the proposed dwelling on the real cadastral lot.
// Lot polygon in local metres (origin = lot centroid, +x east, +y north).
const LOT = [[15.05,15.76],[8.54,-15.65],[3.96,-14.98],[-3.7,-13.65],[-11.26,-11.77],[-12.58,-11.43],[-15.14,-6.55],[-7.92,13.76],[15.05,15.76]];
const AREA_LOT = 678.9;

function ringArea(pts){let a=0;for(let i=0;i<pts.length-1;i++)a+=pts[i][0]*pts[i+1][1]-pts[i+1][0]*pts[i][1];return Math.abs(a)/2;}

// House grid: rotated so facade is parallel to the front chord.
// Front chord vertex1->vertex5: bearing of perpendicular (house "north" v-axis):
const v1=[8.54,-15.65], v5=[-12.58,-11.43];
const chord=[v5[0]-v1[0], v5[1]-v1[1]];
const chordLen=Math.hypot(chord[0],chord[1]);
const theta=Math.atan2(chord[1],chord[0]); // angle of facade direction (u-axis)
console.log('facade chord length', chordLen.toFixed(2),'m, angle', (theta*180/Math.PI).toFixed(1),'deg');
// u-axis along chord (pointing WNW->ESE flipped): use unit vectors
const ux=[Math.cos(theta),Math.sin(theta)];        // along facade (towards west-north-west)
const vx=[-Math.sin(theta),Math.cos(theta)];       // depth direction (towards rear)
// House origin: set at a point near front-east corner of envelope.
// Place origin O so that house local (u,v): u 0..21 from EAST side going WEST, v 0..16.4 front..rear
// Start from v1 (front-east lot corner), move inland: front setback 7.5m along vx, side setback 1.0m from east boundary.
// East boundary direction (vertex0->vertex1):
const e0=[15.05,15.76];
const eDir=[(v1[0]-e0[0])/32.08,(v1[1]-e0[1])/32.08]; // pointing south along east bdy
// Inward normal of east boundary (points west into lot):
const eN=[-( -eDir[1] ), -( eDir[0] )]; // rotate eDir by +90: ( -dy, dx )
const eNorm=[ -eDir[1], eDir[0] ];
// determine sign: centroid is at origin(0,0); from midpoint of east bdy, inward should head to origin
const eMid=[(e0[0]+v1[0])/2,(e0[1]+v1[1])/2];
let inw=[ -eDir[1], eDir[0] ];
if ((0-eMid[0])*inw[0]+(0-eMid[1])*inw[1] < 0) inw=[eDir[1],-eDir[0]];
console.log('east boundary inward normal', inw.map(n=>n.toFixed(3)).join(','));

// House origin = v1 + 7.5*vxIn + 1.0*inw  where vxIn is depth dir (towards rear = roughly north-ish)
// Check vx points to rear: rear centroid y ~ +14 → vx should have +y.
const vIn = (vx[1]>0)? vx : [-vx[0],-vx[1]];
const uIn = (ux[0]<0)? ux : [-ux[0],-ux[1]]; // u goes from east side towards west
const O=[ v1[0] + 7.5*vIn[0] + 1.2*inw[0], v1[1] + 7.5*vIn[1] + 1.2*inw[1] ];
console.log('house origin (front-east corner):', O.map(n=>n.toFixed(2)).join(','));

const W=20.6, D=16.2;   // house envelope width x depth (roofed incl garage + alfresco + porch zone)
function hp(u,v){ return [O[0]+u*uIn[0]+v*vIn[0], O[1]+u*uIn[1]+v*vIn[1]]; }
// envelope corners
const env=[hp(0,0),hp(W,0),hp(W,D),hp(0,D),hp(0,0)];
console.log('envelope corners:'); env.slice(0,4).forEach(p=>console.log(' ',p.map(n=>n.toFixed(2)).join(',')));

// point-in-polygon + distance checks for the envelope vs lot
function pip(p,poly){let c=false;for(let i=0,j=poly.length-2;i<poly.length-1;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if(((yi>p[1])!=(yj>p[1])) && (p[0] < (xj-xi)*(p[1]-yi)/(yj-yi)+xi)) c=!c;}return c;}
function distToSeg(p,a,b){const t=Math.max(0,Math.min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/((b[0]-a[0])**2+(b[1]-a[1])**2)));
  return Math.hypot(p[0]-(a[0]+t*(b[0]-a[0])), p[1]-(a[1]+t*(b[1]-a[1])));}
function minDistToBoundary(p){let m=1e9;for(let i=0;i<LOT.length-1;i++)m=Math.min(m,distToSeg(p,LOT[i],LOT[i+1]));return m;}

let ok=true;
for(const p of env.slice(0,4)){
  const inside=pip(p,LOT), d=minDistToBoundary(p).toFixed(2);
  console.log('corner',p.map(n=>n.toFixed(1)).join(','),'inside:',inside,'min dist to bdy:',d);
  if(!inside) ok=false;
}
// sample edges every 1m for containment & clearance
const clearances=[];
for(let e=0;e<4;e++){
  const a=env[e],b=env[e+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
  let minc=1e9;
  for(let s=0;s<=L;s+=0.5){const p=[a[0]+(b[0]-a[0])*s/L, a[1]+(b[1]-a[1])*s/L];
    if(!pip(p,LOT)){ok=false;console.log('OUTSIDE at edge',e,'s=',s.toFixed(1));break;}
    minc=Math.min(minc,minDistToBoundary(p));}
  clearances.push(minc);
  console.log('edge',e,['front','east?','rear','west?'][e]||'','len',L.toFixed(1),'min clearance',minc.toFixed(2),'m');
}
console.log('envelope fully inside lot:',ok);
console.log('envelope area:',ringArea(env).toFixed(1),'m2');

// Areas (m2) for compliance:
const GARAGE=41.0, ALFRESCO=18.0, PORCH=7.0;
const clipSW=10.0;            // splay-corner clip taken out of envelope (SW)
const clipFrontEast=9.0;      // facade articulation recess front-east
const ROOFED = ringArea(env) - clipSW - clipFrontEast;   // total roofed footprint (site coverage)
const UPPER = 252;            // upper floor area (within roofed footprint, 2.0m+ side setbacks)
const DRIVE = 52;             // driveway+apron to garage (impermeable, NOT garden)
const PAVED_OPEN = 46;        // unroofed paved terrace+paths (<800mm, impermeable BUT counts as garden)
const cover = ROOFED/AREA_LOT*100;
const garden = (AREA_LOT - ROOFED - DRIVE)/AREA_LOT*100;
const permeable = (AREA_LOT - ROOFED - DRIVE - PAVED_OPEN)/AREA_LOT*100;
const internalGround = ROOFED - GARAGE - ALFRESCO - PORCH;
console.log('--- COMPLIANCE ---');
console.log('roofed footprint:', ROOFED.toFixed(1),'m2 | site coverage:',cover.toFixed(1),'% (max 60) ',cover<=60?'PASS':'FAIL');
console.log('garden area:', (AREA_LOT-ROOFED-DRIVE).toFixed(1),'m2 =',garden.toFixed(1),'% (min 35) ',garden>=35?'PASS':'FAIL');
console.log('permeability:', permeable.toFixed(1),'% (min 20) ',permeable>=20?'PASS':'FAIL');
console.log('ground internal:',internalGround.toFixed(1),'m2 | upper:',UPPER,'m2');
console.log('total under roof:',(ROOFED+UPPER).toFixed(0),'m2 =',((ROOFED+UPPER)/9.2903).toFixed(1),'squares');
console.log('total living (excl garage/alfresco/porch):',(internalGround+UPPER).toFixed(0),'m2');
// side setbacks: ground wall height ~3.4m -> need 1.0m; upper wall top ~6.6m -> 1.0+0.3*(6.6-3.6)=1.9m
console.log('ground side clearance needed 1.0m, achieved:',Math.min(...clearances).toFixed(2));
console.log('upper side setback needed 1.9m (wall 6.6m): upper inset 2.0m from ground walls => OK by design');
