/**
 * Netlify Serverless Function: Google Photos Public Shared Album reader
 * Endpoint: /.netlify/functions/google-photos-album?albumUrl=... OR ?id=...
 *
 * Used by the admin Studio Suite. Only accepts Google Photos share links,
 * so it can't be used as an open proxy.
 */

const { fetchGooglePhotosAlbum } = require('../lib/proofing');

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600'
  };

  const params = event.queryStringParameters || {};
  let albumUrl = params.albumUrl || params.url || params.id || '';
  if (!albumUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Missing Google Photos shared album URL. Pass ?albumUrl=https://photos.app.goo.gl/...' })
    };
  }
  if (!albumUrl.startsWith('http')) albumUrl = `https://photos.app.goo.gl/${albumUrl}`;

  try {
    const album = await fetchGooglePhotosAlbum(albumUrl);
    const photos = album.map((a, i) => ({
      id: `gphoto-${i + 1}`,
      title: `Google Photos #${i + 1}`,
      src: `${a.base}=w1600`,
      thumbnail: `${a.base}=w600`,
      width: a.width,
      height: a.height,
      category: 'events',
      camera: 'Google Photos Album',
      location: 'Google Photos',
      tags: 'google photos, album'
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, count: photos.length, albumUrl, photos }) };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Failed to fetch Google Photos album.' })
    };
  }
};
