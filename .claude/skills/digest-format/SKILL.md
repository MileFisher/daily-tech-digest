---
name: digest-format
description: Use when generating or formatting the daily tech news digest output file. Defines structure, tone, file naming, and markdown rules.
---

# Digest Format Rules

## File
- Save to `output/digest-YYYY-MM-DD.md` using today's date
- Overwrite if file already exists for today

## Structure (in order)
1. `# 🗞️ Daily Tech Digest — {YYYY-MM-DD}`
2. Blank line, then: `> Top {N} stories from Hacker News · Generated {HH:MM} ICT`
3. Blank line, then `---`
4. For each story (ranked 1–N):
{rank}. {title}

⬆️ {score} points · 💬 {descendants} comments · 👤 {by}

{one sentence plain-English summary of what this story is about}

Read on HN · Source
5. Footer: `*daily-tech-digest · MileFisher · {ISO timestamp}*`

## Tone rules
- Summaries: one sentence, neutral, factual, no hype
- No words like "groundbreaking", "revolutionary", "game-changing"
- Write for a developer who has 30 seconds per story

## Edge cases
- If a story has no URL (text post that passed filtering), omit the Source link
- If descendants is null or 0, write "no comments yet"