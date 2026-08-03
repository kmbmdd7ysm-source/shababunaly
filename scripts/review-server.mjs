// Static review server for the production build.
//
// `vite preview` is fine for a quick look, but a human review needs a few
// things it does not give us:
//   - correct SPA fallback for deep links like /products/:slug
//   - the prerendered per-route HTML that `postbuild` generates, so a reviewer
//     sees what a crawler sees
//   - a stubbed /api/* surface, because no Supabase or payment provider is
//     reachable here and an unhandled 500 would look like a broken route
//   - binding on 0.0.0.0 so the port can be forwarded
//
// Read-only. It never writes, and it talks to no external service.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.REVIEW_DIST || 'dist';
const PORT = Number(process.env.REVIEW_PORT || 4173);
const HOST = process.env.REVIEW_HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.map': 'application/json',
};

const server = http.createServer((request, response) => {
  const url = decodeURIComponent(String(request.url).split('?')[0]);

  // No backend is reachable in a review environment. Answer the shape the app
  // expects so a route renders its real empty/signed-out state rather than an
  // error that a reviewer would mistake for a bug.
  if (url.startsWith('/api/')) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'review_environment_no_backend' }));
    return;
  }

  const send = (file, status = 200) => {
    response.writeHead(status, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(response);
  };

  const direct = path.join(ROOT, url);
  // 1. exact file
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return send(direct);
  // 2. prerendered route HTML (what postbuild wrote, and what a crawler sees)
  const prerendered = path.join(ROOT, url, 'index.html');
  if (fs.existsSync(prerendered)) return send(prerendered);
  // 3. SPA fallback, so deep links such as /products/:slug still resolve
  return send(path.join(ROOT, 'index.html'), url === '/nonexistent' ? 200 : 200);
});

server.listen(PORT, HOST, () => {
  const pages = fs.existsSync(ROOT)
    ? fs.readdirSync(ROOT, { recursive: true }).filter((f) => String(f).endsWith('index.html')).length
    : 0;
  console.info(`Shababuna review server`);
  console.info(`  serving : ${path.resolve(ROOT)} (${pages} prerendered HTML pages)`);
  console.info(`  local   : http://localhost:${PORT}/`);
  console.info(`  bound   : ${HOST}:${PORT}`);
  console.info(`  /api/*  : stubbed 404 (no backend in review)`);
});
