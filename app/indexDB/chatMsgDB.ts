import { get, set, update } from "idb-keyval";

export interface IChatMsgDB {
  chatId: string;
  lastMsgId: string;
  lastMsgSeenId: string;
  lastMsgTime: number;
  lastMsgSeenTime: number;
}
const getChatKey = (chatId: string) => `chatMsgDB_${chatId}`;
const defaultChatData = (chatId: string): IChatMsgDB => ({
  chatId,
  lastMsgId: "",
  lastMsgSeenId: "",
  lastMsgTime: 0,
  lastMsgSeenTime: 0,
});

/** 
 *  Partial Update Function
 * 
 * @param chatId - which chat's data you want to update
 * @param partialData - the data you want to update (e.g., just lastMsgTime)
 */
export const updateChatMsgDB = async (
  chatId: string,
  partialData: Partial<IChatMsgDB>,
) => {
  const key = getChatKey(chatId);
  await update(key, (oldData: IChatMsgDB | undefined) => {
    return {
      ...(oldData || defaultChatData(chatId)),
      ...partialData,
    };
  });
};

/**
 * Get Chat Message Data
 * 
 * @param chatId - which chat's data you want to retrieve
 * @returns the chat message data or undefined if not found
 */
export const getChatMsgDB = async (
  chatId: string,
): Promise<IChatMsgDB | undefined> => {
  return await get(getChatKey(chatId));
};
