---
name: digest-format
description: Use when generating or formatting the daily tech news digest output file. Defines structure, tone, file naming, and markdown rules.
---

# Digest Format Rules

## File
- English: save to `output/digest-YYYY-MM-DD.md` using today's date
- Burmese: save to `output/digest-YYYY-MM-DD.my.md` alongside it (skipped if translation is disabled)
- Overwrite if files already exist for today

## Structure (in order)
1. `# 🗞️ Daily Tech Digest — {YYYY-MM-DD}` (Burmese: `# 🗞️ နေ့စဉ် နည်းပညာသတင်းများ — {YYYY-MM-DD}`)
2. Blank line, then: `> Top {N} stories from Hacker News & Lobsters · Generated {HH:MM} ICT`
3. Blank line, then `---`
4. For each story (ranked 1–N, merged from both sources — see content-filter agent for the reserved-slot rule):
{rank}. {title}

{source icon} {source name} · ⬆️ {score} points · 💬 {descendants} comments · 👤 {by}

{one sentence plain-English summary of what this story is about}

Discuss · Source
5. Footer: `*daily-tech-digest · MileFisher · {ISO timestamp}*` (same in both languages)

## Source tag
Every entry's meta line starts with a source marker:
- Hacker News: `🔶 Hacker News`
- Lobsters: `🦞 Lobsters`

## Discussion link
Use the story's own permalink, not a hardcoded HN URL:
- Hacker News: `https://news.ycombinator.com/item?id={id}`
- Lobsters: the story's `short_id_url`

## Tone rules
- Summaries: one sentence, neutral, factual, no hype
- No words like "groundbreaking", "revolutionary", "game-changing"
- Write for a developer who has 30 seconds per story

## Burmese (.my.md) rules
- Translate only natural-language prose: the title and the one-sentence summary
- Never translate score, comment count, author handle, links, or the ISO footer timestamp
- If translation fails for a given string, fall back to the original English text rather than omitting the entry

## Edge cases
- If a story has no URL (text post that passed filtering), omit the Source link
- If descendants is null or 0, write "no comments yet"