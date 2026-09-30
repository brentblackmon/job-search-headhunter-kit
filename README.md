# Rocket Recruiter

**An AI personal headhunter for your job search.** It's a team of Claude skills that works like a small recruiting firm with one client: you. It finds openings, spots companies about to hire, tailors your resume, fact-checks every word, drafts outreach, preps you for interviews, and keeps your tracker.

**Nothing goes out without your yes.** The kit drafts. You approve, and you send.

It was built and proven in a real executive job search. This is the clean, generic version you can set up for yourself at any career level.

---

## Meet the team

```
                          YOU
        Pick targets. Approve every word. Send everything.
                           |
              HEAD HEADHUNTER (Chief of Staff)
      Daily briefing, tracker, follow-ups, no double contact
                           |
        +------------------+-------------------+
        |                                      |
  PIPELINE TEAM                      BRAND AND OUTREACH TEAM
  find the openings                  win the conversation
  - Talent Scout                     - Brand Builder (resume, baseball
  - Market Intel Analyst               card, cover letter, LinkedIn)
  - Research Analyst                 - Outreach Writer
                                     - Fact Checker (always on)
                                     - Interview Coach
                                     - Offer Negotiator

  FOUNDATION: Intake builds your facts file. Everyone reads from it.
```

| Role | Skill | What it does | When |
|---|---|---|---|
| Intake | `intake` | Reads your resume and work samples, asks about 5 easy questions, and builds your **facts file**, the single source of truth | Once, then when things change |
| Head Headhunter | `headhunter-chief-of-staff` | Daily briefing, tracker, follow-up schedule, prevents contacting anyone twice | Every morning |
| Talent Scout | `talent-scout` | Scans job boards and grades postings A/B/C against what you can prove, not job titles | Weekdays 7am, 1pm, 5pm |
| Market Intel Analyst | `signal-search` | Finds companies likely to hire before they post (new CEO, funding, acquisitions) and lists the hidden-market channels for your field | On call |
| Research Analyst | `company-research` | One-page company deep dive in their own words, and confirms who to contact with a dated source | On call |
| Brand Builder | `resume-builder`, `baseball-card`, `cover-letter`, `linkedin-review` | ATS-safe resume, one-page baseball card, short cover letter, LinkedIn headline and About rewrite | On call |
| Outreach Writer | `outreach-package` | "Receipts" email and LinkedIn note in your voice | On call |
| Fact Checker | `fact-check` | Checks every number against your facts file, catches typos and filler, flags guessed emails | **Always on** |
| Interview Coach | `interview-prep` | The 15 questions you're most likely to get, answers built from your real results, and practice | On call |
| Offer Negotiator | `offer-negotiation` | A calm script and email that ask for one specific thing | On call |

## The rules every skill follows

1. **Your facts file is the source of truth.** No invented or rounded-up numbers, titles, or dates. If it's not in the file, Claude asks you.
2. **Numbers are said the way you approved them.** "Resolution time" and "wait time" are not the same claim.
3. **People are confirmed with a dated source** from the last 6 to 12 months.
4. **No guessed email presented as real.** Guesses are labeled, and you get a reminder to check for a bounce.
5. **You send everything.** The kit never sends email, posts, or applies.
6. **Human voice.** No em dashes, no "leverage," "unlock," "seamless," or "I'm excited to." Short, plain sentences.
7. **Research first, then write.** Every message starts from the company's own words.
8. **Check the tracker first.** No accidental double contact. Your exclusion list (non-competes, former employers) is respected.
9. **Quality check before you see it.** Proofread, fact-checked, page count verified.

Full text: [plugin/STANDING_RULES.md](plugin/STANDING_RULES.md)

---

## Setup (about 15 minutes, including a 10-minute intake)

### What you need
- A Claude account with skills enabled (the Claude app, Cowork, or Claude Code).
- Optional but helpful connectors: **Gmail** (so Claude can save drafts for you to send), **Google Drive** (to keep your job search folder), a browser connection for **LinkedIn**, and any **job board** connectors available to you.

### Option A: Let Claude set it up (easiest, no file handling)
1. Open the Claude desktop app and switch to **Cowork**. Choose your **Documents** folder.
2. Copy this whole message, paste it in, and press Enter:

