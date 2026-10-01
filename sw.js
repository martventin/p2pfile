const CACHE_NAME = 'utilitypro-v2';
const FILES_TO_CACHE = [
  // Core pages
  './index.html',
  './admin.html',
  './data-tools.html',
  './customer-info-form.html',
  './customer-manager.html',
  './password-vault.html',
  './file-drop.html',
  './receipt-maker.html',
  './image-text-overlayer.html',
  './smart-resizer.html',
  './stealth-cipher.html',
  './analytics.html',
  './services.html',
  './links.html',
  
  // Styles & Scripts
  './style.css',
  './sidebar.js',
  './p2p-client.js',
  './config.js'
];

// Install the service worker and cache files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching files for offline access...');
      return cache.addAll(FILES_TO_CACHE).catch((error) => {
        console.warn('⚠️ Some files could not be cached:', error);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  console.log('✓ Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Serve cached files when offline, fallback to network if online
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // Try network first for API calls
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache on network error
        return caches.match(event.request).then((response) => {
          if (response) {
            console.log('📦 Serving from cache:', event.request.url);
            return response;
          }
          // Return offline page if available
          return caches.match('./index.html');
        });
      })
  );
});