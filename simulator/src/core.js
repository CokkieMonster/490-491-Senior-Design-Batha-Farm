/* ===== shared greenhouse core (used by the simulator and the dataset generator) ===== */
const T = THREE;
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const smooth01 = v => { v=clamp(v,0,1); return v*v*(3-2*v); };

/* ---------- greenhouse layouts ---------- */
// Albatha: commercial tomato/cucumber hedges, 40 m rows.
// University: two 40 x 8 m arches (corrected length), 14 plots each (4.00 x 3.50 m), 1.00 m walkways between plots
// (email), 1.00 m central walkway, 3.00 m free at each end; line layout from drawings GH-02/GH-03 (24-10-2026).
const LAYOUTS = {
  albatha:  {key:'albatha',  name:'Albatha farm rows (40 m)', short:'Albatha rows', L:40, WALL:3.9, GUTTER:3.0, RIDGE:4.8, xMin:-1.6, xMax:41.6, seasonal:false},
  uniFruit: {key:'uniFruit', name:'University arch 1: fruit vegetables', short:'University fruit arch', L:40, WALL:4.0, GUTTER:2.6, RIDGE:4.2, xMin:0, xMax:40, seasonal:true},
  uniLeafy: {key:'uniLeafy', name:'University arch 2: leafy greens and herbs', short:'University leafy arch', L:40, WALL:4.0, GUTTER:2.6, RIDGE:4.2, xMin:0, xMax:40, seasonal:true},
};
let LAY = LAYOUTS.albatha, L = 40, WALL = 3.9, GUTTER = 3.0, RIDGE = 4.8;
let ROWS = [], LANES = [];
const roofY = z => GUTTER + (RIDGE-GUTTER)*Math.cos(Math.PI*clamp(z,-WALL,WALL)/(2*WALL));
const TOP_A = {tom:2.1, cuc:2.6}, HALF_A = {tom:0.42, cuc:0.38};
// season calendar: day 0 = 1 Nov 2026
const D0 = Date.UTC(2026,10,1);
const DAY_MAX = 216; // 5 Jun 2027
const dayToDate = d => new Date(D0 + Math.round(d)*86400000);
const dateToDay = dt => Math.round((dt.getTime()-D0)/86400000);
const fmtDay = d => dayToDate(d).toLocaleDateString('en-GB',{day:'numeric', month:'short', year:'numeric', timeZone:'UTC'});
// university plot geometry
const UNI = { plotW:4.0, plotD:3.5, path:1.0, end:3.0, walk:1.0, lineOff:0.44, lineGap:0.875 };
const plotX0 = p => UNI.end + p*(UNI.plotW+UNI.path);         // p = 0..6 along the arch
const lineZ = (side,k) => side*(WALL - UNI.lineOff - k*UNI.lineGap); // side +1 = Row A, -1 = Row B; k=0 is line 1 (side wall)
const plotName = (side,p) => 'Plot '+String(side>0? p+1 : p+8).padStart(2,'0');
const rowName = side => side>0? 'Row A' : 'Row B';

function setLayout(key){
  LAY = LAYOUTS[key]; L=LAY.L; WALL=LAY.WALL; GUTTER=LAY.GUTTER; RIDGE=LAY.RIDGE;
  ROWS = []; LANES = [];
  if (key==='albatha'){
    [{z:-3.0,type:'tom',name:'Tomato row 1'},{z:-1.8,type:'tom',name:'Tomato row 2'},{z:-0.6,type:'tom',name:'Tomato row 3'},
     {z:1.6,type:'cuc',name:'Cucumber row 1'},{z:2.8,type:'cuc',name:'Cucumber row 2'}]
      .forEach(r=>ROWS.push({x0:0, x1:L, z:r.z, hw:HALF_A[r.type], top:TOP_A[r.type], type:r.type, name:r.name, long:true}));
    LANES = [{z:-2.4,name:'Walkway A'},{z:-1.2,name:'Walkway B'},{z:0.5,name:'Main aisle'},{z:2.2,name:'Walkway C'}];
  } else {
    for (const side of [1,-1]){
      const names = key==='uniFruit' ? ['round tomato','cherry tomato','capsicum'] : ['baby kale','baby rocca','baby spinach'];
      const types = key==='uniFruit' ? ['round','cherry','pepper'] : ['kale','rocca','spinach'];
      for (let k=0;k<3;k++) ROWS.push({x0:UNI.end, x1:L-UNI.end, z:lineZ(side,k), hw: key==='uniFruit'? (k<2?0.3:0.3) : 0.3, top:0.05, type:types[k], name:`${rowName(side)} · ${names[k]} line`, long:true, side, k});
      for (let p=0;p<7;p++){ const x0=plotX0(p);
        if (key==='uniFruit'){
          ROWS.push({x0, x1:x0+2, z:lineZ(side,3), hw:0.3, top:0.05, type:'cuc', name:`${plotName(side,p)} · cucumbers`, side, k:3, p});
          ROWS.push({x0:x0+2, x1:x0+4, z:lineZ(side,3), hw:0.4, top:0.05, type:'zuc', name:`${plotName(side,p)} · zucchini`, side, k:3, p});
        } else {
          ROWS.push({x0, x1:x0+4, z:lineZ(side,3), hw:0.3, top:0.05, type:'herb', name:`${plotName(side,p)} · herbs`, side, k:3, p});
        }
      }
    }
    LANES = [{z:0,name:'Central walkway'},{z:2.25,name:'Over Row A'},{z:-2.25,name:'Over Row B'}];
  }
  ROWS.forEach((r,i)=>r.i=i);
  buildStructure();
}

