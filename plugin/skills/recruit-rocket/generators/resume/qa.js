// Layout QA for a generated resume PDF. Needs poppler-utils (pdfinfo, pdftotext, pdftoppm).
//
// Checks:
//   1. Page count equals the target, and the paper size is right (A4 or US Letter).
//   2. Renders each page to PNG (for a human or Claude to look at) and flags orphans:
//      a section heading or job header as the last line of a page, or a near-empty last page.
//   3. pdftotext output reads in the right order.
//   4. Voice lint: no em or en dashes, and no AI-tell words (spearheaded, leveraged,
//      utilize, and the rest in voice.js) unless the user chose to keep them.
//   5. Key achievements summarize; none copies a role bullet word for word.
//   6. No unfilled placeholders like "[phone]" or "[degree and year to confirm]".
// Writes <name>-QA.md next to the PDF.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { sections } = require("./layout");
const { aiTells } = require("./voice");

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" });
const norm = (s) => s.replace(/\s+/g, " ").trim();

function runQa({ pdfPath, targetPages, data, paper = "letter" }) {
  // Section headings in print order, from the same layout the builder used.
  const SECTIONS = sections(data).map((x) => x.title.toUpperCase());
  const stats = Array.isArray(data.stats) ? data.stats : [];
  const results = [];
  const add = (name, pass, detail) => results.push({ name, pass, detail });

  // 1. Page count
  const info = sh("pdfinfo", [pdfPath]);
  const pages = parseInt((info.match(/Pages:\s+(\d+)/) || [])[1], 10);
  add("Page count", pages === targetPages, `${pages} page(s), target ${targetPages}`);

  // 1b. Paper size matches what was asked for (A4 is 595 x 842 pt, Letter is 612 x 792 pt).
  const size = (info.match(/Page size:\s+([\d.]+) x ([\d.]+)/) || []).slice(1).map(Number);
  const want = paper === "a4" ? [595, 842] : [612, 792];
  const sizeOk = size.length === 2 && Math.abs(size[0] - want[0]) < 2 && Math.abs(size[1] - want[1]) < 2;
  add("Paper size", sizeOk, `${size.map(Math.round).join(" x ")} pt, want ${paper === "a4" ? "A4" : "US Letter"}`);

  // 2. Render pages + orphan checks
  const base = pdfPath.replace(/\.pdf$/, "");
  const imgDir = base + "-pages";
  // Start clean so page images from an earlier, longer run never linger.
  fs.rmSync(imgDir, { recursive: true, force: true });
  fs.mkdirSync(imgDir, { recursive: true });
  sh("pdftoppm", ["-png", "-r", "80", pdfPath, path.join(imgDir, "page")]);
  const images = fs.readdirSync(imgDir).filter((f) => f.endsWith(".png")).sort();
  add("Page images rendered", images.length === pages, images.map((f) => path.join(path.basename(imgDir), f)).join(", "));

  const jobHeaders = data.experience.map((j) => j.company);
  const roleTitles = data.experience.flatMap((j) => (j.roles || []).map((r) => r.title)).filter(Boolean);
  const orphanNotes = [];
  for (let p = 1; p <= pages; p++) {
    const lines = sh("pdftotext", ["-f", String(p), "-l", String(p), "-layout", pdfPath, "-"])
      .split("\n").map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1] || "";
    if (p < pages) {
      if (SECTIONS.some((s) => last.toUpperCase().startsWith(s))) orphanNotes.push(`page ${p} ends with heading "${last}"`);
      if (jobHeaders.some((c) => last.startsWith(c)) || roleTitles.some((t) => last.startsWith(t))) orphanNotes.push(`page ${p} ends with job header "${last}"`);
    }
    if (p === pages && pages > 1 && lines.length < 6) orphanNotes.push(`last page has only ${lines.length} line(s); trim to fit or add substance`);
  }
  add("No orphan headings or near-empty last page", orphanNotes.length === 0, orphanNotes.join("; ") || "clean");

  // 2b. Stat line fits on one line (it wraps when values or labels run long).
  const page1 = sh("pdftotext", ["-f", "1", "-l", "1", "-layout", pdfPath, "-"]).split("\n");
  // Match on the first stat's value AND the first word of its label, so a short value
  // like "22" does not match the phone number on the contact line.
  // No stats (common for students): no stat bar was printed, so there is nothing to wrap.
  if (stats.length) {
    const firstLabelWord = String(stats[0].label || "").trim().split(/\s+/)[0] || "";
    const statLine = page1.find((l) => l.includes(stats[0].value) && l.includes(firstLabelWord)) || "";
    const lastLabel = String(stats[stats.length - 1].label || "").trim();
    const lastWord = lastLabel.split(/\s+/).pop() || "";
    const statOk = statLine.includes(stats[stats.length - 1].value) && (!lastWord || statLine.includes(lastWord));
    add("Stat line fits on one line", statOk, statOk ? "one line" : "stat line wraps; shorten values to about 12 characters and labels to 1 to 3 words");
  } else {
    add("Stat line fits on one line", true, "no stat line (no stats)");
  }

  // 3. Reading order
  const text = norm(sh("pdftotext", [pdfPath, "-"]));
  const upper = text.toUpperCase();
  // Name, headline, first stat (if any), then each section heading in print order, with
  // the job headers right after the experience heading.
  const order = [data.name.toUpperCase(), norm(data.headline).toUpperCase().slice(0, 25)];
  if (stats.length) order.push(String(stats[0].value).toUpperCase());
  sections(data).forEach((sec) => {
    order.push(sec.title.toUpperCase());
    if (sec.key === "experience") order.push(...jobHeaders.map((c) => c.toUpperCase()));
  });
  let cursor = -1;
  const misses = [];
  for (const a of order) {
    const idx = upper.indexOf(a, cursor + 1);
    if (idx === -1) misses.push(`"${a}" missing or out of order`);
    else cursor = idx;
  }
  add("Text reads in the right order (pdftotext)", misses.length === 0, misses.join("; ") || order.length + " anchors in order");

  // 4. Voice lint
  const voice = [];
  if (text.includes("\u2014")) voice.push("em dash found");
  // En dashes too, including in number ranges: the kit writes ranges as "2019 to 2021".
  if (text.includes("\u2013")) voice.push("en dash found");
  add("Voice lint (no em or en dashes)", voice.length === 0, voice.join(", ") || "clean");

  // 4b. AI-tell words, in every word form. Company, school, and product names are never
  // the user's word choice ("Synergy Ridge Logistics", "Microsoft Dynamics"), so they are
  // skipped, and so are words the user said they really use (resume.json "keepWords").
  const names = [data.name, ...data.experience.map((j) => j.company), ...(data.education || []).map((e) => (typeof e === "object" && e ? e.school : e)), ...(data.properNames || [])].filter(Boolean);
  const tells = aiTells(text, { names, keep: data.keepWords || [] });
  add("AI-tell words", tells.length === 0, tells.length ? tells.map((h) => `"${h.found}"`).join(", ") + " (ask once: keep it, or swap for a plain verb)" : "none");

  // 5. Achievements must not copy a role bullet word for word (the same number is fine
  // when the wording differs). Compare lowercase words only, ignoring punctuation.
  const words = (x) => String(typeof x === "object" && x ? x.text || "" : x || "").toLowerCase().replace(/[^a-z0-9%$]+/g, " ").trim();
  const roleBullets = data.experience.flatMap((j) => [...(j.bullets || []), ...(j.roles || []).flatMap((r) => r.bullets || [])]).map(words).filter((w) => w.length >= 30);
  const copies = (data.achievements || []).map(words).filter((t) => t && roleBullets.some((bw) => t.includes(bw) || bw.includes(t)));
  add("Achievements do not copy role bullets", copies.length === 0, copies.length ? copies.map((t) => `"${t.slice(0, 60)}"`).join("; ") : "none copied");

  // 6. Unfilled placeholders. Any text in square brackets is a draft gap, not resume text.
  const placeholders = [...new Set(text.match(/\[[^\[\]]{1,80}\]/g) || [])];
  add("No unfilled placeholders", placeholders.length === 0, placeholders.join(", ") || "none");

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
