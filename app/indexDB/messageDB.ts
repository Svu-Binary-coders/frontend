

import { Message } from "@/types/chat";
import { createStore, set, get } from "idb-keyval";

export const messageStore =
  typeof window !== "undefined"
    ? createStore("FlexChat_Messages_DB", "chats")
    : undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveChatOffline = async (chatId: string, messages: Message[]) => {
  if (!messageStore || !chatId) return;
  await set(`chat_${chatId}`, messages, messageStore);
};

export const getChatOffline = async (chatId: string) => {
  if (!messageStore || !chatId) return null;
  return await get(`chat_${chatId}`, messageStore);
};
