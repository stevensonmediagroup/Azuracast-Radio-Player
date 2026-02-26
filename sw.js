// Player — Service Worker
// Caches the app shell for instant load; audio stream is always fetched live.

const CACHE_NAME = 'smg-radio-player-v1';

// Files to cache for offline/instant launch
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// On install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// On activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Audio stream → always network (never cache)
// - App shell → cache-first, fallback network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache audio streams or metadata APIs
  if (
    event.request.destination === 'audio' ||
    url.pathname.includes('/stream') ||
    url.pathname.includes('/nowplaying') ||
    url.pathname.includes('/metadata')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for shell assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful same-origin GET responses
        if (
          response.ok &&
          event.request.method === 'GET' &&
          url.origin === self.location.origin
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
