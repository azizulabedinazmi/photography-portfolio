/**
 * Tiny Cloudflare R2 client (S3-compatible API) for the photo originals.
 *
 * Settings come from environment variables (Netlify: Site settings -> Environment
 * variables) or, locally, from a git-ignored `.env` file in the project root:
 *
 *   R2_ACCOUNT_ID=...          Cloudflare account ID
 *   R2_ACCESS_KEY_ID=...       R2 API token: Access Key ID
 *   R2_SECRET_ACCESS_KEY=...   R2 API token: Secret Access Key
 *   R2_BUCKET=...              bucket name (keep it private)
 *   R2_PREFIX=photography/     optional folder inside the bucket
 */
const fs = require('fs');
const path = require('path');
const { AwsClient } = require('aws4fetch');

const ROOT = path.join(__dirname, '..');

// Load .env without overriding variables that are already set.
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotEnv();

const REQUIRED = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
const missing = () => REQUIRED.filter((k) => !process.env[k]);
const configured = () => missing().length === 0;
const prefix = () => {
  const p = process.env.R2_PREFIX === undefined ? 'photography/' : process.env.R2_PREFIX;
  return p && !p.endsWith('/') ? p + '/' : p;
};

// folder: object-key prefix inside the bucket (default R2_PREFIX, e.g. "photography/").
function client(folder = prefix()) {
  if (!configured()) throw new Error(`R2 is not configured; missing: ${missing().join(', ')}`);
  const aws = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const base = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(process.env.R2_BUCKET)}`;
  const url = (key, query = '') => `${base}/${key.split('/').map(encodeURIComponent).join('/')}${query}`;

  async function request(method, key, init = {}, query = '') {
    for (let attempt = 1; ; attempt++) {
      const res = await aws.fetch(url(key, query), { method, ...init });
      if (res.ok || attempt >= 3 || (res.status < 500 && res.status !== 429)) return res;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

  return {
    // All objects under the prefix: [{ key, name, size, etag }]
    async list() {
      const out = [];
      let token = '';
      do {
        const q = `?list-type=2&prefix=${encodeURIComponent(folder)}${token ? `&continuation-token=${encodeURIComponent(token)}` : ''}`;
        const res = await aws.fetch(`${base}${q}`);
        const xml = await res.text();
        if (!res.ok) throw new Error(`R2 list failed (${res.status}): ${xml.slice(0, 200)}`);
        for (const c of xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || []) {
          const key = decode((c.match(/<Key>([\s\S]*?)<\/Key>/) || [])[1] || '');
          if (!key || key.endsWith('/')) continue;
          out.push({
            key,
            name: key.slice(folder.length),
            size: Number((c.match(/<Size>(\d+)<\/Size>/) || [])[1] || 0),
            etag: ((c.match(/<ETag>([\s\S]*?)<\/ETag>/) || [])[1] || '').replace(/&quot;|"/g, ''),
          });
        }
        token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? decode((xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1] || '') : '';
      } while (token);
      return out;
    },

    async get(name) {
      const res = await request('GET', folder + name);
      if (!res.ok) throw new Error(`R2 download failed for ${name} (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },

    async put(name, body, contentType) {
      const res = await request('PUT', folder + name, {
        body,
        headers: { 'Content-Type': contentType || 'application/octet-stream', 'Content-Length': String(body.length) },
      });
      if (!res.ok) throw new Error(`R2 upload failed for ${name} (${res.status}): ${(await res.text()).slice(0, 200)}`);
    },
  };
}

module.exports = { ROOT, configured, missing, prefix, client };
