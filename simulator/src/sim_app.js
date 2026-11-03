/* ===== simulator app ===== */
const FARM_PHOTO = "__FARM_PHOTO__";
const S = { layout:'albatha', day:120, mode:'hik', x:6, z:0.5, h:1.2, pan:330, tilt:0, fHik:8.4, fFree:35, sensor:'ff', nIdx:6, kFree:0.02,
  lockExp:false, af:true, focus:2, bOn:false, bImg:'check', bd:1, bw:1.2, ba:0, q:1920, mark:false, tint:true, grid:true };
if (innerWidth < 700) S.q = 1280;

/* board textures */
const boardTex = { check: checkerTex(), farm:null, user:null };
boardMat.map = boardTex.check;
let boardAspect = 16/9;
function loadBoardImage(src, key){ const img=new Image(); img.onload=()=>{ const t=new T.Texture(img); t.colorSpace=T.SRGBColorSpace; t.needsUpdate=true; boardTex[key]=t; if(S.bImg===key){ setBoardTex(); update(); } }; img.src=src; }
if (FARM_PHOTO.startsWith('data:')) loadBoardImage(FARM_PHOTO,'farm');
function setBoardTex(){ const t=boardTex[S.bImg]||boardTex.check; boardMat.map=t; boardMat.needsUpdate=true; const im=t.image; boardAspect = im && im.width ? im.width/im.height : 16/9; }

/* helpers (overview only, layer 1) */
const helpers = new T.Group(); scene.add(helpers);
const camModel = new T.Group();
{ const body=new T.Mesh(new T.CylinderGeometry(0.07,0.075,0.05,24), new T.MeshStandardMaterial({color:0xf2f2ee, roughness:0.4}));
  const dome=new T.Mesh(new T.SphereGeometry(0.06,24,12,0,Math.PI*2,0,Math.PI/2), new T.MeshStandardMaterial({color:0x111418, roughness:0.15, metalness:0.2}));
  dome.rotation.x=Math.PI; dome.position.y=-0.025; body.add(dome);
  const arm=new T.Mesh(new T.CylinderGeometry(0.015,0.015,0.3,8), metal); arm.position.y=0.17; body.add(arm);
  camModel.add(body); }
helpers.add(camModel);
const frustumGeo = new T.BufferGeometry(); frustumGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(3*400),3));
helpers.add(new T.LineSegments(frustumGeo, new T.LineBasicMaterial({color:0xd9482f})));
const fpGeo = new T.BufferGeometry(); fpGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(3*8),3));
const fpLines = new T.LineLoop(fpGeo, new T.LineBasicMaterial({color:0x2f6fe0})); helpers.add(fpLines);
const hitDot = new T.Mesh(new T.SphereGeometry(0.035,12,8), new T.MeshBasicMaterial({color:0x2f6fe0})); helpers.add(hitDot);
helpers.traverse(o=>o.layers.set(1));

const ovCam = new T.PerspectiveCamera(45, 16/9, 0.05, 220); ovCam.layers.enable(1);
const OV = {theta:-2.25, phi:1.05, r:9, follow:true, target:new T.Vector3()};

