#!/usr/bin/env node
// ATS keyword check: which of a posting's required and preferred skills and tools
// appear in the resume text, counting common variants (SCCM = MECM, Microsoft 365 =
// Office 365, Active Directory = AD, Entra ID = Azure AD, and so on).
//
// Usage:
//   node keyword-check.js --keywords keywords.json --resume Name_Resume_Company.pdf --out keyword-check.md
//
// keywords.json:
//   { "posting": "Company, Title",
//     "required": ["Intune", "SCCM", ...],
//     "preferred": ["Jamf", {"keyword": "Autopilot", "variants": ["Windows Autopilot"]}] }
// --resume takes the resume PDF (read with pdftotext, the way an ATS reads it),
// or a .json or .txt file when pdftotext is not installed.
// Writes keyword-check.md and prints the headline: required skills covered (preferred
// skills are listed but never counted).
//
// A partial match is a keyword whose words show up in another form: a different
// word ending ("Mentor" for "Mentoring", "led" for "Leadership"), or the main word of
// a multi-word keyword next to a related word ("Hardware Lifecycle" for "Lifecycle
// Management"). These count as covered and keep the user's own wording. Product names in
// the variant table below only match exactly, so "team" never counts as "Teams".

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// Each group lists names that mean the same thing to a recruiter. The first is the
// name shown in the report. Add groups here as testers find new ones.
const VARIANTS = [
  ["SCCM", "MECM", "ConfigMgr", "Configuration Manager", "Endpoint Configuration Manager", "System Center Configuration Manager"],
  ["Microsoft 365", "M365", "Office 365", "O365"],
  ["Active Directory", "AD", "AD DS", "Active Directory Domain Services"],
  ["Entra ID", "Microsoft Entra", "Azure AD", "Azure Active Directory", "AAD"],
  ["Intune", "Microsoft Intune", "Endpoint Manager", "Microsoft Endpoint Manager", "MEM"],
  ["Autopilot", "Windows Autopilot"],
  ["Group Policy", "GPO", "GPOs"],
  ["Windows 11", "Win 11", "Win11"],
  ["Windows 10", "Win 10", "Win10"],
  ["macOS", "Mac OS", "OS X"],
  ["Jamf", "Jamf Pro"],
  ["ServiceNow", "Service Now"],
  ["PowerShell", "PowerShell scripting"],
  ["Exchange Online", "EXO"],
  ["Microsoft Teams", "MS Teams", "Teams"],
  ["CompTIA A+", "A+"],
  ["CompTIA Network+", "Network+"],
  ["CompTIA Security+", "Security+"],
  ["VMware", "vSphere"],
  ["Citrix", "Citrix Workspace", "XenApp", "XenDesktop"],
];

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}

// Hyphens and slashes read as spaces, so "Entra-ID" and "Windows 10/11" still match.
const clean = (s) => String(s).replace(/[-‐-―/]+/g, " ").replace(/\s+/g, " ");

function variantsFor(entry) {
  const name = typeof entry === "string" ? entry : entry.keyword;
  const extra = typeof entry === "object" && entry.variants ? entry.variants : [];
  const group = VARIANTS.find((g) => g.some((v) => v.toLowerCase() === String(name).toLowerCase())) || [];
  return { name, variants: [...new Set([name, ...group, ...extra])] };
}

// Product names that are also everyday words match only with a capital letter.
const CAPITALIZED_ONLY = new Set(["Teams"]);

// Short all-capital acronyms (AD, MEM, A+) must match in capitals, so "AD" does not
// match "ad" inside other words or text. Everything else ignores case.
function found(text, variant) {
  const v = clean(variant).trim();
  const esc = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const caseSensitive = CAPITALIZED_ONLY.has(v) || (v.replace(/[^A-Za-z]/g, "").length <= 3 && v === v.toUpperCase());
  const re = new RegExp(`(^|[^A-Za-z0-9])${esc}(?![A-Za-z0-9])`, caseSensitive ? "" : "i");
  return re.test(text);
}

// Word stems, so mentor, mentored, and mentoring compare equal, and so do manage,
// managed, managing, and management. Irregular forms are listed by hand.
const IRREGULAR = { led: "lead", leading: "lead", leader: "lead", leaders: "lead", leadership: "lead" };
function stem(word) {
  let w = word.toLowerCase();
  if (IRREGULAR[w]) return IRREGULAR[w];
  for (const suffix of ["ments", "ment", "ships", "ship", "ings", "ing", "ed", "ers", "er", "es", "s"]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) { w = w.slice(0, -suffix.length); break; }
  }
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

// Words that only describe the main word in a multi-word keyword. "Lifecycle" is the
// main word of "Lifecycle Management"; "Root" and "Cause" are the main words of
// "Root Cause Analysis".
const GENERIC = new Set(["management", "analysis", "administration", "support", "service", "services", "solution", "solutions", "system", "systems", "tool", "tools", "platform", "online", "experience", "skills"].map(stem));

