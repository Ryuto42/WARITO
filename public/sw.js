const CACHE_NAME = 'warito-cache-v4';
const ASSETS = [
  '/',
  '/manifest.json',
  '/icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // HTML等のナビゲーションリクエストは必ずネットワークを優先し、常に最新の更新をチェックする (Network First)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // キャッシュを更新しておく
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
  } else {
    // そのほかの静的ファイルは Cache First または Network First キャッシュ確認
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request).then(fetchResponse => {
           return caches.open(CACHE_NAME).then((cache) => {
             cache.put(e.request, fetchResponse.clone());
             return fetchResponse;
           });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