/* ---------- main update ---------- */
let LN=null, TGT=null, REG=null, USE=null;
function clampPose(){
  const hik = S.mode==='hik';
  S.tilt = clamp(S.tilt, hik?0:-45, 90);
  if (hik) S.pan = clamp(S.pan,0,355); else S.pan = ((S.pan%360)+360)%360;
  S.x = clamp(S.x, LAY.xMin+0.2, LAY.xMax-0.2);
  S.z = clamp(S.z,-WALL+0.2,WALL-0.2);
  S.h = clamp(S.h, 0.2, roofY(S.z)-0.25);
}
function update(){
  clampPose();
  LN = lens(S); setPose(S, LN);
  board.visible = S.bOn;
  if (S.bOn){ board.scale.set(S.bw,S.bw/boardAspect,1); board.position.copy(ptz.position).addScaledVector(fwd,S.bd);
    board.quaternion.copy(ptz.quaternion); board.rotateY(-S.ba*Math.PI/180); board.updateMatrixWorld(true); }
  makeTargets(LN, S.q);
  TGT = findTarget(ptz.position.clone(), fwd.clone());
  if (S.af) S.focus = TGT ? clamp(TGT.t,0.15,60) : 30;
  REG=null; USE=null;
  if (TGT){
    const sf=TGT.surf, C=ptz.position; const d20 = LN.fPx*0.03/20;
    let a0=Infinity,a1=-Infinity,b0=Infinity,b1=-Infinity, u0=Infinity,u1=-Infinity, any=false;
    const NX=40, NY=23;
    for(let j=0;j<=NY;j++) for(let i=0;i<=NX;i++){
      const dir=rayDir(LN,(i/NX*2-1)*LN.dx,(j/NY*2-1)*LN.dy);
      const den=dir.dot(sf.n); if (den>-1e-6) continue;
      const t=sf.O.clone().sub(C).dot(sf.n)/den; if (t<=0||t>80) continue;
      const P=C.clone().addScaledVector(dir,t).sub(sf.O); const a=P.dot(sf.A), b=P.dot(sf.B);
      const [r0,r1,s0,s1]=sf.rect; if (a<r0-0.02||a>r1+0.02||b<s0-0.02||b>s1+0.02) continue;
      any=true; a0=Math.min(a0,a); a1=Math.max(a1,a); b0=Math.min(b0,b); b1=Math.max(b1,b);
      if (t*dir.dot(fwd)<=d20){ u0=Math.min(u0,a); u1=Math.max(u1,a); } }
    if (any){ const [r0,r1,s0,s1]=sf.rect; REG=[Math.max(a0,r0),Math.min(a1,r1),Math.max(b0,s0),Math.min(b1,s1)];
      if (u1>u0) USE=[Math.max(u0,r0),Math.min(u1,r1)]; }
  }
  updateHelpers(); readouts(); drawPinhole(); syncUI();
  needRender=true; scheduleCount();
}
function updateHelpers(){
  camModel.position.copy(ptz.position);
  const pos=frustumGeo.attributes.position.array; let n=0;
  const C=ptz.position; const sf=TGT&&TGT.surf;
  const endPt=(dxn,dyn)=>{ const dir=rayDir(LN,dxn,dyn); let t=2.5;
    if (sf){ const den=dir.dot(sf.n); if (den<-1e-6){ const tt=sf.O.clone().sub(C).dot(sf.n)/den; if (tt>0) t=Math.min(tt,14); } }
    return C.clone().addScaledVector(dir,t); };
  const border=[]; const M=10;
  for(let i=0;i<M;i++) border.push([(-1+2*i/M),-1]); for(let i=0;i<M;i++) border.push([1,(-1+2*i/M)]);
  for(let i=0;i<M;i++) border.push([(1-2*i/M),1]); for(let i=0;i<M;i++) border.push([-1,(1-2*i/M)]);
  const pts=border.map(([a,b])=>endPt(a*LN.dx,b*LN.dy));
  const put=(p)=>{ pos[n++]=p.x; pos[n++]=p.y; pos[n++]=p.z; };
  for(let i=0;i<pts.length;i++){ put(pts[i]); put(pts[(i+1)%pts.length]); }
  for(const i of [0,M,2*M,3*M]){ put(C); put(pts[i]); }
  const ax=endPt(0,0); put(C); put(ax);
  frustumGeo.setDrawRange(0,n/3); frustumGeo.attributes.position.needsUpdate=true;
  hitDot.visible=!!TGT; if(TGT) hitDot.position.copy(ax);
  fpLines.visible=!!REG;
  if (REG){ const p=fpGeo.attributes.position.array; const sfn=sf.n.clone().multiplyScalar(0.012); let k=0;
    for(const [a,b] of [[REG[0],REG[2]],[REG[1],REG[2]],[REG[1],REG[3]],[REG[0],REG[3]]]){ const P=sf.O.clone().addScaledVector(sf.A,a).addScaledVector(sf.B,b).add(sfn); p[k++]=P.x;p[k++]=P.y;p[k++]=P.z; }
    fpGeo.setDrawRange(0,4); fpGeo.attributes.position.needsUpdate=true; }
  if (OV.follow) OV.target.copy(ptz.position);
}

/* ---------- rendering ---------- */
let needRender=true, built=false;
const stage=$("stage"), vpRaw=$("vpRaw"), vpCor=$("vpCor"), vpOv=$("vpOv");
const corMat = new T.ShaderMaterial({vertexShader:VS, depthTest:false, depthWrite:false,
  uniforms:{ t:{value:null}, w2c:{value:new T.Matrix4()}, dE:{value:new T.Vector2()}, k:{value:0}, O:{value:new T.Vector3()}, A:{value:new T.Vector3()}, B:{value:new T.Vector3()},
    reg:{value:new T.Vector4()}, fit:{value:new T.Vector4()}, fPx:{value:1000}, tint:{value:1}, grid:{value:1}, has:{value:0}, bg:{value:new T.Vector3(0.1,0.1,0.1)}, sz:{value:0.03} },
  fragmentShader:`
  uniform sampler2D t; uniform mat4 w2c; uniform vec2 dE; uniform float k, fPx, tint, grid, has, sz; uniform vec3 O,A,B,bg; uniform vec4 reg, fit; varying vec2 vUv;
  void main(){
    vec3 hatchA=bg, hatchB=bg*1.25+0.02;
    float hatch=step(0.5,fract((gl_FragCoord.x+gl_FragCoord.y)/16.0));
    if(has<0.5){ gl_FragColor=vec4(mix(hatchA,hatchB,hatch),1.0); return; }
    float a=fit.x+vUv.x*fit.y, b=fit.z+vUv.y*fit.w;
    if(a<reg.x||a>reg.y||b<reg.z||b>reg.w){ gl_FragColor=vec4(bg,1.0); return; }
    vec3 P=O+a*A+b*B; vec4 c=w2c*vec4(P,1.0);
    vec3 col; bool ok=c.z<-0.01; vec2 uv=vec2(-1.0);
    if(ok){ vec2 u=c.xy/(-c.z); float r2=dot(u,u); if(k*r2>0.95) ok=false; else { vec2 d=u/(1.0+k*r2); uv=d/dE*0.5+0.5; } }
    if(!ok||uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){ col=mix(hatchA,hatchB,hatch); }
    else { col=texture2D(t,uv).rgb; float px=fPx*sz/(-c.z); if(tint>0.5&&px<20.0) col=mix(col,vec3(0.86,0.22,0.16),0.32); }
    if(grid>0.5){ vec2 q=vec2(a,b)/0.5; vec2 g=abs(fract(q-0.5)-0.5)/fwidth(q); float ln=1.0-min(min(g.x,g.y),1.0); col=mix(col,vec3(1.0),ln*0.45); }
    gl_FragColor=vec4(col,1.0);
  }`});
