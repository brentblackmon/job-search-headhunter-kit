#!/usr/bin/env node
// Renders a one-page landscape US Letter baseball card PDF from card.json.
//
// Usage:
//   node render-card.js --data card.json --out out/First_Last_Card_Company.pdf [--html out/card.html]
//
// card.json shape (see sample-data/card.json):
//   name, role ("Chief Operating Officer / Company"), headline, headlineAccent, intro,
//   photo (required: path to a JPG or PNG headshot, relative to card.json), stats[4] {value, label},
//   or, for a student card with no numbers yet, tiles[4] {title, detail} (skills and experience
//   tiles, for example {"title": "Replay operator", "detail": "Home football and basketball games"}),
//   sections[2] {eyebrow, title, cards[4] {tag, title, proof, body}},
//   footer {tagline, accent}, contact[] (phone, email, LinkedIn),
//   valueStatement {id, text}: the approved value statement from facts.md that best fits this
//   company's signal or posting (the master card uses the strongest one). The headline and
//   intro come from it: they must carry its number and at least 3 of its words.
//
// Writes the PDF and a PNG preview next to it, then checks: exactly 1 page,
// 4 stats (or 4 skill tiles), 2 sections of 4 cards, no text overflow, no unfilled placeholders
// like "[phone]" or "[email]", a headshot photo (required), and no intro or card body that
// wraps onto a last line of only 1 or 2 words.
//
// Renderer: Playwright (Chromium) when a browser is available. If Playwright or its
// browser is missing (common in sandboxes that block the browser download), it falls
// back to WeasyPrint (Python), installing it with pip if needed. Both print the same
// filled HTML, so the layout matches.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

// Text limits that fit the locked layout. The browser check measures real overflow;
// these limits are what the WeasyPrint path checks, and what drafts should aim for.
const LIMITS = {
  headline: 70,          // headline + headlineAccent together, one line
  intro: 330,            // three lines
  statValue: 12,
  statLabel: 60,         // two lines
  tileTitle: 22,         // one line, student tiles
  tileDetail: 60,        // two lines
  sectionTitle: 70,
  tag: 22,
  cardTitle: 32,         // one line
  cardProof: 45,         // one line
  cardBody: 150,         // four lines
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[argv[i].slice(2)] = true;
    else { args[argv[i].slice(2)] = next; i++; }
  }
  return args;
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Older card.json files used {headline, positioning, proof[8] {title, result, where}}.
// Map them onto the current shape so they still render.
function normalize(d) {
  if (d.sections) return d;
  const proof = d.proof || [];
  const toCard = (p) => ({ tag: p.title, title: p.title, proof: p.where, body: p.result });
  return {
    ...d,
    role: d.role || "",
    intro: d.intro || d.positioning || "",
    sections: [
      { eyebrow: "01 / Results", title: "", cards: proof.slice(0, 4).map(toCard) },
      { eyebrow: "02 / More results", title: "", cards: proof.slice(4, 8).map(toCard) },
    ],
  };
}

// A student card with no numbers yet uses skills and experience tiles in place of stats.
const useTiles = (d) => !(d.stats && d.stats.length) && Array.isArray(d.tiles) && d.tiles.length > 0;