let _seed = 490;
const setSeed = s => { _seed = s|0; };
const R = () => { _seed|=0; _seed=_seed+0x6D2B79F5|0; let t=Math.imul(_seed^_seed>>>15,1|_seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
const rr = (a,b) => a+(b-a)*R();

/* ---------- textures ---------- */
function cvs(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function tex(c, rep){ const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;} return t; }
function leafletPath(g, cx, cy, rx, ry, rot, teeth, toothDepth){
  g.save(); g.translate(cx,cy); g.rotate(rot); g.beginPath(); const n=teeth*2; const td=toothDepth===undefined?0.1:toothDepth;
  for(let i=0;i<=n;i++){ const a=i/n*Math.PI*2; const k=(i%2? 1.0:1-td);
    const tip = 1 - 0.2*Math.pow(Math.abs(Math.cos(a)),6);
    const x=Math.cos(a)*rx*k, y=Math.sin(a)*ry*k*tip; i? g.lineTo(x,y): g.moveTo(x,y); }
  g.closePath(); g.restore();
}
function veins(g, cx, cy, rx, ry, rot, col, n){
  g.save(); g.translate(cx,cy); g.rotate(rot); g.strokeStyle=col; g.lineWidth=2; g.beginPath(); g.moveTo(-rx*0.92,0); g.lineTo(rx*0.92,0); g.stroke();
  g.lineWidth=1; for(let i=-n;i<=n;i++){ if(!i) continue; const x=i*rx/(n+1); g.beginPath(); g.moveTo(x,0); g.lineTo(x+rx*0.18*Math.sign(i), ry*0.75); g.moveTo(x,0); g.lineTo(x+rx*0.18*Math.sign(i), -ry*0.75); g.stroke(); }
  g.restore();
}
// kind: 0..2 green variants, 3 yellowing, 4 dry
function tomatoLeafTex(variant, kind){
  const c=cvs(256,512), g=c.getContext('2d');
  const H = kind===4? 38 : 92+variant*5, S = kind===4? 35 : 34+variant*4, Lb = kind===4? 40 : 44+variant*2;
  const lf = (cx,cy,rx,ry,rot,shade) => {
    leafletPath(g,cx,cy,rx,ry,rot,14);
    const gr=g.createLinearGradient(cx-rx,cy-ry,cx+rx,cy+ry);
    gr.addColorStop(0, `hsl(${H+shade*6},${S}%,${Lb+shade*5}%)`);
    gr.addColorStop(1, `hsl(${H-4+shade*4},${S+6}%,${Lb-9+shade*4}%)`);
    g.fillStyle=gr; g.fill();
    if (kind===3){ g.save(); g.clip(); for(let i=0;i<5;i++){ const bx=cx+rr(-rx,rx)*0.7, by=cy+rr(-ry,ry)*0.7; const r=rr(rx*0.25,rx*0.7);
        const gg=g.createRadialGradient(bx,by,1,bx,by,r); gg.addColorStop(0,'rgba(206,200,98,.42)'); gg.addColorStop(1,'rgba(218,206,92,0)'); g.fillStyle=gg; g.fillRect(bx-r,by-r,2*r,2*r);} g.restore(); }
    if (kind===4){ g.save(); g.clip(); g.fillStyle='rgba(90,70,40,.35)'; for(let i=0;i<30;i++){ g.fillRect(cx+rr(-rx,rx),cy+rr(-ry,ry),rr(2,8),rr(2,8)); } g.restore(); }
    veins(g,cx,cy,rx,ry,rot, kind===4?'rgba(120,95,60,.45)':'rgba(214,232,178,.5)', 3);
  };
  g.strokeStyle= kind===4? '#8a7448' : '#7d9a46'; g.lineWidth=5; g.beginPath(); g.moveTo(128,510); g.quadraticCurveTo(122+variant*6,300,130,40); g.stroke();
  const pairs = variant===2 ? [0.8,0.6,0.4] : [0.82,0.64,0.46,0.3];
  pairs.forEach((t,i)=>{ const y=510-t*480+20; const s=1-i*0.06+variant*0.03;
    lf(128-48*s, y-10, 46*s, 22*s, -0.55-variant*0.1, i%2);
    lf(128+48*s, y-14, 44*s, 21*s, 0.55+variant*0.1+Math.PI, (i+1)%2);
    if(i<2){ lf(128-26,y+20,15,8,-0.9,1); lf(128+26,y+18,15,8,0.9+Math.PI,0); } });
  lf(130, 70, 34, 56, Math.PI/2, 1);
  return tex(c);
}
function palmateTex(variant, yellow, opts){
  opts = opts||{};
  const c=cvs(256,256), g=c.getContext('2d'); const cx=128, cy=150, n=200;
  const lobeN = opts.lobes||2.5, deep = opts.deep||0.22, H=opts.h||92, S=opts.s||38;
  g.beginPath();
  for(let i=0;i<=n;i++){ const t=i/n; const a = -Math.PI/2 + 0.28 + t*(Math.PI*2-0.56);
    const lobes = (1-deep) + deep*Math.pow(Math.abs(Math.cos((a+Math.PI/2)*lobeN)),opts.sharp||0.6);
    const r = 112*lobes*(1-0.035*(i%2))*(variant?0.96:1);
    const x=cx+Math.cos(a)*r*0.98, y=cy-Math.sin(a)*r*0.92; i? g.lineTo(x,y): g.moveTo(cx,cy+6); }
  g.closePath();
  const gr=g.createRadialGradient(cx,cy,10,cx,cy,120); gr.addColorStop(0,`hsl(${H-2},${S-2}%,44%)`); gr.addColorStop(1,`hsl(${H+4},${S+2}%,31%)`);
  g.fillStyle=gr; g.fill();
  g.save(); g.clip();
  if (yellow){ for(let i=0;i<7;i++){ const bx=rr(30,226), by=rr(40,230), r=rr(20,60); const gg=g.createRadialGradient(bx,by,1,bx,by,r); gg.addColorStop(0,'rgba(206,198,96,.45)'); gg.addColorStop(1,'rgba(214,200,88,0)'); g.fillStyle=gg; g.fillRect(bx-r,by-r,2*r,2*r);} }
  if (opts.silver){ g.strokeStyle='rgba(225,232,220,.55)'; g.lineWidth=9; for(let k=0;k<5;k++){ const a=Math.PI/2+(k-2)*0.62; g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*70, cy-Math.sin(a)*66); g.stroke(); } }
  g.restore();
  g.strokeStyle='rgba(212,230,176,.55)'; g.lineWidth=2.5;
  for(let k=0;k<5;k++){ const a=Math.PI/2 + (k-2)*0.62; g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*100, cy-Math.sin(a)*96); g.stroke(); }
  g.lineWidth=1; g.strokeStyle='rgba(205,228,170,.25)';
  for(let k=0;k<40;k++){ const a=R()*Math.PI*2, r=R()*90; g.beginPath(); g.moveTo(cx+Math.cos(a)*r, cy-Math.sin(a)*r); g.lineTo(cx+Math.cos(a+0.3)*(r+14), cy-Math.sin(a+0.3)*(r+14)); g.stroke(); }
  return tex(c);
}
// simple single leaf, base at bottom-centre (capsicum, spinach, kale, rocca, coriander)
function simpleLeafTex(kind){
  const c=cvs(128,256), g=c.getContext('2d');
  const P = { pepper:[112,48,30], spinach:[118,46,27], kale:[150,22,36], rocca:[96,44,38], cori:[100,48,40] }[kind];
  const fillG = (y0,y1) => { const gr=g.createLinearGradient(0,y0,0,y1); gr.addColorStop(0,`hsl(${P[0]},${P[1]}%,${P[2]+8}%)`); gr.addColorStop(1,`hsl(${P[0]+4},${P[1]+4}%,${P[2]}%)`); return gr; };
  if (kind==='rocca'){ // lobed arugula
    g.fillStyle=fillG(20,250); g.beginPath(); g.moveTo(64,252);
    const lobes=[[230,22],[195,30],[160,36],[120,42]];
    lobes.forEach(([y,w])=>{ g.lineTo(64-8,y+8); g.quadraticCurveTo(64-w-10,y-4,64-6,y-18); });
    g.quadraticCurveTo(64-40,40,64,14); g.quadraticCurveTo(64+40,40,64+6,100);
    lobes.slice().reverse().forEach(([y,w])=>{ g.quadraticCurveTo(64+w+10,y-4,64+8,y+8); });
    g.lineTo(64,252); g.fill();
  } else if (kind==='cori'){ // three rounded toothed lobes
    g.fillStyle=fillG(30,250);
    leafletPath(g,64,90,46,40,0,9,0.18); g.fill(); leafletPath(g,34,150,30,26,-0.5,7,0.18); g.fill(); leafletPath(g,94,150,30,26,0.5,7,0.18); g.fill();
    g.strokeStyle=`hsl(${P[0]},40%,48%)`; g.lineWidth=3; g.beginPath(); g.moveTo(64,252); g.lineTo(64,90); g.moveTo(64,200); g.lineTo(34,150); g.moveTo(64,200); g.lineTo(94,150); g.stroke();
  } else {
    const ry = kind==='pepper'? 110 : kind==='spinach'? 100 : 112, rx = kind==='pepper'? 46 : kind==='spinach'? 52 : 54;
    leafletPath(g,64,138,ry,rx,Math.PI/2, kind==='kale'? 26 : 18, kind==='kale'? 0.12 : 0.02);
    g.fillStyle=fillG(20,250); g.fill();
    if (kind==='kale'){ g.save(); g.clip(); for(let i=0;i<160;i++){ g.fillStyle=`rgba(${R()<0.5?'230,245,235':'20,40,30'},.12)`; g.beginPath(); g.arc(rr(10,118),rr(20,250),rr(2,6),0,7); g.fill(); } g.restore(); }
    if (kind==='pepper' || kind==='spinach'){ const gl=g.createLinearGradient(30,0,100,0); gl.addColorStop(0,'rgba(255,255,255,0)'); gl.addColorStop(0.5,'rgba(255,255,255,.12)'); gl.addColorStop(1,'rgba(255,255,255,0)'); g.save(); g.clip(); g.fillStyle=gl; g.fillRect(0,0,128,256); g.restore(); }
    veins(g,64,138,ry,rx,Math.PI/2,'rgba(220,236,200,.5)',4);
    g.strokeStyle='rgba(220,236,200,.6)'; g.lineWidth=3; g.beginPath(); g.moveTo(64,256); g.lineTo(64,240); g.stroke();
  }
  return tex(c);
}
function sprigTex(kind){ // rosemary needles / thyme leaflets on a stem
  const c=cvs(64,256), g=c.getContext('2d');
  g.strokeStyle= kind==='ros'? '#6b5a3c' : '#7a6a48'; g.lineWidth=3; g.beginPath(); g.moveTo(32,256); g.quadraticCurveTo(30,130,33,6); g.stroke();
  for (let y=245; y>8; y-= kind==='ros'? 6 : 9){
    for (const s of [-1,1]){
      if (kind==='ros'){ g.strokeStyle=`hsl(${115+rr(-6,6)},${18+rr(-4,6)}%,${30+rr(-4,8)}%)`; g.lineWidth=3; g.beginPath(); g.moveTo(32,y); g.lineTo(32+s*rr(16,24), y-rr(6,12)); g.stroke(); }
      else { g.fillStyle=`hsl(${95+rr(-6,6)},${20+rr(-4,6)}%,${40+rr(-5,6)}%)`; g.beginPath(); g.ellipse(32+s*9, y-3, 7, 4, s*0.6, 0, 7); g.fill(); }
    } }
  return tex(c);
}
function flowerTex(){
  const c=cvs(64,64), g=c.getContext('2d'); g.translate(32,32); g.fillStyle='#f2cf2a';
  for(let i=0;i<5;i++){ g.save(); g.rotate(i*Math.PI*2/5); g.beginPath(); g.ellipse(0,-16,6,15,0,0,Math.PI*2); g.fill(); g.restore(); }
  g.fillStyle='#d7a816'; g.beginPath(); g.arc(0,0,5,0,Math.PI*2); g.fill(); return tex(c);
}
function groundTex(kind){
  const c=cvs(512,512), g=c.getContext('2d');
  const base = {gravel:'#bdb4a3', sand:'#cdb58a', soil:'#5b4632', concrete:'#bdbab2'}[kind];
  g.fillStyle = base; g.fillRect(0,0,512,512);
  if (kind==='gravel'){ for(let i=0;i<2600;i++){ const x=R()*512, y=R()*512, r=rr(1.5,5); g.fillStyle=`hsl(${rr(25,45)},${rr(4,14)}%,${rr(45,78)}%)`; g.beginPath(); g.ellipse(x,y,r,r*rr(0.6,1),R()*3,0,7); g.fill(); } }
  else if (kind==='soil'){ for(let i=0;i<9000;i++){ g.fillStyle=`hsla(${rr(22,34)},${rr(25,40)}%,${rr(14,38)}%,.6)`; g.fillRect(R()*512,R()*512,rr(1,3.5),rr(1,3.5)); }
    for(let i=0;i<260;i++){ g.fillStyle=`hsla(${rr(30,45)},${rr(30,50)}%,${rr(35,55)}%,.5)`; g.beginPath(); g.ellipse(R()*512,R()*512,rr(2,7),rr(0.8,2),R()*3,0,7); g.fill(); } }
  else if (kind==='concrete'){ for(let i=0;i<7000;i++){ g.fillStyle=`hsla(40,${rr(2,8)}%,${rr(55,82)}%,.35)`; g.fillRect(R()*512,R()*512,rr(1,2.5),rr(1,2.5)); } }
  else { for(let i=0;i<9000;i++){ g.fillStyle=`hsla(${rr(28,40)},${rr(25,45)}%,${rr(50,80)}%,.55)`; g.fillRect(R()*512,R()*512,rr(1,2.5),rr(1,2.5)); }
    for(let i=0;i<60;i++){ const x=R()*512,y=R()*512; const gr=g.createRadialGradient(x,y,2,x,y,rr(20,70)); gr.addColorStop(0,'rgba(110,80,45,.16)'); gr.addColorStop(1,'rgba(110,80,45,0)'); g.fillStyle=gr; g.fillRect(x-70,y-70,140,140);} }
  return tex(c,true);
}
function checkerTex(){
  const c=cvs(1024,576), g=c.getContext('2d'); g.fillStyle='#f4f4f0'; g.fillRect(0,0,1024,576);
  const s=64; for(let y=0;y<9;y++) for(let x=0;x<16;x++) if((x+y)%2){ g.fillStyle='#16191a'; g.fillRect(x*s,y*s,s,s); }
  g.strokeStyle='#c2412a'; g.lineWidth=4; g.beginPath(); g.moveTo(512,0); g.lineTo(512,576); g.moveTo(0,288); g.lineTo(1024,288); g.stroke();
  return tex(c);
}

/* ---------- geometry helpers ---------- */
const UP = new T.Vector3(0,1,0);
const _m = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3(), _p = new T.Vector3(), _v = new T.Vector3();
const _L=new T.Vector3(), _N=new T.Vector3(), _W=new T.Vector3(), _a=new T.Vector3(), _b=new T.Vector3(), _c=new T.Vector3();
const V3 = (x,y,z) => new T.Vector3(x,y,z);
function leafMatrix(base, yaw, droop, roll, len, wid){
  _L.set(Math.cos(droop)*Math.cos(yaw), Math.sin(droop), Math.cos(droop)*Math.sin(yaw));
  _N.copy(UP).addScaledVector(_L, -UP.dot(_L));
  if (_N.lengthSq()<1e-6) _N.set(1,0,0); _N.normalize();
  _N.applyAxisAngle(_L, roll);
  _W.crossVectors(_L,_N);
  _a.copy(_W).multiplyScalar(wid); _b.copy(_L).multiplyScalar(len); _c.copy(_N).multiplyScalar(len);
  _m.makeBasis(_a,_b,_c); _m.setPosition(base); return _m.clone();
}
function segMatrix(p0, p1, r){
  _v.subVectors(p1,p0); const len=Math.max(_v.length(),1e-4); _v.normalize();
  _q.setFromUnitVectors(UP,_v); _p.addVectors(p0,p1).multiplyScalar(0.5); _s.set(r,len,r);
  return _m.compose(_p,_q,_s).clone();
}
function leafGeo(w, bendL, cup){
  const g=new T.PlaneGeometry(w,1,3,5); g.translate(0,0.5,0);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i); p.setZ(i, -bendL*y*y + cup*(x/w*2)*(x/w*2)*w); }
  g.computeVertexNormals(); return g;
}
function pepperGeo(){ // blocky 4-lobed capsicum, unit radius, height 1 (y from -0.5 to 0.5)
  const prof=[[0.02,-0.5],[0.45,-0.49],[0.8,-0.42],[0.97,-0.25],[1.0,0.0],[0.98,0.25],[0.9,0.4],[0.62,0.48],[0.22,0.5],[0.02,0.5]].map(([r,y])=>new T.Vector2(r,y));
  const g=new T.LatheGeometry(prof, 24); const p=g.attributes.position;
  for (let i=0;i<p.count;i++){ const x=p.getX(i), z=p.getZ(i), y=p.getY(i); const a=Math.atan2(z,x); const k=1+0.075*Math.cos(4*a)*(1-Math.abs(y)*1.2); p.setX(i,x*k); p.setZ(i,z*k); }
  g.computeVertexNormals(); return g;
}

