// Advisor deck, 29 Oct: pre-trained detectors and the case for our own model
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/4b2c4d98-083f-4c21-bf3d-bd1773d037cd_71325cad-46f0-4641-aa33-332d2dbf8a27/pptx/scripts/apply_theme.js");
const path = require("path");
const IMG = (f) => path.join(__dirname, "img", f);

const THEME = {
  name: "Greenhouse",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "17241C", lt1: "F5F3EC", dk2: "3F4A43", lt2: "E9EDE6",
    accent1: "9E3B22", accent2: "1BAF7A", accent3: "EB6834", accent4: "5A655E",
    accent5: "24372B", accent6: "C9D3CB", hlink: "2A78D6", folHlink: "6250D6",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Pre-trained detectors – Advisor Meeting 29 Oct";
pres.author = "Mohamed Alzarooni";
const C = pres.SchemeColor;

const M = 0.6; // side margin
const W = 13.333 - 2 * M;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "Light content",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.45, w: W, h: 0.9, fontFace: "Cambria", fontSize: 32, bold: true, color: C.text1, valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "footer", type: "body", x: M, y: 6.9, w: W - 0.6, h: 0.3, fontSize: 11, color: C.accent4, margin: 0, valign: "middle" }, text: "" } },
  ],
  slideNumber: { x: 13.333 - M - 0.4, y: 6.9, w: 0.4, h: 0.3, fontSize: 11, color: HEX.accent4, align: "right" },
});
pres.defineSlideMaster({
  title: "Dark content",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.45, w: W, h: 0.9, fontFace: "Cambria", fontSize: 32, bold: true, color: C.background1, valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "footer", type: "body", x: M, y: 6.9, w: W - 0.6, h: 0.3, fontSize: 11, color: C.accent6, margin: 0, valign: "middle" }, text: "" } },
  ],
  slideNumber: { x: 13.333 - M - 0.4, y: 6.9, w: 0.4, h: 0.3, fontSize: 11, color: HEX.accent6, align: "right" },
});
pres.defineSlideMaster({ title: "Cover", background: { color: C.text1 }, objects: [] });

const tableOpts = (colW, y, extra = {}) => ({
  x: M, y, w: colW.reduce((a, b) => a + b, 0), colW, fontFace: "Calibri", fontSize: 13, color: HEX.dk1,
  border: { type: "solid", pt: 0.75, color: "C9C6BD" }, margin: [0.05, 0.08, 0.05, 0.08], valign: "middle", ...extra,
});
const th = (t) => ({ text: t, options: { bold: true, fill: { color: "E3E0D6" } } });
const shaded = (cells, fill) => cells.map((t) => ({ text: t, options: { fill: { color: fill } } }));

// ---------- 1. cover ----------
pres.addSection({ title: "Intro" });
let s = pres.addSlide({ masterName: "Cover", sectionTitle: "Intro" });
s.addImage({ path: IMG("cover.jpg"), x: 7.1, y: 0, w: 6.233, h: 7.5, sizing: { type: "cover", w: 6.233, h: 7.5 }, altText: "Inside the soil greenhouse: rows of vine crops under the arched roof", objectName: "Cover photo" });
s.addText("490 GARDENING PROJECT · ADVISOR MEETING", { x: M, y: 1.7, w: 6.1, h: 0.4, fontSize: 14, bold: true, color: C.accent3, charSpacing: 1, margin: 0, isTextBox: true, objectName: "Eyebrow" });
s.addText("A pre-trained detector on our greenhouse photos", { x: M, y: 2.2, w: 6.1, h: 2.2, fontFace: "Cambria", fontSize: 38, bold: true, color: C.background1, valign: "top", margin: 0, isTextBox: true, objectName: "Cover title" });
s.addText("How many fruit it finds, and why we need our own detection model", { x: M, y: 4.6, w: 6.1, h: 0.9, fontSize: 20, color: C.accent6, valign: "top", margin: 0, isTextBox: true, objectName: "Cover subtitle" });
s.addText("29 Oct 2026 · CV part: Mohamed Alzarooni", { x: M, y: 5.75, w: 6.1, h: 0.4, fontSize: 14, color: C.accent6, margin: 0, isTextBox: true, objectName: "Cover byline" });
s.addNotes("This week we ran a ready-made detector, RT-DETR, on our own greenhouse photos and measured how many fruit it finds. The short answer: it finds most fruit but also boxes flowers and leaves, gives no ripeness and misses cucumbers, so we need to train our own detection model.");

