---
name: baseball-card
description: Brand Builder, baseball card. Makes a one-page landscape "baseball card" PDF (dark header with photo and headline, 4 stat tiles, two themed rows of 4 proof cards, footer tagline and contact) for direct emails, networking, and interview handouts. Not for ATS uploads. Use for "make my baseball card," "one-pager," "leave-behind," or "visual resume."
---

# Brand Builder: Baseball Card

A baseball card lets a busy executive see the user's value in 10 seconds. It rides along with direct email and gets handed across the table. It never goes into an applicant tracking system, which cannot read it well.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing.** Dated sources for people. No guessed emails as real. The user sends everything. Human voice: no em dashes, no filler. Research first. Check the tracker. **QA before delivery.** **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md` in this skill's folder.

## Layout (fixed)
Built by `generator/render-card.js` in this skill's folder from `card-template.html`. The script fills the template itself; the page has no JavaScript. Landscape US Letter, one page.
- **Header band (dark):** name in spaced capitals; role line in orange (target title / company, for example "Chief Operating Officer / Velosio", or just the title for the master card); a two-part headline where the second half is in orange; a 2 to 3 sentence intro; headshot on the right (initials if none).
- **4 stat tiles:** a big number and a short caption that says what it measures.
- **Two themed sections**, each with an orange numbered eyebrow ("01 / Running the partner business"), a bold one-line title, and 4 proof cards. Each card: a short tag, a title, an italic proof line (the number), and 1 to 3 sentences of body.
- **Footer band (dark):** a two-part tagline (second half orange) on the left, phone, email and LinkedIn on the right.

## Steps
1. Read `facts.md` and, if tailoring, `companies/<company-slug>/research.md`.
2. Write `card.json` in the same shape as `generator/sample-data/card.json` in this skill's folder (a fictional example). Save it in `My Job Search/` (master) or `My Job Search/companies/<company-slug>/` (tailored).
   - `name`, `role`, `headline` + `headlineAccent`, `intro`, `photo`, `stats` (4), `sections` (2, each with `eyebrow`, `title`, and 4 `cards` of `tag`, `title`, `proof`, `body`), `footer` (`tagline` + `accent`), `contact`.
   - **Headline:** two short sentences that name the target's problem and the user's answer. For a tailored card, tie it to the company's situation ("Three acquired teams." + "One way to run the business."). One line, about 70 characters for both parts together.
   - **Sections:** group the 8 strongest proof points into two themes that match what the target role needs (for example "Running the partner business" and "Data, AI and recurring revenue"). Section titles are one plain sentence.
   - **Cards:** tag is 1 to 3 words in the theme's language; title 2 to 5 words (about 32 characters); proof line is the number in approved phrasing (about 45 characters); body is 1 to 3 short sentences (about 150 characters) on what the user did.
   - **Stat captions:** say what the number measures, in a short sentence (about 60 characters, two lines at most).
   - When tailoring, put the company's top priority in section 01 and order cards so the most relevant one comes first.
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
1. PDF is exactly 1 page, landscape, with no overflow (the script checks the header, stat tiles, every card, and the footer, and fails if any text runs long). If it fails, shorten the text it names and rerun.
2. Look at the PNG preview the script writes. It should look like a finished design: headline on one line, cards evenly filled, photo framed and not stretched.
3. Run `fact-check` on every number.
4. Tell the user: use this with direct email and in person, not in application portals.
