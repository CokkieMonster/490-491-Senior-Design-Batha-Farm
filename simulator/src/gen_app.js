/* ===== dataset generator app ===== */
const pick = a => a[(R()*a.length)|0];
const num = id => parseFloat($(id).value);
let running=false, stopReq=false, scenes=0, cur=null;
const prev=$("preview"), pg=prev.getContext('2d');
const work=document.createElement('canvas'), wg=work.getContext('2d');
const hasFS = typeof window.showDirectoryPicker === 'function';
$("outNote").textContent = hasFS
  ? 'Choose an empty folder and the files are written straight into it. Or download zip files of 250 images each and unzip them all into one folder.'
  : 'This browser cannot write to a folder, so images come as zip files of 250 images each. Unzip them all into one folder. Chrome or Edge can write to a folder directly.';
if (!hasFS) $("bFolder").disabled = true;

function settings(){
  return { count:Math.max(1,num("gCount")|0), size:+$("gSize").value, val:num("gVal")/100, q:num("gQ")/100, seed:num("gSeed")|0,
    minVis:num("gVis")/100, minPx:num("gPx"), empty:num("gEmpty")/100,
    gh:[['albatha',$("ghAlb").checked],['uniFruit',$("ghFruit").checked],['uniLeafy',$("ghLeafy").checked]].filter(x=>x[1]).map(x=>x[0]),
    d0:dateToDay(new Date($("gD0").value+'T00:00:00Z')), d1:dateToDay(new Date($("gD1").value+'T00:00:00Z')),
    walk:$("sWalk").checked, aisle:$("sAisle").checked, high:$("sHigh").checked,
    fMin:clamp(Math.min(num("gFmin"),num("gFmax")),2.8,12), fMax:clamp(Math.max(num("gFmin"),num("gFmax")),2.8,12), ang:clamp(num("gAng"),0,85),
    every:Math.max(1,num("gEvery")|0), light:$("gLight").checked, noise:$("gNoise").checked };
}
let GH={key:'albatha', day:null};
function newGreenhouse(seed, G){
  setSeed(seed*7919+13);
  const opts = (G && G.gh.length)? G.gh : ['albatha'];
  const key = opts[(R()*opts.length)|0];
  const lo = G? clamp(Math.min(G.d0,G.d1),0,DAY_MAX) : 45, hi = G? clamp(Math.max(G.d0,G.d1),0,DAY_MAX) : 210;
  const day = Math.round(rr(lo,hi));
  const V={ ripe:rr(-0.45,0.25), leaf:rr(0.85,1.2), yellow:rr(0.04,0.25), reach:rr(0.85,1.15), fruit:rr(0.55,1.2) };
  if (LAY.key!==key) setLayout(key);
  buildPlants(seed, V, day); GH={key, day: LAY.seasonal? day : null};
  scenes++; $("stScene").textContent=scenes; return V;
}
function randomShot(G){
  const spots=[]; if(G.walk) spots.push('walk','walk'); if(G.aisle) spots.push('aisle'); if(G.high) spots.push('high');
  if (!spots.length) spots.push('walk');
  const sp=pick(spots); let z,h,side,tilt;
  if (LAY.key!=='albatha') return uniShot(G, sp);
  if (sp==='walk'){ const lane=pick([LANES[0],LANES[1],LANES[3]]); z=lane.z+rr(-0.06,0.06); h=rr(0.4,2.1); side=R()<0.5?-1:1; tilt = h>1.5? rr(0,30):rr(0,12); }
  else if (sp==='aisle'){ z=0.5+rr(-0.35,0.35); h=rr(0.5,2.3); side=R()<0.6?-1:1; tilt = h>1.5? rr(0,30):rr(0,12); }
  else { const lane=pick(LANES); z=lane.z+rr(-0.1,0.1); h=rr(2.6, Math.min(4.0, roofY(z)-0.3)); side=R()<0.5?-1:1; tilt=rr(25,70); }
  const a=rr(0,G.ang)*Math.PI/180*(R()<0.5?-1:1);
  let pan=Math.atan2(side*Math.cos(a), Math.sin(a))*180/Math.PI; pan=((pan%360)+360)%360; pan=Math.min(pan,355);
  const f=G.fMin*Math.pow(G.fMax/G.fMin, R());
  return { spot:sp, S:{mode:'hik', x:rr(1.0,L-1.0), z, h, pan, tilt, fHik:f} };
}
function uniShot(G, sp){
  let x=rr(0.5,L-0.5), z, h, pan, tilt;
  const fwdPan = (side, maxAng) => { const a=rr(0,maxAng)*Math.PI/180*(R()<0.5?-1:1); let p=Math.atan2(side*Math.cos(a), Math.sin(a))*180/Math.PI; return Math.min(((p%360)+360)%360,355); };
  if (sp==='walk'){ z=rr(-0.3,0.3); h=rr(0.5,2.2); pan=fwdPan(R()<0.5?-1:1, G.ang); tilt = h>1.5? rr(0,35) : rr(0,15); }
  else if (sp==='aisle'){ const p=(R()*6)|0; x=plotX0(p)+UNI.plotW+UNI.path/2+rr(-0.05,0.05); const side=R()<0.5?-1:1; const k=(R()*3)|0;
    z=side*(WALL-UNI.lineOff-UNI.lineGap*(k+0.5)); h=rr(0.4,2.0); pan=((R()<0.5?0:180)+rr(-60,60)+360)%360; pan=Math.min(pan,355); tilt=rr(0,20); }
  else { z=rr(-1.5,1.5); h=rr(2.6, Math.min(3.8, roofY(z)-0.3)); pan=rr(0,355); tilt=rr(30,80); }
  const f=G.fMin*Math.pow(G.fMax/G.fMin, R());
  return { spot:sp, S:{mode:'hik', x, z, h, pan, tilt, fHik:f} };
}
function randomLight(G){
  if (!G.light){ setLighting({az:35, el:62, sun:2.1, hemi:2.2, tint:[1,1,1], expo:1, noise:G.noise?0.012:0}); return; }
  const w=rr(-0.06,0.06);
  setLighting({az:rr(0,360), el:rr(35,82), sun:rr(1.2,2.8), hemi:rr(1.7,2.7), tint:[1+w+rr(-.02,.02),1+rr(-.02,.02),1-w+rr(-.02,.02)], expo:rr(0.8,1.2), noise:G.noise?rr(0.004,0.022):0});
}
// renders one accepted shot; returns {img, boxes, shot, LN, tgt}
function makeShot(G, allowEmpty){
  for (let tries=0; tries<25; tries++){
    const shot=randomShot(G); const LN=lens(shot.S);
    setPose(shot.S, LN); makeTargets(LN, G.size);
    const tgt=findTarget(ptz.position.clone(), fwd.clone()); const focus=tgt? clamp(tgt.t,0.15,60):30;
    randomLight(G);
    const LP=labelPass(LN); const boxes=yoloBoxes(LP, G.minVis, G.minPx);
    if (!boxes.length && LAY.key!=='uniLeafy' && !(allowEmpty && R()<G.empty)) continue;
    renderCamera(shot.S, LN, focus, {});
    return {img:readRaw(), boxes, shot, LN, tgt};
  }
  return null;
}
function drawPreview(res){
  const W=res.img.width, H=res.img.height;
  if (work.width!==W){ work.width=W; work.height=H; }
  wg.putImageData(res.img,0,0);
  pg.drawImage(work,0,0,prev.width,prev.height);
  if ($("showBoxes").checked){ const sx=prev.width/W, sy=prev.height/H; pg.lineWidth=1.5;
    const BC=['#ff4d3a','#3ab7ff','#ffd23a','#b96bff']; res.boxes.forEach(b=>{ pg.strokeStyle=BC[b.cls]; pg.strokeRect(b.x0*sx,b.y0*sy,b.w*sx,b.h*sy); }); }
}
const yoloText = (boxes,W,H) => boxes.map(b=>`${b.cls} ${((b.x0+b.w/2)/W).toFixed(6)} ${((b.y0+b.h/2)/H).toFixed(6)} ${(b.w/W).toFixed(6)} ${(b.h/H).toFixed(6)}`).join('\n')+(boxes.length?'\n':'');
const toJpeg = (q) => new Promise(res=>work.toBlob(res,'image/jpeg',q));
const nextFrame = () => new Promise(r=>setTimeout(r,0));
const DATA_YAML = `# Greenhouse synthetic dataset (Ultralytics YOLO format)\npath: .\ntrain: images/train\nval: images/val\nnames:\n  0: tomato\n  1: cucumber\n  2: capsicum\n  3: zucchini\n`;
function readme(G){ return `Greenhouse synthetic dataset
Made with the Greenhouse Dataset Generator (490 Gardening Project, Albatha farm).

Folders
  images/train, images/val   JPEG images, ${G.size} x ${Math.round(G.size*9/16)}
  labels/train, labels/val   one .txt per image, YOLO format: class cx cy w h (0-1, relative to image size)
  data.yaml                  classes: 0 tomato, 1 cucumber, 2 capsicum, 3 zucchini
  meta.csv                   camera position, pan, tilt, zoom, viewing angle and box counts for every image

Label rule
  A fruit gets a box when at least ${Math.round(G.minVis*100)}% of its pixels are visible (measured by rendering it
  with and without the leaves) and the box is at least ${G.minPx} px. The box covers only the visible part.
  Lens: Hikvision DS-2DE2A404IWG1-E model, 2.8-12 mm, barrel distortion at the wide end.

Settings: ${JSON.stringify(G)}

Train (Ultralytics):
  yolo detect train data=data.yaml model=yolo11m.pt imgsz=1280 epochs=100
  yolo detect train data=data.yaml model=rtdetr-l.pt imgsz=1280 epochs=100
`; }
const META_HEAD='file,split,scene,layout,season_date,spot,x_m,z_m,height_m,pan_deg,tilt_deg,focal_mm,hfov_deg,target,view_angle_deg,target_dist_m,tomato_boxes,cucumber_boxes,capsicum_boxes,zucchini_boxes\n';

