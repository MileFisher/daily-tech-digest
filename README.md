# 🗞️ Daily Tech Digest

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Deploy](https://github.com/MileFisher/daily-tech-digest/actions/workflows/daily-digest.yml/badge.svg)

**Your bilingual morning tech briefing — generated daily at 9 AM ICT.**

Fetches the top stories from Hacker News and Lobsters, filters out the noise,
formats a clean ranked digest, translates it to Burmese, and publishes it as a
live page — all with zero API keys and zero external dependencies.

> **→ [Live Digest](https://milefisher.github.io/daily-tech-digest/)** — updated daily, with EN/MY toggle, archive, and dark mode.

---

## Features

- **Dual sources** — Hacker News (7 slots) + Lobsters (3 slots) for diverse coverage
- **Smart filtering** — strips Ask/Tell/Show HN without URL, hiring posts, low-score stories
- **Bilingual** — English + Burmese (via MyMemory free translation API)
- **Live page** — responsive layout with hero story, 2-column grid, dark mode, archive browser
- **Daily automation** — GitHub Actions cron at 9 AM ICT, auto-deploys to GitHub Pages
- **Zero config** — no API keys, no `.env`, no database. Just Node 18+ and `node generate.js`
- **Claude Code ready** — ships with MCP, skill, and agent definitions for AI-driven development

## Quick start

```bash
node generate.js                     # Generate today's digest (EN + MY)
```

That's it. The digest lands in `output/digest-YYYY-MM-DD.md` and `output/digest-YYYY-MM-DD.my.md`.

### Options

| Flag | Default | Description |
|---|---|---|
| `--date YYYY-MM-DD` | today | Override the date in filename/header |
| `--top N` | 30 | Number of HN story IDs to fetch |
| `--keep N` | 10 | Total stories to keep after filtering |
| `--hn-keep N` | 70% of `--keep` | Slots reserved for Hacker News |
| `--lobsters-keep N` | 30% of `--keep` | Slots reserved for Lobsters |
| `--no-translate` | — | Skip Burmese translation |
| `--dry-run` | — | Print to stdout, don't write files |

### Error handling

| Scenario | Behavior |
|---|---|
| HN API unreachable | Logs error, exits with code 1 |
| Lobsters unreachable | Non-fatal — falls back to HN-only digest |
| Single story fetch fails | Skips that story, continues |
| Translation call fails | Falls back to original English text |
| Fewer than 3 stories pass | Logs a warning, still saves |

---

## Screenshot

![Daily Tech Digest — desktop view](screenshots/desktop-1280x800.png)
*Desktop (1280×800) — sidebar with filter stats, hero featured story, 2-column grid.*

<div align="center">
  <img src="screenshots/mobile-390x844.png" alt="Mobile view" width="280">
</div>

---

## How it works

```
HN Firebase API ──┐
                   ├── fetch ──▶ filter ──▶ merge ──▶ format ──▶ translate ──▶ write
Lobsters JSON ────┘
```

1. **Fetch** — Pulls top 30 HN story IDs + Lobsters hottest list concurrently
2. **Normalize** — Maps each source onto a common `{source, title, url, score, by, ...}` shape
3. **Filter** — Drops non-story types, Ask/Tell/Show-without-URL, low-score (HN ≥ 50, Lobsters ≥ 15), no-URL items
4. **Merge** — Reserves 7 HN + 3 Lobsters slots (instead of a global sort that would starve Lobsters)
5. **Format** — Builds markdown with source tags, metadata, contextual summaries, and per-source Discuss links
6. **Translate** — Calls MyMemory API for each title + summary (fail-soft: keeps English on error)
7. **Output** — Writes English `.md`, Burmese `.my.md`, and structured `.json` for the web UI

## Output sample

```markdown
# 🗞️ Daily Tech Digest — 2026-07-25

> Top 10 stories from Hacker News & Lobsters · Generated 09:00 ICT

---

1. Claude Opus 5

🔶 Hacker News · ⬆️ 1533 points · 💬 866 comments · 👤 alvis

A link to anthropic.com titled "Claude Opus 5", one of the highest-scoring
stories on the front page, with an active discussion thread.

[Discuss on HN](https://news.ycombinator.com/item?id=49038433) · [Source](https://www.anthropic.com/news/claude-opus-5)
```

## Web UI

The live site at **[milefisher.github.io/daily-tech-digest/](https://milefisher.github.io/daily-tech-digest/)** is a single-page static app:

- **Header** — site title, system status badge (LIVE / GENERATED), EN/MY segmented toggle, dark mode button
- **Sidebar** (desktop) — per-source slot breakdown with progress bars, archive browser, translator card
- **Hero story** — featured top story with serif typography, source badge, score, Read Source / View Thread links
- **Story grid** — 2-column layout (desktop) / 1-column (mobile) with rank badges, bilingual titles, author, DISCUSS links
- **Footer** — engine/runtime/data tags, build version, timestamp

The page renders from a JSON API (`digest-latest.json`) generated alongside the markdown files. No database, no server — flat files served by GitHub Pages.

## GitHub Actions

The workflow (`.github/workflows/daily-digest.yml`):
1. Runs on schedule at **02:00 UTC (09:00 ICT)** or manually via `workflow_dispatch`
2. Executes `node generate.js` (produces `.md`, `.my.md`, `.json`)
3. Syncs files to `docs/` and `docs/archive/`
4. Prunes archive to last 30 days, rebuilds `archive/index.json`
5. Commits, pushes, deploys to Pages

## Claude Code integration

This project is designed to pair with Claude Code:

- **MCP** — `@modelcontextprotocol/server-filesystem` (scoped to project root) for file read/write
- **Skill** — `.claude/skills/digest-format/SKILL.md` defines output format and tone
- **Agent** — `.claude/agents/content-filter.md` specifies the two-source filtering rules

## Project structure

```
.github/workflows/daily-digest.yml   # CI/CD pipeline
docs/
  index.html                          # Web UI (single-page app)
  digest-latest.md / .my.md / .json   # Latest digest (generated)
  archive/                            # 30-day rolling archive (generated)
generate.js                           # Main pipeline script
scripts/
  smoke-test.mjs                      # Playwright UI smoke test
  prune-archive.js                    # Archive maintenance
.output/                              # Generated markdown + JSON
```

## Test

```bash
node scripts/smoke-test.mjs
```

Runs Playwright against the live site at 3 viewports (desktop / tablet / mobile),
checking for console errors, story rendering, language toggle, theme toggle,
sidebar visibility, and error states.

## License

[MIT](LICENSE)
