#!/usr/bin/env node
// Match Score for one posting: how well the resume shows what the posting asks for.
//
// Usage:
//   node score.js --data match.json
//
// match.json:
//   { "posting": "Harborline Software, VP Operations",
//     "requirements": [
//       { "kind": "must", "text": "Leads teams of 50 or more", "rating": "met",
//         "reason": "Leads 64 people", "quote": "Lead implementation, support, and training: 64 people" },
//       { "kind": "nice", "text": "Gainsight", "rating": "not", "reason": "Not on the resume", "quote": "" } ],
//     "evidence": [
//       { "claim": "Cut implementation time", "rating": "well", "quote": "Cut average implementation time from 16 weeks to 9 weeks" },
//       { "claim": "Built the carrier scorecard", "rating": "vague", "missing": "result", "quote": "Built the weekly carrier scorecard" } ] }
//
// Up to 5 must-haves (3 points each) and 3 nice-to-haves (1 point each). Met earns the
// full points, Partly met half, Not shown none. The score is the points earned out of
// the points possible, on a scale of 100. Bands: Shortlist 80+, Maybe 60 to 79,
// Unlikely under 60. Up to 10 evidence claims, each Well backed or Vague.
//
// Prints "Match Score: 72 of 100 (Maybe)" and exits 1 if match.json breaks a rule
// (too many items, a rating that is not allowed, or a Met or Partly met item, or an
// evidence claim, with no quote from the resume).

const fs = require("fs");

const POINTS = { must: 3, nice: 1 };
const EARNED = { met: 1, partly: 0.5, not: 0 };
const LABEL = { met: "Met", partly: "Partly met", not: "Not shown", well: "Well backed", vague: "Vague" };
const LIMITS = { must: 5, nice: 3, evidence: 10 };

function band(score) {
  if (score >= 80) return "Shortlist";
  if (score >= 60) return "Maybe";
  return "Unlikely";
}

function validate(m) {
  const problems = [];
  const reqs = m.requirements || [];
  const ev = m.evidence || [];
  const musts = reqs.filter((r) => r.kind === "must");
  const nices = reqs.filter((r) => r.kind === "nice");
  if (!musts.length) problems.push("at least 1 must-have is needed");
  if (musts.length > LIMITS.must) problems.push(`${musts.length} must-haves (at most ${LIMITS.must})`);
  if (nices.length > LIMITS.nice) problems.push(`${nices.length} nice-to-haves (at most ${LIMITS.nice})`);
  if (ev.length > LIMITS.evidence) problems.push(`${ev.length} evidence claims (at most ${LIMITS.evidence})`);
  reqs.forEach((r, i) => {
    if (!(r.kind in POINTS)) problems.push(`requirement ${i + 1}: kind must be "must" or "nice"`);
    if (!(r.rating in EARNED)) problems.push(`requirement ${i + 1}: rating must be "met", "partly", or "not"`);
    if (!String(r.reason || "").trim()) problems.push(`requirement ${i + 1}: a one-line reason is needed`);
    if (r.rating !== "not" && !String(r.quote || "").trim()) problems.push(`requirement ${i + 1} ("${r.text}"): quote the resume line that shows it`);
  });
  ev.forEach((e, i) => {
    if (!["well", "vague"].includes(e.rating)) problems.push(`evidence ${i + 1}: rating must be "well" or "vague"`);
    if (!String(e.quote || "").trim()) problems.push(`evidence ${i + 1}: quote the resume line`);
  });
  return problems;
}

function score(m) {
  const reqs = m.requirements || [];
  const possible = reqs.reduce((t, r) => t + (POINTS[r.kind] || 0), 0);
  const earned = reqs.reduce((t, r) => t + (POINTS[r.kind] || 0) * (EARNED[r.rating] || 0), 0);
  const value = possible ? Math.round((100 * earned) / possible) : 0;
  return { score: value, band: band(value), earned, possible };
}

function summary(m) {
  const s = score(m);
  return `Match Score: ${s.score} of 100 (${s.band})`;
}

if (require.main === module) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[++i];
  if (!args.data) {
    console.error("Usage: node score.js --data match.json");
    process.exit(2);
  }
  const m = JSON.parse(fs.readFileSync(args.data, "utf8"));
  const problems = validate(m);
  console.log(summary(m));
  const reqs = m.requirements || [];
  for (const kind of ["must", "nice"]) {
    for (const r of reqs.filter((x) => x.kind === kind)) console.log(`  ${kind === "must" ? "Must-have" : "Nice-to-have"}: ${r.text}: ${LABEL[r.rating] || r.rating}`);
  }
  const vague = (m.evidence || []).filter((e) => e.rating === "vague").length;
  console.log(`Evidence: ${(m.evidence || []).length - vague} well backed, ${vague} vague`);
  if (problems.length) {
    console.error("Fix match.json: " + problems.join("; "));
    process.exit(1);
  }
}

module.exports = { score, band, validate, summary, LABEL, POINTS, EARNED };
