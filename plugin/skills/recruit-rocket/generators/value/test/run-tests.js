#!/usr/bin/env node
// Tests for value-check.js. Run with: npm test
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { check } = require("../value-check");

const root = path.join(__dirname, "..");
const sample = fs.readFileSync(path.join(root, "sample-data", "facts.md"), "utf8");
const V1 = "Slow go-lives delay revenue. I run implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks.";
const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}
const swap = (from, to) => check(sample.replace(from, to)).problems;
const has = (problems, re) => problems.some((p) => re.test(p));

{
  expect("the sample passes", check(sample).problems.length, 0);
  expect("the sample has 3 statements", check(sample).statements.length, 3);
  for (const [word, line] of [
    ["storytelling", "Slow go-lives delay revenue. I use storytelling to run implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks."],
    ["drive growth", "Slow go-lives delay revenue. I drive growth by running implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks."],
    ["transform", "Slow go-lives delay revenue. I transformed implementation, support and training into one post-sale team, and cut average implementation from 16 weeks to 9 weeks."],
    ["synergy", "Slow go-lives delay revenue. I find synergy across implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks."],
    ["passionate", "Slow go-lives delay revenue. I am passionate about implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks."],
    ["results-driven", "Slow go-lives delay revenue. A results-driven leader, I run implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks."],
  ]) expect(`the buzzword "${word}" fails`, has(swap(V1, line), /buzzword/), true);
  expect("a statement with no number for its metric fails (no result)", has(swap(V1, "Slow go-lives delay revenue. I run implementation, support and training as one post-sale team with one onboarding plan."), /no result/), true);
  expect("an empty Result line fails", has(swap("- Result: M1", "- Result:"), /no result/), true);
  expect("a Result naming a metric that does not exist fails", has(swap("- Result: M1", "- Result: M9"), /M9 is not a metric/), true);
  expect("a number not in facts.md fails", has(swap("16 weeks to 9 weeks.", "16 weeks to 6 weeks."), /number 6 is not/), true);
  expect("a statement any candidate could say fails", has(swap(V1, "I lead teams that deliver results and improve performance, and cut average implementation from 16 weeks to 9 weeks."), /any candidate/), true);
  expect('"proven leader" fails as generic', has(swap(V1, "A proven leader. I run implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks."), /proven leader/), true);
  expect('a generic "How I solve it" fails', has(swap("- How I solve it: I run implementation, support and training as one post-sale team with one onboarding plan.", "- How I solve it: I build great teams and focus on results."), /How I solve it/), true);
  expect("a statement that leaves out how the user solves it fails", has(swap(V1, "Slow go-lives delay revenue. I cut average implementation from 16 weeks to 9 weeks at a freight software company."), /how the user solves it/), true);
  expect("a statement that leaves out its problem fails", has(swap(V1, "I run implementation, support and training as one post-sale team, and cut average implementation from 16 weeks to 9 weeks."), /does not name its problem/), true);
  expect("a dash fails", has(swap("Slow go-lives delay revenue.", "Slow go-lives delay revenue —"), /dash/), true);
  expect('a "not X but Y" slogan fails', has(swap("Slow go-lives delay revenue.", "Not faster onboarding but one team."), /slogan/), true);
  const two = sample.replace(/### V3[\s\S]*?(?=\n## Experience)/, "");
  expect("only 2 statements fails (needs 3 to 5)", has(check(two).problems, /needs 3 to 5/), true);
  expect("no Value statements section fails", has(check(sample.replace("## Value statements", "## Other notes")).problems, /no "## Value statements"/), true);
  const quoted = sample.replace("- Result: M3", '- Result: "38 people and 120 customers onto one platform in 7 months"');
  expect("a Result quoted word for word from facts.md passes", check(quoted).problems.length, 0);
  expect("a quoted Result not in facts.md fails", has(check(sample.replace("- Result: M3", '- Result: "won the regional service award"')).problems, /not in facts.md word for word/), true);

  const r = spawnSync("node", [path.join(root, "value-check.js"), "--facts", path.join(root, "sample-data", "facts.md")], { encoding: "utf8" });
  expect("the CLI passes the sample", r.status, 0);
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.caseName}${r.ok ? "" : `  (got ${JSON.stringify(r.actual)}, wanted ${JSON.stringify(r.wanted)})`}`);
}
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
