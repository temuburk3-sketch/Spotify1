// SoundPulse Service Worker for Offline & Background Audio PWA
const CACHE_NAME = 'soundpulse-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Audio streams, YouTube APIs & dynamic audio APIs bypass cache
  if (
    request.url.includes('/api/audio/') ||
    request.url.includes('youtube.com') ||
    request.url.includes('googlevideo.com') ||
    request.url.includes('mzstatic.com') ||
    request.url.includes('apple.com') ||
    request.url.includes('audius.co')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      try {
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch (err) {
        if (request.headers.get('accept')?.includes('text/html') || request.mode === 'navigate') {
          const fallbackHtml = await caches.match('/index.html');
          if (fallbackHtml) return fallbackHtml;
        }
        return new Response('', { status: 408, statusText: 'Network request failed' });
      }
    })
  );
});
