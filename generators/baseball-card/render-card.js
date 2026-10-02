#!/usr/bin/env node
// Renders a one-page landscape US Letter baseball card PDF from card.json.
//
// Usage:
//   node render-card.js --data card.json --out out/First_Last_Card_Company.pdf [--html out/card.html]
//
// Writes the PDF and a PNG preview next to it, then checks: exactly 1 page,
// landscape, 4 stats, 8 proof cards, no content overflow.
//
// Renderer: Playwright (Chromium) when a browser is available. If Playwright or its
// browser is missing (common in sandboxes that block the browser download), it falls
// back to WeasyPrint (Python), installing it with pip if needed. Both print the same
// filled HTML, so the layout matches. The overflow check needs a browser; under
// WeasyPrint the script checks page count and text length instead.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

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

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function buildCard(d) {
  const initials = d.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return `
    <section class="top">
      <div class="photo">${d.photo ? `<img src="${esc(d.photo)}" alt="">` : esc(initials)}</div>
      <div>
        <div class="name">${esc(d.name)}</div>
        <div class="headline">${esc(d.headline)}</div>
        <div class="positioning">${esc(d.positioning)}</div>
      </div>
    </section>
    <section class="stats">
      ${d.stats.map((s) => `<div class="stat"><div class="v">${esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`).join("")}
    </section>
    <section class="proof">
      ${[d.proof.slice(0, 4), d.proof.slice(4, 8)].map((row) => `<div class="prow">${row.map((p) => `<div class="pc"><div class="t">${esc(p.title)}</div><div class="r">${esc(p.result)}</div><div class="w">${esc(p.where)}</div></div>`).join("")}</div>`).join("")}
    </section>
    <footer class="foot">${d.contact.map((c) => `<span>${esc(c)}</span>`).join("")}</footer>`;
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
      const card = document.getElementById("card");
      if (card.scrollHeight > card.clientHeight + 1) bad.push("card content taller than the page");
      document.querySelectorAll(".pc").forEach((el, i) => {
        const r = el.querySelector(".r").getBoundingClientRect();
        const w = el.querySelector(".w").getBoundingClientRect();
        if (el.scrollHeight > el.clientHeight + 1 || r.bottom > w.top - 2) bad.push(`proof card ${i + 1} text overflows`);
      });
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
  // No browser to measure overflow, so flag result lines long enough to risk it.
  const overflow = [];
  data.proof.forEach((p, i) => {
    const text = String(p.result).trim();
    const words = text.split(/\s+/).length;
    if (words > 18) overflow.push(`proof card ${i + 1} result is ${words} words (max 18)`);
    else if (text.length > 115) overflow.push(`proof card ${i + 1} result is ${text.length} characters (max about 115)`);
  });
  return { renderer: "WeasyPrint", overflow };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.data || !args.out) {
    console.error("Usage: node render-card.js --data card.json --out out/Name_Card.pdf [--html out/card.html]");
    process.exit(2);
  }
  const dataPath = path.resolve(args.data);
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const problems = [];
  if (data.stats.length !== 4) problems.push(`expected 4 stats, found ${data.stats.length}`);
  if (data.proof.length !== 8) problems.push(`expected 8 proof cards, found ${data.proof.length}`);

  // Embed a local photo as a data URI so the page has no external requests.
  if (data.photo && !data.photo.startsWith("data:")) {
    const photoPath = path.resolve(path.dirname(dataPath), data.photo);
    const ext = path.extname(photoPath).slice(1).toLowerCase().replace("jpg", "jpeg");
    data.photo = `data:image/${ext};base64,${fs.readFileSync(photoPath).toString("base64")}`;
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

  console.log(`Rendered with ${result.renderer}`);
  console.log("Wrote " + outPdf);
  if (fs.existsSync(outPng)) console.log("Wrote " + outPng);
  console.log("\nQA");
  console.log(`  [${pages === 1 ? "PASS" : "FAIL"}] Page count: ${pages} (landscape 11 x 8.5 in)`);
  console.log(`  [${problems.length ? "FAIL" : "PASS"}] Layout: ${problems.join("; ") || "4 stats, 8 proof cards, no overflow"}`);
  console.log("  Look at the preview PNG before sending.");
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
