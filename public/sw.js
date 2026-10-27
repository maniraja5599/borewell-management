// DrillRig offline service worker.
// Built JS/CSS files have content hashes in their names (from Vite), so they never go stale;
// we fetch network-first and fall back to cache when the rig site has no signal.
const CACHE_NAME = 'drillrig-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './drillrig_logo.png',
  './developer_profile.jpg'
];

// Pinned third-party libraries (icons, PDF & image export), cached so bills can be exported offline.
const CDN_ASSETS = [
  'https://unpkg.com/lucide@1.60.0/dist/umd/lucide.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
const CDN_HOSTS = ['unpkg.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE);
      await Promise.all(CDN_ASSETS.map((url) => cache.add(new Request(url, { mode: 'cors' })).catch(() => {})));
      // Also cache the current hashed app bundle so the very first offline launch works
      try {
        const html = await (await fetch('./index.html', { cache: 'no-store' })).text();
        const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
        await cache.addAll(assets);
      } catch (_) { /* best effort */ }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.includes(url.hostname);
  if (!isSameOrigin && !isCdn) return;
  // Vite dev server files: never cache
  if (isSameOrigin && (url.pathname.includes('/@vite') || url.pathname.includes('/src/') || url.pathname.includes('/node_modules/'))) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const hit = await caches.match(event.request) || await caches.match(event.request, { ignoreSearch: true });
        if (hit) return hit;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
  );
});
