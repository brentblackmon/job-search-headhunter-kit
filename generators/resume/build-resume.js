#!/usr/bin/env node
// Builds an ATS-safe resume (.docx + PDF) from resume.json, then runs layout QA.
//
// Usage:
//   node build-resume.js --data resume.json [--tailor tailor.json] --out out/First_Last_Resume_Company [--pages 2] [--paper a4|letter]
//
// Paper: --paper wins, then resume.json "paper", then the contact location. US and Canada
// get Letter; everywhere else gets A4. Margins and layout are the same on both.
//
// Locked layout (matches the kit's reference resume):
//   US Letter or A4, 0.625in side margins, Arial, navy 1A2B4A, ink 1A1A1A, gray 666666.
//   Name, headline, contact line with live links, navy rule, shaded stat line with a
//   navy bar, then SUMMARY, KEY ACHIEVEMENTS, CORE COMPETENCIES, PROFESSIONAL
//   EXPERIENCE, EDUCATION AND CERTIFICATIONS. Single column. No tables, text boxes,
//   images, headers or footers, so applicant tracking systems read it in order.
//
// resume.json shape (see sample-data/resume.json):
//   name, headline ("TARGET TITLE | theme, theme"), contact [location, phone, email, linkedin],
//   stats [4 x {value, label}], summary [2 paragraphs],
//   achievements [{lead, text}] (a plain string also works),
//   competencies [terms],
//   experience [{company, location, blurb?, mandate?, roles: [{title, dates, blurb?, mandate?, bullets: [...]}]}],
//   education [lines]
//   Older files with job-level "bullets" and "dates" still work.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, AlignmentType, BorderStyle,
  LevelFormat, ShadingType, TabStopType,
} = require("docx");

const NAVY = "1A2B4A";
const INK = "1A1A1A";
const GRAY = "666666";
const SEP = "9AA3B8";
const TINT = "F3F5FA";
const FONT = "Arial";
const PAPER = {
  letter: { w: 12240, h: 15840 }, // 8.5 x 11in in twips
  a4: { w: 11906, h: 16838 },     // 210 x 297mm in twips
};
const SIDE = 900;                // 0.625in
const TOP = 720;                 // 0.5in
const LINE = 270;                // 13.5pt line height for 10pt body text

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
  console.error("Usage: node build-resume.js --data resume.json [--tailor tailor.json] --out out/Name [--pages 2] [--paper a4|letter]");
  process.exit(2);
}
const targetPages = parseInt(args.pages || "2", 10);

// ---------- data ----------
const data = JSON.parse(fs.readFileSync(args.data, "utf8"));

// ---------- paper ----------
// US states, DC, and Canadian provinces and territories, as two-letter codes.
const NA_CODES = new Set(("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC " +
  "AB BC MB NB NL NS NT NU ON PE QC SK YT").split(" "));
function paperFor(location) {
  const loc = String(location || "");
  if (/\b(USA|U\.S\.A?\.?|United States|Canada)\b/i.test(loc)) return "letter";
  const code = (loc.match(/,\s*([A-Za-z]{2})\s*$/) || [])[1];
  if (code && NA_CODES.has(code.toUpperCase())) return "letter";
  return loc.trim() ? "a4" : "letter";
}
const paper = String(args.paper || data.paper || paperFor((data.contact || [])[0])).toLowerCase();
if (!PAPER[paper]) {
  console.error(`Unknown --paper "${paper}". Use a4 or letter.`);
  process.exit(2);
}
const PAGE_W = PAPER[paper].w;
const PAGE_H = PAPER[paper].h;
const RIGHT_TAB = PAGE_W - SIDE * 2;
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

