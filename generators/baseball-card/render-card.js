#!/usr/bin/env node
// Renders a one-page landscape US Letter baseball card PDF from card.json.
//
// Usage:
//   node render-card.js --data card.json --out out/First_Last_Card_Company.pdf
//
// Writes the PDF and a PNG preview next to it, then checks: exactly 1 page,
// landscape, 4 stats, 8 proof cards, no content overflow.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.data || !args.out) {
    console.error("Usage: node render-card.js --data card.json --out out/Name_Card.pdf");
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
  const html = template.replace("/*DATA*/null", JSON.stringify(data).replace(/</g, "\\u003c"));

  const outPdf = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPdf), { recursive: true });
  const outPng = outPdf.replace(/\.pdf$/, "-preview.png");

  const launch = {};
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1056, height: 816 } }); // 11in x 8.5in at 96dpi
  await page.setContent(html, { waitUntil: "load" });

  // Overflow check: any proof card or the card itself scrolling means text was cut off.
  const overflow = await page.evaluate(() => {
    const bad = [];
    const card = document.getElementById("card");
    if (card.scrollHeight > card.clientHeight + 1) bad.push("card content taller than the page");
    document.querySelectorAll(".pc").forEach((el, i) => {
      if (el.scrollHeight > el.clientHeight + 1) bad.push(`proof card ${i + 1} text overflows`);
    });
    return bad;
  });
  problems.push(...overflow);

  await page.screenshot({ path: outPng });
  await page.pdf({ path: outPdf, width: "11in", height: "8.5in", printBackground: true, preferCSSPageSize: true });
  await browser.close();

  const pdf = fs.readFileSync(outPdf, "latin1");
  const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (pages !== 1) problems.push(`expected 1 page, found ${pages}`);

  console.log("Wrote " + outPdf);
  console.log("Wrote " + outPng);
  console.log("\nQA");
  console.log(`  [${pages === 1 ? "PASS" : "FAIL"}] Page count: ${pages} (landscape 11 x 8.5 in)`);
  console.log(`  [${problems.length ? "FAIL" : "PASS"}] Layout: ${problems.join("; ") || "4 stats, 8 proof cards, no overflow"}`);
  console.log("  Look at the preview PNG before sending.");
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  if (/Executable doesn't exist/.test(e.message)) {
    console.error("Install the browser once with: npx playwright install chromium");
  }
  process.exit(1);
});
