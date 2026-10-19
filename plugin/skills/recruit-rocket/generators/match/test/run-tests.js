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
  waiting.outreach = path.join(root, "..", "outreach", "sample-data", "outreach.json");
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
  bad.outreach = path.join(root, "..", "outreach", "sample-data", "outreach.json");
  bad.before = path.join(root, "sample-data", "match.json");
  bad.after = null;
  bad.executive = { missing: "no dated source \u2014 checked the site" };
  bad.files = [{ label: "Tailored resume", path: path.join(work, "missing.pdf") }];
  const badPath = path.join(work, "bad.json");
  fs.writeFileSync(badPath, JSON.stringify(bad));
  const b = spawnSync("node", [path.join(root, "build-report.js"), "--data", badPath, "--out", path.join(work, "bad.pdf")], { encoding: "utf8" });
  expect("a dash or a missing file fails the report QA", b.status === 1 && /dash/.test(b.stderr) && /file not found/.test(b.stderr) ? "fails" : "passes", "fails");
}

// 4. Required skills covered counts Met must-haves only; executive matches the outreach.
{
  const { mustHaves, blockers } = require("../score");
  const allPartly = { requirements: Array.from({ length: 5 }, (_, i) => ({ kind: "must", rating: i ? "met" : "partly", text: `m${i}`, reason: "r", quote: "q" })) };
  expect("4 Met and 1 Partly met reads 4 of 5, never 5 of 5", mustHaves(allPartly).line, "Required skills covered: 4 of 5");
  expect("Not shown must-haves are listed for the Build anyway question", blockers({ requirements: [{ kind: "must", rating: "not", text: "Gainsight" }, { kind: "nice", rating: "not", text: "Jira" }] }).join(), "Gainsight");
  const base = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "report.json"), "utf8"));
  const fix = (o) => ({ ...base, before: path.join(root, "sample-data", "match.json"), after: path.join(root, "sample-data", "match-after.json"), outreach: path.join(root, "..", "outreach", "sample-data", "outreach.json"), files: base.files.map((f) => ({ ...f, path: path.join(root, "sample-data", f.path) })), ...o });
  const runR = (name, data) => { const p = path.join(work, name + ".json"); fs.writeFileSync(p, JSON.stringify(data)); return spawnSync("node", [path.join(root, "build-report.js"), "--data", p, "--out", path.join(work, name + ".pdf")], { encoding: "utf8" }); };
  const claim = runR("claim", fix({ keywords: ["Required skills covered: 5 of 5", "Exact-term matches: 4 of 11"] }));
  expect("a keyword line claiming 5 of 5 with a Partly met must-have fails QA", claim.status === 1 && /disagrees with the must-haves/.test(claim.stderr) ? "fails" : "passes", "fails");
  const ok = runR("ok", fix({}));
  const okText = spawnSync("pdftotext", [path.join(work, "ok.pdf"), "-"], { encoding: "utf8" }).stdout || "";
  expect("the report prints the computed must-haves line", `${ok.status} ${okText.includes("Required skills covered: 4 of 5")}`, "0 true");
  const other = runR("other", fix({ executive: { name: "Sam Lee", title: "CEO", source: "x", sourceDate: "2026-01-01", confirmed: true } }));
  expect("an executive that differs from the outreach contact fails QA", other.status === 1 && /does not match the outreach contact/.test(other.stderr) ? "fails" : "passes", "fails");
  const label = runR("label", fix({ executive: { ...base.executive, confirmed: false } }));
  expect("confirmed on one side and not the other fails QA", label.status === 1 && /not confirmed/.test(label.stderr) ? "fails" : "passes", "fails");
}

// 5. Hard gates, found before anything is built.
{
  const { findGates } = require("../gates");
  const posting = fs.readFileSync(path.join(root, "sample-data", "posting-gated.md"), "utf8");
  const g = findGates(posting, "", "2026-10-19");
  const ask = (t) => (g.find((x) => x.type === t) || {}).status;
  expect("Canada and US work authorization is a gate to ask about", ask("work authorization"), "ask");
  expect("the question names both countries", g.find((x) => x.type === "work authorization").question, "The posting requires authorization to work in Canada and the United States. Do you have it?");
  expect("a required degree is a gate", ask("degree"), "ask");
  expect('"5+ years with Salesforce" is a gate', g.some((x) => x.type === "years in" && /Salesforce/.test(x.need)), true);
  expect("a posting from Apr 27 read on Oct 19 is 175 days old and flagged", (g.find((x) => x.type === "posting age") || {}).days, 175);
  const facts = "- Work authorization: United States, Canada\n- Education: B.S. Business\n- Tools: Salesforce\n- Industry: vertical software\n";
  const met = findGates(posting, facts, "2026-10-19").filter((x) => x.status === "ask").map((x) => x.type).join();
  expect("facts.md that shows each gate leaves only the posting age to ask", met, "posting age");
  const usOnly = findGates(posting, "- Work authorization: United States\n", "2026-10-19");
  expect("US-only authorization does not meet a Canada and US requirement", usOnly.find((x) => x.type === "work authorization").status, "ask");
  const fresh = findGates("Posted 2026-10-10. Must be authorized to work in the US.", "- Work authorization: US citizen\n", "2026-10-19");
  expect("a 9-day-old posting is not flagged for age", fresh.some((x) => x.type === "posting age"), false);
  expect("US authorization in facts.md meets a US requirement", fresh.find((x) => x.type === "work authorization").status, "met");
  const cli = spawnSync("node", [path.join(root, "gates.js"), "--posting", path.join(root, "sample-data", "posting-gated.md"), "--today", "2026-10-19"], { encoding: "utf8" });
  expect("the CLI exits 3 when a question is needed", cli.status, 3);
}

// 6. Answers reach every file: the stale check finds an old phrase in any file type.
{
  const { staleFiles } = require("../stale-check");
  const dir = path.join(work, "stale");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "facts.md"), "- Education: Wharton, completed October 2026\n");
  fs.writeFileSync(path.join(dir, "card.json"), JSON.stringify({ intro: "MBA, Wharton, expected October 2026" }));
  fs.copyFileSync(path.join(work, "ok.pdf"), path.join(dir, "report.pdf"));
  const hits = staleFiles(fs.readdirSync(dir).map((f) => path.join(dir, f)), ["expected October 2026"]);
  expect("the stale check finds the old phrase in the card data", hits.map((h) => path.basename(h.file)).join(), "card.json");
  const cli = spawnSync("node", [path.join(root, "stale-check.js"), "--dir", dir, "--old", "Expected  October 2026"], { encoding: "utf8" });
  expect("the CLI fails while any file still says it (case and spacing ignored)", cli.status, 1);
  fs.writeFileSync(path.join(dir, "card.json"), JSON.stringify({ intro: "MBA, Wharton, October 2026" }));
  const clean = spawnSync("node", [path.join(root, "stale-check.js"), "--dir", dir, "--old", "expected October 2026"], { encoding: "utf8" });
  expect("the CLI passes once every file is updated", clean.status, 0);
}

fs.rmSync(work, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.caseName}${r.ok ? "" : `  (got ${JSON.stringify(r.actual)}, wanted ${JSON.stringify(r.wanted)})`}`);
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
