const CACHE_NAME = "paradox-gallery-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/css/global.css",
  "/css/gallery.css"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetching for Offline Support
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
