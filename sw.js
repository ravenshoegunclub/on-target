/* On Target v3.9.0 — offline support
   Change CACHE when files change so phones pick up the new version. */
const CACHE = 'on-target-v3.10.1';
const PHOTO_CACHE = 'on-target-photos';
const SHELL = [
  './',
  'index.html',
  'styles.css?v=3.10.1',
  'app.js?v=3.10.1',
  'manifest.webmanifest?v=3.10.1',
  'icons/icon-192.png?v=3.10.1',
  'icons/favicon-48.png?v=3.10.1',
  'icons/apple-touch-icon.png?v=3.10.1'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== PHOTO_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages: try the network first, fall back to the saved copy with no signal
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }

  // Club photos: keep a copy once seen, so albums still open with no signal
  if (url.hostname === 'lh3.googleusercontent.com') {
    e.respondWith(
      caches.open(PHOTO_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  // The default event photos (v3.6.0): kept like club photos, so they show at the range with no signal
  if (url.origin === location.origin && url.pathname.includes('/images/events/')) {
    e.respondWith(
      caches.open(PHOTO_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  // App files and fonts: saved copy first, refresh in the background
  if (url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