// ---------- 2. status ----------
s = pres.addSlide({ masterName: "Light content", sectionTitle: "Intro" });
s.addText("The 22 Oct action list: 4 done, 2 in progress", { placeholder: "title" });
const G = "E9EDE6";
s.addTable([
  [th("Action item"), th("Status"), th("What we have")],
  ["Write the PTZ camera spec", "Done", "DS-2DE2A404IWG1-E checked against it (slide 3)"],
  ["Run pre-trained detectors zero-shot", "Done", "RT-DETR on 10 greenhouse photos (slides 4–7)"],
  ["Review public ripe/unripe tomato data", "Done", "5 datasets + what ours must add (slides 8–9)"],
  ["Do the coverage math", "Done", "Zoom, presets and cameras per walkway (backup)"],
  shaded(["Set up Roboflow auto-labelling", "Started", "COCO JSON pre-labels: 52 checked boxes"], G),
  shaded(["Mount, photograph, measure coverage", "Planned", "Field-test steps ready for the visit"], G),
], tableOpts([4.2, 1.6, 6.3], 1.55, { fontSize: 15, rowH: 0.55 }));
s.addText("Shaded rows need the camera or a farm visit.", { placeholder: "footer" });
s.addNotes("Four of the desk items are done. Roboflow is started with checked pre-labels, and the field test waits for the camera and a visit.");

// ---------- 3. camera ----------
s = pres.addSlide({ masterName: "Light content", sectionTitle: "Intro" });
s.addText("Hikvision DS-2DE2A404IWG1-E meets the spec except Wi-Fi", { placeholder: "title" });
s.addTable([
  [th("Spec item"), th("Datasheet"), th("Meets it?")],
  ["Network camera", "IP camera, RJ45, PoE (802.3af) or 12 V DC, 9.2 W max", "Yes"],
  ["Protocol to pull video", "RTSP, ONVIF Profile S/G/T, ISAPI; H.264/H.265", "Yes"],
  ["Reports pan/tilt/zoom", "PTZ status, 3D positioning, 300 presets, power-off memory", "Yes; check on the bench"],
  shaded(["Wireless preferred", "No Wi-Fi", "No: one PoE cable each"], "F3DDD3"),
  ["Optical zoom", "4× (2.8–12 mm); HFOV 99.4° to 32.8°", "Yes"],
  ["Resolution", "2560 × 1440 (4 MP), 25–30 fps", "Yes"],
  ["Pan / tilt range", "Pan 0–355°, tilt 0–90° (looks down only)", "Yes, if mounted high"],
  ["Greenhouse climate", "IP66, −20 to 60 °C, humidity ≤ 90% non-condensing", "Yes: greenhouse runs 10–60 °C"],
], tableOpts([2.9, 6.0, 3.2], 1.55, { fontSize: 14, rowH: 0.5 }));
s.addText("Source: Hikvision DS-2DE2A404IWG1-E datasheet. Shaded row needs a design answer.", { placeholder: "footer" });
s.addNotes("The camera meets the three must-haves: network camera, RTSP and ONVIF, and it keeps presets and reports its position. The only miss is Wi-Fi; the advisors already said a wired PoE run along the top is fine.");

