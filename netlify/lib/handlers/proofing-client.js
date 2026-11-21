/**
 * Netlify Function: Client Proofing — client API
 * Endpoint: POST /.netlify/functions/proofing-client
 *
 *   { action: "unlock", slug, pin }            -> token + gallery
 *   { action: "resume", slug, token }          -> gallery (page reload without re-entering PIN)
 *   { action: "submit", slug, token, ids, note } -> saves the client's picks
 *
 * The PIN is checked here on the server; it never reaches the browser.
 */

const P = require('../proofing');

const GENERIC_ERROR = 'That gallery code or PIN is not right. Please check your invite.';

function clientView(session, token, selection) {
  return {
    success: true,
    token,
    session: {
      slug: session.slug,
      title: session.title,
      clientName: session.clientName,
      message: session.message,
      maxSelections: session.maxSelections,
      allowDownload: Boolean(session.allowDownload),
      expiresAt: session.expiresAt || null,
      photos: P.publicPhotos(session, token)
    },
    selection: selection ? { ids: selection.ids || [], note: selection.note || '', submittedAt: selection.submittedAt } : null
  };
}

function unavailable(session) {
  if (session.status === 'closed') return 'This proofing gallery has been closed. Please contact the photographer.';
  if (P.isExpired(session)) return 'This proofing gallery has expired. Please contact the photographer.';
  return null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return P.json(405, { success: false, error: 'POST required.' });

  const { sessions, meta } = P.stores(event);
  const body = P.parseBody(event);
  const slug = String(body.slug || '').trim().toLowerCase();

  try {
    if (!P.isValidSlug(slug)) return P.json(401, { success: false, error: GENERIC_ERROR });

    if (body.action === 'unlock') {
      if (await P.pinLocked(meta, slug)) {
        return P.json(429, { success: false, error: 'Too many attempts. Please wait 15 minutes and try again.' });
      }
      const session = await sessions.get(slug, { type: 'json' });
      if (!session || !P.safeEqual(String(body.pin || '').trim(), session.pin)) {
        if (session) await P.recordPinFailure(meta, slug);
        return P.json(401, { success: false, error: GENERIC_ERROR });
      }
      const blocked = unavailable(session);
      if (blocked) return P.json(403, { success: false, error: blocked });
      await P.clearPinFailures(meta, slug);
      const token = await P.signToken(meta, slug);
      const selection = await meta.get(`selections/${slug}`, { type: 'json' });
      return P.json(200, clientView(session, token, selection));
    }

    // Everything below needs a valid token from a previous unlock.
    if (!(await P.verifyToken(meta, slug, body.token))) {
      return P.json(401, { success: false, error: 'Your session has timed out. Please enter your PIN again.', relock: true });
    }
    const session = await sessions.get(slug, { type: 'json' });
    if (!session) return P.json(401, { success: false, error: GENERIC_ERROR, relock: true });
    const blocked = unavailable(session);
    if (blocked) return P.json(403, { success: false, error: blocked, relock: true });

    if (body.action === 'resume') {
      const selection = await meta.get(`selections/${slug}`, { type: 'json' });
      return P.json(200, clientView(session, body.token, selection));
    }

    if (body.action === 'submit') {
      const valid = new Map((session.photos || []).map((p, i) => [p.id, { frame: i + 1, name: p.name }]));
      const ids = [...new Set(Array.isArray(body.ids) ? body.ids : [])].filter((id) => valid.has(id));
      if (!ids.length) return P.json(400, { success: false, error: 'Please select at least one photo.' });
      if (session.maxSelections && ids.length > session.maxSelections) {
        return P.json(400, { success: false, error: `You can choose up to ${session.maxSelections} photos.` });
      }
      const previous = await meta.get(`selections/${slug}`, { type: 'json' });
      const selection = {
        ids,
        frames: ids.map((id) => valid.get(id)),
        note: String(body.note || '').slice(0, 3000),
        submittedAt: new Date().toISOString(),
        submissions: ((previous && previous.submissions) || 0) + 1
      };
      await meta.setJSON(`selections/${slug}`, selection);
      return P.json(200, { success: true, submittedAt: selection.submittedAt, count: ids.length });
    }

    return P.json(400, { success: false, error: 'Unknown action.' });
  } catch (err) {
    return P.json(500, { success: false, error: 'Something went wrong. Please try again.' });
  }
};
