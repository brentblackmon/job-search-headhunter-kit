#!/usr/bin/env node
// Tests for build-links.js. Run with: npm test
const { build, jobUrl, peopleUrl } = require("../build-links");

const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}
const q = (url) => new URL(url).searchParams;

// 1. Time filters, location, newest first.
{
  const day = q(jobUrl({ keywords: "Desktop Support Lead", location: "Tulsa, Oklahoma, United States", window: "24h" }));
  expect("24-hour link uses f_TPR=r86400", day.get("f_TPR"), "r86400");
  expect("keywords are kept whole", day.get("keywords"), "Desktop Support Lead");
  expect("location is kept whole", day.get("location"), "Tulsa, Oklahoma, United States");
  expect("newest first", day.get("sortBy"), "DD");
  const hour = q(jobUrl({ keywords: "QA Manager", location: "Hyderabad, Telangana, India", window: "1h" }));
  expect("1-hour link uses f_TPR=r3600", hour.get("f_TPR"), "r3600");
  expect("an India location works", hour.get("location"), "Hyderabad, Telangana, India");
  expect("spaces are encoded as %20, not +", jobUrl({ keywords: "QA Manager", window: "24h" }).includes("QA%20Manager") ? "yes" : "no", "yes");
}

// 2. Remote and internship variants.
{
  const md = build({ titles: ["IT Support Manager"], locations: ["Tulsa, Oklahoma, United States"], remote: true });
  const urls = md.match(/https:\/\/\S+/g);
  expect("one title, one city, remote: 4 links", urls.length, 4);
  expect("remote links use f_WT=2 and the country", urls.filter((u) => q(u).get("f_WT") === "2" && q(u).get("location") === "United States").length, 2);
  const stu = build({ titles: ["Sports Broadcast Intern"], locations: ["Dayton, Ohio, United States"], student: true, term: "Summer 2027" });
  const s = q(stu.match(/https:\/\/\S+/)[0]);
  expect("student links add the internship filter", s.get("f_E"), "1");
  expect("student links add the term", s.get("keywords"), "Sports Broadcast Intern Summer 2027");
}

// 3. Recruiter people search, and only links (no LinkedIn automation).
{
  const r = q(peopleUrl("technical recruiter Tulsa"));
  expect("recruiter search keywords", r.get("keywords"), "technical recruiter Tulsa");
  const md = build({ titles: ["X"], locations: ["Tulsa, Oklahoma, United States"], recruiterTitles: ["technical recruiter"], recruiterCity: "Tulsa" });
  expect("links.md lists recruiters to follow", md.includes("# Recruiters to follow") ? "yes" : "no", "yes");
  expect("every link points at linkedin.com", md.match(/https:\/\/\S+/g).every((u) => u.startsWith("https://www.linkedin.com/")) ? "yes" : "no", "yes");
}

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.caseName}${r.ok ? "" : ` (got ${r.actual}, wanted ${r.wanted})`}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
