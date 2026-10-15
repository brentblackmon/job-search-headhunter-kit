#!/usr/bin/env node
// Builds links.md: search links the user clicks to see jobs before the crowd does.
//
// Nothing here logs in to, scrapes, or automates LinkedIn. It only writes plain
// search URLs; the user opens them in their own browser.
//
// Usage:
//   node build-links.js --input links-input.json --out "My Job Search/links.md"
//
// links-input.json:
//   { "titles": ["Desktop Support Lead", "IT Support Manager"],
//     "locations": ["Tulsa, Oklahoma, United States"],
//     "remote": true,                  // also build remote-only variants
//     "student": false,                // true adds the internship filter and term
//     "term": "Summer 2027",           // students only, added to the keywords
//     "recruiterTitles": ["technical recruiter", "IT recruiter"],
//     "recruiterCity": "Tulsa" }

const fs = require("fs");

const JOBS = "https://www.linkedin.com/jobs/search/";
const PEOPLE = "https://www.linkedin.com/search/results/people/";

// LinkedIn job search filters (URL parameters):
//   f_TPR=r86400  posted in the last 24 hours     f_TPR=r3600  posted in the last hour
//   f_WT=2        remote                          f_E=1        internship level
//   sortBy=DD     newest first
function jobUrl({ keywords, location, window, remote, internship }) {
  const p = new URLSearchParams();
  p.set("keywords", keywords);
  if (location) p.set("location", location);
  p.set("f_TPR", window === "1h" ? "r3600" : "r86400");
  if (remote) p.set("f_WT", "2");
  if (internship) p.set("f_E", "1");
  p.set("sortBy", "DD");
  return `${JOBS}?${p.toString().replace(/\+/g, "%20")}`;
}

function peopleUrl(keywords) {
  const p = new URLSearchParams({ keywords });
  return `${PEOPLE}?${p.toString().replace(/\+/g, "%20")}`;
}

function build(input) {
  const titles = input.titles || [];
  const locations = input.locations || [];
  const student = !!input.student;
  const kw = (t) => (student && input.term ? `${t} ${input.term}` : t);
  const lines = [
    "# Fresh job links",
    "",
    "Click these yourself; Recruit Rocket never logs in to or reads LinkedIn for you. The 24-hour links are the daily check. The 1-hour links catch postings in their first hour, when the fewest people have applied.",
    "",
  ];
  for (const title of titles) {
    lines.push(`## ${title}`);
    for (const location of locations) {
      lines.push(`- ${location}, last 24 hours: ${jobUrl({ keywords: kw(title), location, window: "24h", internship: student })}`);
      lines.push(`- ${location}, last hour: ${jobUrl({ keywords: kw(title), location, window: "1h", internship: student })}`);
    }
    if (input.remote) {
      const country = (locations[0] || "").split(",").pop().trim() || undefined;
      lines.push(`- Remote${country ? ` (${country})` : ""}, last 24 hours: ${jobUrl({ keywords: kw(title), location: country, window: "24h", remote: true, internship: student })}`);
      lines.push(`- Remote${country ? ` (${country})` : ""}, last hour: ${jobUrl({ keywords: kw(title), location: country, window: "1h", remote: true, internship: student })}`);
    }
    lines.push("");
  }
  const recruiters = input.recruiterTitles || [];
  if (recruiters.length) {
    lines.push("# Recruiters to follow", "", "Open each link, pick 5 recruiters who post jobs in your field, and follow them. Comment on their posts in your own words; never send a pitch in a comment.", "");
    for (const r of recruiters) lines.push(`- ${r}${input.recruiterCity ? ` in ${input.recruiterCity}` : ""}: ${peopleUrl(input.recruiterCity ? `${r} ${input.recruiterCity}` : r)}`);
    lines.push("");
  }
  return lines.join("\n");
}

if (require.main === module) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[++i];
  if (!args.input || !args.out) {
    console.error("Usage: node build-links.js --input links-input.json --out links.md");
    process.exit(2);
  }
  const md = build(JSON.parse(fs.readFileSync(args.input, "utf8")));
  fs.writeFileSync(args.out, md);
  console.log(`Wrote ${args.out} (${(md.match(/https:\/\//g) || []).length} links)`);
}

module.exports = { build, jobUrl, peopleUrl };
