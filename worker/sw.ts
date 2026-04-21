// public/sw.js — Service Worker for media caching

const MEDIA_CACHE = "media-cache-v1";
const MAX_CACHE_SIZE = 200; // সর্বোচ্চ কতটা entry রাখবো

// Cloudinary এবং Supabase URL pattern
const MEDIA_ORIGINS = ["res.cloudinary.com", "supabase.co", "supabase.com"];

// কোন file type cache করবো
const CACHEABLE_EXTENSIONS =
  /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|mp3|ogg|wav|m4a|aac)(\?.*)?$/i;

const isMediaUrl = (url) => {
  try {
    const u = new URL(url);
    return (
      MEDIA_ORIGINS.some((origin) => u.hostname.includes(origin)) &&
      CACHEABLE_EXTENSIONS.test(u.pathname)
    );
  } catch {
    return false;
  }
};

//  Install
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

//  Activate
self.addEventListener("activate", (e) => {
  e.waitUntil(
    // পুরনো cache version clean করো
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== MEDIA_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

//  Fetch — Cache First for media
self.addEventListener("fetch", (e) => {
  const { request } = e;

  // GET request এবং media URL হলেই cache করবো
  if (request.method !== "GET" || !isMediaUrl(request.url)) return;

  e.respondWith(
    caches.open(MEDIA_CACHE).then(async (cache) => {
      // Cache এ আছে কিনা দেখো
      const cached = await cache.match(request);
      if (cached) {
        return cached; // ← Cache hit! Cloudinary touch হবে না
      }

      // Cache miss — network থেকে আনো
      try {
        const response = await fetch(request.clone());

        // Valid response হলেই cache করো
        if (response && response.status === 200) {
          // Cache size limit — পুরনো entry সরাও
          await trimCache(cache, MAX_CACHE_SIZE - 1);
          cache.put(request, response.clone());
        }

        return response;
      } catch {
        // Network fail — cached version থাকলে দাও
        const fallback = await cache.match(request);
        if (fallback) return fallback;
        throw new Error("Network and cache both failed");
      }
    }),
  );
});

//  Cache size control
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    // FIFO — সবচেয়ে পুরনো entry বাদ দাও
    const toDelete = keys.slice(0, keys.length - maxEntries + 1);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}
