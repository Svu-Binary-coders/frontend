

import { create } from "zustand";

interface SessionState {
  userId: string;
  privateKey: CryptoKey | null; // ECDH — chat key বানাতে লাগবে
  signingKey: CryptoKey | null; // HMAC — message sign করতে লাগবে
  backupKey: CryptoKey | null; // নতুন chat এর ChatKey backup এ লাগবে
  chatKeyMap: Map<string, CryptoKey>; // chatId → ChatKey
}

interface SessionActions {
  setSession: (
    data: Omit<SessionState, "chatKeyMap"> & {
      chatKeyMap?: Map<string, CryptoKey>;
    },
  ) => void;
  setChatKey: (chatId: string, key: CryptoKey) => void;
  getChatKey: (chatId: string) => CryptoKey | undefined;
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

    // Login success এ পুরো session set করো
    setSession: (data) =>
      set({
        userId: data.userId,
        privateKey: data.privateKey,
        signingKey: data.signingKey,
        backupKey: data.backupKey,
        chatKeyMap: data.chatKeyMap ?? new Map(),
      }),

    // নতুন chat শুরু হলে ChatKey cache এ রাখো
    setChatKey: (chatId, key) =>
      set((state) => {
        const next = new Map(state.chatKeyMap);
        next.set(chatId, key);
        return { chatKeyMap: next };
      }),

    // ChatKey বের করো
    getChatKey: (chatId) => get().chatKeyMap.get(chatId),

    // Logout
    clearSession: () => set(initialState),
  }),
);
