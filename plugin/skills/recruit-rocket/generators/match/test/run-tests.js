#!/usr/bin/env node
// Tests for score.js and build-report.js. Run with: npm test
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { score, band, validate } = require("../score");

const root = path.join(__dirname, "..");
const sample = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "match.json"), "utf8"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-match-test-"));
const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}
const req = (kind, rating) => ({ kind, rating, text: `${kind} ${rating}`, reason: "r", quote: rating === "not" ? "" : "q" });

// 1. Points and bands.
{
  expect("the sample scores 72 (13 of 18 points)", `${score(sample).score} ${score(sample).earned} ${score(sample).possible}`, "72 13 18");
  expect("all must-haves and nice-to-haves met is 100", score({ requirements: [req("must", "met"), req("nice", "met")] }).score, 100);
  expect("partly met earns half", score({ requirements: [req("must", "partly")] }).score, 50);
  expect("a must-have counts 3 times a nice-to-have", score({ requirements: [req("must", "met"), req("nice", "not")] }).score, 75);
  expect("80 is Shortlist", band(80), "Shortlist");
  expect("79 is Maybe", band(79), "Maybe");
  expect("60 is Maybe", band(60), "Maybe");
  expect("59 is Unlikely", band(59), "Unlikely");
}

// 2. Rules on match.json.
{
  expect("the sample passes", validate(sample).length, 0);
  const six = { requirements: Array.from({ length: 6 }, () => req("must", "met")) };
  expect("6 must-haves fail", validate(six).some((p) => p.includes("6 must-haves")), true);
  const four = { requirements: [req("must", "met"), ...Array.from({ length: 4 }, () => req("nice", "met"))] };
  expect("4 nice-to-haves fail", validate(four).some((p) => p.includes("4 nice-to-haves")), true);
  const noQuote = { requirements: [{ kind: "must", rating: "met", text: "X", reason: "r", quote: "" }] };
  expect("a Met item with no resume quote fails", validate(noQuote).some((p) => p.includes("quote the resume")), true);
  const evidence = { requirements: [req("must", "met")], evidence: Array.from({ length: 11 }, () => ({ claim: "c", rating: "well", quote: "q" })) };
  expect("11 evidence claims fail", validate(evidence).some((p) => p.includes("11 evidence")), true);
  const cli = spawnSync("node", [path.join(root, "score.js"), "--data", path.join(root, "sample-data", "match.json")], { encoding: "utf8" });
  expect("the CLI prints the score and band", cli.stdout.split("\n")[0], "Match Score: 72 of 100 (Maybe)");
}

// 3. The report: one page, before and after, QA failures.
{
  const out = path.join(work, "Jordan_Rivera_Match_Report_Harborline.pdf");
  const r = spawnSync("node", [path.join(root, "build-report.js"), "--data", path.join(root, "sample-data", "report.json"), "--out", out], { encoding: "utf8" });
  expect("the sample report builds and passes QA", r.status, 0);
  expect("it shows the score before and after", (r.stdout.match(/Match Score: .*/) || [""])[0], "Match Score: 72 of 100 (Maybe) before, 81 of 100 (Shortlist) after");
  const text = spawnSync("pdftotext", [out, "-"], { encoding: "utf8" }).stdout || "";
  expect("the report names the executive and the dated source", text.includes("Priya Natarajan") && text.includes("2026-01-14") ? "yes" : "no", "yes");
  const waiting = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "report.json"), "utf8"));
  waiting.before = path.join(root, "sample-data", "match.json");
  waiting.after = path.join(root, "sample-data", "match-after.json");
  waiting.files = waiting.files.map((f) => (f.label === "Baseball card" ? { label: f.label, note: "waiting for a photo" } : { ...f, path: path.join(root, "sample-data", f.path) }));
  const wPath = path.join(work, "waiting.json");
  fs.writeFileSync(wPath, JSON.stringify(waiting));
  const wOut = path.join(work, "waiting.pdf");
  const w = spawnSync("node", [path.join(root, "build-report.js"), "--data", wPath, "--out", wOut], { encoding: "utf8" });
  const wText = spawnSync("pdftotext", [wOut, "-"], { encoding: "utf8" }).stdout || "";
  expect("a card waiting for a photo is listed without a link", `${w.status} ${wText.includes("waiting for a photo")}`, "0 true");
  expect("the report offers the two next steps", text.includes("Find more jobs like this one") && text.includes("Set up my full search") ? "yes" : "no", "yes");

  const bad = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "report.json"), "utf8"));
  bad.before = path.join(root, "sample-data", "match.json");
  bad.after = null;
  bad.executive = { missing: "no dated source \u2014 checked the site" };
  bad.files = [{ label: "Tailored resume", path: path.join(work, "missing.pdf") }];
  const badPath = path.join(work, "bad.json");
  fs.writeFileSync(badPath, JSON.stringify(bad));
  const b = spawnSync("node", [path.join(root, "build-report.js"), "--data", badPath, "--out", path.join(work, "bad.pdf")], { encoding: "utf8" });
  expect("a dash or a missing file fails the report QA", b.status === 1 && /dash/.test(b.stderr) && /file not found/.test(b.stderr) ? "fails" : "passes", "fails");
}

fs.rmSync(work, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.caseName}${r.ok ? "" : `  (got ${JSON.stringify(r.actual)}, wanted ${JSON.stringify(r.wanted)})`}`);
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