/* ---------- scene, lights ---------- */
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
const scene = new T.Scene();
const FOG = new T.Color(0xe4e9e2);
scene.background = FOG.clone();
scene.fog = new T.Fog(FOG.getHex(), 16, 62);
const hemi = new T.HemisphereLight(0xf4f7ff, 0xa89670, 2.2); scene.add(hemi);
const sun = new T.DirectionalLight(0xfff0d8, 1.9);
sun.castShadow = true; sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera, {left:-25, right:25, top:25, bottom:-25, near:1, far:80});
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015; sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);
const fill = new T.DirectionalLight(0xe8f0ff, 0.3); fill.position.set(-5,6,-8); scene.add(fill);
const LIGHT = {az:35, el:62, sun:2.1, hemi:2.2, tint:[1,1,1], expo:1, noise:0};
function setLighting(o){ Object.assign(LIGHT,o||{});
  const az=LIGHT.az*Math.PI/180, el=LIGHT.el*Math.PI/180;
  sun.target.position.set(L/2,0,0); sun.target.updateMatrixWorld();
  sun.position.set(L/2+Math.cos(el)*Math.cos(az)*40, Math.sin(el)*40, Math.cos(el)*Math.sin(az)*40);
  sun.intensity=LIGHT.sun; hemi.intensity=LIGHT.hemi; renderer.shadowMap.needsUpdate=true; }

/* ---------- static structure (rebuilt per layout) ---------- */
const metal = new T.MeshStandardMaterial({color:0xe9ece8, roughness:0.45, metalness:0.35});
const film = new T.MeshStandardMaterial({color:0xf6f7f3, emissive:0xe6ebe4, emissiveIntensity:0.75, roughness:0.9, transparent:true, opacity:0.88, side:T.DoubleSide, depthWrite:false, fog:false});
const GT = { sand:groundTex('sand'), gravel:groundTex('gravel'), soil:groundTex('soil'), concrete:groundTex('concrete') };
const groundMat = k => new T.MeshStandardMaterial({map:GT[k], roughness:1});
const pipeGeo = new T.CylinderGeometry(1,1,1,8);
const structure = new T.Group(); scene.add(structure);
const roofGroup = new T.Group(); scene.add(roofGroup);
function clearGroup(gr){ gr.children.slice().forEach(o=>{ gr.remove(o); o.traverse(c=>{ if(c.geometry && c.geometry!==pipeGeo) c.geometry.dispose(); if (c.material && c.material.map && !Object.values(GT).includes(c.material.map) && c.material!==film && c.material!==metal) { c.material.dispose(); } }); }); }
function addFlat(w, d, x, z, y, matKey, rx, ry){
  const m=new T.Mesh(new T.PlaneGeometry(w,d), groundMat(matKey)); m.material.map=GT[matKey].clone(); m.material.map.needsUpdate=true; m.material.map.repeat.set(rx,ry);
  m.rotation.x=-Math.PI/2; m.position.set(x,y,z); m.receiveShadow=true; structure.add(m); return m; }
function hPipe(y,z,r,x0,x1){ const m=new T.Mesh(pipeGeo, metal); x0=x0===undefined?LAY.xMin:x0; x1=x1===undefined?LAY.xMax:x1; m.scale.set(r,x1-x0,r); m.rotation.z=Math.PI/2; m.position.set((x0+x1)/2,y,z); m.castShadow=true; structure.add(m); }
function vPost(x,z,h,r){ const p=new T.Mesh(pipeGeo, metal); p.scale.set(r,h,r); p.position.set(x,h/2,z); p.castShadow=true; structure.add(p); }
function buildStructure(){
  clearGroup(structure); clearGroup(roofGroup);
  const xm=LAY.xMin, xM=LAY.xMax, cx=(xm+xM)/2, len=xM-xm;
  if (LAY.key==='albatha'){
    addFlat(L+6, WALL*2, L/2, 0, 0, 'sand', 24, 5);
    addFlat(L+4, 1.2, L/2, 0.5, 0.004, 'gravel', 28, 1.2);
    ROWS.forEach(r=>{ for(const s of [-1,1]){ const d=new T.Mesh(new T.CylinderGeometry(0.008,0.008,L,6), new T.MeshStandardMaterial({color:0x18181a})); d.rotation.z=Math.PI/2; d.position.set(L/2,0.012,r.z+s*0.16); structure.add(d); } });
    ROWS.forEach(r=>{ hPipe(2.4, r.z, 0.016); hPipe(3.0, r.z, 0.02); for(const x of [-0.5, L+0.5]) vPost(x, r.z, 3.0, 0.035); });
  } else {
    addFlat(len+0.4, WALL*2, cx, 0, 0, 'sand', 16, 4);                       // 0.30 m paths and end clearance: sand
    addFlat(len, UNI.walk, cx, 0, 0.004, 'concrete', 18, 0.6);               // 1.00 m central walkway
    for (const side of [1,-1]) for (let p=0;p<7;p++){                        // 14 plots of organic soil, 4.00 x 3.50 m
      const zc = side*(UNI.walk/2 + UNI.plotD/2);
      const m=addFlat(UNI.plotW, UNI.plotD, plotX0(p)+UNI.plotW/2, zc, 0.012, 'soil', 3, 2.6);
      const edge=new T.Mesh(new T.BoxGeometry(UNI.plotW, 0.06, 0.04), new T.MeshStandardMaterial({color:0x8f8778, roughness:0.9}));
      edge.position.set(plotX0(p)+UNI.plotW/2, 0.03, side*(UNI.walk/2+0.02)); edge.castShadow=true; structure.add(edge);
      for (let k=0;k<4;k++){ for (const dz of LAY.key==='uniLeafy' && k<3 ? [-0.15,0.15] : [0.06]){ // drip tapes
        const d=new T.Mesh(new T.CylinderGeometry(0.007,0.007,UNI.plotW-0.1,6), new T.MeshStandardMaterial({color:0x18181a})); d.rotation.z=Math.PI/2; d.position.set(plotX0(p)+UNI.plotW/2,0.02,lineZ(side,k)+dz); structure.add(d); } }
    }
    if (LAY.key==='uniFruit'){ // crop wires for the string-trained lines (tomato lines and the cucumber half of line 4)
      const wx0=UNI.end-0.1, wx1=L-UNI.end+0.1;
      for (const side of [1,-1]){ for (const k of [0,1,3]) hPipe(2.3, lineZ(side,k), 0.006, wx0, wx1);
        for (let p=0;p<=7;p++){ const x = p<7? plotX0(p)-0.1 : plotX0(6)+UNI.plotW+0.1; for (const k of [0,1,3]) vPost(x, lineZ(side,k), 2.35, 0.02); } }
    }
  }
  // arches, lattice, purlins
  function archPts(off){ const pts=[]; if(!off) pts.push(V3(0,0,-WALL));
    for(let i=0;i<=40;i++){ const z=-WALL+off+2*(WALL-off)*i/40; pts.push(V3(0, roofY(z)-off, z)); }
    if(!off) pts.push(V3(0,0,WALL)); return pts; }
  const outer = archPts(0), inner = archPts(0.28);
  const archGeo = new T.TubeGeometry(new T.CatmullRomCurve3(outer,false,'centripetal'), 120, 0.03, 6, false);
  const archGeo2 = new T.TubeGeometry(new T.CatmullRomCurve3(inner,false,'centripetal'), 100, 0.022, 6, false);
  const lattice=[];
  const aStart = LAY.key==='albatha'? -1.2 : 0, aStep=3.0;
  for (let ax=aStart; ax<=xM+0.01; ax+=aStep){
    const a=new T.Mesh(archGeo, metal); a.position.x=ax; a.castShadow=true; structure.add(a);
    const b=new T.Mesh(archGeo2, metal); b.position.x=ax; b.castShadow=true; structure.add(b);
    for(let i=1;i<inner.length-2;i+=2){ const o=outer[i+1], n=inner[i], n2=inner[i+1]; lattice.push(ax,o.y,o.z, ax,n.y,n.z, ax,o.y,o.z, ax,n2.y,n2.z); }
  }
  const lg=new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lattice,3)); structure.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:0xd9ddd8})));
  for (const f of [-0.82,-0.56,-0.28,0,0.28,0.56,0.82]){ const z=f*WALL; hPipe(roofY(z)-0.02, z, 0.022); }
  // film
  const nz=48; const pos=[], idx=[];
  for(let i=0;i<=nz;i++){ const z=-WALL+2*WALL*i/nz; const y=roofY(z)+0.02; pos.push(xm,y,z, xM,y,z); }
  for(let i=0;i<nz;i++){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  roofGroup.add(new T.Mesh(g, film));
  for (const s of [-1,1]){ const w=new T.Mesh(new T.PlaneGeometry(len, GUTTER), film); w.position.set(cx,GUTTER/2,s*WALL); roofGroup.add(w); }
  const shape=new T.Shape(); shape.moveTo(-WALL,0); for(let i=0;i<=40;i++){ const z=-WALL+2*WALL*i/40; shape.lineTo(z, roofY(z)); } shape.lineTo(WALL,0);
  for (const x of [xm, xM]){ const e=new T.Mesh(new T.ShapeGeometry(shape), film); e.rotation.y=Math.PI/2; e.position.x=x; roofGroup.add(e); }
  roofGroup.traverse(o=>o.layers.set(2));
  structure.traverse(o=>{ if (o.isMesh) o.receiveShadow=true; });
  setLighting();
}

/* ---------- plant materials ---------- */
// every leaf kind: texture, geometry and three materials (lit, shadow depth, black for the label pass)
const LEAF_KINDS = {};
function leafKind(key, texture, geo){ LEAF_KINDS[key] = { key, tex:texture, geo,
  mat:new T.MeshStandardMaterial({map:texture, alphaTest:0.45, side:T.DoubleSide, roughness:0.72, metalness:0}),
  depth:new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking, map:texture, alphaTest:0.45, side:T.DoubleSide}),
  black:new T.MeshBasicMaterial({color:0x000000, map:texture, alphaTest:0.45, side:T.DoubleSide, fog:false}) }; }
{
  const tGeo = leafGeo(1, 0.16, 0.06), cGeo = leafGeo(1, 0.08, 0.1), sGeo = leafGeo(1, 0.12, 0.08), kGeo=leafGeo(1,0.1,0.14), spGeo=leafGeo(1,0.02,0.02);
  [[0,0],[1,1],[2,2],[1,3],[0,4]].forEach(([v,k],i)=>leafKind('tom'+i, tomatoLeafTex(v,k), tGeo));
  leafKind('cuc0', palmateTex(0,false), cGeo); leafKind('cuc1', palmateTex(1,false), cGeo); leafKind('cuc2', palmateTex(0,true), cGeo);
  leafKind('zuc0', palmateTex(0,false,{lobes:2.5, deep:0.42, sharp:1.4, silver:true, h:98, s:34}), cGeo);
  leafKind('zuc1', palmateTex(1,false,{lobes:2.5, deep:0.38, sharp:1.2, silver:true, h:100, s:36}), cGeo);
  leafKind('pep', simpleLeafTex('pepper'), sGeo);
  leafKind('kale', simpleLeafTex('kale'), kGeo); leafKind('rocca', simpleLeafTex('rocca'), sGeo); leafKind('spin', simpleLeafTex('spinach'), sGeo); leafKind('cori', simpleLeafTex('cori'), sGeo);
  leafKind('ros', sprigTex('ros'), spGeo); leafKind('thy', sprigTex('thy'), spGeo);
}
const flowerTx = flowerTex();
const flowerMat = new T.MeshStandardMaterial({map:flowerTx, alphaTest:0.4, side:T.DoubleSide, roughness:0.6});
const flowerDepth = new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking, map:flowerTx, alphaTest:0.4});
const flowerBlack = new T.MeshBasicMaterial({color:0x000000, map:flowerTx, alphaTest:0.4, side:T.DoubleSide, fog:false});
const stemMat = new T.MeshStandardMaterial({roughness:0.8, color:0xffffff});
const calyxMat = new T.MeshStandardMaterial({roughness:0.8, color:0x4b7a2a});
const cylGeo = new T.CylinderGeometry(1,1,1,5,1,true), coneGeo = new T.ConeGeometry(1,1,6), flGeo = new T.PlaneGeometry(1,1);
// fruit kinds: label class 0 tomato, 1 cucumber, 2 capsicum, 3 zucchini
const CLASSES = ['tomato','cucumber','capsicum','zucchini'];
const FRUIT_KINDS = {
  tom:    {cls:0, geo:()=>new T.SphereGeometry(1,10,7), mat:new T.MeshStandardMaterial({roughness:0.3, color:0xffffff})},
  cuc:    {cls:1, geo:()=>new T.CapsuleGeometry(0.018, 0.22, 4, 10), mat:new T.MeshStandardMaterial({roughness:0.55, color:0xffffff})},
  pep:    {cls:2, geo:()=>pepperGeo(), mat:new T.MeshStandardMaterial({roughness:0.22, color:0xffffff})},
  zuc:    {cls:3, geo:()=>new T.CapsuleGeometry(0.022, 0.18, 4, 10), mat:new T.MeshStandardMaterial({roughness:0.5, color:0xffffff})},
};

