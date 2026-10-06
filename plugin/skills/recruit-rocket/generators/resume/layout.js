// Which resume sections print, and in what order. build-resume.js and qa.js both use
// this, so the QA always checks the layout that was actually built.
//
// Standard layout: Summary, Key Achievements, Core Competencies, Skills, Professional
// Experience, Education and Certifications.
//
// Student layout ("layout": "student" in resume.json), the benchmark for student resumes:
//   Education first (degree, school, expected graduation, GPA, relevant coursework),
//   Summary only if given, experience split into groups (a field group such as "Sports
//   Broadcast Experience" and a "Business and Leadership Experience" group, set by each
//   job's "group"), then Skills grouped by category ("skillGroups": Equipment and
//   Software, On-Air and Content, Business, Languages). One page. Dates read
//   "Sep 2026 to Present".
//
// Empty sections never print: no stat bar without stats, no Key Achievements heading
// without achievements, no Summary heading without a summary.

const has = (a) => Array.isArray(a) && a.length > 0;
const isStudent = (d) => d.layout === "student" || d.student === true;

// Experience as one or more groups. Jobs carry an optional "group" title; groups print
// in the order they first appear. Jobs with no group fall under the default title.
function experienceGroups(d) {
  const fallback = isStudent(d) ? "Experience" : "Professional Experience";
  const jobs = d.experience || [];
  if (!jobs.some((j) => j.group)) return [{ title: fallback, jobs }];
  const groups = [];
  for (const job of jobs) {
    const title = job.group || fallback;
    let g = groups.find((x) => x.title === title);
    if (!g) groups.push((g = { title, jobs: [] }));
    g.jobs.push(job);
  }
  return groups;
}

function skillsSection(d) {
  if (has(d.skillGroups)) return { key: "skillGroups", title: "Skills" };
  if (has(d.skillsEquipment)) return { key: "skills", title: "Skills and Equipment" };
  return null;
}

function sections(d) {
  const student = isStudent(d);
  const out = [];
  const experience = experienceGroups(d).map((g) => ({ key: "experience", title: g.title, jobs: g.jobs }));
  const skills = skillsSection(d);
  if (student) {
    if (has(d.education)) out.push({ key: "education", title: "Education" });
    if (has(d.summary)) out.push({ key: "summary", title: "Summary" });
    if (has(d.achievements)) out.push({ key: "achievements", title: "Key Achievements" });
    if (has(d.competencies)) out.push({ key: "competencies", title: "Core Competencies" });
    out.push(...experience);
    if (skills) out.push(skills);
    return out;
  }
  if (has(d.summary)) out.push({ key: "summary", title: "Summary" });
  if (has(d.achievements)) out.push({ key: "achievements", title: "Key Achievements" });
  if (has(d.competencies)) out.push({ key: "competencies", title: "Core Competencies" });
  if (skills) out.push(skills);
  out.push(...experience);
  if (has(d.education)) out.push({ key: "education", title: "Education and Certifications" });
  return out;
}

module.exports = { sections, isStudent, has, experienceGroups };
