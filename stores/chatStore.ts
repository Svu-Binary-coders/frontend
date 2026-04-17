/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import io from "socket.io-client";
type Socket = ReturnType<typeof io>; // socket instance type(some methods return the socket instance itself, so we can use it as return type)
import {
  Message,
  Contact,
  MessageStatus,
  ContextMenuState,
} from "@/types/chat";
import { SOCKET_URL, API_URL } from "@/lib/chat-helpers";
import { getQueryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/axios";
import { useSessionStore } from "./sessionStore";
import { FCPEngine, SessionManager } from "@/core/e2e";

//  Infinite Query cache type
interface InfinitePage {
  messages: Message[];
  hasMore: boolean;
  oldestId: string | null;
}

interface InfiniteCache {
  pages: InfinitePage[];
  pageParams: unknown[];
}

//  Deduplicate helper
const dedupe = (messages: Message[]): Message[] => {
  const seen = new Set<string>();
  return messages.filter((m) => {
    if (!m._id || seen.has(m._id)) return false;
    seen.add(m._id);
    return true;
  });
};

//  Cache updater
// only last page update
const updateMessagesCache = (
  chatId: string | undefined,
  updater: (old: Message[]) => Message[],
) => {
  if (!chatId) return;

  getQueryClient().setQueryData(
    ["messages", chatId],
    (old: InfiniteCache | undefined) => {
      if (!old?.pages?.length) return old;

      const lastIdx = old.pages.length - 1;
      const updatedMessages = dedupe(updater(old.pages[lastIdx].messages));

      return {
        ...old,
        pages: old.pages.map((page, i) =>
          i === lastIdx ? { ...page, messages: updatedMessages } : page,
        ),
      };
    },
  );
};

//  updateAllPagesCache
// all page update like status update, edit, delete (for everyone) etc
const updateAllPagesCache = (
  chatId: string | undefined,
  updater: (msg: Message) => Message,
) => {
  if (!chatId) return;

  getQueryClient().setQueryData(
    ["messages", chatId],
    (old: InfiniteCache | undefined) => {
      if (!old?.pages?.length) return old;

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.map(updater),
        })),
      };
    },
  );
};

//  filterAllPagesCache
// delete message (for me) filter like, remove the message from all pages
const filterAllPagesCache = (
  chatId: string | undefined,
  predicate: (msg: Message) => boolean,
) => {
  if (!chatId) return;

  getQueryClient().setQueryData(
    ["messages", chatId],
    (old: InfiniteCache | undefined) => {
      if (!old?.pages?.length) return old;

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.filter(predicate),
        })),
      };
    },
  );
};

interface NewChatPreview {
  _id: string;
  name: string;
  avatar?: string;
  customId?: string;
}

type ActiveView =
  | "chats"
  | "calls"
  | "invite"
  | "settings"
  | "chat-lock"
  | "archive"
  | "media";

interface ChatStore {
  activeView: ActiveView;
  isConnected: boolean;
  contacts: Contact[];
  visibleContacts: () => Contact[];
  activeContact: Contact | null;
  messages: Message[];
  msgInput: string;
  isTyping: boolean;
  showNewChat: boolean;
  newChatId: string;
  newChatLoading: boolean;
  newChatError: string;
  newChatPreview: NewChatPreview[];
  contextMenu: ContextMenuState | null;
  editingMsg: Message | null;
  replyTo: Message | null;
  forwardMsg: Message | null;
  socket: Socket | null;
  showEmojiPicker: boolean;
  _typingTimeout: ReturnType<typeof setTimeout> | undefined;
  _previewTimeout: ReturnType<typeof setTimeout> | undefined;
  togglePin: (chatId: string) => Promise<void>;
  toggleFavorite: (chatId: string) => Promise<void>;
  setMsgInput: (v: string) => void;
  setShowNewChat: (v: boolean) => void;
  setContextMenu: (v: ContextMenuState | null) => void;
  setForwardMsg: (v: Message | null) => void;
  setActiveView: (view: ActiveView) => void;
  setShowEmojiPicker: (v: boolean) => void;
  addOptimisticMessage: (msg: any) => void;
  replaceTempMessage: (tempId: string, realMsg: any) => void;
  removeTempMessage: (tempId: string) => void;

