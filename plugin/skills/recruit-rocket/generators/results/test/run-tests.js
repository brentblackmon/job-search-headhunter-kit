#!/usr/bin/env node
// Tests for build-results.js. Run with: npm test
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { build, gate, lint } = require("../build-results");

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "sample-data", "results.json"), "utf8"));
const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}
const T = "2026-10-20";
const posting = (o) => ({ title: "IT Director", company: "Co", location: "Columbus, OH", link: "https://example.com/x", posted: "2026-10-18", pay: "$130K", grade: "A", why: "fit", gap: "", ...o });

// 1. Grading gates.
{
  expect("31 days old cannot be A or B", gate(posting({ posted: "2026-09-19" }), T).old, true);
  expect("30 days old still can", gate(posting({ posted: "2026-09-20" }), T).old, false);
  expect("no posting date cannot be A or B", gate(posting({ posted: "" }), T).old, true);
  expect("a hard requirement the user cannot meet caps at C", gate(posting({ hardRequirement: "UK work authorization" }), T).grade, "C");
  expect("below the target level is C", gate(posting({ belowLevel: true }), T).grade, "C");
  expect("under the pay floor is C", gate(posting({ underFloor: true }), T).grade, "C");
  expect("a clean A stays A", gate(posting({}), T).grade, "A");
}

