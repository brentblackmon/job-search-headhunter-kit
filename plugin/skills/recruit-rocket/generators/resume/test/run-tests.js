#!/usr/bin/env node
// Regression tests for build-resume.js and qa.js. Run with: npm test
// Each case builds a resume from the fictional sample with a few changes, then reads
// the QA lines the generator prints. Needs the same tools as the generator
// (Node, LibreOffice, poppler).

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const sample = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "resume.json"), "utf8"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-resume-test-"));

function build(name, change, extraArgs = []) {
  const data = JSON.parse(JSON.stringify(sample));
  change(data);
  const dataPath = path.join(work, `${name}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  const out = spawnSync("node", [path.join(root, "build-resume.js"), "--data", dataPath, "--out", path.join(work, name), "--pages", "2", ...extraArgs], { encoding: "utf8" });
  const text = out.stdout + out.stderr;
  const check = (label) => {
    const line = text.split("\n").find((l) => l.includes(`] ${label}`)) || "";
    return line.includes("[PASS]") ? "PASS" : line.includes("[FAIL]") ? "FAIL" : "MISSING";
  };
  return { text, check };
}

const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}

// 1. First stat value also appears in the phone number (the Hyderabad false failure).
{
  const r = build("stat-value-in-phone", (d) => {
    d.contact = ["Hyderabad, India", "+91-9505144222", "tester@example.com", "linkedin.com/in/tester-example"];
    d.stats[0] = { value: "22", label: "releases shipped" };
  });
  expect("stat value inside phone number: stat line check passes", r.check("Stat line fits on one line"), "PASS");
  expect("Hyderabad, India defaults to A4", r.text.includes("Paper: A4") ? "A4" : "other", "A4");
  expect("A4 page size check passes", r.check("Paper size"), "PASS");
}

// 2. A US location stays on Letter.
{
  const r = build("us-letter", (d) => { d.contact[0] = "Charlotte, NC"; });
  expect("Charlotte, NC defaults to US Letter", r.text.includes("Paper: US Letter") ? "Letter" : "other", "Letter");
  expect("Letter page size check passes", r.check("Paper size"), "PASS");
}

// 3. --paper overrides the location.
{
  const r = build("override", (d) => { d.contact[0] = "Hyderabad, India"; }, ["--paper", "letter"]);
  expect("--paper letter overrides an India location", r.text.includes("Paper: US Letter") ? "Letter" : "other", "Letter");
}

// 4. A stat line that really wraps still fails.
{
  const r = build("stat-line-wraps", (d) => {
    d.stats = d.stats.map((s) => ({ value: s.value, label: s.label + " across every region and business unit" }));
  });
  expect("a stat line that wraps still fails", r.check("Stat line fits on one line"), "FAIL");
}

// 5. An achievement that copies a role bullet word for word fails; the sample passes.
{
  const ok = build("achievements-ok", () => {});
  expect("sample achievements pass the copy check", ok.check("Achievements do not copy role bullets"), "PASS");
  const r = build("achievement-copies-bullet", (d) => {
    const role = d.experience[0].roles ? d.experience[0].roles[0] : d.experience[0];
    const b = role.bullets[0];
    d.achievements[0] = { lead: "Copied.", text: typeof b === "object" ? b.text : b };
  });
  expect("an achievement copied from a role bullet fails", r.check("Achievements do not copy role bullets"), "FAIL");
}

// 6. Unfilled placeholders fail; the sample has none.
{
  const ok = build("no-placeholders", () => {});
  expect("sample resume passes the placeholder check", ok.check("No unfilled placeholders"), "PASS");
  const r = build("placeholders", (d) => {
    d.contact = ["Tulsa, OK", "[phone]", "[email]", "linkedin.com/in/tester-example"];
    d.education = ["[degree and year to confirm]"];
  });
  expect("[phone], [email] and [degree and year to confirm] fail", r.check("No unfilled placeholders"), "FAIL");
  expect("all three placeholders are named", ["[phone]", "[email]", "[degree and year to confirm]"].every((p) => r.text.includes(p)) ? "named" : "missing", "named");
}

// 7. ATS keyword check: variants count as matches, near misses do not.
{
  const { check } = require("../keyword-check");
  const resume = "Managed 1,100 endpoints with MECM and Office 365. Built Azure AD join for new laptops. Led the ADP payroll cutover.";
  const rows = check({ required: ["SCCM", "Microsoft 365", "Entra ID", "Active Directory", "Intune"], preferred: [{ keyword: "Autopilot", variants: ["zero-touch"] }] }, resume);
  const hit = (name) => (rows.find((r) => r.name === name).hit ? "matched" : "missing");
  expect("MECM counts for SCCM", hit("SCCM"), "matched");
  expect("Office 365 counts for Microsoft 365", hit("Microsoft 365"), "matched");
  expect("Azure AD counts for Entra ID", hit("Entra ID"), "matched");
  expect("ADP does not count for Active Directory", hit("Active Directory"), "missing");
  expect("Intune is missing", hit("Intune"), "missing");
  expect("a missing preferred keyword stays missing", hit("Autopilot"), "missing");
  const ad = check({ required: ["Active Directory"] }, "Administered AD and Group Policy for 3 sites.");
  expect("AD counts for Active Directory", ad[0].hit ? "matched" : "missing", "matched");
  const lower = check({ required: ["Active Directory"] }, "Read every ad for the role and lead the team.");
  expect("lowercase ad and lead do not count", lower[0].hit ? "matched" : "missing", "missing");
}

// 8. Word forms and multi-word keywords count as partial matches, not full ones.
{
  const { check, report } = require("../keyword-check");
  const resume = "Core: Desktop Support | Hardware Lifecycle | Windows 11\nMentor new Tier 1 technicians.\nLed a team of 6 on the hospital help desk.";
  const rows = check({ required: ["Mentoring", "Lifecycle Management", "Teams", "Mobile Device Management"], preferred: ["Leadership"] }, resume);
  const state = (name) => { const r = rows.find((x) => x.name === name); return r.hit ? "matched" : r.partial ? "partial" : "missing"; };
  expect("Mentor is a partial match for Mentoring", state("Mentoring"), "partial");
  expect("Hardware Lifecycle is a partial match for Lifecycle Management", state("Lifecycle Management"), "partial");
  expect("the partial match shows the resume's wording", rows.find((r) => r.name === "Lifecycle Management").partial, "Hardware Lifecycle");
  expect("Led is a partial match for Leadership", state("Leadership"), "partial");
  const lines = check({ required: ["Lifecycle Management"] }, "Hardware Lifecycle\nPROFESSIONAL EXPERIENCE");
  expect("a partial match stops at the end of its line", lines[0].partial, "Hardware Lifecycle");
  expect("team is not a match for the Teams product", state("Teams"), "missing");
  expect("Mobile Device Management stays missing without mobile", state("Mobile Device Management"), "missing");
  const out = report({ posting: "Test" }, rows);
  expect("the count line names the partial matches", out.line, "ATS keywords: 0 of 5 matched, 3 partial.");
  expect("keyword-check.md has a Partial match section", out.md.includes("## Partial match") && out.md.includes("| Mentoring | Mentor | required |") ? "yes" : "no", "yes");
}

fs.rmSync(work, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.caseName}${r.ok ? "" : ` (got ${r.actual}, wanted ${r.wanted})`}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
