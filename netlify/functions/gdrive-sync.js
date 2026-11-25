/**
 * Netlify Serverless Function: Google Drive Folder Sync & Direct Media Resolver
 * Endpoint: /.netlify/functions/gdrive-sync?folderId=... OR ?fileIds=...
 * 
 * Converts Google Drive folders and files into ultra-fast CDN links (lh3.googleusercontent.com).
 */

const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Netlify-Function/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response from Google API'));
        }
      });
    }).on('error', reject);
  });
}

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800, s-maxage=1800'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const folderId = params.folderId || process.env.GDRIVE_FOLDER_ID || '1D09ID20nLSdNItx2vYhqo5yJfBYFYxsv';
    const fileIdsParam = params.fileIds || '';
    const apiKey = params.apiKey || process.env.GDRIVE_API_KEY || '';

    // 1. Batch File ID resolution (zero backend API key needed)
    if (fileIdsParam) {
      const ids = fileIdsParam.split(',').map(s => s.trim()).filter(Boolean);
      const photos = ids.map((id, idx) => ({
        id: `gdrive-${id}`,
        title: `Google Drive Work #${idx + 1}`,
        src: `https://lh3.googleusercontent.com/d/${id}=w1600`,
        thumbnail: `https://lh3.googleusercontent.com/d/${id}=w600`,
        category: 'portraits',
        camera: 'Google Drive Storage',
        location: 'Fine Art Series'
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, count: photos.length, photos })
      };
    }

    // 2. Google Drive Folder Sync via Google Drive API v3
    if (folderId && apiKey) {
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false and mimeType contains 'image/'`);
      const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,imageMediaMetadata,createdTime)&pageSize=100&key=${apiKey}`;

      const data = await fetchJson(apiUrl);

      if (data.error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: data.error.message || 'Google Drive API error' })
        };
      }

      const files = data.files || [];
      const photos = files.map(file => {
        const meta = file.imageMediaMetadata || {};
        let cameraInfo = 'Canon EOS';
        if (meta.cameraMake || meta.cameraModel) {
          cameraInfo = `${meta.cameraMake || ''} ${meta.cameraModel || ''}`.trim();
        }
        if (meta.focalLength && meta.aperture) {
          cameraInfo += ` · ${meta.focalLength}mm f/${meta.aperture}`;
        }

        return {
          id: `gdrive-${file.id}`,
          title: file.name ? file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Google Drive Photo',
          src: `https://lh3.googleusercontent.com/d/${file.id}=w1600`,
          thumbnail: `https://lh3.googleusercontent.com/d/${file.id}=w600`,
          width: meta.width || 1600,
          height: meta.height || 1067,
          category: 'portraits',
          camera: cameraInfo,
          location: 'Google Drive Sync',
          createdTime: file.createdTime
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, folderId, count: photos.length, photos })
      };
    }

    // Fallback info if neither was passed
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Google Drive Sync ready.',
        instructions: {
          directIds: 'Pass ?fileIds=ID1,ID2,ID3 to get instant CDN links (zero API key needed)',
          folderSync: 'Set GDRIVE_FOLDER_ID and GDRIVE_API_KEY environment variables in Netlify, or pass ?folderId=...&apiKey=...'
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Server error' })
    };
  }
};
