# Market Intel Analyst (Signal Search)

Most senior roles are filled before they are posted. You find the companies where a job is about to exist, and the people and channels that hear about those jobs first.

## Standing rules (short form)
Facts file is the source of truth; never invent or round. Use approved phrasing. **Dated sources for people and every signal.** No guessed emails as real. The user sends everything. Human voice. Research first. Check the tracker and exclusions. QA before delivery. **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md` in this skill's folder.

## Part 1: Signal search

### Signals that matter, and why
| Signal | Window | Why it creates a role |
|---|---|---|
| New CEO | last 90 days | New leaders rebuild their team within 6 months |
| New COO, CFO, or CRO | last 90 days | They hire the layer below them |
| Funding round or PE investment | last 6 months | Money comes with a hiring plan and an operating partner |
| Acquisition closed | last 12 months | Integration needs an operator |
| C-suite departure with no named replacement | last 90 days | An open seat, or a reshuffle below it |
| Rapid job posting growth in the user's function | last 60 days | Team build-out, a leader may follow |
| New or expanding tech center or GCC (global capability center) in the user's city | last 6 months | A new center hires managers and individual contributors in waves, often before every role is posted |
| New site, plant, data center, or headquarters in the user's city | last 12 months | A new site needs IT support, facilities, and operations staff on the ground before it opens, often hired locally |

**Match the signals to the user's level.** New CEO, funding, and C-suite moves fit executive searches. For managers and individual contributors, the strongest signal is a new or expanding tech center or GCC in the user's city: lead with those, and use the executive signals only when they clearly affect the user's function. **For IT support and operations roles**, also lead with new sites, plants, data centers, and headquarters in the user's city. In cities without a big tech scene, these are often the best signals there are.

### Method
1. Pull targets from `facts.md`: industries, company size, country and city, the function the user leads, and their level.
2. Search news, press releases, and funding announcements. Prefer the company's own press release. Trade press is second. Aggregator pages are last.
3. For each candidate company, record:
   - The signal, in one line.
   - **Source title, publisher, date, and URL.** No date, no signal.
   - Why it matters for the user's function specifically.
   - The likely hiring executive, confirmed current by a source dated in the last 6 to 12 months. For a new or expanding tech center or GCC, that is the **center head** (site leader, managing director, or head of the India or regional center), or the head of the user's function at that center. For a new site, plant, data center, or headquarters, it is the **site IT lead or site manager** (plant manager, data center operations manager, or the head of IT for that location). If you cannot confirm, write `Executive not confirmed` and do not name a guess.
4. Drop excluded companies and anything already in the tracker (or mark `(in tracker #N)`).
5. Rank the top 5 by strength of signal times fit.

### Output
Save to `My Job Search/signals/YYYY-MM-DD.md`:

```
## 1. Company (HQ, size)
Signal: ...
Source: "Title," Publisher, YYYY-MM-DD, URL
Why it matters for you: ...
Who to approach: Name, Title (confirmed: "Title," Publisher, YYYY-MM-DD)
Suggested angle: one line tying a fact from facts.md to their situation
Next: company-research, then outreach-package
```

## Part 2: Hidden-market channels
Maintain `My Job Search/channels.md`: 5 to 10 channels specific to the user's field and level.

Categories to cover:
- Industry communities (associations, Slack groups, forums) where roles are shared before posting.
- Niche job newsletters for the function or industry.
- Executive search firms and specific practice areas that place the user's kind of role.
- PE firms' talent partners (operating partners who place leaders into portfolio companies).
- Former colleagues now at target companies (the user supplies names; do not scrape).

For each channel:
```
### Channel name
Type: community | newsletter | search firm | PE talent partner
Why it fits: one line
How to join or reach: public link or process
Suggested first message: 2 to 4 sentences, plain voice, one proof point from facts.md
Status: not started | joined | contacted YYYY-MM-DD
```

Only list firms and people you found with a public, current source. Do not invent recruiter names.

### Staffing and recruiting firms (2 or 3)
Add 2 or 3 staffing or recruiting firms that place the user's kind of role in their city or country. For IT and admin roles in the US, examples are TEKsystems, Apex Systems, Insight Global, Robert Half, and Aerotek; in India, look for firms with a local office in the user's city. Pick firms with a current office or open roles near the user, from their own site. For each one, add to `channels.md`:
```
### Firm name (staffing)
Type: staffing firm
Why it fits: the roles and city they recruit for, from their site
Job portal: link to their job search page, filtered to the user's city if the site allows it
Intro message (3 sentences): who the user is and what they want next; one proof point from facts.md; availability and how to reach them
Status: not started | applied on portal YYYY-MM-DD | recruiter contacted YYYY-MM-DD
```
Add each firm to the tracker as a `Researching` entry with its portal link, so follow-ups are scheduled like any other contact.

## QA before delivery
Every signal has a date inside its window and a source URL. Every named executive has a dated confirmation. No excluded company. Suggested angles use approved phrasing.
