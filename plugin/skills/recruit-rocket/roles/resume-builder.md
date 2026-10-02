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
- Length: 2 pages for experienced users (8+ years), 1 page for early career.

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
The goal is that every required skill the user has really used shows up, in their own words. It is not 100%. Never add a keyword just to raise the count.

1. **Pull the keywords.** From the posting, list the required and preferred skills, tools, platforms, and certifications (for example Intune, SCCM, Microsoft 365, Active Directory, Entra ID, ITIL, CompTIA A+). Skip soft skills and generic phrases ("team player", "fast-paced"). Write them to `companies/<company-slug>/keywords.json`: `{"posting": "Company, Title", "required": [...], "preferred": [...]}`.
2. **Run the check** against the tailored PDF, from the same work folder as the generator:
```
node keyword-check.js --keywords <company folder>/keywords.json --resume <company folder>/<First_Last>_Resume_<Company>.pdf --out <company folder>/keyword-check.md
```
   It counts common variants (SCCM and MECM, Microsoft 365 and Office 365, Active Directory and AD, Entra ID and Azure AD) and the user's own wording of a skill (a different word ending, such as "Mentor" for "Mentoring", or the main word next to a related word, such as "Hardware Lifecycle" for "Lifecycle Management") as covered. **Keep the user's wording; never switch it to the posting's.** It writes `keyword-check.md` with a headline like "Required skills covered: 8 of 10." Preferred skills are listed but not counted. If the script cannot run, do the same check by reading the resume text, and write `keyword-check.md` in the same format.
3. **Ask only about missing required skills, in at most 2 questions in total.** Ask in the review step, after the number confirmations. Never ask about preferred skills.
   - **Skip what is already settled.** Skills under `## Not used` in `facts.md` are gaps already; do not ask about them again.
   - **Question 1:** if 2 or more required skills are missing, one multi-select list: "The posting asks for these. Check every one you have used:" with numbered lines; accept the numbers ("1, 4"), "none", or "all". If exactly one is missing, a yes/no question: "The posting asks for Intune. Have you used it?"
   - **Question 2, only if they checked any:** "Where did you use each one? One short answer each is fine, for example: Intune at [company], SharePoint Online at [company]." Take a typed answer.
   - **Checked:** add each to `facts.md` as `CONFIRMED`, with where they used it. Rebuild the resume once with them in Core Competencies and, where one fits a real result, in that role's bullet, in the user's words. Rerun the check.
   - **Not checked:** leave it out. Add it to `## Not used` in `facts.md`, to the posting's `Gap:` line in the scan file and the tracker entry, and to the user's gaps for `interview-prep`.
   - **Then stop.** Once every required skill the user has really used is in, do not ask again or suggest more keywords.
4. **Report the count** on the review screen as "Required skills covered: 8 of 10." After any rebuild, rerun the check and show the new count on the final package card.

## Generate
**First, check the layout files installed.** Look for `generators/resume/build-resume.js` in this skill's folder. If it is missing, the skill was installed without its files. Tell the user once, in plain words: "Recruit Rocket installed without its layout files, so I'll build the resume by hand this time. To get the exact layout, delete Recruit Rocket in Customize, Skills, and upload recruit-rocket.zip again." Then keep going with the fallback below.

The locked layout lives in this skill's `generators/resume/` folder. Always try it first, so every resume matches the same format. The skill folder can be read-only, so copy the generator to a work folder outside `My Job Search/` and run it there:
```
mkdir -p /tmp/recruit-rocket && cp -r <this skill's folder>/generators/resume /tmp/recruit-rocket/
cd /tmp/recruit-rocket/resume
npm install            # first time only; installs the docx package
node build-resume.js --data <path>/resume.json [--tailor <path>/tailor.json] --out <dir>/<First_Last>_Resume_<Company> --pages 2
```
Add `--paper a4` or `--paper letter` only if the automatic choice is wrong for the user.
This writes the .docx and the PDF, then runs QA. The PDF step needs LibreOffice (`soffice`); the QA step needs poppler (`pdfinfo`, `pdftotext`, `pdftoppm`).

If Node is not available, or the PDF or QA tools are missing: still use the generator for the .docx if you can, then make the PDF with whatever tools you have. If you cannot run the generator at all, build the .docx yourself and copy the layout in `generators/resume/build-resume.js` exactly (fonts, sizes, colors, order of sections, single column, shaded stat line). Then do the QA checks by looking at the result. Never stop to ask the user to install anything.

## QA before delivery (the generator runs 1 to 4 and the AI-tell check; you do 5 to 7)
1. Page count equals `--pages`.
2. Each page rendered to PNG. Look at them. No orphan lines (a heading or 1 to 2 lines alone at the top or bottom of a page).
3. `pdftotext` output reads in the right order: name, headline, contact, stats, summary, and so on.
4. No key achievement copies a role bullet word for word. If this fails, rewrite the achievement it names as a summary across roles.
5. Run `fact-check` on the tailored text.
6. File name: `First_Last_Resume_Company.pdf` for a tailored resume, `First_Last_Resume.pdf` for the master. No "final," "v3," or dates.
7. If QA fails, fix and rerun. Common fixes: trim an older role's bullets, shorten the summary, drop one achievement.

## Output
Tell the user: file paths, page count, what was tailored (old vs. new headline and summary paragraph), and QA results. Remind them the resume PDF is for ATS uploads; the baseball card is for direct email.
