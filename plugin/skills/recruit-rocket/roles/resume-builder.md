# Brand Builder: Resume

One clean, ATS-safe format. Tailoring is surgical: by default only the headline and first summary paragraph change. That keeps every version true and easy to fact-check.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing word for word.** Dated sources for people. No guessed emails as real. The user sends everything; you never submit applications. Human voice: no em dashes, no filler, no stacked adjectives. Research first. Check the tracker. **QA before delivery.** **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md` in this skill's folder.

## The format (fixed)
Built by `generators/resume/build-resume.js` in this skill's folder. Do not hand-format in Word.
- Paper: A4 for anyone outside the US and Canada, US Letter inside. The generator picks this from the contact location; override with `--paper a4` or `--paper letter`, or add `"paper": "a4"` to resume.json. Same margins and layout on both.
- Single column. No tables, text boxes, columns, images, or header or footer content (ATS parsers skip or scramble them).
- Arial. Navy `1A2B4A` for the name, section heads, role titles and competencies; near-black body text; gray dates and company descriptions.
- Order: name (capitals), headline (target title in capitals, then themes), contact line with live email and LinkedIn links, navy rule, shaded stat line with a navy bar and 4 numbers, SUMMARY (2 paragraphs), KEY ACHIEVEMENTS (bold lead-in on each bullet), CORE COMPETENCIES (one bold navy line of terms), PROFESSIONAL EXPERIENCE, EDUCATION AND CERTIFICATIONS.
- Each role: title in navy with dates at the right, then "Company, City, ST" in bold, then an optional italic one-line company description and an optional "Mandate:" line, then bullets.
- Length: no page target. The user's uploaded resume is the starting point, so the tailored version runs about as long as theirs. Never cut real content or pad to hit a page count.
- **Dates, every layout:** "Jan 2021 to Present" or "Mar 2019 to Dec 2020": a three-letter month, the year, "to". Never a dash, never "01/2021" (the builder turns "01/2021" from the facts file into "Jan 2021"). Graduation reads "Expected May 2028". The QA's date check fails anything else.
- **Student layout, the benchmark for student resumes** (`"layout": "student"` in resume.json, for anyone with `Mode: student` in `facts.md`). One page, in this order:
  1. **Education first**: degree, school, "Expected May 2028", GPA if 3.0 or higher, relevant coursework. Use an education object: `{"degree": "B.A. Communication, Sports Media", "school": "...", "location": "...", "dates": "Expected May 2028", "gpa": "3.5 / 4.0", "coursework": ["..."]}`.
  2. **Experience in two groups**, set with each job's `group`: a field group named for their field (for example "Sports Broadcast Experience"), then "Business and Leadership Experience" for everything else (part-time jobs, club officer roles, team captain, volunteer leadership). Field jobs go in the first group even when unpaid or on a student crew.
  3. **Skills grouped by category** in `skillGroups`: `[{"label": "Equipment and Software", "items": [...]}, {"label": "On-Air and Content", "items": [...]}, {"label": "Business", "items": [...]}, {"label": "Languages", "items": [...]}]`. Use only categories the user has facts for; leave out an empty one.
  For a new student resume, leave `summary` empty unless the user asks for one; an existing summary stays and prints after Education. No stat bar and no Key Achievements unless the user has real numbers. See `generators/resume/sample-data/resume-student.json` (a fictional example; use its shape, never its wording).
- **No numbers yet?** Leave `stats` empty and the stat bar does not print. Leave `achievements` empty and the Key Achievements heading does not print. Never invent a number to fill either one.
- **Skills and Equipment** (`skillsEquipment`): an optional line of tools, gear, and software for technical roles (broadcast, IT, trades), in the user's own names for them.

## Build the master resume
1. Read `facts.md`. Every line of the resume must trace to a facts line marked `CONFIRMED` or `FROM RESUME`. Before delivery, `fact-check` asks the user to confirm any `FROM RESUME` numbers in one quick batch.
2. Write `My Job Search/resume.json` in the same shape as `generators/resume/sample-data/resume.json` in this skill's folder (a fictional example; a tailoring example is `generators/resume/sample-data/tailor.json`):
   - `headline`: "Target Title | theme, theme and theme". The title before the bar prints in capitals.
   - `stats`: 4 numbers that best prove the target role, in approved phrasing, shortened to a value (about 12 characters) and a 1 to 3 word label. The whole stat line must fit on one line; the QA check fails if it wraps.
   - `summary`: paragraph 1 is who they are for the target role (2 sentences). Paragraph 2 is how they work and what they are known for (2 sentences).
   - `achievements`: 4 to 6 bullets, strongest numbers, each as `{"lead": "Short claim.", "text": "What you did and the result."}`. The lead prints in bold.
     Achievements **summarize across roles**: each one names the pattern or the biggest result, with a bold lead-in. **Never repeat a role bullet word for word.** The same number may appear in both places only if the wording differs. Before writing the file, compare every achievement against every role bullet and rewrite any that match.
   - `competencies`: 6 to 9 short terms that match how recruiters search.
   - `experience`: most recent first; 3 to 6 bullets for recent roles, 1 to 2 for older ones. Each bullet: action, scope, result with number.
   - **Keep their voice.** Start every bullet from the user's own phrasing in their resume, LinkedIn, and writing sample when it is clear, and only tighten it (cut filler, lead with the verb, keep their numbers). Do not rewrite every line into the same polished style; two people's resumes should not sound alike. Use plain verbs (led, ran, built, cut, grew, fixed), never AI-tell words. Per company: `company`, `location`, optional `blurb` (what the company does, size) and optional `mandate` (why the user was hired), then `roles`.
   - Promotions inside one company: list each title in `roles` and put that title's bullets in `roles[].bullets`, so a reader can tell which results came from which job. Use job-level `bullets` only when the company has one role. See the first job in the sample.
3. Run the generator (see below) and QA.

## Tailor to a posting
1. Read the posting and `companies/<company-slug>/research.md` (run `company-research` first if it is missing). Save the posting text as `companies/<company-slug>/posting.md`; the copy check reads it.
2. Write `companies/<company-slug>/tailor.json` with only:
   - `headline`: mirrors the posting's title and top 2 themes, still true to the facts.
   - `summary1`: first paragraph rewritten around the company's top 2 priorities, using the posting's own terms where the facts support them.
3. Change anything else (bullet order, competencies) only if the user asks, and list what changed.
4. Never add a keyword the facts do not support. Keyword stuffing is a false claim.
5. **Never copy the posting.** Write the headline and summary in the user's words; use the posting's names for tools and the job title, not its sentences. After the build, run the copy check from the generator's work folder:
```
node copy-check.js --posting <company folder>/posting.md --doc <company folder>/<First_Last>_Resume_<Company>.pdf --keywords <company folder>/keywords.json
```
   It fails any sentence that shares 6 or more words in a row with the posting (tool, product, company, and job title names do not count). Rewrite each flagged sentence in the user's own words from `facts.md`, rebuild, and rerun until it passes.
6. **AI-tell words.** If the generator's "AI-tell words" check fails, ask the user once, listing every flagged word in one question: "Your resume uses "spearheaded". Keep it (it's a word you really use) or swap it for a plain verb (led, ran, built)?" Swap the ones they don't keep. Add the ones they keep to `keepWords` in resume.json and to `Voice` in `facts.md`, and never ask about them again.
7. After the tailored resume passes QA and the copy check, run the ATS keyword check below.

## ATS keyword check (every tailored resume)
The posting's own words matter: many applicant tracking systems match literal phrases. The goal is every term the user's facts support, in the posting's wording, without adding bullets or claims.

1. **Pull the full term list, once per posting.** If `companies/<company-slug>/keywords.json` already exists, reuse it (counts stay the same across runs). Otherwise, read **every responsibility and requirement line** of the posting and list its terms, usually 35 to 50: skills, tools, metrics (NRR, contribution margin), practices (cross-sell, upsell, training), scope words (cross-functional, vertical software), and the required items. Write them as `terms`, plus `required` and `preferred` lists of the skills the posting requires or prefers: `{"posting": "Company, Title", "terms": [...], "required": [...], "preferred": [...]}`. Never a short list of 10.
2. **Run the check** against the tailored PDF:
```
node keyword-check.js --keywords <company folder>/keywords.json --resume <company folder>/<First_Last>_Resume_<Company>.pdf --posting <company folder>/posting.md --out <company folder>/keyword-check.md
```
   It prints "Required skills covered: X of Y" and "**Literal terms matched: X of N**" over the full term list, then the missing literal terms. A literal match is the posting's own words on the resume (or a different word ending: "cross-selling" for "cross-sell"). A meaning-alike never counts: "win rates went from 60% to 95%" is not "customer acquisition". If `posting.md` changed since `keywords.json` was written, it stops: rebuild the list and run again.
3. **Close the literal gaps, without adding anything.** For every missing term:
   - **`facts.md` supports it:** swap the posting's term into an existing bullet, the summary, or the Core Competencies line, in place of the user's word for the same thing ("NRR" where the bullet says "net retention"). Never add a bullet, and keep the resume at the same number of pages as the user's own resume. To make room, first drop or trim bullets the posting does not ask for (for example M&A or back-office bullets for a role that never mentions them), before touching ones it does ask for.
   - **`facts.md` does not support it:** list it as a question on the review screen ("The posting asks for contribution margin. Have you owned it? Where?"). Never add a term the user has not used.
   Rebuild, rerun the copy check (the 6-word rule still applies to sentences) and this check.
4. **Ask only about missing required skills, in at most 2 questions in total.** Skip what `## Not used` in `facts.md` already settles. One multi-select list ("The posting asks for these. Check every one you have used:"), then one question about where. Checked: add to `facts.md` as `CONFIRMED`, swap the term in, rebuild, rerun. Not checked: add to `## Not used`, the scan's `Gap:` line, the tracker, and `interview-prep`.
5. **Report both numbers** every time the check comes up, word for word on two lines: "Required skills covered: 8 of 10" and "Literal terms matched: 41 of 45". Never paraphrase them. List the terms swapped in, and the literal terms still missing, on the review screen.

   Save everything to `companies/<company-slug>/`.

