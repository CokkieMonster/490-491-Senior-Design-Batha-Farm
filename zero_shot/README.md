# Zero-shot detector test (28-29 Oct 2026)

10 phone photos from the farm (5 with fruit, 5 without), 1280 px tiles with 256 px overlap, class-agnostic
NMS at IoU 0.5, CPU only. Fruit-like COCO classes counted for COCO models; YOLOE with text prompts
`['cherry tomato','green tomato','cucumber']` and prompt-free with a fruit tag list.

Scoring: all boxes at conf >= 0.10 from all models pooled into clusters (IoU 0.3), each cluster judged by
eye (`judgements.json`) -> **52 real fruit (43 tomato, 9 cucumber)**. Two clusters (#98, #124) were
re-judged as pale leaves/buds on 29 Oct and removed.

| Model | conf | found (of 52) | boxes that are fruit |
|---|---|---|---|
| RT-DETR-L | 0.10 | 96% | 23% |
| RT-DETR-L | 0.15 | 83% | 44% (54 wrong, 3 on fruit-free photos) |
| RT-DETR-L | 0.25 | 48% | 76% (0 on fruit-free photos) |
| RT-DETR-L | 0.40 | 29% | 88% |
| YOLO11m | 0.10 | 10% (5) | 100% |
| YOLO11m | 0.25 | 6% (3) | 100% |
| YOLOE text prompts | 0.10 | 10% (5) | 100% |
| YOLOE prompt-free | 0.10 | 17% (9) | 50% (calls tomatoes lime/tangerine/pear) |
| YOLOE prompt-free | 0.25 | 8% (4) | 57% |

Conclusion (29 Oct): pre-trained models are not enough; we fine-tune our own model. Wrong boxes are
mostly yellow flowers, pale leaves and fallen fruit; hanging cucumbers were missed by all models.

Files: `run_zero_shot.py` -> `detections.json`, `timing.json`; `pool.py` -> `clusters.json` + contact
sheets; `evaluate.py` -> `scores.json`, overlays, `prelabels_coco.json` (COCO boxes for Roboflow import).
Photos are not in git; put them in `photos/`.
