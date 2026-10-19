#!/usr/bin/env node
// Builds the results card (shown on screen) and the signals file from one results.json,
// and applies the grading gates so the card can never overstate a posting.
//
// Usage:
//   node build-results.js --data results.json --card results-card.md --signals signals/YYYY-MM-DD.md
//
// results.json (see sample-data/results.json):
//   today            "2026-10-20"
//   applied          ["Acme Corp", ...]  companies from Gmail "application sent" emails (last 60
//                    days) and the tracker; their postings are skipped, listed in one line
//   postings[]       { title, company, location, link, posted ("YYYY-MM-DD" or ""), pay,
//                      grade "A"|"B"|"C", why, gap, source,
//                      belowLevel, underFloor (true when it is), hardRequirement ("" or what the
//                      user cannot meet, e.g. "UK work authorization", "relocation to Denver") }
//   signals[]        { company, signal, source, sourceDate, url,
//                      contact: { name, title, source, date } or null }
//   recruiters[]     { name, search, posted, url }      retained or staffing search postings
//   clusters[]       { company, openings, note, source, date, url }   2+ target-family openings
//                    at one company or one PE portfolio
//   checked          { sources: [{ name, status: "ok"|"partial"|"failed"|"not connected", found }],
//                      window, found, kept, dropped: { reason: count }, excluded,
//                      recruitersChecked, clustersChecked }
//   timing           { searchMinutes, packageMinutes }  optional
//
// Gates (the card enforces them, whatever grade was written):
//   - posted more than 30 days before today, or no date: never A or B; dated ones go to
//     "Older but still open"
//   - a hard requirement the user cannot meet: C at most
//   - below the target level, or under the pay floor: C
//   - a company in "applied": skipped, listed under "Already applied, skipped"
// Signals need a named contact with a dated source, or they go to "Also seen".
// Recruiter postings must be dated within 30 days. Clusters need 2 or more openings.
// Exits 1 if any text has an em or en dash, a spaced hyphen used as a dash, or a placeholder.

