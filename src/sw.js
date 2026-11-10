// Offline cache for the hosted build (index.html). Version is stamped by build.sh.
const V = 'hearthdeep-__VERSION__';
const CORE = ['./', 'index.html', 'game.js', 'vendor/three.module.js', 'vendor/three.core.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // the game itself: cache first, so it starts offline; a new build ships a new cache
    e.respondWith(caches.match(r, { ignoreSearch: true }).then((hit) => hit || fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; })));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    // fonts: serve what we have, refresh in the background
    e.respondWith(caches.open(V).then((c) => c.match(r).then((hit) => { const net = fetch(r).then((res) => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }).catch(() => hit); return hit || net; })));
  }
});
