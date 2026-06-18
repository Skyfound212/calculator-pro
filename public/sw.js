const CACHE_NAME = 'calculatorpro-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// Cache size limit (50MB)
const CACHE_SIZE_LIMIT = 50 * 1024 * 1024;

// Helper: Cek total cache size
async function getCacheSize(cache) {
  const keys = await cache.keys();
  let totalSize = 0;
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
}

// Helper: Cleanup cache lama kalau mendekati limit
async function cleanupCacheIfNeeded(cache) {
  try {
    const currentSize = await getCacheSize(cache);
    
    if (currentSize > CACHE_SIZE_LIMIT * 0.8) { // 80% threshold
      const keys = await cache.keys();
      const entries = [];
      
      // Get all entries with timestamps (gunakan header Date)
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          const timestamp = dateHeader ? new Date(dateHeader).getTime() : 0;
          entries.push({ request, response, timestamp });
        }
      }
      
      // Sort by oldest first
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Delete oldest 20% entries
      const deleteCount = Math.ceil(entries.length * 0.2);
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(entries[i].request);
      }
      
      console.log(`[SW] Cleaned up ${deleteCount} old cache entries`);
    }
  } catch (err) {
    console.error('[SW] Cache cleanup failed:', err);
  }
}

// Helper: Safe cache.put dengan error handling
async function safeCachePut(cache, request, response) {
  try {
    // Cleanup sebelum put kalau cache mendekati limit
    await cleanupCacheIfNeeded(cache);
    
    // Coba put
    await cache.put(request, response.clone());
    return true;
  } catch (err) {
    // Handle QuotaExceededError
    if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn('[SW] Storage quota exceeded. Attempting cleanup and retry...');
      
      try {
        // Force cleanup lebih agresif
        const keys = await cache.keys();
        const entries = [];
        
        for (const req of keys) {
          const resp = await cache.match(req);
          if (resp) {
            const blob = await resp.blob();
            entries.push({ request: req, size: blob.size, timestamp: Date.now() });
          }
        }
        
        // Sort by size (largest first) + timestamp
        entries.sort((a, b) => (b.size - a.size) || (a.timestamp - b.timestamp));
        
        // Delete largest 30% entries
        const deleteCount = Math.ceil(entries.length * 0.3);
        let freedSpace = 0;
        
        for (let i = 0; i < deleteCount; i++) {
          await cache.delete(entries[i].request);
          freedSpace += entries[i].size;
        }
        
        console.log(`[SW] Freed ${(freedSpace / 1024 / 1024).toFixed(2)}MB`);
        
        // Retry put
        await cache.put(request, response.clone());
        return true;
      } catch (retryErr) {
        console.error('[SW] Cache put failed even after cleanup:', retryErr);
        return false;
      }
    }
    
    console.error('[SW] Cache put failed:', err);
    return false;
  }
}

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Cache assets satu per satu (tidak pakai addAll agar bisa handle individual errors)
        const results = await Promise.allSettled(
          STATIC_ASSETS.map(async (url) => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                const success = await safeCachePut(cache, url, response);
                if (!success) {
                  console.warn(`[SW] Failed to cache: ${url}`);
                }
                return success;
              }
              throw new Error(`Failed to fetch ${url}: ${response.status}`);
            } catch (err) {
              console.error(`[SW] Error caching ${url}:`, err);
              return false;
            }
          })
        );
        
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(`[SW] Cached ${successCount}/${STATIC_ASSETS.length} assets`);
        
      } catch (err) {
        console.error('[SW] Install failed:', err);
      }
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activated and claimed clients');
      return self.clients.claim();
    })
  );
});

// Fetch: Cache-first strategy for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await safeCachePut(cache, request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // Return offline fallback untuk API
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'No network connection' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Static assets: cache first, network fallback
  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) {
        // Stale-while-revalidate: return cached, update in background
        fetch(request).then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await safeCachePut(cache, request, response.clone());
          }
        }).catch(() => {
          // Network failed, cached version is fine
        });
        
        return cached;
      }
      
      // Not in cache, fetch from network
      return fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await safeCachePut(cache, request, response.clone());
        }
        return response;
      }).catch(() => {
        // Network failed and not in cache
        // Return offline page untuk HTML requests
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        
        // Return error untuk assets lain
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Background sync untuk offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-calculator-data') {
    event.waitUntil(
      // Sync data yang tertunda
      console.log('[SW] Background sync triggered')
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'CalculatorPro', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: data.tag || 'default'
      })
    );
  }
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  // Handle cache size check request dari main thread
  if (event.data === 'checkCacheSize') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const size = await getCacheSize(cache);
        event.ports[0].postMessage({ size, limit: CACHE_SIZE_LIMIT });
      })
    );
  }
});