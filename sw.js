const CACHE_NAME = 'next-up-movies-v36';
const APP_SHELL = [
  'next-up-movies.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Only the app shell itself is cached — Watchmode API calls, Google Fonts,
// and anything else cross-origin always go straight to the network so
// movie data is never served stale.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAppShell = url.origin === self.location.origin &&
    APP_SHELL.some((name) => url.pathname.endsWith(name));
  if (event.request.method !== 'GET' || !isAppShell) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Never trust a cached error response (e.g. a 404 caught mid-deploy)
      // — treat it exactly like a cache miss so a bad response can never
      // get stuck being served forever.
      const validCached = (cached && cached.ok) ? cached : null;
      const network = fetch(event.request)
        .then((resp) => {
          // Only cache genuinely successful responses. Caching an error
          // page would otherwise mean it keeps getting served back on
          // every future visit — even once the real file is working again
          // — until someone manually clears the app's storage.
          if (resp && resp.ok){
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resp.clone()));
          }
          return resp;
        })
        .catch(() => validCached);
      return validCached || network;
    })
  );
});
