# Greenhouse PTZ Vision (490 Gardening Project)

Code for the AUS CMP/COE 490 senior design project *Farming as a Service*: counting fruit in the
Albatha farm greenhouses with Hikvision PTZ cameras (DS-2DE2A404IWG1-E). The project context, meeting
notes, decisions and results are in [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md).

| Folder | What it is |
|---|---|
| [`simulator/`](simulator/) | 3D greenhouse + PTZ camera simulator (lens, distortion, depth of field, perspective correction, pixels per fruit, fruit hidden by leaves) and the **synthetic dataset generator** that renders random camera shots with YOLO labels. |
| [`zero_shot/`](zero_shot/) | Zero-shot test of pre-trained detectors (RT-DETR-L, YOLO11m, YOLOE) on 10 farm photos, 28 Oct 2026, with the scoring against 52 hand-checked fruit and COCO pre-labels for Roboflow. |
| [`camera_math/`](camera_math/) | Coverage math for the Hikvision PTZ: presets per row face, pixels per fruit, and the camera count for 40 m rows. |
| [`tools/`](tools/) | One-off scripts that produced the team documents (29 Oct deck, to-do list, tracked changes in the SDP report). Kept for reference. |
| [`docs/`](docs/) | Project context and camera-count notes. |

## Quick start

**Use the simulator or the generator:** open `simulator/dist/ptz-camera-sim.html` or
`simulator/dist/Greenhouse_Dataset_Generator.html` in Chrome or Edge. The generator works offline
and writes a YOLO dataset (`images/`, `labels/`, `data.yaml`, `meta.csv`) to a folder you choose.
The simulator is also published at https://claude.ai/artifact/85WtKK3gcPPh4so9ZpcZSm.

**Rebuild after editing `simulator/src/`:**
```
cd simulator
npm install          # three@0.160.0, jszip@3.10.1
python build.py      # writes dist/
```

**Train on a generated dataset (Ultralytics):**
```
yolo detect train data=data.yaml model=yolo11m.pt imgsz=1280 epochs=100
yolo detect train data=data.yaml model=rtdetr-l.pt imgsz=1280 epochs=100
```
Always measure the trained model on **real** photos only. Synthetic images teach shape, size and
occlusion, but they still look rendered.

**Re-run the zero-shot test:** put the 10 farm photos (`IMG_6770.jpg` ... `IMG_6792.jpg`) in
`zero_shot/photos/`, then `pip install -r requirements.txt` and run `run_zero_shot.py`,
`pool.py`, `evaluate.py` from inside `zero_shot/`.

## Label classes (generator)
`0 tomato` (round + cherry), `1 cucumber`, `2 capsicum`, `3 zucchini`. A fruit gets a box when at least
30% of its pixels are visible (rendered with and without leaves, after lens distortion) and the box is
at least 8 px; the box covers only the visible part. Both thresholds are settings.
