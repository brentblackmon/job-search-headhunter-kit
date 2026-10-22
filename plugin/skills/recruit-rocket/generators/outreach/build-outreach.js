#!/usr/bin/env node
// Writes the outreach as a Word file from outreach.json, and checks it before the user sees it.
//
// Usage:
//   node build-outreach.js --data outreach.json --out "<company folder>/First_Last_Outreach_Company.docx"
//
// outreach.json (see sample-data/outreach.json and sample-data/outreach-warm.json):
//   today, name, company, role (the target title)
//   mode       "cold" (email to the hiring executive) or "warm" (a short note to someone the
//              user already knows there, or at its parent or portfolio group)
//   contact    { name, title, confirmed, source, date }  confirmed only with a dated source
//              from the last 12 months; otherwise { name: "", confirmed: false, note }
//   warm       (warm mode) { name, relation, note }  the note asks about the role, under 120 words
//   email      { to, addressStatus, subject, body }  in warm mode optional
//              addressStatus: "VERIFIED", "PATTERN GUESS, NOT VERIFIED", or "no recipient"
//   signature  { name, phone, email, linkedin, website }  website only if facts.md has one
//   linkedinNote  under 300 characters
//   alumni     [{ school, steps, note }]  one per school the user picked
//   valueStatement { id, text }  the approved value statement from facts.md that best fits this
//              company's signal or posting; the email's opening carries it
//   connectors [{ name, title, company, type, why, source, date, url, email, addressStatus, note }]
//              up to 2 people who can point the user to the right person: type "investor" or
//              "board member" (a PE or VC partner), "vendor" or "partner" (an executive who works
//              with the C-suite), or "competitor" (a leader at a competitor). Each needs a dated
//              source from the last 12 months; addressStatus "VERIFIED", "PATTERN GUESS, NOT
//              VERIFIED", or "not found". The note names the company's event (with its month and
//              year), carries the value statement, and asks "who should I talk to there?"
//   sources    ["Title, Publisher, YYYY-MM-DD", ...]
//
// The email follows the user's template, checked line by line:
//   subject plain and naming the role (no slogan); line 1 a researched, dated company fact,
//   then the value statement (its result and at least 3 of its words); "Quick on me:" and 4 to 6 bullets with bold "I've..."
//   hooks; one line asking for 20 minutes; "Resume attached."; "Regards," then name, phone,
//   email, LinkedIn (and the website, if set). No stock lines. Under 200 words.
// The recipient: a contact whose only source is over 12 months old is not confirmed, and an
// unconfirmed contact gets no recipient: "to" is empty, the greeting names no one, and the
// file says "No recipient: apply first, then use LinkedIn".
// Also: notes under 300 characters, one alumni note per school, each naming its own school and
// never another school's nickname; no em or en dashes, spaced hyphens, or placeholders.

const fs = require("fs");
const path = require("path");

function loadDocx() {
  for (const p of ["docx", path.join(__dirname, "..", "resume", "node_modules", "docx")]) {
    try { return require(p); } catch {}
  }
  return null;
}

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
const STOCK = [
  /most \w+ teams get/i, /in today'?s\b/i, /hope (this|you)/i, /i'?m reaching out/i, /i wanted to reach out/i,
  /i came across/i, /i'?m (so |very )?excited/i, /game[ -]changer/i, /\bsynerg/i, /\bfast[ -]paced\b/i, /\bpassionate\b/i,
  /i would love to/i, /touch base/i, /circle back/i, /pick your brain/i,
];
// The value statement carried into a draft: its number and at least 3 of its words.
const VS_STOP = new Set("that this with from into onto over their they them then than have were what when where which while your about after also and the for are was".split(" "));
const vsWords = (t) => [...new Set(String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !/^\d/.test(w) && !VS_STOP.has(w)))];
const vsNumbers = (t) => (String(t || "").match(/\d[\d,.]*%?/g) || []).map((n) => n.replace(/[,.]$/, ""));
function carriesValue(text, v) {
  const have = new Set(vsWords(text));
  const shared = vsWords(v.text).filter((w) => have.has(w)).length;
  const nums = vsNumbers(v.text);
  return shared >= 3 && (!nums.length || nums.some((n) => vsNumbers(text).includes(n)));
}
const CONNECTOR_TYPES = ["investor", "board member", "vendor", "partner", "competitor"];
const ADDRESS = ["VERIFIED", "PATTERN GUESS, NOT VERIFIED", "not found"];

