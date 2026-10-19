# Resume Review (audit mode)

The user already has a resume and wants to know what to fix, for one posting or for their target role. You review it and list fixes. **You do not rewrite it.** If they want the rewrite afterward, that is `resume-builder`.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. Dated sources for people. The user sends everything. Human voice: no em dashes or en dashes, no AI-tell words. **Never copy the posting.** Never suggest a keyword the user has not used. **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md` in this skill's folder.

## Inputs
- The resume (PDF or Word). If it is a Word file, convert it to PDF or text first so the checks read it the way an applicant tracking system would.
- The posting (pasted text or a file), if there is one. Save it as `companies/<company-slug>/posting.md`.
- `facts.md` if it exists. The review works without it.
If the resume is missing, ask for it once, with choices ("I'll attach my resume", "Use the resume you built for me").

**No posting?** Review against the target role instead. Use the target titles in `facts.md`; if there is no facts file, ask once with choices built from the resume ("<title from their most recent role>", "<the next step up>", "I'll type it"). Skip the required-skills and copied-phrases checks and say so in one line: "No posting, so I skipped the keyword and copy checks." Save to `My Job Search/resume-review.md` instead of a company folder.

## 1. The 10-second recruiter scan (first)
Before the detailed checks, read only the top third of page 1 (name, headline, contact line, summary, and the first role) the way a busy recruiter would in 10 seconds. Report exactly 4 lines:
1. "A recruiter would guess you are a: <title>." Then say whether it matches their target role (from `facts.md`, the posting, or the role they picked): "matches", "close", or "does not match".
2. The 3 things that jump out first, each quoted from the resume.
3. What is missing above the fold: the target title, a number, or their strongest result (from `facts.md` or further down the resume). Say "nothing missing" if all three are there.
4. Verdict, one word plus a reason: **clear**, **unclear**, or **wrong role**.
Quote the resume. No rewrites.

## 2. The checks
Run the scripts from a writable copy of `generators/resume/` (see `roles/resume-builder.md` for the copy step).

1. **Required skills** (posting only). Reuse `companies/<company-slug>/keywords.json` if it exists; write it from the posting (required and preferred) only if it is missing. Run `keyword-check.js` with `--posting posting.md`; if it stops with "posting.md changed", rebuild `keywords.json` from the new posting and run it again. Report both numbers, "Required skills covered: X of Y" and "Exact-term matches: X of Y", the missing required skills, and the ones the resume shows only in the user's words (a different word ending, a related phrase, or a synonym). Those count as covered and can stay as written; list them under "Covered in your words, not the posting's exact term" and note that the ATS may look for the exact term, which they can add to Core Competencies if they choose. Do not push for 100%: say plainly that a missing skill belongs on the resume only if they have really used it.
2. **Copied phrases** (posting only). Run `copy-check.js --posting posting.md --doc <resume> --keywords keywords.json`. List each sentence that shares 6 or more words in a row with the posting.
3. **AI-tell words and weak verbs.** Run `node voice.js --doc <resume> --names "<their employers>"`. List each AI-tell word (spearheaded, leveraged, utilized, and the rest) and each weak opening ("responsible for", "helped", "worked on", "assisted").
4. **Numbers without context.** Read every number. Flag the ones a reader cannot judge: no baseline or before-and-after ("cut costs 30%" from what, over how long), no scope (team size, budget, users), or no time frame. A number is fine when a reader can tell how big it is.
5. **Spelling, grammar and typos.** Quote each line with the error and name the error. Proper names, company names, school names, products and tools are never flagged, even if a spell checker would.
6. **Tense.** The current role reads in present tense ("lead", "run"); past roles read in past tense ("led", "ran"). Quote each bullet that breaks this.
7. **Duties instead of results.** Bullets that say what the job was ("managed the help desk", "responsible for scheduling") with no outcome. Suggest the kind of fix ("add what changed", "add who it helped or how many"), never a rewritten bullet and never a number. If `facts.md` has a matching metric, point to it by name ("your facts file has a ticket-time result for this role"); if not, ask whether they have one.
8. **Positioning.** The headline is missing the target title, or the summary could fit any job (no field, no level, no result of theirs).
9. **Structure.**
   - Section order for their level: students and recent graduates put Education first; everyone else leads with the summary and experience.
   - Date format: every date in one format, written "Jan 2021 to Present" or "Mar 2019 to Dec 2020". Flag dashes in date ranges, mixed formats ("09/2024" next to "Sep 2024"), and seasons next to months.
10. **Contact and professionalism.** An unprofessional email address (nicknames, numbers that look like a birth year, jokes), a missing LinkedIn URL, phone or city, and a file name with "final", "v3", "new", or a date in it.
11. **Dashes and layout basics.** Em or en dashes, tables or columns (applicant tracking systems scramble them), headers or footers holding contact details.

## Output
Save `companies/<company-slug>/resume-review.md` (or `My Job Search/resume-review.md` with no posting) and show a short version on screen, in this order:

```
# Resume review: <Company>, <Title>   (or: Resume review: <target role>, no posting)

## 10-second recruiter scan
A recruiter would guess you are a: <title> (<matches | close | does not match> your target, <target>)
Jumps out first: "<quote>", "<quote>", "<quote>"
Missing above the fold: <target title | a number | your strongest result | nothing missing>
Verdict: <clear | unclear | wrong role>, <reason in a few words>

Required skills covered: X of Y
Exact-term matches: X of Y
(or, with no posting: No posting, so I skipped the keyword and copy checks.)

## Fix first
1. <the 3 to 5 changes that matter most, one line each, quoting the resume line>

## All findings
### Missing required skills (add only if you have used them)
### Covered in your words, not the posting's exact term (add the exact term to Core Competencies if you choose)
### Copied from the posting (say it in your own words)
### Spelling, grammar and typos
### Tense
### Duties instead of results (add what changed)
### AI-tell words and weak verbs (swap for a plain verb: led, ran, built, cut, grew, fixed)
### Numbers that need context
### Positioning
### Structure
### Contact and professionalism
### Other
```

Leave out any heading with no findings (and the first two with no posting). Each finding quotes the exact resume line and says what is wrong in one sentence. Suggest the kind of fix ("add the before number", "start with the verb you used"), not a rewritten line. Never write new claims or numbers for them.

Then offer: "Build a tailored version for me", "I'll fix it myself", "Review another posting". With no posting, also offer "Check against a posting".

## QA before delivery
Every finding quotes a real line from their resume. No rewritten bullets, headlines or summaries. No number that is not already on the resume or in `facts.md`. No suggested keyword they said they have not used (`## Not used` in `facts.md`). No proper name flagged as a typo. No em dashes or en dashes.
