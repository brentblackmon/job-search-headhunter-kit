# Sample Run: Jordan Rivera

> **FICTIONAL. Jordan Rivera is not a real person.** Every company, person, number, news story, and contact detail in this folder is invented for teaching. Web addresses use the reserved `.example` and `example.com` domains so none of them point to a real site. Any resemblance to real companies or people is coincidental.

Jordan is a Director of Operations with 14 years in logistics and supply chain software, based in Charlotte, NC. Jordan is targeting VP Operations and COO roles at mid-market software companies, $180K minimum, remote or Southeast. The search is confidential because Jordan is still employed.

This folder is what `My Job Search/` looks like after about five weeks of using the kit.

## Walk through it in order

| Step | Skill | File |
|---|---|---|
| 1. Build the facts file | `intake` | [facts.md](facts.md) |
| 2. Master resume and card | `resume-builder`, `baseball-card` | [master/](master/) |
| 3. Fix LinkedIn so recruiters find Jordan | `linkedin-review` | [linkedin-review.md](linkedin-review.md) |
| 4. First job scan, graded A/B/C | `talent-scout` | [scans/2026-08-17-am.md](scans/2026-08-17-am.md) |
| 5. Companies about to hire + hidden channels | `signal-search` | [signals/2026-08-19.md](signals/2026-08-19.md), [channels.md](channels.md) |
| 6. Deep dive on the top posting | `company-research` | [harborline-software/research.md](companies/harborline-software/research.md) |
| 7. Tailored resume (PDF, 2 pages, QA passed) | `resume-builder` | [Jordan_Rivera_Resume_Harborline.pdf](companies/harborline-software/Jordan_Rivera_Resume_Harborline.pdf), [QA report](companies/harborline-software/Jordan_Rivera_Resume_Harborline-QA.md) |
| 8. Tailored baseball card | `baseball-card` | [Jordan_Rivera_Card_Harborline.pdf](companies/harborline-software/Jordan_Rivera_Card_Harborline.pdf) |
| 9. Cover letter | `cover-letter` | [cover-letter.md](companies/harborline-software/cover-letter.md) |
| 10. Receipts email + LinkedIn note | `outreach-package` | [outreach.md](companies/harborline-software/outreach.md) |
| 11. What the Fact Checker caught | `fact-check` | [fact-check-report.md](companies/harborline-software/fact-check-report.md) |
| 12. Interview prep sheet | `interview-prep` | [interview-prep-2026-08-26.md](companies/harborline-software/interview-prep-2026-08-26.md) |
| 13. Follow-ups | `headhunter-chief-of-staff` | [followups.md](companies/harborline-software/followups.md) |
| 14. Offer and negotiation | `offer-negotiation` | [offer-and-negotiation.md](companies/harborline-software/offer-and-negotiation.md) |
| 15. Signal-based outreach (pattern-guess email) | `outreach-package` | [northvale-freight-cloud/](companies/northvale-freight-cloud/) |
| 16. A draft held for approval | `outreach-package` | [pelican-yard-technologies/outreach.md](companies/pelican-yard-technologies/outreach.md) |
| 17. The tracker that ties it together | `headhunter-chief-of-staff` | [tracker.md](tracker.md) |

## Things to notice

- **The Fact Checker earns its keep.** The first Harborline draft said "wait time" instead of "resolution time," used an unconfirmed NPS number, rounded 64 people up to "nearly 100," and claimed net retention when Jordan's number is gross. See [fact-check-report.md](companies/harborline-software/fact-check-report.md).
- **Tailoring is small on purpose.** Only the headline and first summary paragraph changed for Harborline. Compare [tailor.json](companies/harborline-software/tailor.json) with [resume.json](resume.json).
- **Exclusions work.** Anchorpoint TMS showed up in both the scan and the signal search. It was dropped both times because of Jordan's non-compete.
- **Pattern-guess emails are labeled.** The Northvale address was a guess from a published pattern, so the draft said so and reminded Jordan to check for a bounce.
- **Follow-ups add something.** None of them say "just checking in."
- **Nothing was sent by the kit.** Every "sent" entry in the tracker is Jordan's action.

## Rebuild the documents yourself
From the repo root, after the one-time setup in [the generators README](../../plugin/skills/recruit-rocket/generators/README.md):
```
cd plugin/skills/recruit-rocket/generators/resume
node build-resume.js --data ../../../../../examples/jordan-rivera/resume.json \
  --tailor ../../../../../examples/jordan-rivera/companies/harborline-software/tailor.json \
  --out ../../../../../examples/jordan-rivera/companies/harborline-software/Jordan_Rivera_Resume_Harborline --pages 2

cd ../baseball-card
node render-card.js --data ../../../../../examples/jordan-rivera/companies/harborline-software/card.json \
  --out ../../../../../examples/jordan-rivera/companies/harborline-software/Jordan_Rivera_Card_Harborline.pdf
```