const copyMat = new T.ShaderMaterial({vertexShader:VS, depthTest:false, depthWrite:false, uniforms:{t:{value:null}},
  fragmentShader:`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(t,vUv).rgb,1.0); }`});
function sizeCanvas(){ const w=stage.clientWidth, h=stage.clientHeight; const c=renderer.domElement;
  if (c.width!==Math.round(w*renderer.getPixelRatio()) || c.height!==Math.round(h*renderer.getPixelRatio())) renderer.setSize(w,h,false); return [w,h]; }
function vpRect(el, sr, H){ const r=el.getBoundingClientRect(); return [r.left-sr.left, H-(r.top-sr.top)-r.height, r.width, r.height]; }
function render(){
  const [W,H]=sizeCanvas(); const sr=stage.getBoundingClientRect();
  renderCamera(S, LN, S.focus, {lockExp: S.mode==='free'&&S.lockExp});
  renderer.setScissorTest(false); renderer.setClearColor(0x000000,0); renderer.clear();
  renderer.setScissorTest(true);
  const put=(el)=>{ const r=vpRect(el,sr,H); renderer.setViewport(...r); renderer.setScissor(...r); return r; };
  put(vpRaw); copyMat.uniforms.t.value=rtRaw.texture; quad.material=copyMat; renderer.render(quadScene,quadCam);
  const rc=put(vpCor); corUniforms(rc[2]/rc[3]); quad.material=corMat; renderer.render(quadScene,quadCam);
  const ro=put(vpOv);
  ovCam.aspect=ro[2]/ro[3]; ovCam.updateProjectionMatrix();
  ovCam.position.set(OV.target.x+OV.r*Math.sin(OV.phi)*Math.cos(OV.theta), OV.target.y+OV.r*Math.cos(OV.phi), OV.target.z+OV.r*Math.sin(OV.phi)*Math.sin(OV.theta));
  ovCam.lookAt(OV.target);
  renderer.render(scene, ovCam);
  renderer.setScissorTest(false);
  drawMarkers();
}
function corUniforms(aspect){
  const U=corMat.uniforms; const c=new T.Color(getComputedStyle(document.documentElement).getPropertyValue('--hatch').trim()||'#e3e7df'); U.bg.value.set(c.r,c.g,c.b);
  U.has.value = REG?1:0; U.t.value=rtRaw.texture; U.w2c.value.copy(ptz.matrixWorldInverse); U.dE.value.set(LN.dx,LN.dy); U.k.value=LN.k;
  U.fPx.value=LN.fPx; U.tint.value=S.tint?1:0; U.grid.value=S.grid?1:0;
  if (!REG) return;
  const sf=TGT.surf; U.O.value.copy(sf.O); U.A.value.copy(sf.A); U.B.value.copy(sf.B); U.reg.value.set(...REG);
  const Ra=REG[1]-REG[0], Rb=REG[3]-REG[2]; const s=Math.max(Ra/aspect, Rb)*1.04; const ac=(REG[0]+REG[1])/2, bc=(REG[2]+REG[3])/2;
  U.fit.value.set(ac-s*aspect/2, s*aspect, bc-s/2, s);
}
function loop(){ if (needRender && built){ needRender=false; render(); } requestAnimationFrame(loop); }

