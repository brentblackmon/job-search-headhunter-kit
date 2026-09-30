---
name: intake
description: Builds or updates the job seeker's facts file (facts.md) in about 10 minutes, starting from their resume or LinkedIn PDF, then asking only the few things a resume cannot tell. Use when the user is starting the Headhunter Kit, says "set me up," "build my facts file," "update my facts," uploads a resume or LinkedIn export to start from, or when any other skill finds a fact missing. Every other skill in the kit reads from this file.
---

# Intake

You build `facts.md`, the source of truth every other skill reads. People will not sit through a long interview, so you do the work: draft everything from their documents, ask only what you must, and let the Fact Checker confirm numbers later, one at a time, when a draft actually uses them.

**Target: under 10 minutes of the user's time.**

## Standing rules (short form)
Facts file is the source of truth; never invent or round. Store approved phrasing for every metric. Dated sources for people. No guessed emails as real. The user sends everything. Human voice: no em dashes, no filler, short sentences. Research first. Check the tracker. QA before delivery. Full text: `STANDING_RULES.md` at the plugin root.

## Status values for facts
- `CONFIRMED`: the user said yes to this exact phrasing.
- `FROM RESUME`: copied word for word from the user's own document, not yet confirmed. Usable in drafts **after** a one-line yes from the user (the Fact Checker asks at that moment).
- `UNCONFIRMED`: the user is unsure. Never used until resolved.

## Step 1: Get the documents (1 minute)
- If `my-search/facts.md` exists, you are updating. Read it and ask only "What changed?"
- Otherwise ask for the resume (and a LinkedIn PDF if they have one: LinkedIn profile, More, Save to PDF). If they have neither, ask them to paste their last three roles in any rough form.

## Step 2: Draft the facts file yourself (no questions)
Using `templates/facts.md` headings exactly:
1. Fill identity, contact, every role (company, title, MM/YYYY dates, location, scope), education, and certifications.
2. For each role, turn every number in their document into a metric with an approved phrasing that stays **word for word** with their own wording. Do not improve, round, or combine numbers. Mark each `FROM RESUME`.
3. Note anything that looks off: overlapping dates, a number that appears two different ways, a metric with no timeframe. Do not fix it. List it for Step 3.
4. Infer a draft of target titles and industries from their recent roles. Mark it as a guess.

## Step 3: Ask 5 quick questions (5 minutes)
Ask all of them in **one message**, numbered, so the user can answer in one reply. Pre-fill your guesses so they can just say "yes" or correct them.

1. **Targets**: "I'm guessing you want [titles] at [company types]. Right?"
2. **Money**: "What base salary would you not go below? And what's your target?"
3. **Location**: "Remote, hybrid, or on-site? Which cities? Open to relocating?"
4. **Companies to avoid**: "Any companies I should never contact, like a non-compete or your current employer?"
5. **Anything wrong?** "Here are [N] things that looked off in your resume: [list]. And is any number on it one you would not want to defend to a reference?"

Optional sixth line, only if they seem willing: "If you have 2 minutes, paste a short email you wrote, so outreach sounds like you."

## Step 4: Save and finish
1. Write `my-search/facts.md` with a `Last reviewed: YYYY-MM-DD` line.
2. Create `my-search/tracker.md` from `templates/tracker.md` if it does not exist.
3. Tell the user in 3 to 4 lines: the file is saved, how many metrics are `FROM RESUME` (they'll be asked about each one only when it gets used), anything `UNCONFIRMED`, and the suggested next step (usually `talent-scout` or `linkedin-review`).

## Going deeper (only when the user asks)
If the user wants stronger material, offer a short follow-up of 3 questions per role: the biggest result they are proud of that is **not** on the resume, the baseline and timeframe for it, and how they would prove it. Add those as `CONFIRMED` once they approve the phrasing. Stories for interviews get built later by `interview-prep`, not here.

## QA before delivery
- Every `FROM RESUME` phrasing matches the source document exactly.
- No number was rounded, combined, or invented.
- Exclusions section is filled (even if "none").
