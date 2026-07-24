---
marp: true
paginate: true
transition: fade
---

<!-- slide 1 -->
# 🗞️ daily-tech-digest
## Tech Stack & Architecture

A CLI tool that fetches top tech stories from Hacker News + Lobsters,
filters noise, and produces a clean bilingual markdown digest — daily.

**Author:** MileFisher  
**Repo:** github.com/MileFisher/daily-tech-digest

---

<!-- slide 2 -->
# Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 18+ (vanilla, zero npm deps) |
| **APIs** | Hacker News Firebase API · Lobsters JSON API |
| **Translation** | MyMemory free tier (no API key) |
| **Hosting** | GitHub Pages (from `docs/` on `main`) |
| **CI/CD** | GitHub Actions (cron at 02:00 UTC) |
| **AI Assistant** | Claude Code |

All external APIs are public and keyless.

---

<!-- slide 3 -->
# Subagent — `content-filter`

**File:** `.claude/agents/content-filter.md`

A standalone filtering agent that cleans raw story data before formatting:

1. Drops non-story types
2. Strips Ask HN, Tell HN, Show HN (unless it has a URL + score ≥ 100)
3. Enforces per-source score floors (HN ≥ 50, Lobsters ≥ 15)
4. Removes stories with no URL
5. Sorts by score descending per source
6. Reserves fixed slots (default: 7 HN + 3 Lobsters)

Returns a clean JSON array — no commentary, just data.

---

<!-- slide 4 -->
# Skill — `digest-format`

**File:** `.claude/skills/digest-format/SKILL.md`

A Claude Code skill that enforces the output format:

- **Structure:** H1 header → subtitle → separator → ranked entries → footer
- **Source tags:** `🔶 Hacker News` / `🦞 Lobsters`
- **Tone:** Neutral, factual, no hype — one sentence per story
- **Bilingual:** English + Burmese (`.my.md`), with strict rules on what *not* to translate
- **Edge cases:** Missing URL, zero comments, failed translation fallback

Loaded via `/digest-format` in Claude Code.

---

<!-- slide 5 -->
# Methodology

The pipeline runs as a single `main()` call — no framework, no build step:

```
CLI args → Fetch HN + Lobsters (parallel)
         → Normalize to common shape
         → content-filter agent (per-source rules + reserved slots)
         → digest-format skill (markdown structure)
         → Translate titles + summaries (EN → MY)
         → Write output/digest-*.md
```

**Design principles:**
- Zero external npm dependencies
- Fail-soft: a source going down → digest still works with remaining data
- Generated files are never edited manually
- Filter rules, format rules, and code stay in sync (CLAUDE.md enforces this)

---

<!-- slide 6 -->
# Triggers & Commands

| Trigger | When | Command |
|---|---|---|
| **Daily cron** | 02:00 UTC (09:00 ICT) | GitHub Actions — auto |
| **Manual run** | Any time | `node generate.js` |
| **Custom date** | Backfill | `node generate.js --date 2026-06-30` |
| **More stories** | Tune volume | `node generate.js --top 50 --keep 15` |
| **Per-source slots** | Tune mix | `node generate.js --hn-keep 8 --lobsters-keep 2` |
| **Dry run** | Preview | `node generate.js --dry-run` |
| **Skip translation** | English only | `node generate.js --no-translate` |
| **Archive pruning** | After digest | `node scripts/prune-archive.js` |
| **Skill invoke** | In Claude Code | `/digest-format` |
| **Agent invoke** | In Claude Code | Agent tool with story data |

---

<!-- slide 7 -->
# Architecture Diagram

```
┌──────────────┐     ┌──────────────┐
│  Hacker News  │     │   Lobsters   │
│  Firebase API │     │  JSON API    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
┌──────────────────────────────┐
│     normalizeStory()         │
│  (common {source,type,...}   │
│   shape for both sources)    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  content-filter Subagent     │
│  (per-source rules + slots)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  formatDigest()              │
│  (digest-format Skill rules) │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  translateDigest()           │
│  (MyMemory API, fail-soft)   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  output/digest-*.md          │
│  docs/ (Pages deploy)        │
└──────────────────────────────┘
```
