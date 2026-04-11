"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { groupMessagesByDate } from "@/utils/date";
import MessageBubble from "./MessageBubble";
import DateDivider from "./DateDivider";
import TypingIndicator from "./TypingIndicator";
import { MessageSquare, Loader2, ChevronDown } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export default function MessageList() {
  const { messages, activeContact } = useChatStore();
  const { wallpaper, compactMode } = useAppearanceStore();
  const { myId } = useAuthStore();

  const {
    isLoading: msgLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useChatHistory(myId, activeContact?.customChatId, activeContact?._id);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const prevLengthRef = useRef(0);
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);

  // 🟢 State: Floating Scroll Button
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 🟢 React Warning Fix: Render Phase State Update
  const [prevContactId, setPrevContactId] = useState(activeContact?._id);
  if (activeContact?._id !== prevContactId) {
    setPrevContactId(activeContact?._id);
    setShowScrollButton(false); // চ্যাট চেঞ্জ হলে বাটন সাথে সাথে হাইড হয়ে যাবে
  }

  //  Helper Function
  const scrollToBottom = (behavior: ScrollBehavior = "instant") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // 1. Chat Switch Reset
  useEffect(() => {
    isFirstLoad.current = true;
    prevLengthRef.current = 0;
  }, [activeContact?._id]);

  // 2. Initial Load Scroll
  useEffect(() => {
    if (messages.length > 0 && isFirstLoad.current) {
      setTimeout(() => {
        scrollToBottom("instant");
      }, 10);
      isFirstLoad.current = false;
    }
  }, [messages.length, activeContact?._id]);

  // 3. New Message Scroll Logic
  useEffect(() => {
    if (isFirstLoad.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const newLength = messages.length;
    const added = newLength - prevLengthRef.current;
    prevLengthRef.current = newLength;

    if (added === 1) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        150;

      if (isNearBottom) {
        setTimeout(() => {
          scrollToBottom("smooth");
        }, 10);
      } else {
        setTimeout(() => {
          setShowScrollButton(true);
        }, 0);
      }
    }
  }, [messages]);

  // 4. Restore scroll position after fetching older messages
  useEffect(() => {
    if (!isFetchingNextPage) {
      const container = scrollContainerRef.current;
      if (!container || !prevScrollHeightRef.current) return;
      const added = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop += added;
      prevScrollHeightRef.current = 0;
    }
  }, [isFetchingNextPage]);

  //  Handle Scroll (Top & Bottom)
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Fetch older messages when scrolled to top
    if (
      container.scrollTop < 80 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchingRef.current
    ) {
      isFetchingRef.current = true;
      prevScrollHeightRef.current = container.scrollHeight;
      fetchNextPage().finally(() => {
        isFetchingRef.current = false;
      });
    }

    // Floating Button Logic
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 250) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  //  Wallpaper Styles
  const wallpaperBg =
    wallpaper === "gradient1"
      ? "bg-linear-to-br from-sky-100 to-blue-50 dark:from-sky-900 dark:to-slate-900"
      : wallpaper === "gradient2"
        ? "bg-linear-to-br from-rose-100 to-pink-50 dark:from-rose-900 dark:to-slate-900"
        : wallpaper === "gradient3"
          ? "bg-linear-to-br from-emerald-100 to-teal-50 dark:from-emerald-900 dark:to-slate-900"
          : "bg-white dark:bg-[#0b141a]";

  const wallpaperStyle: React.CSSProperties =
    wallpaper === "dots"
      ? {
          backgroundImage:
            "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }
      : wallpaper === "grid"
        ? {
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }
        : {};

  //  Renders
  if (msgLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0b141a]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 transition-colors duration-300",
          wallpaperBg,
        )}
        style={wallpaperStyle}
      >
        <div className="h-14 w-14 rounded-2xl bg-white/20 dark:bg-slate-800/50 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/20">
          <MessageSquare className="h-7 w-7 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
          No messages yet
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Send a message to start the conversation
        </p>
      </div>
    );
  }

  const grouped = groupMessagesByDate(messages);

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/*  Main Message Container  */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 transition-colors duration-300",
          wallpaperBg,
        )}
        style={wallpaperStyle}
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          </div>
        )}

        {!hasNextPage && messages.length > 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 py-3">
            Beginning of conversation
          </p>
        )}

        <div
          className={cn(
            "flex flex-col px-5 py-4",
            compactMode ? "gap-0.5" : "gap-1.5",
          )}
        >
          {grouped.map((group) => (
            <div key={group.label} className="flex flex-col">
              <DateDivider label={group.label} />
              <div
                className={cn(
                  "flex flex-col",
                  compactMode ? "gap-0.5" : "gap-1.5",
                )}
              >
                {group.messages.map((msg) => (
                  <MessageBubble key={msg._id} message={msg} />
                ))}
              </div>
            </div>
          ))}
          <TypingIndicator />
          <div ref={bottomRef} />
        </div>
      </div>

      {/*  Floating Go to Bottom Button  */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-6 right-6 p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all z-50 animate-in fade-in slide-in-from-bottom-5"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
