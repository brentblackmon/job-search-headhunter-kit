#!/usr/bin/env node
// One-page Match and Package results report (US Letter or A4 PDF).
//
// Usage:
//   node build-report.js --data report.json --out "My Job Search/companies/<slug>/First_Last_Match_Report_Company.pdf"
//
// report.json (paths are relative to report.json):
//   { "name": "Jordan Rivera", "company": "Harborline Software", "title": "VP Operations",
//     "date": "2026-10-19", "paper": "letter",
//     "before": "match-before.json",            // match.json from Step 1 (see score.js)
//     "after": "match-after.json",             // optional: match.json after the guided fix
//     "keywords": ["Required skills covered: 7 of 9", "Exact-term matches: 6 of 9"],
//     "files": [{ "label": "Tailored resume", "path": "Jordan_Rivera_Resume_Harborline.pdf" }, ...],
//              a file not built yet has a note instead of a path:
//              { "label": "Baseball card", "note": "waiting for a photo" }
//     "executive": { "name": "Priya Natarajan", "title": "COO", "since": "Jan 2026",
//                    "source": "Harborline press release", "sourceDate": "2026-01-14",
//                    "url": "https://..." } }
//   With no dated source for the executive, set "executive": { "missing": "why, in one line" }.
//
// Checks: exactly 1 page, the score math (score.js rules), no em or en dashes, no
// unfilled placeholders like "[name]", and every file in "files" exists. Exits 1 on a
// failed check. File links in the PDF are relative, so they open from the same folder.
//
// Renderer: Playwright (Chromium), using the baseball card's install if this folder has
// none; otherwise WeasyPrint, the same fallback the card uses.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { score, validate, LABEL } = require("./score");

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  return a;
}
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function has(cmd, args = ["--version"]) {
  try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { return false; }
}
function load(base, v) {
  if (!v) return null;
  return typeof v === "string" ? JSON.parse(fs.readFileSync(path.resolve(base, v), "utf8")) : v;
}

function scoreBox(label, m) {
  const s = score(m);
  return `<div class="score ${s.band.toLowerCase()}"><div class="lab">${esc(label)}</div><div class="num">${s.score}<span>/100</span></div><div class="band">${esc(s.band)}</div></div>`;
}

