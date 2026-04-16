import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_URL } from "@/lib/chat-helpers";
import { Message, MessageStatus } from "@/types/chat";
import { useChatStore } from "@/stores/chatStore";
import api from "@/lib/axios";
import { saveChatOffline, getChatOffline } from "@/app/indexDB/messageDB";

interface RawMessage {
  _id: string;
  senderId: string;
  messageStatus: MessageStatus;
  [key: string]: unknown;
}

interface PageResult {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

const deduplicateMessages = (messages: Message[]): Message[] => {
  const seen = new Set<string>();
  return messages.filter((m) => {
    if (!m._id || seen.has(m._id)) return false;
    seen.add(m._id);
    return true;
  });
};

export const useChatHistory = (
  myId: string,
  chatId?: string,
  contactId?: string,
) => {
  const query = useInfiniteQuery<PageResult>({
    queryKey: ["messages", chatId],
    networkMode:"offlineFirst",

    queryFn: async ({ pageParam }) => {
      try {
        const cursor = pageParam ? `&before=${pageParam}` : "";
        const { data } = await api(
          `/chats/${myId}/${chatId}/${contactId}/?limit=20${cursor}`,
        );
        if (!data.success) throw new Error("Failed to load messages");

        const messages: Message[] = data.messages.map((m: RawMessage) => ({
          ...m,
          status:
            m.senderId === myId
              ? (m.messageStatus as MessageStatus)
              : undefined,
        }));

        return {
          messages,
          hasMore: data.pagination.hasMore,
          nextCursor: data.pagination.nextCursor ?? null,
        };
      } catch (error) {
        console.log("Error fetching messages, trying offline...", error);

        const offlineMessages = await getChatOffline(chatId ?? "");
        if (offlineMessages && offlineMessages.length > 0) {
          return {
            messages: offlineMessages,
            hasMore: false,
            nextCursor: null,
          };
        }
        throw error;
      }
    },

    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore || !lastPage.nextCursor) return undefined;
      const prevCursor = allPages[allPages.length - 2]?.nextCursor;
      if (lastPage.nextCursor === prevCursor) return undefined;
      return lastPage.nextCursor;
    },

    enabled: !!chatId && !!contactId && !!myId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (
      query.data &&
      useChatStore.getState().activeContact?.customChatId === chatId
    ) {
      const allMessages = [...query.data.pages]
        .reverse()
        .flatMap((p) => p.messages);

      const finalMessages = deduplicateMessages(allMessages);

      useChatStore.setState({
        messages: finalMessages,
      });

      if (finalMessages.length > 0) {
        saveChatOffline(chatId ?? "", finalMessages);
      }
    }
  }, [query.data, chatId]);

  return query;
};
