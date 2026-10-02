# Test Recruit Rocket

Thanks for testing. Recruit Rocket is a team of ten AI agents that runs your job search like a small recruiting firm with one client: you. **Nothing is ever sent for you.** It drafts. You decide and send.

Setup takes about 30 minutes the first time.

## Before you start (one time)
1. **Get Claude Pro or higher.** Recruit Rocket runs in Cowork, which is not on the free plan. Sign up at claude.ai and upgrade to Pro. Check the current price for your country on the upgrade page.
2. **Install the Claude desktop app** from **claude.com/download** (Windows or Mac) and sign in with the same account.
3. **Make a folder** in Documents called **Recruit Rocket**. Put your resume in it (Word or PDF). If you can, add your LinkedIn profile as a PDF too: on LinkedIn, open your profile, click **More**, then **Save to PDF**.

## Three steps

**1. Install the skills.**
1. Download https://github.com/brentblackmon/recruit-rocket/raw/main/dist/all-skills.zip and unzip it. You will see 13 smaller zip files. Do not unzip those.
2. In the Claude app, go to **Settings**, then **Skills**, then **Upload skill**. Select all 13 zip files at once and click **Upload**.

This is the install route that keeps each skill's layout files, so your resume and stat sheet come out in the designed format.

**2. Open Cowork and paste one message.**
In the Claude app, choose **Cowork** and pick your **Recruit Rocket** folder. Attach your resume and any other files that show your work (cover letters, project write-ups), then paste this and press Enter:

> Set me up with Recruit Rocket. Create a folder called "My Job Search" here and unzip this into it:
> https://github.com/brentblackmon/recruit-rocket/raw/main/dist/recruit-rocket-templates.zip
>
> Then use the intake skill to set me up from the files I attached, save everything in My Job Search, and keep going from there.

**Outside the US?** Add one line to that message with your country, city, and the currency you think in, for example: "I am in Hyderabad, India. Show pay as CTC in LPA."

**3. Approve, answer, and let it run.**
- Click **Allow** or **Approve** when Claude asks for permission.
- Answer about five quick questions. Most are one click.
- Then it runs on its own: finds jobs that fit, spots companies about to hire, builds your resume, stat sheet, cover letter, and outreach for the best ones, checks every number, and shows you one review screen.

That's it. Each morning after that, just say **"What should I do today?"**

**Found a job on a board Claude can't search** (for example Naukri or LinkedIn Jobs)? Paste the link or the job text and say: **"Grade this posting and build my package."**

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

**If you can't use Upload skill: let Claude install them**
In Cowork, paste this message and approve each skill when Claude asks (it may show them a few at a time). Some versions of Claude save only part of each skill this way. If your resume or stat sheet later says its "layout files" are missing, delete the skills and use Upload skill instead.

> Install these 13 skills:
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
