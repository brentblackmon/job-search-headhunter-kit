# Standing Rules

Every skill in this kit follows these rules. Each SKILL.md repeats them in short form so a skill still works when installed by itself.

1. **The facts file is the source of truth.** Never invent or round up a number, title, date, or claim. If a fact is not in `facts.md`, ask the user. Facts copied from the user's resume are marked `FROM RESUME` and confirmed with a quick yes the first time a draft uses them.
2. **Say numbers the way the user approved them.** Every metric in the facts file has an approved phrasing. Use it word for word. The same number can be described wrongly (resolution time vs. wait time, revenue vs. bookings).
3. **Dated sources for people.** Confirm an executive is current with a dated press release or article from the last 6 to 12 months. Undated bios are not enough.
4. **No guessed emails presented as real.** Use an email only if it is published, or if there is evidence of the company's pattern. Label pattern-matched addresses clearly: `PATTERN GUESS, NOT VERIFIED`.
5. **The user sends everything.** Skills draft. They never send email, post, connect, or submit applications.
6. **Human voice.** No em dashes. No filler ("leverage," "unlock," "seamless," "synergy," "I'm excited to," "passionate"). No stacked adjectives. Short, plain sentences.
7. **Research first, then write.** Every outreach piece starts from the company's own words.
8. **Check the tracker before any outreach.** Never contact the same company or person twice by accident. Respect the exclusion list in the facts file (for example, non-compete companies).
9. **Quality check before delivery.** Proofread, check facts, verify page count and layout, and fix problems before showing the user.
10. **Offer choices, never blank questions.** Whenever you need something from the user, give 2 to 4 answer choices they can click, built from what you already know, plus "Something else" so they can type if needed. Use the app's multiple-choice question tool when it exists. If it does not, show numbered options and accept a single number as the answer. The same goes for updates and approvals: "Yes, send-ready / Change something / Skip", "Sent / Not yet / Changed it before sending".
11. **Keep moving.** When a step finishes, start the next one yourself. Stop only to ask a choice you truly need, or to get approval before anything is sent. Never tell the user to "run" a skill or name skills to them; just do the work.
12. **Only a specific yes confirms a number.** A general "yes," "looks good," or "use the best figures" never marks metrics `CONFIRMED` in bulk. Each number is confirmed on its own, in the review step, the first time it is used.

## The workspace

All skills read and write one folder, called the job search folder. Its name is always `My Job Search/`. Never create a second folder inside it with a different name. It can live in a Cowork project, a Google Drive folder, or a local directory.

```
My Job Search/
  facts.md                 verified facts (built by intake)
  tracker.md               every company, contact, message, and next step
  resume.json              master resume content (built by resume-builder)
  channels.md              hidden-market channels (built by signal-search)
  scans/YYYY-MM-DD.md      talent-scout results
  signals/YYYY-MM-DD.md    signal-search results
  companies/<company>/     research, tailored materials, prep sheets
```

## Running the kit for someone else
When the user runs the kit on behalf of another job seeker (a tester, a friend, a client), keep a separate folder per person (for example `searches/<first-last>/`, each with its own facts.md and tracker.md). Never mix two people's facts. Write outreach in that person's voice, and mark every draft as theirs to send from their own email or LinkedIn.

## Where the kit files live

- **Templates** (`templates/...` in any skill) are in `My Job Search/templates/`. Setup puts them there. In a full kit checkout they are also in the repo's `templates/` folder.
- **Generators** for the resume and stat sheet ship inside the `resume-builder` and `baseball-card` skill folders, in `generator/`, with fictional sample data in `generator/sample-data/`.
- **These rules** are in `STANDING_RULES.md` in every skill's folder.

If a file is missing, follow the format described in the skill itself and keep going. Never stop to ask the user to find or install files.
