"""Zero-shot fruit detection on our greenhouse photos.

Runs each pre-trained model on every photo with simple tiling (like SAHI), merges tile
results with class-agnostic NMS, and saves all boxes (conf >= 0.05) to detections.json.
No model was trained or fine-tuned on our data.
"""
import json, sys, time, glob, os
import numpy as np
import torch, torchvision
torch.set_num_threads(2)
from PIL import Image
from ultralytics import YOLO, RTDETR, YOLOE

PHOTOS = sorted(glob.glob('photos/*.jpg'))
TILE, OVL = 1280, 256
CONF_MIN = 0.05

# COCO has no tomato/cucumber class; these are the classes a COCO model gives fruit-like objects
# prompt-free tags that name a single round or long fruit (it often calls our tomatoes lime/pear/tangerine)
PF_FRUIT = {'tomato', 'cherry tomato', 'cucumber', 'courgette', 'pickle', 'apple', 'apricot', 'berry', 'cherry', 'citrus fruit', 'fig',
            'fruit', 'grape', 'lemon', 'lime', 'mandarin orange', 'mandarine', 'olive', 'orange', 'peach', 'pear', 'plum', 'tangerine', 'squash'}
COCO_FRUITLIKE = {'apple', 'orange', 'sports ball', 'banana'}


def tiles(w, h, t=TILE, o=OVL):
    xs = list(range(0, max(w - t, 0) + 1, t - o)) or [0]
    ys = list(range(0, max(h - t, 0) + 1, t - o)) or [0]
    if xs[-1] + t < w: xs.append(w - t)
    if ys[-1] + t < h: ys.append(h - t)
    return [(x, y) for y in ys for x in xs]


def run_model(model, name, img, keep):
    """keep(class_name) -> label or None. Returns list of dicts."""
    W, H = img.size
    arr = np.ascontiguousarray(np.asarray(img)[:, :, ::-1])  # Ultralytics expects BGR numpy arrays (OpenCV order)
    boxes, scores, labels = [], [], []
    t0 = time.time()
    for (x, y) in tiles(W, H):
        crop = arr[y:y + TILE, x:x + TILE]
        r = model.predict(crop, imgsz=TILE, conf=CONF_MIN, verbose=False)[0]
        if r.boxes is None or len(r.boxes) == 0:
            continue
        b = r.boxes.xyxy.cpu().numpy(); c = r.boxes.conf.cpu().numpy(); k = r.boxes.cls.cpu().numpy().astype(int)
        for bb, cc, kk in zip(b, c, k):
            lab = keep(r.names[kk])
            if lab is None:
                continue
            boxes.append([bb[0] + x, bb[1] + y, bb[2] + x, bb[3] + y]); scores.append(float(cc)); labels.append(lab)
    dt = time.time() - t0
    out = []
    if boxes:
        bt = torch.tensor(boxes, dtype=torch.float32); st = torch.tensor(scores)
        idx = torchvision.ops.nms(bt, st, 0.5).tolist()
        out = [dict(box=[round(float(v), 1) for v in boxes[i]], conf=round(scores[i], 4), label=labels[i]) for i in idx]
    return out, dt


def main():
    which = sys.argv[1:] or ['yolo11m', 'rtdetr-l', 'yoloe-text', 'yoloe-pf']
    res = json.load(open('detections.json')) if os.path.exists('detections.json') else {}
    times = json.load(open('timing.json')) if os.path.exists('timing.json') else {}
    for mname in which:
        if mname == 'yolo11m':
            model = YOLO('yolo11m.pt'); keep = lambda n: n if n in COCO_FRUITLIKE else None
        elif mname == 'rtdetr-l':
            model = RTDETR('rtdetr-l.pt'); keep = lambda n: n if n in COCO_FRUITLIKE else None
        elif mname == 'yoloe-text':
            model = YOLOE('yoloe-11l-seg.pt')
            names = ['cherry tomato', 'green tomato', 'cucumber']
            model.set_classes(names, model.get_text_pe(names))
            keep = lambda n: n
        elif mname == 'yoloe-pf':
            model = YOLOE('yoloe-11l-seg-pf.pt')
            keep = lambda n: n if n in PF_FRUIT else None
        elif mname == 'yoloworld':
            from ultralytics import YOLOWorld
            model = YOLOWorld('yolov8l-worldv2.pt')
            model.set_classes(['red tomato', 'green tomato', 'orange tomato', 'cucumber'])
            keep = lambda n: n
        else:
            raise SystemExit('unknown model ' + mname)
        res.setdefault(mname, {}); times.setdefault(mname, {})
        for p in PHOTOS:
            if os.path.basename(p)[:-4] in res[mname]:
                continue
            img = Image.open(p).convert('RGB')
            dets, dt = run_model(model, mname, img, keep)
            key = os.path.basename(p)[:-4]
            res[mname][key] = dets; times[mname][key] = round(dt, 1)
            print(mname, key, len([d for d in dets if d['conf'] >= 0.25]), 'boxes >=0.25', f'{dt:.0f}s', flush=True)
            json.dump(res, open('detections.json', 'w'))
            json.dump(times, open('timing.json', 'w'))


if __name__ == '__main__':
    main()
