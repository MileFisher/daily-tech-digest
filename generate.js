// daily-tech-digest — fetches top stories from Hacker News and Lobsters, filters
// noise, formats a clean markdown digest (English + Burmese), and writes it to
// output/digest-YYYY-MM-DD.md (+ .my.md).
//
// Run with: node generate.js   (requires Node 18+ for built-in fetch)
// No API keys, no external dependencies.
//
// Options:
//   --date YYYY-MM-DD    Override the date in the output filename/header
//   --top N              Number of story IDs to fetch from HN (default: 30)
//   --keep N             Total stories to keep after filtering (default: 10)
//   --hn-keep N          Stories reserved for Hacker News (default: 70% of --keep)
//   --lobsters-keep N    Stories reserved for Lobsters (default: 30% of --keep)
//   --no-translate       Skip Burmese translation (English digest only)
//   --dry-run            Print the digest to stdout instead of writing to file

const fs = require('fs');
const path = require('path');

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';
const LOBSTERS_BASE = 'https://lobste.rs';
const MYMEMORY_BASE = 'https://api.mymemory.translated.net/get';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_TOP_N_FETCH = 30; // HN story IDs to pull from the topstories endpoint
const DEFAULT_TOP_N_KEEP = 10; // total stories to keep after filtering
const HN_SHARE = 0.7; // default split of --keep reserved for Hacker News

// Score floors differ per source: Lobsters is a much smaller community with a
// different scoring scale (single/low-double digits vs HN's hundreds), so a
// shared floor would starve Lobsters out of its reserved slots entirely.
const SCORE_FLOOR = { hn: 50, lobsters: 15 };

// --- CLI argument parsing ----------------------------------------------------
// Usage: node generate.js [--date YYYY-MM-DD] [--top N] [--keep N]
//                         [--hn-keep N] [--lobsters-keep N] [--no-translate] [--dry-run]

function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    date: null,      // null = use today
    top: DEFAULT_TOP_N_FETCH,
    keep: DEFAULT_TOP_N_KEEP,
    hnKeep: null,      // null = derive from --keep
    lobstersKeep: null, // null = derive from --keep
    translate: true,
    dryRun: false,
  };

  function parsePositiveInt(flag, value) {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 1) {
      console.error(`❌ ${flag} must be a positive integer`);
      process.exit(1);
    }
    return n;
  }

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
        opts.top = parsePositiveInt('--top', argv[++i]);
        break;
      case '--keep':
        opts.keep = parsePositiveInt('--keep', argv[++i]);
        break;
      case '--hn-keep':
        opts.hnKeep = parsePositiveInt('--hn-keep', argv[++i]);
        break;
      case '--lobsters-keep':
        opts.lobstersKeep = parsePositiveInt('--lobsters-keep', argv[++i]);
        break;
      case '--no-translate':
        opts.translate = false;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      default:
        console.error(`❌ Unknown option: ${argv[i]}`);
        console.error(
          'Usage: node generate.js [--date YYYY-MM-DD] [--top N] [--keep N] [--hn-keep N] [--lobsters-keep N] [--no-translate] [--dry-run]'
        );
        process.exit(1);
    }
  }

  // Derive per-source slot counts from --keep if not explicitly set.
  if (opts.hnKeep == null) {
    opts.hnKeep = Math.max(1, Math.round(opts.keep * HN_SHARE));
  }
  if (opts.lobstersKeep == null) {
    opts.lobstersKeep = Math.max(0, opts.keep - opts.hnKeep);
  }

  return opts;
}

// --- fetch helpers ------------------------------------------------------------

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

// Fetch one HN story, but never throw: a single failed item (404, dead entry,
// transient network blip) should not abort the whole digest. Returns null on
// failure so the caller can skip it.
async function fetchHnStory(id) {
  try {
    return await getJson(`${HN_BASE}/item/${id}.json`);
  } catch (err) {
    console.warn(`⚠️  Skipping HN story ${id}: ${err.message}`);
    return null;
  }
}

async function fetchHnStories(limit) {
  const ids = await fetchTopStoryIds(limit);
  const fetched = await Promise.all(ids.map(fetchHnStory));
  const stories = fetched.filter(Boolean);
  const skipped = fetched.length - stories.length;
  if (skipped > 0) {
    console.warn(`⚠️  ${skipped} of ${fetched.length} HN story fetches failed and were skipped.`);
  }
  return stories.map((s) => normalizeStory(s, 'hn'));
}

// Lobsters serves the whole hottest list in one call, so a single-source
// failure here is non-fatal: the digest falls back to HN-only.
async function fetchLobstersStories() {
  try {
    const raw = await getJson(`${LOBSTERS_BASE}/hottest.json`);
    if (!Array.isArray(raw)) {
      throw new Error('unexpected response shape (no story array)');
    }
    return raw.map((s) => normalizeStory(s, 'lobsters'));
  } catch (err) {
    console.warn(`⚠️  Lobsters unreachable, continuing with Hacker News only: ${err.message}`);
    return [];
  }
}

// --- story normalization -------------------------------------------------------
// HN and Lobsters return different shapes; downstream code (filter, format)
// only ever sees this common shape.

function normalizeStory(raw, source) {
  if (source === 'hn') {
    return {
      source: 'hn',
      type: raw.type,
      title: raw.title,
      url: raw.url,
      score: raw.score,
      by: raw.by,
      descendants: raw.descendants,
      permalink: `https://news.ycombinator.com/item?id=${raw.id}`,
    };
  }
  // source === 'lobsters'
  return {
    source: 'lobsters',
    type: 'story', // Lobsters' hottest.json only ever contains stories
    title: raw.title,
    url: raw.url || null,
    score: raw.score,
    by: raw.submitter_user,
    descendants: raw.comment_count,
    permalink: raw.short_id_url || raw.comments_url,
  };
}

