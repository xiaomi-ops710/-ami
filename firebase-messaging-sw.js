// Firebase Cloud Messaging (FCM) のバックグラウンド受信専用ワーカー

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 🔒 Firebase Configをここに貼り付けます
const firebaseConfig = {
    apiKey: "AIzaSyDgMQ8XAA4y717qE8c1sWL5C-XKDzOfUpc",
    authDomain: "ohamigo-425a8.firebaseapp.com",
    projectId: "ohamigo-425a8",
    storageBucket: "ohamigo-425a8.firebasestorage.app",
    messagingSenderId: "342829309449",
    appId: "1:342829309449:web:9937c81eaa8f48436262d8"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// アプリが完全に閉じている状態（バックグラウンド）で通知を受け取ったときの処理
messaging.onBackgroundMessage(function(payload) {
  console.log('バックグラウンドで通知を受信しました:', payload);

  const notificationTitle = payload.notification.title || '🚨 火山警報';
  const notificationOptions = {
    body: payload.notification.body || '火山状況が更新されました。',
    icon: './icon-192.png',
    vibrate: [300, 100, 300, 100, 400],
    requireInteraction: true // ユーザーがタップするまで画面に残り続ける
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
