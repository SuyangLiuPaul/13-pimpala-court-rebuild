// Two-rectangle (L/T-shape) footprint optimizer in the east-boundary-aligned frame.
const LOT = [[15.05,15.76],[8.54,-15.65],[3.96,-14.98],[-3.7,-13.65],[-11.26,-11.77],[-12.58,-11.43],[-15.14,-6.55],[-7.92,13.76],[15.05,15.76]];
const AREA_LOT = 678.9;
const FRONT_EDGES=[[1,2],[2,3],[3,4],[4,5],[5,6]];
const ALL_EDGES=[];for(let i=0;i<LOT.length-1;i++)ALL_EDGES.push([i,i+1]);
function pip(p,poly){let c=false;for(let i=0,j=poly.length-2;i<poly.length-1;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if(((yi>p[1])!=(yj>p[1])) && (p[0] < (xj-xi)*(p[1]-yi)/(yj-yi)+xi)) c=!c;}return c;}
function distToSeg(p,a,b){const t=Math.max(0,Math.min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/((b[0]-a[0])**2+(b[1]-a[1])**2)));
  return Math.hypot(p[0]-(a[0]+t*(b[0]-a[0])), p[1]-(a[1]+t*(b[1]-a[1])));}
function minDist(p,edges){let m=1e9;for(const [i,j] of edges)m=Math.min(m,distToSeg(p,LOT[i],LOT[j]));return m;}

const e0=LOT[0], e1=LOT[1];
const eL=Math.hypot(e1[0]-e0[0],e1[1]-e0[1]);
const vDir=[(e0[0]-e1[0])/eL,(e0[1]-e1[1])/eL];
const uIn0=[vDir[1],-vDir[0]];
const uIn=uIn0[0]<0?uIn0:[-uIn0[0],-uIn0[1]];
const ORIG=LOT[1]; // front-east lot corner
const toXY=(u,v)=>[ORIG[0]+u*uIn[0]+v*vDir[0], ORIG[1]+u*uIn[1]+v*vDir[1]];

function rectOK(u0,v0,u1,v1,frontMin){ // rect in (u,v); returns {ok,minAll}
  const pts=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
  const segs=[[0,1],[1,2],[2,3],[3,0]];
  let minAll=1e9, front=1e9;
  for(const [i,j] of segs){
    const a=toXY(...pts[i]), b=toXY(...pts[j]);
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let s=0;s<=L;s+=0.4){
      const p=[a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L];
      if(!pip(p,LOT))return{ok:false};
      minAll=Math.min(minAll,minDist(p,ALL_EDGES));
      front=Math.min(front,minDist(p,FRONT_EDGES));
    }
  }
  return {ok:minAll>=1.0 && front>=frontMin, minAll, front};
}

// East block: hugs east bdy at u in [1.2, 1.2+We], from v=ve0 (>=front setback) depth De
// West block: u in [uw0, uw0+Ww], from v=vw0, depth Dw (garage wing, can sit closer to its frontage which is further north)
let best=null;
for(let We=9; We<=13; We+=0.5)
for(let De=15; De<=18.5; De+=0.5)
for(let ve0=8.0; ve0<=9.6; ve0+=0.4)
{
  const e=rectOK(1.2,ve0,1.2+We,ve0+De,7.3); if(!e.ok)continue;
  for(let Ww=7; Ww<=11; Ww+=0.5)
  for(let Dw=11; Dw<=16; Dw+=0.5)
  for(let vw0=10.5; vw0<=13.5; vw0+=0.5)
  {
    const uw0=1.2+We-0.01; // west block starts where east block ends (contiguous)
    const w=rectOK(uw0,vw0,uw0+Ww,vw0+Dw,7.3); if(!w.ok)continue;
    // union area (overlap only along the shared edge, so sum)
    const A=We*De+Ww*Dw;
    if(!best||A>best.A) best={A,We,De,ve0,Ww,Dw,vw0,uw0,e,w};
  }
}
if(!best){console.log('none');process.exit(1);}
console.log('EAST block: u 1.2..'+(1.2+best.We).toFixed(1),' v',best.ve0.toFixed(1),'..',(best.ve0+best.De).toFixed(1),' =',(best.We*best.De).toFixed(0),'m2  minAll',best.e.minAll.toFixed(2),'front',best.e.front.toFixed(2));
console.log('WEST block: u',best.uw0.toFixed(1),'..',(best.uw0+best.Ww).toFixed(1),' v',best.vw0.toFixed(1),'..',(best.vw0+best.Dw).toFixed(1),' =',(best.Ww*best.Dw).toFixed(0),'m2  minAll',best.w.minAll.toFixed(2),'front',best.w.front.toFixed(2));
console.log('TOTAL footprint:',best.A.toFixed(1),'m2');
// corners in site XY for the 3D/site plan:
console.log('east block XY:',[[1.2,best.ve0],[1.2+best.We,best.ve0],[1.2+best.We,best.ve0+best.De],[1.2,best.ve0+best.De]].map(p=>toXY(...p).map(n=>+n.toFixed(2))));
console.log('west block XY:',[[best.uw0,best.vw0],[best.uw0+best.Ww,best.vw0],[best.uw0+best.Ww,best.vw0+best.Dw],[best.uw0,best.vw0+best.Dw]].map(p=>toXY(...p).map(n=>+n.toFixed(2))));

const ROOFED=best.A;
const GARAGE=42, ALFRESCO=20, PORCH=7;
const UPPER=Math.round((best.A-60)*0.82);
const DRIVE=55, PAVED=46;
console.log('--- compliance ---');
console.log('cover',(ROOFED/AREA_LOT*100).toFixed(1),'% | garden',((AREA_LOT-ROOFED-DRIVE)/AREA_LOT*100).toFixed(1),'% | perm',((AREA_LOT-ROOFED-DRIVE-PAVED)/AREA_LOT*100).toFixed(1),'%');
console.log('ground internal',(ROOFED-GARAGE-ALFRESCO-PORCH).toFixed(0),'| upper ~',UPPER,'| total under roof',(ROOFED+UPPER).toFixed(0),'m2 =',((ROOFED+UPPER)/9.2903).toFixed(1),'sq');
