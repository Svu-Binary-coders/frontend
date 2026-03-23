export enum MessageStatus {
  SENDING = "sending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  lastMessage?: { content: string; createdAt: string };
  unreadCount?: number;
  isOnline?: boolean;
  customChatId?: string;
}

export interface Message {
  _id?: string;
  senderId: string;
  content: string;
  createdAt?: string;
  messageStatus?: MessageStatus;
  status?: MessageStatus;
  isImportant?: boolean;
  is_edited?: boolean;
  is_deleted_for_everyone?: boolean;
  replyTo?: { _id: string; content: string; senderId: string } | null;
}

export interface ContextMenuState {
  msg: Message;
  isMine: boolean;
  position: { x: number; y: number; flip: boolean };
}