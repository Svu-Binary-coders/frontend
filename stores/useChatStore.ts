/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import {
  Message,
  Contact,
  MessageStatus,
  ContextMenuState,
} from "@/types/chat";
import { SOCKET_URL, API_URL } from "@/lib/chat-helpers";

interface NewChatPreview {
  _id: string;
  name: string;
  avatar?: string;
}

interface ChatStore {
  myId: string;
  myIdInput: string;
  isConnected: boolean;

  contacts: Contact[];
  contactsLoading: boolean;
  activeContact: Contact | null;

  messages: Message[];
  msgLoading: boolean;
  msgInput: string;
  isTyping: boolean;

  // ── New chat modal ────────────────────────────────────────────────────────
  showNewChat: boolean;
  newChatId: string;
  newChatLoading: boolean;
  newChatError: string;
  newChatPreview: NewChatPreview | null;

  // ── Message actions ───────────────────────────────────────────────────────
  contextMenu: ContextMenuState | null;
  editingMsg: Message | null;
  replyTo: Message | null;
  forwardMsg: Message | null;

  // ── Socket (non-reactive – stored for access in actions) ──────────────────
  socket: Socket | null;

  // ── Internal timers ───────────────────────────────────────────────────────
  _typingTimeout: ReturnType<typeof setTimeout> | undefined;
  _previewTimeout: ReturnType<typeof setTimeout> | undefined;

  // ── Simple setters ────────────────────────────────────────────────────────
  setMyIdInput: (v: string) => void;
  setMsgInput: (v: string) => void;
  setShowNewChat: (v: boolean) => void;
  setContextMenu: (v: ContextMenuState | null) => void;
  setForwardMsg: (v: Message | null) => void;

