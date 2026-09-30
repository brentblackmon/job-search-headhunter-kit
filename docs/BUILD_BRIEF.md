# Build Brief: Job Search Headhunter Kit (v1)

Paste this whole file as the first message of the cloud session for the `job-search-headhunter-kit` repository. Commit a copy of it to the repo as `docs/BUILD_BRIEF.md`.

## What we are building

A generic, reusable "AI personal headhunter" for any job seeker, at any level. It is a team of Claude skills that work together like a small recruiting firm: they find openings, find companies about to hire, tailor materials, fact-check everything, draft outreach, prep interviews, and keep a tracker. The job seeker approves and sends everything. Nothing goes out without their yes.

It was proven in a real executive job search. This repo is the clean, generic version that can be taught as a course and customized by each user. Audience, format and pricing are decided later, so keep it generic.

**Hard rule for this repo: no real person's data.** Use only the fictional sample persona below. No real resumes, emails, phone numbers, addresses, trackers or contacts.

## The org chart (each role is a skill)

Layer 1: **You**, the job seeker. Picks targets, approves every word, sends everything.

Layer 2: **Head Headhunter (Chief of Staff).** Runs the daily routine, keeps the tracker, flags follow-ups, prevents double contact. Skill: `headhunter-chief-of-staff`.

Layer 3, Pipeline team (find the openings):
- **Talent Scout**: daily job scan that grades postings against the user's real strengths, not just title matches. Grades A/B/C with reasons. Never grades on title alone. Skill: `talent-scout` plus a scheduled-task prompt template.
- **Market Intel Analyst**: signal search for companies likely to hire before they post: new CEO or COO in the last 90 days, fresh funding, acquisitions needing integration, C-suite rebuilds. Every signal needs a dated source. Also maintains a short list of hidden-market channels for the user's field (industry communities, niche job newsletters, executive search firms and PE talent partners who place their kind of role), with a suggested first message for each. Skill: `signal-search`.
- **Research Analyst**: company deep-dive (what they sell, customers, stated priorities in their own words) and confirms the right executive is current from a dated source. Skill: `company-research`.

Layer 3, Brand and Outreach team (win the conversation):
- **Brand Builder**: tailored resume, one-page "baseball card," short cover letter, and LinkedIn profile review. The LinkedIn review rewrites the headline and About section around the exact keywords recruiters search for the target role, so recruiters find and message the user. Skills: `resume-builder`, `baseball-card`, `cover-letter`, `linkedin-review`.
- **Outreach Writer**: "receipts" emails and LinkedIn connection notes in the user's voice. Skill: `outreach-package`.
- **Fact Checker**: checks every number and claim against the user's verified facts file, catches typos, flags guessed email addresses, and reminds the user to check for a bounce about 2 minutes after sending. Always on. Skill: `fact-check`.
- **Interview Coach**: prep sheet, the 15 questions this interviewer is most likely to ask for this job description, STAR answers built only from the facts file, and role-play. Skill: `interview-prep`.
- **Offer Negotiator**: when an offer arrives, a calm negotiation script and email that ask for a specific number or term, backed by the user's facts and the posted range when public. Never promises a result, never invents a competing offer. Skill: `offer-negotiation`.

Chief of Staff also owns the **follow-up cadence**: thank-you note within 24 hours of any interview, a value-add follow-up 3 business days after an interview, and a final "closing the loop" note after 14 days of silence. Each follow-up must add something new (an insight, a relevant article, a short idea), never "just checking in."

Plus the foundation skill: **Intake** (`intake`), a guided interview that builds the user's verified facts file. Everything else reads from that file.

## Standing rules (bake these into the skills)

1. **Facts file is the source of truth.** Never invent or round up a number, title, date or claim. If a fact is not in the file, ask the user.
2. **Say numbers the way the user approved them.** Store approved phrasing next to each metric, not just the number, because the same number can be described wrongly (for example, resolution time vs. wait time).
3. **Dated sources for people.** Confirm an executive is current with a dated press release or article from the last 6 to 12 months. Undated bios are not enough.
4. **No guessed emails presented as real.** Use an email only if it is published, or if there is evidence of the company's pattern. Label pattern-matched addresses clearly.
5. **The user sends everything.** Skills draft; they never send email, post, or submit applications.
6. **Human voice.** No em dashes, no filler ("leverage," "unlock," "seamless," "I'm excited to"), no stacked adjectives. Short, plain sentences.
7. **Research first, then write.** Every outreach piece starts from the company's own words.
8. **Check the tracker before any outreach.** Never contact the same company or person twice by accident. Respect any exclusion list, such as non-compete companies.
9. **Quality check before delivery.** Proofread, check facts, verify page count and layout, and fix before showing the user.

