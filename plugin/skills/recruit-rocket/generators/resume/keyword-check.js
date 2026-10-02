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
// Writes keyword-check.md (matched and missing) and prints the count line.

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

// Short all-capital acronyms (AD, MEM, A+) must match in capitals, so "AD" does not
// match "ad" inside other words or text. Everything else ignores case.
function found(text, variant) {
  const v = clean(variant).trim();
  const esc = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const caseSensitive = v.replace(/[^A-Za-z]/g, "").length <= 3 && v === v.toUpperCase();
  const re = new RegExp(`(^|[^A-Za-z0-9])${esc}(?![A-Za-z0-9])`, caseSensitive ? "" : "i");
  return re.test(text);
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
      rows.push({ name, kind, hit: hit || "" });
    }
  }
  return rows;
}

function report(keywords, rows) {
  const matched = rows.filter((r) => r.hit);
  const missing = rows.filter((r) => !r.hit);
  const line = `ATS keywords: ${matched.length} of ${rows.length} matched.`;
  const md = [
    `# ATS keyword check${keywords.posting ? `: ${keywords.posting}` : ""}`,
    "",
    `**${line}**`,
    "",
    "## Matched",
    matched.length ? "| Keyword | Found as | Posting lists it as |\n|---|---|---|\n" + matched.map((r) => `| ${r.name} | ${r.hit} | ${r.kind} |`).join("\n") : "None.",
    "",
    "## Missing",
    missing.length ? missing.map((r) => `- ${r.name} (${r.kind})`).join("\n") : "None.",
    "",
    "Ask the user about each missing keyword, one at a time. Add one to the resume only after the user confirms it in facts.md.",
    "",
  ].join("\n");
  return { line, md, matched, missing };
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
  if (out.missing.length) console.log("Missing: " + out.missing.map((r) => r.name).join(", "));
  console.log("Wrote " + outPath);
}

module.exports = { check, report, found, variantsFor };
