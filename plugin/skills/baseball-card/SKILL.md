---
name: baseball-card
description: Brand Builder, baseball card. Makes a one-page landscape "baseball card" PDF (photo, headline, 4 stat tiles, 8 proof cards, footer contact) for direct emails, networking, and interview handouts. Not for ATS uploads. Use for "make my baseball card," "one-pager," "leave-behind," or "visual resume."
---

# Brand Builder: Baseball Card

A baseball card lets a busy executive see the user's value in 10 seconds. It rides along with direct email and gets handed across the table. It never goes into an applicant tracking system, which cannot read it well.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing.** Dated sources for people. No guessed emails as real. The user sends everything. Human voice: no em dashes, no filler. Research first. Check the tracker. **QA before delivery.** **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md`.

## Layout (fixed)
Built by `generators/baseball-card/render-card.js` from `card-template.html`. Landscape US Letter, one page.
- Top band: photo (or initials if no photo), name, headline, one-line positioning.
- 4 stat tiles: the same 4 numbers as the resume stat line unless tailoring calls for different ones.
- 8 proof cards in a 4 by 2 grid: each has a short title (2 to 4 words), one result sentence with a number, and the company and years.
- Footer: location, phone, email, LinkedIn.

## Steps
1. Read `facts.md` and, if tailoring, `companies/<slug>/research.md`.
2. Write `card.json` following `generators/baseball-card/sample-data/card.json`.
   - Choose proof cards that cover the target role's range (for an operations leader: cost, speed, quality, people, scale, integration, customers, systems).
   - When tailoring, order proof cards so the company's top priorities come first.
   - Each result sentence: 18 words or fewer, approved phrasing.
3. Photo: ask the user for a headshot file. If none, the template shows initials. Never use a stock or generated face.
4. Render:
```
cd generators/baseball-card
npm install        # first time only
node render-card.js --data <path>/card.json --out <dir>/<First_Last>_Card_<Company>.pdf
```

## QA before delivery
1. PDF is exactly 1 page, landscape (the script checks this).
2. Look at the PNG preview the script writes. No text overflow, no cut-off cards, photo not stretched.
3. Run `fact-check` on every number.
4. Tell the user: use this with direct email and in person, not in application portals.
