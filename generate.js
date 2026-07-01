// daily-tech-digest — fetches top Hacker News stories, filters noise,
// formats a clean markdown digest, and writes it to output/digest-YYYY-MM-DD.md
//
// Run with: node generate.js   (requires Node 18+ for built-in fetch)
// No API keys, no external dependencies.
//
// Options:
//   --date YYYY-MM-DD   Override the date in the output filename/header
//   --top N             Number of story IDs to fetch from the API (default: 30)
//   --keep N            Number of stories to keep after filtering (default: 10)
//   --dry-run           Print the digest to stdout instead of writing to file

const fs = require('fs');
const path = require('path');

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_TOP_N_FETCH = 30; // story IDs to pull from the topstories endpoint
const DEFAULT_TOP_N_KEEP = 10; // stories to keep after filtering

// --- CLI argument parsing ----------------------------------------------------
// Usage: node generate.js [--date YYYY-MM-DD] [--top N] [--keep N] [--dry-run]

function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    date: null,      // null = use today
    top: DEFAULT_TOP_N_FETCH,
    keep: DEFAULT_TOP_N_KEEP,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--date':
        opts.date = argv[++i];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
          console.error('❌ --date must be in YYYY-MM-DD format');
          process.exit(1);
        }
        break;
      case '--top':
        opts.top = parseInt(argv[++i], 10);
        if (isNaN(opts.top) || opts.top < 1) {
          console.error('❌ --top must be a positive integer');
          process.exit(1);
        }
        break;
      case '--keep':
        opts.keep = parseInt(argv[++i], 10);
        if (isNaN(opts.keep) || opts.keep < 1) {
          console.error('❌ --keep must be a positive integer');
          process.exit(1);
        }
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      default:
        console.error(`❌ Unknown option: ${argv[i]}`);
        console.error('Usage: node generate.js [--date YYYY-MM-DD] [--top N] [--keep N] [--dry-run]');
        process.exit(1);
    }
  }

  return opts;
}

// --- HN fetch helpers --------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json();
}

async function fetchTopStoryIds(limit) {
  let ids;
  try {
    ids = await getJson(`${HN_BASE}/topstories.json`);
  } catch (err) {
    // Network failure, DNS error, or non-2xx from the topstories endpoint:
    // we have nothing to work with, so this is fatal.
    throw new Error(`Hacker News API is unreachable: ${err.message}`);
  }
  if (!Array.isArray(ids)) {
    throw new Error('Hacker News API returned an unexpected response (no story IDs)');
  }
  return ids.slice(0, limit);
}

// Fetch one story, but never throw: a single failed item (404, dead entry,
// transient network blip) should not abort the whole digest. Returns null on
// failure so the caller can skip it.
async function fetchStory(id) {
  try {
    return await getJson(`${HN_BASE}/item/${id}.json`);
  } catch (err) {
    console.warn(`⚠️  Skipping story ${id}: ${err.message}`);
    return null;
  }
}

// --- content-filter agent logic ---------------------------------------------
// Mirrors .claude/agents/content-filter.md, applied IN ORDER.

function filterStories(stories, keep = DEFAULT_TOP_N_KEEP) {
  return stories
    .filter((s) => s && s.type === 'story') // 1. only real stories
    .filter((s) => {
      // 2. drop Ask/Tell/Who-is-hiring/Show prefixes
      const title = (s.title || '').trim();
      if (/^Ask HN:/i.test(title)) return false;
      if (/^Tell HN:/i.test(title)) return false;
      if (/who is hiring/i.test(title)) return false;
      if (/^Show HN:/i.test(title)) {
        // keep Show HN only with a working URL and score >= 100
        return Boolean(s.url) && (s.score || 0) >= 100;
      }
      return true;
    })
    .filter((s) => (s.score || 0) >= 50) // 3. score floor
    .filter((s) => s.url != null) // 4. must have a URL
    .sort((a, b) => (b.score || 0) - (a.score || 0)) // 5. top N by score
    .slice(0, keep);
}

