---
marp: true
paginate: true
transition: fade
# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.
auto-advance: 20
---

<!-- slide 1 -->
# Who's my person?

A developer who opens Hacker News every morning,
scrolls for 20 minutes, and still feels like they missed something important.

---

<!-- slide 2 -->
# Their problem

HN has 500+ stories a day.
Good ones are buried under Ask HN, hiring posts, and low-effort links.

They want the **top 10 stories worth reading** —
not a homepage to scroll.

---

<!-- slide 3 -->
# What I built

**daily-tech-digest** — a CLI tool that:

1. Fetches top 30 stories from Hacker News
2. Filters noise (Ask HN, score < 50, no URL)
3. Formats a clean markdown digest
4. Saves to `output/digest-YYYY-MM-DD.md`

One command. One file. Done.

---

<!-- slide 4 -->
# How I built it

- **MCP:** `filesystem` — Claude reads output files and checks them against the skill during dev
- **Skill:** `digest-format` — defines structure, tone, and file naming rules for every digest
- **Agent:** `content-filter` — strict rules for what makes the cut (type, score, URL, top 10)

---

<!-- slide 5 -->
# Why it matters

No login. No algorithm. No infinite scroll.

A developer gets their morning brief in **under 3 seconds**,
in their editor, as a plain markdown file they actually own.

Next: schedule it with cron. Wake up to today's digest already saved.

---

<!-- slide 6 -->
# Done checklist
- [x] repo public — github.com/MileFisher/daily-tech-digest
- [x] MCP + skill + agent used
- [x] report.md in team repo