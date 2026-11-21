/**
 * Netlify Function: serves an uploaded proofing photo from private Blobs storage.
 * Endpoint: /.netlify/functions/proof-photo?s=<slug>&p=<photoId>&t=<token>[&size=thumb][&download=1]
 *
 * The token comes from a successful PIN unlock (or the admin dashboard) and expires after 12 hours.
 */

const P = require('../proofing');

exports.handler = async function (event) {
  const q = event.queryStringParameters || {};
  const slug = String(q.s || '');
  const id = String(q.p || '');
  if (!P.isValidSlug(slug) || !/^up-[a-z0-9]{6,20}$/.test(id)) {
    return { statusCode: 400, body: 'Bad request' };
  }

  const { photos, meta, sessions } = P.stores(event);
  if (!(await P.verifyToken(meta, slug, q.t))) {
    return { statusCode: 403, body: 'Link expired' };
  }

  let result = null;
  if (q.size === 'thumb') result = await photos.getWithMetadata(`${slug}/${id}.thumb`, { type: 'arrayBuffer' });
  if (!result) result = await photos.getWithMetadata(`${slug}/${id}`, { type: 'arrayBuffer' });
  if (!result) return { statusCode: 404, body: 'Not found' };

  const type = (result.metadata && result.metadata.type) || 'image/webp';
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'private, max-age=3600',
    'X-Robots-Tag': 'noindex'
  };

  if (q.download === '1') {
    const session = await sessions.get(slug, { type: 'json' });
    const photo = session && (session.photos || []).find((p) => p.id === id);
    if (!session || !session.allowDownload || !photo) return { statusCode: 403, body: 'Downloads are not enabled for this gallery' };
    const ext = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
    const name = String(photo.name || id).replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
    headers['Content-Disposition'] = `attachment; filename="${name}.${ext}"`;
  }

  return {
    statusCode: 200,
    headers,
    body: Buffer.from(result.data).toString('base64'),
    isBase64Encoded: true
  };
};