/* ---------- fruit visibility from the label pass ---------- */
let countTimer=null, FV=null;
function scheduleCount(){ clearTimeout(countTimer); countTimer=setTimeout(countFruit, 260); }
function countFruit(){
  if (!built) return;
  helpers.visible=false; const LP=labelPass(LN); helpers.visible=true;
  const e=ptz.matrixWorldInverse.elements;
  const rowF = TGT && TGT.row ? TGT.row : null;
  const res=[0,1,2,3].map(()=>[0,0,0,0,0,0]), boxes=[], dots=[];
  let minPx=Infinity, maxPx=0; const minBox=8;
  for (let id=1; id<=NF; id++){
    const f=FR[id-1];
    const cz=e[2]*f.x+e[6]*f.y+e[10]*f.z+e[14]; if (cz>-0.03) continue; const z=-cz;
    if (rowF){ if (f.row!==rowF.i) continue; } else if (z>15) continue;
    if (!LP.full[id]) continue;
    const ratio=Math.min(1, LP.vis[id]/LP.full[id]);
    const px=LN.fPx*2*f.r/z, blur=cocPx(LN,S.focus,z);
    const b = res[f.cls]; b[0]++;
    const bw=LP.x1[id]-LP.x0[id]+1, bh=LP.y1[id]-LP.y0[id]+1;
    const labelled = ratio>=0.3 && LP.vis[id]>0 && Math.max(bw,bh)>=minBox;
    const det = ratio>=0.5 && px>=20 && blur<px/3;
    if (ratio>=0.5) b[1]++; else if (ratio>=0.1) b[2]++; else b[3]++;
    if (labelled) b[4]++; if (det) b[5]++;
    if (ratio>=0.5 && f.cls===0){ minPx=Math.min(minPx,px); maxPx=Math.max(maxPx,px); }
    if (LP.vis[id]>0) boxes.push(LP.x0[id]/LP.W, LP.y0[id]/LP.H, bw/LP.W, bh/LP.H, labelled? (det?0:1) : 2);
    else { const cx=e[0]*f.x+e[4]*f.y+e[8]*f.z+e[12], cy=e[1]*f.x+e[5]*f.y+e[9]*f.z+e[13]; const ux=cx/z, uy=cy/z, r2=ux*ux+uy*uy;
      const dxn=ux/(1+LN.k*r2)/LN.dx, dyn=uy/(1+LN.k*r2)/LN.dy; if (Math.abs(dxn)<=1&&Math.abs(dyn)<=1) dots.push(dxn*0.5+0.5, 0.5-dyn*0.5); }
  }
  FV={res, boxes, dots, minPx, maxPx, scope: rowF? `Counting ${rowF.name} only, the row the camera is aimed at.` : 'Counting all fruit in frame within 15 m.'};
  fruitTable(); needRender=true;
}
const ov=$("ovRaw"), og=ov.getContext('2d');
function drawMarkers(){
  const w=vpRaw.clientWidth, h=vpRaw.clientHeight, dpr=Math.min(devicePixelRatio||1,2);
  if (ov.width!==Math.round(w*dpr)||ov.height!==Math.round(h*dpr)){ ov.width=Math.round(w*dpr); ov.height=Math.round(h*dpr); }
  og.setTransform(dpr,0,0,dpr,0,0); og.clearRect(0,0,w,h);
  og.strokeStyle='rgba(255,255,255,.75)'; og.lineWidth=1; og.beginPath(); og.moveTo(w/2-9,h/2); og.lineTo(w/2+9,h/2); og.moveTo(w/2,h/2-9); og.lineTo(w/2,h/2+9); og.stroke();
  if (!S.mark || !FV) return;
  const COLS=['#36b25a','#e6a521','#4d8fe0'];
  const b=FV.boxes;
  for(let i=0;i<b.length;i+=5){ const c=b[i+4]; og.strokeStyle=COLS[c]; og.lineWidth=c===2?1:1.5; og.setLineDash(c===2?[3,3]:[]);
    og.strokeRect(b[i]*w, b[i+1]*h, Math.max(2,b[i+2]*w), Math.max(2,b[i+3]*h)); }
  og.setLineDash([]); og.fillStyle='rgba(217,69,47,.55)';
  for(let i=0;i<FV.dots.length;i+=2){ og.beginPath(); og.arc(FV.dots[i]*w, FV.dots[i+1]*h, 1.5, 0, Math.PI*2); og.fill(); }
}

/* ---------- readouts ---------- */
const rowLen = () => TGT && TGT.row ? TGT.row.x1-TGT.row.x0 : L;
const fmtM = v => v>=10? v.toFixed(1)+' m' : v>=1? v.toFixed(2)+' m' : (v*100).toFixed(0)+' cm';
function readouts(){
  const Ln=LN;
  $("rFov").textContent = `${Ln.hfov.toFixed(1)}° × ${Ln.vfov.toFixed(1)}°`;
  $("rFovN").textContent = `pinhole without distortion: ${Ln.hfovRect.toFixed(1)}° wide`;
  const edge = (uInv(Ln.dx,Ln.k)-Ln.dx)/uInv(Ln.dx,Ln.k)*100;
  $("rDis").textContent = edge<0.05? 'none' : `${edge.toFixed(1)} %`;
  $("rDisN").textContent = edge<0.05? 'straight lines stay straight' : 'frame edges squeezed inward (barrel)';
  const c=2*Ln.pitch, Hf=Ln.fe*Ln.fe/(Ln.N*c)+Ln.fe, s=S.focus*1000;
  const near=s*(Hf-Ln.fe)/(Hf+s-2*Ln.fe), far = s<Hf-Ln.fe ? s*(Hf-Ln.fe)/(Hf-s) : Infinity;
  $("rDof").textContent = `${fmtM(near/1000)} – ${far===Infinity?'∞':fmtM(far/1000)}`;
  $("rDofN").textContent = `focused at ${fmtM(S.focus)} · f/${+Ln.N.toFixed(1)}`;
  if (!TGT){
    ["rPx","rAng","rDist","rCov","rUse"].forEach(id=>$(id).textContent='–');
    $("rPxN").textContent='Aim at a row, the floor or the board.'; $("rPill").textContent='NO TARGET'; $("rPill").className='pill warn';
    ["rAngN","rDistN","rCovN","rUseN"].forEach(id=>$(id).textContent='');
    $("corInfo").textContent='aim at a row face to straighten it'; $("corTag").textContent=''; return;
  }
  const sf=TGT.surf; const ang=Math.acos(Math.min(1,Math.abs(fwd.dot(sf.n))))*180/Math.PI;
  const px=Ln.fPx*0.03/TGT.t;
  $("rPx").textContent = px>=100? px.toFixed(0)+' px' : px.toFixed(1)+' px';
  $("rPxN").textContent = `at the image centre, ${fmtM(TGT.t)} away` + (FV&&FV.maxPx>0? ` · visible tomatoes range ${FV.minPx.toFixed(0)}–${FV.maxPx.toFixed(0)} px`:'');
  const pill=$("rPill"); if (px>=30){pill.textContent='GOOD';pill.className='pill';} else if(px>=20){pill.textContent='JUST ENOUGH';pill.className='pill warn';} else {pill.textContent='UNDER 20 PX';pill.className='pill bad';}
  $("rAng").textContent = `${ang.toFixed(1)}°`;
  $("rAngN").textContent = `${sf.label} · 0° is head-on`;
  $("rDist").textContent = fmtM(TGT.t);
  const blurC = cocPx(LN,S.focus,TGT.t);
  $("rDistN").textContent = `blur at target ${blurC<0.95? 'under 1 px' : blurC.toFixed(1)+' px'}`;
  if (REG){ const wa=REG[1]-REG[0], hb=REG[3]-REG[2];
    $("rCov").textContent = `${wa.toFixed(2)} × ${hb.toFixed(2)} m`;
    $("rCovN").textContent = sf.kind==='side'? `row from x = ${(sf.O.x+sf.A.x*REG[0]).toFixed(1)} to ${(sf.O.x+sf.A.x*REG[1]).toFixed(1)} m, height ${(sf.O.y+REG[2]).toFixed(1)}–${(sf.O.y+REG[3]).toFixed(1)} m` : 'width × depth of the area in frame';
  } else { $("rCov").textContent='–'; $("rCovN").textContent=''; }
  if (sf.kind==='side' && USE){ const ul=USE[1]-USE[0]; $("rUse").textContent=fmtM(ul); $("rUseN").textContent = `≈ ${Math.ceil(rowLen()/Math.max(ul,0.05))} camera positions per ${rowLen().toFixed(0)} m ${S.layout==='albatha'?'row':'line'} face`; }
  else if (sf.kind==='side'){ $("rUse").textContent='0 m'; $("rUseN").textContent='no part of the row reaches 20 px'; }
  else { $("rUse").textContent='–'; $("rUseN").textContent='only for a row face'; }
  $("corInfo").textContent = REG? `${sf.label} · ${(REG[1]-REG[0]).toFixed(1)} m wide · grid 0.5 m` : 'target is outside the frame';
  $("corTag").textContent = REG? `seen from ${ang.toFixed(0)}° off head-on` : '';
}
function fruitTable(){
  if (!FV) return; $("fruitScope").textContent=FV.scope;
  const crops = S.layout==='albatha'? [0,1] : S.layout==='uniFruit'? [0,1,2,3] : [];
  const NAMES=['Tomatoes','Cucumbers','Capsicum','Zucchini'];
  const rows=crops.map(c=>[NAMES[c],FV.res[c]]);
  if (!rows.length){ $("fruitBody").innerHTML='<tr><td colspan="7" style="font-family:var(--f-body);color:var(--muted)">No fruit in the leafy arch. Its plots are baby leaf and herbs, so there is nothing to count or label here.</td></tr>'; readouts(); return; }
  $("fruitBody").innerHTML = rows.map(([n,b])=>{ const tot=b[0]||1;
    const seg=(v,c)=>`<i style="width:${(v/tot*100).toFixed(1)}%;background:${c}"></i>`;
    return `<tr><td>${n}<div class="bar">${seg(b[1],'#36b25a')}${seg(b[2],'#4d8fe0')}${seg(b[3],'#d9452f')}</div></td><td>${b[0]}</td><td>${b[1]}</td><td>${b[2]}</td><td>${b[3]}</td><td>${b[4]}</td><td><b>${b[5]}</b></td></tr>`; }).join('');
  readouts();
}

