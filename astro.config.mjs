import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.yml': 'text/yaml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

// In `astro dev`, serve the plain-HTML admin suite and
// the generated /dist data + photos straight from disk, always fresh (the
// production build copies them in via scripts/copy-assets.js).
function serveStaticFolders(folders) {
  // Returns true when it answered the request.
  function serve(req, res) {
    let url;
    try { url = decodeURIComponent((req.url || '').split('?')[0]); } catch { return false; }
    const folder = folders.find((f) => url === `/${f}` || url.startsWith(`/${f}/`));
    if (!folder) return false;
    if (url === `/${folder}`) {
      res.writeHead(301, { Location: `/${folder}/` });
      res.end();
      return true;
    }
    const rel = url.endsWith('/') ? url + 'index.html' : url;
    // Files in public/ win (e.g. public/dist/portfolio-smart.js).
    const candidates = [[path.resolve('public'), path.resolve('public' + rel)], [path.resolve(folder), path.resolve('.' + rel)]];
    const hit = candidates.find(([root, f]) => f.startsWith(root + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile());
    if (!hit) return false;
    const file = hit[1];
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
    return true;
  }

  return {
    name: 'serve-static-folders',
    configureServer(server) {
      // Answer at the HTTP-server level: Astro's dev router otherwise 404s a
      // file opened directly in a browser tab (an HTML-accepting request).
      const http = server.httpServer;
      if (http) {
        const original = http.listeners('request');
        http.removeAllListeners('request');
        http.on('request', (req, res) => {
          if (!serve(req, res)) original.forEach((l) => l.call(http, req, res));
        });
      } else {
        server.middlewares.use((req, res, next) => (serve(req, res) ? undefined : next()));
      }
    },
  };
}

// https://astro.build/config
export default defineConfig({
  outDir: './dist_site',
  publicDir: './public',
  vite: {
    plugins: [tailwindcss(), serveStaticFolders(['admin', 'dist'])],
    server: {
      fs: {
        allow: ['.'],
      },
    },
  },
});
