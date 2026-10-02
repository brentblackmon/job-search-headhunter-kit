#!/usr/bin/env node
// Regression tests for render-card.js. Run with: npm test
// Each case renders the fictional sample card with a few changes, then reads the QA
// lines the script prints. Needs the same tools as the script.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const sample = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "card.json"), "utf8"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-card-test-"));

function render(name, change) {
  const data = JSON.parse(JSON.stringify(sample));
  change(data);
  if (data.photo) data.photo = path.join(root, "sample-data", data.photo);
  const dataPath = path.join(work, `${name}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  const out = spawnSync("node", [path.join(root, "render-card.js"), "--data", dataPath, "--out", path.join(work, `${name}.pdf`)], { encoding: "utf8" });
  const text = out.stdout + out.stderr;
  const check = (label) => {
    const line = text.split("\n").find((l) => l.includes(`] ${label}`)) || "";
    return line.includes("[PASS]") ? "PASS" : line.includes("[FAIL]") ? "FAIL" : "MISSING";
  };
  return { text, check, status: out.status };
}

const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}

// 1. The sample card has no placeholders.
{
  const r = render("sample", () => {});
  expect("sample card passes the placeholder check", r.check("No unfilled placeholders"), "PASS");
}

// 2. Placeholders left in the contact line fail QA.
{
  const r = render("placeholders", (d) => {
    d.contact = ["[phone]", "[email]", "linkedin.com/in/tester-example"];
  });
  expect("[phone] and [email] in the contact line fail", r.check("No unfilled placeholders"), "FAIL");
  expect("the script exits with an error", r.status === 0 ? "exit 0" : "exit 1", "exit 1");
}

fs.rmSync(work, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.caseName}${r.ok ? "" : ` (got ${r.actual}, wanted ${r.wanted})`}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
