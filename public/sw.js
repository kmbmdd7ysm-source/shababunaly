/* SHABABUNA service worker: public content only. Private/auth/payment and operational routes are always network-only. */
const PARAMS = new URL(self.location.href).searchParams;
const BUILD = (PARAMS.get('v') || 'dev').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80) || 'dev';
const CACHE_PREFIX = 'shababuna-';
const VERSION = `${CACHE_PREFIX}${BUILD}`;
const STATIC = `${VERSION}-static`;
const MEDIA = `${VERSION}-media`;
const PAGES = `${VERSION}-pages`;
const CURRENT_CACHES = new Set([STATIC, MEDIA, PAGES]);
const CORE = [
  '/', '/offline', '/favicon.svg', '/favicon.png', '/site.webmanifest',
  '/brand/shababuna-monogram.svg',
  '/brand/shababuna-wordmark-black.png', '/brand/shababuna-wordmark-white.png',
];
const PRIVATE = /(?:\/api(?:\/|$)|\/auth\b|\/account\b|\/checkout\b|\/order-tracking\b|\/operations\b|\/team-locker\b|\/design-share\b|\/special-request\b|supabase\.co\/(?:auth|rest|storage)|\/(?:profiles|user_state|addresses)\b)/i;

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

async function cacheCoreIndividually() {
  const cache = await caches.open(STATIC);
  const results = await Promise.allSettled(CORE.map(async (url) => {
    const response = await fetch(url, { cache: 'reload' });
    if (!response.ok) throw new Error(`precache_failed:${url}:${response.status}`);
    await cache.put(url, response);
  }));
  const cachedCount = results.filter((result) => result.status === 'fulfilled').length;
  if (cachedCount === 0) throw new Error('precache_all_failed');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await cacheCoreIndividually();
      // Activate the new worker immediately so A→B upgrades purge old caches.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.has(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || PRIVATE.test(url.href) || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(PAGES);
      try {
        /*
         * Navigations are network-first with a long timeout. HTML is NOT written
         * into the page cache on success — caching HTML caused A→B upgrades to
         * keep serving an old document (and therefore an old `sw.js?v=` id).
         * The page cache is only an offline fallback.
         */
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(request, { signal: controller.signal, cache: 'no-store' });
          return response;
        } finally {
          clearTimeout(timer);
        }
      } catch {
        return (await cache.match(request)) || (await caches.match('/offline')) || Response.error();
      }
    })());
    return;
  }

  if (/\.(?:png|jpg|jpeg|webp|avif|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA);
      const hit = await cache.match(request);
      const update = fetch(request).then(async (response) => {
        if (response.ok) {
          await cache.put(request, response.clone());
          await trimCache(MEDIA, 160);
        }
        return response;
      }).catch(() => null);
      return hit || await update || Response.error();
    })());
    return;
  }

  if (/\/assets\/.*\.(?:js|css)$/i.test(url.pathname)) {
    event.respondWith(caches.open(STATIC).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_SAFE_CACHES') {
    event.waitUntil(Promise.all([caches.delete(MEDIA), caches.delete(PAGES)]));
  }
});
