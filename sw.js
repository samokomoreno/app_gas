
const CACHE_NAME = 'samapp-cache-v1';
const DYNAMIC_CACHE_NAME = 'samapp-dynamic-v1';

// Assets to cache immediately
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com', // Cache external library
];

// Install Event: Cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network First strategy (fall back to cache)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and Gemini API calls (we don't want to cache API errors or unique responses aggressively)
  if (event.request.method !== 'GET' || event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Verify response is valid
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          // If it's an external CDN (like tailwind), we might want to cache it though opaque
          if (event.request.url.includes('cdn.tailwindcss.com')) {
             const responseToCache = networkResponse.clone();
             caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache);
             });
          }
          return networkResponse;
        }

        // Cache the new valid response
        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If both fail and it's a navigation request, return index.html (SPA support)
          if (event.request.mode === 'navigate') {
             return caches.match('./index.html');
          }
        });
      })
  );
});
