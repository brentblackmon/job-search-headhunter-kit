# Brand Builder: Baseball Card

A baseball card lets a busy executive see the user's value in 10 seconds. It rides along with direct email and gets handed across the table. It never goes into an applicant tracking system, which cannot read it well.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing.** Dated sources for people. No guessed emails as real. The user sends everything. Human voice: no em dashes, no filler. Research first. Check the tracker. **QA before delivery.** **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md` in this skill's folder.

## Layout (fixed)
Built by `generators/baseball-card/render-card.js` in this skill's folder from `card-template.html`. The script fills the template itself; the page has no JavaScript. Landscape US Letter, one page.
- **Header band (dark):** name in spaced capitals; role line in orange (target title / company, for example "VP Operations / Harborline Software", or just the title for the master card); a two-part headline where the second half is in orange; a 2 to 3 sentence intro; headshot on the right (required; with no photo, the card waits for one).
- **4 stat tiles:** a big number and a short caption that says what it measures. **Student card with no numbers yet:** leave `stats` empty and use `tiles` instead, 4 skills and experience tiles, each `{"title": "Replay operator", "detail": "EVS replay for home football and basketball."}` (title about 22 characters, detail about 60). See `generators/baseball-card/sample-data/card-student.json` (a fictional example). Never invent a number to make a stat.
- **Two themed sections**, each with an orange numbered eyebrow ("01 / Running the post-sale team"), a bold one-line title, and 4 proof cards. Each card: a short tag, a title, an italic proof line (the number), and 1 to 3 sentences of body.
- **Footer band (dark):** a two-part tagline (second half orange) on the left, phone, email and LinkedIn on the right.

## Steps
1. Read `facts.md` and, if tailoring, `companies/<company-slug>/research.md`.
2. Write `card.json` in the same shape as `generators/baseball-card/sample-data/card.json` in this skill's folder (a fictional example). The sample files show the shape only: never reuse their headlines, taglines, or card text; write the user's own from `facts.md`. Save it in `My Job Search/` (master) or `My Job Search/companies/<company-slug>/` (tailored).
   - `name`, `role`, `headline` + `headlineAccent`, `intro`, `photo`, `stats` (4), `sections` (2, each with `eyebrow`, `title`, and 4 `cards` of `tag`, `title`, `proof`, `body`), `footer` (`tagline` + `accent`), `contact`.
   - **Headline:** two short sentences that name the target's problem and the user's answer. For a tailored card, tie it to the company's situation ("Faster go-lives." + "Customers who stay."). One line, about 70 characters for both parts together.
   - **Sections:** group the 8 strongest proof points into two themes that match what the target role needs (for example "Running the post-sale team" and "Building teams that last"). Section titles are one plain sentence.
   - **Cards:** tag is 1 to 3 words in the theme's language; title 2 to 5 words (about 32 characters); proof line is the number in approved phrasing (about 45 characters); body is 1 to 3 short sentences (about 150 characters) on what the user did.
   - **Stat captions:** say what the number measures, in a short sentence (about 60 characters, two lines at most).
   - When tailoring, put the company's top priority in section 01 and order cards so the most relevant one comes first.
3. **Headshot (required).** Use the file named under `Headshot file` in `facts.md`. In `card.json`, `photo` is the path to that file relative to `card.json` (for a tailored card in `companies/<company-slug>/`, that is `../../headshot.jpg`). Never use a stock or generated face, and never ship a card with initials.
   - If `facts.md` says `none yet`, do not build the card. Build everything else, and report the card as **waiting for a photo** so the review screen lists it.
   - When the user says "use [file] as my headshot", copy that file into `My Job Search/`, update `Headshot file` in `facts.md`, and build every card that was waiting.
   - The script fails QA when `photo` is empty or the file is missing, with the message "No headshot. Add a photo to your folder and say: use [file] as my headshot." Pass that message on to the user.
4. **Check the layout files installed.** Look for `generators/baseball-card/render-card.js` in this skill's folder. If it is missing, tell the user once: "Recruit Rocket installed without its layout files, so I'll build the card by hand this time. To get the exact layout, delete Recruit Rocket in Customize, Skills, and upload recruit-rocket.zip again." Then use the fallback at the end of this step.

   Render with the locked layout in this skill's `generators/baseball-card/` folder. The skill folder can be read-only, so copy it to a work folder outside `My Job Search/` first:
```
mkdir -p /tmp/recruit-rocket && cp -r <this skill's folder>/generators/baseball-card /tmp/recruit-rocket/
cd /tmp/recruit-rocket/baseball-card
npm install        # first time only
node render-card.js --data <path>/card.json --out <dir>/<First_Last>_Card_<Company>.pdf
```
The script prints with Playwright when a browser is available. If Playwright or its browser is missing (sandboxes often block the browser download), it falls back to WeasyPrint on its own, installing it with pip if needed. Do not run `npx playwright install` first; let the script choose. Master card file name: `<First_Last>_Card.pdf`.

If Node is not available at all, copy `generators/baseball-card/card-template.html`, replace `<!--CARD-->` with the markup built by `buildCard` in `render-card.js`, and print it to a one-page landscape US Letter PDF with whatever HTML-to-PDF tool you have (`python3 -m weasyprint card.html card.pdf` works). Keep the template's layout and colors unchanged. Never stop to ask the user to install anything.

## QA before delivery
1. PDF is exactly 1 page, landscape, with no overflow (the script checks the header, stat tiles, every card, and the footer, and fails if any text runs long), no placeholders, and the headshot embedded. If it fails, fix what it names and rerun.
2. Look at the PNG preview the script writes. It should look like a finished design: headline on one line, cards evenly filled, photo framed and not stretched.
3. Run `fact-check` on every number.
4. Tell the user: use this with direct email and in person, not in application portals.
