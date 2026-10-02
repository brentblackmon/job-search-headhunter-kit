#!/usr/bin/env node
// Renders org-chart.html to org-chart.png at 1080 x 1350 (LinkedIn portrait).
// Uses the Playwright install from plugin/skills/recruit-rocket/generators/baseball-card (run npm install there first).
const path = require("path");
const { chromium } = require(path.join(__dirname, "../plugin/skills/recruit-rocket/generators/baseball-card/node_modules/playwright"));

(async () => {
  const launch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(__dirname, "org-chart.html"));
  const overflow = await page.evaluate(() => document.body.scrollHeight > 1350 || document.body.scrollWidth > 1080);
  await page.screenshot({ path: path.join(__dirname, "org-chart.png") });
  await browser.close();
  console.log("Wrote marketing/org-chart.png" + (overflow ? " (WARNING: content overflows 1080 x 1350)" : ""));
})();
