/* Простой офлайн-кэш для «ДворФит». Хранит только статические файлы приложения — личные данные всегда остаются в localStorage. */
var CACHE_NAME = "dvorfit-cache-v1";
var CORE_ASSETS = [
  "./",
  "./index.html",
  "./base.css",
  "./style.css",
  "./manifest.json",
  "./data/categories.js",
  "./data/trainers.js",
  "./data/mapDefault.js",
  "./data/templates.js",
  "./js/storage.js",
  "./js/planner.js",
  "./js/icons.js",
  "./js/ui.js",
  "./js/view-today.js",
  "./js/view-trainers.js",
  "./js/view-map.js",
  "./js/view-progress.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200 && response.type === "basic") {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });
    })
  );
});