function buildCard(d) {
  const initials = d.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const footer = d.footer || {};
  return `
    <section class="top">
      <div class="text">
        <div class="name">${esc(d.name)}</div>
        ${d.role ? `<div class="eyebrow">${esc(d.role)}</div>` : ""}
        <div class="headline">${esc(d.headline)}${d.headlineAccent ? ` <span class="hl">${esc(d.headlineAccent)}</span>` : ""}</div>
        ${d.intro ? `<div class="intro">${esc(d.intro)}</div>` : ""}
      </div>
      <div class="photo">${d.photo ? `<img src="${esc(d.photo)}" alt="">` : `<div class="initials">${esc(initials)}</div>`}</div>
    </section>
    <section class="stats">
      ${useTiles(d)
        ? d.tiles.map((t) => `<div class="stat word"><div class="v">${esc(t.title)}</div><div class="l">${esc(t.detail)}</div></div>`).join("")
        : d.stats.map((s) => `<div class="stat"><div class="v">${esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`).join("")}
    </section>
    ${d.sections.map((sec) => `
    <section class="section">
      <div class="eyebrow">${esc(sec.eyebrow)}</div>
      ${sec.title ? `<div class="title">${esc(sec.title)}</div>` : ""}
      <div class="row">
        ${sec.cards.map((c) => `<div class="pc">
          ${c.tag ? `<span class="tag">${esc(c.tag)}</span>` : ""}
          <div class="t">${esc(c.title)}</div>
          ${c.proof ? `<div class="p">${esc(c.proof)}</div>` : ""}
          <div class="b">${esc(c.body)}</div>
        </div>`).join("")}
      </div>
    </section>`).join("")}
    <footer class="foot">
      <div class="tagline">${esc(d.role ? `${d.role} candidate` : d.name)}</div>
      <div class="contact">${(d.contact || []).map(esc).join("&nbsp;&nbsp;|&nbsp;&nbsp;")}</div>
    </footer>`;
}

// No slogans. Short punchy fragments ("Profitable services. AI past R&D."), "not X but Y"
// and "X, not Y" constructions ("Agents doing real work, not pilots."), and mottos are
// banned; headlines and section titles state plain facts ("AI in support, sales and the
// back office"). The footer is generated: "[target title] candidate" and the contact line.
function sloganProblems(label, text, { fragments = false } = {}) {
  const t = String(text || "").trim();
  if (!t) return [];
  const out = [];
  if (/\bnot\b[^.!?]{0,60}\bbut\b/i.test(t) || /,\s*not\s+[a-z]/i.test(t) || /\bnot\s+just\b/i.test(t)) out.push(`${label} uses a "not X but Y" or "X, not Y" slogan: "${t}"`);
  if (fragments) {
    const parts = t.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2 && parts.every((x) => x.split(/\s+/).length <= 5)) out.push(`${label} is a slogan of short fragments: "${t}"; state one plain fact instead`);
  }
  return out;
}
function noSlogans(d) {
  const p = [];
  if (/\s\/\s|\bat\s+[A-Z]/.test(d.role || "")) p.push(`role line "${d.role}" names a company; use the target title only`);
  p.push(...sloganProblems("headline", `${d.headline || ""} ${d.headlineAccent || ""}`, { fragments: true }));
  p.push(...sloganProblems("intro", d.intro));
  (d.sections || []).forEach((s, i) => {
    p.push(...sloganProblems(`section ${i + 1} title`, s.title, { fragments: true }));
    (s.cards || []).forEach((c, j) => p.push(...sloganProblems(`section ${i + 1} card ${j + 1}`, `${c.title}. ${c.proof} ${c.body}`)));
  });
  return p;
}

// A card's proof line must add a fact, not repeat its title: "Services revenue up" over
// "Up 25%" says "up" twice. Fails when every word in the proof (numbers aside) is already in
// the title, or when the proof only restates the title's direction word.
const DIRECTION = new Set(["up", "down", "more", "less", "higher", "lower", "faster", "slower", "grew", "growth", "cut", "rose", "fell"]);
function repeatsTitle(title, proof) {
  const words = (s) => String(s || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !["to", "of", "in", "the", "a", "and", "from", "per", "by"].includes(w));
  const t = new Set(words(title)), p = words(proof);
  if (!p.length) return false;
  return p.every((w) => t.has(w)) || p.some((w) => DIRECTION.has(w) && t.has(w));
}

// The headline and intro come from the value statement that best fits the company.
const VS_STOP = new Set("that this with from into onto over their they them then than have were what when where which while your about after also and the for are was".split(" "));
const vsWords = (t) => [...new Set(String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !/^\d/.test(w) && !VS_STOP.has(w)))];
const vsNumbers = (t) => (String(t || "").match(/\d[\d,.]*%?/g) || []).map((n) => n.replace(/[,.]$/, ""));
function valueProblems(d) {
  const v = d.valueStatement || {};
  if (!v.text) return ["no valueStatement: copy the value statement (id and text) from facts.md that best fits this company; the headline and intro come from it"];
  const top = `${d.headline || ""} ${d.headlineAccent || ""} ${d.intro || ""}`;
  const have = new Set(vsWords(top));
  const shared = vsWords(v.text).filter((w) => have.has(w));
  const p = [];
  if (shared.length < 3) p.push(`the headline and intro do not come from value statement ${v.id || ""}: only ${shared.length} of its words (${shared.join(", ") || "none"})`.replace("  ", " "));
  const nums = vsNumbers(v.text);
  if (nums.length && !nums.some((n) => vsNumbers(top).includes(n))) p.push(`the headline or intro must carry value statement ${v.id || ""}'s result (${nums.join(", ")})`.replace("  ", " "));
  return p;
}

