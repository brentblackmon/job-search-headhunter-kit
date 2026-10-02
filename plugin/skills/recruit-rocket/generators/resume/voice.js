#!/usr/bin/env node
// Voice checks shared by the resume QA and the resume review.
//
// AI-tell words: words and phrases that make a resume read as machine-written. Each
// entry matches every word form (leverage, leverages, leveraged, leveraging). A hit
// is a question for the user, not an automatic rewrite: they keep it if it is a word
// they really use, or swap it for a plain verb (led, ran, built, cut, grew, fixed).
//
// Weak verbs: openings that hide what the person did ("responsible for", "helped").
// The review lists them; the QA does not fail on them.
//
// CLI: node voice.js --doc resume.pdf|cover_letter.md [--names "Acme Corp,WM Synergy"] [--keep "leverage"]

const fs = require("fs");
const { execFileSync } = require("child_process");

const AI_TELLS = [
  { word: "spearhead", re: "spearhead(?:s|ed|ing)?" },
  { word: "orchestrate", re: "orchestrat(?:e|es|ed|ing|ion|ions)" },
  { word: "leverage", re: "leverag(?:e|es|ed|ing)" },
  { word: "utilize", re: "utili[sz](?:e|es|ed|ing|ation)" },
  { word: "delve", re: "delv(?:e|es|ed|ing)" },
  { word: "synergy", re: "synerg(?:y|ies|istic|ize|ized|izing)" },
  { word: "seamless", re: "seamless(?:ly)?" },
  { word: "robust", re: "robust(?:ly|ness)?" },
  { word: "cutting-edge", re: "cutting[ -]edge" },
  { word: "transformative", re: "transformative(?:ly)?" },
  { word: "game-changer", re: "game[ -]chang(?:er|ers|ing)" },
  { word: "results-driven", re: "results[ -]driven" },
  { word: "passionate", re: "passionate(?:ly)?" },
  { word: "dynamic", re: "dynamic(?:ally)?" },
  { word: "fast-paced", re: "fast[ -]paced" },
  { word: "unlock", re: "unlock(?:s|ed|ing)?" },
  { word: "proven track record", re: "proven track records?" },
  { word: "I'm excited to", re: "(?:i'm|i am) (?:so |very |really )?excited to" },
];

const WEAK_VERBS = [
  "responsible for", "helped", "helped to", "assisted", "assisted with", "worked on", "worked with",
  "participated in", "involved in", "was part of", "duties included", "handled", "tasked with", "contributed to",
];

// Company, school, and product names are never the user's word choice, so blank them
// out first. "WM Synergy Resources" and "Microsoft Dynamics" are names, not filler.
function blankNames(text, names) {
  let t = String(text).replace(/[‘’]/g, "'");
  for (const n of names || []) {
    if (!n) continue;
    t = t.replace(new RegExp(String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return t;
}

// Returns [{word, found}] for each AI-tell word in the text, minus the ones the user
// chose to keep. "found" is the exact form used, so the question can quote it.
function aiTells(text, { names = [], keep = [] } = {}) {
  const t = blankNames(text, names);
  const kept = new Set(keep.map((k) => String(k).toLowerCase()));
  const hits = [];
  for (const { word, re } of AI_TELLS) {
    if (kept.has(word.toLowerCase())) continue;
    const m = t.match(new RegExp(`(^|[^A-Za-z])(${re})(?![A-Za-z])`, "i"));
    if (m) hits.push({ word, found: m[2] });
  }
  return hits;
}

function weakVerbs(text, { names = [] } = {}) {
  const t = blankNames(text, names).toLowerCase();
  return WEAK_VERBS.filter((v) => new RegExp(`(^|[^a-z])${v}(?![a-z])`).test(t));
}

function readDoc(file) {
  if (/\.pdf$/i.test(file)) return execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
  return fs.readFileSync(file, "utf8");
}

if (require.main === module) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[++i];
  if (!args.doc) {
    console.error('Usage: node voice.js --doc resume.pdf [--names "Company A,Company B"] [--keep "leverage"]');
    process.exit(2);
  }
  const list = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
  const text = readDoc(args.doc);
  const tells = aiTells(text, { names: list(args.names), keep: list(args.keep) });
  const weak = weakVerbs(text, { names: list(args.names) });
  console.log(`AI-tell words: ${tells.length ? tells.map((h) => `"${h.found}"`).join(", ") : "none"}`);
  console.log(`Weak verbs: ${weak.length ? weak.map((w) => `"${w}"`).join(", ") : "none"}`);
}

module.exports = { AI_TELLS, WEAK_VERBS, aiTells, weakVerbs, blankNames };
