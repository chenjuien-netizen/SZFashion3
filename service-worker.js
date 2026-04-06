const CACHE_NAME = "szfashion-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./history.html",
  "./detail.html"
];
const EXTERNAL_ASSETS = [
  "https://cdn.tailwindcss.com?plugins=forms,container-queries",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL).then(function() {
        return Promise.all(EXTERNAL_ASSETS.map(function(url) {
          const request = new Request(url, { mode: "no-cors" });
          return fetch(request).then(function(response) {
            return cache.put(request, response);
          }).catch(function() {
            return null;
          });
        }));
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        return key === CACHE_NAME ? null : caches.delete(key);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request).then(function(response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put("./index.html", clone);
        });
        return response;
      }).catch(function() {
        return caches.match("./index.html");
      })
    );
    return;
  }

  const shouldRuntimeCache = url.origin === self.location.origin
    || /cdn\.tailwindcss\.com$/.test(url.hostname)
    || /fonts\.googleapis\.com$/.test(url.hostname)
    || /fonts\.gstatic\.com$/.test(url.hostname);

  if (!shouldRuntimeCache) return;

  event.respondWith(
    caches.match(request).then(function(cached) {
      const networkFetch = fetch(request).then(function(response) {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached;
      });
      return cached || networkFetch;
    })
  );
});
