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
  // The sample photo lives next to the sample card; point to it from the temp folder.
  if (data.photo && fs.existsSync(path.join(root, "sample-data", data.photo))) data.photo = path.join(root, "sample-data", data.photo);
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

// 2. The headshot is required: an empty photo or a missing file fails, with the fix in the message.
{
  const ok = render("with-photo", () => {});
  expect("sample card with a photo passes the headshot check", ok.check("Headshot"), "PASS");
  const none = render("no-photo", (d) => { d.photo = ""; });
  expect("an empty photo fails the headshot check", none.check("Headshot"), "FAIL");
  expect("the message says how to add one", none.text.includes("Add a photo to your folder and say: use [file] as my headshot.") ? "says" : "missing", "says");
  const gone = render("missing-photo", (d) => { d.photo = "not-here.jpg"; });
  expect("a photo file that does not exist fails", gone.check("Headshot"), "FAIL");
  expect("a missing photo makes the script exit with an error", gone.status === 0 ? "exit 0" : "exit 1", "exit 1");
}

// 3. Placeholders left in the contact line fail QA.
{
  const r = render("placeholders", (d) => {
    d.contact = ["[phone]", "[email]", "linkedin.com/in/tester-example"];
  });
  expect("[phone] and [email] in the contact line fail", r.check("No unfilled placeholders"), "FAIL");
  expect("the script exits with an error", r.status === 0 ? "exit 0" : "exit 1", "exit 1");
}

// 4. Student card: skills and experience tiles in place of numeric stats.
{
  const stu = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "card-student.json"), "utf8"));
  const renderStudent = (name, change) => render(name, (d) => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, JSON.parse(JSON.stringify(stu))); change(d); });
  const ok = renderStudent("student", () => {});
  expect("a student card with 4 tiles passes the layout check", ok.check("Layout"), "PASS");
  expect("the layout line says skill tiles", ok.text.includes("4 skill tiles") ? "tiles" : "other", "tiles");
  const three = renderStudent("student-3", (d) => { d.tiles = d.tiles.slice(0, 3); });
  expect("3 tiles fail the layout check", three.check("Layout"), "FAIL");
}

fs.rmSync(work, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.caseName}${r.ok ? "" : ` (got ${r.actual}, wanted ${r.wanted})`}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
