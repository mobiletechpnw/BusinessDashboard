const CACHE = 'vpc-v5';
const ASSETS = [
  '/', '/index.html', '/vault-pine-collective.html',
  '/sales-dashboard.html', '/goals-dashboard.html',
  '/expenses.html', '/events.html', '/review.html', '/analytics.html',
  '/production.html', '/content.html', '/guru.html',
  '/shared.js', '/supabase-sync.js', '/styles.css', '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || fresh;
    })
  );
});

// Push notification handler
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'VPC Alert', body: 'You have a new notification.' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'VPC Alert', {
      body:  data.body  || '',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      data:  { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
