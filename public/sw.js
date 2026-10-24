/* Map Veto service worker: keeps the app, fonts and map art available offline (LAN events, weak Wi-Fi).
   Pages are network-first so a deploy shows up right away; hashed assets and images are cache-first. */
const SHELL = 'mv-shell-v1';
const RUNTIME = 'mv-runtime-v1';
const PRECACHE = ['/', '/favicon.svg', '/logo.svg', '/manifest.webmanifest'];
const MEDIA = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|media\.valorant-api\.com|valorant-api\.com|wsrv\.nl)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(SHELL)).put('/', res.clone());
    return res;
  } catch {
    return (await caches.match('/')) ?? Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') (await caches.open(RUNTIME)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req);
  const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit ?? fresh;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // rooms, short links and the rotation must always be live
    if (url.pathname.startsWith('/api/')) return;
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req));
    if (url.pathname.startsWith('/assets/')) return e.respondWith(cacheFirst(req));
    return e.respondWith(staleWhileRevalidate(req));
  }
  if (MEDIA.test(req.url)) e.respondWith(url.hostname.includes('valorant-api.com') && url.pathname.startsWith('/v1/') ? staleWhileRevalidate(req) : cacheFirst(req));
});