## Generate
**First, check the layout files installed.** Look for `generators/resume/build-resume.js` in this skill's folder. If it is missing, the skill was installed without its files. Tell the user once, in plain words: "Recruit Rocket installed without its layout files, so I'll build the resume by hand this time. To get the exact layout, delete Recruit Rocket in Customize, Skills, and upload recruit-rocket.zip again." Then keep going with the fallback below.

The locked layout lives in this skill's `generators/resume/` folder. Always try it first, so every resume matches the same format. The skill folder can be read-only, so copy the generator to a work folder outside `My Job Search/` and run it there:
```
mkdir -p /tmp/recruit-rocket && cp -r <this skill's folder>/generators/resume /tmp/recruit-rocket/
cd /tmp/recruit-rocket/resume
npm install            # first time only; installs the docx package
node build-resume.js --data <path>/resume.json [--tailor <path>/tailor.json] --out <dir>/<First_Last>_Resume_<Company>
```
There is no page target: the resume runs as long as its content. Add `--pages N` only if the user asks for a set length.
Add `--paper a4` or `--paper letter` only if the automatic choice is wrong for the user.
This writes the .docx and the PDF, then runs QA. The PDF step needs LibreOffice (`soffice`); the QA step needs poppler (`pdfinfo`, `pdftotext`, `pdftoppm`).