const LEAF_GREENS = ['#5d9a3c','#6aa244','#4f8c36','#78a84a','#86b052','#5a9038','#6f9c40'].map(h=>new T.Color(h));
const YEL = new T.Color('#b4b04e'), WHITE=new T.Color(0xffffff);
function leafColor(outer, h, yellowish){
  const c = LEAF_GREENS[(R()*LEAF_GREENS.length)|0].clone();
  if (yellowish) c.lerp(YEL, rr(0.15,0.5));
  const ao = 0.55 + 0.45*Math.pow(outer,0.75);
  return c.multiplyScalar(ao*(0.86+0.2*clamp(h/2.1,0,1))*rr(0.85,1.12));
}
const RIPE = ['#5d8f2a','#93ad34','#d9b42a','#e2701e','#c8291b'].map(h=>new T.Color(h));
function ripeColor(s, variety){
  const end = variety===1 ? new T.Color('#e8bd22') : variety===2 ? new T.Color('#e8761c') : RIPE[4];
  const stops = variety===1 ? [RIPE[0],RIPE[1],new T.Color('#e1c128'),end] : [RIPE[0],RIPE[1],RIPE[2],RIPE[3],end];
  const t = clamp(s,0,1)*(stops.length-1); const i=Math.min(stops.length-2, Math.floor(t));
  return stops[i].clone().lerp(stops[i+1], t-i).multiplyScalar(rr(0.88,1.06));
}

/* ---------- plant builder state ---------- */
const plants = new T.Group(); scene.add(plants);
let FR = [], NF = 0, SEASON = null;
const VAR_DEFAULT = {ripe:-0.15, leaf:1, yellow:0.12, reach:1, fruit:0.8};
let B = null; // buckets while building
function newBuckets(){ B = { leaf:{}, stems:[], stemC:[], flowers:[], calyx:[], fruit:{} }; Object.keys(FRUIT_KINDS).forEach(k=>B.fruit[k]={mats:[],cols:[],ids:[]}); }
function addLeaf(kind, m, col){ (B.leaf[kind] ||= {mats:[],cols:[]}); B.leaf[kind].mats.push(m); B.leaf[kind].cols.push(col); }
function addStem(p0,p1,r,col){ B.stems.push(segMatrix(p0,p1,r)); B.stemC.push(col); }
function addFlower(p, s){ _q.setFromEuler(new T.Euler(rr(-1,1),R()*6,rr(-1,1))); B.flowers.push(_m.compose(p,_q,_s.set(s,s,s)).clone()); }
function addFruit(kind, m, col, rec){ FR.push(rec); rec.cls=FRUIT_KINDS[kind].cls; rec.type=rec.cls; const b=B.fruit[kind]; b.mats.push(m); b.cols.push(col); b.ids.push(FR.length); }
function addTomato(p, r, col, ri, squash){
  _m.compose(p, _q.setFromAxisAngle(UP,R()*6), _s.set(r,r*(squash||rr(0.92,1.0)),r));
  addFruit('tom', _m.clone(), col, {x:p.x,y:p.y,z:p.z,r,row:ri});
  _m.compose(_p.set(p.x,p.y+r*(squash||0.95)*0.97,p.z), _q.setFromAxisAngle(UP,R()*6), _s.set(r*0.7,r*0.2,r*0.7)); B.calyx.push(_m.clone());
}
function addLongFruit(kind, top, ax, len, r, col, ri){ // cucumber / zucchini hanging from 'top' along unit axis 'ax'
  const base = kind==='cuc'? 0.256 : 0.224, rad0 = kind==='cuc'? 0.018 : 0.022;
  const ctr = top.clone().addScaledVector(ax, len/2);
  _q.setFromUnitVectors(UP, ax.clone().negate());
  _m.compose(ctr,_q,_s.set(r/rad0, len/base, r/rad0));
  addFruit(kind, _m.clone(), col, {x:ctr.x,y:ctr.y,z:ctr.z,r,row:ri,ax:ax.x,ay:ax.y,az:ax.z,len});
}
function finishBuild(){
  plants.children.slice().forEach(m=>{ plants.remove(m); if (m.userData.ownGeo) m.geometry.dispose(); if (m.isInstancedMesh) m.dispose(); });
  const inst = (geo, mat, mats, cols, depth, black, own) => {
    if (!mats.length) return null;
    const m=new T.InstancedMesh(geo, mat, mats.length);
    for (let i=0;i<mats.length;i++){ m.setMatrixAt(i, mats[i]); if(cols) m.setColorAt(i, cols[i]); }
    m.instanceMatrix.needsUpdate=true; if(m.instanceColor) m.instanceColor.needsUpdate=true;
    m.frustumCulled=false; m.castShadow=true; m.receiveShadow=true; if (depth) m.customDepthMaterial=depth; if (black) m.userData.black=black; m.userData.ownGeo=!!own; plants.add(m); return m; };
  Object.entries(B.leaf).forEach(([k,b])=>{ const K=LEAF_KINDS[k]; inst(K.geo, K.mat, b.mats, b.cols, K.depth, K.black); });
  inst(flGeo, flowerMat, B.flowers, null, flowerDepth, flowerBlack);
  inst(cylGeo, stemMat, B.stems, B.stemC);
  inst(coneGeo, calyxMat, B.calyx, null);
  Object.entries(B.fruit).forEach(([k,b])=>{ if (!b.mats.length) return; const geo=FRUIT_KINDS[k].geo();
    geo.setAttribute('aId', new T.InstancedBufferAttribute(Float32Array.from(b.ids),1));
    const m=inst(geo, FRUIT_KINDS[k].mat, b.mats, b.cols, null, null, true); m.userData.fruit=true; });
  NF = FR.length; B = null;
  renderer.shadowMap.needsUpdate = true;
}

// seed, variation and (for the university arches) the season day: 0 = 1 Nov 2026
function buildPlants(seed, V, day){
  V = Object.assign({}, VAR_DEFAULT, V||{});
  setSeed(seed); FR = []; newBuckets();
  if (LAY.key==='albatha') buildAlbatha(V);
  else if (LAY.key==='uniFruit') SEASON = buildUniFruit(V, day===undefined? 120 : day);
  else SEASON = buildUniLeafy(V, day===undefined? 120 : day);
  finishBuild();
}

