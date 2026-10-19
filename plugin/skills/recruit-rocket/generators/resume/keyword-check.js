#!/usr/bin/env node
// ATS keyword check: which of a posting's required and preferred skills and tools
// appear in the resume text, counting common variants (SCCM = MECM, Microsoft 365 =
// Office 365, Active Directory = AD, Entra ID = Azure AD, and so on).
//
// Usage:
//   node keyword-check.js --keywords keywords.json --resume Name_Resume_Company.pdf --posting posting.md --out keyword-check.md
//
// keywords.json is written once per posting and reused, so the counts stay the same
// across runs. With --posting, the first run stores a fingerprint of posting.md in
// keywords.json ("postingHash"). A later run whose posting.md has changed stops with
// exit code 3 and "posting.md changed", which means: rebuild keywords.json from the new
// posting (without postingHash) and run again. Spacing changes do not count as changes.
//
// keywords.json:
//   { "posting": "Company, Title",
//     "required": ["Intune", "SCCM", ...],
//     "preferred": ["Jamf", {"keyword": "Autopilot", "variants": ["Windows Autopilot"]}] }
// --resume takes the resume PDF (read with pdftotext, the way an ATS reads it),
// or a .json or .txt file when pdftotext is not installed.
// Writes keyword-check.md and prints two numbers for the required skills (preferred
// skills are listed but never counted):
//   Required skills covered: X of Y   (the posting's term, a variant, or the user's wording)
//   Exact-term matches: X of Y        (the posting's own term, as the posting writes it)
// Skills covered only by a variant or the user's wording are listed as "Covered in your
// words, not the posting's exact term", so the user can choose to add the exact term.
//
// Literal terms ("terms" in keywords.json): the full list of phrases from every
// responsibility and requirement line of the posting, usually 35 to 50. A term matches
// only when the posting's own words are on the resume, as written or with a different word
// ending, close together in one line ("cross-sell" and "cross-selling"; "Net Revenue
// Retention (NRR)" matches either form). Meaning-alikes never count: "win rates went from
// 60% to 95%" is not "customer acquisition". Prints "Literal terms matched: X of N" and the
// missing terms.
//
// A partial match is a keyword whose words show up in another form: a different
// word ending ("Mentor" for "Mentoring", "led" for "Leadership"), or the main word of
// a multi-word keyword next to a related word ("Hardware Lifecycle" for "Lifecycle
// Management"). These count as covered and keep the user's own wording. Product names in
// the variant table below only match exactly, so "team" never counts as "Teams".

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const crypto = require("crypto");

