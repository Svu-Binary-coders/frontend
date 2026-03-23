"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/useChatStore";

export default function ChatInput() {
  const { msgInput, editingMsg, replyTo, activeContact, myId, handleTyping, sendMessage, setMsgInput } = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when entering reply or edit mode
  useEffect(() => {
    if (replyTo || editingMsg) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [replyTo, editingMsg]);

  const cancelAction = () => {
    useChatStore.setState({ editingMsg: null, replyTo: null });
    setMsgInput("");
  };

  return (
    <div>
      {/* Edit / Reply bar */}
      {(editingMsg || replyTo) && (
        <div className="px-4 pt-2 flex items-center gap-2">
          <div className={`flex-1 rounded-lg px-3 py-1.5 flex items-center gap-2 border ${editingMsg ? "bg-zinc-800/60 border-indigo-500/40" : "bg-zinc-800/60 border-zinc-600/40"}`}>
            <svg
              className={`w-3.5 h-3.5 shrink-0 ${editingMsg ? "text-indigo-400" : "text-zinc-400"}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            >
              {editingMsg ? (
                <>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </>
              ) : (
                <>
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </>
              )}
            </svg>
            <span className={`text-[11px] font-medium shrink-0 ${editingMsg ? "text-indigo-400" : "text-zinc-400"}`}>
              {editingMsg
                ? "Editing"
                : `Reply to ${replyTo?.senderId === myId ? "yourself" : activeContact?.name.split(" ")[0]}`}
            </span>
            <span className="text-zinc-500 text-[11px] truncate">
              {editingMsg?.content ?? replyTo?.content}
            </span>
          </div>
          <button
            onClick={cancelAction}
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-800/40 flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder={editingMsg ? "Edit message..." : "Type a message..."}
          value={msgInput}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm outline-none focus:border-indigo-500/70 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!msgInput.trim()}
          className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 rounded-xl flex items-center justify-center text-white shrink-0 transition-all"
        >
          {editingMsg ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}