  // ── Complex actions ───────────────────────────────────────────────────────
  initSocket: () => () => void;
  handleConnect: () => void;
  loadContacts: (userId: string) => Promise<void>;
  openChat: (contact: Contact) => Promise<void>;
  sendMessage: () => void;
  handleTyping: (value: string) => void;
  handleAction: (action: string, msg: Message) => void;
  handleForward: (contactId: string) => void;
  handleNewChatIdChange: (val: string) => void;
  createAndOpenChat: () => Promise<void>;
  closeNewChat: () => void;
  openCtx: (e: React.MouseEvent, msg: Message, isMine: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  myId: "",
  myIdInput: "",
  isConnected: false,
  contacts: [],
  contactsLoading: false,
  activeContact: null,
  messages: [],
  msgLoading: false,
  msgInput: "",
  isTyping: false,
  showNewChat: false,
  newChatId: "",
  newChatLoading: false,
  newChatError: "",
  newChatPreview: null,
  contextMenu: null,
  editingMsg: null,
  replyTo: null,
  forwardMsg: null,
  socket: null,
  _typingTimeout: undefined,
  _previewTimeout: undefined,

  // ── Simple setters ────────────────────────────────────────────────────────
  setMyIdInput: (v) => set({ myIdInput: v }),
  setMsgInput: (v) => set({ msgInput: v }),
  setShowNewChat: (v) => set({ showNewChat: v }),
  setContextMenu: (v) => set({ contextMenu: v }),
  setForwardMsg: (v) => set({ forwardMsg: v }),

  // ── Socket init ───────────────────────────────────────────────────────────
  initSocket: () => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    set({ socket });

    socket.on("connect", () => {
      const { myId } = get();
      if (myId) socket.emit("setup", myId);
    });

    // Receive message
    socket.on("receive_private_message", (data: Message) => {
      const { activeContact } = get();
      if (data.senderId === activeContact?._id) {
        set((s) => ({
          messages: [...s.messages, { ...data, status: MessageStatus.READ }],
          contacts: s.contacts.map((c) =>
            c._id === data.senderId ? { ...c, unreadCount: 0 } : c,
          ),
        }));
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

    // Status acks
    socket.on("message_delivered_ack", () => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.status === MessageStatus.SENT || m.status === MessageStatus.SENDING
            ? { ...m, status: MessageStatus.DELIVERED }
            : m,
        ),
      }));
    });

    socket.on("message_read_ack", () => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.status === MessageStatus.DELIVERED ||
          m.status === MessageStatus.SENT
            ? { ...m, status: MessageStatus.READ }
            : m,
        ),
      }));
    });

    socket.on("mark_all_read_ack", ({ chatRoomId }: { chatRoomId: string }) => {
      const { activeContact } = get();
      if (activeContact?.customChatId === chatRoomId)
        set((s) => ({
          messages: s.messages.map((m) => ({
            ...m,
            status: MessageStatus.READ,
          })),
        }));
    });

    // Edit ack (other tab/device sync)
    socket.on(
      "message_edited_ack",
      ({
        messageId,
        newContent,
      }: {
        messageId: string;
        newContent: string;
      }) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m._id === messageId
              ? { ...m, content: newContent, is_edited: true }
              : m,
          ),
        }));
      },
    );

    // Delete ack
    socket.on(
      "message_deleted_ack",
      ({
        messageId,
        deleteForEveryone,
      }: {
        messageId: string;
        deleteForEveryone: boolean;
      }) => {
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
        } else {
          set((s) => ({
            messages: s.messages.filter((m) => m._id !== messageId),
          }));
        }
      },
    );

    // Sidebar last message update
    socket.on("last_message_update", ({ chatId, lastMessage }: any) => {
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.customChatId === chatId ? { ...c, lastMessage } : c,
        ),
      }));
    });

    // Online / offline
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

    // Typing indicators
    socket.on("show_typing", ({ senderId }: { senderId: string }) => {
      if (senderId === get().activeContact?._id) set({ isTyping: true });
    });

    socket.on("hide_typing", ({ senderId }: { senderId: string }) => {
      if (senderId === get().activeContact?._id) set({ isTyping: false });
    });

    return () => socket.disconnect();
  },

  // ── handleConnect ─────────────────────────────────────────────────────────
  handleConnect: () => {
    const { myIdInput, socket } = get();
    if (!myIdInput.trim()) return;
    const id = myIdInput.trim();
    set({ myId: id, isConnected: true });
    socket?.emit("setup", id);
    get().loadContacts(id);
  },

  // ── loadContacts ──────────────────────────────────────────────────────────
  loadContacts: async (userId: string) => {
    set({ contactsLoading: true });
    try {
      const res = await fetch(`${API_URL}/chats/${userId}/contacts`);
      const data = await res.json();
      if (data.success) {
        set({ contacts: data.contacts });
        const { socket } = get();
        data.contacts.forEach((c: Contact) => {
          socket?.emit(
            "check_status",
            c._id,
            ({ online }: { online: boolean }) => {
              set((s) => ({
                contacts: s.contacts.map((x) =>
                  x._id === c._id ? { ...x, isOnline: online } : x,
                ),
              }));
            },
          );
        });
      }
    } catch {
      // Demo fallback
      set({
        contacts: [
          {
            _id: "d1",
            name: "Rahul Das",
            email: "",
            lastMessage: {
              content: "kal dekha jabe",
              createdAt: new Date().toISOString(),
            },
            unreadCount: 3,
            isOnline: true,
          },
          {
            _id: "d2",
            name: "Priya Sen",
            email: "",
            lastMessage: {
              content: "ok done ✓",
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
            unreadCount: 0,
            isOnline: false,
          },
        ],
      });
    } finally {
      set({ contactsLoading: false });
    }
  },

  // ── openChat ──────────────────────────────────────────────────────────────
  openChat: async (contact: Contact) => {
    const { myId, socket } = get();
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
    set({ msgLoading: true });
    try {
      const chatId = contact.customChatId || `${myId}_${contact._id}`;
      const res = await fetch(
        `${API_URL}/chats/${myId}/${chatId}/${contact._id}/?limit=50`,
      );
      const data = await res.json();
      if (data.success)
        set({
          messages: data.messages.map((m: any) => ({
            ...m,
            status:
              m.senderId === myId
                ? (m.messageStatus as MessageStatus) || MessageStatus.SENT
                : undefined,
          })),
        });
    } catch {
      set({ messages: [] });
    } finally {
      set({ msgLoading: false });
    }
  },

  // ── sendMessage ───────────────────────────────────────────────────────────
  sendMessage: () => {
    const {
      msgInput,
      activeContact,
      socket,
      editingMsg,
      replyTo,
      myId,
      _typingTimeout,
    } = get();
    if (!msgInput.trim() || !activeContact) return;
    const content = msgInput.trim();
    set({ msgInput: "" });

    // EDIT MODE
    if (editingMsg) {
      socket?.emit(
        "edit_messsage",
        {
          messageId: editingMsg._id,
          newContent: content,
          chatRoomId: activeContact.customChatId,
          senderId: myId,
        },
        (res: any) => {
          console.log("Edit ack:", res);
          console.log("editingMsg._id:", editingMsg._id);

          console.log(
            "match found:",
            get().messages.some((m) => m._id === editingMsg._id),
          );
          if (res?.success)
            console.log("content to update:", content); 
            set((s) => ({
              messages: s.messages.map((m) =>
                m._id === editingMsg._id
                  ? { ...m, content, is_edited: true }
                  : m,
              ),
            }));
        },
      );
      set({ editingMsg: null });
      return;
    }

    // NORMAL SEND
    socket?.emit("stop_typing", { receiverId: activeContact._id });
    clearTimeout(_typingTimeout);

    const tempId = `temp_${Date.now()}`;
    set((s) => ({
      messages: [
        ...s.messages,
        {
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
        },
      ],
      replyTo: null,
    }));

    socket?.emit(
      "send_message",
      { receiverId: activeContact._id, content, replyToId: replyTo?._id },
      (res: any) => {
        if (res?.success) {
          set((s) => ({
            messages: s.messages.map((m) =>
              m._id === tempId
                ? { ...res.data, senderId: myId, status: MessageStatus.SENT }
                : m,
            ),
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
        } else {
          set((s) => ({
            messages: s.messages.map((m) =>
              m._id === tempId ? { ...m, status: MessageStatus.FAILED } : m,
            ),
          }));
        }
      },
    );
  },

  // ── handleTyping ──────────────────────────────────────────────────────────
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

  // ── handleAction ──────────────────────────────────────────────────────────
  handleAction: (action: string, msg: Message) => {
    const { socket, activeContact } = get();
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
          { messageId: msg._id, chatRoomId: activeContact?.customChatId },
          (res: any) => {
            if (res?.success)
              set((s) => ({
                messages: s.messages.map((m) =>
                  m._id === msg._id ? { ...m, isImportant: !m.isImportant } : m,
                ),
              }));
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
          {
            messageId: msg._id,
            chatRoomId: activeContact?.customChatId,
            deleteForEveryone: false,
          },
          (res: any) => {
            if (res?.success)
              set((s) => ({
                messages: s.messages.filter((m) => m._id !== msg._id),
              }));
          },
        );
        break;

      case "delete_all":
        socket?.emit(
          "delete_message",
          {
            messageId: msg._id,
            chatRoomId: activeContact?.customChatId,
            deleteForEveryone: true,
            senderId: activeContact?._id,
          },
          (res: any) => {
            if (res?.success)
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
          },
        );
        break;
    }
  },

  // ── handleForward ─────────────────────────────────────────────────────────
  handleForward: (contactId: string) => {
    const { forwardMsg, socket, activeContact, myId } = get();
    if (!forwardMsg) return;
    socket?.emit(
      "forward_message",
      {
        messageId: forwardMsg._id,
        receiverId: contactId,
        content: forwardMsg.content,
      },
      (res: any) => {
        if (res?.success && contactId === activeContact?._id)
          set((s) => ({
            messages: [
              ...s.messages,
              { ...res.data, senderId: myId, status: MessageStatus.SENT },
            ],
          }));
      },
    );
    set({ forwardMsg: null });
  },

  // ── handleNewChatIdChange ─────────────────────────────────────────────────
  handleNewChatIdChange: (val: string) => {
    const { myId, _previewTimeout } = get();
    set({ newChatId: val, newChatPreview: null, newChatError: "" });
    clearTimeout(_previewTimeout);
    if (val.trim().length < 20) return;
    if (val.trim() === myId) {
      set({ newChatError: "cannot chat with yourself" });
      return;
    }
    const t = setTimeout(async () => {
      set({ newChatLoading: true });
      try {
        const res = await fetch(`${API_URL}/chats/user/${val.trim()}`);
        const data = await res.json();
        if (data.success)
          set({
            newChatPreview: {
              _id: data.user._id,
              name: data.user.userName,
              avatar: data.user.profilePicture,
            },
          });
        else set({ newChatError: "User not found" });
      } catch {
        set({ newChatError: "User not found" });
      } finally {
        set({ newChatLoading: false });
      }
    }, 500);
    set({ _previewTimeout: t });
  },

  // ── createAndOpenChat ─────────────────────────────────────────────────────
  createAndOpenChat: async () => {
    const { newChatPreview, myId, socket } = get();
    if (!newChatPreview) return;
    set({ newChatLoading: true });
    try {
      const res = await fetch(`${API_URL}/chats/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: myId,
          receiverId: newChatPreview._id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const nc: Contact = {
          _id: newChatPreview._id,
          name: newChatPreview.name,
          email: "",
          avatar: newChatPreview.avatar,
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

  // ── closeNewChat ──────────────────────────────────────────────────────────
  closeNewChat: () => {
    clearTimeout(get()._previewTimeout);
    set({
      showNewChat: false,
      newChatId: "",
      newChatPreview: null,
      newChatError: "",
    });
  },

  // ── openCtx ───────────────────────────────────────────────────────────────
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
