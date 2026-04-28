//  src/lib/sw/strategies/mediaCache.js

export const MEDIA_CACHE = "media-cache-v2";
export const META_CACHE = "media-meta-v2";
export const MAX_CACHE_SIZE = 200;
export const TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

export const MEDIA_ORIGINS = [
  "res.cloudinary.com",
  "supabase.co",
  "supabase.com",
];

export const CACHEABLE_EXT =
  /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|mp3|ogg|wav|m4a|aac)(\?.*)?$/i;

export const isMediaUrl = (url, method = "GET") => {
  if (method !== "GET") return false; // POST/PUT/DELETE cache করা যায় না
  try {
    const u = new URL(url);
    return (
      MEDIA_ORIGINS.some((o) => u.hostname.includes(o)) &&
      CACHEABLE_EXT.test(u.pathname)
    );
  } catch {
    return false;
  }
};

//  Meta key: real URL → valid https URL
// Cache API শুধু http/https scheme চেনে
// তাই media URL কে encode করে fake-but-valid https URL বানাই
const metaUrl = (url) =>
  `https://sw-meta-store.internal/${encodeURIComponent(url)}`;

async function saveTimestamp(url) {
  try {
    const metaCache = await caches.open(META_CACHE);
    await metaCache.put(
      metaUrl(url),
      new Response(JSON.stringify({ cachedAt: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch (e) {
    console.warn("[SW] saveTimestamp failed:", e.message);
  }
}

async function getTimestamp(url) {
  try {
    const metaCache = await caches.open(META_CACHE);
    const res = await metaCache.match(metaUrl(url));
    if (!res) return null;
    const { cachedAt } = await res.json();
    return typeof cachedAt === "number" ? cachedAt : null;
  } catch {
    return null;
  }
}

async function deleteTimestamp(url) {
  try {
    const metaCache = await caches.open(META_CACHE);
    await metaCache.delete(metaUrl(url));
  } catch {
    // ignore
  }
}

//  Cache size trim
export async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length < maxEntries) return;
  const toDelete = keys.slice(0, keys.length - maxEntries + 1);
  await Promise.all(
    toDelete.map(async (req) => {
      await cache.delete(req);
      await deleteTimestamp(req.url);
    }),
  );
}

//  Expired entries cleanup
export async function purgeExpired() {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const keys = await cache.keys();
    const now = Date.now();
    const expired = [];

    for (const req of keys) {
      const cachedAt = await getTimestamp(req.url);
      if (!cachedAt || now - cachedAt > TTL_MS) {
        expired.push(req);
      }
    }

    await Promise.all(
      expired.map(async (req) => {
        await cache.delete(req);
        await deleteTimestamp(req.url);
      }),
    );

    if (expired.length > 0) {
      console.log(`[SW] Purged ${expired.length} expired entries`);
    }
  } catch (e) {
    console.warn("[SW] purgeExpired failed:", e.message);
  }
}

//  Main strategy: Cache First with TTL
export async function cacheFirstMedia(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const url = request.url;

  // Cache hit check
  const cached = await cache.match(request);
  const cachedAt = cached ? await getTimestamp(url) : null;
  const fresh = cachedAt && Date.now() - cachedAt <= TTL_MS;

  // Fresh cache → সরাসরি দাও, network touch হবে না
  if (cached && fresh) return cached;

  // Cache miss বা expired → network
  try {
    const response = await fetch(request);
    const ok =
      response?.status === 200 ||
      response?.status === 0 ||
      response?.status === 206;

    if (ok) {
      // cache save আলাদা try-catch — storage full হলেও response যাবে
      try {
        await trimCache(cache, MAX_CACHE_SIZE - 1);
        await cache.put(request, response.clone());
        await saveTimestamp(url);
      } catch (cacheErr) {
        console.warn("[SW] Cache write skipped:", cacheErr.message);
      }
    }

    return response;
  } catch {
    // Offline — expired cache হলেও দাও
    if (cached) return cached;
    return new Response("", { status: 503, statusText: "Offline" });
  }
}
