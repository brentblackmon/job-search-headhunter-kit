---
name: cover-letter
description: Brand Builder, cover letter. Writes a one-page, 120 to 250 word cover letter that opens with the company's situation, gives 3 to 5 receipts from facts.md, and closes in one line. Use for "write a cover letter," "cover letter for this job," or when an application asks for one.
---

# Brand Builder: Cover Letter

Short, specific, and human. It should read like a note from a person who did their homework, not a template.

## Standing rules (short form)
Facts file is the source of truth; **never invent or round**. **Use approved phrasing.** Dated sources for people. No guessed emails as real. The user sends everything. **Human voice: no em dashes, no filler ("leverage," "unlock," "seamless," "I'm excited to," "I am writing to apply"), no stacked adjectives.** Research first. Check the tracker. QA before delivery. **Offer choices to click, never blank questions.** Full text: `STANDING_RULES.md`.

## Inputs
`facts.md`, the posting, and `companies/<slug>/research.md` (run `company-research` first if missing).

## Structure
1. **Salutation**: the hiring executive by name if confirmed current. Otherwise "Dear [Team] hiring team."
2. **Opening (2 to 3 sentences)**: the company's situation in their own words (a quoted priority or a dated event), and the problem it creates for this role.
3. **Receipts (3 to 5)**: short paragraphs or bullets. Each is one thing the user has done that maps to that problem, with a number in approved phrasing.
4. **Close (1 line)**: a plain ask. "I'd welcome 20 minutes to talk about how I'd approach [their problem]."
5. **Sign-off**: "Best," or "Thank you," then name, phone, email.

Use `templates/cover_letter.md` as the skeleton.

## Rules for the words
- 120 to 250 words in the body. Count them.
- First sentence is about them, not the user. Never open with "I am writing to apply."
- One idea per sentence. Most sentences under 20 words.
- Use the company's own terms for their priorities, in quotes once, then plainly.

## QA before delivery
Word count in range. Run `fact-check`. Company name and person name spelled right everywhere (copy-paste errors from another letter are common). Output as plain text for pasting, and as a one-page .docx if the user asks.
