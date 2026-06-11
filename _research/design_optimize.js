// Search for the largest compliant rectangular envelope (with SW clip) on the lot.
const LOT = [[15.05,15.76],[8.54,-15.65],[3.96,-14.98],[-3.7,-13.65],[-11.26,-11.77],[-12.58,-11.43],[-15.14,-6.55],[-7.92,13.76],[15.05,15.76]];
const AREA_LOT = 678.9;
const FRONT_EDGES = [[1,2],[2,3],[3,4],[4,5],[5,6]]; // front curve + splay (lot vertex idx)
const REAR_EDGE = [7,0];

function pip(p,poly){let c=false;for(let i=0,j=poly.length-2;i<poly.length-1;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if(((yi>p[1])!=(yj>p[1])) && (p[0] < (xj-xi)*(p[1]-yi)/(yj-yi)+xi)) c=!c;}return c;}
function distToSeg(p,a,b){const t=Math.max(0,Math.min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/((b[0]-a[0])**2+(b[1]-a[1])**2)));
  return Math.hypot(p[0]-(a[0]+t*(b[0]-a[0])), p[1]-(a[1]+t*(b[1]-a[1])));}
function minDist(p, edges){let m=1e9;for(const [i,j] of edges)m=Math.min(m,distToSeg(p,LOT[i],LOT[j]));return m;}
const ALL_EDGES=[];for(let i=0;i<LOT.length-1;i++)ALL_EDGES.push([i,i+1]);
const SIDE_EDGES=[[0,1],[6,7]]; // east bdy, west bdy
const SPLAY=[[5,6]];

// orientation: along east boundary
const e0=LOT[0], e1=LOT[1];
const eL=Math.hypot(e1[0]-e0[0],e1[1]-e0[1]);
const vDir=[(e0[0]-e1[0])/eL,(e0[1]-e1[1])/eL];    // depth dir: front->rear (towards NE corner)
const uDir=[vDir[1],-vDir[0]];                      // facade dir rotate -90 => points west? check
// ensure uDir points west (negative x):
const uIn = uDir[0]<0? uDir : [-uDir[0],-uDir[1]];
console.log('vDir',vDir.map(n=>n.toFixed(3)).join(','),'uIn',uIn.map(n=>n.toFixed(3)).join(','));

function envelope(o,W,D){
  const hp=(u,v)=>[o[0]+u*uIn[0]+v*vDir[0], o[1]+u*uIn[1]+v*vDir[1]];
  return [hp(0,0),hp(W,0),hp(W,D),hp(0,D),hp(0,0)];
}
function check(env){
  // sample all edges, return {inside, minSide, minFront(face0), minRear(face2), minAll}
  const res={inside:true,minAll:1e9,front:1e9,rear:1e9};
  for(let e=0;e<4;e++){
    const a=env[e],b=env[e+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let s=0;s<=L;s+=0.4){
      const p=[a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L];
      if(!pip(p,LOT)){res.inside=false;return res;}
      res.minAll=Math.min(res.minAll,minDist(p,ALL_EDGES));
      if(e===0)res.front=Math.min(res.front,minDist(p,FRONT_EDGES));
      if(e===2)res.rear=Math.min(res.rear,minDist(p,[REAR_EDGE]));
    }
  }
  return res;
}
// grid search: origin = LOT[1] (front-east corner) + f*vDir + s*uIn ; W,D
let best=null;
for(let f=7.4; f<=9.0; f+=0.2){
  for(let s=1.0; s<=2.4; s+=0.2){
    const o=[LOT[1][0]+f*vDir[0]+s*uIn[0], LOT[1][1]+f*vDir[1]+s*uIn[1]];
    for(let W=22.0; W>=18.0; W-=0.2){
      for(let D=17.0; D>=14.0; D-=0.2){
        const env=envelope(o,W,D);
        const r=check(env);
        if(!r.inside) continue;
        if(r.minAll<1.0) continue;        // reg79 ground walls >=1.0m everywhere
        if(r.front<7.3) continue;         // assumed street setback (avg of adjoining ~7.5m)
        if(r.rear<3.5) continue;          // keep usable rear garden strip
        const A=W*D;
        if(!best || A>best.A) best={A,W,D,f,s,env,r};
      }
    }
  }
}
if(!best){console.log('no solution');process.exit(1);}
console.log('BEST: W',best.W.toFixed(1),'D',best.D.toFixed(1),'area',best.A.toFixed(1),
  'frontSet',best.f,'eastSet',best.s,'minAll',best.r.minAll.toFixed(2),'front',best.r.front.toFixed(2),'rear',best.r.rear.toFixed(2));
console.log('corners:');best.env.slice(0,4).forEach(p=>console.log(' [',p[0].toFixed(2),',',p[1].toFixed(2),'],'));

// final compliance numbers with this envelope
const clipSW=12.0, clipFrontEast=8.0;
const ROOFED=best.A-clipSW-clipFrontEast;
const GARAGE=41.0, ALFRESCO=18.5, PORCH=7.0;
const UPPER=250, DRIVE=52, PAVED_OPEN=46;
const internalGround=ROOFED-GARAGE-ALFRESCO-PORCH;
const cover=ROOFED/AREA_LOT*100, garden=(AREA_LOT-ROOFED-DRIVE)/AREA_LOT*100,
      perm=(AREA_LOT-ROOFED-DRIVE-PAVED_OPEN)/AREA_LOT*100;
console.log('--- FINAL ---');
console.log('roofed',ROOFED.toFixed(1),'m2 cover',cover.toFixed(1),'% garden',garden.toFixed(1),'% perm',perm.toFixed(1),'%');
console.log('groundInternal',internalGround.toFixed(1),'upper',UPPER,'totalUnderRoof',(ROOFED+UPPER).toFixed(0),'m2 =',((ROOFED+UPPER)/9.2903).toFixed(1),'sq');
