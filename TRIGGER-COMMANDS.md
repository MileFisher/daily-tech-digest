# Trigger + Commands

## 1. `digest-format` Skill

| | |
|---|---|
| **Trigger** | When generating or formatting the daily digest output file, or when asked to preview how a story will look in the final markdown. |
| **Command** | In Claude Code, invoke by name: `/digest-format`<br>Or with context: `/digest-format Preview the format for this story: $TITLE` |

### What it does
Loads the formatting rules from `.claude/skills/digest-format/SKILL.md`: markdown structure (header, source tags, entries, footer), tone rules (neutral, factual, no hype), Burmese translation rules, and edge cases (missing URL, zero comments).

---

## 2. `content-filter` Subagent

| | |
|---|---|
| **Trigger** | After raw story objects are fetched from Hacker News and Lobsters APIs, before formatting the digest. Cleans and ranks the combined story list. |
| **Command** | In Claude Code, the agent activates automatically when Claude reads `.claude/agents/content-filter.md`.<br>Explicit invocation: use `@content-filter` in a prompt, or call via the Agent tool with the story array as input. |

### What it does
Applies filtering rules in order:
1. Remove non-story types
2. Strip Ask/Tell/Show-without-URL/Who-is-hiring posts
3. Enforce per-source score floors (HN ≥ 50, Lobsters ≥ 15)
4. Drop entries with no URL
5. Sort by score descending per source
6. Reserve fixed slots (default: 7 HN + 3 Lobsters) and merge

Returns a clean JSON array — no explanation, just data.

---

## 3. `generate.js` — Main Pipeline

| | |
|---|---|
| **Trigger** | Daily cron, or manual generation of the tech digest. |
| **Command** | `node generate.js`<br>`node generate.js --date 2026-07-24`<br>`node generate.js --top 50 --keep 15`<br>`node generate.js --no-translate`<br>`node generate.js --dry-run` |

### What it does
Orchestrates the full pipeline: parse args → fetch HN + Lobsters → normalize → **content-filter agent** filters → **digest-format skill** formats → translate (optional) → write output files.

---

## 4. Archive Pruning

| | |
|---|---|
| **Trigger** | After each digest generation, to keep the archive at 30 days. |
| **Command** | `node scripts/prune-archive.js` |

### What it does
Trims `docs/archive/` to the last 30 days and rebuilds `docs/archive/index.json` for the archive dropdown on the live site.
