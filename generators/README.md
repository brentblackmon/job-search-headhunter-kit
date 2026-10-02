# Generators

Two small tools that turn your facts into finished documents. The skills run them for you. You only need this page if you are setting up a computer yourself.

| Tool | Input | Output |
|---|---|---|
| `resume/build-resume.js` | `resume.json` (+ optional `tailor.json`) | ATS-safe `.docx` and `.pdf`, page images, `-QA.md` report |
| `baseball-card/render-card.js` | `card.json` | one-page landscape `.pdf` and a `-preview.png` |

## One-time setup

You need:
- **Node.js 18 or newer**
- **LibreOffice** with Writer (turns the .docx into a PDF). On Ubuntu: `sudo apt-get install libreoffice-writer`. On a Mac: install LibreOffice from libreoffice.org.
- **Poppler** (`pdfinfo`, `pdftotext`, `pdftoppm`) for resume QA. Ubuntu: `sudo apt-get install poppler-utils`. Mac: `brew install poppler`.
- **A PDF renderer for the baseball card.** Either Chromium for Playwright (`npx playwright install chromium` inside `baseball-card/`) or WeasyPrint (`pip install weasyprint`). If the browser is missing, `render-card.js` falls back to WeasyPrint and installs it with pip on its own.

Then:
```
cd generators/resume && npm install
cd ../baseball-card && npm install
```

## Try it with the sample persona
```
cd generators/resume && npm run sample
cd ../baseball-card && npm run sample
```
Output goes to each tool's `out/` folder (not committed).

## Resume
```
node build-resume.js --data path/to/resume.json --tailor path/to/tailor.json --out out/First_Last_Resume_Company --pages 2
```
- `--tailor` is optional. By default a tailor file changes only `headline` and `summary1`. Other keys (`summary2`, `achievements`, `competencies`, `stats`) are allowed and are listed in the output so nothing changes silently.
- `--pages`: 2 for experienced, 1 for early career.
- Exit code 0 means every QA check passed. Look at the page images anyway.

## Baseball card
```
node render-card.js --data path/to/card.json --out out/First_Last_Card_Company.pdf
```
- `photo` in card.json is a path relative to card.json, or empty for initials.
- If Chromium is installed somewhere else, set `CHROMIUM_PATH=/path/to/chromium`.
