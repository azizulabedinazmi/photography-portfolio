/**
 * Netlify Serverless Function: Google Photos Public Shared Album Sync
 * Endpoint: /.netlify/functions/google-photos-album?albumUrl=... OR ?id=...
 * 
 * Fetches public Google Photos shared albums, extracts direct high-resolution
 * CDN images, and returns a clean JSON array for instant gallery rendering.
 */

const https = require('https');

function followRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects'));
    }

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const origin = new URL(url).origin;
          redirectUrl = origin + redirectUrl;
        }
        return resolve(followRedirects(redirectUrl, maxRedirects - 1));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ data, finalUrl: url }));
    }).on('error', reject);
  });
}

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    let albumUrl = params.albumUrl || params.url || params.id || '';

    if (!albumUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing Google Photos shared album URL or ID. Pass ?albumUrl=https://photos.app.goo.gl/... or ?id=...'
        })
      };
    }

    if (!albumUrl.startsWith('http')) {
      albumUrl = `https://photos.app.goo.gl/${albumUrl}`;
    }

    // Only fetch Google Photos share links; never act as an open proxy.
    const ALLOWED_HOSTS = ['photos.app.goo.gl', 'photos.google.com', 'goo.gl'];
    let parsed;
    try { parsed = new URL(albumUrl); } catch (e) { parsed = null; }
    if (!parsed || parsed.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsed.hostname)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Only Google Photos shared album links are allowed.' })
      };
    }

    const { data: html } = await followRedirects(albumUrl);

    // Regex to match Google Photos CDN image URLs and dimensions
    // Pattern matches: ["https://lh3.googleusercontent.com/...", width, height]
    const photoRegex = /\["(https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\-]+)",([0-9]+),([0-9]+)/g;
    const photos = [];
    const seen = new Set();

    let match;
    let index = 1;

    while ((match = photoRegex.exec(html)) !== null) {
      const baseUrl = match[1];
      const width = parseInt(match[2], 10);
      const height = parseInt(match[3], 10);

      // Filter out tiny icons / avatars (must be at least 300x300)
      if (width > 300 && height > 300 && !seen.has(baseUrl)) {
        seen.add(baseUrl);
        photos.push({
          id: `gphoto-${index}`,
          title: `Google Photos Story #${index}`,
          src: `${baseUrl}=w1600`,
          thumbnail: `${baseUrl}=w600`,
          width: width,
          height: height,
          category: 'events',
          camera: 'Google Photos Album Feed',
          location: 'Live Photo Stream',
          tags: 'google photos, album, live stream'
        });
        index++;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: photos.length,
        albumUrl: albumUrl,
        photos: photos
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch Google Photos album.'
      })
    };
  }
};