/* ---------- Albatha hedge rows ---------- */
function buildAlbatha(V){
  SEASON = null;
  const SHOOT = new T.Color('#6f9440'), STEM = new T.Color('#5f8238');
  const pickTomV = (y) => { const u=R(); if (u<0.015) return 4; if (u<0.015+V.yellow*(y<0.9?2.2:0.7)) return 3; return (R()*3)|0; };
  const addTomLeaf = (Bp, yaw, droop, len, zc, y) => {
    const tipz = Bp.z + Math.sin(yaw)*Math.cos(droop)*len;
    const outer = clamp(Math.abs(tipz-zc)/0.55,0,1);
    const v = pickTomV(y);
    addLeaf('tom'+v, leafMatrix(Bp,yaw,droop,rr(-0.65,0.65),len,len*rr(0.6,0.74)), v>=3? leafColor(outer, y, false).lerp(WHITE,0.3) : leafColor(outer, y, y<0.8 && R()<0.5));
  };
  const addTruss = (Bp, yaw, h, ri) => {
    const len=rr(0.12,0.24), n=Math.max(3,(rr(4,11)*V.fruit)|0);
    const variety = R()<0.16?1: R()<0.18?2:0;
    const base = (2.05 - h)/0.95 + V.ripe;
    let last=null; const hx=Math.cos(yaw), hz=Math.sin(yaw);
    for (let i=0;i<n;i++){
      const t=(i+0.5)/n, s=t*len, zig=(i%2?1:-1)*0.02;
      const p=V3(Bp.x + hx*(0.04+s*0.8) - hz*zig + rr(-.007,.007), Bp.y - 0.04 - s*s*1.7 - t*0.04 + rr(-.008,.008), Bp.z + hz*(0.04+s*0.8) + hx*zig + rr(-.007,.007));
      addTomato(p, rr(0.012,0.0165), ripeColor(base + (0.5-t)*0.35 + rr(-0.18,0.18), variety), ri); last=p;
    }
    if (last) addStem(Bp, V3(last.x, last.y+0.02, last.z), 0.0028, SHOOT);
  };
  ROWS.forEach(row=>{
    const zc=row.z, ri=row.i;
    if (row.type==='tom'){
      for (const side of [-1,1]){
        const z0 = zc + side*0.15;
        for (let x=0.12+R()*0.1; x<L-0.1; x+=rr(0.26,0.34)){
          const lx=rr(-0.07,0.07), lz=rr(-0.06,0.06), top=TOP_A.tom+rr(-0.12,0.15);
          addStem(V3(x,0.06,z0), V3(x+lx,top,z0+lz), 0.0055, STEM.clone().multiplyScalar(rr(0.8,1.1)));
          const stemAt = y => { const t=(y-0.06)/(top-0.06); return V3(x+lx*t, y, z0+lz*t); };
          for (let y=rr(0.3,0.45); y<top-0.08; y+=rr(0.13,0.21)/Math.sqrt(V.leaf)){
            const out = R()<0.8 ? side : -side;
            let yaw = (out>0? Math.PI/2 : -Math.PI/2) + rr(-1.15,1.15);
            const len = rr(0.2,0.42)*(y>1.25?1.3:1)*V.reach;
            let el = rr(0.25,0.85);
            let p = stemAt(y); const p0=p.clone();
            for (let k=0;k<3;k++){
              const sl=len/3;
              const q = p.clone().add(V3(Math.cos(el)*Math.cos(yaw)*sl, Math.sin(el)*sl, Math.cos(el)*Math.sin(yaw)*sl));
              addStem(p,q,0.0028-k*0.0005, SHOOT.clone().multiplyScalar(rr(0.85,1.15)));
              const nl = Math.round(((R()<0.55?3:2) + (k===2?1:0))*V.leaf);
              for (let j=0;j<nl;j++) addTomLeaf(q.clone().add(V3(rr(-.03,.03),rr(-.03,.03),rr(-.03,.03))), yaw+rr(-1.0,1.0), rr(-0.9,0.05)+(q.y>1.9?0.3:0), rr(0.17,0.3), zc, q.y);
              if (k===0 && y>0.38 && y<1.95 && R()<0.42*V.fruit) addTruss(q.clone(), yaw+rr(-0.5,0.5), q.y, ri);
              if (k===2 && y>0.9 && R()<0.4){ for(let f=0;f<(1+(R()*3|0));f++) addFlower(V3(q.x+rr(-.04,.04),q.y+rr(-.04,.03),q.z+rr(-.04,.04)), rr(0.016,0.024)); }
              p=q; el -= rr(0.35,0.7); yaw += rr(-0.25,0.25);
            }
            if (y>0.4 && y<1.85 && R()<0.12*V.fruit) addTruss(p0, yaw+rr(-0.6,0.6), y, ri);
          }
          const ns = Math.round(18*V.leaf);
          for (let j=0;j<ns;j++){
            const y = 0.35 + (top-0.4)*Math.pow(R(),0.8);
            const yaw = R()<0.7 ? (side>0?Math.PI/2:-Math.PI/2)+rr(-1.2,1.2) : R()*Math.PI*2;
            addTomLeaf(stemAt(y), yaw, rr(-0.95,-0.1), rr(0.18,0.32), zc, y);
          }
        }
      }
      for (let i=0;i<Math.round(700*V.leaf);i++) addTomLeaf(V3(rr(0.1,L-0.1), rr(1.9,2.25), zc+rr(-0.3,0.3)), R()*6.28, rr(-0.5,0.2), rr(0.18,0.28), zc, 2.1);
    } else {
      for (let x=0.2+R()*0.1; x<L-0.1; x+=rr(0.34,0.42)){
        const z0 = zc + rr(-0.03,0.03);
        addStem(V3(x,0.08,z0), V3(x+rr(-.04,.04),2.75,z0), 0.0075, STEM.clone());
        let s = R()<0.5?1:-1;
        for (let y=rr(0.35,0.5); y<2.65; y+=rr(0.1,0.14)/Math.sqrt(V.leaf)){
          s=-s;
          const nl = R()<0.55 ? 2 : 1;
          for (let k=0;k<nl;k++){
            const yaw = s*Math.PI/2 + rr(-1.0,1.0) + (k? rr(-1.3,1.3):0);
            const pet = rr(0.08,0.2)*V.reach;
            const LB = V3(x+Math.cos(yaw)*pet, y+0.04, z0+Math.sin(yaw)*pet);
            addStem(V3(x,y,z0), LB, 0.003, SHOOT);
            const len=rr(0.2,0.34);
            const outer = clamp(Math.abs(LB.z+Math.sin(yaw)*len*0.8-zc)/0.45,0,1);
            const v = R()<V.yellow*(y<0.9?2:0.6) ? 2 : (R()*2)|0;
            addLeaf('cuc'+v, leafMatrix(LB,yaw,rr(-0.5,0.25),rr(-0.5,0.5),len,len*0.98), v===2? leafColor(0.3+0.7*outer, y, false).lerp(WHITE,0.3) : leafColor(0.3+0.7*outer, y, y<0.7 && R()<0.5));
          }
          if (y>0.55 && y<2.4 && R()<0.36*V.fruit){
            const az=R()*6.28, tl=rr(0.04,0.38);
            const ax=V3(Math.sin(tl)*Math.cos(az), -Math.cos(tl), Math.sin(tl)*Math.sin(az));
            const yaw2 = s*Math.PI/2 + rr(-1.0,1.0);
            const sc = rr(0.85,1.22);
            addLongFruit('cuc', V3(x+Math.cos(yaw2)*0.06, y-0.025, z0+Math.sin(yaw2)*0.06), ax, 0.256*sc, 0.018*sc, new T.Color(R()<0.15?'#4e7a2c':'#2d5520').multiplyScalar(rr(0.8,1.15)), ri);
          }
          if (R()<0.22){ const yaw=s*Math.PI/2+rr(-1,1); addFlower(V3(x+Math.cos(yaw)*0.1, y+0.02, z0+Math.sin(yaw)*0.1), rr(0.025,0.035)); }
        }
      }
    }
  });
}