  initSocket: () => () => void;
  openChat: (contact: Contact | null) => void;
  sendMessage: () => void;
  handleTyping: (value: string) => void;
  handleAction: (action: string, msg: Message) => void;
  handleForward: (contactId: string) => void;
  handleNewChatIdChange: (val: string) => void;
  createAndOpenChat: (selectedUser: NewChatPreview) => Promise<void>;
  closeNewChat: () => void;
  openCtx: (e: React.MouseEvent, msg: Message, isMine: boolean) => void;
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  activeView: "chats" as ActiveView,
  isConnected: false,
  contacts: [],
  visibleContacts: () => get().contacts.filter((c) => c.isChatLock !== true),
  activeContact: null,
  showEmojiPicker: false,
  messages: [],
  msgInput: "",
  isTyping: false,
  showNewChat: false,
  newChatId: "",
  newChatLoading: false,
  newChatError: "",
  newChatPreview: [],
  contextMenu: null,
  editingMsg: null,
  replyTo: null,
  forwardMsg: null,
  socket: null,
  _typingTimeout: undefined,
  _previewTimeout: undefined,

  setMsgInput: (v) => set({ msgInput: v }),
  setShowNewChat: (v) => set({ showNewChat: v }),
  setContextMenu: (v) => set({ contextMenu: v }),
  setForwardMsg: (v) => set({ forwardMsg: v }),
  setActiveView: (view: ActiveView) => set({ activeView: view }),
  setShowEmojiPicker: (v: boolean) => set({ showEmojiPicker: v }),

