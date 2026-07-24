# AI Tools & Workflow Pieces

| # | Tool | What it does for the project |
|---|---|---|
| 1 | **Claude Code** | The primary AI coding assistant. Used to develop, debug, refactor, and maintain the entire project — code generation, file editing, script execution, and git operations. |
| 2 | **content-filter Subagent** | A reusable subagent (`.claude/agents/content-filter.md`) that takes raw story objects from HN + Lobsters, applies filtering rules (drop Ask/Tell/Show without URL, enforce score floors, reserve fixed per-source slots), and returns a clean merged JSON array. |
| 3 | **digest-format Skill** | A Claude Code skill (`.claude/skills/digest-format/SKILL.md`) that enforces the digest output format — markdown structure, source tags, tone rules, header/footer, and Burmese-translation edge cases. |
| 4 | **GitHub Actions** | CI/CD automation (`.github/workflows/daily-digest.yml`) — cron-triggered at 02:00 UTC, generates the digest, commits outputs, prunes the archive, and deploys to GitHub Pages. |
| 5 | **MyMemory Translation API** | Free-tier AI translation service (`api.mymemory.translated.net`) that translates story titles and summaries from English to Burmese with zero config and no API key. |
