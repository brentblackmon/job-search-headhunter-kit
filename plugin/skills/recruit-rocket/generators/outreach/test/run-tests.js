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
  // The email template, line by line.
  const withBody = (f) => ({ ...sample, email: { ...sample.email, body: f(sample.email.body) } });
  const has = (d, re) => check(d).some((p) => re.test(p));
  expect("a slogan subject fails", has({ ...sample, email: { ...sample.email, subject: "Profitable services. AI past R&D." } }, /slogan|does not name the role/), true);
  expect("a stock opening line fails", has(withBody((b) => b.replace("In August 2026", "Most services teams get faster with AI before they get more profitable. In August 2026")), /stock line/), true);
  expect("an undated first line fails", has(withBody((b) => b.replace("In August 2026 Harborline", "Harborline")), /dated company fact/), true);
  expect('a missing "Regards," fails', has(withBody((b) => b.replace("Regards,\n", "")), /Regards/), true);
  expect("a signature with no email address fails", has(withBody((b) => b.replace("jordan.rivera@example.com\n", "")), /email address/), true);
  expect("a website set in facts must be in the signature", has({ ...sample, signature: { ...sample.signature, website: "jordanrivera.example/ops" } }, /website/), true);
  expect("3 I've bullets fail (needs 4 to 6)", has(withBody((b) => b.replace(/- \*\*I've integrated[^\n]*\n/, "")), /4 to 6/), true);
  // The recipient: 12 months, or no recipient.
  const stale = { ...sample, contact: { ...sample.contact, date: "2021-03-02" } };
  expect("a contact confirmed only by a 2021 source fails", has(stale, /over 12 months old/), true);
  const none = { ...sample, contact: { name: "Morgan Hale", title: "CEO", confirmed: false, note: "only a 2021 release" } };
  expect("an unconfirmed contact cannot be the email's recipient", has(none, /not confirmed; leave "to" empty/), true);
  const noneOk = { ...none, email: { ...sample.email, to: "", addressStatus: "no recipient", body: sample.email.body.replace("Hi Priya,", "Hello,") } };
  expect("an unconfirmed contact with no recipient and a plain greeting passes", check(noneOk).length, 0);
  // Warm mode.
  const warm = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "outreach-warm.json"), "utf8"));
  expect("the warm sample passes", check(warm).length, 0);
  expect("warm mode with the cold contact fails", has({ ...warm, contact: { name: "Morgan Hale", title: "CEO", confirmed: true, source: "x", date: "2026-09-01" } }, /must be the warm contact/), true);

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
