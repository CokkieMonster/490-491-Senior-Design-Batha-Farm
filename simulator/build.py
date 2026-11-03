"""Build the two single-file HTML apps from src/.

  python build.py            -> dist/ptz-camera-sim.html            (loads three.js from the jsDelivr CDN)
                                dist/Greenhouse_Dataset_Generator.html (three.js + JSZip inlined, works offline)
                                dist/test-sim.html                  (local copy of the simulator for the render check)

Needs: Python 3 with Pillow, and `npm install` (three@0.160.0, jszip@3.10.1) in this folder.
All the 3D/optics/label logic lives in src/core.js and is shared by both apps.
"""
import base64, io, re
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SRC, DIST = HERE / "src", HERE / "dist"
DIST.mkdir(exist_ok=True)

core = (SRC / "core.js").read_text(encoding="utf8")

# farm photo shown on the simulator's test board (embedded as a data URI)
im = Image.open(HERE / "assets" / "farm_photo.jpg").convert("RGB")
im.thumbnail((720, 960))
buf = io.BytesIO(); im.save(buf, "JPEG", quality=72)
photo = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

CDN = '<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>'
BOOT = '''(function(){
"use strict";
const $ = id => document.getElementById(id);
if (!window.THREE) { $("loading").textContent = "Three.js didn't load, so the 3D view can't start. Reload the page to try again."; return; }
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas:$("gl"), antialias:true, alpha:true}); }
catch(e){ $("loading").textContent = "This browser couldn't start WebGL, which the 3D view needs. Try a desktop browser with hardware acceleration on."; return; }
renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
'''
GBOOT = '''(function(){
"use strict";
const $ = id => document.getElementById(id);
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas:$("gl"), antialias:false, alpha:false}); }
catch(e){ $("status").textContent = "WebGL could not start. Use Chrome or Edge with hardware acceleration on."; return; }
renderer.setPixelRatio(1);
'''

# --- simulator (published as a claude.ai artifact; the artifact host adds the <html>/<head> wrapper) ---
shell = (SRC / "sim_shell.html").read_text(encoding="utf8")
app = (SRC / "sim_app.js").read_text(encoding="utf8").replace("__FARM_PHOTO__", photo)
sim = shell + CDN + "\n<script>\n" + BOOT + core + "\n" + app + "\n})();\n</script>\n"
(DIST / "ptz-camera-sim.html").write_text(sim, encoding="utf8")

# local test copy: full document, three.js from node_modules, no web fonts
test = sim.replace(CDN, '<script src="../node_modules/three/build/three.min.js"></script>')
test = re.sub(r'<link rel="(stylesheet|preconnect)"[^>]*>', "", test)
test = ('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">'
        '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>'
        + test + "</body></html>")
(DIST / "test-sim.html").write_text(test, encoding="utf8")

# --- dataset generator (standalone, libraries inlined) ---
three = (HERE / "node_modules/three/build/three.min.js").read_text(encoding="utf8")
jszip = (HERE / "node_modules/jszip/dist/jszip.min.js").read_text(encoding="utf8")
gshell = (SRC / "gen_shell.html").read_text(encoding="utf8")
gapp = (SRC / "gen_app.js").read_text(encoding="utf8")
gen = (gshell + "<script>" + three.replace("</script", "<\\/script") + "</script>\n<script>"
       + jszip.replace("</script", "<\\/script") + "</script>\n<script>\n" + GBOOT + core + "\n" + gapp
       + "\n})();\n</script>\n</body>\n</html>\n")
(DIST / "Greenhouse_Dataset_Generator.html").write_text(gen, encoding="utf8")
print(f"simulator {len(sim):,} bytes, generator {len(gen):,} bytes -> {DIST}")
