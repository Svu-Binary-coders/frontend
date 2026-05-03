"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del, createStore } from "idb-keyval";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useChatStore } from "@/stores/chatStore";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { publicPaths } from "@/lib/axios";
import { getQueryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { cn } from "@/lib/utils";
import { useChatSettingsStore } from "@/stores/chatSettingsStore";

const appStore =
  typeof window !== "undefined"
    ? createStore("FlexChatDB", "app_data")
    : undefined;

const DAY = 1000 * 60 * 60 * 24;
const VISIT_KEY = "user_visit_history";
const PERSIST_KEY = "flexchat_query_cache";

async function getAdaptiveMaxAge(): Promise<number> {
  const now = Date.now();

  const log: number[] = (await get(VISIT_KEY, appStore)) ?? [];
  const recent = log.filter((t) => now - t < DAY * 30);
  const lastVisit = recent[recent.length - 1];
  if (!lastVisit || now - lastVisit > 1000 * 60 * 60) {
    recent.push(now);
    await set(VISIT_KEY, recent, appStore);
  }

  const visitsThisWeek = recent.filter((t) => now - t < DAY * 7).length;

  if (visitsThisWeek >= 14) return DAY * 14;
  if (visitsThisWeek >= 7) return DAY * 10;
  if (visitsThisWeek >= 3) return DAY * 7;
  if (visitsThisWeek >= 1) return DAY * 4;
  return DAY * 2;
}

let persister: ReturnType<typeof createAsyncStoragePersister> | undefined;

if (typeof window !== "undefined") {
  persister = createAsyncStoragePersister({
    storage: {
      getItem: (key) => get(key, appStore),
      setItem: (key, value) => set(key, value, appStore),
      removeItem: (key) => del(key, appStore),
    },
    key: PERSIST_KEY,
    throttleTime: 5000,
  });
}

function AppInit() {
  const { data: user } = useAuth();
  useContacts(user?._id || "");
  return null;
}

function SocketInit() {
  useEffect(() => {
    const chatStore = useChatStore.getState();
    const cleanup = chatStore.initSocket();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);
  return null;
}

function AppearanceInit({ children }: { children: React.ReactNode }) {
  const { fontStyle, textSize, wallpaper, compactMode } = useAppearanceStore();

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isClient) return <div className="invisible">{children}</div>;

  return (
    <div
      className={cn(
        "min-h-screen transition-all duration-300",
        fontStyle,
        textSize,
        compactMode ? "compact-ui-active" : "",
        `wallpaper-${wallpaper}`,
      )}
      style={{ fontSize: textSize }}
    >
      {children}
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicPaths.includes(pathname);
  const queryClient = getQueryClient();

  // load all chat settings on app start to avoid later lags when user opens a chat for the first time
  const isLoadedSettings = useChatSettingsStore((s) => s.isLoaded);
  const loadAllSettings = useChatSettingsStore((s) => s.loadAll);

  useEffect(() => {
    loadAllSettings();
  }, [loadAllSettings]);


  const [maxAge, setMaxAge] = useState<number>(DAY * 7);

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // register service worker on client side
  // useEffect(() => {
  //   if ("serviceWorker" in navigator) {
  //     navigator.serviceWorker
  //       .register("/sw.js", { type: "module" })
  //       .then((registration) => {
  //         console.log(" Service Worker Registered:", registration.scope);
  //       })
  //       .catch((error) => {
  //         console.error(" Service Worker Registration failed:", error);
  //       });
  //   }
  // }, []);

  useEffect(() => {
    if (isClient) {
      getAdaptiveMaxAge().then((age) => setMaxAge(age));
    }
  }, [isClient]);

  const innerContent = (
    <TooltipProvider>
      <AppearanceInit>
        {!isPublic && (
          <>
            <AppInit />
            <SocketInit />
          </>
        )}
        <Toaster position="top-center" richColors closeButton />
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AppearanceInit>
    </TooltipProvider>
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {isClient && persister ? (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge,
            buster: "v1.0",
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => {
                return (
                  query.meta?.persist === true &&
                  query.state.status === "success"
                );
              },
            },
          }}
        >
          {innerContent}
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={queryClient}>
          {innerContent}
        </QueryClientProvider>
      )}
    </ThemeProvider>
  );
}
