#!/usr/bin/env node
// Prints scripts/quickstart/QUICKSTART.html to plugin/skills/recruit-rocket/QUICKSTART.pdf (one page).
// Uses the baseball card generator's Playwright install. Run: node scripts/build-quickstart.js
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const root = path.join(__dirname, "..");
let pw;
for (const p of ["playwright", path.join(root, "plugin/skills/recruit-rocket/generators/baseball-card/node_modules/playwright")]) { try { pw = require(p); break; } catch {} }
if (!pw) { console.error("Playwright not found; run npm install in generators/baseball-card first."); process.exit(1); }
(async () => {
  const out = path.join(root, "plugin/skills/recruit-rocket/QUICKSTART.pdf");
  const html = fs.readFileSync(path.join(__dirname, "quickstart/QUICKSTART.html"), "utf8");
  if (/[\u2013\u2014]/.test(html)) { console.error("QUICKSTART.html has an em or en dash."); process.exit(1); }
  const browser = await pw.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  const pages = Number((execFileSync("pdfinfo", [out], { encoding: "utf8" }).match(/Pages:\s+(\d+)/) || [])[1]);
  if (pages !== 1) { console.error(`QUICKSTART.pdf is ${pages} pages; it must be 1.`); process.exit(1); }
  console.log(`Wrote ${out} (1 page).`);
})().catch((e) => { console.error(e.message); process.exit(1); });
