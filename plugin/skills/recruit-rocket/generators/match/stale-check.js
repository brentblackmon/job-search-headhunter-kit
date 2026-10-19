#!/usr/bin/env node
// After the user answers a question, make sure no file still says the old thing.
//
// Usage:
//   node stale-check.js --dir "<company folder>" --old "expected October 2026" [--old "..."] [--also facts.md]
//
// Reads every .pdf (pdftotext), .docx (its text), .md, .json, and .txt in the folder (and any
// --also files), and lists each file that still contains an old phrase, ignoring case and
// spacing. Exits 1 if any file does: rebuild those files before saying the package is ready.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function textOf(file) {
  const ext = path.extname(file).toLowerCase();
  try {
    if (ext === ".pdf") return execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
    if (ext === ".docx") return execFileSync("unzip", ["-p", file, "word/document.xml"], { encoding: "utf8" }).replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "");
    if ([".md", ".json", ".txt"].includes(ext)) return fs.readFileSync(file, "utf8");
  } catch { return ""; }
  return null;
}
const squash = (s) => String(s).toLowerCase().replace(/\s+/g, " ");

function staleFiles(files, phrases) {
  const hits = [];
  for (const f of files) {
    const t = textOf(f);
    if (t == null) continue;
    const s = squash(t);
    for (const ph of phrases) if (s.includes(squash(ph))) hits.push({ file: f, phrase: ph });
  }
  return hits;
}

if (require.main === module) {
  const olds = [], also = [];
  let dir = null;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--dir") dir = process.argv[++i];
    else if (process.argv[i] === "--old") olds.push(process.argv[++i]);
    else if (process.argv[i] === "--also") also.push(process.argv[++i]);
  }
  if (!dir || !olds.length) {
    console.error('Usage: node stale-check.js --dir "<company folder>" --old "old phrase" [--old ...] [--also facts.md]');
    process.exit(2);
  }
  const files = fs.readdirSync(dir).map((f) => path.join(dir, f)).filter((f) => fs.statSync(f).isFile()).concat(also);
  const hits = staleFiles(files, olds);
  if (!hits.length) { console.log(`Clean: no file still says ${olds.map((o) => `"${o}"`).join(" or ")}.`); process.exit(0); }
  for (const h of hits) console.log(`Still says "${h.phrase}": ${path.basename(h.file)}`);
  process.exit(1);
}

module.exports = { staleFiles, textOf };