## Templates to build

- **Facts file template** (`templates/facts.md`): identity and contact, target roles, salary floor, locations, exclusions, then per role: company, dates (MM/YYYY), scope, and a list of metrics, each with its approved phrasing.
- **Resume generator** (Node, `docx` package, output .docx and PDF via LibreOffice): one ATS-safe format. Single column, no tables, no text boxes, no header or footer content. Arial, navy accent `1A2B4A`. Name, headline, contact line, a shaded stat line with 4 numbers, 2-paragraph summary, key achievements, one-line competency list, experience, education. Tailoring changes only the headline and first summary paragraph by default. Target 2 pages for experienced users, 1 page for early career. QA: page count, render each page to an image and check for orphan lines, check `pdftotext` output reads in the right order.
- **Baseball card** (HTML to PDF with Playwright, landscape letter): photo, headline, 4 stat tiles, 8 proof cards, footer contact. For direct email and handouts only, not ATS uploads.
- **Receipts email template**: an opening built on the company's own facts and the problem they face, then "Quick on me:" one line of background, then 4 to 6 bullets that each start with a bold "I've..." claim backed by a number, then a close asking for 15 minutes, "Resume attached," signature. Subject line names the company's problem or promise.
- **Cover letter**: one page, about 120 to 250 words, no corporate filler. Opens with the company's situation, then 3 to 5 receipts, then a one-line close. Reads like a person, not a template.
- **Negotiation script and email**: acknowledge the offer, state enthusiasm once, name the specific ask and the reason, and propose a next step.
- **Follow-up templates**: 24-hour thank-you, 3-day value-add, 14-day close-the-loop.
- **LinkedIn connection note**: under 300 characters, one specific company fact, one proof point, a soft ask.
- **Tracker** (`templates/tracker.md`): numbered entries per company with status, dates, contacts, exact text sent, next follow-up date.
- **Scheduled scan prompt** (`templates/scan_prompt.md`): the prompt a scheduled task runs each weekday, with keywords, grading rules, exclusions and output format.

## Repo structure

```
README.md                 setup and how the team works
docs/BUILD_BRIEF.md       this file
docs/course-outline.md    module outline mapped to the org chart (draft only)
plugin/                   Claude plugin (skills + manifest)
  skills/<one folder per skill>/SKILL.md
templates/                facts, tracker, scan prompt, email, note
generators/               resume (Node), baseball card (HTML + render script)
examples/jordan-rivera/   full sample run using the fictional persona
marketing/                org chart graphic + LinkedIn post draft
```

## Fictional sample persona (use for all examples and testing)

Jordan Rivera, Director of Operations, 14 years in logistics and supply chain software. Based in Charlotte, NC. Targeting VP Operations and COO roles at mid-market software companies, $180K minimum, remote or Southeast. Invent plausible but clearly fictional companies and numbers for Jordan only, and mark the example folder as fictional.

## Marketing assets (after the kit works)

- **Org chart graphic**: 1080 x 1350 portrait PNG for a LinkedIn post. Clean light background, navy and one accent color. Title "My job search has an org chart." Three layers as above, one card per role with a one-line job and its schedule (Talent Scout: weekdays 7am, 1pm, 5pm; others "on call"; Fact Checker "always on"). Side panel for connectors (Gmail, Google Drive, Chrome/LinkedIn, job boards) and a skills list. Include a line "Nothing goes out without my yes." Our own design; do not copy anyone else's layout, and do not use Anthropic or Claude logos. "Built with Claude" in text is fine.
- **LinkedIn post draft**: hook "My job search has an org chart," short explanation of the team, the lesson that the Fact Checker is the most important hire, and a call to action: "Comment HEADHUNTER and I'll send you the playbook."

## Definition of done for v1

1. All skills written with clear triggers and steps, and the standing rules applied.
2. Templates and generators work end to end in a fresh environment.
3. `examples/jordan-rivera/` contains a complete sample run: facts file, graded scan, 2 signal-search companies, tailored resume (PDF, correct page count, QA passed), baseball card PDF, cover letter, receipts email, LinkedIn note, LinkedIn headline and About rewrite, interview prep sheet, a sample negotiation email, follow-up drafts, tracker entries.
4. README explains setup in plain language for a non-technical job seeker.
5. Org chart PNG and post draft in `marketing/`.
6. Commit in logical steps and push a branch for review.
