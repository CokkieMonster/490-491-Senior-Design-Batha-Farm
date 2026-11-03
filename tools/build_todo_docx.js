// Word version of the 5 Nov action list (from the 29 Oct advisor meeting)
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, HeadingLevel, Footer, PageNumber } = require("docx");

const SEED = path.join(__dirname, "seed");
const SKIP = new Set(["t01", "t24", "t29", "t30"]);
const GROUPS = [
  ["report", "Report"],
  ["camera", "PTZ camera", "The advisors want to see pixel results from the real camera at the next meeting."],
  ["models", "Detection models"],
  ["optics", "Tilt experiment and camera optics"],
  ["synthetic", "Synthetic data (priority)"],
  ["farm", "Real data and farm"],
  ["lab", "Lab test plants"],
  ["capture", "Capture strategy and leafy crops"],
];

const tasks = fs.readdirSync(SEED).filter((f) => f.endsWith(".json"))
  .map((f) => ({ id: f.slice(0, -5), ...JSON.parse(fs.readFileSync(path.join(SEED, f), "utf8")) }))
  .filter((t) => !SKIP.has(t.id))
  .sort((a, b) => a.order - b.order);

const INK = "15231A", MUTED = "56645B", LEAF = "2F7A4F", LINE = "C9D3CB", HEAD = "E1EEE5";
const W = [500, 5900, 1450, 1500]; // DXA column widths (A4 text width 9350)
const TW = W.reduce((a, b) => a + b, 0);
const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
const margins = { top: 90, bottom: 90, left: 110, right: 110 };

const cell = (children, w, fill) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders, margins,
  shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined,
  children,
});
const p = (runs, opts = {}) => new Paragraph({ spacing: { after: 0 }, ...opts, children: runs });

const headerRow = new TableRow({
  tableHeader: true,
  children: ["", "Task", "Due", "Owner"].map((h, i) => cell([p([new TextRun({ text: h, bold: true, size: 20, color: INK })])], W[i], HEAD)),
});

const children = [
  new Paragraph({ children: [new TextRun({ text: "490 GARDENING PROJECT · FROM THE 29 OCT ADVISOR MEETING", size: 18, color: LEAF, bold: true })], spacing: { after: 60 } }),
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: "To-do list before the 5 Nov meeting" })] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Everything the advisors asked for, grouped by area. Put your name in the Owner column for the tasks you take, and tick the box when it’s done.", color: MUTED })] }),
];

let n = 0;
for (const [key, label, note] of GROUPS) {
  const items = tasks.filter((t) => t.group === key);
  if (!items.length) continue;
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: label })] }));
  if (note) children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: note, italics: true, color: MUTED, size: 20 })] }));
  const rows = [headerRow];
  for (const t of items) {
    n += 1;
    rows.push(new TableRow({
      cantSplit: true,
      children: [
        cell([p([new TextRun({ text: "☐", size: 24 })], { alignment: AlignmentType.CENTER })], W[0]),
        cell([
          p([new TextRun({ text: `${n}. ${t.title}`, bold: true, size: 21, color: INK })], { spacing: { after: 40 } }),
          p([new TextRun({ text: t.detail, size: 20, color: MUTED })]),
        ], W[1]),
        cell([p([new TextRun({ text: t.due, size: 20, color: INK })])], W[2]),
        cell([p([new TextRun({ text: t.owner || "", size: 20, color: INK })])], W[3]),
      ],
    }));
  }
  children.push(new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: W, rows }));
}

const doc = new Document({
  creator: "Mohamed Alzarooni",
  title: "To-do list before the 5 Nov meeting",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: "Cambria", size: 44, bold: true, color: INK }, paragraph: { spacing: { after: 120 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Cambria", size: 28, bold: true, color: LEAF }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0, keepNext: true } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Page ", size: 18, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTED })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "To-do_list_before_5_Nov_meeting.docx");
  fs.writeFileSync(out, buf);
  console.log("wrote", out, "tasks:", n);
});
