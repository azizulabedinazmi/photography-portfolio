/**
 * Shared helpers for the private client proofing system.
 *
 * Storage lives in Netlify Blobs (private, never in git):
 *   proofing-sessions  : <slug>                -> session JSON (incl. PIN)
 *   proofing-photos    : <slug>/<id>           -> full-size uploaded image
 *                        <slug>/<id>.thumb     -> thumbnail
 *   proofing-meta      : selections/<slug>     -> client picks
 *                        attempts/<slug>       -> failed PIN attempts (rate limit)
 *                        secret                -> HMAC secret for photo tokens
 */

const crypto = require('crypto');
const https = require('https');
const { getStore } = require('@netlify/blobs');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_PIN_FAILURES = 8;
const PIN_WINDOW_MS = 15 * 60 * 1000;

// Functions run in Netlify's v2 runtime (see v2() below), which configures Blobs automatically,
// including the uncached endpoint that strong-consistency reads need.
function stores() {
  return {
    sessions: getStore({ name: 'proofing-sessions', consistency: 'strong' }),
    photos: getStore({ name: 'proofing-photos', consistency: 'strong' }),
    meta: getStore({ name: 'proofing-meta', consistency: 'strong' })
  };
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

function json(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function randomId(len = 8) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function randomPin() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9][a-z0-9-]{2,60}$/.test(slug);
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// ---------- Signed photo tokens ----------

async function getSecret(meta) {
  if (process.env.PROOFING_SECRET) return process.env.PROOFING_SECRET;
  let secret = await meta.get('secret');
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    await meta.set('secret', secret);
  }
  return secret;
}

async function signToken(meta, slug, ttl = TOKEN_TTL_MS) {
  const secret = await getSecret(meta);
  const exp = Date.now() + ttl;
  const sig = crypto.createHmac('sha256', secret).update(`${slug}.${exp}`).digest('base64url');
  return `${exp}.${sig}`;
}

async function verifyToken(meta, slug, token) {
  if (!token || typeof token !== 'string') return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  const secret = await getSecret(meta);
  const expected = crypto.createHmac('sha256', secret).update(`${slug}.${exp}`).digest('base64url');
  return safeEqual(sig, expected);
}

// ---------- Rate limiting for PIN attempts ----------

async function pinLocked(meta, slug) {
  const rec = await meta.get(`attempts/${slug}`, { type: 'json' });
  if (!rec) return false;
  if (Date.now() - rec.windowStart > PIN_WINDOW_MS) return false;
  return rec.count >= MAX_PIN_FAILURES;
}

async function recordPinFailure(meta, slug) {
  const key = `attempts/${slug}`;
  let rec = await meta.get(key, { type: 'json' });
  if (!rec || Date.now() - rec.windowStart > PIN_WINDOW_MS) rec = { count: 0, windowStart: Date.now() };
  rec.count += 1;
  await meta.setJSON(key, rec);
}

async function clearPinFailures(meta, slug) {
  await meta.delete(`attempts/${slug}`);
}

// ---------- Session helpers ----------

function isExpired(session) {
  return Boolean(session.expiresAt) && new Date(session.expiresAt).getTime() < Date.now();
}

/** Photo list a client (or admin preview) can render. Uploaded photos go through proof-photo with a token. */
function publicPhotos(session, token) {
  return (session.photos || []).map((p, i) => {
    let src = p.src;
    let thumb = p.thumb || p.src;
    if (p.source === 'upload') {
      const base = `/.netlify/functions/proof-photo?s=${encodeURIComponent(session.slug)}&p=${encodeURIComponent(p.id)}&t=${encodeURIComponent(token)}`;
      src = base;
      thumb = `${base}&size=thumb`;
    }
    return {
      id: p.id,
      frame: i + 1,
      name: p.name || `Frame ${i + 1}`,
      source: p.source,
      width: p.width || null,
      height: p.height || null,
      src,
      thumb
    };
  });
}

// ---------- Google Drive ----------

function extractDriveId(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
  return null;
}

