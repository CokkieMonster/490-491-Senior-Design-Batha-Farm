"""Score each model against the judged clusters, draw overlays, export COCO pre-labels.

judgements.json: {"fruit": [cluster ids judged real fruit], "kind": {id: "tomato"|"cucumber"}}
A model hits a fruit cluster if it has a box >= THR inside it. Boxes >= THR in non-fruit
clusters are false positives. Recall is against the pooled set (fruit found by any model),
so it is an upper bound: fruit that every model missed is not counted.
"""
import json, os
from PIL import Image, ImageDraw

THR = 0.25
FRUIT_PH = ['IMG_6787', 'IMG_6785', 'IMG_6786', 'IMG_6791', 'IMG_6792']
NEG_PH = ['IMG_6770', 'IMG_6773', 'IMG_6779', 'IMG_6789', 'IMG_6790']
det = json.load(open('detections.json')); tim = json.load(open('timing.json'))
clusters = json.load(open('clusters.json')); jd = json.load(open('judgements.json'))
fruit = set(jd['fruit'])
models = list(det)

res = {}
fallen = set(jd.get('fallen', []))
for m in models:
    res[m] = {}
    for thr in (0.10, 0.15, 0.25, 0.40):
        tp = set(); fp = 0; fp_neg = 0; fp_fallen = 0
        for c in clusters:
            if not [b for b in c['members'] if b['m'] == m and b['conf'] >= thr]:
                continue
            if c['id'] in fruit:
                tp.add(c['id'])
            else:
                fp += 1; fp_neg += c['photo'] in NEG_PH; fp_fallen += c['id'] in fallen
        p = len(tp) / (len(tp) + fp) if (tp or fp) else 0.0; r = len(tp) / len(fruit)
        f1 = 2 * p * r / (p + r) if p + r else 0.0
        res[m][str(thr)] = dict(tp=len(tp), fp=fp, fp_neg_photos=fp_neg, fp_fallen=fp_fallen, precision=round(p, 3), recall_pooled=round(r, 3), f1=round(f1, 3),
                                tp_tomato=sum(jd['kind'][str(i)] == 'tomato' for i in tp), tp_cucumber=sum(jd['kind'][str(i)] == 'cucumber' for i in tp))
    res[m]['sec_per_photo'] = round(sum(tim[m].values()) / len(tim[m]), 1)
    res[m]['sec_per_tile'] = round(sum(tim[m].values()) / sum(12 if k != 'IMG_6792' else 20 for k in tim[m]), 2)
    print(m, json.dumps(res[m]))
print('fruit clusters', len(fruit), 'tomato', sum(v == 'tomato' for v in jd['kind'].values()))
json.dump(res, open('scores.json', 'w'), indent=1)

# overlays: one image per photo per model, scaled to 1600 px tall
COL = {'yolo11m': (42, 120, 214), 'rtdetr-l': (235, 104, 52), 'yoloe-text': (27, 175, 122), 'yoloe-pf': (237, 161, 0)}
os.makedirs('overlays', exist_ok=True)
for p in FRUIT_PH + NEG_PH:
    im = Image.open(f'photos/{p}.jpg').convert('RGB')
    for m in models:
        o = im.copy(); d = ImageDraw.Draw(o); lw = max(4, im.size[0] // 500)
        for b in det[m].get(p, []):
            if b['conf'] >= THR:
                d.rectangle(b['box'], outline=COL[m], width=lw)
        o.thumbnail((1600, 1600)); o.save(f'overlays/{p}_{m}.jpg', quality=88)

# COCO pre-labels from the judged fruit clusters (best box per cluster) for Roboflow / Label Studio
imgs, anns = [], []
for i, p in enumerate(FRUIT_PH):
    w, h = Image.open(f'photos/{p}.jpg').size
    imgs.append(dict(id=i + 1, file_name=f'{p}.jpg', width=w, height=h))
cats = [dict(id=1, name='tomato'), dict(id=2, name='cucumber')]
for c in clusters:
    if c['id'] in fruit and c['photo'] in FRUIT_PH:
        x0, y0, x1, y1 = c['box']
        anns.append(dict(id=len(anns) + 1, image_id=FRUIT_PH.index(c['photo']) + 1,
                         category_id=2 if jd['kind'].get(str(c['id'])) == 'cucumber' else 1,
                         bbox=[round(x0, 1), round(y0, 1), round(x1 - x0, 1), round(y1 - y0, 1)],
                         area=round((x1 - x0) * (y1 - y0), 1), iscrowd=0))
json.dump(dict(images=imgs, annotations=anns, categories=cats), open('prelabels_coco.json', 'w'))
print('coco anns', len(anns))
