import { create } from "zustand";
import { get as idbGet, set as idbSet, keys as idbKeys } from "idb-keyval";


export interface IMsgHistory {
  lastSeenMsgId: string;
  lastSeenMsgTime: number;
}

const DEFAULT: IMsgHistory = {
  lastSeenMsgId: "",
  lastSeenMsgTime: 0,
};

const IDB_PREFIX = "flexchat-msgHistory:";
const idbKey = (chatId: string) => `${IDB_PREFIX}${chatId}`;

interface IMsgHistoryStore {
  histories: Map<string, IMsgHistory>;
  isLoaded: boolean;

  loadAll: () => Promise<void>; 
  getHistory: (chatId: string) => IMsgHistory; // sync read
  updateHistory: (chatId: string, updates: Partial<IMsgHistory>) => void;
  resetHistory: (chatId: string) => void;
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useMsgHistoryStore = create<IMsgHistoryStore>((set, get) => ({
  histories: new Map(),
  isLoaded: false,
  loadAll: async () => {
    try {
      const allKeys = (await idbKeys()) as string[];
      const chatKeys = allKeys.filter((k) => k.startsWith(IDB_PREFIX));
      const entries = await Promise.all(chatKeys.map((k) => idbGet(k)));
      const map = new Map<string, IMsgHistory>();

      entries.forEach((val) => {
        const h = val as (IMsgHistory & { chatId?: string }) | undefined;
        const key = chatKeys[entries.indexOf(val)];
        const chatId = key?.replace(IDB_PREFIX, "");
        if (chatId && h) map.set(chatId, h);
      });

      set({ histories: map, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  getHistory: (chatId) => {
    return get().histories.get(chatId) ?? { ...DEFAULT };
  },

  updateHistory: (chatId, updates) => {
    const current = get().getHistory(chatId);
    const updated = { ...current, ...updates };

    set((s) => {
      const next = new Map(s.histories);
      next.set(chatId, updated);
      return { histories: next };
    });

    if (saveTimers.has(chatId)) clearTimeout(saveTimers.get(chatId)!);
    saveTimers.set(
      chatId,
      setTimeout(() => {
        idbSet(idbKey(chatId), updated);
        saveTimers.delete(chatId);
      }, 2000),
    );
  },

  resetHistory: (chatId) => {
    const defaults = { ...DEFAULT };

    set((s) => {
      const next = new Map(s.histories);
      next.set(chatId, defaults);
      return { histories: next };
    });

    if (saveTimers.has(chatId)) {
      clearTimeout(saveTimers.get(chatId)!);
      saveTimers.delete(chatId);
    }

    idbSet(idbKey(chatId), defaults);
  },
}));

export const useMsgHistory = (chatId: string): IMsgHistory =>
  useMsgHistoryStore((s) => s.getHistory(chatId));
