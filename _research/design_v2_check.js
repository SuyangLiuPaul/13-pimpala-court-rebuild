// v2 footprint: east wing u0-12.4, west wing u12.4-19.0 (corner-lot: 2.0m side-street setback)
const LOT = [[15.05,15.76],[8.54,-15.65],[3.96,-14.98],[-3.7,-13.65],[-11.26,-11.77],[-12.58,-11.43],[-15.14,-6.55],[-7.92,13.76],[15.05,15.76]];
const FRONT=[[1,2],[2,3],[3,4],[4,5]], SPLAY=[[5,6]], WEST=[[6,7]], EAST=[[0,1]], REAR=[[7,0]];
const ALL=[];for(let i=0;i<8;i++)ALL.push([i,i+1]);
const ORIG=[8.99,-7.57], uIn=[-0.979,0.203], vIn=[0.203,0.979];
const hp=(u,v)=>[ORIG[0]+u*uIn[0]+v*vIn[0], ORIG[1]+u*uIn[1]+v*vIn[1]];
function pip(p,poly){let c=false;for(let i=0,j=poly.length-2;i<poly.length-1;j=i++){const[xi,yi]=poly[i],[xj,yj]=poly[j];
  if(((yi>p[1])!=(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi))c=!c;}return c;}
function dseg(p,a,b){const t=Math.max(0,Math.min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/((b[0]-a[0])**2+(b[1]-a[1])**2)));
  return Math.hypot(p[0]-(a[0]+t*(b[0]-a[0])),p[1]-(a[1]+t*(b[1]-a[1])));}
const md=(p,E)=>Math.min(...E.map(([i,j])=>dseg(p,LOT[i],LOT[j])));
function audit(name,rect){
  const pts=[hp(rect[0],rect[1]),hp(rect[2],rect[1]),hp(rect[2],rect[3]),hp(rect[0],rect[3])];
  let m={front:1e9,splay:1e9,west:1e9,east:1e9,rear:1e9,inside:true};
  for(let e=0;e<4;e++){const a=pts[e],b=pts[(e+1)%4],L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let s=0;s<=L;s+=.3){const p=[a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L];
      if(!pip(p,LOT))m.inside=false;
      m.front=Math.min(m.front,md(p,FRONT));m.splay=Math.min(m.splay,md(p,SPLAY));
      m.west=Math.min(m.west,md(p,WEST));m.east=Math.min(m.east,md(p,EAST));m.rear=Math.min(m.rear,md(p,REAR));}}
  console.log(name,'inside:',m.inside,'| front(Benwerrin)',m.front.toFixed(2),'| splay',m.splay.toFixed(2),'| west(Pimpala)',m.west.toFixed(2),'| east',m.east.toFixed(2),'| rear',m.rear.toFixed(2));
  console.log('  corners:',pts.map(p=>'['+p.map(n=>+n.toFixed(2)).join(',')+']').join(', '));
  return pts;
}
const E=audit('EAST wing 12.4x18.5',[0,0,12.4,18.5]);
const W=audit('WEST wing 6.6x14.0',[12.4,2.5,19.0,16.5]);
// areas
const A=12.4*18.5+6.6*14.0, LOTA=678.9, DRIVE=50, PAVED=46;
const GAR=6.6*6.1, ALF=6.6*3.6, PORCH=7.0;
const upper=(12.4-0.8)*18.5-15+6.6*6.6;
console.log('--- v2 numbers ---');
console.log('footprint',A.toFixed(1),'| coverage',(A/LOTA*100).toFixed(1),'% | garden',((LOTA-A-DRIVE)/LOTA*100).toFixed(1),'% =',(LOTA-A-DRIVE).toFixed(1),'m2 | perm',((LOTA-A-DRIVE-PAVED)/LOTA*100).toFixed(1),'%');
console.log('garage',GAR.toFixed(1),'alfresco',ALF.toFixed(1),'porch',PORCH);
console.log('upper',upper.toFixed(1),'| total',(A+upper).toFixed(1),'m2 =',((A+upper)/9.2903).toFixed(1),'sq | living',(A+upper-GAR-ALF-PORCH).toFixed(1));