If Node is not available, or the PDF or QA tools are missing: still use the generator for the .docx if you can, then make the PDF with whatever tools you have. If you cannot run the generator at all, build the .docx yourself and copy the layout in `generators/resume/build-resume.js` exactly (fonts, sizes, colors, order of sections, single column, shaded stat line). Then do the QA checks by looking at the result. Never stop to ask the user to install anything.

## QA before delivery (the generator runs 1 to 4 and the AI-tell check; you do 5 to 7)
1. The page count is reported, not targeted. Only if the user asked for a set length (`--pages`) must it match.
2. Each page rendered to PNG. Look at them. No orphan lines (a heading or 1 to 2 lines alone at the top or bottom of a page).
3. `pdftotext` output reads in the right order: name, headline, contact, stats, summary, and so on.
4. No key achievement copies a role bullet word for word. If this fails, rewrite the achievement it names as a summary across roles.
5. Run `fact-check` on the tailored text.
6. File name: `First_Last_Resume_Company.pdf` for a tailored resume, `First_Last_Resume.pdf` for the master. No "final," "v3," or dates.
7. If QA fails, fix and rerun. Common fixes: trim an older role's bullets, shorten the summary, drop one achievement.

## Output
**Phone and email.** If `facts.md` has no phone number or no email address, ask once, the first time you build a resume: "What phone and email should go on your resume?" (a typed answer). Never print placeholders.

Tell the user: file paths, page count, what was tailored (old vs. new headline and summary paragraph), and QA results. Remind them the resume PDF is for ATS uploads; the baseball card is for direct email.
