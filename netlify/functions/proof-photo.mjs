// Netlify Functions v2 entry point. Logic lives in netlify/lib/handlers/proof-photo.js
import lib from '../lib/proofing.js';
import handler from '../lib/handlers/proof-photo.js';

export default lib.v2(handler.handler);
