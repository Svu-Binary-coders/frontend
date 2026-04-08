import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export const useLinkPreview = (url: string | null) => {
  return useQuery<LinkPreview>({
    queryKey: ["link-preview", url],
    queryFn: async () => {
      const { data } = await api.get(
        `/chats/link-preview?url=${encodeURIComponent(url!)}`,
      );
      if (!data.success) throw new Error("Failed");
      return data.preview;
    },
    enabled: !!url,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });
};
