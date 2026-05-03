import { useMemo } from "react";
import { create } from "zustand";
import {
  get as idbGet,
  set as idbSet,
  keys as idbKeys,
  createStore,
} from "idb-keyval";

const customDbStore = createStore("FlexChat_ChatSettings_DB", "ChatSettings");

const IDB_PREFIX = "settings:";
const idbKey = (chatId: string) => `${IDB_PREFIX}${chatId}`;

//  Types
export interface ChatSettings {
  chatId: string | null; // associated chat, null for global defaults
  isScreenShotBlur: boolean; // screenshot blur
  isCopyEnabled: boolean; // copy allow/block
  disappearingTimer: number | null; // seconds, null = off
}

const DEFAULT_SETTINGS = (chatId: string): ChatSettings => ({
  chatId,
  isScreenShotBlur: false,
  isCopyEnabled: true,
  disappearingTimer: null,
});

//  Store
interface ChatSettingsStore {
  settingsMap: Map<string, ChatSettings>;
  isLoaded: boolean;

  // load all from IndexDB on app start
  loadAll: () => Promise<void>;

  // get one chat's settings (default if not found)
  getSettings: (chatId: string) => ChatSettings;

  // update one field and auto-save to IndexDB
  updateSettings: (
    chatId: string,
    patch: Partial<Omit<ChatSettings, "chatId">>,
  ) => Promise<void>;

  // reset one chat to default
  resetSettings: (chatId: string) => Promise<void>;
}

export const useChatSettingsStore = create<ChatSettingsStore>((set, get) => ({
  settingsMap: new Map(),
  isLoaded: false,
  loadAll: async () => {
    try {
      const allKeys = (await idbKeys(customDbStore)) as string[];
      const chatKeys = allKeys.filter((k) => k.startsWith(IDB_PREFIX));

      const entries = await Promise.all(
        chatKeys.map(async (key) => {
          const val = await idbGet(key, customDbStore);
          return val as ChatSettings | undefined;
        }),
      );

      const map = new Map<string, ChatSettings>();
      entries.forEach((s) => {
        if (s?.chatId) map.set(s.chatId, s);
      });

      set({ settingsMap: map, isLoaded: true });
    } catch {
      set({ isLoaded: true }); // fail silently, defaults will be used, next loads will fix any inconsistency
    }
  },

  //  getSettings — sync read, default fallback
  getSettings: (chatId) => {
    return get().settingsMap.get(chatId) ?? DEFAULT_SETTINGS(chatId);
  },

  updateSettings: async (chatId, patch) => {
    const current = get().getSettings(chatId);
    const updated: ChatSettings = { ...current, ...patch, chatId };

    // HashMap update (immutable — new Map)
    set((s) => {
      const next = new Map(s.settingsMap);
      next.set(chatId, updated);
      return { settingsMap: next };
    });

    // IndexDB sync
    try {
      await idbSet(idbKey(chatId), updated, customDbStore);
    } catch {
      // fail silently, UI already updated, next load will fix any inconsistency
    }
  },

  resetSettings: async (chatId) => {
    const defaults = DEFAULT_SETTINGS(chatId);
    set((s) => {
      const next = new Map(s.settingsMap);
      next.set(chatId, defaults);
      return { settingsMap: next };
    });
    try {
      await idbSet(idbKey(chatId), defaults, customDbStore);
    } catch {}
  },
}));

export const useChatSettings = (
  chatId: string | undefined | null,
): ChatSettings | null => {
  const settings = useChatSettingsStore((state) =>
    state.settingsMap.get(chatId ?? ""),
  );

  return useMemo(() => {
    if (!chatId) return null;

    return settings || DEFAULT_SETTINGS(chatId);
  }, [settings, chatId]);
};
