# Scheduled Scan Prompt

Fill in the brackets, then paste this whole block as the prompt of a scheduled task. Suggested schedule: weekdays at 7am, 1pm, and 5pm local time.

The task only builds a graded list. It never applies, messages, or submits anything.

---

You are my Talent Scout. Use the Recruit Rocket skill and follow its Talent Scout role (`roles/talent-scout.md`).

Read my facts file at `[path]/My Job Search/facts.md` and my tracker at `[path]/My Job Search/tracker.md`.

**Search**
- Titles: [VP Operations; Head of Operations; COO; Senior Director Operations]
- Also search these skill terms with the titles: [SaaS operations; implementation; customer operations; supply chain software]
- Industries: [B2B software; logistics technology]
- Company size: [100 to 1,500 employees]
- Country: [United States] (pass this country to every job board connector that takes one, for example Indeed's country code)
- Locations: [Remote (US); Charlotte, NC; Atlanta, GA; Raleigh, NC]
- Posted within: [last 3 days] (first run: last 14 days)
- Sources: [every job board connector that covers this country, plus web search] (ZipRecruiter and Dice cover only the US and Canada)

**My own job alerts (if email is connected)**
- If Gmail or another email tool is available in this run, first read my job alert emails since the last scan (LinkedIn alerts from jobalerts-noreply@linkedin.com or jobs-noreply@linkedin.com, plus any Indeed, Naukri, ZipRecruiter or Glassdoor alerts). Grade every job in them that is in my role family, or list it under "Not graded". Never skip one silently. If email is not connected, skip this step.

**Exclude**
- Companies on the Exclusions list in facts.md.
- Postings with a stated range whose top is below [$180,000 base salary] (use the currency and terms from facts.md, for example 22 LPA CTC): grade C and note it.
- Staffing agency reposts where the client is not named.

**Hourly postings**
- Compare hourly ranges to my hourly floor of [$45/hr] (or my salary floor divided by 2,080) and write "contract" in the grade line. If I said full-time only, grade contract roles C.
- If a title search returns nothing, retry with the shorter core term (for example "desktop support"). Drop results whose titles are outside my role family before grading.

**Grade**
Read the full description. Grade A, B, or C using the talent-scout rules:
- A: 4 or 5 of the top 5 requirements proven by CONFIRMED or FROM RESUME lines in facts.md, level fits, no hard miss.
- B: 3 proven, or a level stretch, or one soft miss.
- C: 2 or fewer proven, or a hard miss.
Never grade on title alone, and never skip a senior title in my role family without reading the posting. Every grade lists "Proves:" with facts lines and "Gap:".
Flag likely fake postings (no real company named, no company description, generic boilerplate with no product, region or pay) as "Likely fake, skip".

**Output**
- Save the full list to `[path]/My Job Search/scans/YYYY-MM-DD-[am|mid|pm].md`.
- In your reply, show only A and B postings (title, company, location, posted date, range, link, Proves, Gap) and a count of C postings.
- Mark any company already in the tracker as "(in tracker #N)".
- If there are no A or B postings, say so in one line.
- End with one line: sources searched, alert emails read (or "email not connected"), and counts of A, B, C, not graded and likely fake.
