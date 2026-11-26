const CACHE_NAME = 'panthar-offline-v1';
const OFFLINE_URL = '/offline.html';
// Build files under /_next/static/ have a content hash in their name and never
// change, so they're served from the device after the first visit. That makes
// the installed app start faster. Capped so old builds don't pile up.
const STATIC_CACHE = 'panthar-static-v1';
const STATIC_LIMIT = 400;

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
      // Drop caches from older versions of this worker.
      const keep = [CACHE_NAME, STATIC_CACHE];
      for (const key of await caches.keys()) {
        if (!keep.includes(key)) await caches.delete(key);
      }
      // Tell the active service worker to take control of the page immediately
      self.clients.claim();
    })()
  );
});

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    for (const old of keys.slice(0, Math.max(0, keys.length - STATIC_LIMIT))) await cache.delete(old);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStatic(event.request));
    return;
  }

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
