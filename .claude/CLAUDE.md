# daily-tech-digest

Fetches the top tech stories from Hacker News, filters noise, formats a clean
markdown digest, and saves it to output/digest-YYYY-MM-DD.md.

## Key files
- generate.js — main script, run with `node generate.js`
- .claude/skills/digest-format/SKILL.md — formatting rules
- .claude/agents/content-filter.md — content filtering agent

## HN API (no key needed)
- Top stories: GET https://hacker-news.firebaseio.com/v0/topstories.json
- Story detail: GET https://hacker-news.firebaseio.com/v0/item/{id}.json
  Fields: id, title, url, score, by, time, descendants (comment count), type

## Rules
- No API keys in code — use process.env (even if empty here)
- Output always goes to output/digest-YYYY-MM-DD.md
- Never modify files in output/ manually — they are generated