function extractDriveFolderId(input) {
  const m = String(input || '').match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
}

function drivePhoto(id, name) {
  return {
    id: `gd-${id}`,
    source: 'gdrive',
    name: name || `Drive ${id.slice(0, 6)}`,
    src: `https://lh3.googleusercontent.com/d/${id}=w2400`,
    thumb: `https://lh3.googleusercontent.com/d/${id}=w700`
  };
}

async function listDriveFolder(folderId, apiKey) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false and mimeType contains 'image/'`);
  const out = [];
  let pageToken = '';
  do {
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name)&orderBy=name&pageSize=200&key=${encodeURIComponent(apiKey)}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const { data } = await httpGet(url);
    const parsed = JSON.parse(data);
    if (parsed.error) throw new Error(parsed.error.message || 'Google Drive API error');
    for (const f of parsed.files || []) out.push(drivePhoto(f.id, f.name));
    pageToken = parsed.nextPageToken || '';
  } while (pageToken && out.length < 1000);
  return out;
}

// ---------- Google Photos ----------

const GPHOTOS_HOSTS = ['photos.app.goo.gl', 'photos.google.com', 'goo.gl'];

function isGooglePhotosUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && GPHOTOS_HOSTS.includes(u.hostname);
  } catch (e) {
    return false;
  }
}

function httpGet(url, maxRedirects = 5, allowUrl = null) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    if (allowUrl && !allowUrl(url)) return reject(new Error('Redirect target not allowed.'));
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(httpGet(next, maxRedirects - 1, allowUrl));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ data, finalUrl: url, status: res.statusCode }));
    }).on('error', reject);
  });
}

async function fetchGooglePhotosAlbum(albumUrl) {
  if (!isGooglePhotosUrl(albumUrl)) throw new Error('Only Google Photos shared album links are allowed.');
  const { data: html } = await httpGet(albumUrl, 5, isGooglePhotosUrl);
  const re = /\["(https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\-]+)",([0-9]+),([0-9]+)/g;
  const seen = new Set();
  const photos = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const base = m[1];
    const w = parseInt(m[2], 10);
    const h = parseInt(m[3], 10);
    if (w > 300 && h > 300 && !seen.has(base)) {
      seen.add(base);
      photos.push({ base, width: w, height: h });
    }
  }
  return photos;
}

// ---------- Netlify Functions v2 adapter ----------

/**
 * Checks a Netlify Identity JWT by asking the site's own Identity service who it belongs to.
 * (v2 functions don't get the user decoded for them like v1 functions did.)
 */
async function identityUser(req) {
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/i.test(auth)) return null;
  try {
    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}/.netlify/identity/user`, { headers: { Authorization: auth } });
    if (!res.ok) return null;
    const user = await res.json();
    return user && (user.id || user.email) ? user : null;
  } catch (e) {
    return null;
  }
}

/**
 * Wraps an (event, context) => { statusCode, headers, body } handler as a v2 function
 * (Request => Response), so the handlers stay simple and testable.
 */
function v2(handler, { auth = false } = {}) {
  return async (req) => {
    const url = new URL(req.url);
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const event = {
      httpMethod: req.method,
      queryStringParameters: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(req.headers),
      body: hasBody ? await req.text() : null,
      isBase64Encoded: false
    };
    const context = {};
    if (auth) {
      const user = await identityUser(req);
      if (user) context.clientContext = { user };
    }
    const out = await handler(event, context);
    const body = out.isBase64Encoded ? Buffer.from(out.body, 'base64') : out.body;
    return new Response(body, { status: out.statusCode, headers: out.headers || {} });
  };
}

module.exports = {
  v2, identityUser,
  stores, json, parseBody, slugify, randomId, randomPin, isValidSlug, safeEqual,
  signToken, verifyToken, pinLocked, recordPinFailure, clearPinFailures,
  isExpired, publicPhotos,
  extractDriveId, extractDriveFolderId, drivePhoto, listDriveFolder,
  isGooglePhotosUrl, fetchGooglePhotosAlbum
};
