#!/usr/bin/env node
/**
 * Keeps the full-size photo originals in a private Cloudflare R2 bucket instead
 * of GitHub. The site never serves these originals: the build turns them into
 * small WebP copies (dist/assets/Photography/_web/) that Netlify serves.
 *
 *   npm run photos:push   upload local originals that R2 doesn't have yet (or that changed)
 *   npm run photos:pull   download originals that are missing locally (runs on every build)
 *   add --dry-run to see what would happen without transferring anything
 *
 * Settings: see scripts/r2.js (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).
 */
const fs = require('fs');
const path = require('path');
const r2 = require('./r2');

const DIR = path.join(r2.ROOT, 'dist', 'assets', 'Photography');
const EXT = /\.(jpe?g|png|webp|tiff?|heic)$/i;
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.tif': 'image/tiff', '.tiff': 'image/tiff', '.heic': 'image/heic' };
const mode = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

const localOriginals = () => (fs.existsSync(DIR) ? fs.readdirSync(DIR) : [])
  .filter((f) => EXT.test(f) && fs.statSync(path.join(DIR, f)).isFile());

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

async function pull() {
  if (!r2.configured()) {
    const have = localOriginals().length;
    // On Netlify the originals are no longer in git, so a build without R2 would publish no photos.
    if (process.env.NETLIFY && have === 0) {
      console.error(`Photos: R2 is not configured (missing ${r2.missing().join(', ')}) and no originals are present. Add the R2 variables in Netlify -> Site settings -> Environment variables.`);
      process.exit(1);
    }
    console.log(`Photos: R2 not configured; using the ${have} local original(s).`);
    return;
  }
  const remote = await r2.client().list();
  fs.mkdirSync(DIR, { recursive: true });
  const todo = remote.filter((o) => EXT.test(o.name) && !o.name.includes('/')).filter((o) => {
    const p = path.join(DIR, o.name);
    return !fs.existsSync(p) || fs.statSync(p).size !== o.size;
  });
  console.log(`Photos: ${remote.length} original(s) in R2, ${todo.length} to download${dryRun ? ' (dry run)' : ''}.`);
  if (dryRun) return todo.forEach((o) => console.log(`  would download ${o.name}`));
  const c = r2.client();
  let bytes = 0;
  await pool(todo, 6, async (o) => {
    const buf = await c.get(o.name);
    fs.writeFileSync(path.join(DIR, o.name), buf);
    bytes += buf.length;
  });
  if (todo.length) console.log(`Photos: downloaded ${todo.length} file(s), ${(bytes / 1048576).toFixed(1)} MB.`);
}

async function push() {
  if (!r2.configured()) {
    console.error(`Photos: R2 is not configured; missing ${r2.missing().join(', ')}. Put them in .env (see .env.example).`);
    process.exit(1);
  }
  const c = r2.client();
  const remote = new Map((await c.list()).map((o) => [o.name, o]));
  const files = localOriginals();
  const todo = files.filter((f) => {
    const o = remote.get(f);
    return !o || o.size !== fs.statSync(path.join(DIR, f)).size;
  });
  console.log(`Photos: ${files.length} local original(s), ${remote.size} in R2, ${todo.length} to upload${dryRun ? ' (dry run)' : ''}.`);
  if (dryRun) return todo.forEach((f) => console.log(`  would upload ${f}`));
  let bytes = 0;
  await pool(todo, 4, async (f) => {
    const buf = fs.readFileSync(path.join(DIR, f));
    await c.put(f, buf, TYPES[path.extname(f).toLowerCase()]);
    bytes += buf.length;
    console.log(`  ✓ ${f}`);
  });
  // Verify: every local original must now be in R2 with the same size.
  const after = new Map((await c.list()).map((o) => [o.name, o.size]));
  const bad = files.filter((f) => after.get(f) !== fs.statSync(path.join(DIR, f)).size);
  if (bad.length) {
    console.error(`Photos: ${bad.length} file(s) did not verify in R2: ${bad.join(', ')}`);
    process.exit(1);
  }
  console.log(`Photos: uploaded ${todo.length} file(s), ${(bytes / 1048576).toFixed(1)} MB. All ${files.length} originals verified in R2.`);
}

(mode === 'push' ? push : mode === 'pull' ? pull : () => {
  console.error('Usage: node scripts/photos-sync.js push|pull [--dry-run]');
  process.exit(1);
})().catch((e) => {
  const cause = e.cause && (e.cause.code || e.cause.message);
  const hint = cause && /SSL|TLS|ENOTFOUND|EAI_AGAIN/i.test(String(cause))
    ? ' Could not reach R2: check R2_ACCOUNT_ID (Cloudflare dashboard -> R2 -> Account ID) and your internet connection.'
    : '';
  console.error(`Photos: ${e.message}${cause ? ` (${cause})` : ''}.${hint}`);
  process.exit(1);
});
