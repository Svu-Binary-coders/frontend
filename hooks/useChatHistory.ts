/* eslint-disable @typescript-eslint/no-explicit-any */
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Message, MessageStatus } from "@/types/chat";
import { useChatStore } from "@/stores/chatStore";
import api from "@/lib/axios";
import { saveChatOffline, getChatOffline } from "@/app/indexDB/messageDB";
import { secureDecryptMessage } from "@/helper/E2EHelper";

interface RawMessage {
  _id: string;
  senderId: string;
  messageStatus: MessageStatus;
  content: string;
  replyTo?: {
    _id: string;
    content: string;
    senderId: string;
  } | null;
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

const isEncrypted = (text: unknown): boolean => {
  let str = "";
  if (typeof text === "string") str = text;
  else if (text && typeof text === "object")
    str = (text as any).text || (text as any).content || "";

  return (
    typeof str === "string" && (str.startsWith("v1:") || str.startsWith("v4:"))
  );
};

const safeDecrypt = async (content: any, chatId: string, publicKey: string) => {
  // যদি ডাটাবেস থেকে ভুলবশত আগে থেকেই ডিক্রিপ্টেড অবজেক্ট চলে আসে
  if (content && typeof content === "object" && "flags" in content) {
    return {
      text:
        typeof content.text === "string"
          ? content.text
          : "🔒 [Decryption Error]",
      flags: content.flags,
      conditions: content.conditions || "NONE",
    };
  }

  // যদি স্ট্রিং বা অন্য কিছু আসে, তবে সেখান থেকে শুধু স্ট্রিংটি বের করে নেওয়া
  let strContent = "";
  if (typeof content === "string") strContent = content;
  else if (content && typeof content === "object")
    strContent = content.text || content.content || "";

  if (!isEncrypted(strContent)) {
    return {
      text: strContent,
      flags: { isViewOnce: false, isDecoy: false, isHighlyForwarded: false },
      conditions: "NONE",
    };
  }
  try {
    return await secureDecryptMessage(strContent, chatId, publicKey);
  } catch {
    return {
      text: "🔒 [Encrypted Message]",
      flags: { isViewOnce: false, isDecoy: false, isHighlyForwarded: false },
      conditions: "NONE",
    };
  }
};

// safely decrypt reply content
const safeDecryptReplyTo = async (
  replyTo: RawMessage["replyTo"] | undefined | null,
  chatId: string,
  publicKey: string,
): Promise<Message["replyTo"]> => {
  if (!replyTo) return null;
  if (!isEncrypted(replyTo.content)) return replyTo as Message["replyTo"];

  const decryptedObj = await safeDecrypt(replyTo.content, chatId, publicKey);
  return { ...replyTo, content: decryptedObj.text } as Message["replyTo"];
};

// ==========================================
// HOOK
export const useChatHistory = (
  myId: string,
  chatId?: string,
  contactId?: string,
) => {
  const query = useInfiniteQuery<PageResult>({
    queryKey: ["messages", chatId],
    networkMode: "offlineFirst",

    queryFn: async ({ pageParam }) => {
      const contact = useChatStore
        .getState()
        .contacts.find((c) => c._id === contactId);
      const peerPublicKey = contact?.publicKey;

      //  Load offline messages first
      if (!pageParam) {
        getChatOffline(chatId ?? "")
          .then(async (offlineMessages) => {
            if (!offlineMessages?.length) return;

            const recentOfflineMessages = offlineMessages.slice(-50);

            const decrypted = await Promise.all(
              recentOfflineMessages.map(async (m: any) => {
                const originalEncrypted =
                  typeof m.content === "string"
                    ? m.content
                    : m.content?.text || m.content?.content || "";
                const decryptedObj =
                  peerPublicKey && chatId
                    ? await safeDecrypt(
                        originalEncrypted,
                        chatId,
                        peerPublicKey,
                      )
                    : {
                        text: originalEncrypted,
                        flags: { isViewOnce: false, isHighlyForwarded: false },
                        conditions: "NONE",
                      };

                const decryptedReplyTo =
                  peerPublicKey && chatId
                    ? await safeDecryptReplyTo(m.replyTo, chatId, peerPublicKey)
                    : (m.replyTo ?? null);

                return {
                  ...m,
                  content: decryptedObj.text, // Text from payload
                  isBurn: decryptedObj.flags?.isViewOnce || false, // ViewOnce flag
                  conditions: decryptedObj.conditions || "NONE", // Any conditions applied
                  encryptedContent: originalEncrypted, // encrypted content for saving to indexedDB
                  replyTo: decryptedReplyTo,
                } as Message;
              }),
            );

            const current = useChatStore.getState().messages;
            useChatStore.setState({
              messages: deduplicateMessages([...decrypted, ...current]),
            });
          })
          .catch((err) => console.log("No offline messages found", err));
      }

      // 🌐 স্টেপ ২: API hit for more messages
      try {
        const cursor = pageParam ? `&before=${pageParam}` : "";
        const { data } = await api(
          `/chats/${myId}/${chatId}/${contactId}/?limit=20${cursor}`,
        );
        if (!data.success)
          throw new Error("Failed to load messages from server");

        const messages: Message[] = await Promise.all(
          data.messages.map(async (m: RawMessage) => {
            const originalEncrypted = m.content;

            const decryptedObj =
              peerPublicKey && chatId
                ? await safeDecrypt(m.content, chatId, peerPublicKey)
                : {
                    text: m.content,
                    flags: { isViewOnce: false },
                    conditions: "NONE",
                  };

            const decryptedReplyTo =
              peerPublicKey && chatId
                ? await safeDecryptReplyTo(m.replyTo, chatId, peerPublicKey)
                : (m.replyTo ?? null);

            return {
              ...m,
              content: decryptedObj.text, // Text from payload
              isBurn: decryptedObj.flags?.isViewOnce || false, // View once flag
              conditions: decryptedObj.conditions || "NONE", // Any conditions applied
              encryptedContent: originalEncrypted, // encrypted content for saving to indexedDB
              replyTo: decryptedReplyTo,
              status:
                m.senderId === myId
                  ? (m.messageStatus as MessageStatus)
                  : undefined,
            } as Message & { encryptedContent?: string };
          }),
        );

        return {
          messages,
          hasMore: data.pagination.hasMore,
          nextCursor: data.pagination.nextCursor ?? null,
        };
      } catch (error) {
        console.error("Error fetching online messages:", error);
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

  // whenever new data comes in, merge it with existing store messages and deduplicate
  // whenever new data comes in, merge it with existing store messages and deduplicate
  useEffect(() => {
    if (
      query.data &&
      useChatStore.getState().activeContact?.customChatId === chatId
    ) {
      // 🔴 reverse() সরিয়ে দেওয়া হয়েছে, শুধু flatMap করে সব মেসেজ নেওয়া হলো
      const allMessages = [...query.data.pages].flatMap((p) => p.messages);

      const currentStoreMessages = useChatStore.getState().messages;

      // 🔴 গ্যারান্টি দিয়ে Time অনুযায়ী Sort করা হচ্ছে (পুরনো ওপরে, নতুন নিচে)
      const finalMessages = deduplicateMessages([
        ...allMessages,
        ...currentStoreMessages,
      ]).sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB; // Ascending order (Oldest -> Newest)
      });

      useChatStore.setState({ messages: finalMessages });

      if (finalMessages.length > 0) {
        // indexDB save only the most recent 100 messages to limit storage usage
        const recentMessagesToSave = finalMessages.slice(-100);

        const messagesToSave = recentMessagesToSave.map((m: any) => ({
          ...m,
          content:
            typeof m.encryptedContent === "string"
              ? m.encryptedContent
              : typeof m.content === "string"
                ? m.content
                : "",
          replyTo: m.replyTo
            ? {
                ...m.replyTo,
                content:
                  typeof m.replyTo.content === "string"
                    ? m.replyTo.content
                    : typeof m.replyTo.encryptedContent === "string"
                      ? m.replyTo.encryptedContent
                      : "",
              }
            : null,
        }));
        saveChatOffline(chatId ?? "", messagesToSave);
      }
    }
  }, [query.data, chatId]);

  return query;
};