function checkShape(d) {
  const problems = [...noSlogans(d), ...valueProblems(d)];
  (d.sections || []).forEach((s, i) => (s.cards || []).forEach((c, j) => {
    if (repeatsTitle(c.title, c.proof)) problems.push(`section ${i + 1} card ${j + 1}: the proof "${c.proof}" repeats the title "${c.title}"; give the number its own fact`);
  }));
  if (useTiles(d)) {
    if (d.tiles.length !== 4) problems.push(`expected 4 tiles, found ${d.tiles.length}`);
  } else if (!d.stats || d.stats.length !== 4) problems.push(`expected 4 stats (or 4 tiles for a student card), found ${(d.stats || []).length}`);
  if (!d.sections || d.sections.length !== 2) problems.push(`expected 2 sections, found ${(d.sections || []).length}`);
  (d.sections || []).forEach((s, i) => {
    if (!s.cards || s.cards.length !== 4) problems.push(`section ${i + 1}: expected 4 cards, found ${(s.cards || []).length}`);
  });
  return problems;
}

function checkLengths(d) {
  const out = [];
  const over = (what, text, max) => {
    const n = String(text || "").length;
    if (n > max) out.push(`${what} is ${n} characters (max about ${max})`);
  };
  over("headline", `${d.headline || ""} ${d.headlineAccent || ""}`.trim(), LIMITS.headline);
  over("intro", d.intro, LIMITS.intro);
  (d.stats || []).forEach((s, i) => { over(`stat ${i + 1} value`, s.value, LIMITS.statValue); over(`stat ${i + 1} label`, s.label, LIMITS.statLabel); });
  if (useTiles(d)) d.tiles.forEach((t, i) => { over(`tile ${i + 1} title`, t.title, LIMITS.tileTitle); over(`tile ${i + 1} detail`, t.detail, LIMITS.tileDetail); });
  (d.sections || []).forEach((sec, si) => {
    over(`section ${si + 1} title`, sec.title, LIMITS.sectionTitle);
    (sec.cards || []).forEach((c, ci) => {
      const w = `section ${si + 1} card ${ci + 1}`;
      over(`${w} tag`, c.tag, LIMITS.tag);
      over(`${w} title`, c.title, LIMITS.cardTitle);
      over(`${w} proof line`, c.proof, LIMITS.cardProof);
      over(`${w} body`, c.body, LIMITS.cardBody);
    });
  });
  return out;
}

const has = (cmd, args = ["--version"]) => {
  try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { return false; }
};

function countPages(pdfPath) {
  if (has("pdfinfo", ["-v"])) {
    const m = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" }).match(/Pages:\s+(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  const pdf = fs.readFileSync(pdfPath, "latin1");
  return (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
}

// Every text line in the PDF: { x, y, words: [text] }. Empty when pdftotext is missing.
function pdfLines(pdfPath) {
  let xml;
  try { xml = execFileSync("pdftotext", ["-bbox-layout", pdfPath, "-"], { encoding: "utf8" }); } catch { return []; }
  const unescape = (t) => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  return [...xml.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([\s\S]*?)<\/line>/g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), words: [...m[3].matchAll(/<word[^>]*>([^<]*)<\/word>/g)].map((w) => unescape(w[1])) }))
    .filter((l) => l.words.length);
}

