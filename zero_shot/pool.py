"""Pool every model's boxes into clusters and make numbered contact sheets for judging.

A cluster = boxes from any model that overlap (IoU >= 0.3). Each cluster is judged once
by eye (fruit / not fruit), and that judgement is the reference label for all models.
"""
import json, math
from PIL import Image, ImageDraw, ImageFont

POOL_CONF = 0.10
det = json.load(open('detections.json'))
models = list(det)
photos = sorted(det[models[0]])


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    i = ix * iy; u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i
    return i / u if u > 0 else 0


clusters = []
for p in photos:
    boxes = [dict(m=m, **d) for m in models for d in det[m].get(p, []) if d['conf'] >= POOL_CONF]
    boxes.sort(key=lambda d: -d['conf'])
    cl = []
    for b in boxes:
        for c in cl:
            if iou(c['box'], b['box']) >= 0.3:
                c['members'].append(b); break
        else:
            cl.append(dict(photo=p, box=b['box'], members=[b]))
    clusters += cl
for i, c in enumerate(clusters):
    c['id'] = i
json.dump(clusters, open('clusters.json', 'w'))
print(len(clusters), 'clusters')

# contact sheets: 48 crops per sheet, each crop = box with 1x padding, resized to 160 px
font = ImageFont.load_default()
CELL = 170; COLS = 8; ROWS = 6
imgs = {}
for s in range(math.ceil(len(clusters) / (COLS * ROWS))):
    sheet = Image.new('RGB', (COLS * CELL, ROWS * (CELL + 14)), 'white'); d = ImageDraw.Draw(sheet)
    for k, c in enumerate(clusters[s * COLS * ROWS:(s + 1) * COLS * ROWS]):
        im = imgs.setdefault(c['photo'], Image.open(f"photos/{c['photo']}.jpg").convert('RGB'))
        x0, y0, x1, y1 = c['box']; w, h = x1 - x0, y1 - y0; pad = max(w, h) * 0.8 + 20
        crop = im.crop((int(x0 - pad), int(y0 - pad), int(x1 + pad), int(y1 + pad)))
        sc = 160 / max(crop.size); crop = crop.resize((max(1, int(crop.size[0] * sc)), max(1, int(crop.size[1] * sc))))
        cd = ImageDraw.Draw(crop); cd.rectangle([pad * sc, pad * sc, (pad + w) * sc, (pad + h) * sc], outline=(255, 0, 255), width=2)
        cx, cy = (k % COLS) * CELL, (k // COLS) * (CELL + 14)
        sheet.paste(crop, (cx + 5, cy + 14)); d.text((cx + 5, cy), f"#{c['id']} {int(w)}px", fill='black', font=font)
    sheet.save(f'view/sheet_{s:02d}.jpg', quality=88)
print('sheets', s + 1)
