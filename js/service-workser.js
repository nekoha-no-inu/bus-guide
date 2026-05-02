// ===============================
// 最小構成の Service Worker
// ===============================

self.addEventListener("install", (event) => {
  console.log("Service Worker: installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: activated");
});

// オフライン対応（最小）
// すべてのリクエストをネット優先で取得
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
