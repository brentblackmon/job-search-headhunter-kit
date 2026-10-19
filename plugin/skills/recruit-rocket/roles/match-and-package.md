# Match and Package

The first thing a new user sees. They paste a job posting (or say "score my resume against this job" or "build my package for this job") and get, in order: a Match Score in under a minute, an optional guided fix, the full package, and a one-page results report. It works with or without setup.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**, never invent a skill. Use approved phrasing. Dated sources for people. No guessed emails as real. The user sends everything. Human voice: no em dashes or en dashes, no AI-tell words. **Never copy the posting.** **Offer choices to click, never blank questions.** **Show progress (rule 15): numbered status lines, never more than about 60 seconds of silence.** Full text: `STANDING_RULES.md` in this skill's folder.

**Your very first output, before you read any file, is the status line "Step 1 of 2: reading the posting and your resume".** Every later step also starts with its status line, posted as its own message before the work begins, and ends with a "Done:" line. A status line that only appears with the results does not count.

## Before Step 1 (a few seconds, no questions unless something is missing)
1. **Posting.** Pasted text, a file, or a link. A link that cannot be opened: ask once, "Paste the posting text", "Try another link". Note the company and title.
2. **Resume.** Use, in this order: a resume or LinkedIn PDF the user attached, `My Job Search/resume.json` and `facts.md` if they are set up, or a resume or LinkedIn PDF in the picked folder. None at all: ask once, "I'll attach my resume", "I'll attach my LinkedIn PDF".
3. **Folder.** If `My Job Search/` does not exist, create it and copy the skill's `templates/` into `My Job Search/templates/` (the same as Setup steps 1 and 2 in `SKILL.md`), without the intake interview. Make `companies/<company-slug>/` and save the posting as `posting.md`.
4. **Facts file (after the score is shown, before Step 2 or Step 3).** If `facts.md` does not exist, write a quick one from the resume, in the shape of `templates/facts.md`: contact, every role with dates and scope, and every number with its approved phrasing marked `FROM RESUME`. No questions now; the full intake waits for "Set up my full search". Log the company in `tracker.md` as `Matching` (create `tracker.md` from the template if it is missing).

## Step 1. Match Score (under 60 seconds)
Post: "Step 1 of 2: reading the posting and your resume".
1. **Requirements.** Pull up to 5 must-haves and up to 3 nice-to-haves from the posting: the things that decide a shortlist (scope, results, years, tools, certifications). Skip soft phrases ("team player"). Must-haves are what the posting requires; nice-to-haves are what it prefers.
2. **Rate each one** against the resume:
   - **Met**: the resume shows it plainly.
   - **Partly met**: related evidence, or the level, scale, or years are not shown.
   - **Not shown**: nothing on the resume speaks to it.
   Give a one-line reason and quote the resume line (Met and Partly met always quote one).
   Then post: "Step 2 of 2: scoring and checking your evidence".
3. **Evidence check.** Up to 10 claims, the ones most relevant to this posting. **Well backed**: a reader can judge its size (a number, a scope, or a timeframe). **Vague**: it is missing one; say which (`number`, `scope`, `timeframe`, or `result`). Quote each resume line.
4. Write `companies/<company-slug>/match-before.json` in the shape of `generators/match/sample-data/match.json` and run, from a writable copy of `generators/match/`:
```
node score.js --data <company folder>/match-before.json
```
   It prints "Match Score: 72 of 100 (Maybe)": must-haves 3 points, nice-to-haves 1, Partly met half. Bands: **Shortlist** 80 and up, **Maybe** 60 to 79, **Unlikely** under 60. If it says to fix match.json, fix it and run it again. If Node cannot run, do the same arithmetic by hand.
5. Show:
```
Match Score: 72 of 100 (Maybe)

| Requirement | | Rating | Why |
|---|---|---|---|
| Leads teams of 50 or more | Must | Met | "Lead implementation, support, and training: 64 people" |
...

Evidence check: 6 well backed, 2 vague
- Well backed: "Cut average implementation time from 16 weeks to 9 weeks"
- Vague (missing a result): "Built the weekly carrier scorecard used in rate negotiations."
...
```
   Every evidence line quotes the resume, Well backed ones too.
   Then offer: "Fix the gaps first (about 2 minutes, recommended)", "Build my package now", "Stop here". With nothing Vague or Partly met, skip the first choice.

