```javascript
const CACHE_NAME = 'volcano-monitor-v1.5-pro';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
  );
  self.clients.claim();
});

// 🔔 PWAの「バックグラウンド・プッシュ通知」を受信・表示する
self.addEventListener('push', event => {
  let title = '🚨 火山警報';
  let body = '火山警戒レベルが更新されました。最新情報をご確認ください。';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [300, 100, 300, 100, 400],
    data: { url: './index.html' },
    requireInteraction: true // iPadの画面にユーザーが消すまで残り続ける設定
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知がタップされたらアプリを開く
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) client = clientList[i];
        }
        return client.focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});


```
