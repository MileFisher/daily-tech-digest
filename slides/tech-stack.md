---
marp: true
paginate: true
transition: fade
# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.
auto-advance: 20
---

<!-- slide 1 -->
# Who's my person?
<!-- 20s -->

A developer who opens Hacker News every morning,
scrolls for 20 minutes, and still feels like they missed something important.

---

<!-- slide 2 -->
# Their problem

HN has 500+ stories a day. Good ones are buried under Ask HN, hiring posts, and low-effort links.

They want the **top 10 stories worth reading** — not a homepage to scroll.

Lobsters has great content too, but its scoring scale is much lower — you can't just merge and sort.

---

<!-- slide 3 -->
# What I built

**daily-tech-digest** — a CLI tool that:

1. Fetches top stories from Hacker News + Lobsters
2. Filters noise per-source (score floors, drop Ask/Tell/Show without URL)
3. Reserves fixed slots (7 HN + 3 Lobsters) so both sources get represented
4. Translates to Burmese via MyMemory API
5. Saves bilingual markdown to `output/digest-YYYY-MM-DD.md + .my.md`

---

<!-- slide 4 -->
# How I built it

- **Tech stack:** Node.js 18+ (zero npm deps), GitHub Pages, GitHub Actions cron
- **MCP:** `filesystem` — Claude reads output files and checks them against the skill during dev
- **Skill:** `digest-format` — defines structure, tone, and file naming rules for every digest
- **Agent:** `content-filter` — strict rules for what makes the cut (type, score, URL, reserved slots)

CLI flags: `--date`, `--top`, `--keep`, `--hn-keep`, `--lobsters-keep`, `--dry-run`, `--no-translate`

---

<!-- slide 5 -->
# Why it matters

No login. No algorithm. No infinite scroll.

A developer gets their morning brief in **under 3 seconds**, in their editor, as a plain markdown file they actually own.

Bilingual output (EN + MY) makes tech news accessible to a wider audience. GitHub Pages auto-updates daily at 9 AM ICT.

---

<!-- slide 6 -->
# Done checklist

- [x] repo public — github.com/MileFisher/daily-tech-digest
- [x] MCP + skill + agent used and proven
- [x] report.md in team repo
- [x] GitHub Pages live — https://milefisher.github.io/daily-tech-digest/
- [x] Feedback collected from 3 users
- [x] License (MIT)