function buildHtml(d, before, after, outDir) {
  const final = after || before;
  const rel = (p) => path.relative(outDir, path.resolve(d._base, p)).split(path.sep).join("/");
  const reqRows = ["must", "nice"].flatMap((kind) => (final.requirements || []).filter((r) => r.kind === kind).map((r) => {
    const was = before && after ? (before.requirements || []).find((b) => b.text === r.text) : null;
    const change = was && was.rating !== r.rating ? ` <span class="was">(was ${esc(LABEL[was.rating])})</span>` : "";
    return `<tr><td class="req">${esc(r.text)}</td><td>${kind === "must" ? "Must" : "Nice"}</td><td class="r-${r.rating}">${esc(LABEL[r.rating])}${change}</td><td>${esc(r.reason)}${r.quote ? `<div class="q">"${esc(r.quote)}"</div>` : ""}</td></tr>`;
  })).join("");
  const evRows = (final.evidence || []).map((e) => `<tr><td class="r-${e.rating}">${esc(LABEL[e.rating])}</td><td><b>${esc(e.claim)}</b>${e.rating === "vague" && e.missing ? ` <span class="was">(missing: ${esc(e.missing)})</span>` : ""}<div class="q">"${esc(e.quote)}"</div></td></tr>`).join("");
  const files = (d.files || []).map((f) => f.path
    ? `<li><a href="${esc(rel(f.path))}">${esc(f.label)}</a> <span class="path">${esc(path.basename(f.path))}</span></li>`
    : `<li>${esc(f.label)} <span class="path">(${esc(f.note || "not built yet")})</span></li>`).join("");
  const ex = d.executive || {};
  const exec = ex.name
    ? `<b>${esc(ex.name)}</b>, ${esc(ex.title)}${ex.since ? ` since ${esc(ex.since)}` : ""}. Source: ${ex.url ? `<a href="${esc(ex.url)}">${esc(ex.source)}</a>` : esc(ex.source)}${ex.sourceDate ? `, ${esc(ex.sourceDate)}` : ""}.`
    : `Not confirmed: ${esc(ex.missing || "no dated source found")}.`;
  const scores = after ? scoreBox("Before", before) + `<div class="arrow">to</div>` + scoreBox("After", after) : scoreBox("Match Score", before);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: ${d.paper === "a4" ? "A4" : "Letter"}; margin: 0.45in 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1A1A1A; font-size: ${d._compact ? 8 : 8.8}pt; line-height: 1.3; margin: 0; }
  h1 { color: #1A2B4A; font-size: 16pt; margin: 0; }
  .sub { color: #666; margin: 2pt 0 8pt; }
  h2 { color: #1A2B4A; font-size: 9.5pt; text-transform: uppercase; letter-spacing: .5pt; border-bottom: 1.2pt solid #1A2B4A; padding-bottom: 2pt; margin: ${d._compact ? 6 : 9}pt 0 4pt; }
  .scores { display: flex; align-items: center; gap: 10pt; }
  .score { border: 1pt solid #ccd3df; border-radius: 4pt; padding: 5pt 12pt; text-align: center; min-width: 92pt; }
  .score .lab { color: #666; font-size: 7.5pt; text-transform: uppercase; }
  .score .num { font-size: 22pt; font-weight: bold; color: #1A2B4A; }
  .score .num span { font-size: 9pt; color: #666; }
  .score .band { font-weight: bold; }
  .shortlist .band { color: #1d6b3a; } .maybe .band { color: #8a5a00; } .unlikely .band { color: #9b1c1c; }
  .arrow { color: #666; }
  .kw { margin-left: 12pt; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: .5pt solid #e1e5ec; padding: ${d._compact ? 2 : 3}pt 4pt; vertical-align: top; }
  td.req { width: 32%; font-weight: bold; }
  .q { color: #555; font-style: italic; }
  .was, .path { color: #777; font-weight: normal; font-size: 7.5pt; }
  .r-met, .r-well { color: #1d6b3a; font-weight: bold; white-space: nowrap; }
  .r-partly, .r-vague { color: #8a5a00; font-weight: bold; white-space: nowrap; }
  .r-not { color: #9b1c1c; font-weight: bold; white-space: nowrap; }
  ul { margin: 0; padding-left: 14pt; }
  a { color: #1A2B4A; }
  .next { margin-top: 8pt; padding: 5pt 8pt; background: #eef1f6; border-radius: 3pt; }
</style></head><body>
<h1>${esc(d.name)}: Match report</h1>
<div class="sub">${esc(d.title)}, ${esc(d.company)}. ${esc(d.date)}.</div>
<div class="scores">${scores}<div class="kw">${(d.keywords || []).map(esc).join("<br>")}</div></div>
<h2>What the posting asks for</h2>
<table>${reqRows}</table>
<h2>Evidence check</h2>
<table>${evRows || "<tr><td>None.</td></tr>"}</table>
<h2>Your package</h2>
<ul>${files}</ul>
<h2>Hiring executive</h2>
<div>${exec}</div>
<div class="next">Next: <b>Find more jobs like this one</b>, or <b>Set up my full search</b>.</div>
</body></html>`;
}

function loadPlaywright() {
  for (const p of ["playwright", path.join(__dirname, "..", "baseball-card", "node_modules", "playwright")]) {
    try { return require(p); } catch {}
  }
  return null;
}

async function render(html, htmlPath, outPdf) {
  const pw = loadPlaywright();
  if (pw) {
    try {
      const launch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
      const browser = await pw.chromium.launch(launch);
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load" });
        await page.pdf({ path: outPdf, preferCSSPageSize: true, printBackground: true });
        return "Playwright";
      } finally { await browser.close(); }
    } catch (e) {
      console.log(`Playwright unavailable (${String(e.message).split("\n")[0]}). Using WeasyPrint.`);
    }
  }
  const py = has("python3") ? "python3" : "python";
  if (!has(py, ["-c", "import weasyprint"])) {
    try { execFileSync(py, ["-m", "pip", "install", "--user", "--quiet", "weasyprint"], { stdio: "inherit" }); } catch {}
    if (!has(py, ["-c", "import weasyprint"])) {
      try { execFileSync(py, ["-m", "pip", "install", "--user", "--quiet", "--break-system-packages", "weasyprint"], { stdio: "inherit" }); } catch {}
    }
  }
  execFileSync(py, ["-m", "weasyprint", htmlPath, outPdf], { stdio: "pipe" });
  return "WeasyPrint";
}

function countPages(pdf) {
  if (has("pdfinfo", ["-v"])) return Number((execFileSync("pdfinfo", [pdf], { encoding: "utf8" }).match(/Pages:\s+(\d+)/) || [])[1]);
  return (fs.readFileSync(pdf, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.data || !args.out) {
    console.error("Usage: node build-report.js --data report.json --out First_Last_Match_Report_Company.pdf");
    process.exit(2);
  }
  const dataPath = path.resolve(args.data);
  const d = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  d._base = path.dirname(dataPath);
  const before = load(d._base, d.before);
  const after = load(d._base, d.after);
  const outPdf = path.resolve(args.out);
  const outDir = path.dirname(outPdf);
  fs.mkdirSync(outDir, { recursive: true });

  const problems = [];
  if (!before) problems.push('"before" (the Step 1 match.json) is required');
  for (const [label, m] of [["before", before], ["after", after]]) if (m) problems.push(...validate(m).map((p) => `${label}: ${p}`));
  for (const f of d.files || []) {
    if (!f.path && !f.note) problems.push(`file "${f.label}": give a path, or a note such as "waiting for a photo"`);
    else if (f.path && !fs.existsSync(path.resolve(d._base, f.path))) problems.push(`file not found: ${f.path}`);
  }
  const raw = JSON.stringify([d, before, after]);
  if (/[\u2013\u2014]/.test(raw)) problems.push("em or en dash in the report text (use a comma, colon, or \"to\")");
  const placeholders = [...new Set(raw.match(/\[[^\[\]"]{1,40}\]/g) || [])];
  if (placeholders.length) problems.push(`unfilled placeholders: ${placeholders.join(", ")}`);
  if (!before) { console.error(problems.join("\n")); process.exit(1); }

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-report-"));
  let renderer, pages;
  try {
    // Render once; if it runs past one page, render again in the compact style.
    for (const compact of [false, true]) {
      d._compact = compact;
      const html = buildHtml(d, before, after, outDir);
      const htmlPath = path.join(work, "report.html");
      fs.writeFileSync(htmlPath, html);
      renderer = await render(html, htmlPath, outPdf);
      pages = countPages(outPdf);
      if (pages === 1) break;
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  if (pages !== 1) problems.push(`expected 1 page, found ${pages} (shorten the reasons and quotes)`);

  const fmt = (m) => { const s = score(m); return `${s.score} of 100 (${s.band})`; };
  console.log(`Match Score: ${after ? `${fmt(before)} before, ${fmt(after)} after` : fmt(before)}`);
  console.log(`Wrote ${outPdf} (${renderer}, ${pages} page${pages === 1 ? "" : "s"})`);
  if (problems.length) {
    console.error("QA failed:\n- " + problems.join("\n- "));
    process.exit(1);
  }
  console.log("QA passed: 1 page, score math, no dashes, no placeholders, all files found.");
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

module.exports = { buildHtml };
