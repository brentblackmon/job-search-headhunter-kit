#!/usr/bin/env node
// Copy check: no resume or cover letter sentence may share 6 or more consecutive words
// with the job posting. Tool names, product names, the company name, and the job title
// do not count toward the 6, so "Intune", "Microsoft 365", or "Senior Desktop Engineer"
// never trip it on their own.
//
// Usage:
//   node copy-check.js --posting posting.md --doc Name_Resume_Company.pdf [--doc cover_letter.md]
//                      [--keywords keywords.json] [--allow "Senior Desktop Engineer,Northgate"] [--out copy-check.md]
// keywords.json is the same file the ATS keyword check uses; its required and preferred
// keywords (with their variants) and its "posting" line ("Company, Title") are allowed.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { variantsFor } = require("./keyword-check");

const RUN = 6;

const words = (text) =>
  String(text)
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .split(/[^a-z0-9+#']+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);

function readDoc(file) {
  if (/\.pdf$/i.test(file)) return execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
  return fs.readFileSync(file, "utf8");
}

// Marks which doc words belong to an allowed phrase (tool, product, company, title).
function allowedMask(tokens, allowed) {
  const mask = new Array(tokens.length).fill(false);
  for (const phrase of allowed) {
    const p = words(phrase);
    if (!p.length) continue;
    for (let i = 0; i + p.length <= tokens.length; i++) {
      if (p.every((w, k) => tokens[i + k] === w)) for (let k = 0; k < p.length; k++) mask[i + k] = true;
    }
  }
  return mask;
}

// Returns the shared runs that still have 6 or more words once allowed names are set aside.
function copied(postingText, docText, allowed = []) {
  const post = words(postingText);
  const doc = words(docText);
  const grams = new Set();
  for (let i = 0; i + RUN <= post.length; i++) grams.add(post.slice(i, i + RUN).join(" "));
  const mask = allowedMask(doc, allowed);
  const runs = [];
  let i = 0;
  while (i + RUN <= doc.length) {
    if (!grams.has(doc.slice(i, i + RUN).join(" "))) { i++; continue; }
    // Extend the run while each next 6-word window is also in the posting.
    let end = i + RUN;
    while (end < doc.length && grams.has(doc.slice(end - RUN + 1, end + 1).join(" "))) end++;
    const own = mask.slice(i, end).filter((m) => !m).length;
    if (own >= RUN) runs.push(doc.slice(i, end).join(" "));
    i = end;
  }
  return [...new Set(runs)];
}

function allowedFrom(keywordsFile, extra) {
  const allowed = [...extra];
  if (keywordsFile) {
    const k = JSON.parse(fs.readFileSync(keywordsFile, "utf8"));
    for (const entry of [...(k.required || []), ...(k.preferred || [])]) allowed.push(...variantsFor(entry).variants);
    if (k.posting) allowed.push(...String(k.posting).split(",").map((s) => s.trim()));
  }
  return allowed;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const docs = [];
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--doc") docs.push(argv[++i]);
    else if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[++i];
  }
  if (!args.posting || !docs.length) {
    console.error("Usage: node copy-check.js --posting posting.md --doc resume.pdf [--doc cover_letter.md] [--keywords keywords.json] [--allow \"Title,Company\"] [--out copy-check.md]");
    process.exit(2);
  }
  const allowed = allowedFrom(args.keywords, args.allow ? args.allow.split(",").map((s) => s.trim()) : []);
  const posting = readDoc(args.posting);
  const lines = [`# Copy check against the posting`, "", `A sentence fails when it shares ${RUN} or more words in a row with the posting (tool, product, company, and job title names do not count).`, ""];
  let failed = false;
  for (const doc of docs) {
    const runs = copied(posting, readDoc(doc), allowed);
    failed = failed || runs.length > 0;
    console.log(`  [${runs.length ? "FAIL" : "PASS"}] No copied posting phrases (${path.basename(doc)}): ${runs.length ? runs.map((r) => `"${r}"`).join("; ") : "none"}`);
    lines.push(`## ${path.basename(doc)}`, runs.length ? runs.map((r) => `- "${r}": rewrite in the user's own words from facts.md`).join("\n") : "No copied phrases.", "");
  }
  if (args.out) fs.writeFileSync(args.out, lines.join("\n"));
  process.exit(failed ? 1 : 0);
}

module.exports = { copied, allowedFrom, words };
