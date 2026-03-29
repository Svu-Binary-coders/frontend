import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: { queries: { staleTime: 60 * 1000 } },
    });
  } else {
    if (!browserQueryClient) browserQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          staleTime: 1000 * 60 * 2,
        },
      },
    });
    return browserQueryClient;
  }
}