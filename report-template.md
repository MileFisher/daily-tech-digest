# Project Report — daily-tech-digest

> Copy this file to your team repo as `report.md` and fill in each section.

## 1. Project overview

**Name:** daily-tech-digest
**Repo:** https://github.com/MileFisher/daily-tech-digest
**Live URL:** https://milefisher.github.io/daily-tech-digest/
**License:** MIT

**What it does:**
<!-- 1-2 sentences describing the project -->
Fetches the top Hacker News stories, filters noise, and formats a clean markdown digest that auto-deploys to GitHub Pages daily.

## 2. How it works

<!-- Describe the pipeline briefly -->
1. Fetches top 30 story IDs from the HN Firebase API
2. Fetches each story in parallel (failures are skipped)
3. Filters: story type only, drops Ask/Tell/Show HN/hiring, score ≥ 50, must have URL, top 10 by score
4. Formats as ranked markdown with score, comments, author, and a contextual summary
5. Writes to `output/digest-YYYY-MM-DD.md`

**Tech stack:** Node.js 18+ (zero dependencies), GitHub Actions, GitHub Pages

## 3. Claude Code workflow

<!-- Describe how Claude Code was used -->

| Component | File | Purpose |
|---|---|---|
| MCP server | `.mcp.json` | `filesystem` — read/write project files |
| Skill | `.claude/skills/digest-format/SKILL.md` | Defines output format, tone, edge cases |
| Agent | `.claude/agents/content-filter.md` | Defines filtering rules as standalone spec |

## 4. Screenshots

<!-- Link screenshots from the screenshots/ folder -->
<!-- Use 1280×800 for desktop, 390×844 for mobile -->

| Desktop (1280×800) | Mobile (390×844) |
|---|---|
| ![desktop](screenshots/desktop-01.png) | ![mobile](screenshots/mobile-01.png) |

## 5. What I learned

<!-- Fill in your own reflections -->
- ...
- ...
- ...

## 6. What I'd do next

<!-- Fill in future improvements -->
- ...
- ...
