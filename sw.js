const CACHE_NAME = 'volcano-monitor-v1.6-pro';
const urlsToCache = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))));
  self.clients.claim();
});

// Firebase Cloud Messaging (FCM) の統合
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDgMQ8XAA4y717qE8c1sWL5C-XKDzOFUpc",
    authDomain: "ohamigo-425a8.firebaseapp.com",
    projectId: "ohamigo-425a8",
    storageBucket: "ohamigo-425a8.firebasestorage.app",
    messagingSenderId: "342829309449",
    appId: "1:342829309449:web:9937c81eaa8f48436262d8"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || '🚨 火山防災情報局';
  const notificationOptions = {
    body: payload.notification?.body || '最新の警戒情報が更新されました。',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [300, 100, 300, 100, 400],
    data: { url: './index.html' },
    requireInteraction: true
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    if (clientList.length > 0) return clientList[0].focus();
    return clients.openWindow('./index.html');
  }));
});
