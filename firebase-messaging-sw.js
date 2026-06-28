importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

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

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || '🚨 火山警報';
  const notificationOptions = {
    body: payload.notification?.body || '火山情報が更新されました。',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [300, 100, 300, 100, 400]
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