/* ---------- pinhole diagram ---------- */
function drawPinhole(){
  const Ln=LN, W=560, H=250, cy=125, sx=64, hs=46;
  let Lx=hs*Ln.fe/(Ln.W/2), clipped=false; if (Lx>360){Lx=360;clipped=true;} if(Lx<14) Lx=14;
  const lx=sx+Lx, xe=W-10;
  const apH=Math.min(clamp(hs*(Ln.A/(Ln.W/2)),1.2,96)/2,98);
  const rh=Math.atan(Ln.dx), th=Math.atan(uInv(Ln.dx,Ln.k));
  const yA=(x,a)=>cy+(x-lx)*Math.tan(a);
  const deg=v=>v.toFixed(1)+'°'; const showReal = Math.abs(th-rh)>0.004;
  $("pin").innerHTML = `<svg class="pin" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pinhole diagram">
    <defs><clipPath id="pc"><rect x="0" y="6" width="${W}" height="${H-12}"/></clipPath></defs>
    <g clip-path="url(#pc)">
      <polygon class="wedge" points="${lx},${cy} ${xe},${yA(xe,-rh)} ${xe},${yA(xe,rh)}"/>
      <line class="axis" x1="${sx-20}" y1="${cy}" x2="${xe}" y2="${cy}"/>
      <line class="ray" x1="${sx}" y1="${cy-hs}" x2="${xe}" y2="${yA(xe,rh)}"/>
      <line class="ray" x1="${sx}" y1="${cy+hs}" x2="${xe}" y2="${yA(xe,-rh)}"/>
      ${showReal? `<line class="ray2" x1="${lx}" y1="${cy}" x2="${xe}" y2="${yA(xe,th)}"/><line class="ray2" x1="${lx}" y1="${cy}" x2="${xe}" y2="${yA(xe,-th)}"/>`:''}
    </g>
    <line class="sensor" x1="${sx}" y1="${cy-hs}" x2="${sx}" y2="${cy+hs}"/>
    <ellipse class="lens" cx="${lx}" cy="${cy}" rx="5" ry="${Math.max(apH,3)}"/>
    <line class="blade" x1="${lx}" y1="${cy-98}" x2="${lx}" y2="${cy-apH}"/>
    <line class="blade" x1="${lx}" y1="${cy+apH}" x2="${lx}" y2="${cy+98}"/>
    ${clipped? `<text x="${(sx+lx)/2-8}" y="${cy-8}" class="mut">//</text>`:''}
    <line class="dim" x1="${sx}" y1="${cy+hs+22}" x2="${lx}" y2="${cy+hs+22}"/>
    <line class="dim" x1="${sx}" y1="${cy+hs+16}" x2="${sx}" y2="${cy+hs+28}"/><line class="dim" x1="${lx}" y1="${cy+hs+16}" x2="${lx}" y2="${cy+hs+28}"/>
    <text x="${sx-40}" y="${H-4}">f = ${Ln.fe.toFixed(Ln.fe<20?1:0)} mm${S.mode==='hik'&&Math.abs(Ln.fe-Ln.f)>0.15?` (lens marked ${Ln.f.toFixed(1)})`:''}${clipped?' · not to scale':''}</text>
    <text x="${sx-52}" y="${cy-hs-8}" class="mut">sensor ${Ln.W.toFixed(1)} mm</text>
    <text x="${lx+10}" y="${Math.max(16,cy-Math.max(apH,3)-8)}">opening ⌀ ${Ln.A.toFixed(Ln.A<10?2:1)} mm = f ÷ ${+Ln.N.toFixed(1)}</text>
    <text x="${W-12}" y="${H-24}" text-anchor="end">pinhole angle ${deg(Ln.hfovRect)}</text>
    ${showReal? `<text x="${W-12}" y="${H-8}" text-anchor="end" class="mut">with barrel distortion ${deg(Ln.hfov)}</text>`:''}
  </svg>`;
  $("pinCap").textContent = `Longer focal length moves the lens away from the sensor, which narrows the angle of view. The opening is the focal length divided by the f-number: a bigger opening lets in more light but gives a shallower sharp zone. ${showReal?'The dashed lines are the real lens: its barrel distortion squeezes a wider view onto the same sensor.':''}`;
}

/* ---------- UI ---------- */
const logMap=(v,a,b)=>a*Math.pow(b/a, v/1000), logInv=(x,a,b)=>Math.round(Math.log(x/a)/Math.log(b/a)*1000);
function syncUI(){
  const hik=S.mode==='hik';
  $("mHik").setAttribute('aria-pressed',hik); $("mFree").setAttribute('aria-pressed',!hik);
  $("lensHik").hidden=!hik; $("lensFree").hidden=hik;
  $("pan").max = hik?355:360; $("tilt").min = hik?0:-45;
  $("pan").value=S.pan; $("panO").textContent=S.pan.toFixed(1)+'°';
  $("tilt").value=S.tilt; $("tiltO").textContent=S.tilt.toFixed(1)+'°';
  $("px").value=S.x; $("pxO").textContent=S.x.toFixed(2)+' m';
  $("pz").value=S.z; $("pzO").textContent=S.z.toFixed(2)+' m';
  $("ph").value=S.h; $("phO").textContent=S.h.toFixed(2)+' m';
  const inRow = ROWS.find(r=>S.x>=r.x0 && S.x<=r.x1 && Math.abs(S.z-r.z)<r.hw-0.08 && S.h<r.top); const lane = LANES.find(l=>Math.abs(S.z-l.z)<0.2);
  $("pzHint").textContent = inRow? `Inside ${inRow.name}: leaves will block the view.` : lane? `In ${lane.name}.` : '';
  $("fh").value=S.fHik; $("fhO").textContent=`${S.fHik.toFixed(1)} mm · ${(S.fHik/2.8).toFixed(1)}×`;
  $("hikAp").innerHTML = hik? `Aperture follows zoom: <b>f/${LN.N.toFixed(1)}</b> (opening ${LN.A.toFixed(2)} mm). Iris, pan and tilt are locked to the camera's real limits. Switch to Free lens to try any lens.` : '';
  $("ff").value=logInv(S.fFree,2.8,300); $("ffO").textContent=S.fFree.toFixed(S.fFree<20?1:0)+' mm';
  $("fn").value=S.nIdx; $("fnO").textContent='f/'+STOPS[S.nIdx];
  $("sen").value=S.sensor; $("fk").value=S.kFree; $("fkO").textContent=S.kFree.toFixed(3);
  $("lockExp").checked=S.lockExp; $("af").checked=S.af;
  $("fd").value=logInv(clamp(S.focus,0.15,60),0.15,60); $("fdO").textContent=fmtM(S.focus)+(S.af?' (auto)':''); $("fd").disabled=S.af;
  $("bOn").checked=S.bOn; $("bImg").value=S.bImg; $("bd").value=S.bd; $("bdO").textContent=fmtM(S.bd); $("bw").value=S.bw; $("bwO").textContent=fmtM(S.bw); $("ba").value=S.ba; $("baO").textContent=S.ba+'°';
  $("q").value=S.q; $("mark").checked=S.mark; $("tint").checked=S.tint; $("grid").checked=S.grid;
  $("rawInfo").textContent = `${LN.hfov.toFixed(0)}° wide · ${hik?(S.fHik/2.8).toFixed(1)+'× zoom':LN.f.toFixed(LN.f<20?1:0)+' mm'} · f/${+LN.N.toFixed(1)} · drag to aim, scroll to zoom`;
  $("rawTag").textContent = `pan ${S.pan.toFixed(0)}° · tilt ${S.tilt.toFixed(0)}° · ${S.h.toFixed(1)} m high`;
}
const bindR=(id,fn)=>$(id).addEventListener('input',e=>{ fn(parseFloat(e.target.value)); update(); });
bindR('pan',v=>S.pan=v); bindR('tilt',v=>S.tilt=v); bindR('px',v=>S.x=v); bindR('pz',v=>S.z=v); bindR('ph',v=>S.h=v);
bindR('fh',v=>S.fHik=v); bindR('ff',v=>S.fFree=logMap(v,2.8,300)); bindR('fn',v=>S.nIdx=v|0); bindR('fk',v=>S.kFree=v);
bindR('fd',v=>{S.focus=logMap(v,0.15,60);}); bindR('bd',v=>S.bd=v); bindR('bw',v=>S.bw=v); bindR('ba',v=>S.ba=v);
document.querySelectorAll('[data-fh]').forEach(b=>b.onclick=()=>{S.fHik=+b.dataset.fh; update();});
document.querySelectorAll('[data-ff]').forEach(b=>b.onclick=()=>{S.fFree=+b.dataset.ff; update();});
$("sen").onchange=e=>{S.sensor=e.target.value; update();};
$("lockExp").onchange=e=>{S.lockExp=e.target.checked; update();};
$("af").onchange=e=>{S.af=e.target.checked; update();};
$("bOn").onchange=e=>{S.bOn=e.target.checked; update();};
$("bImg").onchange=e=>{ if(e.target.value==='user'){ if(boardTex.user){S.bImg='user'; setBoardTex(); update();} else { $("bImg").value=S.bImg; $("bFile").click(); } return; }
  S.bImg=e.target.value; setBoardTex(); update(); };
