const CACHE = 'vpc-v13';

// Static assets that rarely change → safe to serve cache-first.
const STATIC_ASSETS = ['/styles.css', '/manifest.json', '/icon.svg'];

// App shell — precached so the app still opens offline, but served
// network-first (see fetch handler) so code changes appear on the next load
// instead of lagging a refresh behind.
const SHELL = [
  '/',
  '/index.html',
  '/vault-pine-collective.html',
  '/sales-dashboard.html',
  '/goals-dashboard.html',
  '/expenses.html',
  '/events.html',
  '/inventory.html',
  '/review.html',
  '/analytics.html',
  '/production.html',
  '/content.html',
  '/studio.html',
  '/guru.html',
  '/vendor-calendar.html',
  '/event-signup.html',
  '/login.html',
  '/reset-password.html',
  '/util.js',
  '/shared.js',
  '/supabase-sync.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([...STATIC_ASSETS, ...SHELL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Decide strategy by request type.
//  - HTML navigations & JS  → network-first (fresh code/markup, fall back to cache offline)
//  - everything else (css, images, fonts) → cache-first (fast, rarely changes)
function isAppCode(req, url) {
  return (
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.destination === 'script' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js')
  );
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never intercept cross-origin requests (Supabase, CDNs) — let them hit the network.
  if (url.origin !== self.location.origin) return;

  if (isAppCode(req, url)) {
    // Network-first: try fresh, cache the result, fall back to cache when offline.
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets, revalidating in the background.
  e.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});

// Push notification handler
self.addEventListener('push', (e) => {
  const data = e.data
    ? e.data.json()
    : { title: 'VPC Alert', body: 'You have a new notification.' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'VPC Alert', {
      body: data.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