// Look for a keyword's words in another form. Returns the resume phrase it found, or "".
function partial(text, keyword) {
  const words = String(keyword).split(/[^A-Za-z0-9+#]+/).filter(Boolean);
  const main = words.filter((w) => !GENERIC.has(stem(w)));
  const need = (main.length ? main : words).map(stem);
  // Search phrase by phrase, so a match never spans two lines or two list items.
  for (const phrase of text.split(/[\n|,;:.\u2022()]+/)) {
    const tokens = phrase.split(/[^A-Za-z0-9+#]+/).filter(Boolean);
    const stems = tokens.map(stem);
    const at = need.map((n) => stems.indexOf(n));
    if (at.some((i) => i === -1)) continue;
    const lo = Math.min(...at), hi = Math.max(...at);
    if (hi - lo > 4) continue;
    // A one-word keyword matches on its own; a longer one needs a related word next to
    // its main words, which is the phrase's neighbors (or its own generic word).
    const from = Math.max(0, lo - 1), to = Math.min(tokens.length - 1, hi + 1);
    if (words.length > 1 && to - from + 1 < 2) continue;
    return tokens.slice(words.length > 1 ? from : lo, (words.length > 1 ? to : hi) + 1).join(" ");
  }
  return "";
}

function resumeText(file) {
  if (/\.pdf$/i.test(file)) return execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
  const raw = fs.readFileSync(file, "utf8");
  if (!/\.json$/i.test(file)) return raw;
  const strings = [];
  const walk = (v) => (typeof v === "string" ? strings.push(v) : v && typeof v === "object" && Object.values(v).forEach(walk));
  walk(JSON.parse(raw));
  return strings.join("\n");
}

function check(keywords, text) {
  const t = clean(text);
  const rows = [];
  for (const kind of ["required", "preferred"]) {
    for (const entry of keywords[kind] || []) {
      const { name, variants } = variantsFor(entry);
      // Blank out longer names from other groups that contain one of ours, so "AD"
      // does not match inside "Azure AD" (which is Entra ID, not Active Directory).
      let own = t;
      for (const g of VARIANTS) {
        if (g.some((v) => variants.includes(v))) continue;
        for (const other of g) {
          if (variants.some((v) => v !== other && found(clean(other), v))) own = own.split(new RegExp(clean(other).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")).join(" ");
        }
      }
      const hit = variants.find((v) => found(own, v));
      // Product names (anything in the variant table) only match exactly.
      const product = VARIANTS.some((g) => g.some((v) => variants.includes(v)));
      // Keep line breaks here: partial matching works one line or list item at a time.
      const near = hit || product ? "" : partial(String(text).replace(/[-\u2010-\u2015/]+/g, " "), name);
      rows.push({ name, kind, hit: hit || "", partial: near });
    }
  }
  return rows;
}

// The headline counts required skills only. A skill the resume shows in the user's own
// words (a partial match) counts as covered. Preferred skills are listed, not counted,
// so nobody is pushed to chase 100%.
function report(keywords, rows) {
  const required = rows.filter((r) => r.kind === "required");
  const preferred = rows.filter((r) => r.kind === "preferred");
  const covered = (r) => r.hit || r.partial;
  const reqCovered = required.filter(covered);
  const ownWords = reqCovered.filter((r) => !r.hit).length;
  const line = `Required skills covered: ${reqCovered.length} of ${required.length}` + (ownWords ? ` (${ownWords} in your own words).` : ".");
  const matched = rows.filter((r) => r.hit);
  const partials = rows.filter((r) => !r.hit && r.partial);
  const missing = rows.filter((r) => !covered(r));
  const table = (list, col) => "| Skill | " + col + " |\n|---|---|\n" + list.map((r) => `| ${r.name} | ${r.hit || r.partial} |`).join("\n");
  const md = [
    `# ATS keyword check${keywords.posting ? `: ${keywords.posting}` : ""}`,
    "",
    `**${line}**`,
    "",
    "## Required skills",
    "### Covered",
    reqCovered.length ? table(reqCovered, "Resume says") : "None.",
    "",
    "### Missing",
    required.filter((r) => !covered(r)).map((r) => `- ${r.name}`).join("\n") || "None.",
    "",
    "## Preferred skills (listed, not counted)",
    preferred.length ? preferred.map((r) => `- ${r.name}: ${covered(r) ? `covered ("${r.hit || r.partial}")` : "not on the resume"}`).join("\n") : "None.",
    "",
    "Skills shown in the user's own words count as covered; keep their wording. Ask only about missing required skills, at most 2 questions, and stop once every required skill the user has really used is in. Never add a keyword just to raise the count.",
    "",
  ].join("\n");
  return { line, md, matched, partials, missing, required, preferred };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (!args.keywords || !args.resume) {
    console.error("Usage: node keyword-check.js --keywords keywords.json --resume resume.pdf [--out keyword-check.md]");
    process.exit(2);
  }
  const keywords = JSON.parse(fs.readFileSync(args.keywords, "utf8"));
  const out = report(keywords, check(keywords, resumeText(args.resume)));
  const outPath = typeof args.out === "string" ? args.out : path.join(path.dirname(args.keywords), "keyword-check.md");
  fs.writeFileSync(outPath, out.md);
  console.log(out.line);
  if (out.partials.length) console.log("In your own words: " + out.partials.map((r) => `${r.name} (resume says "${r.partial}")`).join(", "));
  const missingRequired = out.required.filter((r) => !r.hit && !r.partial);
  if (missingRequired.length) console.log("Missing required: " + missingRequired.map((r) => r.name).join(", "));
  console.log("Wrote " + outPath);
}

module.exports = { check, report, found, variantsFor, stem, partial };