/* ---------- University arch 1: fruit vegetables (dates from the production plan) ---------- */
// day 0 = 1 Nov 2026. Transplant days: tomatoes 27 Nov (26), capsicum 12 Dec (41),
// cucumber/zucchini cycle 1 11 Nov (10); cycle 2: zucchini 12 Feb (103), cucumber 15 Feb (106).
const PLAN = {
  round:  {tp:26, h0:0.18, rate:0.026, top:2.2, t0:0.5, ts:0.3, nFr:[4,6], rFr:[0.029,0.036], ripen:37, leaf:0.4},
  cherry: {tp:26, h0:0.18, rate:0.026, top:2.2, t0:0.42, ts:0.25, nFr:[8,14], rFr:[0.012,0.016], ripen:29, leaf:0.34},
  pepper: {tp:41},
  cuc:  [{tp:10, end:107}, {tp:106, end:196}],
  zuc:  [{tp:10, end:98}, {tp:103, end:183}],
};
function cropStatus(day){
  const s=[];
  const tom = day<26? 'tomatoes in the nursery' : day<81? 'tomatoes growing and flowering' : day<210? 'tomatoes harvesting (cherry from 21 Jan, round from 31 Jan)' : 'tomato season over';
  s.push(tom);
  s.push(day<41? 'capsicum in the nursery' : day<116? 'capsicum growing, fruit still green' : day<214? 'capsicum harvesting coloured fruit' : 'capsicum season over');
  const c = day<10? 'cucumber and zucchini in the nursery' : day<41? 'cucumber and zucchini cycle 1 growing' : day<98? 'cucumber and zucchini cycle 1 harvesting' : day<107? 'zucchini cycle 1 cleared, cucumber cycle 1 finishing, cycle 2 transplanting' : day<127? 'cucumber and zucchini cycle 2 growing' : day<196? 'cucumber and zucchini cycle 2 harvesting' : 'cucumber and zucchini season over';
  s.push(c); return s;
}
function buildUniFruit(V, day){
  const STEM = new T.Color('#5f8238'), SHOOT=new T.Color('#6f9440');
  const tops = {}; // per ROWS index: tallest plant
  const setTop = (ri,h) => { tops[ri] = Math.max(tops[ri]||0.05, h); };
  const rowIdx = (side,k,x) => ROWS.findIndex(r=>r.side===side && r.k===k && x>=r.x0-0.01 && x<=r.x1+0.01);
  for (const side of [1,-1]) for (let p=0;p<7;p++){
    const x0=plotX0(p);
    // line 1 round tomato, line 2 cherry tomato: 8 plants each @ 0.50 m
    [['round',0],['cherry',1]].forEach(([kind,k])=>{ for (let i=0;i<8;i++){ const x=x0+0.25+i*0.5+rr(-0.03,0.03); const z=lineZ(side,k)+rr(-0.03,0.03);
      const h=tomatoPlant(kind, x, z, day-PLAN[kind].tp, V, rowIdx(side,k,x), STEM, SHOOT); setTop(rowIdx(side,k,x), h); } });
    // line 3 coloured capsicum: 10 plants @ 0.40 m
    for (let i=0;i<10;i++){ const x=x0+0.2+i*0.4+rr(-0.03,0.03); const ri=rowIdx(side,2,x); setTop(ri, pepperPlant(x, lineZ(side,2)+rr(-0.03,0.03), day-PLAN.pepper.tp, V, ri, STEM)); }
    // line 4: cucumber (first half) and zucchini (second half), 4 plants each @ 0.50 m, two cycles
    for (let i=0;i<4;i++){ const x=x0+0.25+i*0.5+rr(-0.03,0.03); const ri=rowIdx(side,3,x);
      for (const cyc of PLAN.cuc) if (day>=cyc.tp && day<cyc.end) setTop(ri, cucumberPlant(x, lineZ(side,3), day-cyc.tp, cyc.end-cyc.tp, V, ri, STEM, SHOOT)); }
    for (let i=0;i<4;i++){ const x=x0+2.25+i*0.5+rr(-0.03,0.03); const ri=rowIdx(side,3,x);
      for (const cyc of PLAN.zuc) if (day>=cyc.tp && day<cyc.end) setTop(ri, zucchiniPlant(x, lineZ(side,3), day-cyc.tp, V, ri)); }
  }
  ROWS.forEach((r,i)=>{ r.top = Math.max(0.05, tops[i]||0.05); });
  return {day, date:fmtDay(day), lines:cropStatus(day)};
}
// indeterminate tomato on a string, lowered once it reaches the wire. Returns current height.
function tomatoPlant(kind, x, z, a, V, ri, STEM, SHOOT){
  if (a<0) return 0.05;
  const P = PLAN[kind];
  const S = P.h0 + P.rate*a, drop = Math.max(0, S - P.top), h = S - drop;
  const lean = Math.min(drop*0.35, 0.5);
  addStem(V3(x-lean,0.06,z), V3(x,h,z), 0.007, STEM.clone().multiplyScalar(rr(0.85,1.1)));
  if (h < 2.28) addStem(V3(x,h,z), V3(x,2.3,z), 0.0012, new T.Color('#e8e4d6'));   // support string to the crop wire
  // trusses
  let lowestKept = h;
  for (let i=0;i<40;i++){
    const Si = P.t0 + i*P.ts; if (S < Si + 0.2) break;
    const ti = (Si + 0.2 - P.h0)/P.rate, ta = a - ti, yi = Si - drop;
    const n = Math.max(2, Math.round(rr(P.nFr[0],P.nFr[1])*V.fruit));
    const yaw = (i*2.4 + R()*0.8);
    const hx=Math.cos(yaw), hz=Math.sin(yaw);
    const Bp = V3(x - lean*(1-clamp(yi/h,0,1)), yi, z);
    let any=false, last=null;
    for (let j=0;j<n;j++){
      const fa = ta - j*1.5;
      if (fa < 6){ if (fa>-3 && R()<0.7) addFlower(V3(Bp.x+hx*(0.05+j*0.02), yi-0.03-j*0.006, Bp.z+hz*(0.05+j*0.02)), 0.02); continue; }
      if (fa > P.ripen + 14 + V.ripe*-10) continue;          // picked
      if (yi < 0.12) continue;
      const size = clamp(0.35 + (fa-6)/24, 0.35, 1);
      const r = rr(P.rFr[0],P.rFr[1])*size;
      const s = clamp((fa - P.ripen)/10 + V.ripe*0.3, 0, 1);
      const t=(j+0.5)/n, sl=t*(kind==='round'? 0.16 : 0.2), zig=(j%2?1:-1)*(kind==='round'?0.035:0.02);
      const pnt=V3(Bp.x+hx*(0.05+sl*0.8)-hz*zig, yi-0.05-sl*sl*1.6-t*0.03, Bp.z+hz*(0.05+sl*0.8)+hx*zig);
      addTomato(pnt, r, ripeColor(s*1.0, 0).lerp(RIPE[0], s<0.02? 0.15:0), ri, kind==='round'? 0.86 : undefined);
      any=true; last=pnt;
    }
    if (last) addStem(Bp, V3(last.x,last.y+0.02,last.z), 0.003, SHOOT);
    if (any) lowestKept = Math.min(lowestKept, yi);
  }
  // leaves every 0.1 m of stem; old leaves stripped below the lowest truss still carrying fruit
  const stripBelow = a>55 ? Math.max(0.15, lowestKept-0.25) : 0.12;
  let ph=R()*6.28;
  for (let s=0.2; s<S-0.02; s+=0.1/Math.sqrt(V.leaf)){
    const y = s - drop; if (y < stripBelow) continue;
    ph += 2.4;
    const young = clamp((S - s)/0.45, 0, 1);
    const len = P.leaf*(0.35 + 0.65*young)*rr(0.85,1.1)*V.reach;
    const Bp = V3(x - lean*(1-clamp(y/h,0,1)), y, z);
    const v = R()<0.015? 4 : (R()<V.yellow*(y<0.7?2:0.6) ? 3 : (R()*3)|0);
    addLeaf('tom'+v, leafMatrix(Bp, ph, rr(-0.75,-0.15)+(young<0.3?0.35:0), rr(-0.6,0.6), len, len*rr(0.62,0.75)),
      v>=3? leafColor(0.8, y, false).lerp(WHITE,0.3) : leafColor(0.75+0.25*R(), y, y<0.6 && R()<0.5));
    if (kind==='cherry' && R()<0.35*V.leaf){ const sy=ph+rr(-0.7,0.7); addLeaf('tom'+((R()*3)|0), leafMatrix(Bp.clone().add(V3(0,0.03,0)), sy, rr(-0.4,0.1), rr(-0.6,0.6), len*0.6, len*0.42), leafColor(0.8,y,false)); }
  }
  return h;
}
// coloured capsicum: low branching bush on stakes, fruit green for ~5 weeks then colours. Returns height.
function pepperPlant(x, z, a, V, ri, STEM){
  if (a<0) return 0.05;
  const h = Math.min(0.95, 0.12 + 0.011*a);
  const colourEnd = [new T.Color('#c4221b'), new T.Color('#f0c419'), new T.Color('#ec7a16')][R()<0.5?0:R()<0.6?1:2];
  const fork = h*0.28;
  addStem(V3(x,0.04,z), V3(x,fork,z), 0.009, STEM);
  const tips=[];
  const branch=(p, yaw, el, len, depth)=>{
    const q=p.clone().add(V3(Math.cos(el)*Math.cos(yaw)*len, Math.sin(el)*len, Math.cos(el)*Math.sin(yaw)*len));
    addStem(p,q,0.006-depth*0.0012, STEM);
    const nl = Math.round((4+depth)*clamp(a/40,0.3,1)*V.leaf);
    for (let i=0;i<nl;i++){ const t=rr(0.2,1); const bp=p.clone().lerp(q,t); const ll=rr(0.08,0.13)*clamp(0.5+a/60,0.5,1);
      addLeaf('pep', leafMatrix(bp, R()*6.28, rr(-0.5,0.15), rr(-0.5,0.5), ll, ll*0.5), leafColor(0.85, bp.y+0.6, false).multiplyScalar(0.9)); }
    if (depth<2) for (let k=0;k<2;k++) branch(q, yaw+rr(-0.8,0.8), el+rr(-0.25,0.15), len*0.7, depth+1); else tips.push(q);
  };
  const nb = 2 + (R()<0.5?1:0);
  for (let b=0;b<nb;b++) branch(V3(x,fork,z), b*2.1+R(), rr(0.85,1.15), (h-fork)*0.55, 0);
  // fruit: one sets about every 8 days from ~25 days after transplant; picked once fully coloured
  for (let k=0;k<40;k++){
    const ts = 25 + k*8 + rr(-2,2), fa = a - ts; if (fa<0) break;
    if (fa > 52 + V.ripe*-8) continue;
    if (R()>V.fruit*1.1) continue;
    const size = clamp(0.3 + fa/28*0.7, 0.3, 1);
    const col = new T.Color('#2f6b22').lerp(colourEnd, smooth01((fa-34-V.ripe*8)/14)).multiplyScalar(rr(0.9,1.05));
    const t = tips[(R()*tips.length)|0] || V3(x,h*0.7,z);
    const len = 0.085*size*rr(0.9,1.1), r = 0.04*size*rr(0.9,1.08);
    const ctr = V3(t.x+rr(-0.06,0.06), clamp(t.y - 0.1 - len/2 - rr(0,0.15), 0.12, h), t.z+rr(-0.06,0.06));
    _q.setFromEuler(new T.Euler(rr(-0.25,0.25), R()*6, rr(-0.25,0.25)));
    _m.compose(ctr,_q,_s.set(r,len,r));
    addFruit('pep', _m.clone(), col, {x:ctr.x,y:ctr.y,z:ctr.z,r,row:ri});
    _m.compose(_p.set(ctr.x,ctr.y+len*0.5,ctr.z), _q.identity(), _s.set(r*0.45,r*0.25,r*0.45)); B.calyx.push(_m.clone());
  }
  if (a>20) for (let i=0;i<3;i++){ const t=tips[(R()*tips.length)|0]; if (t) addFlower(V3(t.x+rr(-.03,.03),t.y,t.z+rr(-.03,.03)), 0.014); }
  return h;
}
// cucumber on a string: one fruit about every 4 days from day 20, picked ~14 days after setting. Returns height.
function cucumberPlant(x, z, a, cycleLen, V, ri, STEM, SHOOT){
  const h = Math.min(2.25, 0.15 + 0.045*a);
  addStem(V3(x,0.05,z), V3(x+rr(-.03,.03),h,z), 0.0075, STEM);
  if (h < 2.28) addStem(V3(x,h,z), V3(x,2.3,z), 0.0012, new T.Color('#e8e4d6'));
  let s = R()<0.5?1:-1;
  for (let y=0.3; y<h-0.02; y+=0.11/Math.sqrt(V.leaf)){
    s=-s; if (a>40 && y<0.4) continue;
    const young = clamp((h-y)/0.35,0,1);
    const yaw = s*Math.PI/2 + rr(-1.0,1.0);
    const pet = rr(0.07,0.15);
    const LB = V3(x+Math.cos(yaw)*pet, y+0.04, z+Math.sin(yaw)*pet);
    addStem(V3(x,y,z), LB, 0.003, SHOOT);
    const len=rr(0.18,0.3)*(0.4+0.6*young)*V.reach;
    const v = R()<V.yellow*(y<0.8?2:0.6) ? 2 : (R()*2)|0;
    addLeaf('cuc'+v, leafMatrix(LB,yaw,rr(-0.5,0.25),rr(-0.5,0.5),len,len*0.98), v===2? leafColor(0.8, y, false).lerp(WHITE,0.3) : leafColor(0.8, y, false));
    if (y>h-0.5 && R()<0.35) addFlower(V3(x+Math.cos(yaw)*0.05, y, z+Math.sin(yaw)*0.05), 0.03);
  }
  for (let k=0;k<60;k++){
    const te = 20 + k*4 + rr(-1,1), fa = a - te; if (fa<0) break;
    if (fa > 14 + V.ripe*-3) continue;
    if (R()>V.fruit*1.05) continue;
    const hte = Math.min(2.25, 0.15+0.045*te);
    const y = hte<2.2 ? hte - 0.25 : rr(0.7,2.0);
    const g = clamp(fa/12, 0, 1);
    const az=R()*6.28, tl=rr(0.04,0.35);
    const ax=V3(Math.sin(tl)*Math.cos(az), -Math.cos(tl), Math.sin(tl)*Math.sin(az));
    addLongFruit('cuc', V3(x+Math.cos(az)*0.05, y, z+Math.sin(az)*0.05), ax, 0.05+0.15*g, 0.007+0.011*g, new T.Color(R()<0.2?'#557f2e':'#2f5a22').multiplyScalar(rr(0.85,1.12)), ri);
  }
  return h;
}
// zucchini bush: big leaves from a crown, a fruit about every 3 days from day 24, picked ~8 days after setting
function zucchiniPlant(x, z, a, V, ri){
  const g = clamp(a/35, 0.2, 1);
  const nl = Math.round(Math.min(15, 3 + a*0.35)*V.leaf);
  const crown = V3(x,0.06,z);
  for (let i=0;i<nl;i++){
    const yaw=i*2.4+R()*0.6, pl=rr(0.1,0.26)*g, el=rr(0.35,0.9);
    const tip=V3(x+Math.cos(yaw)*Math.cos(el)*pl, 0.06+Math.sin(el)*pl, z+Math.sin(yaw)*Math.cos(el)*pl);
    addStem(crown, tip, 0.0045, new T.Color('#7a9a4a'));
    const len=rr(0.28,0.45)*g*V.reach;
    addLeaf('zuc'+(R()<0.5?0:1), leafMatrix(tip, yaw, rr(-0.35,0.3), rr(-0.5,0.5), len, len*1.05), leafColor(0.75+0.25*R(), tip.y+0.8, R()<V.yellow));
  }
  for (let k=0;k<60;k++){
    const te = 24 + k*3 + rr(-1,1), fa = a - te; if (fa<0) break;
    if (fa > 8 + V.ripe*-2) continue;
    if (R()>V.fruit*1.05) continue;
    const gr = clamp(fa/7, 0, 1);
    const az=R()*6.28, ax=V3(Math.cos(az)*0.9, -0.42, Math.sin(az)*0.9).normalize();
    addLongFruit('zuc', V3(x+Math.cos(az)*0.04, rr(0.12,0.2), z+Math.sin(az)*0.04), ax, 0.06+0.14*gr, 0.009+0.013*gr, new T.Color(R()<0.15?'#4f7a2a':'#24451c').multiplyScalar(rr(0.85,1.15)), ri);
    if (fa<2) addFlower(V3(x+Math.cos(az)*(0.1+0.14*gr), 0.1, z+Math.sin(az)*(0.1+0.14*gr)), 0.05);
  }
  return 0.15 + 0.5*g;
}