// Body text must not end with a short last line: when the intro or a card's body wraps,
// its last line needs 3 words or more. Finds each text's lines in the PDF (same left edge,
// one under the other, words in order) and returns a problem for each 1 or 2 word ending.
// The fix is to shorten that text (cut filler, never a number or a fact) until it takes
// one line less, then render again.
function shortLastLines(lines, texts) {
  const key = (w) => String(w).toLowerCase().replace(/[^a-z0-9%$]/g, "");
  const out = [];
  for (const { label, text } of texts) {
    const want = String(text || "").split(/\s+/).map(key).filter(Boolean);
    if (!want.length) continue;
    for (const start of lines) {
      const words = (l) => l.words.map(key).filter(Boolean);
      const fits = (l, at) => { const w = words(l); return w.length && w.every((x, i) => want[at + i] === x); };
      if (!fits(start, 0)) continue;
      const mine = [start];
      let at = words(start).length;
      while (at < want.length) {
        const prev = mine[mine.length - 1];
        const next = lines.find((l) => Math.abs(l.x - start.x) < 3 && l.y > prev.y + 1 && l.y < prev.y + 25 && fits(l, at));
        if (!next) break;
        mine.push(next);
        at += words(next).length;
      }
      if (at !== want.length) continue;
      const last = mine[mine.length - 1];
      if (mine.length > 1 && words(last).length <= 2) out.push(`${label} ends with "${last.words.join(" ")}" on its last line; shorten it (cut filler, never a number or fact) until it takes one line less`);
      break;
    }
  }
  return out;
}

// Any text in square brackets ("[phone]", "[email]") is a draft gap, not card text.
// Reads the PDF text with pdftotext when it is installed, otherwise the card data.
function findPlaceholders(pdfPath, data) {
  let text;
  try {
    text = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
  } catch (e) {
    const strings = [];
    const walk = (v) => (typeof v === "string" ? strings.push(v) : v && typeof v === "object" && Object.values(v).forEach(walk));
    walk(data);
    text = strings.join("\n");
  }
  return [...new Set(text.replace(/\s+/g, " ").match(/\[[^\[\]]{1,80}\]/g) || [])];
}

async function renderWithPlaywright(html, outPdf, outPng) {
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { throw new Error("playwright not installed"); }
  const launch = {};
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launch);
  try {
    const page = await browser.newPage({ viewport: { width: 1056, height: 816 } }); // 11in x 8.5in at 96dpi
    await page.setContent(html, { waitUntil: "load" });
    const overflow = await page.evaluate(() => {
      const bad = [];
      const fits = (el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
      const top = document.querySelector(".top");
      const text = document.querySelector(".top .text");
      if (text.getBoundingClientRect().bottom > top.getBoundingClientRect().bottom - 8) bad.push("header text runs past the dark band (shorten headline or intro)");
      const headline = document.querySelector(".headline");
      if (headline.getBoundingClientRect().height > 30) bad.push("headline wraps to a second line (shorten it)");
      document.querySelectorAll(".stat").forEach((el, i) => { if (!fits(el)) bad.push(`stat ${i + 1} text overflows its tile`); });
      document.querySelectorAll(".section").forEach((sec, si) => {
        sec.querySelectorAll(".pc").forEach((el, ci) => {
          if (!fits(el)) bad.push(`section ${si + 1} card ${ci + 1} text overflows`);
          const t = el.querySelector(".t");
          if (t && t.getBoundingClientRect().height > 16) bad.push(`section ${si + 1} card ${ci + 1} title wraps (shorten it)`);
        });
      });
      const last = [...document.querySelectorAll(".section")].pop();
      const foot = document.querySelector(".foot");
      if (last && last.getBoundingClientRect().bottom > foot.getBoundingClientRect().top - 4) bad.push("proof cards run into the footer");
      return bad;
    });
    await page.screenshot({ path: outPng });
    await page.pdf({ path: outPdf, width: "11in", height: "8.5in", printBackground: true, preferCSSPageSize: true });
    return { renderer: "Playwright", overflow };
  } finally {
    await browser.close();
  }
}

