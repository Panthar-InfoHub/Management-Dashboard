const CACHE_NAME = 'panthar-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache the offline page and the logo
      await cache.addAll([
        OFFLINE_URL,
        '/images/black_logo.webp'
      ]);
      // Force the waiting service worker to become the active service worker
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      // Tell the active service worker to take control of the page immediately
      self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // We only want to call event.respondWith() if this is a navigation request
  // for an HTML page.
  const isNavigate = event.request.mode === 'navigate';
  const isHtml = event.request.headers.get('accept')?.includes('text/html');
  
  if (isNavigate || isHtml) {
    event.respondWith(
      (async () => {
        try {
          // First, try to use the navigation preload response if it's supported.
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          // Always try the network first.
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // catch is only triggered if an exception is thrown, which is likely
          // due to a network error.
          // If fetch did not succeed, get the offline page from the cache.
          console.log('[Service Worker] Fetch failed; returning offline page instead.', error);

          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          if (cachedResponse) return cachedResponse;
          
          // If even the offline page is missing, return a basic response
          return new Response(
            '<html><body><h1>Offline</h1><p>Please check your connection.</p><button onclick="window.location.reload()">Retry</button></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
  } else if (event.request.destination === 'image' && event.request.url.includes('black_logo.webp')) {
    // Also serve the logo from cache if it fails
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          return await cache.match('/images/black_logo.webp');
        }
      })()
    );
  }
});
