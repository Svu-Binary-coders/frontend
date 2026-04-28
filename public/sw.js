import {
  cacheFirstMedia,
  isMediaUrl,
  purgeExpired,
} from "./sw-strategies/mediaCache.js";

// install sw and skip waiting to activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting(); // new sw active when installed, old sw skip waiting
});

// active event caled when the service worker is activated and ready to control pages
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      purgeExpired(), // cache cleanup , old entries remove
    ]),
  );
});

// if event is fetch type , then cache it
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // only media fil
  if (isMediaUrl(url)) {
    event.respondWith(cacheFirstMedia(event.request));
    return;
  }

  // othrs file use network first strategy
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // if network fetch is successful, update the cache
        return caches.open("dynamic-cache-v1").then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // if network fails, try to serve from cache
        return caches.match(event.request);
      }),
  );
});