/* ---------- writers ---------- */
async function folderWriter(){
  const root=await window.showDirectoryPicker({mode:'readwrite'});
  const dirs={};
  for (const a of ['images','labels']){ const d=await root.getDirectoryHandle(a,{create:true}); for (const s of ['train','val']) dirs[a+'/'+s]=await d.getDirectoryHandle(s,{create:true}); }
  const write=async(dir,name,data)=>{ const fh=await dir.getFileHandle(name,{create:true}); const w=await fh.createWritable(); await w.write(data); await w.close(); };
  return { add:async(path,data)=>{ const i=path.lastIndexOf('/'); const d=i<0?root:dirs[path.slice(0,i)]; await write(d, path.slice(i+1), data); }, flush:async()=>{}, finish:async()=>{} };
}
function zipWriter(prefix){
  let zip=new JSZip(), n=0, part=1;
  const save=async()=>{ if(!n) return; const blob=await zip.generateAsync({type:'blob', compression:'STORE'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`${prefix}_part${String(part).padStart(3,'0')}.zip`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),60000); part++; zip=new JSZip(); n=0; };
  return { add:async(path,data)=>{ zip.file(path,data); if(path.startsWith('images/')) n++; }, flush:async()=>{ if(n>=250) await save(); }, finish:async()=>{ n=Math.max(n,1); await save(); } };
}

