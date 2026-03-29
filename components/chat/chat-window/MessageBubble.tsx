"use client";
import { Message, MessageStatus } from "@/types/chat";
import { formatTime } from "@/utils/date"; // যদি না লাগে, তবে রিমুভ করতে পারেন
import { useAuthStore } from "@/stores/authStore";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Ban,
  Star,
  CornerUpRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { timeFormatFn } from "@/lib/dateHelper";

interface MessageBubbleProps {
  message: Message;
}

const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === MessageStatus.SENDING)
    return <Clock className="h-3 w-3 text-white/60" />;
  if (status === MessageStatus.FAILED)
    return <AlertCircle className="h-3 w-3 text-red-300" />;
  if (status === MessageStatus.SENT)
    return <Check className="h-3 w-3 text-white/60" />;
  if (status === MessageStatus.DELIVERED)
    return <CheckCheck className="h-3 w-3 text-white/60" />;
  if (status === MessageStatus.READ)
    return <CheckCheck className="h-3 w-3 text-sky-300" />;
  return null;
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { myId } = useAuthStore();
  const { openCtx } = useChatStore();
  const { fontStyle, textSize, bubbleStyle, compactMode, timeFormat } =
    useAppearanceStore();

  const isMine = message.senderId === myId;
  const isDeleted = message.is_deleted_for_everyone;

  const radius =
    bubbleStyle === "modern"
      ? isMine
        ? "rounded-2xl rounded-br-sm"
        : "rounded-2xl rounded-bl-sm"
      : bubbleStyle === "classic"
        ? "rounded-lg"
        : "rounded-none";

  // ──> 🛠️ মেসেজে স্ক্রল এবং হাইলাইট করার ম্যাজিক ফাংশন <──
  const scrollToOriginalMessage = () => {
    if (!message.replyTo?._id) return;

    const targetElement = document.getElementById(
      `message-${message.replyTo._id}`,
    );

    if (targetElement) {
      // ১. স্মুথভাবে স্ক্রল করে সেখানে যাওয়া
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

      // ২. প্রো-লেভেল UX: মেসেজটি হাইলাইট করা (Blink effect)
      targetElement.classList.add(
        "opacity-50",
        "scale-[1.02]",
        "transition-all",
        "duration-300",
      );
      setTimeout(() => {
        targetElement.classList.remove("opacity-50", "scale-[1.02]");
      }, 800);
    }
  };

  return (
    // ──> 🛠️ এখানে id টা বসানো হয়েছে <──
    <div
      id={`message-${message._id}`}
      className={cn(
        "flex items-end gap-2 group transition-all duration-200",
        compactMode ? "mb-0.5" : "mb-3",
        isMine ? "ml-auto flex-row-reverse" : "mr-auto",
        "max-w-[80%]",
      )}
    >
      <div
        onContextMenu={(e) => !isDeleted && openCtx(e, message, isMine)}
        className={cn(
          "relative cursor-context-menu select-text transition-all duration-150 group-hover:shadow-md",
          "leading-relaxed",

          fontStyle,
          textSize,
          radius,

          compactMode ? "px-2.5 py-1" : "px-4 py-2.5",

          isMine
            ? "bg-sky-600 text-white dark:bg-sky-600"
            : "bg-slate-100 text-slate-700 border border-slate-100 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
          isDeleted && "opacity-70 italic",
        )}
      >
        {!isDeleted && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCtx(e, message, isMine);
            }}
            className={cn(
              "absolute top-1 right-1 p-0.5 rounded-full z-10",
              "transition-all duration-200",
              "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100",

              isMine
                ? "bg-sky-700/50 text-white hover:bg-sky-800/80 dark:bg-sky-800/60 dark:hover:bg-sky-900/80"
                : "bg-slate-200/80 text-slate-500 hover:bg-slate-300 dark:bg-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-600",
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {/* Reply Section */}
        {message.replyTo && !isDeleted && (
          <div
            onClick={scrollToOriginalMessage}
            className={cn(
              "flex items-start gap-1.5 mb-2 px-2 py-1.5 rounded-lg text-[11px] border-l-2 cursor-pointer hover:opacity-80 transition-opacity", // cursor-pointer যোগ করা হয়েছে
              isMine
                ? "border-sky-300 bg-sky-400/30"
                : "border-slate-300 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-600",
            )}
          >
            <CornerUpRight className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-60" />

            <div className="flex flex-col min-w-0">
              <span className="font-bold opacity-90 mb-0.5 text-[10px]">
                {message.replyTo.senderId === myId ? "You" : "Message"}
              </span>
              <span className="truncate opacity-80 max-w-[200px]">
                {message.replyTo.content}
              </span>
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col gap-0.5 pr-2">
          {isDeleted ? (
            <span className="flex items-center gap-1.5 text-xs opacity-80">
              <Ban className="h-3.5 w-3.5 flex-shrink-0" />
              This message was deleted
            </span>
          ) : (
            <span className="whitespace-pre-wrap break-words">
              {message.content}
            </span>
          )}

          {/* Metadata (Time, Star, Status) */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 select-none",
              compactMode ? "mt-0" : "mt-1",
            )}
          >
            {message.isImportant && (
              <Star className="h-2.5 w-2.5 fill-current text-amber-400 opacity-90" />
            )}
            {message.is_edited && !isDeleted && (
              <span className="text-[9px] opacity-50 uppercase font-bold">
                edited
              </span>
            )}
            {message.createdAt && (
              <span className="text-[10px] opacity-60 font-medium">
                {timeFormatFn(message.createdAt, timeFormat)}
              </span>
            )}
            {isMine && message.status && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
    </div>
  );
}
