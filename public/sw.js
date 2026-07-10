/* Deploy service worker — BUILD_HASH_PLACEHOLDER */
/* Navigation requests always hit network first so bare / URLs do not stick on cached index.html */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => fetch(event.request)),
  )
})
