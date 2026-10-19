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
  expect("top picks: only the 2 that pass every gate", out.picks.map((p) => p.company).join(", "), "Acme Manufacturing, Buckeye Freight");
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
  expect("lint catches an em dash", lint("Up — 25%").length, 1);
  expect("lint catches raw tool errors", lint("ZipRecruiter request timed out").length, 1);
  expect("lint leaves job text like 'error rates' alone", lint("cut error rates 30%").length, 0);
  const cli = spawnSync("node", [path.join(__dirname, "..", "build-results.js"), "--data", path.join(__dirname, "..", "sample-data", "results.json")], { encoding: "utf8" });
  expect("the CLI prints the card and passes", `${cli.status} ${cli.stdout.startsWith("## Your results")}`, "0 true");
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.caseName}${r.ok ? "" : `  (got ${JSON.stringify(r.actual)}, wanted ${JSON.stringify(r.wanted)})`}`);
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
