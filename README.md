# 🗞️ daily-tech-digest

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Fetches top tech stories from Hacker News and Lobsters, filters out the noise, and writes
a clean markdown digest — in English and Burmese — to `output/digest-YYYY-MM-DD.md`.

**→ [Live Digest](https://milefisher.github.io/daily-tech-digest/)** (auto-updates daily at 9 AM ICT, with language and archive selectors)

## What it does

1. Fetches the top 30 story IDs from the Hacker News API, plus the current Lobsters "hottest" list.
2. Fetches each HN story's details in parallel; Lobsters returns full details in one call.
3. Filters both sources (dropping low-score posts, Ask/Tell/Show HN threads, hiring
   posts, and items without a link), then **reserves fixed slots per source**
   (default: 7 from Hacker News, 3 from Lobsters) so Lobsters — which scores on
   a much smaller scale — isn't crowded out by a global sort.
4. Formats the survivors as a ranked markdown digest, tagged with a source icon.
5. Translates the digest to Burmese via the free MyMemory API (skippable with `--no-translate`).
6. Saves both to `output/digest-YYYY-MM-DD.md` and `output/digest-YYYY-MM-DD.my.md` (dated in `Asia/Ho_Chi_Minh`).

No API key required — Hacker News, Lobsters, and MyMemory (free tier) are all public.

## Run it

```bash
node generate.js                                # Generate today's digest (EN + MY)
node generate.js --date 2026-06-30              # Override the date
node generate.js --top 50 --keep 15             # Fetch 50 HN stories, keep top 15 total
node generate.js --hn-keep 8 --lobsters-keep 2  # Explicit per-source slot counts
node generate.js --no-translate                 # Skip Burmese translation
node generate.js --dry-run                      # Print to stdout, don't write file
```

Requires **Node.js 18+** (uses the built-in `fetch`). No dependencies to install.

### Error handling
- **HN API unreachable** → logs a clear error and exits with code `1`.
- **Lobsters unreachable** → non-fatal; the digest falls back to Hacker News only.
- **A single story fetch fails** (404, network blip) → skips that story and continues.
- **A translation call fails** → falls back to the original English text for that entry.
- **Fewer than 3 stories pass the filter** → logs a warning but still saves the file.

## Output

Each digest looks like this:

```markdown
# 🗞️ Daily Tech Digest — 2026-07-05

> Top 10 stories from Hacker News & Lobsters · Generated 01:36 ICT

---

1. The bottleneck might be the air in the room

🔶 Hacker News · ⬆️ 672 points · 💬 372 comments · 👤 gslin

A link to blog.mikebowler.ca titled "The bottleneck might be the air in the room",
one of the highest-scoring stories on the front page, with an active discussion thread.

[Discuss](https://news.ycombinator.com/item?id=48783117) · [Source](https://blog.mikebowler.ca/2026/07/03/co2-and-decision-making/)

...

8. Clickhouse is winning the Observability Wars

🦞 Lobsters · ⬆️ 73 points · 💬 27 comments · 👤 siddhartha_golu

A link to matduggan.com titled "Clickhouse is winning the Observability Wars".

[Discuss](https://lobste.rs/s/asi79o) · [Source](https://matduggan.com/clickhouse-is-winning-the-observability-wars/)

...

*daily-tech-digest · MileFisher · 2026-07-04T18:36:19.209Z*
```

The Burmese version (`digest-YYYY-MM-DD.my.md`) translates only the title and
summary of each story — score, comments, author, links, and the footer
timestamp are never translated.

> Files in `output/` are generated — don't edit them by hand.

## Screenshots

<!-- Replace with actual screenshots after GitHub Pages is live -->
Screenshots will be added in `screenshots/` once the Pages site is deployed.

## GitHub Pages

The project deploys a static page via GitHub Actions. The workflow:
1. Runs daily at 9 AM ICT (cron)
2. Generates the digest (English + Burmese)
3. Copies both to `docs/digest-latest.md` / `.my.md` and archives them under `docs/archive/`
4. Prunes the archive to the last 30 days and rebuilds `docs/archive/index.json`
5. Commits, pushes, and deploys to Pages

The site itself (`docs/index.html`) has:
- A **language toggle** (EN/MY) that translates the digest content only, not the site UI
- An **archive picker** for browsing the last 30 days of digests
- A dark/light theme toggle

GitHub Pages serves from the `docs/` folder on `main`.

## Claude Code setup

This project is built to be driven from Claude Code, using:

- **MCP — `filesystem`** (`@modelcontextprotocol/server-filesystem`, scoped to the
  project root): lets Claude read and write project files. Configured in `.mcp.json`.
- **Skill — `digest-format`** (`.claude/skills/digest-format/SKILL.md`): defines the
  digest's structure, tone, file naming, source tags, and Burmese translation rules.
- **Agent — `content-filter`** (`.claude/agents/content-filter.md`): the two-source
  filtering rules (story type, prefix and score thresholds, per-source reserved
  slots) that `generate.js` implements.

## License

[MIT](LICENSE)