$("bFile").onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ S.bImg='user'; S.bOn=true; loadBoardImage(rd.result,'user'); }; rd.readAsDataURL(f); };
$("q").onchange=e=>{S.q=+e.target.value; update();};
$("mark").onchange=e=>{S.mark=e.target.checked; needRender=true;};
$("tint").onchange=e=>{S.tint=e.target.checked; needRender=true;};
$("grid").onchange=e=>{S.grid=e.target.checked; needRender=true;};
$("mHik").onclick=()=>{ if(S.mode==='hik') return; S.mode='hik'; update(); };
$("mFree").onclick=()=>{ if(S.mode==='free') return; S.mode='free'; update(); };
function renderLanes(){ $("lanes").innerHTML = LANES.map((l,i)=>`<button data-lane="${i}">${l.name}</button>`).join('');
  document.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>{ S.z=LANES[+b.dataset.lane].z; update(); }); }
(function dragAim(el){ let p=null;
  el.addEventListener('pointerdown',e=>{ p=[e.clientX,e.clientY]; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove',e=>{ if(!p) return; const w=el.clientWidth, h=el.clientHeight;
    S.pan -= (e.clientX-p[0])/w*LN.hfov; S.tilt -= (e.clientY-p[1])/h*LN.vfov; p=[e.clientX,e.clientY]; update(); });
  const end=()=>{p=null;}; el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end);
  el.addEventListener('wheel',e=>{ e.preventDefault(); const s=Math.exp(-e.deltaY*0.0012);
    if (S.mode==='hik') S.fHik=clamp(S.fHik*s,2.8,12); else S.fFree=clamp(S.fFree*s,2.8,300); update(); },{passive:false});
})(vpRaw);
(function orbit(el){ let p=null;
  el.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; p=[e.clientX,e.clientY]; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove',e=>{ if(!p) return; OV.theta += (e.clientX-p[0])*0.008; OV.phi=clamp(OV.phi-(e.clientY-p[1])*0.008,0.08,1.62); p=[e.clientX,e.clientY]; needRender=true; });
  const end=()=>{p=null;}; el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end);
  el.addEventListener('wheel',e=>{ e.preventDefault(); OV.r=clamp(OV.r*Math.exp(e.deltaY*0.0012),1.2,60); needRender=true; },{passive:false});
  $("zin").onclick=()=>{OV.r=clamp(OV.r/1.3,1.2,60); needRender=true;}; $("zout").onclick=()=>{OV.r=clamp(OV.r*1.3,1.2,60); needRender=true;};
})(vpOv);