// 2. The card on the sample.
{
  const out = build(sample);
  expect("top picks: only the 3 that pass every gate (a target-company opening included)", out.picks.map((p) => p.company).join(", "), "Acme Manufacturing, Granite Systems, Buckeye Freight");
  expect("A before B, freshest first, Apply today under 48 hours", /1\. \*\*IT Director\*\*, Acme.*Apply today/.test(out.card) && !/Buckeye.*Apply today/.test(out.card) ? "yes" : "no", "yes");
  expect("already applied is skipped and listed in one line", out.card.includes("Already applied, skipped: Northwind Plastics.") && !out.picks.some((p) => p.company === "Northwind Plastics") ? "yes" : "no", "yes");
  expect("a 49-day-old A goes to Older but still open", out.older.map((p) => p.company).join(), "Lakeview Health");
  expect("capped postings are counted in the checked line", /2 capped at C/.test(out.card) ? "yes" : "no", "yes");
  expect("a signal with no named, dated contact goes to Also seen", out.alsoSeen.map((s) => s.company).join(), "Granite Systems");
  expect("fewer than 3 real signals is said plainly", out.card.includes("Only 1 real signal this time. I did not pad the list.") ? "yes" : "no", "yes");
  expect("recruiter postings older than 30 days are dropped", out.recruiters.map((x) => x.name).join(), "Hartwell Search Partners");
  expect("no clusters says Checked: none found, with what was checked", /Hiring clusters\*\*\nChecked: none found\. Looked for 2 or more/.test(out.card) ? "yes" : "no", "yes");
  expect("a partial source shows as 'partial', not an error", out.card.includes("ZipRecruiter: partial") ? "yes" : "no", "yes");
  expect("elapsed time is reported", out.card.includes("Search took 2.5 min.") ? "yes" : "no", "yes");
  expect("the signals file has no empty heading", /## Hiring clusters/.test(out.signals) ? "has it" : "left out", "left out");
  expect("the sample passes the lint", lint(out.card).concat(lint(out.signals)).length, 0);
}

// 3. Clusters need 2 or more openings; lint catches dashes, spaced hyphens, raw errors.
{
  const one = build({ ...sample, clusters: [{ company: "Solo Co", openings: 1, note: "after a raise", source: "x", date: "2026-10-01", url: "https://example.com" }] });
  expect("a single opening is not a cluster", one.clusters.length, 0);
  const two = build({ ...sample, clusters: [{ company: "Pair Co", openings: 2, note: "after its Aug acquisition", source: "Pair press release", date: "2026-08-20", url: "https://example.com/p" }] });
  expect("2 openings at one company is a cluster", two.clusters.length, 1);
  expect("lint catches a spaced hyphen", lint("Services - up 25%").length, 1);
  expect("lint catches an em dash", lint("Up \u2014 25%").length, 1);
  expect("lint catches raw tool errors", lint("ZipRecruiter request timed out").length, 1);
  expect("lint leaves job text like 'error rates' alone", lint("cut error rates 30%").length, 0);
  const cli = spawnSync("node", [path.join(__dirname, "..", "build-results.js"), "--data", path.join(__dirname, "..", "sample-data", "results.json")], { encoding: "utf8" });
  expect("the CLI prints the card and passes", `${cli.status} ${cli.stdout.startsWith("## Your results")}`, "0 true");
}

// 4. Search depth: signal searches, target openings, not graded, generic links, counts.
{
  const { validate, lintCounts, isGeneric } = require("../build-results");
  const copy = () => JSON.parse(JSON.stringify(sample));
  expect("the sample passes the depth checks", validate(sample).length, 0);
  const few = copy(); few.checked.signalQueries = few.checked.signalQueries.slice(0, 3);
  expect("fewer than 6 signal searches fails", validate(few).some((p) => /only 3 signal news searches/.test(p)), true);
  const noExit = copy(); noExit.checked.signalQueries = noExit.checked.signalQueries.map((q) => (q.type === "C-suite exit" ? { ...q, type: "new CEO" } : q));
  expect("a missing signal type fails", validate(noExit).some((p) => /C-suite exit/.test(p)), true);
  const lost = copy(); lost.postings = lost.postings.filter((x) => !x.target);
  expect("a target opening missing from postings fails", validate(lost).some((p) => /Granite Systems: 1 in-family opening/.test(p)), true);
  const out = build(sample);
  expect("a target opening graded A appears in Top picks", out.picks.some((p) => p.target && p.company === "Granite Systems"), true);
  const ng = copy(); ng.notGraded.push({ title: "IT Lead", company: "Somewhere Co", link: "https://example.com/x1" });
  expect("a not-graded posting with no careers search fails", validate(ng).some((p) => /no careersSearch/.test(p)), true);
  const many = copy(); many.notGraded = Array.from({ length: 6 }, (_, k) => ({ title: `Role ${k}`, company: `Co ${k}`, link: `https://example.com/r${k}`, careersSearch: "searched the careers page" }));
  expect("not graded shows at most 3, under More", (build(many).card.match(/^- Role \d/gm) || []).length, 3);
  expect("linkedin.com/jobs/ is a generic link", isGeneric("https://www.linkedin.com/jobs/"), true);
  expect("a bare careers page is a generic link", isGeneric("https://acme.example.com/careers"), true);
  expect("a posting link is not generic", isGeneric("https://www.linkedin.com/jobs/view/4012345678"), false);
  const gen = copy(); gen.postings[0].link = "https://www.linkedin.com/jobs/";
  expect("a generic posting link fails", validate(gen).some((p) => /generic link/.test(p)), true);
  const nolink = copy(); nolink.postings[0].link = "";
  expect('an empty link prints "link not found"', build(nolink).card.includes("link not found"), true);
  expect("the generated scan file's counts match its lists", lintCounts(out.scan).length, 0);
  expect('a hand-written "3 need relocation" over 2 items fails', lintCounts("## Capped at C\n3 need relocation:\n- A, B Co\n- C, D Co\n").length, 1);
  expect('a heading "(3)" over 2 items fails', lintCounts("## Older but still open (3)\n- a\n- b\n").length, 1);
  expect("a generic link in a hand-written scan fails", lintCounts("## Picks (1)\n- IT Manager, Co. https://www.linkedin.com/jobs/\n").some((p) => /generic link/.test(p)), true);
  expect("the signals file lists the queries run", /News searches run \(6\): new CEO: "/.test(out.signals), true);
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.caseName}${r.ok ? "" : `  (got ${JSON.stringify(r.actual)}, wanted ${JSON.stringify(r.wanted)})`}`);
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
