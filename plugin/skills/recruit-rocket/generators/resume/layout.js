// Which resume sections print, and in what order. build-resume.js and qa.js both use
// this, so the QA always checks the layout that was actually built.
//
// Standard layout: Summary, Key Achievements, Core Competencies, Skills and Equipment,
// Professional Experience, Education and Certifications.
// Student layout ("layout": "student" in resume.json): Summary, Education (with expected
// graduation, GPA, and relevant coursework), then the rest, with "Experience" in place
// of "Professional Experience". One page.
// Empty sections never print: no stat bar without stats, no Key Achievements heading
// without achievements.

const has = (a) => Array.isArray(a) && a.length > 0;
const isStudent = (d) => d.layout === "student" || d.student === true;

function sections(d) {
  const student = isStudent(d);
  const education = { key: "education", title: student ? "Education" : "Education and Certifications" };
  const out = [{ key: "summary", title: "Summary" }];
  if (student && has(d.education)) out.push(education);
  if (has(d.achievements)) out.push({ key: "achievements", title: "Key Achievements" });
  if (has(d.competencies)) out.push({ key: "competencies", title: "Core Competencies" });
  if (has(d.skillsEquipment)) out.push({ key: "skills", title: "Skills and Equipment" });
  out.push({ key: "experience", title: student ? "Experience" : "Professional Experience" });
  if (!student && has(d.education)) out.push(education);
  return out;
}

module.exports = { sections, isStudent, has };
