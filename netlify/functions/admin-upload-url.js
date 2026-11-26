/**
 * Netlify Function: signed upload link for a photo original (admin Studio → Upload).
 * POST /.netlify/functions/admin-upload-url   body: { name, type, size, overwrite? }
 *
 * Only a logged-in Netlify Identity user (the site owner; sign-ups are closed) gets a link.
 * The browser then PUTs the file straight to the private R2 bucket with that link, so the
 * original never passes through GitHub or this function (functions are capped at ~6 MB).
 * The link is valid for 15 minutes and only for that one file name.
 *
 * Needs the same R2_* environment variables as the build (see scripts/r2.js), and a CORS
 * rule on the bucket that allows PUT from the site (see README → Admin Studio).
 */
const { AwsClient } = require('aws4fetch');

const ALLOWED = /\.(jpe?g|png|webp|tiff?|heic)$/i;
const MAX_BYTES = 80 * 1024 * 1024;
const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

// "My Photo (1).JPG" -> "my-photo-1.jpg"
function cleanName(name) {
  const m = String(name || '').match(/^(.*?)(\.[a-z0-9]+)?$/i);
  const base = (m[1] || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const ext = (m[2] || '').toLowerCase().replace('.jpeg', '.jpg');
  return base && ext ? base + ext : '';
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Use POST.' });

  // Netlify verifies the Identity JWT sent as "Authorization: Bearer <token>".
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: 'Please log in to the admin first.' });

  const env = process.env;
  const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'].filter((k) => !env[k]);
  if (missing.length) return json(500, { error: `R2 is not configured on Netlify (missing ${missing.join(', ')}).` });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad request body.' }); }

  const name = cleanName(body.name);
  if (!name || !ALLOWED.test(name)) return json(400, { error: 'Only JPG, PNG, WebP, TIFF or HEIC photos can be uploaded.' });
  if (!(body.size > 0) || body.size > MAX_BYTES) return json(400, { error: 'The file must be under 80 MB.' });

  let prefix = env.R2_PREFIX === undefined ? 'photography/' : env.R2_PREFIX;
  if (prefix && !prefix.endsWith('/')) prefix += '/';

  const aws = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  const objectUrl = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(env.R2_BUCKET)}/${prefix}${encodeURIComponent(name)}`;

  // Don't silently replace an existing original.
  if (!body.overwrite) {
    const head = await aws.fetch(objectUrl, { method: 'HEAD' });
    if (head.ok) return json(409, { error: `A photo named "${name}" is already in storage.`, name, exists: true });
  }

  const signed = await aws.sign(new Request(`${objectUrl}?X-Amz-Expires=900`, { method: 'PUT' }), { aws: { signQuery: true } });
  return json(200, { uploadUrl: signed.url, name, src: `dist/assets/Photography/${name}` });
};
