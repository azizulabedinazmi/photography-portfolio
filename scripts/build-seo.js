#!/usr/bin/env node
/**
 * Keeps search-engine data in sync with dist/gallery-data.json (the file the admin at /admin/ edits).
 * Runs on every Netlify deploy (see netlify.toml) and can be run locally: `node scripts/build-seo.js`
 *
 *  1. dist/gallery-data.js  – regenerated from the JSON so the homepage always shows the latest edits
 *  2. sitemap.xml           – one URL per photo page (/photo/<slug>/, built by src/pages/photo/[slug].astro)
 *                             carrying that photo's images, so each image is indexed under its own title.
 *                             The only image listed under the owner's pages is the Avatar (on /about/).
 *
 * Each photo is described only by who/what is in it (no photographer name or credit), so a search for a
 * person's name finds their photo, but a search for the photographer's name doesn't pull up every image.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://azmi.is-cool.dev';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);

const raw = JSON.parse(read('dist/gallery-data.json'));
// Items marked "hidden" in the admin stay in the JSON but are left out of the site.
const items = (Array.isArray(raw) ? raw : raw.items || []).filter((it) => !it.hidden);

// Published WebP copies (originals are kept private in R2, see scripts/photos-sync.js).
let VARIANTS = {};
try {
  const vt = read('dist/image-variants.js');
  VARIANTS = JSON.parse(vt.slice(vt.indexOf('{'), vt.lastIndexOf('}') + 1));
} catch { /* not built yet: fall back to original paths */ }

function absoluteUrl(src) {
  if (!src) return null;
  const s = String(src).trim();
  // Self-hosted WebP copy (photos and mirrored digital art).
  if (VARIANTS[s]) return SITE + '/' + encodeURI(VARIANTS[s].srcset[VARIANTS[s].srcset.length - 1][0]);
  if (/^https?:\/\//i.test(s)) return s;
  const drive = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || (/^[a-zA-Z0-9_-]{25,}$/.test(s) ? [null, s] : null);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}=w1600`;
  const local = s.replace(/^\.?\//, '');
  const v = VARIANTS[local];
  const published = v ? v.srcset[v.srcset.length - 1][0] : local;
  return SITE + '/' + encodeURI(published);
}

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Same slugs as src/lib/photos.ts and public/dist/portfolio-smart.js (one page per gallery item).
const slugify = (t) => String(t || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const usedSlugs = new Set();
const slugs = items.map((it) => {
  const base = slugify(it.title) || slugify(it.id) || 'photo';
  let s = base;
  for (let n = 2; usedSlugs.has(s); n++) s = `${base}-${n}`;
  usedSlugs.add(s);
  return s;
});

// Every photo, including extra frames inside a series, grouped by its page.
const images = [];
const pages = items.map(() => []);
const seen = new Set();
items.forEach((it, idx) => {
  const srcs = [it.src, ...(Array.isArray(it.seriesExtra) ? it.seriesExtra : [])];
  srcs.forEach((src, i) => {
    const url = absoluteUrl(typeof src === 'string' ? src : src && src.image);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const im = {
      url,
      name: i === 0 ? it.title : `${it.title} (${i + 1})`,
      alt: it.alt || it.title,
      keywords: it.tags || ''
    };
    images.push(im);
    pages[idx].push(im);
  });
});

// 1. gallery-data.js
write('dist/gallery-data.js',
  `/**\n * Azizul Abedin Azmi - Photography Portfolio Gallery Dataset\n * GENERATED from dist/gallery-data.json by scripts/build-seo.js.\n * Edit the gallery in the admin at /admin/ (or the JSON) instead of this file.\n */\n\nwindow.GALLERY_DATA = ${JSON.stringify(items, null, 2)};\n`);

// 2. sitemap.xml
// <lastmod> is when the page's own source last changed (its newest git commit, or today if it has
// uncommitted edits), not the build date: a lastmod that moves on every deploy teaches Google to
// ignore it. If git isn't available the tag is left out. <changefreq> and <priority> are left out
// because Google ignores them.
const { execFileSync } = require('child_process');
const today = new Date().toISOString().slice(0, 10);
function lastChanged(paths) {
  try {
    const git = (args) => execFileSync('git', ['--literal-pathspecs', ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (git(['status', '--porcelain', '--', ...paths])) return today;
    return git(['log', '-1', '--format=%cs', '--', ...paths]) || null;
  } catch {
    return null;
  }
}
const imageTag = (u) => `    <image:image>\n      <image:loc>${xml(u)}</image:loc>\n    </image:image>`;
const urlEntry = (loc, lastmod, imgs = []) => [
  '  <url>',
  `    <loc>${xml(loc)}</loc>`,
  ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
  ...imgs.map(imageTag),
  '  </url>'
].join('\n');

const photoLastmod = lastChanged(['dist/gallery-data.json', 'src/pages/photo/[slug].astro', 'src/lib/photos.ts']);
const urls = [
  urlEntry(`${SITE}/`, lastChanged(['src/pages/index.astro', 'src/components', 'dist/gallery-data.json'])),
  urlEntry(`${SITE}/works/`, lastChanged(['src/pages/works.astro', 'dist/gallery-data.json'])),
  urlEntry(`${SITE}/about/`, lastChanged(['src/pages/about.astro']), [`${SITE}/dist/assets/Avatar.png`]),
  urlEntry(`${SITE}/contact/`, lastChanged(['src/pages/contact.astro'])),
  ...items.map((it, i) => urlEntry(`${SITE}/photo/${slugs[i]}/`, photoLastmod, pages[i].map((im) => im.url)))
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`);

console.log(`SEO build: ${items.length} photo pages, ${images.length} images in sitemap.`);
