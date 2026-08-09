import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const host = process.env.TEST_SERVER_HOST || '127.0.0.1';
const port = Number(process.env.PORT || process.argv[2] || 4173);
const root = resolve(process.env.TEST_SERVER_DIST || 'dist');
const apiRoot = resolve('api');
const maxBodyBytes = Number(process.env.TEST_SERVER_MAX_BODY_BYTES || 12 * 1024 * 1024);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.woff2', 'font/woff2'],
  ['.pdf', 'application/pdf'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

const enhanceResponse = (res) => {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (value) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
    return res;
  };
  res.send = (value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) res.end(value);
    else if (typeof value === 'object') res.json(value);
    else res.end(String(value ?? ''));
    return res;
  };
  res.redirect = (statusOrUrl, maybeUrl) => {
    const status = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
    const url = typeof statusOrUrl === 'number' ? maybeUrl : statusOrUrl;
    res.statusCode = status;
    res.setHeader('Location', String(url));
    res.end();
    return res;
  };
  return res;
};

const readBody = async (req) => {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBodyBytes) throw Object.assign(new Error('request_too_large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const serveApi = async (req, res, url) => {
  const slug = url.pathname.slice('/api/'.length);
  if (!/^[a-z0-9-]+$/i.test(slug)) return false;
  const file = join(apiRoot, `${slug}.js`);
  if (!existsSync(file)) return false;
  const module = await import(`${pathToFileURL(file).href}?testserver=${Date.now()}`);
  if (typeof module.default !== 'function')
    throw new Error(`API handler missing default export: ${slug}`);
  req.query = Object.fromEntries(url.searchParams.entries());
  req.cookies = Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim().split('=').map(decodeURIComponent))
      .filter((entry) => entry.length === 2),
  );
  const rawBody = module.config?.api?.bodyParser === false;
  if (!rawBody && !['GET', 'HEAD'].includes(req.method || 'GET')) {
    const buffer = await readBody(req);
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
      try {
        req.body = buffer.length ? JSON.parse(buffer.toString('utf8')) : {};
      } catch {
        req.body = {};
      }
    } else req.body = buffer.toString('utf8');
  }
  await module.default(req, enhanceResponse(res));
  if (!res.writableEnded) res.end();
  return true;
};

const safeStaticPath = (pathname) => {
  const decoded = decodeURIComponent(pathname).replaceAll('\\', '/');
  const clean = normalize(decoded)
    .replace(/^(\.\.(\/|\\|$))+/, '')
    .replace(/^\/+/, '');
  const target = resolve(root, clean || 'index.html');
  return target.startsWith(root) ? target : null;
};

const serveStatic = async (req, res, url) => {
  let target = safeStaticPath(url.pathname);
  if (!target) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }
  try {
    const info = await stat(target);
    if (info.isDirectory()) target = join(target, 'index.html');
  } catch {
    if (extname(url.pathname)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    target = join(root, 'index.html');
  }
  try {
    const data = await readFile(target);
    const type = mime.get(extname(target).toLowerCase()) || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    if (/\/assets\//.test(url.pathname))
      res.setHeader('Cache-Control', 'public,max-age=31536000,immutable');
    else res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 200;
    if (req.method === 'HEAD') res.end();
    else res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
};

if (!existsSync(join(root, 'index.html')))
  throw new Error(`Production dist not found at ${root}. Run npm run build first.`);
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
    if (url.pathname.startsWith('/api/') && (await serveApi(req, res, url))) return;
    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = error?.status || 500;
    res.end(
      JSON.stringify({
        ok: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'test_server_error'
            : String(error?.message || error),
      }),
    );
  }
});
server.listen(port, host, () =>
  console.info(`SHABABUNA production test server listening at http://${host}:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
