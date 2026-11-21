/**
 * Netlify Function: Client Proofing — admin API
 * Endpoint: /.netlify/functions/proofing-admin?action=...
 *
 * Every call must carry a Netlify Identity JWT (Authorization: Bearer <token>).
 * Identity is invite-only on this site, so any logged-in user is the photographer.
 */

const P = require('../proofing');

const MAX_PHOTOS = 600;
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

function summary(session, selection) {
  return {
    slug: session.slug,
    title: session.title,
    clientName: session.clientName,
    status: session.status,
    expiresAt: session.expiresAt || null,
    expired: P.isExpired(session),
    photoCount: (session.photos || []).length,
    maxSelections: session.maxSelections,
    selectedCount: selection ? (selection.ids || []).length : 0,
    submittedAt: selection ? selection.submittedAt || null : null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

function cleanFields(input, existing) {
  const out = { ...(existing || {}) };
  if (input.title !== undefined) out.title = String(input.title).trim().slice(0, 120) || 'Untitled session';
  if (input.clientName !== undefined) out.clientName = String(input.clientName).trim().slice(0, 120);
  if (input.message !== undefined) out.message = String(input.message).trim().slice(0, 2000);
  if (input.pin !== undefined) {
    const pin = String(input.pin).trim();
    if (!/^[0-9A-Za-z]{4,12}$/.test(pin)) throw new Error('PIN must be 4–12 letters or digits.');
    out.pin = pin;
  }
  if (input.maxSelections !== undefined) {
    const n = parseInt(input.maxSelections, 10);
    out.maxSelections = Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 0; // 0 = unlimited
  }
  if (input.expiresAt !== undefined) {
    out.expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
  }
  if (input.status !== undefined) out.status = input.status === 'closed' ? 'closed' : 'active';
  if (input.allowDownload !== undefined) out.allowDownload = Boolean(input.allowDownload);
  return out;
}

exports.handler = async function (event, context) {
  const user = context && context.clientContext && context.clientContext.user;
  if (!user) return P.json(401, { success: false, error: 'Please log in with Netlify Identity.' });

  const { sessions, photos, meta } = P.stores(event);
  const q = event.queryStringParameters || {};
  const action = q.action || '';
  const body = event.httpMethod === 'POST' ? P.parseBody(event) : {};
  const slug = body.slug || q.slug || '';

  async function loadSession() {
    if (!P.isValidSlug(slug)) throw Object.assign(new Error('Invalid session id.'), { code: 400 });
    const s = await sessions.get(slug, { type: 'json' });
    if (!s) throw Object.assign(new Error('Session not found.'), { code: 404 });
    return s;
  }

  async function saveSession(s) {
    s.updatedAt = new Date().toISOString();
    await sessions.setJSON(s.slug, s);
    return s;
  }

  async function fullResponse(s) {
    const token = await P.signToken(meta, s.slug);
    const selection = await meta.get(`selections/${s.slug}`, { type: 'json' });
    return P.json(200, {
      success: true,
      session: { ...s, photos: P.publicPhotos(s, token) },
      selection: selection || null
    });
  }

  try {
    switch (action) {
      case 'list': {
        const { blobs } = await sessions.list();
        const items = await Promise.all(blobs.map(async (b) => {
          const s = await sessions.get(b.key, { type: 'json' });
          if (!s) return null;
          const sel = await meta.get(`selections/${b.key}`, { type: 'json' });
          return summary(s, sel);
        }));
        const list = items.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        return P.json(200, { success: true, sessions: list });
      }

      case 'get': {
        return fullResponse(await loadSession());
      }

      case 'save': {
        if (event.httpMethod !== 'POST') return P.json(405, { success: false, error: 'POST required.' });
        if (body.slug) {
          const s = await loadSession();
          return fullResponse(await saveSession(cleanFields(body, s)));
        }
        // Create: slug = readable title + random suffix so links can't be guessed.
        const base = P.slugify(body.title || body.clientName || 'session') || 'session';
        let newSlug = `${base}-${P.randomId(5)}`;
        while (await sessions.get(newSlug)) newSlug = `${base}-${P.randomId(5)}`;
        const now = new Date().toISOString();
        const s = cleanFields({ pin: body.pin || P.randomPin(), ...body }, {
          slug: newSlug,
          title: 'Untitled session',
          clientName: '',
          message: '',
          maxSelections: 20,
          expiresAt: null,
          status: 'active',
          allowDownload: false,
          photos: [],
          createdAt: now
        });
        return fullResponse(await saveSession(s));
      }

      case 'delete': {
        const s = await loadSession();
        const { blobs } = await photos.list({ prefix: `${s.slug}/` });
        await Promise.all(blobs.map((b) => photos.delete(b.key)));
        await meta.delete(`selections/${s.slug}`);
        await meta.delete(`attempts/${s.slug}`);
        await sessions.delete(s.slug);
        return P.json(200, { success: true });
      }

      case 'upload': {
        const s = await loadSession();
        if ((s.photos || []).length >= MAX_PHOTOS) throw new Error(`A session can hold up to ${MAX_PHOTOS} photos.`);
        const type = ALLOWED_TYPES.includes(body.type) ? body.type : null;
        if (!type || !body.data) throw new Error('Upload must be a WebP, JPEG or PNG image.');
        const full = Buffer.from(body.data, 'base64');
        if (full.length > MAX_UPLOAD_BYTES) throw new Error('Image is too large after compression (max 4.5 MB).');
        const id = `up-${P.randomId(10)}`;
        await photos.set(`${s.slug}/${id}`, full, { metadata: { type } });
        if (body.thumb) {
          const thumbType = ALLOWED_TYPES.includes(body.thumbType) ? body.thumbType : type;
          await photos.set(`${s.slug}/${id}.thumb`, Buffer.from(body.thumb, 'base64'), { metadata: { type: thumbType } });
        }
        s.photos = s.photos || [];
        s.photos.push({
          id,
          source: 'upload',
          name: String(body.name || 'Photo').slice(0, 140),
          width: parseInt(body.width, 10) || null,
          height: parseInt(body.height, 10) || null,
          hasThumb: Boolean(body.thumb)
        });
        await saveSession(s);
        return P.json(200, { success: true, id, photoCount: s.photos.length });
      }

      case 'remove-photo': {
        const s = await loadSession();
        const ids = new Set(Array.isArray(body.ids) ? body.ids : [body.id]);
        const removed = (s.photos || []).filter((p) => ids.has(p.id));
        s.photos = (s.photos || []).filter((p) => !ids.has(p.id));
        await Promise.all(removed.filter((p) => p.source === 'upload').flatMap((p) => [
          photos.delete(`${s.slug}/${p.id}`),
          photos.delete(`${s.slug}/${p.id}.thumb`)
        ]));
        await saveSession(s);
        return fullResponse(s);
      }

      case 'reorder': {
        const s = await loadSession();
        const order = Array.isArray(body.ids) ? body.ids : [];
        const byId = new Map((s.photos || []).map((p) => [p.id, p]));
        const next = order.map((id) => byId.get(id)).filter(Boolean);
        for (const p of s.photos || []) if (!order.includes(p.id)) next.push(p);
        s.photos = next;
        await saveSession(s);
        return P.json(200, { success: true });
      }

      case 'add-gdrive': {
        const s = await loadSession();
        const lines = String(body.input || '').split(/[\s,]+/).map((l) => l.trim()).filter(Boolean);
        const existing = new Set((s.photos || []).map((p) => p.id));
        const added = [];
        for (const line of lines) {
          const folderId = P.extractDriveFolderId(line);
          if (folderId) {
            const apiKey = process.env.GDRIVE_API_KEY;
            if (!apiKey) throw new Error('Importing a whole Drive folder needs the GDRIVE_API_KEY environment variable in Netlify. Paste individual file links instead, or add the key.');
            for (const p of await P.listDriveFolder(folderId, apiKey)) if (!existing.has(p.id)) { existing.add(p.id); added.push(p); }
            continue;
          }
          const id = P.extractDriveId(line);
          if (id && !existing.has(`gd-${id}`)) { existing.add(`gd-${id}`); added.push(P.drivePhoto(id)); }
        }
        if (!added.length) throw new Error('No new Google Drive images found in what you pasted.');
        s.photos = [...(s.photos || []), ...added].slice(0, MAX_PHOTOS);
        await saveSession(s);
        return fullResponse(s);
      }

      case 'add-gphotos': {
        const s = await loadSession();
        const album = await P.fetchGooglePhotosAlbum(String(body.albumUrl || '').trim());
        if (!album.length) throw new Error('No photos found. Make sure the album is shared with a link.');
        const existing = new Set((s.photos || []).map((p) => p.src));
        const startNum = (s.photos || []).length;
        const added = album
          .map((a, i) => ({
            id: `gp-${P.randomId(10)}`,
            source: 'gphotos',
            name: `Album photo ${startNum + i + 1}`,
            src: `${a.base}=w2400`,
            thumb: `${a.base}=w700`,
            width: a.width,
            height: a.height
          }))
          .filter((p) => !existing.has(p.src));
        s.photos = [...(s.photos || []), ...added].slice(0, MAX_PHOTOS);
        await saveSession(s);
        const res = await fullResponse(s);
        const payload = JSON.parse(res.body);
        payload.added = added.length;
        res.body = JSON.stringify(payload);
        return res;
      }

      case 'clear-selection': {
        const s = await loadSession();
        await meta.delete(`selections/${s.slug}`);
        return fullResponse(s);
      }

      default:
        return P.json(400, { success: false, error: 'Unknown action.' });
    }
  } catch (err) {
    return P.json(typeof err.code === 'number' ? err.code : 400, { success: false, error: err.message || 'Something went wrong.' });
  }
};