// ---------- 4. setup ----------
pres.addSection({ title: "Pre-trained model" });
s = pres.addSlide({ masterName: "Light content", sectionTitle: "Pre-trained model" });
s.addText("Zero-shot test: a ready-made detector, no training", { placeholder: "title" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.55, w: 7.7, h: 3.05, fill: { color: C.background2 }, rectRadius: 0.12, line: { type: "none" }, objectName: "Model card" });
s.addText([
  { text: "RT-DETR-L", options: { fontFace: "Cambria", bold: true, fontSize: 26, color: C.accent1, breakLine: true } },
  { text: "DETR-type (transformer) detector, trained on COCO", options: { fontSize: 16, color: C.text1, breakLine: true } },
  { text: "COCO has no tomato or cucumber class, so we kept its fruit-like classes: apple, orange, sports ball, banana.", options: { fontSize: 16, color: C.text2 } },
], { x: M + 0.35, y: 1.8, w: 7.0, h: 2.6, valign: "top", paraSpaceAfter: 10, margin: 0, isTextBox: true, objectName: "Model text" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y: 1.55, w: 3.98, h: 3.05, fill: { color: C.background2 }, rectRadius: 0.12, line: { type: "none" }, objectName: "Method card" });
s.addText([
  { text: "How we scored", options: { bold: true, fontSize: 16, breakLine: true } },
  { text: "10 phone photos: 5 with fruit, 5 without", options: { bullet: true, breakLine: true } },
  { text: "Each cut into 1280 px tiles", options: { bullet: true, breakLine: true } },
  { text: "Every box judged by eye: fruit or not", options: { bullet: true, breakLine: true } },
  { text: "Detection rate = share of the 52 fruit it finds", options: { bullet: true } },
], { x: 9.0, y: 1.75, w: 3.5, h: 2.7, fontSize: 14, color: C.text2, valign: "top", paraSpaceAfter: 6, margin: 0, isTextBox: true, objectName: "Method text" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.0, w: W, h: 1.0, fill: { color: C.text1 }, rectRadius: 0.12, line: { type: "none" }, objectName: "Next callout" });
s.addText("Next: test Grounding DINO, OWLv2 and DINOv2 on the team PC, then build our own fine-tuned model.", { x: M + 0.35, y: 5.0, w: W - 0.7, h: 1.0, fontSize: 18, color: C.background1, valign: "middle", margin: 0, isTextBox: true, objectName: "Next text" });
s.addText("Run on CPU in our cloud workspace; no greenhouse image was used to train it.", { placeholder: "footer" });
s.addNotes("RT-DETR is the DETR-type model the advisors suggested. It has never seen a greenhouse image, so this measures how far an off-the-shelf detector gets on our photos. Grounding DINO, OWLv2 and DINOv2 could not be downloaded in our cloud workspace, so they run next on the team PC.");

// ---------- 5. detection rate ----------
s = pres.addSlide({ masterName: "Light content", sectionTitle: "Pre-trained model" });
s.addText("RT-DETR finds 83% of the fruit, with many wrong boxes", { placeholder: "title" });
s.addChart(pres.charts.BAR, [
  { name: "Fruit found (detection rate)", labels: ["0.10", "0.15", "0.25", "0.40"], values: [96, 83, 48, 29] },
  { name: "Boxes that are fruit", labels: ["0.10", "0.15", "0.25", "0.40"], values: [23, 44, 76, 88] },
], {
  x: M, y: 1.45, w: 7.6, h: 5.15, barDir: "col", barGrouping: "clustered",
  chartColors: [HEX.accent2, HEX.accent3], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0"%"',
  dataLabelFontSize: 14, dataLabelColor: HEX.dk1, dataLabelFontFace: "+mn-lt",
  valAxisMinVal: 0, valAxisMaxVal: 100, valAxisLabelFormatCode: '0"%"', valAxisLabelColor: HEX.accent4, valAxisLabelFontSize: 12, valAxisLabelFontFace: "+mn-lt",
  catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 14, catAxisLabelFontFace: "+mn-lt",
  showCatAxisTitle: true, catAxisTitle: "Confidence threshold", catAxisTitleColor: HEX.dk2, catAxisTitleFontSize: 13, catAxisTitleFontFace: "+mn-lt",
  valGridLine: { color: "DDDAD2", size: 0.75 }, catGridLine: { style: "none" },
  showLegend: true, legendPos: "t", legendFontSize: 13, legendColor: HEX.dk1, legendFontFace: "+mn-lt", barGapWidthPct: 70,
  objectName: "Detection rate chart",
});
s.addText([
  { text: "83%", options: { fontFace: "Cambria", fontSize: 60, bold: true, color: C.accent1, breakLine: true } },
  { text: "of the fruit found (43 of 52) at confidence 0.15", options: { fontSize: 16, color: C.text1, breakLine: true } },
  { text: "but only 44% of its boxes are fruit: 54 wrong", options: { fontSize: 16, color: C.text2 } },
], { x: 8.6, y: 1.55, w: 4.13, h: 2.2, valign: "top", margin: 0, isTextBox: true, objectName: "RT-DETR stat" });
s.addText([
  { text: "Raising the threshold removes wrong boxes but loses fruit: ", options: { bold: true } },
  { text: "at 0.25 it finds only 25 of 52 (48%), with no boxes on the fruit-free photos." },
], { x: 8.6, y: 4.1, w: 4.13, h: 1.6, fontSize: 16, color: C.text2, valign: "top", margin: 0, isTextBox: true, objectName: "Threshold note" });
s.addText("52 fruit checked by eye across our photos (43 tomatoes, 9 cucumbers).", { placeholder: "footer" });
s.addNotes("Detection rate is the share of the 52 checked fruit RT-DETR puts a box on. No threshold gives both: at 0.15 it finds most fruit but more than half its boxes are wrong; at 0.40 most boxes are right but it finds under a third of the fruit. The 52 fruit were pooled from all detector boxes we checked, so the detection rate is an upper bound; in the close tomato photo the pool held 35 fruit against a rough eye count of 35 to 38.");

