/**
 * Reads the photo list from a public Google Photos shared-album link (used by the Studio importer,
 * netlify/functions/google-photos-album.js).
 */
const https = require('https');

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

module.exports = { fetchGooglePhotosAlbum, isGooglePhotosUrl };
