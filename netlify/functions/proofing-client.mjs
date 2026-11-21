// Netlify Functions v2 entry point. Logic lives in netlify/lib/handlers/proofing-client.js
import lib from '../lib/proofing.js';
import handler from '../lib/handlers/proofing-client.js';

export default lib.v2(handler.handler);
