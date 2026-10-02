# Test Recruit Rocket

Thanks for testing. Recruit Rocket is a team of ten AI agents that runs your job search like a small recruiting firm with one client: you. It finds jobs that fit, spots companies about to hire, builds your resume, stat sheet, cover letter, and outreach, preps you for interviews, and tracks every follow-up.

**Nothing is ever sent for you.** It drafts. You decide and send.

Plan on about 30 minutes for the first run, then 15 minutes a day.

## Ten agents, thirteen skills
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

## What you need
- The **Claude desktop app** (Windows or Mac) with a plan that includes **Cowork**.
- Your **resume** (Word or PDF). A LinkedIn PDF helps too: on your LinkedIn profile, click **More**, then **Save to PDF**.

## Setup (one message)
1. Open the Claude desktop app and switch to **Cowork**. Choose your **Documents** folder.
2. Copy this whole message, paste it in, and press Enter:

> Please set up Recruit Rocket for me. Install these 13 skills:
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/intake.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/headhunter-chief-of-staff.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/fact-check.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/talent-scout.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/signal-search.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/company-research.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/resume-builder.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/baseball-card.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/cover-letter.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/linkedin-review.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/outreach-package.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/interview-prep.zip
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/skills/offer-negotiation.zip
>
> Then create a folder called "My Job Search" here and unzip this into it (it holds a "templates" folder):
> https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/recruit-rocket-templates.zip
> Tell me when you're done.

3. Click **Approve** whenever Claude asks for permission. Claude may show the skills on review cards a few at a time, so expect about five rounds of approving. That's normal.

**If that gets tedious, install them all at once instead:**
1. Download https://github.com/brentblackmon/job-search-headhunter-kit/raw/main/dist/all-skills.zip and unzip it. You'll get 13 small zip files.
2. In Claude, go to **Settings**, then **Skills**, then **Upload skill**, and drag all 13 files into the box at once. Click **Upload**.
3. Then paste only the last part of the setup message (the "My Job Search" folder step) into Cowork.

## Run it
1. Start a **new task**, choose the **My Job Search** folder, attach your resume, and say:
   > Set me up with Recruit Rocket.
2. Answer about five quick questions. Most are one click.
3. Let it run. It scans for jobs, picks your best matches, builds the materials for each, and then shows you one review screen. That takes a few minutes.
4. Review what it made. Send anything you like from your own email or LinkedIn, then tell it what you sent.

**Outside the US?** Tell it your country and cities during setup. Some job board connections only cover the US, so it will search the web and any job boards you name (for example Naukri or LinkedIn Jobs).

## Try these during the week
- Each morning: **"What should I do today?"**
- When an interview is booked: **"I have an interview with [company] on [day]."** It builds a prep sheet and offers a scored mock interview.
- After an interview: **"Let's debrief my interview with [company]."**
- **"Review my LinkedIn."**

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
