# 🗞️ daily-tech-digest

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Fetches the top tech stories from Hacker News, filters out the noise, and writes
a clean markdown digest to `output/digest-YYYY-MM-DD.md`.

**→ [Live Digest](https://milefisher.github.io/daily-tech-digest/)** (auto-updates daily at 9 AM ICT)

## What it does

1. Fetches the top 30 story IDs from the Hacker News API.
2. Fetches each story's details in parallel.
3. Filters to the top 10 by score, dropping low-score posts, Ask/Tell/Show HN
   threads, hiring posts, and items without a link.
4. Formats the survivors as a ranked markdown digest.
5. Saves it to `output/digest-YYYY-MM-DD.md` (dated in `Asia/Ho_Chi_Minh`).

No API key required — the Hacker News API is public.

## Run it

```bash
node generate.js                        # Generate today's digest
node generate.js --date 2026-06-30      # Override the date
node generate.js --top 50 --keep 15     # Fetch 50, keep top 15
node generate.js --dry-run              # Print to stdout, don't write file
```

Requires **Node.js 18+** (uses the built-in `fetch`). No dependencies to install.

### Error handling
- **HN API unreachable** → logs a clear error and exits with code `1`.
- **A single story fetch fails** (404, network blip) → skips that story and continues.
- **Fewer than 3 stories pass the filter** → logs a warning but still saves the file.

## Output

Each digest looks like this:

```markdown
# 🗞️ Daily Tech Digest — 2026-06-21

> Top 10 stories from Hacker News · Generated 17:24 ICT

---

1. Linux eliminates the strncpy API after six years of work, 360 patches

⬆️ 209 points · 💬 185 comments · 👤 simonpure

A link to phoronix.com titled "Linux eliminates the strncpy API after six years
of work, 360 patches", a popular story on the front page.

[Read on HN](https://news.ycombinator.com/item?id=48612943) · [Source](https://www.phoronix.com/news/Linux-7.2-Drops-strncpy)

...

*daily-tech-digest · MileFisher · 2026-06-21T10:24:25.980Z*
```

> Files in `output/` are generated — don't edit them by hand.

## Screenshots

<!-- Replace with actual screenshots after GitHub Pages is live -->
Screenshots will be added in `screenshots/` once the Pages site is deployed.

## GitHub Pages

The project deploys a static page via GitHub Actions. The workflow:
1. Runs daily at 9 AM ICT (cron)
2. Generates the digest
3. Copies it to `docs/digest-latest.md`
4. Commits and pushes

GitHub Pages serves from the `docs/` folder on `main`.

## Claude Code setup

This project is built to be driven from Claude Code, using:

- **MCP — `filesystem`** (`@modelcontextprotocol/server-filesystem`, scoped to the
  project root): lets Claude read and write project files. Configured in `.mcp.json`.
- **Skill — `digest-format`** (`.claude/skills/digest-format/SKILL.md`): defines the
  digest's structure, tone, file naming, and markdown rules.
- **Agent — `content-filter`** (`.claude/agents/content-filter.md`): the filtering
  rules (story type, prefix and score thresholds, top-10 selection) that
  `generate.js` implements.

## License

[MIT](LICENSE)