function renderWithWeasyPrint(htmlPath, outPdf, outPng, data) {
  const py = has("python3") ? "python3" : "python";
  const ready = () => has(py, ["-c", "import weasyprint"]);
  if (!ready()) {
    console.log("Installing WeasyPrint (one time)...");
    try { execFileSync(py, ["-m", "pip", "install", "--user", "--quiet", "weasyprint"], { stdio: "inherit" }); } catch {}
    if (!ready()) {
      try { execFileSync(py, ["-m", "pip", "install", "--user", "--quiet", "--break-system-packages", "weasyprint"], { stdio: "inherit" }); } catch {}
    }
    if (!ready()) throw new Error("No renderer available: Playwright browser missing and WeasyPrint could not be installed.");
  }
  execFileSync(py, ["-m", "weasyprint", htmlPath, outPdf], { stdio: "pipe" });
  if (has("pdftoppm", ["-v"])) {
    const base = outPng.replace(/\.png$/, "");
    execFileSync("pdftoppm", ["-png", "-r", "96", "-singlefile", outPdf, base]);
  }
  // No browser to measure with, so check text lengths against the layout's limits.
  return { renderer: "WeasyPrint", overflow: checkLengths(data) };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.data || !args.out) {
    console.error("Usage: node render-card.js --data card.json --out out/Name_Card.pdf [--html out/card.html]");
    process.exit(2);
  }
  const dataPath = path.resolve(args.data);
  const data = normalize(JSON.parse(fs.readFileSync(dataPath, "utf8")));
  const problems = checkShape(data);

  // The headshot is required. Embed it as a data URI so the page has no external requests.
  // Without one the card still renders (initials) for preview, but QA fails.
  let headshot = "";
  if (!data.photo) {
    headshot = "No headshot. Add a photo to your folder and say: use [file] as my headshot.";
  } else if (!data.photo.startsWith("data:")) {
    const photoPath = path.resolve(path.dirname(dataPath), data.photo);
    if (fs.existsSync(photoPath)) {
      const ext = path.extname(photoPath).slice(1).toLowerCase().replace("jpg", "jpeg");
      data.photo = `data:image/${ext};base64,${fs.readFileSync(photoPath).toString("base64")}`;
    } else {
      headshot = `No headshot (${data.photo} not found). Add a photo to your folder and say: use [file] as my headshot.`;
      data.photo = "";
    }
  }

  const template = fs.readFileSync(path.join(__dirname, "card-template.html"), "utf8");
  const html = template.replace("<!--CARD-->", buildCard(data));

  const outPdf = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPdf), { recursive: true });
  const outPng = outPdf.replace(/\.pdf$/, "-preview.png");

  // Filled HTML goes to a temp folder unless --html asks for a copy.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-card-"));
  const htmlPath = path.join(work, "card.html");
  fs.writeFileSync(htmlPath, html);
  if (typeof args.html === "string") fs.copyFileSync(htmlPath, path.resolve(args.html));

  let result;
  try {
    try {
      result = await renderWithPlaywright(html, outPdf, outPng);
    } catch (e) {
      console.log(`Playwright unavailable (${e.message.split("\n")[0]}). Using WeasyPrint.`);
      result = renderWithWeasyPrint(htmlPath, outPdf, outPng, data);
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  problems.push(...result.overflow);

  const pages = countPages(outPdf);
  if (pages !== 1) problems.push(`expected 1 page, found ${pages}`);
  const placeholders = findPlaceholders(outPdf, data);
  const bodyTexts = [{ label: "intro", text: data.intro }];
  (data.sections || []).forEach((sec, i) => (sec.cards || []).forEach((c, j) => bodyTexts.push({ label: `section ${i + 1} card ${j + 1} body`, text: c.body })));
  const lines = pdfLines(outPdf);
  const short = shortLastLines(lines, bodyTexts);

  console.log(`Rendered with ${result.renderer}`);
  console.log("Wrote " + outPdf);
  if (fs.existsSync(outPng)) console.log("Wrote " + outPng);
  console.log("\nQA");
  console.log(`  [${pages === 1 ? "PASS" : "FAIL"}] Page count: ${pages} (landscape 11 x 8.5 in)`);
  console.log(`  [${problems.length ? "FAIL" : "PASS"}] Layout: ${problems.join("; ") || `4 ${useTiles(data) ? "skill tiles" : "stats"}, 2 sections of 4 cards, no overflow`}`);
  console.log(`  [${placeholders.length ? "FAIL" : "PASS"}] No unfilled placeholders: ${placeholders.join(", ") || "none"}`);
  console.log(`  [${short.length ? "FAIL" : "PASS"}] No body text ends with 1 or 2 words on its last line: ${short.join("; ") || (lines.length ? "clean" : "not checked (pdftotext not installed)")}`);
  console.log(`  [${headshot ? "FAIL" : "PASS"}] Headshot: ${headshot || "photo embedded"}`);
  console.log("  Look at the preview PNG before sending.");
  process.exit(problems.length || placeholders.length || short.length || headshot ? 1 : 0);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = { buildCard, normalize, checkLengths, checkShape, repeatsTitle, noSlogans, sloganProblems, valueProblems, shortLastLines, pdfLines, LIMITS };