// --- content-filter agent logic ---------------------------------------------
// Mirrors .claude/agents/content-filter.md, applied IN ORDER, per source.

function filterStories(stories) {
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
    .filter((s) => (s.score || 0) >= (SCORE_FLOOR[s.source] ?? 50)) // 3. score floor (per-source)
    .filter((s) => s.url != null) // 4. must have a URL
    .sort((a, b) => (b.score || 0) - (a.score || 0)); // 5. sort by score, descending
}

// Reserves fixed slots per source (HN scores run much higher than Lobsters',
// so a single global sort would starve Lobsters out of the digest entirely).
function mergeStories(hnStories, lobstersStories, hnKeep, lobstersKeep) {
  const hn = filterStories(hnStories).slice(0, hnKeep);
  const lobsters = filterStories(lobstersStories).slice(0, lobstersKeep);
  return [...hn, ...lobsters].sort((a, b) => (b.score || 0) - (a.score || 0));
}

// --- translation (MyMemory, free, no API key) ---------------------------------

const translationCache = new Map();

async function translateToBurmese(text) {
  if (!text) return text;
  if (translationCache.has(text)) return translationCache.get(text);

  try {
    const url = `${MYMEMORY_BASE}?q=${encodeURIComponent(text)}&langpair=en|my`;
    const data = await getJson(url);
    const translated = data?.responseData?.translatedText;
    const result = translated || text;
    translationCache.set(text, result);
    return result;
  } catch (err) {
    console.warn(`⚠️  Translation failed for "${text.slice(0, 40)}...": ${err.message}`);
    translationCache.set(text, text); // fall back to English, don't retry
    return text;
  }
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

function sourceLabel(source) {
  return source === 'lobsters' ? '🦞 Lobsters' : '🔶 Hacker News';
}

function formatComments(descendants) {
  if (!descendants) return 'no comments yet';
  return `💬 ${descendants} comments`;
}

function formatStory(story, rank, translatedTitle = null, translatedSummary = null) {
  const lines = [];
  lines.push(`${rank}. ${translatedTitle || story.title}`);
  lines.push('');

  const meta = [
    sourceLabel(story.source),
    `⬆️ ${story.score || 0} points`,
    formatComments(story.descendants),
    `👤 ${story.by}`,
  ].join(' · ');
  lines.push(meta);
  lines.push('');

  lines.push(translatedSummary || summarize(story));
  lines.push('');

  const discussionLink = `[Discuss](${story.permalink})`;
  if (story.url) {
    lines.push(`${discussionLink} · [Source](${story.url})`);
  } else {
    lines.push(discussionLink); // omit Source for text posts
  }

  return lines.join('\n');
}

function formatDigest(stories, parts, options = {}) {
  const { language = 'en', translations = null } = options;

  const title = language === 'my' ? 'နေ့စဉ် နည်းပညာသတင်းများ' : 'Daily Tech Digest';
  const subtitleText =
    language === 'my'
      ? `Hacker News နှင့် Lobsters မှ ထိပ်တန်း ${stories.length} ခု · ${parts.time} ICT တွင် ထုတ်လုပ်ခဲ့သည်`
      : `Top ${stories.length} stories from Hacker News & Lobsters · Generated ${parts.time} ICT`;

  const header = `# 🗞️ ${title} — ${parts.date}`;
  const subtitle = `> ${subtitleText}`;
  const body = stories
    .map((s, i) => {
      const t = translations ? translations[i] : null;
      return formatStory(s, i + 1, t?.title, t?.summary);
    })
    .join('\n\n');
  const footer = `*daily-tech-digest · MileFisher · ${parts.iso}*`;

  return [header, '', subtitle, '', '---', '', body, '', footer, ''].join('\n');
}

async function translateDigest(stories) {
  const translations = [];
  for (const story of stories) {
    const title = await translateToBurmese(story.title);
    const summary = await translateToBurmese(summarize(story));
    translations.push({ title, summary });
  }
  return translations;
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

  const [hnStories, lobstersStories] = await Promise.all([
    fetchHnStories(opts.top),
    fetchLobstersStories(),
  ]);

  const merged = mergeStories(hnStories, lobstersStories, opts.hnKeep, opts.lobstersKeep);

  if (merged.length < 3) {
    console.warn(
      `⚠️  Only ${merged.length} stor${merged.length === 1 ? 'y' : 'ies'} passed the filter (expected at least 3); saving anyway.`
    );
  }

  const parts = dateParts(opts.date);
  const markdownEn = formatDigest(merged, parts, { language: 'en' });

  let markdownMy = null;
  if (opts.translate) {
    const translations = await translateDigest(merged);
    markdownMy = formatDigest(merged, parts, { language: 'my', translations });
  }

  if (opts.dryRun) {
    process.stdout.write(markdownEn);
    if (markdownMy) {
      process.stdout.write('\n\n===== Burmese (.my.md) =====\n\n');
      process.stdout.write(markdownMy);
    }
    return;
  }

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `digest-${parts.date}.md`);
  fs.writeFileSync(outPath, markdownEn, 'utf8');
  console.log(`✅ Digest generated: ${merged.length} stories saved to ${outPath}`);

  if (markdownMy) {
    const outPathMy = path.join(outDir, `digest-${parts.date}.my.md`);
    fs.writeFileSync(outPathMy, markdownMy, 'utf8');
    console.log(`✅ Burmese digest saved to ${outPathMy}`);
  }
}

main().catch((err) => {
  console.error('❌ Failed to generate digest:', err.message);
  process.exit(1);
});
