#!/usr/bin/env node
// Checks the value statements in facts.md before the user sees them.
//
// Usage:
//   node value-check.js --facts "My Job Search/facts.md" [--json]
//
// facts.md holds 3 to 5 value statements under "## Value statements", each as:
//   ### V1
//   - Problem: the business problem, in plain words
//   - How I solve it: the user's own way of solving it
//   - Result: a metric ID from facts.md (M1, T3), or a fact quoted word for word from facts.md
//   - Statement: "the problem, how the user solves it, and the result, in one or two sentences"
//   - Status: DRAFT | APPROVED
//
// Each statement fails when it:
//   - uses a buzzword (storytelling, drive growth, transform, synergy, passionate,
//     results-driven, and the AI-tell words in STANDING_RULES.md rule 6)
//   - has no result: the Result line is empty or names nothing in facts.md, or the statement
//     does not carry that result (the metric's number, or the quoted fact's words)
//   - has a number that is not in the approved phrasing of a metric in facts.md
//   - could be said by any candidate: generic phrases ("proven leader", "deliver results"), or
//     fewer than 3 specific words that also appear in the user's own facts (roles, scope,
//     metrics, drivers), in the statement and in "How I solve it"
//   - leaves out its problem or the user's way of solving it
//   - has a dash, a "not X but Y" slogan, or runs over 45 words
// The section needs 3 to 5 statements. --json prints [{id, statement, numbers}] for the
// card, outreach, and signal steps. Exits 1 on any problem.

const fs = require("fs");

const BUZZ = [
  ["storytelling", "storytell(?:ing|er|ers)"],
  ["drive growth", "(?:drive|drives|drove|driven|driving)\\s+(?:\\w+\\s+)?growth"],
  ["transform", "transform(?:s|ed|ing|ation|ations|ational|ative)?"],
  ["synergy", "synerg(?:y|ies|istic|ize|ized|izing)"],
  ["passionate", "passion(?:ate|ately)?"],
  ["results-driven", "results[ -]driven"],
  ["results-oriented", "results[ -]oriented"],
  ["spearhead", "spearhead(?:s|ed|ing)?"],
  ["orchestrate", "orchestrat(?:e|es|ed|ing|ion)"],
  ["leverage", "leverag(?:e|es|ed|ing)"],
  ["utilize", "utili[sz](?:e|es|ed|ing|ation)"],
  ["seamless", "seamless(?:ly)?"],
  ["robust", "robust"],
  ["cutting-edge", "cutting[ -]edge"],
  ["game-changer", "game[ -]chang(?:er|ers|ing)"],
  ["dynamic", "dynamic(?:ally)?"],
  ["unlock", "unlock(?:s|ed|ing)?"],
  ["proven track record", "proven track records?"],
];

const GENERIC_PHRASES = [
  "proven leader", "track record", "deliver results", "delivering results", "deliver value", "add value",
  "adding value", "bottom line", "best practices", "high-performing", "high performing", "world-class",
  "world class", "make an impact", "exceed expectations", "team player", "strategic thinker",
  "help companies grow", "helping companies grow", "take it to the next level", "next level", "think outside",
];

// Words any candidate could use. They never count as specific.
const GENERIC = new Set(`team teams teamwork result results growth grow grew business businesses company companies
organization organizations organizational value values people leader leaders leadership lead leads led strategy
strategic strategies performance perform success successful successfully impact impactful solution solutions
improve improved improving improvement improvements deliver delivered delivering delivery outcome outcomes
problem problems solve solved solving help helped helps helping work works worked working build built building
make made making drive driving efficient efficiency effective effectively excellence excellent great strong
best better high quality clients client customer customers stakeholder stakeholders goal goals vision mission
change changes innovative innovation scale scaling scalable focus focused across within every each also more
most new years year time`.split(/\s+/));

const STOP = new Set(`the and for with that this from into onto over under while when where what which who whom
their there they them then than have has had been being were was are is our out about after before again
all any both can could does doing done each few just like only other same some such very will would your
yours mine myself i'm i've its it's one two three four five six seven eight nine ten`.split(/\s+/));

