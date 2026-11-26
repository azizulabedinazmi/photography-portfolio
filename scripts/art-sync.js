#!/usr/bin/env node
/**
 * Keeps every remote digital-art image (artwork finals + Replay step images) in
 * the private R2 bucket under art/, so the site never loads them from the
 * original host. Runs on every build (after photos-sync):
 *
 *   1. finds every http(s) image in dist/gallery-data.json (item.src + replay steps)
 *   2. copies any that R2 doesn't have yet from the source into R2 (once)
 *   3. downloads them into dist/assets/Art/ (git-ignored) for build-images.js,
 *      which turns them into WebP sizes that Netlify serves
 *   4. writes dist/art-manifest.json: { "<original url>": "dist/assets/Art/<file>" }
 *
 *   npm run art:sync              (also part of npm run build)
 *   add --dry-run to only report what would happen
 *
 * Without R2 settings it downloads straight from the source (handy locally).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const r2 = require('./r2');

const ROOT = r2.ROOT;
const DIR = path.join(ROOT, 'dist', 'assets', 'Art');
const MANIFEST = path.join(ROOT, 'dist', 'art-manifest.json');
const FOLDER = 'art/';
// Stored at up to 1600px: enough for the full-screen viewer, small enough for fast builds.
const SOURCE_QUERY = 'type=webp&to=min&r=1600&q=92';
const dryRun = process.argv.includes('--dry-run');

const baseUrl = (u) => u.split('?')[0];
const fileFor = (u) => crypto.createHash('sha1').update(baseUrl(u)).digest('hex').slice(0, 20) + '.webp';

function collectUrls() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'gallery-data.json'), 'utf8'));
  const items = Array.isArray(data) ? data : data.items || [];
  const urls = new Set();
  for (const it of items) {
    if (typeof it.src === 'string' && /^https?:\/\//i.test(it.src)) urls.add(it.src);
    for (const s of it.replay || []) if (s && /^https?:\/\//i.test(s.src)) urls.add(s.src);
  }
  return [...urls];
}

async function fromSource(url) {
  const res = await fetch(`${baseUrl(url)}?${SOURCE_QUERY}`, { headers: { 'User-Agent': 'portfolio-art-sync/1.0' } });
  if (!res.ok) throw new Error(`source answered ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error('source returned an empty image');
  return buf;
}

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

(async () => {
  const urls = collectUrls();
  fs.mkdirSync(DIR, { recursive: true });
  const useR2 = r2.configured();
  const c = useR2 ? r2.client(FOLDER) : null;
  const stored = useR2 ? new Set((await c.list()).map((o) => o.name)) : new Set();

  const toStore = useR2 ? urls.filter((u) => !stored.has(fileFor(u))) : [];
  const toFetchLocal = urls.filter((u) => !fs.existsSync(path.join(DIR, fileFor(u))));
  console.log(`Art: ${urls.length} image(s); ${useR2 ? `${stored.size} in R2, ${toStore.length} to copy into R2, ` : 'R2 not configured (using source directly), '}${toFetchLocal.length} to download${dryRun ? ' (dry run)' : ''}.`);
  if (dryRun) return;

  const failed = [];
  // 1. Copy anything new into R2 (one-time per image).
  await pool(toStore, 4, async (u) => {
    try {
      const buf = await fromSource(u);
      await c.put(fileFor(u), buf, 'image/webp');
      fs.writeFileSync(path.join(DIR, fileFor(u)), buf);
    } catch (e) { failed.push(`${u} (${e.message})`); }
  });
  // 2. Download what's missing locally (from R2, or the source without R2).
  await pool(toFetchLocal.filter((u) => !fs.existsSync(path.join(DIR, fileFor(u)))), 6, async (u) => {
    try {
      const buf = useR2 && !failed.some((f) => f.startsWith(u)) ? await c.get(fileFor(u)) : await fromSource(u);
      fs.writeFileSync(path.join(DIR, fileFor(u)), buf);
    } catch (e) { failed.push(`${u} (${e.message})`); }
  });

  const manifest = {};
  for (const u of urls) {
    const f = path.join(DIR, fileFor(u));
    if (fs.existsSync(f)) manifest[u] = path.relative(ROOT, f).split(path.sep).join('/');
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(`Art: ${Object.keys(manifest).length}/${urls.length} ready${toStore.length ? `, ${toStore.length - failed.length} newly stored in R2` : ''}.`);
  // Not fatal: anything that failed keeps loading from its original address.
  if (failed.length) console.warn(`Art: ${failed.length} failed and will load from the source:\n  ${failed.join('\n  ')}`);
})().catch((e) => {
  console.error(`Art: ${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''}`);
  process.exit(1);
});
