# Project Context: 490 Gardening Project — PTZ fruit counting (updated 3 Nov 2026)

> Read this first in any new chat. It replaces earlier versions of `plant-drone-project-context.md`.
> Section 13 lists every file in the project and where the code lives.

## 1. Who I am and how to help me
- Mohamed Alzarooni, computer engineering student at AUS (American University of Sharjah).
- CMP/COE 490 senior design project, **"Farming as a Service" (FaaS)**, with the Albatha farm. Also run as an undergraduate research grant where I am **co-applicant II**.
- 4-member team: **Mohamed (me): computer vision**; **Meera**: tilt / perspective-correction experiment; **Khader**: "count each object once" (multi-view de-duplication) and camera calibration; a 4th member covers budget/methodology. **Ali** coordinates with the farm; **Rajah** is the farm contact.
- **Advisor: Prof. Imran Zualkernan** (plus a consultant who shared a Node-RED + MQTT setup).
- How to help: explain the reasoning, not just the fix; concise unless I ask for depth; ask me questions before starting when something is unclear. For Java code assume I'm a beginner (simplest code, index-based loops).
- Proof-of-concept project, not a commercial deployment: low cost, low risk, things a student team can build and demo.
- **Keep a log of every rejected idea and why** (section 11) — evidence for the chosen design.

## 2. Course schedule (CMP/COE 490 Fall 2026)
| Task | Milestone | Date |
|---|---|---|
| 1 | Team + advisor | Sept 1 |
| 2 | Project plan, Gantt | Advisor Sept 4, iLearn Sept 10 |
| 3 | Report Part I: intro, problem, objectives, literature | Advisor Sept 17, iLearn Sept 22 |
| 4 | Report Part II: requirements, cost, PM plan, social impact, standards | Advisor Oct 1, iLearn Oct 6 |
| 5 | Part III: system SW/HW architecture and detailed design | Advisor Oct 22, iLearn Oct 30 — **submitted (updated 29 Oct)** |
| 6 | Part IV: testing plan + plan for implementation in CMP 491 | **Advisor Nov 4 — next** |
| 7 | Draft final report to advisor | Nov 6 |
| 8 | Final reports | Nov 12 |
| 9 | Presentations | Week of Nov 16 |

Report template: AUS CSE Senior Design Project report (Spring 2025): 1 Introduction; 2 Literature Review; 3 System Specifications (FR/NFR "FRn. The system must…"); 4 Technical Approach (block diagram, HW, SW, data architecture, detailed design, standards, alternative design approaches); 5 Implementation (Senior 2); 6 Validation/Verification/Performance plan; 7 Project Management (WBS, Gantt, cost in AED, risk); 8 Conclusions; IEEE references. Tasks 1–4 were resubmitted together after the idea changed (drone → fixed cameras → PTZ).

## 3. Where we are (3 Nov 2026) — short version
- **Camera:** Hikvision **DS-2DE2A404IWG1-E** PTZ bought and arrived (bench setup, pixel measurements and perspective-correction test with the real camera still to do).
- **Detection:** pre-trained detectors zero-shot are not enough (RT-DETR-L best: 83% found but only 44% of boxes are fruit at conf 0.15). **We fine-tune our own model**, with **synthetic data as the priority** plus real labelled farm photos.
- **Simulator + dataset generator built (1–2 Nov):** interactive PTZ camera simulator (published artifact) and an offline generator that renders random camera shots with **YOLO labels for tomato, cucumber, capsicum, zucchini**. Code in the GitHub repo `greenhouse-ptz-vision`.
- **Sites (two layouts in play, see section 5):** the Albatha production rows (**40 m**, corrected 2 Nov) and the **university project greenhouse: 2 arches, 28 customer plots** (14 fruit-vegetable + 14 leafy), arches **40 × 8 m** (corrected).
- **Cameras per row:** the team's tilt test said 2 per row (~12 total, max angle ~82°); I believe 3 PTZ per row. My calculation for 40 m rows (section 7): **3 per row only works if the cameras sit ≥ ~1.2 m from the row face at up to 80°; from a narrow 0.3 m walkway you'd need 12–18.**
- **Next deadline: Task 6 (testing plan + CMP 491 implementation plan) to the advisor on 4 Nov; draft final report 6 Nov.**

