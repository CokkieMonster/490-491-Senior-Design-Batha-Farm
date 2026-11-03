"""Headless render check: opens the built simulator and generator in Chromium (software WebGL),
renders a few views, and saves screenshots + label overlays to tests/out/.

  pip install playwright && python -m playwright install chromium
  python tests/render_check.py

Software WebGL is slow (about 30 s per image), so the waits are long. On a PC with a GPU, just open the
HTML files in Chrome instead.
"""
import asyncio, base64, json
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
DIST = HERE.parent / "dist"
OUT = HERE / "out"; OUT.mkdir(exist_ok=True)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


async def check_sim(b):
    pg = await b.new_page(viewport={"width": 1440, "height": 1300}); pg.set_default_timeout(400000)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto((DIST / "test-sim.html").as_uri(), wait_until="commit")
    await pg.wait_for_timeout(45000)
    # (layout, preset index, season day: 0 = 1 Nov 2026)
    for key, preset, day in [("albatha", 0, 120), ("uniFruit", 0, 140), ("uniLeafy", 0, 120)]:
        await pg.evaluate(f"() => {{ __sim.S.day = {day}; __sim.applyLayout('{key}', {preset}); }}")
        await pg.wait_for_timeout(45000)
        info = await pg.evaluate("() => JSON.stringify({fruit: __sim.NF, inView: __sim.FV && __sim.FV.res, target: __sim.TGT && __sim.TGT.surf.label})")
        print("simulator", key, info)
        await pg.screenshot(path=str(OUT / f"sim_{key}.png"))
    print("simulator page errors:", errors or "none")


async def check_generator(b):
    pg = await b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(400000)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto((DIST / "Greenhouse_Dataset_Generator.html").as_uri(), wait_until="commit")
    await pg.wait_for_timeout(40000)
    for i in range(2):
        r = await pg.evaluate("""() => { const G = __gen.settings(); G.size = 1280; const res = __gen.makeShot(G, true); if (!res) return null;
            const c = document.createElement('canvas'); c.width = res.img.width; c.height = res.img.height; const g = c.getContext('2d'); g.putImageData(res.img, 0, 0);
            const BC = ['#ff3a2a', '#3ab7ff', '#ffd23a', '#b96bff']; g.lineWidth = 2; res.boxes.forEach(b => { g.strokeStyle = BC[b.cls]; g.strokeRect(b.x0, b.y0, b.w, b.h); });
            return {img: c.toDataURL('image/jpeg', 0.9), yolo: __gen.yoloText(res.boxes, res.img.width, res.img.height), gh: __gen.GH}; }""")
        if not r:
            print("generator: no shot"); continue
        (OUT / f"gen_{i}.jpg").write_bytes(base64.b64decode(r["img"].split(",")[1]))
        (OUT / f"gen_{i}.txt").write_text(r["yolo"])
        print("generator", i, r["gh"], len(r["yolo"].splitlines()), "boxes")
    print("generator page errors:", errors or "none")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        await check_sim(b)
        await check_generator(b)
        await b.close()

asyncio.run(main())