// --- digest-format skill -----------------------------------------------------
// Mirrors .claude/skills/digest-format/SKILL.md.

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// One neutral, factual sentence built from the data we have. No hype words.
function summarize(story) {
  const host = hostnameOf(story.url);
  const score = story.score || 0;
  const comments = story.descendants || 0;

  const parts = [];

  if (host) {
    parts.push(`A link to ${host} titled "${story.title}"`);
  } else {
    parts.push(`A discussion titled "${story.title}"`);
  }

  // Add score context for notably popular stories
  if (score >= 500) {
    parts.push('one of the highest-scoring stories on the front page');
  } else if (score >= 200) {
    parts.push('a popular story on the front page');
  }

  // Add comment context for active discussions
  if (comments >= 300) {
    parts.push('with an active discussion thread');
  } else if (comments >= 100) {
    parts.push('drawing significant discussion');
  }

  return parts.join(', ') + '.';
}

function formatComments(descendants) {
  if (!descendants) return 'no comments yet';
  return `💬 ${descendants} comments`;
}

function formatStory(story, rank) {
  const lines = [];
  lines.push(`${rank}. ${story.title}`);
  lines.push('');

  const meta = [
    `⬆️ ${story.score || 0} points`,
    formatComments(story.descendants),
    `👤 ${story.by}`,
  ].join(' · ');
  lines.push(meta);
  lines.push('');

  lines.push(summarize(story));
  lines.push('');

  const hnLink = `[Read on HN](https://news.ycombinator.com/item?id=${story.id})`;
  if (story.url) {
    lines.push(`${hnLink} · [Source](${story.url})`);
  } else {
    lines.push(hnLink); // omit Source for text posts
  }

  return lines.join('\n');
}

function formatDigest(stories, parts) {
  const header = `# 🗞️ Daily Tech Digest — ${parts.date}`;
  const subtitle = `> Top ${stories.length} stories from Hacker News · Generated ${parts.time} ICT`;
  const body = stories.map((s, i) => formatStory(s, i + 1)).join('\n\n');
  const footer = `*daily-tech-digest · MileFisher · ${parts.iso}*`;

  return [header, '', subtitle, '', '---', '', body, '', footer, ''].join('\n');
}

// --- date helpers (Asia/Ho_Chi_Minh) ----------------------------------------

function dateParts(dateOverride = null) {
  const now = new Date();

  // If a date override is provided, use it directly for the date field
  // but still use the real time for the generation timestamp
  if (dateOverride) {
    const timeFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return {
      date: dateOverride,
      time: timeFmt.format(now),
      iso: now.toISOString(),
    };
  }

  // YYYY-MM-DD and HH:MM in ICT, plus an ISO timestamp.
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    date: dateFmt.format(now), // en-CA gives YYYY-MM-DD
    time: timeFmt.format(now), // HH:MM
    iso: now.toISOString(),
  };
}

// --- main --------------------------------------------------------------------

async function main() {
  const opts = parseArgs();
  const ids = await fetchTopStoryIds(opts.top);

  // Fetch all stories in parallel; failed fetches resolve to null and are dropped.
  const fetched = await Promise.all(ids.map(fetchStory));
  const stories = fetched.filter(Boolean);
  const skipped = fetched.length - stories.length;
  if (skipped > 0) {
    console.warn(`⚠️  ${skipped} of ${fetched.length} story fetches failed and were skipped.`);
  }

  const filtered = filterStories(stories, opts.keep);

  if (filtered.length < 3) {
    console.warn(
      `⚠️  Only ${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'} passed the filter (expected at least 3); saving anyway.`
    );
  }

  const parts = dateParts(opts.date);
  const markdown = formatDigest(filtered, parts);

  if (opts.dryRun) {
    process.stdout.write(markdown);
    return;
  }

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `digest-${parts.date}.md`);
  fs.writeFileSync(outPath, markdown, 'utf8');

  console.log(
    `✅ Digest generated: ${filtered.length} stories saved to ${outPath}`
  );
}

main().catch((err) => {
  console.error('❌ Failed to generate digest:', err.message);
  process.exit(1);
});
