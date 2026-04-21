import { useEffect } from "react";

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // background update check
        reg.addEventListener("updatefound", () => {
          reg.installing?.addEventListener("statechange", function () {
            if (
              this.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[SW] New version ready");
            }
          });
        });
      })
      .catch((err) => console.error("[SW] Registration failed:", err));
  }, []);
}

//  Cache management utilities
// যেকোনো component থেকে import করে use করা যাবে

/** নির্দিষ্ট media URL টা cache এ আছে কিনা */
export async function isMediaCached(url: string): Promise<boolean> {
  if (!("caches" in window)) return false;
  const cache = await caches.open("media-cache-v1");
  const match = await cache.match(url);
  return !!match;
}

/** পুরো media cache clear করো (settings page এ কাজে লাগবে) */
export async function clearMediaCache(): Promise<void> {
  if (!("caches" in window)) return;
  await caches.delete("media-cache-v1");
}

/** Cache এ কতটা entry আছে */
export async function getMediaCacheSize(): Promise<number> {
  if (!("caches" in window)) return 0;
  const cache = await caches.open("media-cache-v1");
  const keys = await cache.keys();
  return keys.length;
}
