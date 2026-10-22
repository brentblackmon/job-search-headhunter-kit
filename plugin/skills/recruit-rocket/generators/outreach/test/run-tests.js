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
  // The opening carries the best-fit value statement.
  expect("an email with no valueStatement fails", has({ ...sample, valueStatement: undefined }, /no valueStatement/), true);
  expect("an opening without the value statement fails", has(withBody((b) => b.replace("Slow go-lives delay revenue. I run implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks.", "That's work I've done.")), /carry value statement/), true);
  expect('"That\'s work I\'ve done." fails (the value statement replaces it)', has(withBody((b) => b.replace("in 60 days. Slow", "in 60 days. That's work I've done. Slow")), /value statement replaces it/), true);
  // Connectors: up to 2, dated, labeled, with the event, the value statement, and the ask.
  const conn = sample.connectors[0];
  const withConn = (x) => ({ ...sample, connectors: [{ ...conn, ...x }] });
  expect("3 connectors fail (2 at most)", has({ ...sample, connectors: [conn, { ...conn, name: "Sam Ortiz" }, { ...conn, name: "Lee Park" }] }, /2 at most/), true);
  expect("a connector type outside the list fails", has(withConn({ type: "friend" }), /must be one of/), true);
  expect("a connector with an undated source fails", has(withConn({ date: "" }), /dated source/), true);
  expect("a connector source over 12 months old fails", has(withConn({ date: "2024-02-01" }), /over 12 months old/), true);
  expect("a connector email marked not found fails", has(withConn({ email: "elena@saltmarsh.example" }), /needs VERIFIED or PATTERN GUESS/), true);
  expect("a pattern-guess connector email passes", check(withConn({ email: "elena.brooks@saltmarsh.example", addressStatus: "PATTERN GUESS, NOT VERIFIED" })).length, 0);
  expect('a connector note without "who should I talk to" fails', has(withConn({ note: conn.note.replace(/Who should I talk to there about/, "Could we talk about") }), /Who should I talk to/), true);
  expect("a connector note without the event's date fails", has(withConn({ note: conn.note.replace(" in May 2026", "") }), /month and year/), true);
  expect("a connector note without the value statement fails", has(withConn({ note: "Hi Elena, I saw Saltmarsh Capital invested in Harborline in May 2026. Who should I talk to there?" }), /carry the value statement/), true);
  expect("the hiring executive cannot be a connector", has(withConn({ name: "Priya Natarajan" }), /is the hiring executive/), true);
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