const DATED = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2},?\s+)?\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b(in|since|this|last)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b|\bQ[1-4]\s+\d{4}\b/;

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

// The contact is confirmed only by a dated source from the last 12 months.
function contactProblems(d) {
  const c = d.contact || {};
  const p = [];
  if (c.confirmed) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.date || ""))) p.push(`contact "${c.name}" is marked confirmed with no dated source`);
    else if (d.today && (new Date(d.today) - new Date(c.date)) / 86400000 > 366) p.push(`contact "${c.name}" is confirmed only by a source from ${c.date}, over 12 months old; find a current source (leadership page, a press release from the last 12 months, the parent company's news) or leave the email with no recipient`);
  }
  return p;
}

function emailProblems(d) {
  const e = d.email || {};
  const s = d.signature || {};
  const c = d.contact || {};
  const p = [];
  const body = String(e.body || "");
  const subject = String(e.subject || "");
  const lines = body.split("\n").map((x) => x.trim()).filter(Boolean);
  // Recipient.
  if (!c.confirmed) {
    if (String(e.to || "").trim()) p.push(`the email is addressed to "${e.to}", but the contact is not confirmed; leave "to" empty (no recipient)`);
    if (c.name && lines[0] && lines[0].toLowerCase().includes(String(c.name).split(" ")[0].toLowerCase())) p.push(`the greeting names ${c.name}, who is not confirmed`);
  }
  // Subject.
  if (!subject) p.push("the email has no subject");
  else {
    if (d.role && !subject.toLowerCase().includes(String(d.role).toLowerCase())) p.push(`subject "${subject}" does not name the role (${d.role}); keep it plain and specific`);
    const parts = subject.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);
    if (/,\s*not\s+[a-z]|\bnot\b[^.]{0,40}\bbut\b/i.test(subject) || (parts.length >= 2 && parts.every((x) => x.split(/\s+/).length <= 5))) p.push(`subject "${subject}" reads like a slogan`);
  }
  // Opening: a dated company fact, then the value statement that best fits the company.
  const open = lines.findIndex((x) => !/^(hi|hello|dear)\b/i.test(x));
  const first = lines[open] || "";
  if (!DATED.test(first)) p.push("the first line after the greeting needs a researched, dated company fact (a month and year or a date)");
  const v = d.valueStatement || {};
  if (!v.text) p.push("no valueStatement: copy the value statement (id and text) from facts.md that best fits this company");
  else {
    const q = lines.findIndex((x) => /^Quick on me:/.test(x));
    const opening = lines.slice(open, q > open ? q : open + 2).join(" ");
    if (!carriesValue(opening, v)) p.push(`the opening must carry value statement ${v.id || ""} after the company fact (its result and its words)`.replace("  ", " "));
  }
  // Body.
  if (!lines.some((x) => /^Quick on me:/.test(x))) p.push('missing "Quick on me:"');
  const hooks = lines.filter((x) => /^(?:[-*•]\s*)?\*\*I'?ve\b/.test(x)).length;
  if (hooks < 4 || hooks > 6) p.push(`${hooks} bullets with a bold "I've..." hook (needs 4 to 6)`);
  if (!lines.some((x) => /\b20 minutes\b/.test(x))) p.push("the close must ask for 20 minutes");
  if (!lines.includes("Resume attached.")) p.push('missing "Resume attached."');
  const r = lines.indexOf("Regards,");
  if (r === -1) p.push('missing "Regards,"');
  else {
    const sig = lines.slice(r + 1).join(" ");
    for (const [k, label] of [["name", "name"], ["phone", "phone"], ["email", "email address"], ["linkedin", "LinkedIn"]]) {
      if (!s[k]) p.push(`signature has no ${label} in outreach.json`);
      else if (!sig.includes(s[k])) p.push(`the signature after "Regards," is missing the ${label} (${s[k]})`);
    }
    if (s.website && !sig.includes(s.website)) p.push(`the signature is missing the website (${s.website})`);
  }
  for (const re of STOCK) {
    const hit = body.match(re);
    if (hit) p.push(`stock line "${hit[0]}"; say a specific fact instead`);
  }
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > 200) p.push(`email body is ${words} words (under 200)`);
  return p;
}

