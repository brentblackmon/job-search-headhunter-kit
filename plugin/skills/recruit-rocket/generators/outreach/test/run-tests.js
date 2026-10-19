#!/usr/bin/env node
// Tests for build-outreach.js. Run with: npm test
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { check, checkAlumni } = require("../build-outreach");

const root = path.join(__dirname, "..");
const sample = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "outreach.json"), "utf8"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-outreach-test-"));
const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}
const note = (school, text) => checkAlumni([{ school, note: text }]);

{
  expect("the sample passes", check(sample).length, 0);
  expect('"Tar Heel" in an NC State note fails', note("NC State University", "Fellow NC State Tar Heel here. Open to a chat?").some((p) => p.includes("tar heel")), true);
  expect('"Tar Heel" in a Wharton note fails', note("The Wharton School", "Fellow Wharton Tar Heel here. Open to a chat?").some((p) => p.includes("tar heel")), true);
  expect('"Tar Heel" in a UNC note is fine', note("UNC Chapel Hill", "Fellow Tar Heel from UNC here. Open to a chat?").length, 0);
  expect('"Wolfpack" in an NC State note is fine', note("NC State University", "Fellow NC State Wolfpack alum here. Open to a chat?").length, 0);
  expect("a note that never names its school fails", note("NC State University", "Fellow alum here. Open to a chat?").some((p) => p.includes("does not name")), true);
  expect("two notes for one school fail", checkAlumni([{ school: "NC State", note: "NC State grad here." }, { school: "NC State", note: "NC State alum here." }]).some((p) => p.includes("one per school")), true);
  expect("a LinkedIn note over 300 characters fails", check({ ...sample, linkedinNote: "x".repeat(301) }).some((p) => p.includes("LinkedIn note")), true);
  expect("a spaced hyphen fails", check({ ...sample, linkedinNote: "Priya - quick note" }).some((p) => p.includes("spaced hyphen")), true);
  const out = path.join(work, "Jordan_Rivera_Outreach_Harborline.docx");
  const r = spawnSync("node", [path.join(root, "build-outreach.js"), "--data", path.join(root, "sample-data", "outreach.json"), "--out", out], { encoding: "utf8" });
  expect("the CLI writes a .docx and passes", `${r.status} ${fs.existsSync(out) && fs.statSync(out).size > 2000}`, "0 true");
}

fs.rmSync(work, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.caseName}${r.ok ? "" : `  (got ${JSON.stringify(r.actual)}, wanted ${JSON.stringify(r.wanted)})`}`);
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