// ---------- 6. visual ----------
s = pres.addSlide({ masterName: "Dark content", sectionTitle: "Pre-trained model" });
s.addText("What RT-DETR sees in the tomato walkway", { placeholder: "title" });
const vh = 5.35, vw = vh * (562 / 1000);
s.addImage({ path: IMG("ov_rtdetr-l.jpg"), x: M, y: 1.35, w: vw, h: vh, altText: "Left half of the tomato walkway photo with RT-DETR boxes: 12 real fruit boxed in green and 4 wrong boxes in orange, including a pale leaf", objectName: "RT-DETR tomato panel" });
const callouts = [
  ["12 fruit, 4 wrong", "in this part of the photo, at confidence 0.15"],
  ["Small green fruit found", "even ones only ~20 px wide"],
  ["One box for four tomatoes", "the truss at the top left counts as one"],
  ["A pale leaf boxed as fruit", "orange box at the top right"],
];
callouts.forEach(([h, b], i) => {
  s.addText([{ text: h, options: { bold: true, fontSize: 20, color: C.background1, breakLine: true } }, { text: b, options: { fontSize: 16, color: C.accent6 } }],
    { x: 4.4, y: 1.5 + i * 1.3, w: 8.33, h: 1.1, valign: "top", margin: 0, isTextBox: true, objectName: `Callout ${i + 1}` });
});
s.addText("Green box = real fruit; orange box = wrong. IMG_6787, confidence 0.15.", { placeholder: "footer" });
s.addNotes("This is the upper-left part of the tomato walkway photo. RT-DETR boxes most visible fruit, including small green ones, but also leaves and a pale yellow-green leaf curl that looks like a fruit. The top-left truss of four green tomatoes gets one big box.");

// ---------- 7. why our own model ----------
s = pres.addSlide({ masterName: "Light content", sectionTitle: "Pre-trained model" });
s.addText("Why we need our own detection model", { placeholder: "title" });
const reasons = [
  ["Flowers look like fruit", "Most of the 54 wrong boxes are yellow flowers, pale leaves and fallen fruit."],
  ["No ripeness", "Tomatoes come out as “orange” or “apple”, never ripe or unripe."],
  ["Touching fruit merge", "A truss of four green tomatoes became one box, so it counts as one."],
  ["Cucumbers missed", "Green on green: RT-DETR missed clearly visible cucumbers (right)."],
];
reasons.forEach(([h, b], i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = M + col * 4.45, y = 1.55 + row * 2.35;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.2, h: 2.1, fill: { color: C.background2 }, rectRadius: 0.12, line: { type: "none" }, objectName: `Reason card ${i + 1}` });
  s.addText([{ text: h, options: { bold: true, fontSize: 18, color: C.accent1, breakLine: true } }, { text: b, options: { fontSize: 15, color: C.text2 } }], { x: x + 0.3, y: y + 0.25, w: 3.6, h: 1.6, valign: "top", paraSpaceAfter: 6, margin: 0, isTextBox: true, objectName: `Reason text ${i + 1}` });
});
s.addImage({ path: IMG("cuc_rtdetr.jpg"), x: 9.6, y: 1.55, w: 3.13, h: 4.45, sizing: { type: "cover", w: 3.13, h: 4.45 }, altText: "Cucumber walkway crop with RT-DETR boxes: two small wrong boxes, while the dark hanging cucumber in the centre has no box", objectName: "Cucumber miss" });
s.addText("RT-DETR names fruit with COCO classes, so ripeness needs classes of our own.", { placeholder: "footer" });
s.addNotes("RT-DETR already puts boxes on most tomatoes without seeing a greenhouse image, so fine-tuning it on our own labelled stills is realistic. What it lacks — telling flowers from fruit, ripeness, separate boxes per fruit, and cucumbers — only our own data can teach.");