/* ---------- main loop ---------- */
async function run(useFolder){
  if (running) return;
  const G=settings();
  let out;
  try { out = useFolder? await folderWriter() : zipWriter(`greenhouse_seed${G.seed}`); }
  catch(e){ $("status").textContent='No folder chosen, nothing started.'; return; }
  running=true; stopReq=false; setButtons();
  let saved=0, gh=-1; const cnt=[0,0,0,0]; const t0=performance.now(); let meta=META_HEAD;
  try {
    for (let i=0; i<G.count && !stopReq; i++){
      if (i%G.every===0){ gh++; $("status").textContent=`Building greenhouse ${gh+1}…`; await nextFrame(); newGreenhouse(G.seed*100000+gh, G); }
      setSeed(G.seed*1000003 + i*7 + 1);
      const res=makeShot(G, true);
      if (!res){ continue; }
      drawPreview(res);
      const split = R()<G.val ? 'val':'train';
      const name=`gh${G.seed}_${String(i).padStart(6,'0')}`;
      const blob=await toJpeg(G.q);
      await out.add(`images/${split}/${name}.jpg`, blob);
      await out.add(`labels/${split}/${name}.txt`, yoloText(res.boxes,res.img.width,res.img.height));
      const nb=[0,0,0,0]; res.boxes.forEach(b=>{ nb[b.cls]++; cnt[b.cls]++; }); saved++;
      const s=res.shot.S, ang=res.tgt? Math.acos(Math.min(1,Math.abs(fwd.dot(res.tgt.surf.n))))*180/Math.PI : NaN;
      meta+=`${name}.jpg,${split},${gh},${GH.key},${GH.day===null?'':dayToDate(GH.day).toISOString().slice(0,10)},${res.shot.spot},${s.x.toFixed(2)},${s.z.toFixed(2)},${s.h.toFixed(2)},${s.pan.toFixed(1)},${s.tilt.toFixed(1)},${s.fHik.toFixed(2)},${res.LN.hfov.toFixed(1)},${res.tgt?res.tgt.surf.label:'none'},${isNaN(ang)?'':ang.toFixed(1)},${res.tgt?res.tgt.t.toFixed(2):''},${nb.join(',')}\n`;
      await out.flush();
      const dt=(performance.now()-t0)/1000;
      $("stImg").textContent=saved; $("stTom").textContent=cnt[0]; $("stCuc").textContent=cnt[1]; $("stCap").textContent=cnt[2]; $("stZuc").textContent=cnt[3]; $("stRate").textContent=(saved/dt).toFixed(2);
      $("bar").style.width=((i+1)/G.count*100).toFixed(1)+'%';
      $("status").textContent=`Image ${i+1} of ${G.count} · ${res.boxes.length} boxes · ${LAYOUTS[GH.key].short}${GH.day!==null?', '+fmtDay(GH.day):''} · ${res.shot.spot}, ${s.fHik.toFixed(1)} mm, ${s.h.toFixed(1)} m high`;
      await nextFrame();
    }
    await out.add('data.yaml', DATA_YAML); await out.add('meta.csv', meta); await out.add('README.txt', readme(G));
    await out.finish();
    $("status").textContent = `${stopReq?'Stopped':'Done'}: ${saved} images; boxes: ${cnt[0]} tomato, ${cnt[1]} cucumber, ${cnt[2]} capsicum, ${cnt[3]} zucchini.` + (useFolder?'':' Unzip every part into the same folder.');
  } catch(e){ $("status").textContent='Stopped by an error: '+e.message; console.error(e); }
  running=false; setButtons();
}
function setButtons(){ $("bFolder").disabled=running||!hasFS; $("bZip").disabled=running; $("bPreview").disabled=running; $("bStop").disabled=!running; }
$("bFolder").onclick=()=>run(true);
$("bZip").onclick=()=>run(false);
$("bStop").onclick=()=>{ stopReq=true; $("status").textContent='Stopping after this image…'; };
let pvCount=0;
$("bPreview").onclick=async()=>{ const G=settings(); if (!scenes || !G.gh.includes(GH.key)){ newGreenhouse(G.seed*100000+pvCount, G); } setSeed(G.seed*31+(++pvCount)); const res=makeShot(G,false);
  if (res){ drawPreview(res); $("status").textContent=`Preview: ${res.boxes.length} boxes · ${LAYOUTS[GH.key].short}${GH.day!==null?', '+fmtDay(GH.day):''} · ${res.shot.spot}, ${res.shot.S.fHik.toFixed(1)} mm, ${res.shot.S.h.toFixed(1)} m high, pan ${res.shot.S.pan.toFixed(0)}°`; } };
setTimeout(()=>{ newGreenhouse(settings().seed*100000, settings()); $("status").textContent='Ready. Press Preview to check a shot, then start.'; },50);
window.__gen = { settings, makeShot, newGreenhouse, yoloText, get NF(){return NF;}, get GH(){return GH;} };