> Please set up Rocket Recruiter for me. Install these 13 skills from these links:
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/intake.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/headhunter-chief-of-staff.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/fact-check.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/talent-scout.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/signal-search.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/company-research.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/resume-builder.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/baseball-card.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/cover-letter.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/linkedin-review.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/outreach-package.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/interview-prep.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/offer-negotiation.zip
>
> Then create a folder called "My Job Search" in this folder, and put the kit's templates in it from:
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/Headhunter-Test.zip
> (use only the "templates" folder from that zip). Tell me when you're done.

3. Click **approve** when Claude asks for permission.
4. Start a new task, choose the **My Job Search** folder, attach your resume, and say: **"Set me up with Rocket Recruiter."** The `intake` skill reads what you share and asks about 5 easy questions, one at a time, like a first call with a recruiter.

**If Claude says it can't install skills,** do it by hand: in Claude go to **Settings, Skills, Upload skill** and drag in the 13 `.zip` files from the kit's `dist/skills` folder (GitHub page, **Code**, **Download ZIP**, then unzip). You can drop them all in at once.

### Option B: Claude Code
```
/plugin marketplace add brentblackmon/job-search-headhunter-kit
/plugin install rocket-recruiter@job-search-headhunter-kit
```
Then clone the repo (or copy `templates/`) into your working folder and say "Set me up with Rocket Recruiter."

To build resumes and baseball cards as PDFs on your own computer, see [generators/README.md](generators/README.md). In Cowork and Claude Code, Claude can run these for you.

---

## Your first week

| Day | Do this | Say to Claude |
|---|---|---|
| 1 | A 10-minute interview, then the kit scans jobs and builds resumes, cards, cover letters, and emails for your top 3 matches on its own | "Set me up with Rocket Recruiter. My resume is attached." |
| 2 | Master resume and baseball card | "Build my master resume and baseball card." |
| 2 | LinkedIn headline and About | "Review my LinkedIn." |
| 3 | First job scan, then schedule it | "Run my first job scan." then "Set up my scheduled scan." |
| 3 | Signal search and hidden channels | "Find companies likely to hire someone like me." |
| 4 | First tailored package for your best A | "Research Harborline and build my outreach package." |
| 5 on | Daily routine | "What should I do today?" |

## Your daily routine (15 to 30 minutes)
1. **Morning:** "What should I do today?" The Head Headhunter lists follow-ups due, drafts waiting for you, and new A-grade jobs.
2. **Approve and send** the drafts you like. Edit anything that doesn't sound like you.
3. **Log it:** "I sent the Harborline email." Paste what you sent. The tracker sets the next follow-up.
4. **Before any interview:** "Prep me for my interview with Priya at Harborline on Thursday."

---

## Try it first with a test folder
Download [dist/Headhunter-Test.zip](dist/Headhunter-Test.zip), unzip it, and open `START HERE.txt`. It has a ready-made job search folder for the fictional Jordan Rivera and four tests to run in Cowork.

## See a full example
[examples/jordan-rivera/](examples/jordan-rivera/) is a complete sample run for a **fictional** job seeker: facts file, graded scan, signal search, tailored resume and baseball card PDFs, cover letter, outreach, the Fact Checker's catches, interview prep, follow-ups, a negotiation, and the tracker.

## What's in this repo
```
README.md                 you are here
docs/BUILD_BRIEF.md       the original build brief
docs/course-outline.md    draft course modules mapped to the team
plugin/                   the Claude plugin: 13 skills + manifest + standing rules
templates/                facts file, tracker, scan prompt, email, note, letters, prep sheet
generators/               resume (.docx + PDF with QA) and baseball card (PDF)
examples/jordan-rivera/   full fictional sample run
marketing/                org chart graphic + LinkedIn post draft
dist/skills/              one zip per skill, ready to upload
scripts/                  package-skills.sh rebuilds dist/skills
```

## Privacy
Your facts file and tracker hold personal information. Keep your `my-search/` folder private. Never commit it to a public repository. This repo contains only fictional sample data.

## License
Not chosen yet. Audience, format, and pricing are decided later. Built with Claude.
