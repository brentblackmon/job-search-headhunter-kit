#!/usr/bin/env node
// Hard gates in a posting, checked against facts.md before anything is built.
//
// Usage:
//   node gates.js --posting posting.md [--facts facts.md] [--today YYYY-MM-DD]
//
// Finds:
//   - work authorization for named countries ("authorized to work in Canada and the US",
//     "eligible to work in the UK", "citizenship")
//   - a required security clearance or license
//   - a required degree (a degree named as "required", or "must have" a degree)
//   - "N years in [specific industry or vendor]" (for example "5+ years in SaaS",
//     "3 years with Salesforce")
//   - the posting date, flagged when older than 60 days
// Each gate is "met" only when facts.md shows it (a "Work authorization:" line that lists the
// country, a matching license, clearance, or degree line, or the industry or vendor in the
// facts). Anything else is "ask": the build stops and asks one question first.
// Prints one line per gate and the question to ask; exits 3 when a question is needed.

const fs = require("fs");

const COUNTRY = /\b(the\s+)?(United States|US|U\.S\.|USA|Canada|United Kingdom|UK|Ireland|India|Australia|Germany|France|Mexico|the EU|European Union|Singapore|New Zealand|Netherlands)\b/g;
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function countriesIn(s) {
  const out = [];
  for (const m of String(s).matchAll(COUNTRY)) {
    let c = m[2];
    if (/^(US|U\.S\.|USA)$/.test(c)) c = "United States";
    if (c === "UK") c = "United Kingdom";
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

function postedDate(text, today) {
  const t = String(text);
  let m = t.match(/posted[^0-9a-z]{0,12}(\d{4})-(\d{2})-(\d{2})/i);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/posted[^0-9a-z]{0,12}(?:on\s+)?([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
  if (m && MON[m[1].toLowerCase()]) {
    const y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
    let d = `${y}-${String(MON[m[1].toLowerCase()]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    if (!m[3] && d > today) d = `${y - 1}${d.slice(4)}`; // "Apr 27" read in October is this year; in January, last year
    return d;
  }
  m = t.match(/posted\s+(\d+)\+?\s+days?\s+ago/i);
  if (m) return new Date(new Date(today) - Number(m[1]) * 86400000).toISOString().slice(0, 10);
  return "";
}

function findGates(posting, facts = "", today = new Date().toISOString().slice(0, 10)) {
  const p = String(posting);
  const f = String(facts);
  const fl = f.toLowerCase();
  const gates = [];
  const authLine = (f.match(/^\s*-?\s*Work authorization:\s*(.+)$/im) || [])[1] || "";
  const authOk = countriesIn(authLine);

  // Work authorization.
  for (const m of p.matchAll(/(?:authori[sz]ed|authori[sz]ation|eligible|eligibility|legally able|right)\s+to\s+work\s+in\s+([^.;\n]{2,80})/gi)) {
    const need = countriesIn(m[1]);
    if (!need.length) continue;
    const missing = need.filter((c) => !authOk.includes(c));
    const where = m[1].replace(/[\s.,;:]+$/, "");
    gates.push({ type: "work authorization", need: need.join(" and "), status: missing.length ? "ask" : "met",
      question: `The posting requires authorization to work in ${where}. Do you have it?` });
    break;
  }
  if (/\b(citizenship|citizen)\b[^.\n]{0,40}\b(required|must)\b|\bmust be a (U\.?S\.? )?citizen\b/i.test(p)) {
    gates.push({ type: "citizenship", need: "citizenship", status: /citizen/i.test(authLine) ? "met" : "ask",
      question: "The posting requires citizenship. Do you meet that?" });
  }
  // Clearance and license.
  const clr = p.match(/\b(secret|top secret|TS\/SCI|public trust|security)\s+clearance\b/i);
  if (clr) gates.push({ type: "clearance", need: clr[0], status: fl.includes("clearance") ? "met" : "ask",
    question: `The posting requires a ${clr[0]}. Do you hold one?` });
  const lic = p.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?\s+licen[cs]e)\b[^.\n]{0,40}\b(required|must)/) || p.match(/\b(?:must|required to)\s+(?:hold|have)\s+an?\s+([A-Za-z ]{0,30}licen[cs]e)/i);
  if (lic) gates.push({ type: "license", need: lic[1], status: fl.includes(lic[1].toLowerCase()) ? "met" : "ask",
    question: `The posting requires a ${lic[1]}. Do you have it?` });
  // Degree.
  const deg = p.match(/\b(bachelor'?s|master'?s|MBA|PhD|doctorate|degree)\b[^.\n]{0,60}\b(required)\b/i) || p.match(/\b(?:must|required to)\s+have\s+an?\s+((?:bachelor'?s|master'?s|MBA|PhD)[^.\n]{0,40})/i);
  if (deg && !/\bor equivalent\b|\bpreferred\b/i.test(deg[0])) {
    const kind = deg[1].toLowerCase();
    const HAVE = {
      bachelor: /\b(bachelor|B\.?S\.?|B\.?A\.?|BBA|B\.?Sc)\b/i,
      master: /\b(master|M\.?S\.?|M\.?A\.?|MBA|M\.?Sc)\b/i,
      mba: /\bMBA\b/i,
      phd: /\b(PhD|Ph\.D|doctorate)\b/i,
      doctorate: /\b(PhD|Ph\.D|doctorate)\b/i,
      degree: /\b(bachelor|master|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|MBA|BBA|PhD)\b/i,
    };
    const key = Object.keys(HAVE).find((k) => kind.startsWith(k)) || "degree";
    const what = deg[0].replace(/\s*\b(is\s+)?required\b.*$/i, "").replace(/^(?:must|required to)\s+have\s+/i, "").trim();
    gates.push({ type: "degree", need: what, status: HAVE[key].test(f) ? "met" : "ask",
      question: `The posting requires a ${what.replace(/^an?\s+/i, "")}. Do you have it?` });
  }
  // N years in a specific industry or vendor.
  for (const m of p.matchAll(/(\d{1,2})\+?\s+years?(?:\s+of)?(?:\s+\w+){0,3}?\s+(?:in|with|at)\s+(?:an?\s+|the\s+)?([A-Z][\w&.+-]*(?:\s+[A-Z][\w&.+-]*){0,3}|SaaS|B2B\s+\w+|vertical\s+software|\w+\s+software)/g)) {
    const what = m[2].trim().replace(/[.,;:]+$/, "");
    if (/^(a|an|the|least|leadership|management)$/i.test(what)) continue;
    const met = fl.includes(what.toLowerCase());
    gates.push({ type: "years in", need: `${m[1]}+ years in ${what}`, status: met ? "met" : "ask",
      question: `The posting asks for ${m[1]}+ years in ${what}. Does your background include that?` });
  }
  // Posting age.
  const posted = postedDate(p, today);
  if (posted) {
    const days = Math.round((new Date(today) - new Date(posted)) / 86400000);
    if (days > 60) gates.push({ type: "posting age", need: `posted ${posted}`, status: "ask", days,
      question: `This posting is ${days} days old (posted ${posted}). It may be filled. Build anyway?` });
  }
  return gates;
}

if (require.main === module) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[++i];
  if (!args.posting) {
    console.error("Usage: node gates.js --posting posting.md [--facts facts.md] [--today YYYY-MM-DD]");
    process.exit(2);
  }
  const posting = fs.readFileSync(args.posting, "utf8");
  const facts = args.facts && fs.existsSync(args.facts) ? fs.readFileSync(args.facts, "utf8") : "";
  const gates = findGates(posting, facts, args.today || new Date().toISOString().slice(0, 10));
  if (!gates.length) { console.log("Gates: none found."); process.exit(0); }
  for (const g of gates) console.log(`Gate: ${g.type}: ${g.need}: ${g.status === "met" ? "met in facts.md" : "ASK"}`);
  const ask = gates.filter((g) => g.status === "ask");
  if (ask.length) {
    console.log("Ask before building (one question each, default No):");
    ask.forEach((g) => console.log(`- ${g.question}`));
    process.exit(3);
  }
}

module.exports = { findGates, countriesIn, postedDate };
