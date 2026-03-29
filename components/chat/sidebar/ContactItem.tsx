"use client";
import { Contact } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTime } from "@/utils/date";
import { cn } from "@/lib/utils";
import { timeFormatFn } from "@/lib/dateHelper";
import { useAppearanceStore } from "@/stores/appearanceStore";

interface ContactItemProps {
  contact: Contact;
  isActive: boolean;
  onClick: () => void;
}

export default function ContactItem({
  contact,
  isActive,
  onClick,
}: ContactItemProps) {
  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
    const { timeFormat } = useAppearanceStore();
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 outline-none relative group",

        // Hover & Active States (Light Mode e Sky color, Dark Mode e Dark gray)
        "hover:bg-sky-100/50 dark:hover:bg-slate-800/60",
        "active:bg-sky-200/50 dark:active:bg-slate-700/80",

        isActive
          ? "bg-sky-100/80 dark:bg-sky-500/10 border-l-[3px] border-sky-600 dark:border-sky-500"
          : "bg-transparent border-l-[3px] border-transparent hover:border-sky-300 dark:hover:border-slate-600",
      )}
    >
      {/* Avatar Section */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11 border border-slate-200/10 dark:border-slate-800 shadow-sm transition-transform duration-200 group-hover:scale-105">
          <AvatarImage src={contact.avatar} alt={contact.name} />
          <AvatarFallback className="bg-gradient-to-br from-sky-400 to-blue-600 text-white text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Online Indicator */}
        {contact.isOnline && (
          <span
            className={cn(
              "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500",
              "ring-2 ring-white dark:ring-[#0b141a] shadow-sm",
            )}
          />
        )}
      </div>

      {/* Info Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          {/* Contact Name */}
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

          {/* Time */}
          {contact.lastMessage?.createdAt && (
            <span
              className={cn(
                "text-[10px] flex-shrink-0",
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
          {/* Last Message Content */}
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

          {/* Unread Badge */}
          {!!contact.unreadCount && (
            <span
              className={cn(
                "flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md",
                "bg-sky-500 animate-in zoom-in-75 duration-200",
              )}
            >
              {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
