# Generators

Two small tools that turn your facts into finished documents. Recruit Rocket runs them for you. You only need this page if you are setting up a computer yourself. Commands below start from the repo root.

| Tool | Input | Output |
|---|---|---|
| `resume/build-resume.js` | `resume.json` (+ optional `tailor.json`) | ATS-safe `.docx` and `.pdf`, page images, `-QA.md` report |
| `resume/keyword-check.js` | `keywords.json` (the posting's required and preferred skills) + the resume PDF | `keyword-check.md`: required skills covered (variants and the user's own wording count; preferred skills listed, not counted) |
| `resume/copy-check.js` | the posting + the resume PDF or cover letter | flags any sentence sharing 6 or more words in a row with the posting (tool, product, company, and title names do not count) |
| `resume/voice.js` | a resume PDF or a text file | AI-tell words in every form (leveraged, spearheaded) and weak verbs; company and product names are skipped |
| `links/build-links.js` | `links-input.json` (titles, locations, remote, recruiter titles) | `links.md`: LinkedIn searches for the last 24 hours and last hour, remote variants, and recruiter searches. Links only; nothing logs in to LinkedIn |
| `match/score.js` | `match.json` (up to 5 must-haves, 3 nice-to-haves, 10 evidence claims, each rated with a resume quote) | The Match Score out of 100 and its band: Shortlist 80+, Maybe 60 to 79, Unlikely under 60 |
| `match/build-report.js` | `report.json` (score before and after, keyword numbers, the four package files, the hiring executive and dated source) | A one-page results report PDF, checked for 1 page, no dashes, no placeholders, and files that exist |
| `results/build-results.js` | `results.json` (applied list, postings with dates and gate flags, signals, recruiters, clusters, sources checked) | The results card and `signals/YYYY-MM-DD.md`. Gates: over 30 days or undated never A or B; a hard requirement the user cannot meet, below level, or under the floor is C; applied companies skipped; signals need a named, dated contact. Also writes the scan file (`--scan`) with counts that match its lists, fails on generic links, on fewer than 6 signal searches across the 4 types, on a target opening left out, or a not-graded posting with no careers search; `--check-scan` checks a hand-written scan file |
| `outreach/build-outreach.js` | `outreach.json` (contact, email, LinkedIn note, one alumni note per school) | `First_Last_Outreach_Company.docx`, checked for note lengths, one note per school, the right school name and nickname, no dashes or placeholders |
| `baseball-card/render-card.js` | `card.json` | one-page landscape `.pdf` and a `-preview.png` |

## One-time setup

You need:
- **Node.js 18 or newer**
- **LibreOffice** with Writer (turns the .docx into a PDF). On Ubuntu: `sudo apt-get install libreoffice-writer`. On a Mac: install LibreOffice from libreoffice.org.
- **Poppler** (`pdfinfo`, `pdftotext`, `pdftoppm`) for resume QA. Ubuntu: `sudo apt-get install poppler-utils`. Mac: `brew install poppler`.
- **A PDF renderer for the baseball card.** Either Chromium for Playwright (`npx playwright install chromium` inside `baseball-card/`) or WeasyPrint (`pip install weasyprint`). If the browser is missing, `render-card.js` falls back to WeasyPrint and installs it with pip on its own.

Then:
```
cd plugin/skills/recruit-rocket/generators/resume && npm install
cd ../baseball-card && npm install
```

## Try it with the sample persona
```
cd plugin/skills/recruit-rocket/generators/resume && npm run sample
cd ../baseball-card && npm run sample
```
Output goes to each tool's `out/` folder (not committed).

## Resume
```
node build-resume.js --data path/to/resume.json --tailor path/to/tailor.json --out out/First_Last_Resume_Company
```
- `--tailor` is optional. By default a tailor file changes only `headline` and `summary1`. Other keys (`summary2`, `achievements`, `competencies`, `stats`) are allowed and are listed in the output so nothing changes silently.
- `--pages`: optional, only when the user asks for a set length. With no `--pages` there is no page target; the resume runs as long as its content.
- Exit code 0 means every QA check passed. Look at the page images anyway.

Student resumes: set `"layout": "student"`. Education prints first (expected graduation, GPA, coursework), then experience split by each job's `group` (a field group and "Business and Leadership Experience"), then Skills grouped by category (`skillGroups`). One page; dates read "Sep 2026 to Present". Empty `stats`, `achievements`, or `summary` simply do not print. `skillsEquipment` adds a single "Skills and Equipment" line for any layout. Fictional example: `resume/sample-data/resume-student.json`.

## Baseball card
```
node render-card.js --data path/to/card.json --out out/First_Last_Card_Company.pdf
```
- `photo` in card.json is required: a JPG or PNG path relative to card.json. QA fails without one.
- Student card: leave `stats` empty and give 4 `tiles` ({title, detail}) for skills and experience. Fictional example: `baseball-card/sample-data/card-student.json`.
- If Chromium is installed somewhere else, set `CHROMIUM_PATH=/path/to/chromium`.
