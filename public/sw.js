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

// Fetch event - implement route-based caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-HTTP(S) requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  let strategy = ROUTE_CACHE_CONFIG.default;

  // Special handling for Next.js CSS files
  if (url.pathname.includes('/_next/static/css/')) {
    strategy = 'cache-first';
  } else {
    // Check for specific route matches
    for (const route in ROUTE_CACHE_CONFIG) {
      if (url.pathname.startsWith(route)) {
        strategy = ROUTE_CACHE_CONFIG[route];
        break;
      }
    }
  }

  event.respondWith(
    (async () => {
      if (strategy === 'cache-first') {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
      }

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const responseClone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseClone);
        }
        return response;
      } catch (error) {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return caches.match(OFFLINE_URL);
      }
    })()
  );
}); 