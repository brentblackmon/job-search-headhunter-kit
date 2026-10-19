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
//
// Search depth (checked; exits 1 when short):
//   checked.signalQueries  [{ type, query }]  at least 6 news searches covering all 4 signal
//                          types: "new CEO" (90 days), "PE investment" (6 months),
//                          "acquisition" (closed, 12 months), "C-suite exit" (no replacement,
//                          90 days). The queries are written into the signals file.
//   checked.targets        [{ company, careersPage, inFamily }]  every target careers page
//                          checked; each in-family opening must be in postings[] with
//                          target: true, so it is graded with the same gates.
//   notGraded              [{ title, company, link, careersSearch }]  a last resort: each one
//                          needs careersSearch (what was searched on the company's own careers
//                          page or ATS for the full text). The card shows at most 3, under "More".
//   Links must be the posting itself. A generic page (linkedin.com/jobs/, a bare careers page)
//   fails; use "" and the card says "link not found".
// --scan writes the scan file from the same data, so every section count matches its list.
// --check-scan FILE checks a hand-written scan file: "(N ...)" in a heading must equal the
// items under it, and no generic links.

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

const SIGNAL_TYPES = ["new CEO", "PE investment", "acquisition", "C-suite exit"];
const GENERIC_LINK = /^https?:\/\/(www\.)?([a-z0-9.-]+\.)?(linkedin\.com\/jobs\/?(search\/?)?|indeed\.com\/?(jobs\/?)?|glassdoor\.com\/?(Job\/?|Jobs\/?)?|ziprecruiter\.com\/?(jobs\/?|candidate\/search\/?)?|[a-z0-9.-]+\.[a-z]{2,}\/(careers|jobs|career|join-us|join)\/?)(\?[^#]*)?$/i;
const isGeneric = (u) => !!u && GENERIC_LINK.test(String(u).trim());

function validate(r) {
  const p = [];
  const ck = r.checked || {};
  const q = ck.signalQueries || [];
  if (q.length < 6) p.push(`only ${q.length} signal news searches logged (run at least 6 across the 4 signal types)`);
  const missing = SIGNAL_TYPES.filter((t) => !q.some((x) => String(x.type || "").toLowerCase() === t.toLowerCase()));
  if (missing.length) p.push(`no signal search logged for: ${missing.join(", ")}`);
  for (const t of ck.targets || []) {
    const n = Number(t.inFamily) || 0;
    const have = (r.postings || []).filter((x) => x.target && norm(x.company) === norm(t.company)).length;
    if (have < n) p.push(`${t.company}: ${n} in-family opening${n === 1 ? "" : "s"} on its careers page, but ${have} in postings with target: true (grade every one)`);
  }
  for (const x of r.notGraded || []) if (!String(x.careersSearch || "").trim()) p.push(`not graded "${x.title}, ${x.company}" has no careersSearch: search the company's careers page or ATS for the full text first`);
  for (const x of [...(r.postings || []), ...(r.notGraded || [])]) if (isGeneric(x.link)) p.push(`"${x.title}, ${x.company}" has a generic link (${x.link}); use the posting link or "" for link not found`);
  for (const x of r.recruiters || []) if (isGeneric(x.url)) p.push(`recruiter "${x.name}" has a generic link (${x.url})`);
  return p;
}

const linkOf = (u) => (u && String(u).trim() ? u : "link not found");

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
    L.push(`${i + 1}. **${p.title}**, ${p.company}, ${p.location}. ${p.grade}${p.target ? ", target company" : ""}. Posted ${fmtDate(p.posted)} (${ageText(p.days)}).${fresh}`);
    L.push(`   ${p.pay || "Pay not posted"}. ${linkOf(p.link)}`);
    L.push(`   Why you win: ${p.why}`);
    L.push(`   Main gap: ${p.gap || "none found"}`);
  });
  if (skipped.length) L.push("", `Already applied, skipped: ${[...new Set(skipped.map((p) => p.company))].join(", ")}.`);
  if (older.length) {
    L.push("", "**Older but still open** (over 30 days, so not graded A or B)");
    older.slice(0, 5).forEach((p) => L.push(`- ${p.title}, ${p.company}. Posted ${fmtDate(p.posted)} (${ageText(p.days)}). ${linkOf(p.link)}`));
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
  const nq = (ck.signalQueries || []).length;
  const targetsChecked = (ck.targets || []).length;
  const parts = [
    `Checked: ${srcs.join(", ") || "web search"}, ${ck.window || "last 7 days"}.`,
    targetsChecked ? `${targetsChecked} target careers page${targetsChecked === 1 ? "" : "s"}, ${(r.postings || []).filter((x) => x.target).length} in-family opening${(r.postings || []).filter((x) => x.target).length === 1 ? "" : "s"} graded.` : "",
    nq ? `${nq} news searches for hiring signals.` : "",
    ck.found != null ? `${ck.found} postings read, ${picks.length} picked.` : "",
    drops.length || cappedNote ? `Dropped: ${[...drops, cappedNote].filter(Boolean).join(", ")}.` : "",
    undated.length ? `${undated.length} with no posting date left out.` : "",
    ck.excluded ? `${ck.excluded}.` : "",
  ].filter(Boolean);
  const notGraded = (r.notGraded || []).filter((x) => String(x.careersSearch || "").trim());
  if (notGraded.length) {
    L.push("", `**More** (${Math.min(3, notGraded.length)} not graded: the full posting was not found on the company's own site)`);
    notGraded.slice(0, 3).forEach((x) => L.push(`- ${x.title}, ${x.company}. ${linkOf(x.link)}`));
  }
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
  const queries = ck.signalQueries || [];
  if (queries.length) S.push(`News searches run (${queries.length}): ${queries.map((x) => `${x.type}: "${x.query}"`).join("; ")}.`);
  const signals = S.join("\n") + "\n";

  // The scan file: every section count is the length of its own list.
  const sec = (title, items, line) => (items.length ? ["", `## ${title} (${items.length})`, ...items.map(line)] : []);
  const C = [`# Scan ${today} (${ck.window || "last 7 days"})`];
  C.push(...sec("Top picks", picks, (p) => `- ${p.grade}${p.target ? ", target company" : ""}: **${p.title}**, ${p.company}, ${p.location}. Posted ${p.posted}. ${p.pay || "Pay not posted"}. ${linkOf(p.link)}. Why: ${p.why} Gap: ${p.gap || "none found"}`));
  C.push(...sec("Also A or B (beyond the top 5)", top.slice(5), (p) => `- ${p.grade}: ${p.title}, ${p.company}. Posted ${p.posted}. ${linkOf(p.link)}`));
  C.push(...sec("Older but still open", older, (p) => `- ${p.title}, ${p.company}. Posted ${p.posted}. ${linkOf(p.link)}`));
  C.push(...sec("Capped at C", capped, (p) => `- ${p.title}, ${p.company}: ${p.capped.join("; ")}. ${linkOf(p.link)}`));
  C.push(...sec("Already applied, skipped", skipped, (p) => `- ${p.title}, ${p.company}`));
  C.push(...sec("Not graded (full posting not found on the company's site)", notGraded, (x) => `- ${x.title}, ${x.company}. ${linkOf(x.link)}. Searched: ${x.careersSearch}`));
  C.push(...sec("No posting date", undated, (p) => `- ${p.title}, ${p.company}. ${linkOf(p.link)}`));
  C.push("", parts.join(" "));
  const scan = C.join("\n") + "\n";

  return { card, signals, scan, picks, skipped, older, realSignals, alsoSeen, recruiters, clusters, capped, notGraded };
}

