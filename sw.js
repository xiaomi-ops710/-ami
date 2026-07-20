// -ami/sw.js
// 火山防災情報局 PWA 用 Service Worker
// PWABuilder の「Service Workerが検出されない」警告を解消するための最小実装です。

const CACHE_NAME = 'kazan-bousai-cache-v2';
const OFFLINE_URLS = [
  '/-ami/index.html',
  '/-ami/manifest.json',
  '/-ami/tailwind.css?v=9.2',
  '/-ami/icon-192.png',
  '/-ami/icon-512.png'
];

// インストール時：基本アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(() => {
        // 一部アセットが取得できなくてもインストール自体は継続させる
      });
    })
  );
  self.skipWaiting();
});

// 有効化時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// fetch時：ネットワーク優先、失敗したらキャッシュにフォールバック
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// プッシュ通知受信時
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: '火山防災情報局', body: event.data ? event.data.text() : '新着情報があります' };
  }

  // 🚀 バグ修正: 通知内容が固定文言になる問題への対策。
  // FCMのペイロードは送信方法によって形が異なる(以下のいずれかで届く):
  //  ①{ notification: { title, body }, data: {...} }  ← 通知メッセージ形式
  //  ②{ data: { title, body, ... } }                   ← データメッセージ形式
  //  ③{ title, body }                                  ← トップレベル直書き
  // すべてのパターンに対応できるよう、優先順位をつけて実際の値を探す。
  const src = payload.notification || payload.data || payload;
  const title = src.title || payload.title || '火山防災情報局';
  const options = {
    body: src.body || payload.body || '新着の火山情報があります。',
    // 大アイコンは非表示（iconフィールドを指定しない）
    // ステータスバーに表示される小アイコン（★白一色・透過背景のPNGを用意すること）
    badge: '/-ami/notification-badge.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/-ami/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/-ami/index.html');
      }
    })
  );
});