/* ---------- University arch 2: leafy greens and herbs ---------- */
// baby leaf bands 0.60 m wide; cut and re-sown. Returns canopy height (m) for a crop on a given day.
const LEAFY = {
  kale:  {first:30, every:10, cuts:3, resow:7, lastSow:180, h:0.13},
  rocca: {first:25, every:10, cuts:3, resow:7, lastSow:180, h:0.12},
  spin:  {first:30, every:12, cuts:2, resow:7, lastSow:134, h:0.11},
  cori:  {first:40, every:14, cuts:2, resow:7, lastSow:150, h:0.25},
};
function bandState(P, day){
  const cycle = P.first + P.every*(P.cuts-1) + P.resow;
  let sow = 0;
  while (sow + cycle <= day && sow + cycle <= P.lastSow) sow += cycle;
  const a = day - sow, lastCut = P.first + P.every*(P.cuts-1);
  if (a >= lastCut) return {bare:true};
  if (a < 5) return {h:0, sown:true};
  if (a < P.first) return {h: P.h*smooth01((a-5)/(P.first-5))};
  return {h: 0.03 + (P.h*0.85-0.03)*smooth01(((a-P.first)%P.every)/P.every), cut:true};
}
function buildUniLeafy(V, day){
  const tops={}; const setTop=(ri,h)=>{ tops[ri]=Math.max(tops[ri]||0.03,h); };
  const status=[];
  const bands=[['kale','kale',0],['rocca','rocca',1],['spin','spin',2]];
  const st={};
  bands.forEach(([key])=>{ st[key]=bandState(LEAFY[key], day); });
  st.cori = bandState(LEAFY.cori, day);
  const label = (n,s) => !s || s.bare ? `${n}: bed cleared` : s.h===0 ? `${n}: sown, germinating` : s.cut ? `${n}: regrowing after a cut` : `${n}: growing, ${Math.round(s.h*100)} cm`;
  status.push(label('Baby kale',st.kale), label('Baby rocca',st.rocca), label('Baby spinach',st.spin), label('Coriander',st.cori));
  const herbAge = day; // rosemary and thyme transplanted 1 Nov, first cut at 90 / 75 days then every 28 days
  status.push(herbAge<75? 'Rosemary and thyme establishing' : 'Rosemary and thyme cut every 4 weeks');
  const greensCol = {kale:'#8fa8a0', rocca:'#a7c48c', spin:'#87a776', cori:'#a4c88a', ros:'#bfc8b8', thy:'#c3cbb2'};
  for (const side of [1,-1]) for (let p=0;p<7;p++){
    const x0=plotX0(p);
    bands.forEach(([key,tex,k])=>{
      const s=st[key]; const ri=ROWS.findIndex(r=>r.side===side && r.k===k);
      if (!s || s.bare || !s.h) return;
      const zc=lineZ(side,k); const n=Math.round(560*V.leaf*clamp(s.h/LEAFY[key].h,0.3,1));
      for (let i=0;i<n;i++){
        const row = (R()*5)|0; const zz = zc - 0.24 + row*0.12 + rr(-0.03,0.03);
        const bp = V3(x0+rr(0.05,3.95), 0.015, zz);
        const len = s.h*rr(0.75,1.25)*(key==='kale'?1.1:1);
        addLeaf(tex, leafMatrix(bp, R()*6.28, rr(0.5,1.25), rr(-0.4,0.4), len, len*(key==='rocca'?0.55:key==='spin'?0.75:0.62)),
          new T.Color(greensCol[key]).multiplyScalar(rr(0.7,1.1)));
      }
      setTop(ri, s.h);
    });
    // line 4: rosemary | thyme | coriander, each 1.33 m
    const z4=lineZ(side,3), ri4=ROWS.findIndex(r=>r.side===side && r.k===3 && r.p===p);
    const gH = clamp(herbAge/120,0.3,1), cutF = herbAge>90 ? 1-0.18*((herbAge-90)%28)/28 : 1;
    for (let r=0;r<2;r++) for (let i=0;i<3;i++){ // rosemary: 2 rows @ 40 cm, 6 plants
      const cx=x0+0.27+i*0.4, cz=z4+(r?0.15:-0.15); const hh=(0.2+0.25*gH)*(1.25-0.25*cutF);
      for (let k=0;k<Math.round(26*gH);k++){ const yaw=R()*6.28; addLeaf('ros', leafMatrix(V3(cx+rr(-.05,.05),0.02,cz+rr(-.05,.05)), yaw, rr(1.0,1.45), rr(-1,1), hh*rr(0.6,1.0), hh*0.25), new T.Color(greensCol.ros).multiplyScalar(rr(0.75,1.05))); }
      setTop(ri4, hh); }
    for (let r=0;r<2;r++) for (let i=0;i<5;i++){ // thyme: 2 rows @ 25 cm, 10 plants
      const cx=x0+1.43+i*0.25, cz=z4+(r?0.13:-0.13); const hh=(0.08+0.12*gH);
      for (let k=0;k<Math.round(22*gH);k++){ addLeaf('thy', leafMatrix(V3(cx+rr(-.03,.03),0.02,cz+rr(-.03,.03)), R()*6.28, rr(0.4,1.2), rr(-1,1), hh*rr(0.6,1.1), hh*0.3), new T.Color(greensCol.thy).multiplyScalar(rr(0.75,1.05))); } }
    const sc=st.cori; if (sc && !sc.bare && sc.h){ // coriander: 5 rows @ 12 cm
      for (let i=0;i<Math.round(140*V.leaf);i++){ const row=(R()*5)|0; const bp=V3(x0+2.7+rr(0,1.25), 0.015, z4-0.24+row*0.12+rr(-.03,.03)); const len=sc.h*rr(0.5,0.9);
        addLeaf('cori', leafMatrix(bp, R()*6.28, rr(0.6,1.3), rr(-0.5,0.5), len, len*0.55), new T.Color(greensCol.cori).multiplyScalar(rr(0.75,1.1))); } }
  }
  ROWS.forEach((r,i)=>{ r.top=Math.max(0.03, tops[i]||0.03); });
  return {day, date:fmtDay(day), lines:status};
}

/* ---------- test board (simulator only uses it) ---------- */
const boardMat = new T.MeshBasicMaterial({side:T.DoubleSide});
const board = new T.Mesh(new T.PlaneGeometry(1,1), boardMat); board.visible=false; scene.add(board);

/* ---------- camera + lens ---------- */
const SENSORS = { s28:{w:5.58,name:'1/2.8″'}, s18:{w:7.18,name:'1/1.8″'}, apsc:{w:23.5,name:'APS-C'}, ff:{w:36,name:'Full frame'} };
const STOPS = [1.4,1.6,1.8,2,2.2,2.5,2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16,18,20,22];
const uInv = (d,k) => { if (d<1e-9 || k<1e-7) return d; const disc=1-4*k*d*d; return (1-Math.sqrt(Math.max(disc,0)))/(2*k*d); };
function lens(S){
  let o;
  if (S.mode==='hik'){
    const f=S.fHik, k=0.132*Math.pow(Math.max(0,(12-f)/9.2),1.3);
    const uE=0.025+3.231/f, W=5.58, H=W*9/16;
    const dx=uE/(1+k*uE*uE), fe=(W/2)/dx;
    o={f, fe, k, W, H, dx, dy:(H/2)/fe, N:1.8+(f-2.8)/9.2};
  } else {
    const W=SENSORS[S.sensor].w, H=W*9/16, f=S.fFree;
    const dx=(W/2)/f, dy=(H/2)/f;
    o={f, fe:f, k:Math.min(S.kFree, 0.9/(4*(dx*dx+dy*dy))), W, H, dx, dy, N:STOPS[S.nIdx]};
  }
  o.A=o.fe/o.N; o.pitch=o.W/2560; o.fPx=o.fe/o.pitch;
  const dc=Math.hypot(o.dx,o.dy), uc=uInv(dc,o.k);
  o.tx=uc*o.dx/dc; o.ty=uc*o.dy/dc;
  o.hfov=2*Math.atan(uInv(o.dx,o.k))*180/Math.PI; o.vfov=2*Math.atan(uInv(o.dy,o.k))*180/Math.PI;
  o.hfovRect=2*Math.atan(o.dx)*180/Math.PI;
  return o;
}
const ptz = new T.PerspectiveCamera(50, 16/9, 0.02, 90); ptz.rotation.order='YXZ'; ptz.layers.enable(2);
const fwd = new T.Vector3();
function setPose(S, LN){
  ptz.position.set(S.x, S.h, S.z);
  ptz.rotation.set(-S.tilt*Math.PI/180, -(Math.PI/2 + S.pan*Math.PI/180), 0, 'YXZ');
  ptz.fov = 2*Math.atan(LN.ty)*180/Math.PI; ptz.aspect = LN.tx/LN.ty; ptz.updateProjectionMatrix(); ptz.updateMatrixWorld(true);
  fwd.set(0,0,-1).applyQuaternion(ptz.quaternion);
}
function rayDir(LN, dxn, dyn){ const r=Math.hypot(dxn,dyn); const u=r>1e-9? uInv(r,LN.k)/r : 1; return new T.Vector3(dxn*u, dyn*u, -1).normalize().applyQuaternion(ptz.quaternion); }

/* ---------- target finding (what the optical axis hits) ---------- */
function rayBox(o,d,mn,mx){
  let tmin=-Infinity, tmax=Infinity, ax=-1, sg=0;
  for(let i=0;i<3;i++){ const oi=o.getComponent(i), di=d.getComponent(i), lo=mn[i], hi=mx[i];
    if (Math.abs(di)<1e-9){ if(oi<lo||oi>hi) return null; continue; }
    let t1=(lo-oi)/di, t2=(hi-oi)/di; if(t1>t2){const s=t1;t1=t2;t2=s;}
    if(t1>tmin){ tmin=t1; ax=i; sg=di>0?-1:1; } if(t2<tmax) tmax=t2; }
  if (tmax<tmin || tmin<=0) return null;
  return {t:tmin, axis:ax, sign:sg};
}
function makeSurface(O, n, Bv, corners, label, kind){
  const A=new T.Vector3().crossVectors(n.clone().negate(), Bv).normalize();
  let a0=Infinity,a1=-Infinity,b0=Infinity,b1=-Infinity;
  corners.forEach(c=>{ const v=c.clone().sub(O); const a=v.dot(A), b=v.dot(Bv); a0=Math.min(a0,a); a1=Math.max(a1,a); b0=Math.min(b0,b); b1=Math.max(b1,b); });
  return {O, n, A, B:Bv, rect:[a0,a1,b0,b1], label, kind};
}
function camUpOnPlane(n){ const up=new T.Vector3(0,1,0).applyQuaternion(ptz.quaternion); up.addScaledVector(n,-up.dot(n)); if(up.lengthSq()<1e-6){ up.set(1,0,0).applyQuaternion(ptz.quaternion); up.addScaledVector(n,-up.dot(n)); } return up.normalize(); }
function findTarget(C, d){
  let best=null;
  if (board.visible){
    const n=new T.Vector3(0,0,1).applyQuaternion(board.quaternion); if (n.dot(d)>0) n.negate();
    const denom=d.dot(n);
    if (denom<-1e-6){ const t=board.position.clone().sub(C).dot(n)/denom;
      if (t>0){ const P=C.clone().addScaledVector(d,t); const bx=new T.Vector3(1,0,0).applyQuaternion(board.quaternion), by=new T.Vector3(0,1,0).applyQuaternion(board.quaternion);
        const v=P.clone().sub(board.position); const w=board.scale.x/2, h=board.scale.y/2;
        if (Math.abs(v.dot(bx))<=w && Math.abs(v.dot(by))<=h){
          const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>board.position.clone().addScaledVector(bx,i*w).addScaledVector(by,j*h));
          best={t, surf:makeSurface(board.position.clone(), n, by.clone(), corners, 'Test board','board')}; } } } }
  ROWS.forEach(r=>{
    const hw=r.hw, top=r.top, x0=r.x0, x1=r.x1;
    const mn=[x0,0,r.z-hw], mx=[x1,top,r.z+hw];
    const hit=rayBox(C,d,mn,mx); if(!hit) return; if (best && best.t<hit.t) return;
    let n, Bv, corners, label, kind; const P=C.clone().addScaledVector(d,hit.t);
    if (hit.axis===2){ n=V3(0,0,hit.sign); Bv=V3(0,1,0); const zf=hit.sign>0?mx[2]:mn[2];
      corners=[[x0,0],[x1,0],[x1,top],[x0,top]].map(([x,y])=>V3(x,y,zf)); label=r.name+' face'; kind='side'; }
    else if (hit.axis===1){ n=V3(0,1,0); Bv=camUpOnPlane(n);
      corners=[[x0,mn[2]],[x1,mn[2]],[x1,mx[2]],[x0,mx[2]]].map(([x,z])=>V3(x,top,z)); label=r.name+' top'; kind='top'; }
    else { n=V3(hit.sign,0,0); Bv=V3(0,1,0); const xf=hit.sign>0?x1:x0;
      corners=[[mn[2],0],[mx[2],0],[mx[2],top],[mn[2],top]].map(([z,y])=>V3(xf,y,z)); label=r.name+' end'; kind='end'; }
    best={t:hit.t, surf:makeSurface(P, n, Bv, corners, label, kind), row:r};
  });
  if (d.y<-1e-4){ const t=-C.y/d.y; if (!best || t<best.t){ const n=V3(0,1,0); const P=C.clone().addScaledVector(d,t);
      best={t, surf:makeSurface(P,n,camUpOnPlane(n),[[LAY.xMin,-WALL],[LAY.xMax,-WALL],[LAY.xMax,WALL],[LAY.xMin,WALL]].map(([x,z])=>V3(x,0,z)),'Floor','floor')}; } }
  return best;
}

