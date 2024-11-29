const CACHE_NAME = 'whatgov-cache-v1';
const OFFLINE_URL = '/offline';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/site.webmanifest',
  '/favicon.ico',
  '/screenshot.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/styles/critical.css',
  '/my-parliament',
  '/search'
];

// Add route-based caching strategy
const ROUTE_CACHE_CONFIG = {
  '/api/debates': 'network-first',
  '/api/static': 'cache-first',
  'default': 'network-first'
};

// Install event - precache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          PRECACHE_ASSETS.map(url => {
            return cache.add(url).catch(error => {
              console.error('Failed to cache:', url, error);
              // Continue with installation even if individual assets fail
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-HTTP(S) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try to get from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Return offline page if nothing else works
        return caches.match(OFFLINE_URL);
      })
  );
}); 