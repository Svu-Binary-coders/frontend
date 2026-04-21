/* eslint-disable @typescript-eslint/no-explicit-any */
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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
  replyTo?: { _id: string; content: string; senderId: string } | null;
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

const sortByTime = (messages: Message[]) =>
  messages.sort(
    (a: any, b: any) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime(),
  );

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
export const useChatHistory = (
  myId: string,
  chatId?: string,
  contactId?: string,
) => {
  const socketMsgIdsRef = useRef<Set<string>>(new Set());
  const apiLoadedRef = useRef(false);
  const prevChatIdRef = useRef<string | undefined>(chatId);

  // chat switch এ refs reset — useEffect এ করতে হবে, render body তে ref access নিষেধ
  useEffect(() => {
    if (prevChatIdRef.current === chatId) return;
    prevChatIdRef.current = chatId;
    socketMsgIdsRef.current = new Set();
    apiLoadedRef.current = false;
  }, [chatId]);

  const query = useInfiniteQuery<PageResult>({
    queryKey: ["messages", chatId],
    networkMode: "offlineFirst",

    queryFn: async ({ pageParam }) => {
      const contact = useChatStore
        .getState()
        .contacts.find((c) => c._id === contactId);
      const peerPublicKey = contact?.publicKey;

      //  IndexDB — background load, scroll trigger করবে না
      if (!pageParam) {
        getChatOffline(chatId ?? "")
          .then(async (offlineMessages) => {
            if (!offlineMessages?.length) return;
            const decrypted = await Promise.all(
              offlineMessages.slice(-50).map(async (m: any) => {
                const raw =
                  typeof m.content === "string"
                    ? m.content
                    : m.content?.text || m.content?.content || "";
                const dec =
                  peerPublicKey && chatId
                    ? await safeDecrypt(raw, chatId, peerPublicKey)
                    : {
                        text: raw,
                        flags: { isViewOnce: false },
                        conditions: "NONE",
                      };
                const replyTo =
                  peerPublicKey && chatId
                    ? await safeDecryptReplyTo(m.replyTo, chatId, peerPublicKey)
                    : (m.replyTo ?? null);
                return {
                  ...m,
                  content: dec.text,
                  isBurn: dec.flags?.isViewOnce || false,
                  conditions: dec.conditions || "NONE",
                  encryptedContent: raw,
                  replyTo,
                  _isOffline: true,
                };
              }),
            );
            // API data আসার আগে পর্যন্তই offline দেখাবে
            // API load হলে নিচের effect replace করে দেবে
            if (!apiLoadedRef.current) {
              const cur = useChatStore.getState().messages;
              useChatStore.setState({
                messages: sortByTime(
                  deduplicateMessages([...decrypted, ...cur]),
                ),
              });
            }
          })
          .catch(() => {});
      }

      //  API fetch
      const cursor = pageParam ? `&before=${pageParam}` : "";
      const { data } = await api(
        `/chats/${myId}/${chatId}/${contactId}/?limit=20${cursor}`,
      );
      if (!data.success) throw new Error("Failed to load messages from server");

      const messages: Message[] = await Promise.all(
        data.messages.map(async (m: RawMessage) => {
          const raw = m.content;
          const dec =
            peerPublicKey && chatId
              ? await safeDecrypt(m.content, chatId, peerPublicKey)
              : {
                  text: m.content,
                  flags: { isViewOnce: false },
                  conditions: "NONE",
                };
          const replyTo =
            peerPublicKey && chatId
              ? await safeDecryptReplyTo(m.replyTo, chatId, peerPublicKey)
              : (m.replyTo ?? null);
          return {
            ...m,
            content: dec.text,
            isBurn: dec.flags?.isViewOnce || false,
            conditions: dec.conditions || "NONE",
            encryptedContent: raw,
            replyTo,
            status:
              m.senderId === myId
                ? (m.messageStatus as MessageStatus)
                : undefined,
          } as Message & { encryptedContent?: string };
        }),
      );

      if (!pageParam) apiLoadedRef.current = true;

      return {
        messages,
        hasMore: data.pagination.hasMore,
        nextCursor: data.pagination.nextCursor ?? null,
      };
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

  //  Merge effect
  useEffect(() => {
    if (!query.data) return;
    if (useChatStore.getState().activeContact?.customChatId !== chatId) return;

    // pages[0] = most recent 20, pages[1] = older 20, ...
    // flatMap → sort ascending → সব ঠিক
    const allQueryMsgs = [...query.data.pages].flatMap((p) => p.messages);
    const queryIds = new Set(allQueryMsgs.map((m) => m._id));

    const currentStore = useChatStore.getState().messages;

    // store এ আছে কিন্তু query তে নেই এমন সব messages রাখো
    // এর মধ্যে আছে: socket messages, sent-but-not-yet-fetched messages (audio/video)
    const nonQueryMsgs = currentStore.filter((m) => {
      if (!m._id) return false;
      if (queryIds.has(m._id)) return false; // query তে আছে — skip
      if ((m as any)._isOffline) return false; // offline cache — skip
      return true; // socket, just-sent, temp সব রাখো
    });

    // socket IDs track করো (temp বাদে)
    nonQueryMsgs.forEach((m) => {
      if (!(m as any).isTemp) {
        socketMsgIdsRef.current.add(m._id!);
      }
    });

    const final = sortByTime(
      deduplicateMessages([...allQueryMsgs, ...nonQueryMsgs]),
    );

    useChatStore.setState({ messages: final });

    // IndexDB save
    if (final.length > 0) {
      saveChatOffline(
        chatId ?? "",
        final.slice(-100).map((m: any) => ({
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
        })),
      );
    }
  }, [query.data, chatId]);

  return query;
};