/* ---------- render targets and shaders ---------- */
const MAXTEX = renderer.capabilities.maxTextureSize;
let rtScene=null, rtRaw=null, rtIdOver=null, rtIdOut=null, OUTW=1920, OUTH=1080;
function makeTargets(LN, outW){
  OUTW=outW; OUTH=Math.round(outW*9/16);
  const Wr=Math.min(MAXTEX, 4096, Math.round(outW*LN.tx/LN.dx)), Hr=Math.round(Wr*LN.ty/LN.tx);
  if (!rtRaw || rtRaw.width!==OUTW){ rtRaw && rtRaw.dispose(); rtRaw=new T.WebGLRenderTarget(OUTW,OUTH,{minFilter:T.LinearFilter, magFilter:T.LinearFilter});
    rtIdOut && rtIdOut.dispose(); rtIdOut=new T.WebGLRenderTarget(OUTW,OUTH,{minFilter:T.NearestFilter, magFilter:T.NearestFilter, generateMipmaps:false}); }
  if (!rtScene || Math.abs(rtScene.width-Wr)>8 || Math.abs(rtScene.height-Hr)>8){
    rtScene && rtScene.dispose();
    const dt=new T.DepthTexture(Wr,Hr); dt.type=T.UnsignedIntType;
    rtScene=new T.WebGLRenderTarget(Wr,Hr,{type:T.HalfFloatType, depthTexture:dt, samples:Math.min(4,renderer.capabilities.maxSamples||0)});
    rtIdOver && rtIdOver.dispose(); rtIdOver=new T.WebGLRenderTarget(Wr,Hr,{minFilter:T.NearestFilter, magFilter:T.NearestFilter, generateMipmaps:false});
  }
}
const quadCam = new T.OrthographicCamera(-1,1,1,-1,0,1);
const quadScene = new T.Scene(); const quad = new T.Mesh(new T.PlaneGeometry(2,2)); quad.frustumCulled=false; quadScene.add(quad);
const VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const UNDIST = `vec2 undist(vec2 d){ float r=length(d); if(r<1e-6||k<1e-7) return d; float u=(1.0-sqrt(max(1.0-4.0*k*r*r,0.0)))/(2.0*k*r); return d*(u/r); }`;
const postMat = new T.ShaderMaterial({ vertexShader:VS, depthTest:false, depthWrite:false,
  uniforms:{ tScene:{value:null}, tDepth:{value:null}, dE:{value:new T.Vector2()}, tE:{value:new T.Vector2()}, k:{value:0}, near:{value:0.02}, far:{value:90},
    focus:{value:2}, fMm:{value:4}, apMm:{value:2}, N:{value:2}, expo:{value:1}, maxR:{value:0.05}, rtW:{value:1920}, tint:{value:new T.Vector3(1,1,1)}, noise:{value:0}, seed:{value:0} },
  fragmentShader:`
  uniform sampler2D tScene, tDepth; uniform vec2 dE, tE; uniform float k, near, far, focus, fMm, apMm, N, expo, maxR, rtW, noise, seed; uniform vec3 tint; varying vec2 vUv;
  ${UNDIST}
  float depthAt(vec2 uv){ float z=texture2D(tDepth,uv).x; return (near*far)/(far-(far-near)*z); }
  float coc(float zm){ float S=zm*1000.0, Sf=focus*1000.0; float c=apMm*fMm*abs(S-Sf)/(S*max(Sf-fMm,1e-3)); float d=0.67*0.00055*N; return sqrt(0.25*c*c+d*d)/fMm; }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
  float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+seed)*43758.5453); }
  void main(){
    vec2 d=(vUv*2.0-1.0)*dE; vec2 u=undist(d); vec2 uv=u/tE*0.5+0.5;
    float z=depthAt(uv); float r=min(coc(z),maxR); float pix=2.0*tE.x/rtW;
    vec3 col=texture2D(tScene,uv).rgb;
    if(r>0.6*pix){
      vec3 acc=col; float ws=1.0;
      for(int i=0;i<36;i++){ float fi=float(i)+0.5; float rad=sqrt(fi/36.0)*r; float a=fi*2.39996323;
        vec2 o=vec2(cos(a),sin(a))*rad; vec2 us=(u+o)/tE*0.5+0.5;
        float zs=depthAt(us); float rs=min(coc(zs),maxR);
        float w=clamp((rs-rad)/pix+1.0,0.0,1.0);
        if(zs>z) w=max(w, clamp((r-rad)/pix+1.0,0.0,1.0));
        acc+=texture2D(tScene,us).rgb*w; ws+=w; }
      col=acc/ws; }
    float th=atan(length(u)); col*=mix(1.0,pow(cos(th),4.0),0.45);
    col=aces(col*expo*tint);
    col=pow(col,vec3(1.0/2.2));
    if(noise>0.0) col+=(vec3(hash(gl_FragCoord.xy),hash(gl_FragCoord.yx+3.1),hash(gl_FragCoord.xy+7.7))-0.5)*noise;
    gl_FragColor=vec4(col,1.0);
  }`});
const remapMat = new T.ShaderMaterial({ vertexShader:VS, depthTest:false, depthWrite:false,
  uniforms:{ t:{value:null}, dE:{value:new T.Vector2()}, tE:{value:new T.Vector2()}, k:{value:0} },
  fragmentShader:`uniform sampler2D t; uniform vec2 dE, tE; uniform float k; varying vec2 vUv; ${UNDIST}
  void main(){ vec2 d=(vUv*2.0-1.0)*dE; vec2 uv=undist(d)/tE*0.5+0.5; gl_FragColor=texture2D(t,uv); }`});
const idMat = new T.ShaderMaterial({
  vertexShader:`attribute float aId; varying float vId; void main(){ vId=aId; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.0); }`,
  fragmentShader:`varying float vId; void main(){ float id=floor(vId+0.5); gl_FragColor=vec4(mod(id,256.0), mod(floor(id/256.0),256.0), floor(id/65536.0), 255.0)/255.0; }`});
const blackMat = new T.MeshBasicMaterial({color:0x000000, side:T.DoubleSide, fog:false});

function cocPx(LN, focus, zm){ const S1=focus*1000, S2=zm*1000; const c=LN.A*LN.fe*Math.abs(S2-S1)/(S2*Math.max(S1-LN.fe,1e-3)); const d=2*0.67*0.00055*LN.N; return Math.hypot(c,d)/LN.pitch; }

// renders the camera image into rtRaw (sRGB bytes, OUTW x OUTH)
function renderCamera(S, LN, focus, opts){
  opts = opts||{};
  renderer.setRenderTarget(rtScene); renderer.render(scene, ptz);
  const U=postMat.uniforms;
  U.tScene.value=rtScene.texture; U.tDepth.value=rtScene.depthTexture; U.dE.value.set(LN.dx,LN.dy); U.tE.value.set(LN.tx,LN.ty); U.k.value=LN.k;
  U.near.value=ptz.near; U.far.value=ptz.far; U.focus.value=focus; U.fMm.value=LN.fe; U.apMm.value=LN.A; U.N.value=LN.N; U.rtW.value=rtScene.width;
  U.maxR.value = 36*(2*LN.dx/OUTW);
  U.expo.value = 0.92*LIGHT.expo*(opts.lockExp? Math.pow(2.8/LN.N,2):1);
  U.tint.value.set(...LIGHT.tint); U.noise.value=LIGHT.noise; U.seed.value=(R()*100);
  quad.material=postMat; renderer.setRenderTarget(rtRaw); renderer.render(quadScene, quadCam);
  renderer.setRenderTarget(null);
}

// pixel-exact fruit visibility after lens distortion.
// Returns arrays indexed by fruit id (1..NF): vis = visible px, full = px with leaves removed, bbox of visible px.
function labelPass(LN){
  const W=OUTW, H=OUTH;
  const saved=[];
  scene.traverse(o=>{ if(!(o.isMesh||o.isLine||o.isPoints)) return; saved.push([o,o.material,o.visible]); });
  const bg=scene.background, fog=scene.fog; scene.background=new T.Color(0); scene.fog=null;
  const roofV=roofGroup.visible; roofGroup.visible=false;
  const shNeed=renderer.shadowMap.needsUpdate; renderer.shadowMap.needsUpdate=false;
  const passes=[];
  for (const fruitOnly of [false,true]){
    saved.forEach(([o])=>{
      if (o.userData.fruit){ o.material=idMat; o.visible=true; }
      else if (fruitOnly){ o.visible=false; }
      else if (o.userData.black){ o.material=o.userData.black; }
      else if (o.isMesh){ o.material=blackMat; } else { o.visible=false; } });
    renderer.setRenderTarget(rtIdOver); renderer.setClearColor(0x000000,1); renderer.clear(); renderer.render(scene, ptz);
    const U=remapMat.uniforms; U.t.value=rtIdOver.texture; U.dE.value.set(LN.dx,LN.dy); U.tE.value.set(LN.tx,LN.ty); U.k.value=LN.k;
    quad.material=remapMat; renderer.setRenderTarget(rtIdOut); renderer.render(quadScene,quadCam);
    const buf=new Uint8Array(W*H*4); renderer.readRenderTargetPixels(rtIdOut,0,0,W,H,buf); passes.push(buf);
  }
  renderer.setRenderTarget(null); renderer.shadowMap.needsUpdate=shNeed;
  saved.forEach(([o,m,v])=>{ o.material=m; o.visible=v; });
  scene.background=bg; scene.fog=fog; roofGroup.visible=roofV;
  const vis=new Uint32Array(NF+1), full=new Uint32Array(NF+1);
  const x0=new Int32Array(NF+1).fill(1e9), y0=new Int32Array(NF+1).fill(1e9), x1=new Int32Array(NF+1).fill(-1), y1=new Int32Array(NF+1).fill(-1);
  const A=passes[0], Bf=passes[1];
  for (let row=0; row<H; row++){ const yi=H-1-row; let p=row*W*4;
    for (let x=0; x<W; x++, p+=4){
      const ib=Bf[p]|(Bf[p+1]<<8)|(Bf[p+2]<<16); if (ib && ib<=NF) full[ib]++;
      const ia=A[p]|(A[p+1]<<8)|(A[p+2]<<16);
      if (ia && ia<=NF){ vis[ia]++; if(x<x0[ia])x0[ia]=x; if(x>x1[ia])x1[ia]=x; if(yi<y0[ia])y0[ia]=yi; if(yi>y1[ia])y1[ia]=yi; } } }
  return {W,H,vis,full,x0,y0,x1,y1};
}
// YOLO boxes from a label pass
function yoloBoxes(LP, minVis, minPx){
  const out=[];
  for (let id=1; id<=NF; id++){
    if (!LP.full[id] || !LP.vis[id]) continue;
    const ratio = Math.min(1, LP.vis[id]/LP.full[id]);
    if (ratio < minVis) continue;
    const bw=LP.x1[id]-LP.x0[id]+1, bh=LP.y1[id]-LP.y0[id]+1;
    if (Math.max(bw,bh) < minPx) continue;
    out.push({id, cls: FR[id-1].cls, x0:LP.x0[id], y0:LP.y0[id], w:bw, h:bh, ratio});
  }
  return out;
}
function readRaw(){
  const W=OUTW, H=OUTH, buf=new Uint8Array(W*H*4); renderer.readRenderTargetPixels(rtRaw,0,0,W,H,buf);
  const img=new ImageData(W,H); const row=W*4;
  for (let y=0;y<H;y++) img.data.set(buf.subarray((H-1-y)*row,(H-y)*row), y*row);
  return img;
}
setLayout('albatha');
/* ===== end core ===== */
