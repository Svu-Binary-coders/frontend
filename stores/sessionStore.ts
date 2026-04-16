import { create } from "zustand";
import { SessionManager } from "@/core/e2e/SessionManager";

interface SessionState {
  userId: string;
  privateKey: CryptoKey | null;
  signingKey: CryptoKey | null;
  backupKey: CryptoKey | null;
  chatKeyMap: Map<string, CryptoKey>;
}

interface SessionActions {
  setSession: (
    data: Omit<SessionState, "chatKeyMap"> & {
      chatKeyMap?: Map<string, CryptoKey>;
    },
  ) => void;
  
  addContact: (customChatId: string, peerPublicKeyB64: string) => Promise<void>;
  setChatKey: (chatId: string, key: CryptoKey) => void;
  getChatKey: (chatId: string) => CryptoKey | undefined;
  removeContact: (chatId: string) => void;
  clearSession: () => void;
}

const initialState: SessionState = {
  userId: "",
  privateKey: null,
  signingKey: null,
  backupKey: null,
  chatKeyMap: new Map(),
};

export const useSessionStore = create<SessionState & SessionActions>(
  (set, get) => ({
    ...initialState,

    setSession: (data) =>
      set({
        userId: data.userId,
        privateKey: data.privateKey,
        signingKey: data.signingKey,
        backupKey: data.backupKey,
        chatKeyMap: data.chatKeyMap ?? new Map(),
      }),

   
    addContact: async (customChatId, peerPublicKeyB64) => {
      const { privateKey, chatKeyMap, setChatKey } = get();

      if (!privateKey) {
        console.error("Privet key does not exist. Cannot create chat key.");
        return;
      }

      if (chatKeyMap.has(customChatId)) return;

      try {
        const { getChatKey } = await SessionManager.bootstrapSession(
          privateKey,
          peerPublicKeyB64,
        );

        const chatKey = await getChatKey(customChatId);

        setChatKey(customChatId, chatKey);
      } catch (error) {
        console.error(`${customChatId} does not exist:`, error);
      }
    },

    setChatKey: (chatId, key) =>
      set((state) => {
        const next = new Map(state.chatKeyMap);
        next.set(chatId, key);
        return { chatKeyMap: next };
      }),

    getChatKey: (chatId) => get().chatKeyMap.get(chatId),

    removeContact: (chatId) =>
      set((state) => {
        const next = new Map(state.chatKeyMap);
        next.delete(chatId);
        return { chatKeyMap: next };
      }),

    clearSession: () => set(initialState),
  }),
);
