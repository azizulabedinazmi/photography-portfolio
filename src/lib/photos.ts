// Shared helpers for gallery pages: each photo/artwork gets its own page at /photo/<slug>/
// so search engines index it under its own title and subject, not under the site owner's name.
// Keep slugify() in sync with scripts/build-seo.js and public/dist/portfolio-smart.js.
import fs from 'node:fs';
import galleryData from '../../dist/gallery-data.json';

export const SITE = 'https://azmi.is-cool.dev';
export const OWNER = 'Azizul Abedin Azmi';
export const OWNER_IMAGE = `${SITE}/dist/assets/Avatar.png`;
export const OWNER_PROFILES = [
  'https://www.instagram.com/azizulabedin',
  'https://www.facebook.com/azizul.abedin.azmi',
  'https://www.linkedin.com/in/azizulabedin/',
  'https://github.com/azizulabedinazmi'
];

export type Variant = { w?: number; h?: number; srcset: [string, number][] };

export const items: any[] = Array.isArray(galleryData) ? galleryData : (galleryData as any).items || [];

// Self-hosted WebP copies written by scripts/build-images.js (photos + mirrored art).
export const variants: Record<string, Variant> = (() => {
  try {
    const vt = fs.readFileSync('dist/image-variants.js', 'utf8');
    return JSON.parse(vt.slice(vt.indexOf('{'), vt.lastIndexOf('}') + 1));
  } catch {
    return {};
  }
})();

export const slugify = (s: string) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Unique slug per gallery item, in gallery order.
export const slugs: string[] = (() => {
  const seen = new Set<string>();
  return items.map((it) => {
    const base = slugify(it.title) || slugify(it.id) || 'photo';
    let s = base;
    for (let n = 2; seen.has(s); n++) s = `${base}-${n}`;
    seen.add(s);
    return s;
  });
})();

const clean = (src: string) => String(src || '').trim();
export const variantOf = (src: string): Variant | undefined => {
  const s = clean(src);
  return variants[s] || variants[s.replace(/^\.?\//, '')];
};

// Site-relative URL of the largest published copy.
export const largestPath = (src: string) => {
  const v = variantOf(src);
  if (v) return '/' + encodeURI(v.srcset[v.srcset.length - 1][0]);
  const s = clean(src);
  return /^https?:\/\//i.test(s) ? s : '/' + encodeURI(s.replace(/^\.?\//, ''));
};

export const publicUrl = (src: string) => {
  const p = largestPath(src);
  return p.startsWith('http') ? p : SITE + p;
};

export const srcsetOf = (src: string) => {
  const v = variantOf(src);
  return v ? v.srcset.map(([p, w]) => `/${encodeURI(p)} ${w}w`).join(', ') : undefined;
};

export const framesOf = (it: any): string[] =>
  [it.src, ...(Array.isArray(it.seriesExtra) ? it.seriesExtra : [])]
    .map((s: any) => (typeof s === 'string' ? s : s && s.image))
    .filter(Boolean);

export const tagList = (it: any): string[] =>
  String(it.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export const categoryLabel = (c: string) =>
  ({ portraits: 'Portrait', events: 'Event', nature: 'Nature', art: 'Digital Art' } as Record<string, string>)[c] ||
  (c ? c[0].toUpperCase() + c.slice(1) : 'Photo');