const BOARD_PRESETS = (x,z) => [
  {name:"Meera's tilt test at 80°", note:'Farm photo on a board 1 m away, turned 80°', s:{mode:'hik', x, z, h:1.2, pan:0, tilt:0, fHik:8.4, bOn:true, bImg:'farm', bd:1.0, bw:0.8, ba:80, af:true}, ov:{theta:-2.6, phi:1.0, r:4}},
  {name:'Lens distortion at 1 m', note:'Checkerboard, 2.8 mm wide end', s:{mode:'hik', x, z, h:1.2, pan:0, tilt:0, fHik:2.8, bOn:true, bImg:'check', bd:1.0, bw:2.2, ba:0, af:true}, ov:{theta:-2.6, phi:1.0, r:4}} ];
const PRESETS = {
 albatha: [
  {name:'Main aisle, 60° along the row', note:'3× zoom, 1.2 m high, looking at tomato row 3', s:{mode:'hik', x:6, z:0.5, h:1.2, pan:330, tilt:0, fHik:8.4, bOn:false, af:true}, ov:{theta:-2.3, phi:0.95, r:7}},
  {name:'Inside a walkway, 45°', note:'2.8 mm wide, 1.1 m high, the tunnel between rows 2 and 3', s:{mode:'hik', x:12, z:-1.2, h:1.1, pan:315, tilt:0, fHik:2.8, bOn:false, af:true}, ov:{theta:1.2, phi:0.9, r:5}},
  ...BOARD_PRESETS(-1.2,0.5),
  {name:'High mount 3.8 m, down the aisle', note:'2.8 mm, tilted 30° down', s:{mode:'hik', x:-1.0, z:0.5, h:3.8, pan:0, tilt:30, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.7, phi:0.9, r:10}},
  {name:'Above row 2, looking straight down', note:'3.8 m high, 1×', s:{mode:'hik', x:10, z:-1.8, h:3.8, pan:0, tilt:90, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.0, phi:1.1, r:9}},
  {name:'135 mm f/2 down the walkway', note:'Free lens, full frame: shallow focus', s:{mode:'free', x:-1.2, z:-1.2, h:1.2, pan:0, tilt:3, fFree:135, sensor:'ff', nIdx:3, kFree:0, bOn:false, af:false, focus:4}, ov:{theta:-2.7, phi:1.0, r:6}} ],
 uniFruit: [
  {name:'Central walkway, 45° along Row A', note:'2.8 mm, 1.5 m high: cucumber, zucchini and the tomato lines behind', s:{mode:'hik', x:8, z:0, h:1.5, pan:45, tilt:5, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.2, phi:0.95, r:7}},
  {name:'Walkway between plots 03 and 04', note:'Between the cherry tomato and capsicum lines, looking along them', s:{mode:'hik', x:17.5, z:2.25, h:1.3, pan:0, tilt:8, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.5, phi:0.9, r:5}},
  {name:'Cherry tomato line, 2× zoom', note:'From the central walkway, 1.4 m high', s:{mode:'hik', x:12, z:0, h:1.4, pan:60, tilt:2, fHik:5.6, bOn:false, af:true}, ov:{theta:-2.3, phi:1.0, r:6}},
  {name:'Zucchini and cucumber close-up', note:'Plot 01 line 4, 0.9 m high, tilted down', s:{mode:'hik', x:6.1, z:0.1, h:0.9, pan:90, tilt:25, fHik:2.8, bOn:false, af:true}, ov:{theta:-1.8, phi:0.9, r:4}},
  {name:'High mount over the walkway, 3.5 m', note:'2.8 mm, looking down onto Row A', s:{mode:'hik', x:20, z:0, h:3.5, pan:90, tilt:50, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.4, phi:0.8, r:10}},
  ...BOARD_PRESETS(1.0,0) ],
 uniLeafy: [
  {name:'Central walkway over the herbs', note:'2.8 mm, 1.6 m high, tilted 45° down onto Row A', s:{mode:'hik', x:8, z:0, h:1.6, pan:90, tilt:45, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.2, phi:0.9, r:6}},
  {name:'High mount down Row A', note:'3.4 m high, looking along the baby-leaf bands', s:{mode:'hik', x:1.5, z:2.2, h:3.2, pan:0, tilt:40, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.6, phi:0.9, r:8}},
  {name:'Straight down on plot 04', note:'3.5 m high above the central walkway edge', s:{mode:'hik', x:20, z:1.4, h:3.5, pan:0, tilt:90, fHik:2.8, bOn:false, af:true}, ov:{theta:-2.0, phi:1.0, r:8}},
  ...BOARD_PRESETS(1.0,0) ] };
