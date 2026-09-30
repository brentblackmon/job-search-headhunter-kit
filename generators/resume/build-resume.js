#!/usr/bin/env node
// Builds an ATS-safe resume (.docx + PDF) from resume.json, then runs layout QA.
//
// Usage:
//   node build-resume.js --data resume.json [--tailor tailor.json] --out out/First_Last_Resume_Company [--pages 2]
//
// Format rules (see plugin/skills/resume-builder/SKILL.md):
//   single column, no tables, no text boxes, nothing in header or footer,
//   Arial, navy accent 1A2B4A.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  LevelFormat, ShadingType, TabStopType,
} = require("docx");

const NAVY = "1A2B4A";
const TINT = "E6EAF1";
const FONT = "Arial";
const PAGE_WIDTH_TWIPS = 12240;
const MARGIN = 720; // 0.5 inch
const RIGHT_TAB = PAGE_WIDTH_TWIPS - MARGIN * 2;

// ---------- args ----------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key.slice(2)] = true;
    else { args[key.slice(2)] = next; i++; }
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.data || !args.out) {
  console.error("Usage: node build-resume.js --data resume.json [--tailor tailor.json] --out out/Name [--pages 2]");
  process.exit(2);
}
const targetPages = parseInt(args.pages || "2", 10);

// ---------- data ----------
const data = JSON.parse(fs.readFileSync(args.data, "utf8"));
const changes = [];
if (args.tailor) {
  const t = JSON.parse(fs.readFileSync(args.tailor, "utf8"));
  if (t.headline) { changes.push(["headline", data.headline, t.headline]); data.headline = t.headline; }
  if (t.summary1) { changes.push(["summary[0]", data.summary[0], t.summary1]); data.summary[0] = t.summary1; }
  // Anything beyond headline and summary1 must be explicit and is reported.
  for (const key of ["summary2", "achievements", "competencies", "stats"]) {
    if (t[key] === undefined) continue;
    const field = key === "summary2" ? "summary[1]" : key;
    if (key === "summary2") data.summary[1] = t[key]; else data[key] = t[key];
    changes.push([field, "(master)", "(tailored)"]);
  }
}

// ---------- building blocks ----------
const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: 21, ...opts });

function heading(text) {
  return new Paragraph({
    keepNext: true,
    keepLines: true,
    spacing: { before: 160, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 2 } },
    children: [run(text.toUpperCase(), { bold: true, size: 21, color: NAVY, characterSpacing: 20 })],
  });
}

function bullet(text, keepNext = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    keepLines: true,
    keepNext,
    spacing: { after: 40 },
    children: [run(text)],
  });
}

function body(text, opts = {}) {
  return new Paragraph({ spacing: { after: 80 }, keepLines: true, ...opts, children: [run(text)] });
}

// ---------- document ----------
const children = [];

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 20 },
  children: [run(data.name, { bold: true, size: 40, color: NAVY })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 40 },
  children: [run(data.headline, { bold: true, size: 22 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [run(data.contact.join("  |  "), { size: 18 })],
}));

// Shaded stat line: a single paragraph (not a table) so ATS parsers read it as text.
const statRuns = [];
data.stats.forEach((s, i) => {
  if (i > 0) statRuns.push(run("   |   ", { size: 19, color: NAVY }));
  statRuns.push(run(s.value, { bold: true, size: 20, color: NAVY }));
  statRuns.push(run(" " + s.label, { size: 18 }));
});
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  shading: { type: ShadingType.CLEAR, color: "auto", fill: TINT },
  spacing: { before: 0, after: 120 },
  border: {
    top: { style: BorderStyle.SINGLE, size: 4, color: TINT, space: 4 },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: TINT, space: 4 },
  },
  children: statRuns,
}));

children.push(heading("Summary"));
data.summary.forEach((p) => children.push(body(p)));

children.push(heading("Key Achievements"));
data.achievements.forEach((a) => children.push(bullet(a)));

children.push(heading("Core Competencies"));
// Non-breaking spaces keep each term on one line.
children.push(body(data.competencies.map((c) => c.replace(/ /g, "\u00A0")).join("  |  ")));

children.push(heading("Experience"));
data.experience.forEach((job) => {
  children.push(new Paragraph({
    keepNext: true,
    keepLines: true,
    spacing: { before: 100, after: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    children: [
      run(job.company, { bold: true, size: 21, color: NAVY }),
      run(", " + job.location, { size: 20 }),
      run("\t" + job.dates, { size: 19 }),
    ],
  }));
  job.roles.forEach((r) => {
    children.push(new Paragraph({
      keepNext: true,
      keepLines: true,
      spacing: { after: 0 },
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      children: [
        run(r.title, { bold: true, italics: true }),
        ...(job.roles.length > 1 ? [run("\t" + r.dates, { italics: true, size: 18 })] : []),
      ],
    }));
  });
  if (job.blurb) {
    children.push(new Paragraph({
      keepNext: true,
      spacing: { after: 40 },
      children: [run(job.blurb, { italics: true, size: 18, color: "444444" })],
    }));
  }
  // Keep the first bullet with the job header so a header never sits alone.
  job.bullets.forEach((b, i) => children.push(bullet(b, i === 0)));
});

children.push(heading("Education and Certifications"));
data.education.forEach((e) => children.push(body(e, { spacing: { after: 20 } })));

const doc = new Document({
  creator: data.name,
  title: `${data.name} Resume`,
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 300, hanging: 220 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH_TWIPS, height: 15840 },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    // No headers or footers: ATS parsers often skip them.
    children,
  }],
});

// ---------- write + convert ----------
async function main() {
  const outBase = path.resolve(args.out);
  const outDir = path.dirname(outBase);
  fs.mkdirSync(outDir, { recursive: true });
  const docxPath = outBase + ".docx";
  const pdfPath = outBase + ".pdf";

  fs.writeFileSync(docxPath, await Packer.toBuffer(doc));
  console.log("Wrote " + docxPath);

  execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", outDir, docxPath], { stdio: "pipe" });
  if (!fs.existsSync(pdfPath)) throw new Error("PDF conversion failed. Is LibreOffice installed (soffice on PATH)?");
  console.log("Wrote " + pdfPath);

  if (changes.length) {
    console.log("\nTailoring changes:");
    changes.forEach(([f, from, to]) => console.log(`  ${f}\n    was: ${from}\n    now: ${to}`));
  }

  const ok = require("./qa").runQa({ pdfPath, targetPages, data });
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