## 4. Timeline of decisions
- **8 Oct:** drone dropped (farm meeting). Farm will install multiple fixed cameras; **farm buys the cameras**.
- **11 Oct (farm meeting):** goal "**leave it working for 5 years without doing anything**"; they accept **200+ cameras**; **plant health not important — fruit counting is the focus**; 2 MP enough.
- **15 Oct:** greenhouse read as 30 × 8 m single rows ~1 m apart; compared fixed cameras vs rail/gantry, costed both, top vs side view. Leaning then: side-view rail per walkway (pilot one walkway). 3D "Greenhouse Camera Options" artifact.
- **22 Oct advisor meeting:** PTZ approach approved. Buy one camera now (older Hikvision fine; pay and get reimbursed); write a camera spec first (network, video protocol, readable pan/tilt/zoom). Each PTZ has fixed preset views; **each preset is treated as its own fixed camera with its own tile grid**. Start with pre-trained detectors zero-shot (also DETR-type, DINOv2/v3; distil later); Roboflow auto-labelling; ask the farm its error tolerance; farm visits via Ali. Next meeting: real camera results.
- **23 Oct:** team decided on **PTZ cameras** (replaces the rail leaning; rail/fixed analysis kept for "Alternative design approaches").
- **28 Oct:** camera chosen and checked against spec; zero-shot detector test; coverage math; dataset review; 29 Oct deck prepared.
- **29 Oct advisor meeting (~39 min):** details in section 8. Key: 2 PTZ/row judged viable from the tilt test; **advisor: don't chase 100% detection — set an engineering acceptance criterion (~20% error OK)**; synthetic data is the priority; build an interactive camera simulation; use slicing at full resolution; try DINOv3, CLIP-based detection, COCO-Stuff YOLO, tiny-object YOLO; active PTZ scanning; leafy crops top-down (estimate weight/volume). SDP report Tasks 1–5 updated and submitted.
- **1–2 Nov:** simulator built, then made bushier to match the farm photos; dataset generator built (YOLO labels). Row length corrected to **40 m**; camera count recalculated for 40 m rows.
- **2 Nov:** university plot layout + production plans received (email + 3 drawings + 2 yield workbooks); simulator gained the two university arches with a season date slider and 4 label classes. Arch length corrected to **40 m** ("One correction in the most recent email update we received" — the correction text itself was not shared with Claude); walkway check redone (section 5.3).

## 5. Sites

### 5.1 Albatha production greenhouse rows (photos 15 Oct)
- **Rows 40 m long** (corrected 2 Nov 2026; earlier read as 30 m, and 36 m before that). Width ~8 m. Single rows ~1 m apart (confirm row-to-row vs plant-to-plant). Earlier plant total noted as 900 [confirm].
- **What the photos show:** arched steel-truss tunnel with white film roof (white lattice arches ~3 m apart), vertical side walls ~3 m, apex ~5 m; sandy floor with drip lines; gravel main aisle/edge paths (~0.5–1 m); horizontal **crop poles ~2.3–2.5 m** and **tie poles ~3 m** at each arch.
- **Cherry tomatoes:** not string-trained, dense bushy ~2 m hedge, ~0.6–0.8 m wide; walkway between hedges almost closed by foliage (~0.2–0.4 m clear, leaves meet overhead like a tunnel); much fruit hidden inside; mostly green fruit with some red/orange/yellow; many yellow flowers.
- **Cucumbers:** vertical on strings to overhead wires (~2.5–3 m); fruit ground to ~2 m; narrow sandy walkway (~0.4–0.6 m) with overhanging leaves.
- Low leafy crops (red amaranth/herbs) 0.2–0.4 m; separate seeding greenhouse with hydroponic raft beds (kale), concrete walkways.
- 5 crop groups / 9 varieties grown commercially (days seeding → 1st harvest / harvest window / total): cucumber 35–45/60/95–105; snack cucumber 35–40/60/95–100; zucchini 35–45/60/95–105; marrow 35–45/60/95–105; cherry tomato, plum cherry, colour cherry 60–70/90–150/150–210; colour capsicum 75–85/120–180/195–260; eggplant 65–75/120–180/185–250.

