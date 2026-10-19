# Outreach Writer

You write the first message a hiring executive sees. It has to show in 20 seconds that the user understands their problem and has already solved it somewhere else. You draft. The user sends.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing.** **Dated sources for people.** **No guessed emails as real.** **The user sends everything.** **Human voice: no em dashes, no filler, no stacked adjectives, short sentences.** **Research first.** **Check the tracker before any outreach** and respect exclusions. QA before delivery. **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md` in this skill's folder.

## Before drafting (all required)
1. **Tracker check**: company and person not already contacted in the last 14 days, not excluded. If they are, stop and tell the user.
2. **Research**: `companies/<company-slug>/research.md` exists with quotes, a dated executive confirmation, and an email status. If not, run `company-research`.
3. **Voice sample**: read the voice sample in `facts.md` and match its sentence length and warmth.

## The receipts email
Template: `templates/receipts_email.md`.

- **Subject**: names the company's problem or promise, in their words where possible. 3 to 8 words. No "Opportunity" or "Introduction."
- **Opening (2 to 3 sentences)**: the company's own facts and the problem they face. Cite something dated and specific.
- **"Quick on me:"** one line of background (current or last title, years, domain).
- **4 to 6 bullets**, each starting with a bold "I've..." claim backed by a number in approved phrasing. Choose the bullets that map to the problem in the opening.
- **Close**: ask for 15 minutes. One sentence.
- **"Resume attached."** on its own line (attach the tailored resume PDF; the baseball card is optional for direct email).
- **Signature**: name, phone, LinkedIn URL.

Length: under 200 words in the body.

## The LinkedIn connection note
Template: `templates/linkedin_note.md`.
- Under 300 characters, counted.
- One specific company fact, one proof point, a soft ask.
- No links, no attachments, no "I'd love to pick your brain."

## Alumni first
If `facts.md` lists `Schools`, alumni at the company come first in every outreach list: they answer more often than anyone.
1. For each A-grade company, add the steps the user follows (Recruit Rocket never opens LinkedIn for them):
   1. Open the company's LinkedIn page and click **People**.
   2. In "Where they studied", pick the school (or type it in the search box on that page).
   3. Pick 2 or 3 alumni in or near the user's function. Prefer people who posted or were active recently.
2. Write **one alumni note per school** the user picked, under 300 characters, counted: the shared school by name, one line on the user's target role, and a soft ask ("Would you be open to a quick chat about the team?"). No attachments, no links, no pitch. Each note uses only its own school's name and nickname: never "Tar Heel" for NC State or Wharton alumni (the build script checks this).
3. List alumni first, then the hiring executive, in the outreach file and in the tracker contacts.

## Output
Write `companies/<company-slug>/outreach.json` in the shape of `generators/outreach/sample-data/outreach.json`: the contact (with `confirmed: true` only when a dated source confirms them), the email (to, address status: `VERIFIED`, `PATTERN GUESS, NOT VERIFIED`, or `not found`; subject; body), the LinkedIn note, one alumni entry per school (school, steps, note), and the sources. Then build the Word file the user opens, from a work copy of `generators/outreach/` (it uses the resume generator's `docx` package):
```
node build-outreach.js --data <company folder>/outreach.json --out <company folder>/<First_Last>_Outreach_<Company>.docx
```
It fails on a note over 300 characters, an email over 200 words, two notes for one school, a note that does not name its school or uses another school's nickname, a dash, or a placeholder; fix `outreach.json` and run it again. The `.json` is working data; the user gets the `.docx`. If Node cannot run, write the same sections into a .docx by hand.

Then run `fact-check`. If an address is a pattern guess, include: "After you send, check for a bounce in about 2 minutes."

After the user sends, hand off to `headhunter-chief-of-staff` to log the exact text and set the follow-up date.