const stem = (w) => w.replace(/'s$/, "").replace(/(?:ing|ed|es|s)$/, "");
function words(text) {
  return String(text || "").toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9'\s]/g, " ").split(/\s+/)
    .filter((w) => w.length >= 4 && !/^\d/.test(w) && !STOP.has(w) && !GENERIC.has(w));
}
const numbersIn = (text) => (String(text || "").match(/\$?\d[\d,.]*\s*(?:%|[KkMmBb]\b)?/g) || [])
  .map((n) => n.replace(/[,\s]/g, "").replace(/\.$/, "").toLowerCase()).filter(Boolean);

function section(md, heading) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${heading}\\s*$`, "i").test(l.trim()));
  if (start === -1) return { body: "", rest: md };
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end === -1) end = lines.length;
  return { body: lines.slice(start + 1, end).join("\n"), rest: [...lines.slice(0, start), ...lines.slice(end)].join("\n") };
}

function parseMetrics(md) {
  const metrics = {};
  const re = /-\s+\*\*([A-UW-Z]{1,2}\d+)\*\*([\s\S]*?)(?=\n-\s+\*\*[A-UW-Z]{1,2}\d+\*\*|\n#{2,4}\s|$)/g;
  let m;
  while ((m = re.exec(md))) {
    const ph = m[2].match(/Approved phrasing:\s*"([^"]*)"/);
    metrics[m[1]] = ph ? ph[1] : "";
  }
  return metrics;
}

function parseStatements(body) {
  const out = [];
  const blocks = body.split(/\n(?=###\s)/).filter((b) => /^###\s/.test(b.trim()));
  for (const b of blocks) {
    const id = b.trim().match(/^###\s+(\S+)/)[1];
    const field = (name) => {
      const m = b.match(new RegExp(`-\\s*${name}:\\s*(.*)`, "i"));
      return m ? m[1].trim() : "";
    };
    out.push({
      id,
      problem: field("Problem"),
      how: field("How I solve it"),
      result: field("Result"),
      statement: field("Statement").replace(/^"|"$/g, ""),
      status: field("Status"),
    });
  }
  return out;
}

function checkStatement(v, { metrics, factsText }) {
  const p = [];
  const factWords = new Set(words(factsText).map(stem));
  const s = v.statement;
  if (!s) return ["no Statement line"];
  if (!v.problem) p.push("no Problem line: name the business problem");
  if (!v.how) p.push("no How I solve it line: say how the user solves it");
  // Buzzwords.
  const all = `${v.problem} ${v.how} ${s}`;
  for (const [word, re] of BUZZ) {
    const m = all.match(new RegExp(`(^|[^A-Za-z])(${re})(?![A-Za-z])`, "i"));
    if (m) p.push(`buzzword "${m[2]}" (${word}); say what the user did in plain words`);
  }
  // A result, backed by facts.md.
  const ids = (v.result.match(/\b[A-UW-Z]{1,2}\d+\b/g) || []);
  const approved = ids.map((id) => metrics[id]).filter((x) => x !== undefined);
  const quoted = (v.result.match(/"([^"]+)"/) || [])[1] || (!ids.length ? v.result : "");
  if (!v.result) p.push("no result: the Result line is empty; name a metric from facts.md (M1) or quote a fact");
  else if (ids.length && approved.length < ids.length) p.push(`no result: ${ids.filter((id) => metrics[id] === undefined).join(", ")} is not a metric in facts.md`);
  else if (!ids.length && quoted && !factsText.toLowerCase().includes(quoted.toLowerCase())) p.push(`no result: "${quoted}" is not in facts.md word for word`);
  const sNums = numbersIn(s);
  const backed = new Set(approved.flatMap(numbersIn).concat(numbersIn(quoted)));
  const allApproved = new Set(Object.values(metrics).flatMap(numbersIn));
  for (const n of sNums) if (!backed.has(n) && !allApproved.has(n)) p.push(`the number ${n} is not in any approved phrasing in facts.md`);
  if (approved.length) {
    if (!approved.some((a) => numbersIn(a).some((n) => sNums.includes(n)))) p.push("no result: the statement does not carry its metric's number");
  } else if (quoted) {
    const q = words(quoted).map(stem), sw = new Set(words(s).map(stem));
    if (q.length && q.filter((w) => sw.has(w)).length < Math.min(3, q.length)) p.push("no result: the statement does not carry the quoted fact");
  }
  // Could any candidate say it?
  const low = all.toLowerCase();
  for (const g of GENERIC_PHRASES) if (low.includes(g)) p.push(`"${g}" could be said by any candidate`);
  const specific = (t) => [...new Set(words(t).map(stem).filter((w) => factWords.has(w)))];
  const sp = specific(s), hp = specific(v.how);
  if (sp.length < 3) p.push(`could be said by any candidate: only ${sp.length} specific word${sp.length === 1 ? "" : "s"} from the user's own facts (${sp.join(", ") || "none"}); name what they run, fix, or build`);
  if (v.how && hp.length < 3) p.push(`"How I solve it" could be anyone's: only ${hp.length} specific word${hp.length === 1 ? "" : "s"} from the user's facts`);
  // The statement itself names the problem and the user's way of solving it.
  const sw = new Set(words(s).map(stem));
  const overlap = (t) => [...new Set(words(t).map(stem))].filter((w) => sw.has(w)).length;
  if (v.problem && overlap(v.problem) < 1) p.push("the statement does not name its problem");
  if (v.how && overlap(v.how) < 2) p.push('the statement does not say how the user solves it (use the words from "How I solve it")');
  // Voice.
  if (/[–—]/.test(all) || /\S - \S/.test(all)) p.push("a dash; use a period or a comma");
  if (/\bnot\b[^.!?]{0,60}\bbut\b/i.test(s) || /,\s*not\s+[a-z]/i.test(s)) p.push('a "not X but Y" slogan');
  const n = s.split(/\s+/).filter(Boolean).length;
  if (n > 45) p.push(`${n} words (45 at most)`);
  return p;
}

