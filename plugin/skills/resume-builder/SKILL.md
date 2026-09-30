---
name: resume-builder
description: Brand Builder, resume. Builds the user's master ATS-safe resume from facts.md and tailors it to one posting or company, then renders .docx and PDF with the kit's generator and runs page-count and layout QA. Use for "build my resume," "tailor my resume to this job," "update my resume," or when an A-grade posting needs materials.
---

# Brand Builder: Resume

One clean, ATS-safe format. Tailoring is surgical: by default only the headline and first summary paragraph change. That keeps every version true and easy to fact-check.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing word for word.** Dated sources for people. No guessed emails as real. The user sends everything; you never submit applications. Human voice: no em dashes, no filler, no stacked adjectives. Research first. Check the tracker. **QA before delivery.** **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md`.

## The format (fixed)
Built by `generators/resume/build-resume.js`. Do not hand-format in Word.
- Single column. No tables, text boxes, columns, images, or header or footer content (ATS parsers skip or scramble them).
- Arial. Navy accent `1A2B4A`.
- Order: Name, headline, contact line, shaded stat line with 4 numbers, 2-paragraph summary, key achievements, one-line competency list, experience, education.
- Length: 2 pages for experienced users (8+ years), 1 page for early career.

## Build the master resume
1. Read `facts.md`. Every line of the resume must trace to a facts line marked `CONFIRMED` or `FROM RESUME`. Before delivery, `fact-check` asks the user to confirm any `FROM RESUME` numbers in one quick batch.
2. Write `my-search/resume.json` following `generators/resume/sample-data/resume.json`:
   - `stats`: 4 numbers that best prove the target role, in approved phrasing, shortened to a value and a 2 to 4 word label.
   - `summary`: paragraph 1 is who they are for the target role (2 sentences). Paragraph 2 is how they work and what they are known for (2 sentences).
   - `achievements`: 3 to 5 bullets, strongest numbers.
   - `competencies`: 6 to 9 short terms that match how recruiters search.
   - `experience`: most recent first; 3 to 6 bullets for recent roles, 1 to 2 for older ones. Each bullet: action, scope, result with number.
3. Run the generator (see below) and QA.

## Tailor to a posting
1. Read the posting and `companies/<slug>/research.md` (run `company-research` first if it is missing).
2. Write `companies/<slug>/tailor.json` with only:
   - `headline`: mirrors the posting's title and top 2 themes, still true to the facts.
   - `summary1`: first paragraph rewritten around the company's top 2 priorities, using the posting's own terms where the facts support them.
3. Change anything else (bullet order, competencies) only if the user asks, and list what changed.
4. Never add a keyword the facts do not support. Keyword stuffing is a false claim.

## Generate
If the kit's `generators/` folder is not available (common in Cowork), build the .docx and PDF with whatever document tools you have, following the same format rules above, and do the QA checks by looking at the result. Do not stop to ask the user to install anything.

```
cd generators/resume
npm install            # first time only
node build-resume.js --data <path>/resume.json [--tailor <path>/tailor.json] --out <dir>/<First_Last>_Resume_<Company> --pages 2
```
This writes the .docx and the PDF, then runs QA.

## QA before delivery (the generator runs 1 to 3; you do 4 to 6)
1. Page count equals `--pages`.
2. Each page rendered to PNG. Look at them. No orphan lines (a heading or 1 to 2 lines alone at the top or bottom of a page).
3. `pdftotext` output reads in the right order: name, headline, contact, stats, summary, and so on.
4. Run `fact-check` on the tailored text.
5. File name: `First_Last_Resume_Company.pdf`. No "final," "v3," or dates.
6. If QA fails, fix and rerun. Common fixes: trim an older role's bullets, shorten the summary, drop one achievement.

## Output
Tell the user: file paths, page count, what was tailored (old vs. new headline and summary paragraph), and QA results. Remind them the resume PDF is for ATS uploads; the baseball card is for direct email.