// Normalize experience: every job gets roles[], every role gets bullets[].
data.experience = data.experience.map((job) => {
  const roles = (job.roles && job.roles.length ? job.roles : [{ title: job.title, dates: job.dates }]).map((r) => ({ ...r }));
  if (job.bullets && job.bullets.length) {
    // Legacy: job-level bullets belong to the last role listed that has none of its own.
    const target = roles.find((r) => !(r.bullets && r.bullets.length)) || roles[roles.length - 1];
    target.bullets = [...(target.bullets || []), ...job.bullets];
  }
  // A role without its own dates in a single-role job takes the job dates.
  if (roles.length === 1 && !roles[0].dates) roles[0].dates = job.dates;
  return { ...job, roles };
});

// ---------- building blocks ----------
const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: 20, color: INK, ...opts });

function heading(text) {
  return new Paragraph({
    keepNext: true,
    keepLines: true,
    spacing: { before: 220, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 3 } },
    children: [run(text.toUpperCase(), { bold: true, size: 21, color: NAVY })],
  });
}

function bullet(children, keepNext = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    keepLines: true,
    keepNext,
    spacing: { after: 70, line: LINE },
    children: Array.isArray(children) ? children : [run(children)],
  });
}

function body(children, opts = {}) {
  return new Paragraph({ spacing: { after: 90, line: LINE }, keepLines: true, ...opts, children: Array.isArray(children) ? children : [run(children)] });
}

function contactRuns(items) {
  const out = [];
  items.forEach((c, i) => {
    if (i > 0) out.push(run("  |  ", { size: 19, color: GRAY }));
    const s = String(c).trim();
    let link = null;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) link = "mailto:" + s;
    else if (/linkedin\.com|^https?:\/\/|^www\./i.test(s)) link = /^https?:\/\//i.test(s) ? s : "https://" + s;
    if (link) {
      out.push(new ExternalHyperlink({ link, children: [run(s, { size: 19, color: NAVY, underline: { type: "single", color: NAVY } })] }));
    } else {
      out.push(run(s, { size: 19, color: GRAY }));
    }
  });
  return out;
}

// "COO | theme, theme": the target title before the first bar is set in capitals.
function headlineRuns(h) {
  const i = h.indexOf("|");
  if (i === -1) return [run(h, { bold: true })];
  return [run(h.slice(0, i).trim().toUpperCase() + " ", { bold: true }), run(h.slice(i).trim(), { bold: true })];
}

// Achievement: {lead, text} or "Lead sentence. Rest" -> bold lead-in.
function achievementRuns(a) {
  if (typeof a === "object" && a) {
    return a.lead ? [run(a.lead.trim() + " ", { bold: true }), run(a.text || "")] : [run(a.text || "")];
  }
  return [run(String(a))];
}

// ---------- document ----------
const children = [];

children.push(new Paragraph({
  spacing: { after: 40 },
  children: [run(data.name.toUpperCase(), { bold: true, size: 40, color: NAVY })],
}));
children.push(new Paragraph({ spacing: { after: 20 }, children: headlineRuns(data.headline) }));
children.push(new Paragraph({
  spacing: { after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 6 } },
  children: contactRuns(data.contact),
}));

// Shaded stat line: one paragraph (not a table) so ATS parsers read it as text.
const statRuns = [];
data.stats.forEach((s, i) => {
  if (i > 0) statRuns.push(run("   |   ", { size: 19, color: SEP }));
  statRuns.push(run(s.value, { bold: true, size: 22, color: NAVY }));
  statRuns.push(run(" " + s.label, { size: 18, color: GRAY }));
});
children.push(new Paragraph({
  shading: { type: ShadingType.CLEAR, color: "auto", fill: TINT },
  spacing: { before: 60, after: 0 },
  indent: { left: 140, right: 140 },
  border: {
    left: { style: BorderStyle.SINGLE, size: 24, color: NAVY, space: 8 },
    top: { style: BorderStyle.SINGLE, size: 4, color: TINT, space: 2 },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: TINT, space: 2 },
  },
  children: statRuns,
}));

children.push(heading("Summary"));
data.summary.forEach((p) => children.push(body(p)));

