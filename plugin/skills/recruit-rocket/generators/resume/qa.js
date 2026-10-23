// Layout QA for a generated resume PDF. Needs poppler-utils (pdfinfo, pdftotext, pdftoppm).
//
// Checks:
//   1. Page count is reported (checked only when the user asked for a set length with
//      --pages), and the paper size is right (A4 or US Letter).
//   2. Renders each page to PNG (for a human or Claude to look at) and flags orphans:
//      a section heading or job header as the last line of a page, or a near-empty last page.
//   3. pdftotext output reads in the right order.
//   4. Voice lint: no em or en dashes, and no AI-tell words (spearheaded, leveraged,
//      utilize, and the rest in voice.js) unless the user chose to keep them.
//   5. Key achievements summarize; none copies a role bullet word for word.
//   6. No unfilled placeholders like "[phone]" or "[degree and year to confirm]".
//   7. Dates on every layout read "Jan 2021 to Present" or "Mar 2019 to Dec 2020".
//   8. No bullet ends with a short last line: a wrapped bullet whose last line holds only
//      1 or 2 words fails. The fix is to shorten that bullet (cut filler, never a number or
//      a fact) until it takes one line less, then rebuild and rerun.
// Writes <name>-QA.md next to the PDF.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { sections } = require("./layout");

// Dates on every layout: a three-letter month and year, "to", then a month and year or
// "Present" ("Jan 2021 to Present", "Mar 2019 to Dec 2020"). Never a dash, never
// "01/2021". Graduation can read "Expected May 2028".
const MON = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const DATE_RANGE = new RegExp(`^${MON} \\d{4}( to (${MON} \\d{4}|Present))?$`);
const GRAD_DATE = new RegExp(`^(Expected )?${MON} \\d{4}$`);
const { aiTells } = require("./voice");

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" });

// Every text line in the PDF, in reading order: { page, x, y, words: [{ t, x }] }.
function pdfLines(pdfPath) {
  const xml = sh("pdftotext", ["-bbox-layout", pdfPath, "-"]);
  const unescape = (t) => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const out = [];
  xml.split(/<page\b/).slice(1).forEach((pg, i) => {
    for (const m of pg.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([\s\S]*?)<\/line>/g)) {
      const words = [...m[3].matchAll(/<word xMin="([\d.]+)"[^>]*>([^<]*)<\/word>/g)].map((w) => ({ t: unescape(w[2]), x: Number(w[1]) }));
      if (words.length) out.push({ page: i + 1, x: Number(m[1]), y: Number(m[2]), words });
    }
  });
  return out;
}

// Wrapped bullets whose last line holds only 1 or 2 words. A bullet starts with the "•"
// glyph; its next lines start at the same indent as the text after the glyph.
const countWords = (ws) => ws.filter((w) => /[A-Za-z0-9]/.test(w.t)).length;
function shortBulletEndings(lines) {
  const found = [];
  let cur = null;
  const close = () => {
    if (cur && cur.lines.length > 1) {
      const last = cur.lines[cur.lines.length - 1];
      if (countWords(last) <= 2) found.push({ start: cur.lines[0].slice(0, 6).map((w) => w.t).join(" "), last: last.map((w) => w.t).join(" "), lines: cur.lines.length });
    }
    cur = null;
  };
  for (const l of lines) {
    if (l.words[0].t === "\u2022" || l.words[0].t.startsWith("\u2022")) {
      close();
      const rest = l.words[0].t === "\u2022" ? l.words.slice(1) : [{ ...l.words[0], t: l.words[0].t.slice(1) }, ...l.words.slice(1)];
      if (rest.length) cur = { textX: rest[0].x, lines: [rest] };
    } else if (cur && Math.abs(l.x - cur.textX) < 3) {
      cur.lines.push(l.words);
    } else close();
  }
  close();
  return found;
}
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
  if (targetPages) add("Page count", pages === targetPages, `${pages} page(s), target ${targetPages}`);
  else add("Page count", pages > 0, `${pages} page(s), no target (the user's resume sets the length)`);

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
    if (sec.key === "experience") order.push(...sec.jobs.map((j) => String(j.company).toUpperCase()));
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

  // 7. Date format, every layout: "Jan 2021 to Present", graduation "Expected May 2028".
  const roleDates = data.experience.flatMap((j) => (j.roles || []).map((r) => r.dates)).filter(Boolean);
  const eduDates = (data.education || []).map((e) => (typeof e === "object" && e ? e.dates : null)).filter(Boolean);
  const badDates = [...roleDates.filter((d) => !DATE_RANGE.test(d)), ...eduDates.filter((d) => !DATE_RANGE.test(d) && !GRAD_DATE.test(d))];
  add("Date format", badDates.length === 0, badDates.length ? [...new Set(badDates)].map((d) => `"${d}"`).join(", ") + ' (write "Jan 2021 to Present" or "Mar 2019 to Dec 2020", graduation "Expected May 2028"; never a dash)' : "clean");

  // 8. Short last lines: a wrapped bullet must not end with a line of 1 or 2 words.
  const short = shortBulletEndings(pdfLines(pdfPath));
  add("No bullet ends with 1 or 2 words on its last line", short.length === 0, short.length ? short.map((b) => `"${b.start}..." ends with "${b.last}"`).join("; ") + ". Shorten each one (cut filler, never a number or fact) until it takes one line less, then rebuild and rerun" : "clean");

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

module.exports = { runQa, shortBulletEndings, pdfLines };