function connectorProblems(d) {
  const list = d.connectors || [];
  const p = [];
  if (list.length > 2) p.push(`${list.length} connectors (2 at most)`);
  for (const x of list) {
    const who = x.name || "a connector";
    if (!x.name || !x.title || !x.company) p.push(`${who}: needs a name, title, and company`);
    if (!CONNECTOR_TYPES.includes(String(x.type || "").toLowerCase())) p.push(`${who}: type "${x.type || ""}" must be one of ${CONNECTOR_TYPES.join(", ")}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.date || "")) || !x.source) p.push(`${who}: needs a dated source (source and YYYY-MM-DD date)`);
    else if (d.today && (new Date(d.today) - new Date(x.date)) / 86400000 > 366) p.push(`${who}: the source from ${x.date} is over 12 months old`);
    const st = String(x.addressStatus || "");
    if (!ADDRESS.includes(st)) p.push(`${who}: addressStatus "${st}" must be VERIFIED, PATTERN GUESS, NOT VERIFIED, or not found`);
    else if (x.email && st === "not found") p.push(`${who}: an email address needs VERIFIED or PATTERN GUESS, NOT VERIFIED`);
    else if (!x.email && st !== "not found") p.push(`${who}: marked ${st} with no email address`);
    if ((d.contact || {}).name && x.name === d.contact.name) p.push(`${who} is the hiring executive; a connector is someone else`);
    const n = String(x.note || "");
    if (!n) { p.push(`${who}: no connector note`); continue; }
    if (n.length > 300) p.push(`${who}: the connector note is ${n.length} characters (under 300)`);
    if (!DATED.test(n)) p.push(`${who}: the connector note must name the company's event with its month and year`);
    if (d.valueStatement && d.valueStatement.text && !carriesValue(n, d.valueStatement)) p.push(`${who}: the connector note must carry the value statement (its result and its words)`);
    if (!/who should I talk to/i.test(n)) p.push(`${who}: the connector note must ask "Who should I talk to there?"`);
  }
  return p;
}

function check(d) {
  const problems = [];
  const note = String(d.linkedinNote || "");
  if (!note) problems.push("no LinkedIn note");
  if (note.length > 300) problems.push(`LinkedIn note is ${note.length} characters (under 300)`);
  problems.push(...contactProblems(d));
  if (d.mode === "warm") {
    const w = d.warm || {};
    if (!w.name || !w.note) problems.push("warm mode needs warm.name and warm.note");
    if (w.name && (d.contact || {}).name !== w.name) problems.push(`warm mode: the contact must be the warm contact (${w.name}), not ${(d.contact || {}).name || "someone else"}`);
    const n = String(w.note || "");
    if (n.split(/\s+/).filter(Boolean).length > 120) problems.push("the warm note is over 120 words; keep it short");
    if (d.role && !n.toLowerCase().includes(String(d.role).toLowerCase())) problems.push(`the warm note should ask about the ${d.role} role by name`);
    if (d.email && d.email.body) problems.push(...emailProblems(d));
  } else {
    problems.push(...emailProblems(d));
  }
  problems.push(...checkAlumni(d.alumni));
  problems.push(...connectorProblems(d));
  const text = JSON.stringify(d).replace(/https?:\/\/[^"\s]+/g, "");
  if (/[\u2013\u2014]/.test(text)) problems.push("em or en dash");
  if (/\S - \S/.test(text)) problems.push('a spaced hyphen used as a dash (" - ")');
  const ph = text.match(/\[[^\[\]"]{1,40}\]/);
  if (ph) problems.push(`placeholder ${ph[0]}`);
  return problems;
}

// A paragraph with **bold** runs.
function runs(docx, text, opts = {}) {
  const { TextRun } = docx;
  return String(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => {
    const bold = /^\*\*.*\*\*$/.test(part);
    return new TextRun({ text: bold ? part.slice(2, -2) : part, font: "Arial", size: 21, bold: bold || !!opts.bold, color: opts.color });
  });
}

async function writeDocx(d, out) {
  const docx = loadDocx();
  if (!docx) throw new Error("the docx package is not installed (run npm install in generators/resume)");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
  const P = (text, opts = {}) => new Paragraph({ children: runs(docx, text, opts), spacing: { after: 120 } });
  const H = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: "Arial", bold: true, color: "1A2B4A", size: 26 })], spacing: { before: 240, after: 120 } });
  const c = d.contact || {};
  const e = d.email || {};
  const kids = [
    new Paragraph({ children: [new TextRun({ text: `Outreach: ${d.company}, ${d.role || ""}`.replace(/, $/, ""), font: "Arial", bold: true, size: 32, color: "1A2B4A" })], spacing: { after: 120 } }),
    P(c.name ? `Contact: ${c.name}, ${c.title} (${c.confirmed ? `confirmed: ${c.source}, ${c.date}` : "not confirmed"})` : `Contact: none confirmed${c.note ? `. ${c.note}` : ""}`, { color: "555555" }),
  ];
  if (d.mode === "warm" && d.warm) {
    kids.push(H(`Note to ${d.warm.name} (${d.warm.relation})`));
    String(d.warm.note).split("\n").filter((x) => x.trim()).forEach((x) => kids.push(P(x)));
  }
  if (e.body) {
    kids.push(H(d.mode === "warm" ? "Email (only after the warm note)" : "Email"));
    kids.push(P(c.confirmed && e.to ? `To: ${e.to}   [${e.addressStatus}]` : "No recipient: apply first, then use LinkedIn to find the right person.", { color: "555555" }));
    kids.push(P(`Subject: ${e.subject}`, { bold: true }));
    String(e.body).split("\n").filter((x) => x.trim()).forEach((x) => kids.push(P(x.replace(/^[-*]\s+/, "• "))));
  }
  kids.push(H(`LinkedIn connection note (${String(d.linkedinNote || "").length} characters)`), P(String(d.linkedinNote || "")));
  for (const a of d.alumni || []) {
    kids.push(H(`Alumni note: ${a.school} (${String(a.note || "").length} characters)`));
    (a.steps || []).forEach((s, i) => kids.push(P(`${i + 1}. ${s}`)));
    kids.push(P(String(a.note || "")));
  }
  for (const x of d.connectors || []) {
    kids.push(H(`Connector: ${x.name}, ${x.title}, ${x.company} (${x.type})`));
    if (x.why) kids.push(P(`Why: ${x.why}`));
    kids.push(P(`Confirmed: ${x.source}, ${x.date}${x.url ? `, ${x.url}` : ""}`, { color: "555555" }));
    kids.push(P(x.email ? `Email: ${x.email}   [${x.addressStatus}]` : "Email: not found. Use LinkedIn.", { color: "555555" }));
    kids.push(P(`Note (${String(x.note || "").length} characters):`, { bold: true }));
    kids.push(P(String(x.note || "")));
  }
  if ((d.sources || []).length) {
    kids.push(H("Sources"));
    d.sources.forEach((s) => kids.push(P(s, { color: "555555" })));
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
    console.log(`Wrote ${args.out}. ${d.mode === "warm" ? `Warm note to ${d.warm.name}. ` : ""}LinkedIn note: ${String(d.linkedinNote || "").length} characters. Alumni notes: ${(d.alumni || []).map((a) => `${a.school} (${a.note.length})`).join(", ") || "none"}. Connectors: ${(d.connectors || []).map((x) => `${x.name} (${x.type})`).join(", ") || "none"}.`);
    if (problems.length) { console.error("QA failed:\n- " + problems.join("\n- ")); process.exit(1); }
    console.log("QA passed.");
  }).catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { check, checkAlumni, emailProblems, contactProblems, NICKNAMES };
