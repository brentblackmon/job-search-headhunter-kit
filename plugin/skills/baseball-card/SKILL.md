---
name: baseball-card
description: Brand Builder, baseball card. Makes a one-page landscape "baseball card" PDF (photo, headline, 4 stat tiles, 8 proof cards, footer contact) for direct emails, networking, and interview handouts. Not for ATS uploads. Use for "make my baseball card," "one-pager," "leave-behind," or "visual resume."
---

# Brand Builder: Baseball Card

A baseball card lets a busy executive see the user's value in 10 seconds. It rides along with direct email and gets handed across the table. It never goes into an applicant tracking system, which cannot read it well.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing.** Dated sources for people. No guessed emails as real. The user sends everything. Human voice: no em dashes, no filler. Research first. Check the tracker. **QA before delivery.** **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md` in this skill's folder.

## Layout (fixed)
Built by `generator/render-card.js` in this skill's folder from `card-template.html`. The script fills the template itself; the page has no JavaScript. Landscape US Letter, one page.
- Top band: photo (or initials if no photo), name, headline, one-line positioning.
- 4 stat tiles: the same 4 numbers as the resume stat line unless tailoring calls for different ones.
- 8 proof cards in a 4 by 2 grid: each has a short title (2 to 4 words), one result sentence with a number, and the company and years.
- Footer: location, phone, email, LinkedIn.

## Steps
1. Read `facts.md` and, if tailoring, `companies/<company-slug>/research.md`.
2. Write `card.json` in the same shape as `generator/sample-data/card.json` in this skill's folder (a fictional example). Save it in `My Job Search/` (master) or `My Job Search/companies/<company-slug>/` (tailored).
   - Choose proof cards that cover the target role's range (for an operations leader: cost, speed, quality, people, scale, integration, customers, systems).
   - When tailoring, order proof cards so the company's top priorities come first.
   - Each result sentence: 18 words or fewer and about 115 characters or fewer (5 lines on the card), approved phrasing.
3. Photo: ask the user for a headshot file. If none, the template shows initials. Never use a stock or generated face.
4. Render with the locked layout in this skill's `generator/` folder (in a full kit checkout it is also at `generators/baseball-card/`):
```
cd <this skill's folder>/generator
npm install        # first time only
node render-card.js --data <path>/card.json --out <dir>/<First_Last>_Card_<Company>.pdf
```
The script prints with Playwright when a browser is available. If Playwright or its browser is missing (sandboxes often block the browser download), it falls back to WeasyPrint on its own, installing it with pip if needed. Do not run `npx playwright install` first; let the script choose. Master card file name: `<First_Last>_Card.pdf`.

If Node is not available at all, copy `generator/card-template.html`, replace `<!--CARD-->` with the markup built by `buildCard` in `render-card.js`, and print it to a one-page landscape US Letter PDF with whatever HTML-to-PDF tool you have (`python3 -m weasyprint card.html card.pdf` works). Keep the template's layout and colors unchanged. Never stop to ask the user to install anything.

## QA before delivery
1. PDF is exactly 1 page, landscape (the script checks this).
2. Look at the PNG preview the script writes. No text overflow, no cut-off cards, photo not stretched.
3. Run `fact-check` on every number.
4. Tell the user: use this with direct email and in person, not in application portals.
