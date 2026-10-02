# Test Recruit Rocket

Thanks for testing. Recruit Rocket is a team of ten AI agents that runs your job search like a small recruiting firm with one client: you. **Nothing is ever sent for you.** It drafts. You decide and send.

## Three steps

**1. Open Claude and attach your files.**
Open the Claude desktop app, switch to **Cowork**, and choose your **Documents** folder. Attach your **resume**, plus anything else that shows your work: a LinkedIn PDF (on LinkedIn: **More**, then **Save to PDF**), cover letters, or project write-ups.

**2. Paste this one message and press Enter.**

> Set me up with Recruit Rocket. First install these 13 skills:
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/intake.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/headhunter-chief-of-staff.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/fact-check.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/talent-scout.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/signal-search.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/company-research.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/resume-builder.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/baseball-card.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/cover-letter.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/linkedin-review.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/outreach-package.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/interview-prep.zip
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/skills/offer-negotiation.zip
>
> Then create a folder called "My Job Search" here and unzip this into it:
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/recruit-rocket-templates.zip
>
> Then use the intake skill to set me up from the files I attached, save everything in My Job Search, and keep going from there.

**3. Approve, answer, and let it run.**
- Click **Approve** when Claude asks. It may show the skills a few at a time, so expect several rounds. That's normal.
- If Claude says it can't download the links, use the all-skills.zip steps under "More, if you need it" below, then paste the message again.
- Answer about five quick questions. Most are one click.
- Then it runs on its own: finds jobs that fit, spots companies about to hire, builds your resume, stat sheet, cover letter, and outreach for the best ones, checks every number, and shows you one review screen.

That's it. Each morning after that, just say **"What should I do today?"**

**Outside the US?** Tell it your country and cities when it asks where you want to work.

## Send your feedback
After your first run, and again after about a week, reply to Brent on LinkedIn with your answers. Short answers are perfect.

1. How long did setup and the first run take?
2. What was confusing, or where did you get stuck?
3. Which part saved you the most time?
4. Did anything it wrote sound wrong, untrue, or not like you? Paste an example.
5. Did you send anything it drafted? What happened?
6. Was the mock interview scoring useful? What would make it better?
7. On a scale of 1 to 10, how likely are you to recommend it to a friend who is job hunting? Why?

## Your privacy
Your resume, facts file, and tracker stay in the **My Job Search** folder on your own computer. Nothing is shared with Brent unless you send it yourself.

## More, if you need it

**Other things to try during the week**
- When an interview is booked: "I have an interview with [company] on [day]." It builds a prep sheet and offers a scored mock interview.
- After an interview: "Let's debrief my interview with [company]."
- "Review my LinkedIn."

**Installed an earlier version?**
In Claude, go to **Settings**, **Skills** and delete the old Recruit Rocket skills (intake, talent-scout, and the rest) before installing. Otherwise Claude keeps using the old versions, which are missing the resume and baseball card generators.

**If installing the skills one card at a time gets tedious**
Download https://github.com/brentblackmon/recruit-rocket/raw/main/dist/all-skills.zip and unzip it. In Claude, go to **Settings**, **Skills**, **Upload skill**, drag in all 13 files at once, and click **Upload**. Then paste the message from step 2 again; it will skip the install step.

**Ten agents, thirteen skills**
Each agent is one or more Claude skills. The Brand Builder uses four, which is why you install 13 skills for 10 agents.

| Agent | Skill(s) |
|---|---|
| Intake Agent | intake |
| Head Headhunter | headhunter-chief-of-staff |
| Talent Scout | talent-scout |
| Market Intel Analyst | signal-search |
| Research Analyst | company-research |
| Brand Builder | resume-builder, baseball-card (the one-page stat sheet), cover-letter, linkedin-review |
| Outreach Writer | outreach-package |
| Fact Checker | fact-check |
| Interview Coach | interview-prep |
| Offer Negotiator | offer-negotiation |
