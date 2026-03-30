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

  setMsgInput: (v: string) => void;
  setShowNewChat: (v: boolean) => void;
  setContextMenu: (v: ContextMenuState | null) => void;
  setForwardMsg: (v: Message | null) => void;
  setActiveView: (view: ActiveView) => void;
  setShowEmojiPicker: (v: boolean) => void;

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

  //  Socket init
  initSocket: () => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    set({ socket });

    socket.on("connect", () => {
      const myId = useAuthStore.getState().myId;
      if (myId) socket.emit("setup", myId);
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      set({ isConnected: false });
    });

    //  Receive message
    socket.on("receive_private_message", (data: Message) => {
      const { activeContact } = get();

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
  sendMessage: () => {
    const {
      msgInput,
      activeContact,
      socket,
      editingMsg,
      replyTo,
      _typingTimeout,
    } = get();
    const myId = useAuthStore.getState().myId;

    if (!msgInput.trim() || !activeContact || !myId) return;
    const content = msgInput.trim();
    const chatId = activeContact.customChatId;
    set({ msgInput: "" });

    // EDIT MODE
    if (editingMsg) {
      socket?.emit(
        "edit_messsage",
        {
          messageId: editingMsg._id,
          newContent: content,
          chatRoomId: chatId,
          senderId: myId,
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
              m._id === editingMsg._id ? { ...m, content, is_edited: true } : m,
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
    // last page-এ temp message যোগ করো
    updateMessagesCache(chatId, (old) => [...old, tempMsg]);

    socket?.emit(
      "send_message",
      {
        receiverId: activeContact._id,
        content,
        replyToMessageId: replyTo?._id,
      },
      (res: any) => {
        if (res?.success) {
          const sentMsg: Message = {
            ...res.data,
            senderId: myId,
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

          // temp → real message replace
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

  //  handleForward
  handleForward: (contactId: string) => {
    const { forwardMsg, socket, activeContact } = get();
    const myId = useAuthStore.getState().myId;

    if (!forwardMsg || !myId) return;
    socket?.emit(
      "forward_message",
      {
        messageId: forwardMsg._id,
        receiverId: contactId,
        content: forwardMsg.content,
      },
      (res: any) => {
        if (res?.success && contactId === activeContact?._id) {
          const fwdMsg: Message = {
            ...res.data,
            senderId: myId,
            status: MessageStatus.SENT,
          };
          set((s) => ({ messages: [...s.messages, fwdMsg] }));
          if (activeContact?.customChatId)
            updateMessagesCache(activeContact.customChatId, (old) => [
              ...old,
              fwdMsg,
            ]);
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
      const res = await fetch(`${API_URL}/chats/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: myId, receiverId: selectedUser._id }),
      });
      const data = await res.json();
      if (data.success) {
        const nc: Contact = {
          _id: selectedUser._id,
          name: selectedUser.name,
          email: "",
          avatar: selectedUser.avatar,
          customChatId: data.chat.chatRoomId,
          unreadCount: 0,
          isOnline: false,
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
