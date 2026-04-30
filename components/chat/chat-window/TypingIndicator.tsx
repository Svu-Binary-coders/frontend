"use client";
import { useChatStore } from "@/stores/chatStore";

export default function TypingIndicator() {
  const isTyping = useChatStore((state) => state.isTyping);
  const activeContact = useChatStore((state) => state.activeContact);

  if (!isTyping || !activeContact) return null;

  return (
    <div className="flex items-end gap-2 px-4 pb-2">
      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
        <span className="text-xs text-slate-400 dark:text-slate-500 italic">
          {activeContact.name.split(" ")[0]} is typing
        </span>
        <div className="flex items-center gap-0.5 ml-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