children.push(heading("Key Achievements"));
data.achievements.forEach((a) => children.push(bullet(achievementRuns(a))));

children.push(heading("Core Competencies"));
// Non-breaking spaces keep each term on one line.
const compRuns = [];
data.competencies.forEach((c, i) => {
  if (i > 0) compRuns.push(run("  |  ", { bold: true, size: 19, color: NAVY }));
  compRuns.push(run(c.replace(/ /g, " "), { bold: true, size: 19, color: NAVY }));
});
children.push(body(compRuns, { spacing: { after: 40, line: 280 } }));

children.push(heading("Professional Experience"));
data.experience.forEach((job, ji) => {
  job.roles.forEach((r, ri) => {
    const first = ri === 0;
    children.push(new Paragraph({
      keepNext: true,
      keepLines: true,
      spacing: { before: ji === 0 && first ? 0 : 140, after: 0 },
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      children: [
        run(r.title, { bold: true, color: NAVY }),
        ...(r.dates ? [run("\t" + r.dates, { size: 19, color: GRAY })] : []),
      ],
    }));
    children.push(new Paragraph({
      keepNext: true,
      keepLines: true,
      spacing: { after: 30 },
      children: [run(job.company + (job.location ? ", " + job.location : ""), { bold: true })],
    }));
    const blurb = r.blurb || (first ? job.blurb : "");
    if (blurb) {
      children.push(new Paragraph({
        keepNext: true,
        keepLines: true,
        spacing: { after: 40, line: 250 },
        children: [run(blurb, { italics: true, size: 19, color: GRAY })],
      }));
    }
    const mandate = r.mandate || (first ? job.mandate : "");
    if (mandate) {
      children.push(new Paragraph({
        keepNext: true,
        keepLines: true,
        spacing: { after: 50, line: 250 },
        children: [run("Mandate: ", { bold: true, size: 19 }), run(mandate, { italics: true, size: 19 })],
      }));
    }
    // The header lines above carry keepNext, so the first bullet always stays with its title.
    (r.bullets || []).forEach((b) => children.push(bullet(achievementRuns(b))));
  });
});

children.push(heading("Education and Certifications"));
data.education.forEach((e) => children.push(body(e, { spacing: { after: 0, line: 280 } })));

const doc = new Document({
  creator: data.name,
  title: `${data.name} Resume`,
  styles: { default: { document: { run: { font: FONT, size: 20, color: INK } } } },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "•",
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 300, hanging: 220 } },
          run: { font: FONT, color: "000000" },
        },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: TOP, bottom: TOP, left: SIDE, right: SIDE },
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

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  console.log("Wrote " + docxPath);

  // Convert in a private temp folder, then copy the PDF over. LibreOffice leaves
  // lock and .tmp files behind in its output folder, especially on synced or
  // mounted folders, and those should never land in the user's job search folder.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-resume-"));
  try {
    const tmpDocx = path.join(work, path.basename(docxPath));
    fs.writeFileSync(tmpDocx, buffer);
    const profile = require("url").pathToFileURL(path.join(work, "lo-profile")).href;
    execFileSync("soffice", ["-env:UserInstallation=" + profile, "--headless", "--convert-to", "pdf", "--outdir", work, tmpDocx], { stdio: "pipe" });
    const tmpPdf = tmpDocx.replace(/\.docx$/, ".pdf");
    if (!fs.existsSync(tmpPdf)) throw new Error("PDF conversion failed. Is LibreOffice installed (soffice on PATH)?");
    fs.copyFileSync(tmpPdf, pdfPath);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  console.log("Wrote " + pdfPath);

  if (changes.length) {
    console.log("\nTailoring changes:");
    changes.forEach(([f, from, to]) => console.log(`  ${f}\n    was: ${from}\n    now: ${to}`));
  }

  console.log(`Paper: ${paper === "a4" ? "A4" : "US Letter"}`);
  const ok = require("./qa").runQa({ pdfPath, targetPages, data, paper });
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
