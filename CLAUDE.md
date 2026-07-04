# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Fetches top stories from Hacker News and Lobsters, filters noise (Ask/Tell/low-score/Show HN without URL), reserves fixed slots per source (default 7 HN + 3 Lobsters out of a `--keep` total of 10), formats a ranked markdown digest in English, translates it to Burmese via a free translation API, and writes both to `output/digest-YYYY-MM-DD.md` (+ `.my.md`). Timezone is hardcoded to `Asia/Ho_Chi_Minh` (ICT). Fetch count, keep count, per-source slot counts, output date, translation, and dry-run mode are all configurable via CLI flags.

## Commands

```bash
node generate.js                                # Generate today's digest (EN + MY)
node generate.js --date 2026-06-30              # Override the date in filename/header
node generate.js --top 50 --keep 15             # Fetch 50 HN stories, keep top 15 total
node generate.js --hn-keep 8 --lobsters-keep 2  # Explicit per-source slot counts
node generate.js --no-translate                 # Skip Burmese translation
node generate.js --dry-run                      # Print to stdout instead of writing file
node scripts/prune-archive.js                   # Trim docs/archive/ to last 30 days, rebuild index.json
```

All flags can be combined. Requires Node 18+ for built-in `fetch`.

There are no tests, no build step, no lint step, and no external npm dependencies (translation and Lobsters both use plain `fetch` against free public APIs — no API keys, no client libraries). The `package.json` test script is a stub.

## Architecture

This is a two-file project: `generate.js` (main pipeline) and `scripts/prune-archive.js` (archive maintenance, invoked by the workflow). Everything in `generate.js` runs in one `main()` call:

1. **Parse args** — `parseArgs()` reads CLI flags (`--date`, `--top`, `--keep`, `--hn-keep`, `--lobsters-keep`, `--no-translate`, `--dry-run`) with validation. `--hn-keep`/`--lobsters-keep` default to a 70/30 split of `--keep` when not given explicitly.
2. **Fetch** — `fetchHnStories()` pulls top N story IDs from the HN Firebase API and fetches each in parallel (individual failures return `null` and are skipped, non-fatal). `fetchLobstersStories()` pulls the whole `hottest.json` list in one call (a total failure here is also non-fatal — the digest falls back to HN-only). Both run concurrently via `Promise.all`.
3. **Normalize** — `normalizeStory()` maps each source's raw shape onto a common one: `{ source, type, title, url, score, by, descendants, permalink }`.
4. **Filter + merge** — `filterStories()` applies the same rules as `.claude/agents/content-filter.md` (story type only, drop Ask/Tell/Who-is-hiring prefixes, Show HN needs URL + score ≥ 100, must have URL, sort by score), run separately per source with a **per-source score floor** (`SCORE_FLOOR = { hn: 50, lobsters: 15 }` — Lobsters' scoring scale runs much lower than HN's). `mergeStories()` then reserves fixed slots per source rather than sorting globally, since a shared sort would starve Lobsters out entirely.
5. **Translate** (optional) — `translateDigest()` calls MyMemory (`api.mymemory.translated.net`, free, no key) once per story title + summary, with an in-run cache and a fail-soft fallback to the original English text. Skipped entirely with `--no-translate`.
6. **Format** — `formatDigest()` builds markdown following `.claude/skills/digest-format/SKILL.md`: H1 title (localized for Burmese), subtitle with count + time, horizontal rule, ranked entries tagged with a source icon (`🔶 Hacker News` / `🦞 Lobsters`), score/comments/author metadata, a contextual summary, and a `[Discuss]` link using each story's own permalink (not a hardcoded HN URL). Footer has an ISO timestamp, unchanged across languages.
7. **Write** — saves `output/digest-YYYY-MM-DD.md` and (unless `--no-translate`) `output/digest-YYYY-MM-DD.my.md`, or prints both to stdout if `--dry-run`.

The `summarize()` function generates a templated sentence from the story's domain, title, score, and comment count — it is not AI-generated. Only `summarize()`'s output and the story title are ever translated; score, comments, author, links, and the footer timestamp are never translated.

## Key Defaults (generate.js)

- `HN_BASE` — `https://hacker-news.firebaseio.com/v0`
- `LOBSTERS_BASE` — `https://lobste.rs`
- `MYMEMORY_BASE` — `https://api.mymemory.translated.net/get`
- `TIMEZONE` — `Asia/Ho_Chi_Minh`
- `DEFAULT_TOP_N_FETCH` — 30 (overridable with `--top`, HN only)
- `DEFAULT_TOP_N_KEEP` — 10 (overridable with `--keep`)
- `HN_SHARE` — 0.7 (default fraction of `--keep` reserved for HN when `--hn-keep`/`--lobsters-keep` aren't given)
- `SCORE_FLOOR` — `{ hn: 50, lobsters: 15 }`

## Claude Code Configuration

- **MCP server**: `filesystem` via `.mcp.json` (scoped to project root)
- **Skill**: `.claude/skills/digest-format/SKILL.md` — defines the output format (including the `.my.md` variant and source tags), tone (neutral, factual, no hype), and edge cases
- **Agent**: `.claude/agents/content-filter.md` — defines the two-source filtering rules and reserved-slot merge as a standalone agent spec

## GitHub Pages

- `docs/index.html` — single-page static site that renders the digest using marked.js (CDN); has a language toggle (EN/MY, translates content only — not UI chrome) and an archive `<select>` populated from `docs/archive/index.json`
- `docs/digest-latest.md` / `docs/digest-latest.my.md` — copies of today's digest in each language, updated by GitHub Actions
- `docs/archive/YYYY-MM-DD.md` / `.my.md` — rolling 30-day history, pruned by `scripts/prune-archive.js`
- `docs/archive/index.json` — manifest of archived dates, rebuilt by `scripts/prune-archive.js` on every run
- `.github/workflows/daily-digest.yml` — cron at 02:00 UTC (09:00 ICT), generates digest, copies to `docs/` + `docs/archive/`, prunes, commits, deploys to Pages
- Pages serves from `docs/` on `main` branch

## Rules

- No API keys in code — HN, Lobsters, and MyMemory (free tier) all require none. Use `process.env` if ever needed.
- Output files in `output/` are generated — never edit them manually.
- `docs/digest-latest*.md` and `docs/archive/**` are generated by the workflow/prune script — never edit manually.
- `generate.js` mirrors the skill and agent definitions. If you change filtering/merge rules, update both `filterStories()`/`mergeStories()` and `content-filter.md`. If you change the output format, update both `formatDigest()` and `SKILL.md`.
- Never translate score, comment count, author handle, links, or the footer timestamp — only titles and summaries.

## Git commit conventions
Never add a `Co-Authored-By: Claude` trailer or "Generated with Claude Code" line to commit messages.
