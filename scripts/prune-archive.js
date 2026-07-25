// Prunes docs/archive/ to the last ARCHIVE_DAYS entries and rewrites
// docs/archive/index.json to match what's left on disk.
//
// Run with: node scripts/prune-archive.js

const fs = require('fs');
const path = require('path');

const ARCHIVE_DAYS = 30;
const archiveDir = path.join(__dirname, '..', 'docs', 'archive');

function main() {
  fs.mkdirSync(archiveDir, { recursive: true });

  const files = fs.readdirSync(archiveDir);
  const dates = [...new Set(
    files
      .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})(\.my)?\.md$/))
      .filter(Boolean)
      .map((m) => m[1])
  )].sort(); // ascending: oldest first

  const toRemove = dates.slice(0, Math.max(0, dates.length - ARCHIVE_DAYS));
  for (const date of toRemove) {
    for (const suffix of ['.md', '.my.md', '.json']) {
      const filePath = path.join(archiveDir, `${date}${suffix}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removed old archive entry: ${date}${suffix}`);
      }
    }
  }

  const kept = dates.slice(-ARCHIVE_DAYS).sort().reverse(); // newest first
  const index = kept.map((date) => ({
    date,
    hasEn: fs.existsSync(path.join(archiveDir, `${date}.md`)),
    hasMy: fs.existsSync(path.join(archiveDir, `${date}.my.md`)),
  }));

  fs.writeFileSync(
    path.join(archiveDir, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
    'utf8'
  );

  console.log(`✅ Archive index rebuilt: ${index.length} entries kept.`);
}

main();
