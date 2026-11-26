#!/usr/bin/env node
/**
 * Writes dist_site/admin/build-info.json: what this deploy contains and anything that needs
 * attention. The admin Studio's Dashboard shows it (and compares the commit with GitHub to
 * tell whether the latest changes are live yet). Runs last in `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const raw = JSON.parse(read('dist/gallery-data.json'));
const all = Array.isArray(raw) ? raw : raw.items || [];
let variants = {};
try {
  const vt = read('dist/image-variants.js');
  variants = JSON.parse(vt.slice(vt.indexOf('{'), vt.lastIndexOf('}') + 1));
} catch { /* no images built */ }

const PHOTO_DIR = path.join(ROOT, 'dist/assets/Photography');
const originals = fs.existsSync(PHOTO_DIR)
  ? fs.readdirSync(PHOTO_DIR).filter((f) => /\.(jpe?g|png|webp|tiff?|heic)$/i.test(f))
  : [];

const srcOf = (s) => (typeof s === 'string' ? s : s && s.image) || '';
const framesOf = (it) => [it.src, ...(Array.isArray(it.seriesExtra) ? it.seriesExtra : [])].map(srcOf).filter(Boolean);
const hasCopy = (src) => Boolean(variants[src] || variants[src.replace(/^\.?\//, '')]);

const warnings = [];
const warn = (level, item, message) => warnings.push({ level, id: item && item.id, title: item && item.title, message });

const ids = new Map();
const used = new Set();
for (const it of all) {
  ids.set(it.id, (ids.get(it.id) || 0) + 1);
  for (const src of framesOf(it)) {
    if (src.startsWith('dist/assets/Photography/')) used.add(path.basename(src));
    if (!hasCopy(src)) {
      warn('error', it, src.startsWith('dist/')
        ? `Image missing from storage: ${path.basename(src)} (not in R2, so it can't be shown)`
        : `Image could not be copied from ${src.slice(0, 60)}…`);
    }
  }
  if (!it.hidden) {
    if (!it.alt || !String(it.alt).trim()) warn('warn', it, 'No alt text (helps Google find the photo by who/what is in it)');
    if (!it.tags || !String(it.tags).trim()) warn('info', it, 'No tags');
  }
}
for (const [id, n] of ids) if (n > 1) warn('error', { id, title: id }, `Duplicate ID used ${n} times`);
const unused = originals.filter((f) => !used.has(f));

const visible = all.filter((it) => !it.hidden);
const info = {
  builtAt: new Date().toISOString(),
  commit: process.env.COMMIT_REF || null,
  branch: process.env.BRANCH || null,
  context: process.env.CONTEXT || 'local',
  deployId: process.env.DEPLOY_ID || null,
  counts: {
    items: all.length,
    visible: visible.length,
    hidden: all.length - visible.length,
    featured: visible.filter((it) => it.featured).length,
    photos: visible.filter((it) => it.category !== 'art').length,
    art: visible.filter((it) => it.category === 'art').length,
    series: visible.filter((it) => it.isSeries).length,
    images: visible.reduce((n, it) => n + framesOf(it).length, 0),
    originalsInStorage: originals.length,
    unusedOriginals: unused.length
  },
  unusedOriginals: unused,
  warnings
};

const outDir = path.join(ROOT, 'dist_site', 'admin');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'build-info.json'), JSON.stringify(info, null, 2));
const errors = warnings.filter((w) => w.level === 'error').length;
console.log(`Build info: ${info.counts.visible} shown, ${info.counts.hidden} hidden, ${errors} error(s), ${warnings.length - errors} note(s).`);