// Fingerprint of a posting's words, ignoring spacing and line breaks.
function postingHash(text) {
  return crypto.createHash("sha256").update(String(text).replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
}

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

// Small words never have to match, so "Time to Go-Live" can match "go-live time".
const STOP = new Set(["a", "an", "and", "the", "of", "to", "for", "in", "on", "with", "or"]);

// Look for a keyword's words in another form. Returns the resume phrase it found, or "".
function partial(text, keyword) {
  const words = String(keyword).split(/[^A-Za-z0-9+#]+/).filter((w) => w && !STOP.has(w.toLowerCase()));
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
    // Show the matched words; add the neighbors only when one main word matched alone.
    const widen = words.length > 1 && hi === lo;
    return tokens.slice(widen ? from : lo, (widen ? to : hi) + 1).join(" ");
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
      // The posting's own term first, so an exact match is reported as exact.
      const exact = found(own, name);
      const hit = exact ? name : variants.find((v) => found(own, v));
      // Product names (anything in the variant table) only match exactly.
      const product = VARIANTS.some((g) => g.some((v) => variants.includes(v)));
      // Keep line breaks here: partial matching works one line or list item at a time.
      const near = hit || product ? "" : partial(String(text).replace(/[-\u2010-\u2015/]+/g, " "), name);
      rows.push({ name, kind, hit: hit || "", partial: near, exact });
    }
  }
  return rows;
}

// Literal match: the term's own words (stopwords aside), each with the same stem, within a
// short window of one line or list item. Product names from the variant table count.
const STOPWORDS = new Set(["a", "an", "and", "the", "of", "to", "for", "in", "on", "with", "or", "at", "by", "as", "&"]);
function literal(text, term) {
  const alts = String(term).split(/\s*[()]\s*/).map((x) => x.trim()).filter(Boolean);
  for (const alt of alts) {
    const { variants } = variantsFor(alt);
    const product = VARIANTS.some((g) => g.some((v) => v.toLowerCase() === alt.toLowerCase()));
    if ((product ? variants : [alt]).some((v) => found(clean(text), v))) return true;
    const words = alt.split(/[^A-Za-z0-9+#]+/).filter((w) => w && !STOPWORDS.has(w.toLowerCase()));
    if (!words.length) continue;
    const need = words.map(stem);
    for (const phrase of String(text).replace(/[-\u2010-\u2015/]+/g, " ").split(/[\n|,;:.\u2022()]+/)) {
      const stems = phrase.split(/[^A-Za-z0-9+#]+/).filter(Boolean).map(stem);
      const at = need.map((n) => stems.indexOf(n));
      if (at.some((i) => i === -1)) continue;
      if (Math.max(...at) - Math.min(...at) <= need.length + 1) return true;
    }
  }
  return false;
}
function literalTerms(keywords, text) {
  const terms = [...new Set((keywords.terms || []).map(String))];
  const matched = terms.filter((t) => literal(text, t));
  return { terms, matched, missing: terms.filter((t) => !matched.includes(t)), line: `Literal terms matched: ${matched.length} of ${terms.length}` };
}

// The two headline numbers count required skills only. A skill the resume shows in the
// user's own words (a variant or a partial match) counts as covered but not as an exact
// match. Preferred skills are listed, not counted, so nobody is pushed to chase 100%.
function report(keywords, rows) {
  const required = rows.filter((r) => r.kind === "required");
  const preferred = rows.filter((r) => r.kind === "preferred");
  const covered = (r) => r.hit || r.partial;
  const reqCovered = required.filter(covered);
  const reqExact = required.filter((r) => r.exact);
  const ownWords = reqCovered.filter((r) => !r.exact);
  const line = `Required skills covered: ${reqCovered.length} of ${required.length}`;
  const exactLine = `Exact-term matches: ${reqExact.length} of ${required.length}`;
  const matched = rows.filter((r) => r.hit);
  const partials = rows.filter((r) => !r.hit && r.partial);
  const missing = rows.filter((r) => !covered(r));
  const said = (r) => r.hit || r.partial;
  const md = [
    `# ATS keyword check${keywords.posting ? `: ${keywords.posting}` : ""}`,
    "",
    `**${line}**`,
    `**${exactLine}**`,
    "",
    "## Required skills",
    "### Exact term",
    reqExact.length ? "| Skill |\n|---|\n" + reqExact.map((r) => `| ${r.name} |`).join("\n") : "None.",
    "",
    "### Covered in your words, not the posting's exact term",
    ownWords.length ? "| Posting says | Resume says |\n|---|---|\n" + ownWords.map((r) => `| ${r.name} | ${said(r)} |`).join("\n") : "None.",
    "",
    "### Missing",
    required.filter((r) => !covered(r)).map((r) => `- ${r.name}`).join("\n") || "None.",
    "",
    "## Preferred skills (listed, not counted)",
    preferred.length ? preferred.map((r) => `- ${r.name}: ${r.exact ? "exact term" : covered(r) ? `covered in your words ("${said(r)}")` : "not on the resume"}`).join("\n") : "None.",
    "",
    "A skill in your own words counts as covered. The ATS may look for the posting's exact term, so you can choose to add it to Core Competencies; your wording stays everywhere else. Ask only about missing required skills you have really used. Never add a term for a skill you have not used.",
    "",
  ].join("\n");
  return { line, exactLine, md, matched, partials, ownWords, missing, required, preferred };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (!args.keywords || !args.resume) {
    console.error("Usage: node keyword-check.js --keywords keywords.json --resume resume.pdf [--posting posting.md] [--out keyword-check.md]");
    process.exit(2);
  }
  const keywords = JSON.parse(fs.readFileSync(args.keywords, "utf8"));
  if (typeof args.posting === "string") {
    const hash = postingHash(fs.readFileSync(args.posting, "utf8"));
    if (keywords.postingHash && keywords.postingHash !== hash) {
      console.error(`posting.md changed since ${args.keywords} was written. Rebuild keywords.json from the new posting (leave out postingHash) and run again.`);
      process.exit(3);
    }
    if (!keywords.postingHash) {
      keywords.postingHash = hash;
      fs.writeFileSync(args.keywords, JSON.stringify(keywords, null, 2) + "\n");
    }
  }
  const out = report(keywords, check(keywords, resumeText(args.resume)));
  const outPath = typeof args.out === "string" ? args.out : path.join(path.dirname(args.keywords), "keyword-check.md");
  fs.writeFileSync(outPath, out.md);
  console.log(out.line);
  console.log(out.exactLine);
  const text = resumeText(args.resume);
  const lit = literalTerms(keywords, text);
  if (lit.terms.length) {
    console.log(lit.line);
    if (lit.missing.length) console.log("Missing literal terms: " + lit.missing.join(", "));
    fs.appendFileSync(outPath, `\n## Literal terms (the posting's own words)\n**${lit.line}**\n\n### Missing\n${lit.missing.map((t) => `- ${t}`).join("\n") || "None."}\n`);
  }
  if (out.ownWords.length) console.log("Covered in your words, not the posting's exact term: " + out.ownWords.map((r) => `${r.name} (resume says "${r.hit || r.partial}")`).join(", "));
  const missingRequired = out.required.filter((r) => !r.hit && !r.partial);
  if (missingRequired.length) console.log("Missing required: " + missingRequired.map((r) => r.name).join(", "));
  console.log("Wrote " + outPath);
}

module.exports = { check, report, found, variantsFor, stem, partial, postingHash, literal, literalTerms };
