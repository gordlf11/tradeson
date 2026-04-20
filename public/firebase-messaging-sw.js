// Firebase Cloud Messaging service worker
// Handles background push notifications when the app is not in the foreground

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBcsGiKIVsjSSYRJZOWG8c5NG0oTZQedco",
  authDomain: "tradeson-491518.firebaseapp.com",
  projectId: "tradeson-491518",
  storageBucket: "tradeson-491518.firebasestorage.app",
  messagingSenderId: "63629008205",
  appId: "1:63629008205:web:78644fd6b0b905a4342b04",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'TradesOn';
  const body  = payload.notification?.body  || '';

  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data,
  });
});

// On notification click — focus the app or open it
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