## Step 2. Guided fix (optional)
For each Vague claim and each Partly met requirement, ask one question at a time, Partly met must-haves first, at most 6 questions in all. Each question shows the resume line beside it and asks only for the missing detail (number, scope, timeframe, or result). Choices are built only from what is already known, never a made-up number:
```
Your resume says: "Built the weekly carrier scorecard used in rate negotiations."
What changed because of it?
1. I'll type the result (for example what it saved or improved)
2. I don't have a number for it
3. Skip this one
```
- **Never offer a number, or a range of numbers, as a choice** ("About 5 to 7 years" is a made-up number the user only picks). When the missing detail is a number, the choices are "I'll type it", "I don't have a number for it", and "Skip this one".
- **Answered:** add it to `facts.md` as a metric marked `CONFIRMED`, with approved phrasing in the user's words, under the right role. A typed number is used exactly as typed.
- **No number or skipped:** leave the line as it is. Never fill the gap yourself.
- Not shown requirements are not asked here; the ATS keyword check in Step 3 asks about missing required skills.
Then re-rate only the items an answer changed, write `match-after.json`, run `score.js` on it, and show before and after: "Match Score: 72 (Maybe) before, 81 (Shortlist) after", with one line per item that moved. The "after" score is for the tailored resume, which uses the confirmed facts.
Offer: "Build my package", "Stop here".

## Step 3. Full package (automatic once the user says go)
Run every step without stopping (the headshot question in step 3 is the only exception). Every one of the 6 steps gets its status line before the work and its "Done:" line after, including step 1's executive result and step 6:
1. "Step 1 of 6: researching the company and the hiring executive". Run `company-research`. Then "Done: found <name>, <title> since <date> (source: <publication>, <date>)", or "Done: no dated source for the hiring executive, so outreach goes to the role and is flagged".
2. "Step 2 of 6: building your tailored resume". Run `resume-builder` (locked layout, QA, copy check, then the ATS keyword check). "Done: 1 page, QA passed. Required skills covered: 7 of 9. Exact-term matches: 6 of 9." Collect the exact-term and missing-skill questions; do not ask yet.
3. "Step 3 of 6: building your baseball card". Run `baseball-card` (locked layout). If `facts.md` has no headshot yet, stop and ask for it now, not earlier and not on the review screen: "Add a photo for your baseball card?" with "I'll add one now", "Build the rest; add it later". Wait for the answer. A photo: save it under `Headshot file` in `facts.md` and build the card. Later: the card is marked "waiting for a photo" and the build carries on with step 4.
4. "Step 4 of 6: writing your outreach email and LinkedIn note". Run `outreach-package`: the receipts email to the hiring executive and a LinkedIn connection note under 300 characters (count it).
5. "Step 5 of 6: fact-checking everything". Run `fact-check` on the resume, card, email, and note before showing any of them. Fix what it finds. Collect the `FROM RESUME` numbers that need a yes.
6. "Step 6 of 6: making your results report". Step 4 below.

## Step 4. One-page results report (PDF)
Write `companies/<company-slug>/report.json` in the shape of `generators/match/sample-data/report.json`: name, company, title, date, paper (`a4` outside the US and Canada), `before` and `after` (leave out `after` if Step 2 was skipped), the two keyword lines, the four files (resume PDF, card PDF, `outreach.md` for the email and the LinkedIn note, each with a plain label), and the hiring executive with the dated source (or `"missing"` with the reason). Then run:
```
node build-report.js --data <company folder>/report.json --out <company folder>/<First_Last>_Match_Report_<Company>.pdf
```
It fails on more than 1 page, a dash, a placeholder, or a missing file; fix and rerun. A card waiting for a photo goes in `files` as `{"label": "Baseball card", "note": "waiting for a photo"}`, with no path; the report lists it without a link.

Then show one review screen: the report link, the score before and after, the four files, the executive line, and the collected questions, one at a time: the number confirmations, the exact-term question, then the missing required skills (the same rules as the Autopilot review in `roles/headhunter-chief-of-staff.md`). If an answer changes the resume, post "Updating your resume", rebuild, rerun the checks and the report, and post "Done: report updated".

Log the company in `tracker.md` as `Drafted` with links to its files. Finally offer: **"Find more jobs like this one"** (run `talent-scout` with this posting's title and role family) and **"Set up my full search"** (run `intake`, which keeps the facts already confirmed).

## QA before delivery
- The score matches `score.js` and the bands; every Met and Partly met item and every evidence claim quotes a real resume line.
- No number or skill in any file that is not in `facts.md` or the resume. Guided-fix answers are `CONFIRMED` in `facts.md`.
- The resume passed its QA and copy check; both keyword numbers are shown word for word.
- The LinkedIn note is under 300 characters. The executive has a dated source or is flagged.
- The report is 1 page and passed its checks. No em or en dashes anywhere.
- A status line came before every step that takes more than about 20 seconds.
