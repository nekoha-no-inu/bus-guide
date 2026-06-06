// ======================================
// service-worker.js  ─  最小構成の Service Worker
// ======================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  // 必要に応じて古いキャッシュをここで削除できます
});

// ネットワーク優先・失敗時はキャッシュにフォールバック
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
