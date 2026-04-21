//  src/lib/sw/strategies/offlineStrategy.js

export const APP_CACHE = "app-cache-v1";

// Next.js static assets cache
export const STATIC_ORIGINS = ["/_next/static/", "/icons/", "/fonts/"];

export const isStaticAsset = (url) => {
  try {
    const u = new URL(url);
    return STATIC_ORIGINS.some((p) => u.pathname.startsWith(p));
  } catch {
    return false;
  }
};

// Static assets: Cache First (rarely change)
export async function cacheFirstStatic(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request.clone());
  if (response?.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

// API/page: Network First with offline fallback
export async function networkFirstWithFallback(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Offline and no cache available");
  }
}
