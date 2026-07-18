// sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 最低限のfetchハンドラ（何もしなくても登録があればOK）
  event.respondWith(fetch(event.request));
});
