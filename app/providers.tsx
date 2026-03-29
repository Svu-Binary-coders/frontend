"use client";

import { useSyncExternalStore, useEffect } from "react";
import { usePathname } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
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
  const { fontStyle, textSize, wallpaper, compactMode, setTextSize } =
    useAppearanceStore();

  const isClient = useSyncExternalStore(
    () => () => {}, // Subscribe (empty no-op)
    () => true, // Client-side value
    () => false, // Server-side (Hydration) value
  );

  if (!isClient) {
    return <div className="invisible">{children}</div>;
  }

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

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}
