#!/usr/bin/env node
// Writes the outreach as a Word file (email, LinkedIn note, alumni notes) from outreach.json,
// and checks it before the user sees it.
//
// Usage:
//   node build-outreach.js --data outreach.json --out "<company folder>/First_Last_Outreach_Company.docx"
//
// outreach.json (see sample-data/outreach.json):
//   name, company
//   contact   { name, title, confirmed (true only with a dated source), source, date }
//             or { name: "", confirmed: false, note: "why not" }
//   email     { to, addressStatus ("VERIFIED" | "PATTERN GUESS, NOT VERIFIED" | "not found"),
//               subject, body }
//   linkedinNote  under 300 characters
//   alumni    [{ school, steps: [...], note }]  one entry per school the user picked
//   sources   ["Title, Publisher, YYYY-MM-DD", ...]
//
// Checks (exit 1 on any): LinkedIn and alumni notes under 300 characters; one alumni note
// per school; each alumni note names its own school and never another school's nickname
// ("Tar Heel" is UNC, never NC State or Wharton); email body under 200 words; no em or en
// dashes, no spaced hyphens used as dashes, no placeholders like "[name]".

const fs = require("fs");
const path = require("path");

function loadDocx() {
  for (const p of ["docx", path.join(__dirname, "..", "resume", "node_modules", "docx")]) {
    try { return require(p); } catch {}
  }
  return null;
}

// School nicknames and the schools they belong to (lowercase name fragments).
const NICKNAMES = {
  "tar heel": ["unc", "north carolina at chapel hill", "chapel hill"],
  "wolfpack": ["nc state", "north carolina state"],
  "quaker": ["penn", "pennsylvania", "wharton"],
  "buckeye": ["ohio state"],
  "wolverine": ["michigan"],
  "spartan": ["michigan state", "san jose state"],
  "longhorn": ["texas at austin", "ut austin", "university of texas"],
  "aggie": ["texas a&m", "texas a & m", "utah state", "uc davis", "new mexico state"],
  "bruin": ["ucla"],
  "trojan": ["usc", "southern california", "troy"],
  "hoosier": ["indiana"],
  "badger": ["wisconsin"],
  "gator": ["florida"],
  "blue devil": ["duke"],
  "hokie": ["virginia tech"],
  "nittany lion": ["penn state"],
  "boilermaker": ["purdue"],
  "hawkeye": ["iowa"],
  "sooner": ["oklahoma"],
  "golden gopher": ["minnesota"],
};
const GENERIC = new Set(["university", "college", "of", "the", "school", "at", "and", "institute", "business"]);

function checkAlumni(alumni) {
  const problems = [];
  const seen = new Set();
  for (const a of alumni || []) {
    const school = String(a.school || "");
    const key = school.toLowerCase().trim();
    if (!key) { problems.push("an alumni note has no school"); continue; }
    if (seen.has(key)) problems.push(`two alumni notes for ${school}; write one per school`);
    seen.add(key);
    const note = String(a.note || "");
    const low = note.toLowerCase();
    if (note.length > 300) problems.push(`${school} alumni note is ${note.length} characters (under 300)`);
    const words = key.split(/[^a-z0-9&]+/).filter((w) => w && !GENERIC.has(w));
    if (!words.some((w) => low.includes(w))) problems.push(`${school} alumni note does not name the school`);
    for (const [nick, owners] of Object.entries(NICKNAMES)) {
      if (low.includes(nick) && !owners.some((o) => key.includes(o))) problems.push(`${school} alumni note says "${nick}", which belongs to another school`);
    }
  }
  return problems;
}

function check(d) {
  const problems = [];
  const note = String(d.linkedinNote || "");
  if (!note) problems.push("no LinkedIn note");
  if (note.length > 300) problems.push(`LinkedIn note is ${note.length} characters (under 300)`);
  const words = String((d.email || {}).body || "").split(/\s+/).filter(Boolean).length;
  if (words > 200) problems.push(`email body is ${words} words (under 200)`);
  if (!(d.email || {}).subject) problems.push("email has no subject");
  problems.push(...checkAlumni(d.alumni));
  const text = JSON.stringify(d).replace(/https?:\/\/[^"\s]+/g, "");
  if (/[–—]/.test(text)) problems.push("em or en dash");
  if (/\S - \S/.test(text)) problems.push('a spaced hyphen used as a dash (" - ")');
  const ph = text.match(/\[[^\[\]"]{1,40}\]/);
  if (ph) problems.push(`placeholder ${ph[0]}`);
  return problems;
}

async function writeDocx(d, out) {
  const docx = loadDocx();
  if (!docx) throw new Error("the docx package is not installed (run npm install in generators/resume)");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
  const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 21, ...opts })], spacing: { after: 120 } });
  const H = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: "Arial", bold: true, color: "1A2B4A", size: 26 })], spacing: { before: 240, after: 120 } });
  const c = d.contact || {};
  const kids = [
    new Paragraph({ children: [new TextRun({ text: `Outreach: ${d.company}`, font: "Arial", bold: true, size: 32, color: "1A2B4A" })], spacing: { after: 120 } }),
    P(c.name ? `Contact: ${c.name}, ${c.title} (${c.confirmed ? `confirmed: ${c.source}, ${c.date}` : "not confirmed"})` : `Contact: not confirmed${c.note ? `. ${c.note}` : ""}`, { color: "555555" }),
    H("Email"),
    P(`To: ${(d.email || {}).to || "not found"}   [${(d.email || {}).addressStatus || "not found"}]`, { color: "555555" }),
    P(`Subject: ${(d.email || {}).subject}`, { bold: true }),
    ...String((d.email || {}).body || "").split(/\n\s*\n|\n/).filter((x) => x.trim()).map((x) => P(x)),
    H(`LinkedIn connection note (${String(d.linkedinNote || "").length} characters)`),
    P(String(d.linkedinNote || "")),
  ];
  for (const a of d.alumni || []) {
    kids.push(H(`Alumni note: ${a.school} (${String(a.note || "").length} characters)`));
    (a.steps || []).forEach((s, i) => kids.push(P(`${i + 1}. ${s}`)));
    kids.push(P(String(a.note || "")));
  }
  if ((d.sources || []).length) {
    kids.push(H("Sources"));
    d.sources.forEach((s) => kids.push(P(s, { color: "555555", size: 18 })));
  }
  const doc = new Document({ sections: [{ properties: {}, children: kids }] });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, await Packer.toBuffer(doc));
}

if (require.main === module) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[++i];
  if (!args.data || !args.out) {
    console.error("Usage: node build-outreach.js --data outreach.json --out First_Last_Outreach_Company.docx");
    process.exit(2);
  }
  const d = JSON.parse(fs.readFileSync(args.data, "utf8"));
  const problems = check(d);
  writeDocx(d, args.out).then(() => {
    console.log(`Wrote ${args.out}. LinkedIn note: ${String(d.linkedinNote || "").length} characters. Alumni notes: ${(d.alumni || []).map((a) => `${a.school} (${a.note.length})`).join(", ") || "none"}.`);
    if (problems.length) { console.error("QA failed:\n- " + problems.join("\n- ")); process.exit(1); }
    console.log("QA passed.");
  }).catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { check, checkAlumni, NICKNAMES };