function check(md) {
  const { body, rest } = section(md, "Value statements");
  const metrics = parseMetrics(rest);
  const list = parseStatements(body);
  const problems = [];
  if (!body.trim()) problems.push('facts.md has no "## Value statements" section');
  else if (list.length < 3 || list.length > 5) problems.push(`${list.length} value statements (needs 3 to 5)`);
  const factsText = rest.replace(/^- (Name|City, State|Phone|Email|LinkedIn URL|Website)[^\n]*$/gm, "");
  for (const v of list) for (const x of checkStatement(v, { metrics, factsText })) problems.push(`${v.id}: ${x}`);
  const seen = new Set();
  for (const v of list) {
    const k = v.statement.toLowerCase();
    if (seen.has(k)) problems.push(`${v.id}: the same statement as another one`);
    seen.add(k);
  }
  return { problems, statements: list, metrics };
}

if (require.main === module) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--json") args.json = true;
    else if (a.startsWith("--")) args[a.slice(2)] = process.argv[++i];
  }
  if (!args.facts) {
    console.error('Usage: node value-check.js --facts "My Job Search/facts.md" [--json]');
    process.exit(2);
  }
  const { problems, statements } = check(fs.readFileSync(args.facts, "utf8"));
  if (args.json) console.log(JSON.stringify(statements.map((v) => ({ id: v.id, statement: v.statement, numbers: numbersIn(v.statement), status: v.status })), null, 2));
  if (problems.length) {
    console.error(`Value statements: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    for (const x of problems) console.error(`- ${x}`);
    process.exit(1);
  }
  if (!args.json) console.log(`Value statements: ${statements.length} checked, all pass.`);
}

module.exports = { check, checkStatement, parseStatements, parseMetrics, numbersIn, words, stem };