const fs = require("fs");
const path = require("path");

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (s) => { const [y, m, d] = s.split("-").map(Number); return `${MON[m - 1]} ${d}, ${y}`; };
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function age(posted, today) {
  if (!isDate(posted)) return null;
  return daysBetween(posted, today);
}
function ageText(days) {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// The grade a posting can have after the gates, and why it was capped.
function gate(p, today) {
  const order = { A: 3, B: 2, C: 1 };
  let grade = order[p.grade] ? p.grade : "C";
  const why = [];
  const cap = (g, reason) => { if (order[grade] > order[g]) { grade = g; } why.push(reason); };
  if (p.hardRequirement) cap("C", `needs ${p.hardRequirement}`);
  if (p.belowLevel) cap("C", "below your target level");
  if (p.underFloor) cap("C", "under your pay floor");
  const d = age(p.posted, today);
  const old = d === null || d > 30;
  return { grade, old, days: d, capped: why };
}

function build(r) {
  const today = r.today;
  const applied = (r.applied || []).map(norm).filter(Boolean);
  const isApplied = (p) => applied.some((a) => norm(p.company) === a || norm(p.company).includes(a) || a.includes(norm(p.company)));
  const skipped = [], older = [], undated = [], top = [], capped = [];
  for (const p of r.postings || []) {
    if (isApplied(p)) { skipped.push(p); continue; }
    const g = gate(p, today);
    const q = { ...p, grade: g.grade, days: g.days, capped: g.capped };
    if (g.grade === "C") { if (g.capped.length) capped.push(q); continue; }
    if (g.old) { (g.days === null ? undated : older).push(q); continue; }
    top.push(q);
  }
  // Freshest first, A before B.
  top.sort((a, b) => (a.grade === b.grade ? a.days - b.days : a.grade === "A" ? -1 : 1));
  const picks = top.slice(0, 5);

  const realSignals = (r.signals || []).filter((s) => s.contact && s.contact.name && isDate(s.contact.date) && isDate(s.sourceDate));
  const alsoSeen = (r.signals || []).filter((s) => !realSignals.includes(s));
  const recruiters = (r.recruiters || []).filter((x) => isDate(x.posted) && daysBetween(x.posted, today) <= 30);
  const clusters = (r.clusters || []).filter((c) => Number(c.openings) >= 2 && isDate(c.date));
  const ck = r.checked || {};

  const L = [];
  L.push("## Your results", "");
  L.push("**Top picks**");
  if (!picks.length) L.push("None this time: no A or B role in the window passed the checks.");
  picks.forEach((p, i) => {
    const fresh = p.days <= 2 ? " **Apply today.**" : "";
    L.push(`${i + 1}. **${p.title}**, ${p.company}, ${p.location}. ${p.grade}. Posted ${fmtDate(p.posted)} (${ageText(p.days)}).${fresh}`);
    L.push(`   ${p.pay || "Pay not posted"}. ${p.link}`);
    L.push(`   Why you win: ${p.why}`);
    L.push(`   Main gap: ${p.gap || "none found"}`);
  });
  if (skipped.length) L.push("", `Already applied, skipped: ${[...new Set(skipped.map((p) => p.company))].join(", ")}.`);
  if (older.length) {
    L.push("", "**Older but still open** (over 30 days, so not graded A or B)");
    older.slice(0, 5).forEach((p) => L.push(`- ${p.title}, ${p.company}. Posted ${fmtDate(p.posted)} (${ageText(p.days)}). ${p.link}`));
  }

  L.push("", "**Hiring signals**");
  if (!realSignals.length) L.push("None with a named, dated contact this time.");
  realSignals.slice(0, 3).forEach((s, i) => {
    L.push(`${i + 1}. **${s.company}**: ${s.signal} (${s.source}, ${fmtDate(s.sourceDate)}, ${s.url}). Approach: ${s.contact.name}, ${s.contact.title} (confirmed: ${s.contact.source}, ${fmtDate(s.contact.date)}).`);
  });
  if (realSignals.length && realSignals.length < 3) L.push(`Only ${realSignals.length} real signal${realSignals.length === 1 ? "" : "s"} this time. I did not pad the list.`);
  if (alsoSeen.length) L.push(`Also seen (no named, dated contact yet): ${alsoSeen.map((s) => s.company).join(", ")}.`);

  L.push("", "**Recruiters running searches now**");
  if (!recruiters.length) L.push(`Checked: none found. ${ck.recruitersChecked || ""}`.trim());
  recruiters.slice(0, 3).forEach((x, i) => L.push(`${i + 1}. **${x.name}**: ${x.search}, posted ${fmtDate(x.posted)}. ${x.url}`));

  L.push("", "**Hiring clusters**");
  if (!clusters.length) L.push(`Checked: none found. ${ck.clustersChecked || ""}`.trim());
  clusters.slice(0, 3).forEach((c, i) => L.push(`${i + 1}. **${c.company}**: ${c.openings} openings in your field. ${c.note} (${c.source}, ${fmtDate(c.date)}, ${c.url}).`));

  const srcs = (ck.sources || []).map((s) => (s.status === "ok" ? `${s.name}${s.found != null ? ` (${s.found})` : ""}` : `${s.name}: ${s.status}`));
  const drops = Object.entries(ck.dropped || {}).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`);
  const cappedNote = capped.length ? `${capped.length} capped at C (${[...new Set(capped.flatMap((p) => p.capped))].join("; ")})` : "";
  const parts = [
    `Checked: ${srcs.join(", ") || "web search"}, ${ck.window || "last 7 days"}.`,
    ck.found != null ? `${ck.found} postings read, ${picks.length} picked.` : "",
    drops.length || cappedNote ? `Dropped: ${[...drops, cappedNote].filter(Boolean).join(", ")}.` : "",
    undated.length ? `${undated.length} with no posting date left out.` : "",
    ck.excluded ? `${ck.excluded}.` : "",
  ].filter(Boolean);
  L.push("", parts.join(" "));
  if (r.timing && (r.timing.searchMinutes != null || r.timing.packageMinutes != null)) {
    const t = [];
    if (r.timing.searchMinutes != null) t.push(`Search took ${r.timing.searchMinutes} min.`);
    if (r.timing.packageMinutes != null) t.push(`Package took ${r.timing.packageMinutes} min.`);
    L.push("", t.join(" "));
  }
  const card = L.join("\n") + "\n";

  // The signals file: only sections with content, never an empty heading.
  const S = [`# Signals ${today}`];
  if (realSignals.length) {
    S.push("", "## Hiring signals");
    realSignals.forEach((s) => S.push(`- **${s.company}**: ${s.signal}. Source: ${s.source}, ${s.sourceDate}, ${s.url}. Approach: ${s.contact.name}, ${s.contact.title} (confirmed: ${s.contact.source}, ${s.contact.date}).`));
  }
  if (alsoSeen.length) {
    S.push("", "## Also seen (no named, dated contact yet)");
    alsoSeen.forEach((s) => S.push(`- **${s.company}**: ${s.signal}.${s.url ? ` ${s.url}` : ""}`));
  }
  if (recruiters.length) {
    S.push("", "## Recruiters running searches now");
    recruiters.forEach((x) => S.push(`- **${x.name}**: ${x.search}, posted ${x.posted}. ${x.url}`));
  }
  if (clusters.length) {
    S.push("", "## Hiring clusters");
    clusters.forEach((c) => S.push(`- **${c.company}**: ${c.openings} openings. ${c.note}. Source: ${c.source}, ${c.date}, ${c.url}`));
  }
  S.push("", parts.join(" "));
  const signals = S.join("\n") + "\n";

  return { card, signals, picks, skipped, older, realSignals, alsoSeen, recruiters, clusters, capped };
}

function lint(text) {
  const problems = [];
  if (/[\u2013\u2014]/.test(text)) problems.push("em or en dash");
  if (/\S - \S/.test(text.replace(/https?:\/\/\S+/g, ""))) problems.push('a spaced hyphen used as a dash (" - ")');
  const ph = text.match(/\[[^\[\]]{1,40}\]/g);
  if (ph) problems.push(`placeholder ${ph[0]}`);
  if (/\b(timed out|timeout|ECONN\w*|HTTP \d{3}|status code \d{3}|stack trace|rate limit(ed)?)\b/i.test(text)) problems.push("raw tool error text (say \"ZipRecruiter: partial\" instead)");
  if (/^#{2,} .*\n(\s*\n)*(#+ |(?![\s\S]))/m.test(text)) problems.push("an empty heading");
  return problems;
}

if (require.main === module) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[++i];
  if (!args.data) {
    console.error("Usage: node build-results.js --data results.json [--card results-card.md] [--signals signals/YYYY-MM-DD.md]");
    process.exit(2);
  }
  const r = JSON.parse(fs.readFileSync(args.data, "utf8"));
  const out = build(r);
  const problems = [...lint(out.card).map((p) => `card: ${p}`), ...lint(out.signals).map((p) => `signals: ${p}`)];
  if (args.card) { fs.mkdirSync(path.dirname(path.resolve(args.card)), { recursive: true }); fs.writeFileSync(args.card, out.card); }
  if (args.signals) { fs.mkdirSync(path.dirname(path.resolve(args.signals)), { recursive: true }); fs.writeFileSync(args.signals, out.signals); }
  process.stdout.write(out.card);
  if (problems.length) {
    console.error("\nFix results.json: " + problems.join("; "));
    process.exit(1);
  }
}

module.exports = { build, gate, lint };
