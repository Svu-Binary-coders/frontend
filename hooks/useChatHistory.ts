import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_URL } from "@/lib/chat-helpers";
import { Message, MessageStatus } from "@/types/chat";
import { useChatStore } from "@/stores/chatStore";

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

    queryFn: async ({ pageParam }) => {
      // pageParam = nextCursor (oldest message _id)
      const cursor = pageParam ? `&before=${pageParam}` : "";
      const res = await fetch(
        `${API_URL}/chats/${myId}/${chatId}/${contactId}/?limit=20${cursor}`,
      );
      const data = await res.json();
      if (!data.success) throw new Error("Failed to load messages");

      const messages: Message[] = data.messages.map((m: RawMessage) => ({
        ...m,
        status:
          m.senderId === myId ? (m.messageStatus as MessageStatus) : undefined,
      }));

      return {
        messages,
        // ── API response থেকে সরাসরি নাও ──
        hasMore: data.pagination.hasMore,
        nextCursor: data.pagination.nextCursor ?? null,
      };
    },

    initialPageParam: undefined as string | undefined,

    // nextCursor দিয়ে পরের (পুরনো) page fetch
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,

    enabled: !!chatId && !!contactId && !!myId,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (
      query.data &&
      useChatStore.getState().activeContact?.customChatId === chatId
    ) {
      // pages[0] = সবচেয়ে নতুন, pages[last] = সবচেয়ে পুরনো
      // পুরনো page আগে, নতুন page পরে → oldest on top, newest at bottom
      const allMessages = [...query.data.pages]
        .reverse() // পুরনো আগে
        .flatMap((p) => p.messages); // প্রতিটা page-এ messages already asc order-এ

      useChatStore.setState({
        messages: deduplicateMessages(allMessages),
      });
    }
  }, [query.data, chatId]);

  return query;
};