// A hand-written scan file: "(N ...)" in a heading must match the items under it, and a
// sentence like "3 need relocation" must match the list that follows it.
function lintCounts(md) {
  const p = [];
  const lines = String(md).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^#{2,}\s.*\((\d+)\b[^)]*\)/) || lines[i].match(/^(?:#{2,}\s.*?|\*\*[^*]+\*\*\s*|[A-Za-z][^.]*?\s)?(\d+)\s+(?:need|needs|are|were|postings?|roles?|jobs?)\b[^.]*:?\s*$/);
    if (!h) continue;
    let n = 0;
    for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) if (/^\s*(?:[-*]|\d+\.)\s/.test(lines[j]) && !/^\s{2,}/.test(lines[j])) n++;
    if (n !== Number(h[1])) p.push(`"${lines[i].trim()}" says ${h[1]} but lists ${n}`);
  }
  for (const u of String(md).match(/https?:\/\/[^\s)>\]]+/g) || []) if (isGeneric(u.replace(/[.,;]+$/, ""))) p.push(`generic link ${u}; use the posting link or "link not found"`);
  return p;
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
  if (args["check-scan"]) {
    const p = lintCounts(fs.readFileSync(args["check-scan"], "utf8"));
    if (p.length) { console.error("Fix the scan file: " + p.join("; ")); process.exit(1); }
    console.log("Scan file counts and links check out.");
    process.exit(0);
  }
  if (!args.data) {
    console.error("Usage: node build-results.js --data results.json [--card results-card.md] [--signals signals/YYYY-MM-DD.md] [--scan scans/YYYY-MM-DD.md] | --check-scan scans/YYYY-MM-DD.md");
    process.exit(2);
  }
  const r = JSON.parse(fs.readFileSync(args.data, "utf8"));
  const out = build(r);
  const problems = [...validate(r), ...lint(out.card).map((p) => `card: ${p}`), ...lint(out.signals).map((p) => `signals: ${p}`), ...lintCounts(out.scan).map((p) => `scan: ${p}`)];
  if (args.scan) { fs.mkdirSync(path.dirname(path.resolve(args.scan)), { recursive: true }); fs.writeFileSync(args.scan, out.scan); }
  if (args.card) { fs.mkdirSync(path.dirname(path.resolve(args.card)), { recursive: true }); fs.writeFileSync(args.card, out.card); }
  if (args.signals) { fs.mkdirSync(path.dirname(path.resolve(args.signals)), { recursive: true }); fs.writeFileSync(args.signals, out.signals); }
  process.stdout.write(out.card);
  if (problems.length) {
    console.error("\nFix results.json: " + problems.join("; "));
    process.exit(1);
  }
}

module.exports = { build, gate, lint, validate, lintCounts, isGeneric };
