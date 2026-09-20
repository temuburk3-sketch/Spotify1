// SoundPulse Service Worker - Auto-Invalidate & Self-Clearing
// Clears any poisoned cache and prevents stale HTML/JS traps
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Let all network requests pass through cleanly without intercepting
self.addEventListener('fetch', () => {});

