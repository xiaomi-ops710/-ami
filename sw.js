// -ami/sw.js
// 火山防災情報局 PWA 用 Service Worker
// PWABuilder の「Service Workerが検出されない」警告を解消するための最小実装です。

const CACHE_NAME = 'kazan-bousai-cache-v9.18';
const OFFLINE_URLS = [
  '/-ami/index.html',
  '/-ami/manifest.json',
  '/-ami/tailwind.css?v=9.18',
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

// キャッシュ対象にする外部ホスト(アプリの起動に必要な静的ライブラリ・フォントのみ)
// ※ Firestore / Auth / FCM / GAS などのAPI通信は絶対にキャッシュしない
const CACHEABLE_EXTERNAL = [
  'www.gstatic.com',        // Firebase SDK
  'cdn.jsdelivr.net',       // SortableJS
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

function shouldHandle(request) {
  if (request.method !== 'GET') return false;
  if (request.headers.has('range')) return false; // 206(部分応答)はキャッシュしない
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.origin === self.location.origin) return true;
  return CACHEABLE_EXTERNAL.includes(url.hostname) &&
    (url.hostname !== 'www.gstatic.com' || url.pathname.startsWith('/firebasejs/'));
}

// fetch時：ネットワーク優先、失敗したらキャッシュにフォールバック
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!shouldHandle(request)) return; // 対象外はブラウザの通常処理に任せる

  event.respondWith((async () => {
    const store = (response) => {
      if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
        const copy = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
        );
      }
    };
    try {
      const netPromise = fetch(request);
      // 通信が遅い(5秒超)場合、キャッシュがあればそれを先に表示して起動の待ち時間を短縮する
      const slow = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
      let response = await Promise.race([netPromise, slow]);
      if (response === null) {
        const cachedFast = await caches.match(request);
        if (cachedFast) {
          netPromise.then(store).catch(() => {}); // 後から届いた最新版はキャッシュだけ更新
          return cachedFast;
        }
        response = await netPromise; // キャッシュが無ければ通信完了まで待つ
      }
      store(response);
      return response;
    } catch (err) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await caches.match('/-ami/index.html');
        if (fallback) return fallback;
      }
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});

// 通知タップ時に開くページ(同一オリジン・アプリのスコープ内のみ許可)
const DEFAULT_URL = '/-ami/index.html';
function resolveTargetUrl(raw) {
  try {
    if (!raw) return DEFAULT_URL;
    const u = new URL(raw, self.location.origin);
    if (u.origin !== self.location.origin || !u.pathname.startsWith('/-ami/')) return DEFAULT_URL;
    return u.pathname + u.search + u.hash;
  } catch (e) {
    return DEFAULT_URL;
  }
}

// プッシュ通知受信時
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: '火山防災情報局', body: event.data ? event.data.text() : '新着情報があります' };
  }

  // FCMのペイロードは送信方法によって形が異なる(以下のいずれかで届く):
  //  ①{ notification: { title, body }, data: {...} }  ← 通知メッセージ形式
  //  ②{ data: { title, body, ... } }                   ← データメッセージ形式
  //  ③{ title, body }                                  ← トップレベル直書き
  const src = payload.notification || payload.data || payload;
  const title = src.title || payload.title || '火山防災情報局';

  // タップ時の遷移先: webpush.fcm_options.link(fcmOptions / fcm_options)→ data.url / data.link の順で探す
  const fcmOpt = payload.fcmOptions || payload.fcm_options || {};
  const data = payload.data || {};
  const targetUrl = resolveTargetUrl(fcmOpt.link || data.url || data.link || src.url || src.click_action);

  const options = {
    body: src.body || payload.body || '新着の火山情報があります。',
    // 大アイコンは非表示（iconフィールドを指定しない）
    // ステータスバーに表示される小アイコン（★白一色・透過背景のPNGを用意すること）
    badge: '/-ami/notification-badge.png',
    data: { url: targetUrl }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = resolveTargetUrl(event.notification.data && event.notification.data.url);
  const targetAbs = new URL(target, self.location.origin).href;

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url.includes('/-ami/') && 'focus' in client) {
        await client.focus();
        // 開いているアプリが別ページなら、遷移先へ移動させる
        if (client.url !== targetAbs && 'navigate' in client) {
          try { await client.navigate(targetAbs); } catch (e) { /* 移動できなくてもフォーカスは成功している */ }
        }
        return;
      }
    }
    if (clients.openWindow) return clients.openWindow(targetAbs);
  })());
});
