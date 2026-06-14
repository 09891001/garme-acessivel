/* P22: Increment ASSETS_VERSION when any asset file changes to force cache refresh */
const ASSETS_VERSION = 2;
const CACHE_NAME = "garme-v" + ASSETS_VERSION;
const ASSETS = [
  "/garme-acessivel/",
  "/garme-acessivel/index.html",
  "/garme-acessivel/css/stylo.css",
  "/garme-acessivel/js/config.js",
  "/garme-acessivel/js/voz.js",
  "/garme-acessivel/js/participantes.js",
  "/garme-acessivel/js/palavras.js",
  "/garme-acessivel/js/palavras-extras.js",
  "/garme-acessivel/js/desenho.js",
  "/garme-acessivel/js/jogo.js",
  "/garme-acessivel/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