  toggleChatLock: (customChatId: string) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.customChatId === customChatId
          ? { ...c, isChatLock: !c.isChatLock }
          : c,
      ),
    })),

  togglePin: async (chatId) => {
    try {
      await api.post(`${API_URL}/chats/toggle-pin/${chatId}`);
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.customChatId === chatId ? { ...c, isPinned: !c.isPinned } : c,
        ),
      }));

      // update cache
      const queryClient = getQueryClient();
      queryClient.setQueryData(["contacts"], (old: Contact[] | undefined) => {
        if (!old) return old;
        return old.map((c) =>
          c._id === chatId ? { ...c, isPinned: !c.isPinned } : c,
        );
      });
    } catch (error) {
      console.error("Toggle pin failed", error);
    }
  },

  toggleFavorite: async (chatId) => {
    const queryClient = getQueryClient();
    try {
      await api.post(`${API_URL}/chats/toggle-favorite/${chatId}`);
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.customChatId === chatId ? { ...c, isFavorite: !c.isFavorite } : c,
        ),
      }));

      // update cache
      queryClient.setQueryData(["contacts"], (old: Contact[] | undefined) => {
        if (!old) return old;
        return old.map((c) =>
          c._id === chatId ? { ...c, isFavorite: !c.isFavorite } : c,
        );
      });
    } catch (error) {
      console.error("Toggle favorite failed", error);
    }
  },

  addOptimisticMessage: (msg) => {
    const chatId = get().activeContact?.customChatId;
    const myId = useAuthStore.getState().myId;

    const tempMsg = {
      ...msg,
      senderId: myId,
      status: MessageStatus.SENDING,
    };

    set((s) => ({ messages: [...s.messages, tempMsg] }));
    updateMessagesCache(chatId, (old) => [...old, tempMsg]);
  },

  replaceTempMessage: (tempId, realData) => {
    const chatId = get().activeContact?.customChatId;
    const myId = useAuthStore.getState().myId;
    const { socket, activeContact } = get();

    const realMsg = {
      _id: realData.messageId,
      senderId: myId,
      content: realData.text ?? "",
      attachments: realData.attachments ?? [],
      createdAt: new Date().toISOString(),
      status: MessageStatus.SENT,
      isTemp: false,
    };

    set((s) => ({
      messages: s.messages.map((m) => (m._id === tempId ? realMsg : m)),
    }));
    updateMessagesCache(chatId, (old) =>
      old.map((m) => (m._id === tempId ? realMsg : m)),
    );

    // sidebar lastMessage update
    set((s) => ({
      contacts: s.contacts
        .map((c) =>
          c._id === activeContact?._id
            ? {
                ...c,
                lastMessage: {
                  content: realMsg.content || "📷 Image",
                  createdAt: realMsg.createdAt,
                },
              }
            : c,
        )
        .sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt || 0).getTime() -
            new Date(a.lastMessage?.createdAt || 0).getTime(),
        ),
    }));
  },

  removeTempMessage: (tempId) => {
    const chatId = get().activeContact?.customChatId;
    set((s) => ({
      messages: s.messages.filter((m) => m._id !== tempId),
    }));
    filterAllPagesCache(chatId, (m) => m._id !== tempId);
  },

  //  Socket init
  initSocket: () => {
    const existing = get().socket;
    if (existing) {
      existing.disconnect();
      existing.removeAllListeners();
    }

    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    set({ socket });

    //  Receive message
    socket.on("receive_private_message", async (data: Message) => {
      const { activeContact } = get();
      const { privateKey, signingKey } = useSessionStore.getState();
      if (!privateKey || !signingKey) {
        console.error(
          "Private or signing key missing. Cannot decrypt message.",
        );
      }
      const sender = get().contacts.find((c) => c._id === data.senderId);

      if (
        sender &&
        sender.publicKey &&
        privateKey &&
        signingKey &&
        sender.customChatId
      ) {
        try {
          // chat key get
          const { getChatKey } = await SessionManager.bootstrapSession(
            privateKey,
            sender.publicKey,
          );

          const chatKey = await getChatKey(sender.customChatId);
          const decryptedMessage = await FCPEngine.decryptMessage(
            data.content,
            chatKey,
            signingKey,
          );
          data.content = decryptedMessage.text;
        } catch (error) {
          console.error("Failed to decrypt message", error);
          data.content = "🔒 [Encrypted Message]";
        }
      } else {
        data.content = "🔒 [Encrypted Message]";
      }

      if (data.senderId === activeContact?._id) {
        const newMsg = { ...data, status: MessageStatus.READ };

        set((s) => {
          const exists = s.messages.some((m) => m._id === data._id);
          if (exists) return s;
          return {
            messages: [...s.messages, newMsg],
            contacts: s.contacts.map((c) =>
              c._id === data.senderId ? { ...c, unreadCount: 0 } : c,
            ),
          };
        });

        // last page -> new message add + status update emit
        updateMessagesCache(activeContact.customChatId, (old) => {
          const exists = old.some((m) => m._id === data._id);
          if (exists) return old;
          return [...old, newMsg];
        });

        socket.emit("message_read", {
          chatRoomId: activeContact!.customChatId,
          senderId: data.senderId,
        });
      } else {
        set((s) => ({
          contacts: s.contacts
            .map((c) =>
              c._id === data.senderId
                ? {
                    ...c,
                    unreadCount: (c.unreadCount || 0) + 1,
                    lastMessage: {
                      content: data.content,
                      createdAt: data.createdAt || new Date().toISOString(),
                    },
                  }
                : c,
            )
            .sort(
              (a, b) =>
                new Date(b.lastMessage?.createdAt || 0).getTime() -
                new Date(a.lastMessage?.createdAt || 0).getTime(),
            ),
        }));
        socket.emit("message_delivered", {
          chatRoomId: activeContact?.customChatId,
          senderId: data.senderId,
        });
      }
    });

    //  Status acks
    socket.on("message_delivered_ack", () => {
      const chatId = get().activeContact?.customChatId;

      set((s) => ({
        messages: s.messages.map((m) =>
          m.status === MessageStatus.SENT || m.status === MessageStatus.SENDING
            ? { ...m, status: MessageStatus.DELIVERED }
            : m,
        ),
      }));

      // সব page-এ status update
      updateAllPagesCache(chatId, (m) =>
        m.status === MessageStatus.SENT || m.status === MessageStatus.SENDING
          ? { ...m, status: MessageStatus.DELIVERED }
          : m,
      );
    });

    socket.on("message_read_ack", () => {
      const chatId = get().activeContact?.customChatId;

      set((s) => ({
        messages: s.messages.map((m) =>
          m.status === MessageStatus.DELIVERED ||
          m.status === MessageStatus.SENT
            ? { ...m, status: MessageStatus.READ }
            : m,
        ),
      }));

      updateAllPagesCache(chatId, (m) =>
        m.status === MessageStatus.DELIVERED || m.status === MessageStatus.SENT
          ? { ...m, status: MessageStatus.READ }
          : m,
      );
    });

    socket.on("mark_all_read_ack", ({ chatRoomId }: { chatRoomId: string }) => {
      const { activeContact } = get();
      if (activeContact?.customChatId === chatRoomId) {
        set((s) => ({
          messages: s.messages.map((m) => ({
            ...m,
            status: MessageStatus.READ,
          })),
        }));

        updateAllPagesCache(chatRoomId, (m) => ({
          ...m,
          status: MessageStatus.READ,
        }));
      }
    });

    //  Edit ack
    socket.on(
      "message_edited_ack",
      ({
        messageId,
        newContent,
      }: {
        messageId: string;
        newContent: string;
      }) => {
        const chatId = get().activeContact?.customChatId;

        set((s) => ({
          messages: s.messages.map((m) =>
            m._id === messageId
              ? { ...m, content: newContent, is_edited: true }
              : m,
          ),
        }));

        updateAllPagesCache(chatId, (m) =>
          m._id === messageId
            ? { ...m, content: newContent, is_edited: true }
            : m,
        );
      },
    );

    //  Delete ack
    socket.on(
      "message_deleted_ack",
      ({
        messageId,
        deleteForEveryone,
      }: {
        messageId: string;
        deleteForEveryone: boolean;
      }) => {
        const chatId = get().activeContact?.customChatId;

        if (deleteForEveryone) {
          set((s) => ({
            messages: s.messages.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    content: "This message was deleted",
                    is_deleted_for_everyone: true,
                  }
                : m,
            ),
          }));

          updateAllPagesCache(chatId, (m) =>
            m._id === messageId
              ? {
                  ...m,
                  content: "This message was deleted",
                  is_deleted_for_everyone: true,
                }
              : m,
          );
        } else {
          set((s) => ({
            messages: s.messages.filter((m) => m._id !== messageId),
          }));

          filterAllPagesCache(chatId, (m) => m._id !== messageId);
        }
      },
    );

    //  Star ack
    socket.on(
      "message_starred_ack",
      ({
        messageId,
        isImportant,
      }: {
        messageId: string;
        isImportant: boolean;
      }) => {
        const chatId = get().activeContact?.customChatId;

        set((s) => ({
          messages: s.messages.map((m) =>
            m._id === messageId ? { ...m, isImportant } : m,
          ),
        }));

        updateAllPagesCache(chatId, (m) =>
          m._id === messageId ? { ...m, isImportant } : m,
        );
      },
    );

    //  Sidebar last message update
    socket.on("last_message_update", ({ chatId, lastMessage }: any) => {
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.customChatId === chatId ? { ...c, lastMessage } : c,
        ),
      }));
    });

    //  Online / Offline
    socket.on("user_online", ({ userId }: { userId: string }) => {
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c._id === userId ? { ...c, isOnline: true } : c,
        ),
        activeContact:
          s.activeContact?._id === userId
            ? { ...s.activeContact, isOnline: true }
            : s.activeContact,
      }));
    });

    socket.on("user_offline", ({ userId }: { userId: string }) => {
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c._id === userId ? { ...c, isOnline: false } : c,
        ),
        activeContact:
          s.activeContact?._id === userId
            ? { ...s.activeContact, isOnline: false }
            : s.activeContact,
      }));
    });

    //  Typing
    socket.on("show_typing", ({ senderId }: { senderId: string }) => {
      if (senderId === get().activeContact?._id) set({ isTyping: true });
    });

    socket.on("hide_typing", ({ senderId }: { senderId: string }) => {
      if (senderId === get().activeContact?._id) set({ isTyping: false });
    });

    return () => socket.disconnect();
  },

  //  openChat
  openChat: (contact: Contact | null) => {
    const { socket, activeContact } = get();

    if (!contact) {
      set({
        activeContact: null,
        messages: [],
        editingMsg: null,
        replyTo: null,
      });
      return;
    }

    if (activeContact?._id === contact._id) return;

    set({
      activeContact: contact,
      isTyping: false,
      messages: [],
      contextMenu: null,
      editingMsg: null,
      replyTo: null,
      contacts: get().contacts.map((c) =>
        c._id === contact._id ? { ...c, unreadCount: 0 } : c,
      ),
    });

    socket?.emit("mark_all_read", {
      chatRoomId: contact.customChatId,
      senderId: contact._id,
    });
  },

  //  sendMessage
  //  sendMessage
  sendMessage: async () => {
    const {
      msgInput,
      activeContact,
      socket,
      editingMsg,
      replyTo,
      forwardMsg,
      _typingTimeout,
    } = get();

    const myId = useAuthStore.getState().myId;

    if (!msgInput.trim() || !activeContact || !myId) return;
    const content = msgInput.trim();
    const friendPublicKey = activeContact.publicKey;

    const { privateKey, signingKey } = useSessionStore.getState();

    if (!friendPublicKey) {
      console.error("Friend's public key is missing. Cannot send message.");
      return;
    }

    if (!privateKey || !signingKey) {
      console.error("Private or signing key missing. Cannot send message.");

      // try to get IndexBD stored keys and update session store
      try {
      
      } catch (error) {
        return;
      }



      return;
    }

    const chatId = activeContact.customChatId;
    if (!chatId) {
      console.error("Chat ID is missing. Cannot send message.");
      return;
    }
    set({ msgInput: "" });

    try {
      const { getChatKey } = await SessionManager.bootstrapSession(
        privateKey,
        friendPublicKey,
      );
      const chatKey = await getChatKey(chatId);

      const encryptedContent = await FCPEngine.encryptMessage({
        text: content,
        type: "text",
        chatId: chatId,
        chatKey: chatKey,
        signingKey: signingKey,
      });

      // EDIT MODE
      if (editingMsg) {
        socket?.emit(
          "edit_messsage",
          {
            messageId: editingMsg._id,
            newContent: encryptedContent,
            chatRoomId: chatId,
            senderId: myId,
            is_forwarded: !!forwardMsg,
          },
          (res: any) => {
            if (res?.success) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m._id === editingMsg._id
                    ? { ...m, content, is_edited: true }
                    : m,
                ),
              }));
              updateAllPagesCache(chatId, (m) =>
                m._id === editingMsg._id
                  ? { ...m, content, is_edited: true }
                  : m,
              );
            }
          },
        );
        set({ editingMsg: null });
        return;
      }

      // NORMAL SEND
      socket?.emit("stop_typing", { receiverId: activeContact._id });
      clearTimeout(_typingTimeout);

      const tempId = `temp_${Date.now()}`;

      const tempMsg: Message = {
        _id: tempId,
        senderId: myId,
        content, 
        createdAt: new Date().toISOString(),
        status: MessageStatus.SENDING,
        replyTo: replyTo
          ? {
              _id: replyTo._id!,
              content: replyTo.content,
              senderId: replyTo.senderId,
            }
          : null,
      };

      set((s) => ({ messages: [...s.messages, tempMsg], replyTo: null }));
      updateMessagesCache(chatId, (old) => [...old, tempMsg]);
      socket?.emit(
        "send_message",
        {
          receiverId: activeContact._id,
          content: encryptedContent,
          replyToMessageId: replyTo?._id,
        },
        (res: any) => {
          if (res?.success) {
            const sentMsg: Message = {
              ...res.data,
              senderId: myId,
              content,
              status: MessageStatus.SENT,
            };

            set((s) => ({
              messages: s.messages.map((m) => (m._id === tempId ? sentMsg : m)),
              contacts: s.contacts
                .map((c) =>
                  c._id === activeContact._id
                    ? {
                        ...c,
                        lastMessage: {
                          content,
                          createdAt: new Date().toISOString(),
                        },
                      }
                    : c,
                )
                .sort(
                  (a, b) =>
                    new Date(b.lastMessage?.createdAt || 0).getTime() -
                    new Date(a.lastMessage?.createdAt || 0).getTime(),
                ),
            }));

            updateMessagesCache(chatId, (old) =>
              old.map((m) => (m._id === tempId ? sentMsg : m)),
            );
          } else {
            set((s) => ({
              messages: s.messages.map((m) =>
                m._id === tempId ? { ...m, status: MessageStatus.FAILED } : m,
              ),
            }));
            updateMessagesCache(chatId, (old) =>
              old.map((m) =>
                m._id === tempId ? { ...m, status: MessageStatus.FAILED } : m,
              ),
            );
          }
        },
      );
    } catch (error) {
      console.error("Encryption failed while sending message:", error);
    }
  },

  //  handleTyping
  handleTyping: (value: string) => {
    const { activeContact, socket, _typingTimeout } = get();
    set({ msgInput: value });
    if (!activeContact) return;
    socket?.emit("typing", { receiverId: activeContact._id });
    clearTimeout(_typingTimeout);
    const t = setTimeout(() => {
      socket?.emit("stop_typing", { receiverId: activeContact._id });
    }, 2000);
    set({ _typingTimeout: t });
  },

  //  handleAction
  handleAction: (action: string, msg: Message) => {
    const { socket, activeContact } = get();
    const chatId = activeContact?.customChatId;

    switch (action) {
      case "reply":
        set({ replyTo: msg, editingMsg: null });
        break;

      case "copy":
        navigator.clipboard.writeText(msg.content);
        break;

      case "star":
        socket?.emit(
          "toggle_star",
          { messageId: msg._id, chatRoomId: chatId },
          (res: any) => {
            if (res?.success) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m._id === msg._id ? { ...m, isImportant: !m.isImportant } : m,
                ),
              }));
              updateAllPagesCache(chatId, (m) =>
                m._id === msg._id ? { ...m, isImportant: !m.isImportant } : m,
              );
            }
          },
        );
        break;

      case "forward":
        set({ forwardMsg: msg });
        break;

      case "edit":
        set({ editingMsg: msg, replyTo: null, msgInput: msg.content });
        break;

      case "delete_me":
        socket?.emit(
          "delete_message",
          { messageId: msg._id, chatRoomId: chatId, deleteForEveryone: false },
          (res: any) => {
            if (res?.success) {
              set((s) => ({
                messages: s.messages.filter((m) => m._id !== msg._id),
              }));
              filterAllPagesCache(chatId, (m) => m._id !== msg._id);
            }
          },
        );
        break;

      case "delete_all":
        socket?.emit(
          "delete_message",
          {
            messageId: msg._id,
            chatRoomId: chatId,
            deleteForEveryone: true,
            senderId: activeContact?._id,
          },
          (res: any) => {
            if (res?.success) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m._id === msg._id
                    ? {
                        ...m,
                        content: "This message was deleted",
                        is_deleted_for_everyone: true,
                      }
                    : m,
                ),
              }));
              updateAllPagesCache(chatId, (m) =>
                m._id === msg._id
                  ? {
                      ...m,
                      content: "This message was deleted",
                      is_deleted_for_everyone: true,
                    }
                  : m,
              );
            }
          },
        );
        break;
    }
  },
  handleForward: (contactId: string) => {
    const { forwardMsg, socket, activeContact, contacts } = get();
    const myId = useAuthStore.getState().myId;

    if (!forwardMsg || !myId) return;

    const targetContact = contacts.find((c) => c._id === contactId);
    const content = forwardMsg.content;
    const now = new Date().toISOString();

    socket?.emit(
      "send_message",
      {
        receiverId: contactId,
        content,
        isForwarded: true,
      },
      (res: any) => {
        if (res?.success) {
          const sentMsg: Message = {
            ...res.data,
            senderId: myId,
            status: MessageStatus.SENT,
            isForwarded: true,
          };

          set((s) => ({
            messages:
              activeContact?._id === contactId
                ? [...s.messages, sentMsg]
                : s.messages,

            contacts: s.contacts
              .map((c) =>
                c._id === contactId
                  ? {
                      ...c,
                      lastMessage: { content, createdAt: now },
                    }
                  : c,
              )
              .sort(
                (a, b) =>
                  new Date(b.lastMessage?.createdAt || 0).getTime() -
                  new Date(a.lastMessage?.createdAt || 0).getTime(),
              ),
          }));

          // target contact-এর chat cache update
          if (targetContact?.customChatId) {
            updateMessagesCache(targetContact.customChatId, (old) => [
              ...old,
              sentMsg,
            ]);
          }

          // QueryClient contacts cache-ও update
          getQueryClient().setQueryData(
            ["contacts"],
            (old: Contact[] | undefined) => {
              if (!old) return old;
              return old
                .map((c) =>
                  c._id === contactId
                    ? { ...c, lastMessage: { content, createdAt: now } }
                    : c,
                )
                .sort(
                  (a, b) =>
                    new Date(b.lastMessage?.createdAt || 0).getTime() -
                    new Date(a.lastMessage?.createdAt || 0).getTime(),
                );
            },
          );
        }
      },
    );

    set({ forwardMsg: null });
  },

  //  handleNewChatIdChange
  handleNewChatIdChange: (val: string) => {
    const { _previewTimeout } = get();
    const myId = useAuthStore.getState().myId;

    set({ newChatId: val, newChatPreview: [], newChatError: "" });
    clearTimeout(_previewTimeout);

    if (val.trim().length < 2) return;

    if (val.trim() === myId) {
      set({ newChatError: "Cannot chat with yourself" });
      return;
    }

    const t = setTimeout(async () => {
      set({ newChatLoading: true });
      try {
        const res = await api(`${API_URL}/chats/search?q=${val.trim()}`);
        const data = res.data;
        if (data.success && data.users.length > 0) {
          set({
            newChatPreview: data.users.map((user: any) => ({
              _id: user._id,
              name: user.userName,
              avatar: user.profilePicture,
              customId: user.customId,
            })),
          });
        } else {
          set({ newChatError: "User not found" });
        }
      } catch {
        set({ newChatError: "User not found" });
      } finally {
        set({ newChatLoading: false });
      }
    }, 500);

    set({ _previewTimeout: t });
  },

  //  createAndOpenChat
  createAndOpenChat: async (selectedUser: NewChatPreview) => {
    const { socket } = get();
    const myId = useAuthStore.getState().myId;

    if (!selectedUser || !myId) return;
    set({ newChatLoading: true });
    try {
      const { data } = await api.post(`/chats/create`, {
        receiverId: selectedUser._id,
        senderId: myId,
      });
      if (data.success) {
        console.log("Chat created:", data.chat);
        const nc: Contact = {
          _id: selectedUser._id,
          name: selectedUser.name,
          email: "",
          avatar: selectedUser.avatar,
          customChatId: data.chat.chatRoomId,
          unreadCount: 0,
          isOnline: false,
          publicKey: data.chat.publicKey,
        };
        set((s) => ({
          contacts: s.contacts.find((c) => c._id === nc._id)
            ? s.contacts
            : [nc, ...s.contacts],
        }));
        socket?.emit(
          "check_status",
          nc._id,
          ({ online }: { online: boolean }) => {
            set((s) => ({
              contacts: s.contacts.map((c) =>
                c._id === nc._id ? { ...c, isOnline: online } : c,
              ),
            }));
          },
        );
        get().closeNewChat();
        get().openChat(nc);
      } else {
        set({ newChatError: data.message || "Chat create failed" });
      }
    } catch {
      set({ newChatError: "Server error" });
    } finally {
      set({ newChatLoading: false });
    }
  },

  //  closeNewChat
  closeNewChat: () => {
    clearTimeout(get()._previewTimeout);
    set({
      showNewChat: false,
      newChatId: "",
      newChatPreview: [],
      newChatError: "",
    });
  },

  //  openCtx
  openCtx: (e: React.MouseEvent, msg: Message, isMine: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const flip = window.innerHeight - e.clientY < 280;
    set({
      contextMenu: {
        msg,
        isMine,
        position: {
          x: Math.min(e.clientX, window.innerWidth - 216),
          y: e.clientY,
          flip,
        },
      },
    });
  },
}));
