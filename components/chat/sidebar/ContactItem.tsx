"use client";

import { Contact } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { timeFormatFn } from "@/lib/dateHelper";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { useChatStore } from "@/stores/chatStore";
import { MoreVertical, Pin, Trash2, Ban, Star, Lock } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useLockChat } from "@/hooks/useChatAction";

interface ContactItemProps {
  contact: Contact;
  isActive: boolean;
  onClick: () => void;
  // Actions
  onPin?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBlock?: (id: string) => void;
}

export default function ContactItem({
  contact,
  isActive,
  onClick,
  onDelete,
  onBlock,
}: ContactItemProps) {
  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { timeFormat } = useAppearanceStore();
  

  const { togglePin, toggleFavorite } = useChatStore();
  const {mutate: chatLock} = useLockChat(contact.customChatId as string);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={onClick}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 outline-none relative group cursor-pointer",
            "hover:bg-sky-100/50 dark:hover:bg-slate-800/60",
            isActive
              ? "bg-sky-100/80 dark:bg-sky-500/10 border-l-[3px] border-sky-600 dark:border-sky-500"
              : "bg-transparent border-l-[3px] border-transparent hover:border-sky-300 dark:hover:border-slate-600",
          )}
        >
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11 border border-slate-200/10 dark:border-slate-800 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <AvatarImage src={contact.avatar} alt={contact.name} />
              <AvatarFallback className="bg-linear-to-br from-sky-400 to-blue-600 text-white text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {contact.isOnline && (
              <span
                className={cn(
                  "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500",
                  "ring-2 ring-white dark:ring-[#0b141a] shadow-sm",
                )}
              />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              {/* Name & Pinned/Favorite Icons Container */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={cn(
                    "text-sm truncate transition-colors",
                    contact.unreadCount
                      ? "font-bold text-slate-900 dark:text-slate-50"
                      : "font-medium text-slate-700 dark:text-slate-300",
                    isActive && "text-sky-600 dark:text-sky-400",
                  )}
                >
                  {contact.name}
                </span>

                {contact.isPinned && (
                  <Pin className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500 fill-slate-400/20" />
                )}

                {contact.isFavorite && (
                  <Star className="h-3 w-3 shrink-0 text-amber-400 fill-amber-400" />
                )}
              </div>

              {/* Time */}
              {contact.lastMessage?.createdAt && (
                <span
                  className={cn(
                    "text-[10px] shrink-0",
                    contact.unreadCount
                      ? "text-sky-600 dark:text-sky-400 font-bold"
                      : "text-slate-400 dark:text-slate-500",
                  )}
                >
                  {timeFormatFn(contact.lastMessage.createdAt, timeFormat)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "text-xs truncate transition-colors max-w-[160px]",
                  contact.unreadCount
                    ? "text-slate-800 dark:text-slate-200 font-medium"
                    : "text-slate-500 dark:text-slate-500/80",
                )}
              >
                {contact.lastMessage?.content ?? "No messages yet"}
              </span>

              {!!contact.unreadCount && (
                <span
                  className={cn(
                    "shrink-0 h-5 min-w-[20px] px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md",
                    "bg-sky-500 animate-in zoom-in-75 duration-200",
                  )}
                >
                  {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors outline-none"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-48 dark:bg-slate-900 dark:border-slate-800 z-50"
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin?.(contact.customChatId as string);
                  }}
                  className="cursor-pointer gap-2"
                >
                  <Pin className="h-4 w-4 text-slate-500" />
                  <span>{contact.isPinned ? "Unpin Chat" : "Pin Chat"}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite?.(contact.customChatId as string);
                  }}
                  className="cursor-pointer gap-2"
                >
                  <Star className="h-4 w-4 text-slate-500" />
                  <span>
                    {contact.isFavorite
                      ? "Remove from Favorites"
                      : "Add to Favorites"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    chatLock();
                  }}
                  className="cursor-pointer gap-2"
                >
                  <Lock className="h-4 w-4 text-slate-500" />
                  <span className="capitalize">
                    chat lock
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="dark:bg-slate-800" />

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onBlock?.(contact._id);
                  }}
                  className="cursor-pointer gap-2 text-orange-600 dark:text-orange-500"
                >
                  <Ban className="h-4 w-4" />
                  <span>Block User</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(contact.customChatId as string);
                  }}
                  className="cursor-pointer gap-2 text-red-600 dark:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Chat</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48 dark:bg-slate-900 dark:border-slate-800 z-50">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            togglePin?.(contact.customChatId as string);
          }}
          className="cursor-pointer gap-2"
        >
          <Pin className="h-4 w-4 text-slate-500" />
          <span>{contact.isPinned ? "Unpin Chat" : "Pin Chat"}</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite?.(contact.customChatId as string);
          }}
          className="cursor-pointer gap-2"
        >
          <Star className="h-4 w-4 text-slate-500" />
          <span>
            {contact.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          </span>
        </ContextMenuItem>

        <ContextMenuSeparator className="dark:bg-slate-800" />

        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onBlock?.(contact._id);
          }}
          className="cursor-pointer gap-2 text-orange-600 dark:text-orange-500"
        >
          <Ban className="h-4 w-4" />
          <span>Block User</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(contact.customChatId as string);
          }}
          className="cursor-pointer gap-2 text-red-600 dark:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Chat</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