// ---------- 8. datasets ----------
pres.addSection({ title: "Our own model" });
s = pres.addSlide({ masterName: "Light content", sectionTitle: "Our own model" });
s.addText("Public tomato data to start our model from", { placeholder: "title" });
s.addTable([
  [th("Dataset"), th("Size"), th("Classes"), th("Setting"), th("Licence · for us")],
  ["Laboro Tomato", "804 images, 9,777 boxes", "big / little (cherry) × ripe, half-ripe, green", "Farm greenhouse, close-ups, masks", "CC BY-NC-SA · best match"],
  ["tomatOD", "277 images, 2,418 fruit", "unripe, semi-ripe, fully ripe", "Greenhouse, COCO format", "CC BY-NC-SA · test set"],
  ["BUTom21", "293 images", "red, green, orange + 2 mixed", "Greenhouse rows, colour + depth", "Research · has orange"],
  ["TGTomato", "4,505 images", "mature, raw tomato, stem", "China 2022, phones, many angles", "CC BY 4.0 · biggest"],
  ["Cherry Tomato", "Detection + keypoints", "5 cherry-tomato types", "Greenhouse, 2024", "Mendeley · cherry types"],
], tableOpts([1.9, 2.2, 3.1, 2.6, 2.33], 1.55, { fontSize: 13, rowH: 0.62 }));
s.addText([{ text: "Gap: ", options: { bold: true } }, { text: "no cucumbers, no fixed camera, no fruit tracked across views. Good for pre-training and ripeness, not for testing our count." }],
  { x: M, y: 5.6, w: W, h: 0.6, fontSize: 16, color: C.text1, margin: 0, isTextBox: true, objectName: "Gap line" });
s.addText("Sources: LaboroTomato and tomatOD GitHub READMEs; bonndata.uni-bonn.de (BUTom21); data.mendeley.com 344hxx5rkf, ffgp73gfsr.", { placeholder: "footer" });
s.addNotes("Laboro is the best starting point: it separates cherry from big tomatoes and has three ripeness stages. Its non-commercial licence matters if the farm uses the system commercially; TGTomato's CC BY licence does not have that problem.");

// ---------- 9. plan ----------
s = pres.addSlide({ masterName: "Light content", sectionTitle: "Our own model" });
s.addText("Our own detection model: what we add and how we build it", { placeholder: "title" });
s.addText("Our data must add", { x: M, y: 1.5, w: 5.8, h: 0.45, fontSize: 20, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: "Add heading" });
s.addText([
  { text: "Our viewpoint: ", options: { bold: true } }, { text: "PTZ at ~2.2 m, looking down and along the row", options: { breakLine: true } },
  { text: "Our crops: ", options: { bold: true } }, { text: "yellow and orange cherry tomatoes, and cucumbers", options: { breakLine: true } },
  { text: "Things not to count: ", options: { bold: true } }, { text: "flowers, pale leaves, fallen fruit", options: { breakLine: true } },
  { text: "True counts: ", options: { bold: true } }, { text: "hand-counted 2 m sections, hidden fruit included", options: { breakLine: true } },
  { text: "Our conditions: ", options: { bold: true } }, { text: "UAE sun through film, dust, IR night images" },
], { x: M, y: 2.05, w: 5.8, h: 3.6, fontSize: 16, color: C.text2, valign: "top", paraSpaceAfter: 12, margin: 0, isTextBox: true, objectName: "Add list" });
const steps = [
  ["1", "Label PTZ stills in Roboflow, starting from our 52 checked boxes"],
  ["2", "Pre-train on Laboro and TGTomato"],
  ["3", "Fine-tune RT-DETR on ~300 of our stills per crop"],
  ["4", "Compare with Grounding DINO, OWLv2 and DINOv2 on the same test"],
];
steps.forEach(([n, t], i) => {
  const y = 1.5 + i * 1.12;
  s.addShape(pres.shapes.OVAL, { x: 7.1, y: y + 0.12, w: 0.62, h: 0.62, fill: { color: C.text1 }, line: { type: "none" }, objectName: `Step dot ${n}` });
  s.addText(n, { x: 7.1, y: y + 0.12, w: 0.62, h: 0.62, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Step number ${n}` });
  s.addText(t, { x: 7.95, y, w: 4.78, h: 0.86, fontSize: 16, color: C.text1, valign: "middle", margin: 0, isTextBox: true, objectName: `Step text ${n}` });
});
s.addText("Success test: our model beats RT-DETR’s 83% detection rate with far fewer wrong boxes.", { placeholder: "footer" });
s.addNotes("The public sets give us a head start on tomatoes and ripeness; our own PTZ stills teach the model our viewpoint, our cultivars, cucumbers, and what not to count. We measure the new model on the same checked fruit so the comparison with the pre-trained models is fair.");

(async () => {
  const out = path.join(__dirname, "PTZ_Progress_Advisor_Meeting_29_Oct.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