function renderPresets(){ $("presets").innerHTML = PRESETS[S.layout].map((p,i)=>`<button data-p="${i}">${p.name}<small>${p.note}</small></button>`).join('');
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>applyPreset(+b.dataset.p)); }
function applyPreset(i){ const p=PRESETS[S.layout][i]; Object.assign(S,p.s); if(p.s.bImg) setBoardTex(); Object.assign(OV,p.ov); OV.follow=true; update(); }
function seasonUI(){ const seasonal=LAY.seasonal; $("dayBox").hidden=!seasonal;
  if (seasonal && SEASON){ $("day").value=S.day; $("dayO").textContent=SEASON.date; $("season").innerHTML=SEASON.lines.map(l=>`<li>${l}</li>`).join(''); } }
function applyLayout(key, presetIdx){
  S.layout=key; setLayout(key); buildPlants(490, {}, S.day);
  $("gh").value=key; $("px").min=LAY.xMin+0.2; $("px").max=LAY.xMax-0.2; $("pz").min=-(WALL-0.2); $("pz").max=WALL-0.2;
  renderPresets(); renderLanes(); seasonUI(); applyPreset(presetIdx||0);
}
let dayTimer=null;
function setDay(d){ S.day=d; clearTimeout(dayTimer); $("dayO").textContent=fmtDay(d)+' …';
  dayTimer=setTimeout(()=>{ buildPlants(490,{},S.day); seasonUI(); update(); }, 120); }
$("gh").onchange=e=>applyLayout(e.target.value);
$("day").addEventListener('input', e=>setDay(+e.target.value));
document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{ $("day").value=b.dataset.day; setDay(+b.dataset.day); });
new ResizeObserver(()=>{ needRender=true; }).observe(stage);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{needRender=true;});
new MutationObserver(()=>{needRender=true;}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

applyLayout('albatha', 0);
built=true; $("loading").hidden=true; needRender=true; scheduleCount();
requestAnimationFrame(loop);
window.__sim={S,update,applyPreset,applyLayout,setDay,countFruit,get FV(){return FV;}, get LN(){return LN;}, get TGT(){return TGT;}, get NF(){return NF;}, get FR(){return FR;}};