### 5.2 University project greenhouse (email + drawings GH-01/02/03, 24-10-2026)
- Email to the advisor (2 Nov): **28 plots — 14 fruit vegetables + 14 leafy greens/salads/herbs**; each plot **3.5 m × 4 m**, "with **1-meter-wide walkways** to facilitate customer access, farm visits, and self-harvesting"; peak harvest Feb – 15 May: average **~7 kg/week fruit vegetables and ~2 kg/week leafy** (read as per plot: the leafy workbook targets 2.0 kg/plot/week; the fruit workbook's full-production week is 8.8 kg/plot). Mohamed's understanding: **28 customer plots across 2 arches** (one fruit arch, one leafy arch). The 29 Oct meeting described the farm area as 40 × 8 m split into ~14 MVP patches; a customer rents one leafy + one fruiting patch.
- **Drawings** (each arch): two rows of 7 plots (Row A plots 01–07, Row B plots 08–14), **1.00 m central walkway** between the rows, 4 plant lines per plot running along the 4 m side, lines **0.875 m apart** (0.44 m from plot edges). Drawings show the arch as **30 × 8 m with 0.30 m paths between plots and 0.10 m end clearance**.
- **Fruit plot (34 plants, organic soil)**, from side wall to walkway: Line 1 **round tomato 8 @ 0.50 m**; Line 2 **cherry tomato 8 @ 0.50 m**; Line 3 **coloured capsicum 10 @ 0.40 m**; Line 4 **cucumber 4 + zucchini 4 @ 0.50 m** (cucumber first half). Tomatoes and cucumber on vertical strings; zucchini and capsicum supported low. 476 plants per arch.
- **Fruit production plan (one plot):** seeding 28 Oct 2026; transplant tomatoes 27 Nov, capsicum 12 Dec, cucumber/zucchini cycle 1 11 Nov; first harvest cherry 21 Jan, round 31 Jan, capsicum 25 Feb, cucumber c1 15 Dec, zucchini c1 12 Dec; cycle 2 transplant zucchini 12 Feb, cucumber 15 Feb, first harvest 8 Mar / 14 Mar; harvest ends late May / early June (heat). Yield per plant: round tomato 5 kg, cherry 2.75, capsicum 2.5, cucumber 2/cycle, zucchini 2.25/cycle. **Season total 121 kg/plot (1,694 kg/14 plots)**: round 40, cherry 22, capsicum 25, cucumber 16, zucchini 18 kg. Full production week 8.77 kg/plot (122.75 kg/14 plots), highest week ~24 Mar.
- **Leafy plot:** Line 1 baby kale, Line 2 baby rocca (arugula), Line 3 baby spinach — each a 0.60 m band, 5 seed rows @ 12 cm (2.4 m²); Line 4 split in thirds (1.33 m each): rosemary 6 plants (2 rows @ 40 cm), thyme 10 plants (2 rows @ 25 cm), coriander 5 rows @ 12 cm (0.8 m²). Start 1 Nov 2026, end 31 May 2027. Kale: 1st cut 30 d, every 10 d, 3 cuts, re-sow 7 d after last cut, last sowing 30 Apr; rocca 25/10/3, last sowing 30 Apr; spinach 30/12/2, last sowing 15 Mar (bolts in heat); rosemary/thyme first cut 90/75 d then every 28 d; coriander 40/14/2, last sowing 31 Mar. **Target 2 kg/plot/week; season 48 kg/plot (672 kg/14 plots)**; peak week ~3.8 kg (from 7 Mar).

### 5.3 Walkway check with 40 m arches (2 Nov)
- Width: 3.50 + 1.00 + 3.50 = **8.00 m** ✓ (the 1 m walkway is the central one).
- Length with 7 plots × 4.00 m = 28 m: drawing spacing (0.30 m paths + 0.10 m ends) uses 29.8 m (spare 10.2 m); **1.00 m walkways between plots (email) uses 34.0 m (spare 6.0 m)**; 1 m between plots and at both ends uses 36.0 m (spare 4.0 m). At 30 m, 1 m walkways between plots needed 34 m and did not fit — that is why the drawings used 0.30 m paths.
- **Simulator uses:** 40 × 8 m arch, 1.00 m walkways between plots, 1.00 m central walkway, **3.00 m free at each end** (no document says where the spare 6 m goes). Confirm: where the extra 6 m is, and that the width is still 8 m.

## 6. Camera
### 6.1 Hikvision DS-2DE2A404IWG1-E (bought, arrived by 29 Oct)
- 4 MP 1/2.8" progressive CMOS, **2560 × 1440**; **2.8–12 mm, 4× optical** (16× digital); **HFOV 99.4° → 32.8°, VFOV 51.7° → 18.4°**, DFOV 119.9° → 37.5°; **max aperture F1.8**; focus auto/semi/manual; zoom ~2 s.
- **Pan 0–355°, tilt 0–90° (down only — cannot look up)**; 50°/s preset speed; **300 presets**; 3D positioning; PTZ status display; power-off memory.
- Network: **PoE 802.3af (9.2 W) or 12 V; no Wi-Fi**; RTSP, **ONVIF S/G/T, ISAPI**; H.265/H.264; IR to 20 m (850 nm). IP66, IK10, −20…60 °C (greenhouse runs ~10–60 °C), humidity ≤ 90% non-condensing (check morning condensation).
- Can't run our models → detection on a server / GPU PC. ~3 s per preset (50°/s, ~2 s zoom, ~1 s settle est.) → 30 presets ≈ 1.5 min per round.
- Mount ~2.2 m above the top fruit (tilt is down-only).
- Alternative on the bench list: **DS-2DE2A404IW-DE3(S6)** (indoor, F1.5, HFOV 96.8° → 31.7°, 100°/s, no IK rating); Reolink RLC-823S1 kept as budget alternative.

### 6.2 Simulator lens model (for reference)
tan(half HFOV) = a + b/f fitted to 99.4° @ 2.8 mm and 32.8° @ 12 mm (a = 0.025, b = 3.231); pixel pitch 5.58 mm / 2560 = 2.18 µm. Effective focal length at the long end ≈ 9.5 mm. Barrel distortion at 2.8 mm (division model k ≈ 0.13), none at 12 mm. Aperture assumed F1.8 → F2.8 across the zoom. The datasheet's vertical angle doesn't fit the same 16:9 model (sim gives ~61° vertical at 2.8 mm).
**Pixels across a 30 mm tomato:** 20 px up to 1.63 m (1×), 3.19 m (2×), 4.69 m (3×), **6.52 m (4×)**; 30 px up to 1.09 / 2.13 / 3.12 / 4.35 m. (≈54 px at 1.73 m at 3×.)

## 7. How many cameras per row (40 m rows, 2 Nov)
- **Pixels:** 20 px needs ≤ 6.5 m at 4× → each camera covers ≤ ~13 m → **4 cameras per 40 m row** (5 for 30 px). 3 per row leaves the far fruit at ~19 px.
- **Viewing angle (the real limit):** reach along the row = D × tan(angle); cameras per row = ceil(40 / (2 · D · tan θ)).

| Camera distance to row face D | 60° | 70° | 75° | 80° | 85° |
|---|---|---|---|---|---|
| 0.3 m (narrow walkway) | 39 | 25 | 18 | 12 | 6 |
| 0.8 m | 15 | 10 | 7 | 5 | 3 |
| 1.2 m (wide aisle) | 10 | 7 | 5 | 3 | 2 |

- **3 per row needs** D ≥ 1.79 m at 75°, **≥ 1.18 m at 80°**, ≥ 0.58 m at 85°. A 10 cm leaf protrusion hides 10 cm × tan θ of row: 0.37 m at 75°, 0.57 m at 80°, 1.14 m at 85°.
- **Meera's 85° result is optimistic for real hedges:** it warped flat photos, so no leaf sticks out to hide fruit.
- **Conclusion:** 3/row works only from the wider aisles (≥ ~1.2 m from the face), accepting ≤ 80° and ~19 px at the far end; from narrow walkways plan ≥ 4–5/row (pixels) and expect much fruit hidden. Redo for the university arches (1 m walkways change it a lot) — not done yet.
- Earlier (28 Oct, 30 m rows): in-walkway (0.3 m) 29/19/14/9 cameras per row line at 60/70/75/80°; above row (~0.8 m) 11/7/6/4; ≤ 3.6× zoom gives ≥ 20 px per 30 mm fruit 5 m along the row; 4–30 presets per face.
- Cell split: cells fixed in metres on the row-face plane; each preset has its own image→face mapping (4 marked points); each cell owned by the preset with the straightest view; depth shift = depth × tan(angle) (10 cm → 17 cm at 60°, 37 cm at 75°).

## 8. 29 Oct advisor meeting (full notes: summary docx + transcript in the project)
- **2 PTZ cameras per row judged viable** from Meera's tilt experiment (YOLO11n/11m zero-shot on ~90 front-facing images, 1,016 tomatoes, warped to simulate tilt): no correction → recall 0.69 at 0°, 0.42 at 60°, 0.18 at 70°, 0.06 at 75°, 0 at 80°; **perspective-corrected + 3× zoom → ~0.69–0.70 up to 85°**; corrected without zoom 0.64 at 80°, 0.43 at 85°. Her layout: 2 cameras per row, 14 m apart, mounted 3.8 m above the row, 6 rows → 12 cameras; max tilt ≈ 82°. A 3rd camera/row (~10k) likely not needed.
- **Acceptance criterion:** set an engineering criterion (~20% error OK) instead of adding cameras (NFR-2 in the report).
- Limitations: small uniform front-facing set; real cameras look down (extra vertical squish); unknown focal length → **redo with varying focal length + top-down view**; read up on the pinhole model; **build an interactive camera simulation** (done, section 9).
- **Synthetic data is the priority:** photos → 3D plant model → Blender renders varying fruit size/shape/colour, angle, distance, lighting (hundreds of thousands of images, train on an RTX 4090); explore diffusion models; check the large synthetic tomato-plant dataset spotted in the meeting.
- **Detection:** images were downscaled → **use slicing/tiled inference at full resolution** (~20 px per object is enough). Try **DINOv3**, newest **CLIP-based detector**, **YOLO on COCO-Stuff** (has "leaves"), **tiny-object YOLO** (name unconfirmed: "TPM-YOLO"/"TOAM YOLO"). Save zero-shot as baseline, then fine-tune YOLO/DETR/DINO on our data. Research pre-filtering (a plain green filter wasn't useful).
- **Capture strategy:** active PTZ scan — vertical grid, find candidates, zoom in; decide images per cell and overlap. **Leafy crops: top-down, estimate weight/volume, not counts** (start the following week).
- **Farm/data:** PTZ camera arrived; tomatoes in ~1 month (planted a few days before); Ali waiting on Rajah. University community-service farm (near the solar farm / physics building) had ripe tomatoes → early real images. A reviewed public dataset has fewer images than its headline number. Remaining budget ~AED 1,000–1,100.
- **Lab test plants:** Dragon Mart 2 shop sells realistic artificial plants (advisor bought a ~3.2–3.4 m banana tree) → artificial tomato plants for camera-placement and perspective tests (not training data); cheaper than a 10–20k artificial greenhouse.
- **Infrastructure:** self-hosted prototype (MQTT broker + web server + Node.js app parsing camera data; consultant's Node-RED + MQTT setup); managed service (e.g. Azure) for production. Greenhouse team builds the patch-rental e-commerce app; contact them early about the integration endpoint.
- Due next meeting (5 Nov): slicing on full-res images, real PTZ pixel results, camera simulation.

### 8.1 Action list for 5 Nov (artifact "Action List for 5 Nov"; state on 3 Nov)
Marked **done** by the team (results not yet shared with Claude — ask for them): slicing on full-res images; save zero-shot baseline; DINOv3; CLIP-based detector; COCO-Stuff YOLO; tiny-object YOLO; pre-filtering research; fine-tuning prep; pinhole reading; camera simulation; redo tilt experiment with known focal lengths; acceptance criterion; Blender tools; synthetic tomato dataset; diffusion models; photograph a plant from many angles; community-service farm visit; check public dataset; follow up Rajah (Ali); Roboflow plan; Dragon Mart contact; active PTZ scan strategy; top-down leafy imaging; self-hosted backend.
**Still open:** email submission to advisor (29 Oct, presumably done); **send Task 6 to advisor (4 Nov)**; **set up the PTZ camera on the bench** (PoE, RTSP/ISAPI stills, read PTZ position, presets); **measure pixels per fruit with the real camera** (30 mm ball at 0.5 m and 1 m, 1–4×); **test perspective correction with the real camera**; contact the greenhouse app team about the endpoint.

## 9. Simulator and synthetic data generator (1–2 Nov)
- **Simulator** (artifact, shared "anyone with the link"): https://claude.ai/artifact/85WtKK3gcPPh4so9ZpcZSm
  - Greenhouse picker: **Albatha rows (40 m)**, **University arch 1: fruit vegetables**, **University arch 2: leafy greens and herbs**; season date slider (1 Nov – 5 Jun) for the university arches — plants grow, flower, set fruit, ripen and get picked following the production plans; leafy beds cut and re-sown.
  - Hikvision mode (locked to the real camera) and Free-lens mode (any focal length 2.8–300 mm, f/1.4–f/22, sensor sizes, distortion, fixed exposure).
  - Views: **camera image** (angle of view, barrel distortion, depth of field + diffraction, vignetting), **straightened view** (homography of the row face/board, shades areas < 20 px per tomato, 0.5 m grid), **overview** (3D orbit with frustum and footprint).
  - Readouts: pixels across a 30 mm tomato (warning < 20 px), viewing angle, distance, angle of view, area covered, usable row length (≥ 20 px) and camera positions per row, sharp range, edge distortion; fruit table per crop (in frame / fully visible ≥ 50% / partly hidden / hidden / labelled / detectable); pinhole diagram.
  - "Show labels": solid green box = labelled and detectable; solid orange = labelled but < 20 px or blurred; dashed blue = < 30% visible, no label; red dot = fully hidden.
  - Test board: checkerboard, farm photo or your own photo at 0.3–6 m, turned up to 85° (recreates Meera's tilt test).
  - Bushy Albatha model: tomato side shoots arching into the walkway, ~0.2–0.35 m clear between leaf tips, lighter leaves with some yellowing/dry leaves, dappled shadows.
- **Dataset generator** (`Greenhouse_Dataset_Generator.html`, offline, run in Chrome/Edge on the RTX 5070 Ti PC): random Hikvision shots (walkways / central walkway, main aisle / paths between plots, high mounts 2.6–4 m), zoom range, max viewing angle, random sun/brightness/colour and sensor noise, **new greenhouse every N images** (plant shape, leaf density, yellowing, fruit amount, ripeness, and for university arches a random date in a chosen range). Writes `images/{train,val}`, `labels/{train,val}` (YOLO), `data.yaml`, `meta.csv` (camera settings per image), `README.txt` — to a folder (File System Access API) or 250-image zip parts.
- **Label rule:** each fruit rendered with and without leaves after lens distortion; **box if ≥ 30% of its pixels are visible and ≥ 8 px; box covers only the visible part**. Classes: **0 tomato (round + cherry), 1 cucumber, 2 capsicum, 3 zucchini**. Leafy arch → empty label files (negatives, off by default). Fallen fruit not modelled.
- Verified by rendering sample shots: boxes sit exactly on fruit for all 4 classes. Generator speed on a GPU: several images/s (software rendering here: ~30 s/image).
- Caveat: synthetic images look rendered — mix with hand-labelled farm photos and evaluate on real photos only.
- Assumptions: university arch gutter 2.6 m / ridge 4.2 m; Row A on one side of the central walkway; growth/fruit-set rates fitted to the plan dates, not measured.

## 10. Detection work
### 10.1 Zero-shot test (28–29 Oct)
10 farm phone photos (IMG_6770, 6773, 6779, 6785, 6786, 6787, 6789, 6790, 6791, 6792; 5 with fruit), 1280 px tiles / 256 overlap, class-agnostic NMS, CPU only (40–87 s per 12 MP photo). Pooled reference **52 fruit (43 tomato, 9 cucumber)** judged by eye (two pale leaf/bud boxes removed after Mohamed spotted one).

| Model | conf | found (of 52) | boxes that are fruit |
|---|---|---|---|
| RT-DETR-L | 0.10 / 0.15 / 0.25 / 0.40 | 96% / **83%** / 48% / 29% | 23% / **44%** / 76% / 88% |
| YOLO11m | 0.10 | 10% | 100% |
| YOLOE text prompts | 0.10 | 10% | 100% |
| YOLOE prompt-free | 0.10 | 17% | 50% |
At 0.15 RT-DETR made 54 wrong boxes (3 on fruit-free photos); at 0.25 none on fruit-free photos. Wrong boxes: yellow flowers, pale leaves, fallen fruit. A truss of 4 green tomatoes got one box. Hanging cucumbers missed by all. RT-DETR calls tomatoes "orange"/"apple"; YOLOE-PF calls them lime/tangerine/pear. **The 29 Oct deck shows RT-DETR only** (YOLO results removed at Mohamed's request).
**Plan presented:** label PTZ stills in Roboflow starting from the 52 checked boxes (COCO pre-labels made: 54 boxes, 5 photos) → pre-train on Laboro + TGTomato → fine-tune RT-DETR on ~300 stills per crop → compare with DINO-family models on the same test. Proposed label classes then: tomato_red, tomato_orange_yellow, tomato_green, cucumber, fallen_fruit, flower (the generator currently uses 4 crop classes).
### 10.2 Public datasets
Laboro Tomato (804 imgs, 9,777 boxes, big/little × 3 ripeness, CC BY-NC-SA); tomatOD (277, 2,418 fruit, 3 ripeness, CC BY-NC-SA); BUTom21 (293, RGB-D); TGTomato-Balanced (4,505, CC BY 4.0); Cherry Tomato Datasets (Mendeley 2024, 5 cherry types). None has cucumbers, fixed-camera views, or fruit tracked across views. Our data must add: PTZ slant views, same fruit across presets with IDs, hand counts incl. hidden fruit, yellow/orange cherry + cucumbers, UAE light/dust/IR night, negatives (fallen fruit, flowers).
### 10.3 Counting each object once (Khader's deck)
- Stage 1 (simulated Reolink at 100° in PANDORA 360° photos, 200 rooms, 4,868 objects): naive count +28% to +374% depending on overlap (+128% at 25%); lens correction (k1 −0.30, k2 0.09) + merge boxes by direction from the camera + drop boxes touching the still border + never merge two boxes from one still → −1.4% / 0.0% / +0.5% at 10/25/50% overlap (+59% at 25% if lens correction is skipped). Merge threshold 0.5 × object size; overlap ≥ one object wide.
- Stage 2 (WILDTRACK, 7 cameras, 9,518 people): naive +310.6%; merge by ground position at 50 cm = exact; one primary camera per 1 m cell = −1.0%. Pointing error: 0.1° → +0.4%, 0.5° → +5.5%.
- Greenhouse geometry: fruit in front of/behind the face plane land in the wrong cell on slanted views (10 cm depth: ±1.5 m trust → ~4% wrong cell, ±5 m → ~13%); plane at average fruit depth halves the error; aisle width is the key site number; row totals unaffected.
- Stage 3 next: bench test (Reolink RLC-823S1 and Hikvision DS-2DE2A404IW-DE3): read PTZ over ONVIF/ISAPI, preset repeatability (20 returns), checkerboard calibration per zoom step, fruit tray with known count. Code in Khader's repo under camera-calibration/.

## 11. Rejected / set-aside ideas log (keep)
| Idea | When | Why rejected | Still useful for |
|---|---|---|---|
| Drone (DJI Mini 4 Pro; Mini 3, Starling 2, ducted PX4) | 8 Oct | 1 m min focus needs ~1.2–1.3 m aisle (site ~0.4–0.6 m); angled flight saves little until ~60°+ where detail collapses; self-charging dock hard; batteries/props not 5-year hands-off | — |
| Holybro X500 PX4 custom drone | before 8 Oct | Too big; custom build to maintain | — |
| 360 cameras (Insta360 X5) fixed | 8–10 Oct | Rated ~40 °C; consumer/battery design; wider view doesn't add usable row (viewing-angle limit) | — |
| 4K / expensive fixed cameras | 11 Oct | 2 MP enough for counting; health deprioritised | Ripeness at distance |
| Plant-health imaging | 11 Oct | Not a farm priority | Future add-on |
| Fixed cameras for vines | 15 Oct | ~550–670 cameras (single coverage), ~600 lenses to clean, ~6–10 km cable, ~AED 130–190k; one view sees ≤ 69% of fruit | Low crops (top-down) |
| Rail per walkway (was leaning 15 Oct) | 23 Oct | Superseded by PTZ (custom machine, mechanics, needs pruned corridor); cost ~AED 42–53k for 8 rails | Alternative design chapter |
| One shared gantry | 15 Oct | Most mechanics; single point of failure; must clear 2.5–3 m wires under a low arched roof | Flat crops |
| Straight-down top view over vines | 15 Oct | Fruit under canopy; ~2.5 m to lowest fruit → 2–3 mm/px | Leafy rows, rafts |
| Angled cameras on a rail above rows (Mohamed's sketch) | 15 Oct | Lower face seen at 60–74° down; bushy tomatoes block below ~1.4 m | Strong fallback; rail never touches leaves |
| Battery carriage / brushed motor / synced flash / IR night | 11–15 Oct | Battery wear; brush wear; cheap IP cams can't sync flash; IR attracts insects → webs | — |
| Tensioned wire, floor rail, ground robot, cable robot (Spidercam) | 15 Oct | Sag/thermal tension; sand + trip hazard; soft sand + navigation; cables cross crop wires | Cheap pilot (wire) |
| Cross-rails between short plots (Mohamed's sketch) | 15 Oct | Grazing angles → ~15 cross-rails/30 m, ~22% planting area lost | Maps to customer plots |
| 10–20k artificial greenhouse in the lab | 29 Oct | Too expensive; Dragon Mart artificial plants instead | — |
| 3rd camera per row (~10k) | 29 Oct (advisor) | Accept ~20% error instead of chasing 100% | Re-open if real tests fail |
| Plain green colour pre-filter | 29 Oct | Judged not useful | Other filters under research |
| Pre-trained detectors as the final model | 29 Oct | RT-DETR-L 44% precision at 83% recall; YOLO/YOLOE ≤ 17% | Baseline |

Older cost analysis (15 Oct, ±30%): rail per walkway all-in ~AED 56–83k (pilot ~5–7k); angled above-row rails ~28–37k; fixed cameras ~131–158k; shared gantry ~26–45k; floor rail ~46–60k; cross-rails ~57–66k; ground robot ~17–29k; drone ~10–14k; cable robot ~8–15k; top-down fixed for low crops ~6–7k. Fixed-camera numbers: 2 MP at ~100° gives ~1.05 mm/px at 0.8 m (cherry tomato ≈ 29 px). Fixed side views count only visible fruit (one viewpoint ≤ 69% of sweet-pepper fruit; 4–5 viewpoints 86–90%; Hemming et al. 2014).

## 12. System design notes (report Tasks 4–5)
- Architecture: on-site pull-based server — snapshots via ISAPI/ONVIF per preset, storage (MinIO) + PostgreSQL, detector on GPU PC, results synced to the farm's app; cameras on an isolated VLAN with location-based names. Prototype backend: MQTT broker + web server + Node.js (or Node-RED). Storage estimate in the report: 1.3 TB over 5 years at 4 MP.
- Report state (29 Oct): camera DS-2DE2A404IWG1-E bought (Reolink as budget alternative); working layout 30 × 8 m with six rows (needs updating to 40 m / university arches); 2 cameras per row (~12) from the tilt test; ~20% row error target (NFR-2); fine-tuning + synthetic data decision; zero-shot and tilt results in Table 7.6.
- Business requirements: customers rent a whole plot (one leafy + one fruiting); app button "go to customer X's plot"; customers normally see saved images; images go to a farm server for analysis.
- 5-year hands-off reality: IP cameras last ~4–6 years; lenses collect dust/residue/webs; target = no routine work, self-monitoring, yearly service visit; IR LEDs off; lock white balance/exposure; count at harvest to calibrate visible-to-total.
- Vision pipeline (my part): detect + count (tiles at full resolution, e.g. SAHI); ripeness by colour (tomato, capsicum) and size (cucumber, zucchini); de-duplicate across presets on the row-face grid; validate against hand/harvest counts. Training on my RTX 5070 Ti PC (Windows); advisor mentioned an RTX 4090.

## 13. Files and links
**Artifacts (claude.ai):**
- Greenhouse PTZ Camera Simulator — https://claude.ai/artifact/85WtKK3gcPPh4so9ZpcZSm
- PTZ Progress – Advisor Meeting 29 Oct (Slides) — https://claude.ai/artifact/RM9kEcojfmJJK3MAoht48k
- Action List for 5 Nov (shared checklist) — https://claude.ai/artifact/4RRwz1WpvMG8Bkp1VeWNwF
- Advisor Meeting Summary, 22 Oct 2026 — https://claude.ai/artifact/SM8dyQn7Nz66Mto9qLhuUY
- Greenhouse Camera Options (15 Oct 3D options; drone/rail era) — https://claude.ai/artifact/Ga86G97YdXvYhoKaKEg642

**Project files (uploaded from the `490_Project_Files` pack; see its `00_INDEX.md`):** course schedule image; 22 Oct and 29 Oct meeting summaries + transcripts; both Hikvision datasheets; Meera's tilt test results; Khader's "Counting Each Object Once" deck (+PDF); final 29 Oct deck (+PDF); SDP report Tasks 1–5 (clean + tracked, 29 Oct); to-do list docx; university plot layout + fruit/leafy planting layouts + both yield workbooks + the email text; 11 farm photos (IMG_67xx) and Mohamed's side-view sketch (IMG_7452); RT-DETR result examples; simulator/generator screenshots.

**GitHub repo `greenhouse-ptz-vision`:** `simulator/` (src: core.js, sim_app.js, sim_shell.html, gen_app.js, gen_shell.html; build.py; dist: built simulator + generator; tests/render_check.py), `zero_shot/` (scripts + detections/clusters/judgements/scores + COCO pre-labels), `camera_math/` (ptz_coverage.py, camera_count_40m.py), `tools/` (deck, to-do, tracked-changes scripts), `docs/PROJECT_CONTEXT.md` (this file). Rebuild: `cd simulator && npm install && python build.py`.

## 14. Open questions / still to decide
- Correction email: confirm **40 m** arch length, width still 8 m, and **where the spare 6 m goes** (ends vs between plots); confirm 1 m walkways between plots.
- Is the university project greenhouse the same 40 × 8 m area as the farm's MVP patches, or separate from the Albatha production rows? Which one do the cameras go into first?
- **Cameras per row:** reconcile the team's 2/row (tilt test), my belief of 3/row, and the calculation (3/row needs ≥ ~1.2 m from the face at ≤ 80°). Recalculate for the university arches (1 m walkways, plot layout). Where exactly are cameras mounted (walkway, central walkway, above rows), and at what height?
- Acceptance criterion: confirm ~20% counting error with the advisor/farm; farm's answers to the error-tolerance questions (via Ali).
- Real camera results: bench setup, pixels per fruit, perspective correction, preset repeatability.
- Results of the "done" action-list items (DINOv3, CLIP detector, COCO-Stuff YOLO, tiny-object YOLO, slicing, redone tilt test, synthetic dataset check).
- Label classes for the real dataset (crop-level vs ripeness classes; fallen fruit/flowers as negatives).
- Leafy plots: top-down weight/volume estimation method.
- Update the SDP report layout chapter to 40 m / university arches; Task 6 testing plan + CMP 491 plan due 4 Nov.

## 15. Starter message for a new chat
"I'm continuing the 490 Gardening Project (PTZ fruit counting). Read PROJECT_CONTEXT.md and the project files first. Today I want to …"
