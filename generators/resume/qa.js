// Layout QA for a generated resume PDF. Needs poppler-utils (pdfinfo, pdftotext, pdftoppm).
//
// Checks:
//   1. Page count equals the target.
//   2. Renders each page to PNG (for a human or Claude to look at) and flags orphans:
//      a section heading or job header as the last line of a page, or a near-empty last page.
//   3. pdftotext output reads in the right order.
//   4. Voice lint: em dashes and banned filler words.
// Writes <name>-QA.md next to the PDF.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SECTIONS = ["SUMMARY", "KEY ACHIEVEMENTS", "CORE COMPETENCIES", "EXPERIENCE", "EDUCATION AND CERTIFICATIONS"];
const BANNED = ["leverage", "unlock", "seamless", "synergy", "robust", "cutting-edge", "passionate", "i'm excited to", "results-driven"];

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" });
const norm = (s) => s.replace(/\s+/g, " ").trim();

function runQa({ pdfPath, targetPages, data }) {
  const results = [];
  const add = (name, pass, detail) => results.push({ name, pass, detail });

  // 1. Page count
  const info = sh("pdfinfo", [pdfPath]);
  const pages = parseInt((info.match(/Pages:\s+(\d+)/) || [])[1], 10);
  add("Page count", pages === targetPages, `${pages} page(s), target ${targetPages}`);

  // 2. Render pages + orphan checks
  const base = pdfPath.replace(/\.pdf$/, "");
  const imgDir = base + "-pages";
  fs.mkdirSync(imgDir, { recursive: true });
  sh("pdftoppm", ["-png", "-r", "80", pdfPath, path.join(imgDir, "page")]);
  const images = fs.readdirSync(imgDir).filter((f) => f.endsWith(".png")).sort();
  add("Page images rendered", images.length === pages, images.map((f) => path.join(path.basename(imgDir), f)).join(", "));

  const jobHeaders = data.experience.map((j) => j.company);
  const orphanNotes = [];
  for (let p = 1; p <= pages; p++) {
    const lines = sh("pdftotext", ["-f", String(p), "-l", String(p), "-layout", pdfPath, "-"])
      .split("\n").map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1] || "";
    if (p < pages) {
      if (SECTIONS.some((s) => last.toUpperCase().startsWith(s))) orphanNotes.push(`page ${p} ends with heading "${last}"`);
      if (jobHeaders.some((c) => last.startsWith(c))) orphanNotes.push(`page ${p} ends with job header "${last}"`);
    }
    if (p === pages && pages > 1 && lines.length < 6) orphanNotes.push(`last page has only ${lines.length} line(s); trim to fit or add substance`);
  }
  add("No orphan headings or near-empty last page", orphanNotes.length === 0, orphanNotes.join("; ") || "clean");

  // 3. Reading order
  const text = norm(sh("pdftotext", [pdfPath, "-"]));
  const upper = text.toUpperCase();
  const anchors = [
    data.name.toUpperCase(),
    norm(data.headline).toUpperCase().slice(0, 25),
    data.stats[0].value.toUpperCase(),
    ...SECTIONS,
    ...jobHeaders.map((c) => c.toUpperCase()),
  ];
  // Job headers belong between EXPERIENCE and EDUCATION.
  const order = [anchors[0], anchors[1], anchors[2], "SUMMARY", "KEY ACHIEVEMENTS", "CORE COMPETENCIES", "EXPERIENCE",
    ...jobHeaders.map((c) => c.toUpperCase()), "EDUCATION AND CERTIFICATIONS"];
  let cursor = -1;
  const misses = [];
  for (const a of order) {
    const idx = upper.indexOf(a, cursor + 1);
    if (idx === -1) misses.push(`"${a}" missing or out of order`);
    else cursor = idx;
  }
  add("Text reads in the right order (pdftotext)", misses.length === 0, misses.join("; ") || order.length + " anchors in order");

  // 4. Voice lint
  const lower = text.toLowerCase();
  const voice = [];
  if (text.includes("—")) voice.push("em dash found");
  BANNED.forEach((w) => { if (lower.includes(w)) voice.push(`"${w}"`); });
  add("Voice lint (no em dashes, no filler)", voice.length === 0, voice.join(", ") || "clean");

  // Report
  const allPass = results.every((r) => r.pass);
  const lines = [
    `# Resume QA: ${path.basename(pdfPath)}`,
    "",
    `Result: **${allPass ? "PASS" : "FAIL"}**`,
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
    ...results.map((r) => `| ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail} |`),
    "",
    "Also look at each page image before sending. Automated checks do not replace a human look.",
    "",
  ];
  fs.writeFileSync(base + "-QA.md", lines.join("\n"));

  console.log("\nQA");
  results.forEach((r) => console.log(`  [${r.pass ? "PASS" : "FAIL"}] ${r.name}: ${r.detail}`));
  console.log(`  Report: ${base}-QA.md`);
  return allPass;
}

module.exports = { runQa };
