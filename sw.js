const CACHE_NAME = 'borebill-pro-v124';
const ASSETS = [
  './',
  './index.html?v=124',
  './styles.css?v=124',
  './app.js?v=124',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './drillrig_logo.png',
  './developer_profile.jpg'
];

// Pinned third-party libraries (icons, PDF & image export). Cached so bills can be exported offline at a site.
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
      await cache.addAll(ASSETS);
      // CDN files are best-effort: a CDN hiccup must not break install
      await Promise.all(CDN_ASSETS.map((url) => cache.add(new Request(url, { mode: 'cors' })).catch(() => {})));
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

  // Network-First so latest UI updates load immediately when online; cache fallback when offline
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
        const hit = await caches.match(event.request);
        if (hit) return hit;
        // e.g. offline launch of ./index.html when only ./index.html?v=124 was precached
        const loose = await caches.match(event.request, { ignoreSearch: true });
        if (loose) return loose;
        if (event.request.mode === 'navigate') return caches.match('./index.html?v=124');
        return Response.error();
      })
  );
});
