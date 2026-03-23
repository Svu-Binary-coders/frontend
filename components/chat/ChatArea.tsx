"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { avatarColor, initials } from "@/lib/chat-helpers";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";

export default function ChatArea() {
  const { activeContact, messages, msgLoading, myId, isTyping, setShowNewChat, openCtx } = useChatStore();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeContact)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-700">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl">
          💬
        </div>
        <p className="title text-zinc-500">Select a conversation</p>
        <button
          onClick={() => setShowNewChat(true)}
          className="text-[11px] text-indigo-500 hover:text-indigo-400 border border-indigo-900/60 hover:border-indigo-600 rounded-full px-4 py-1.5 transition-all"
        >
          + New conversation
        </button>
      </div>
    );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
        <div className="relative shrink-0">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(activeContact._id)} flex items-center justify-center text-white text-xs font-bold`}>
            {activeContact.avatar
              ? <img src={activeContact.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              : initials(activeContact.name)}
          </div>
          {activeContact.isOnline && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-zinc-950 rounded-full" />
          )}
        </div>
        <div className="flex-1">
          <p className="title text-zinc-100 text-sm font-semibold">{activeContact.name}</p>
          <p className={`text-[11px] ${activeContact.isOnline ? "text-emerald-400" : "text-zinc-600"}`}>
            {activeContact.isOnline ? "Online" : "Offline"}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
          <p className="text-zinc-600 text-[10px] font-mono">{activeContact.customChatId || "direct"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {msgLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 bounce-dot" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-700">
            <span className="text-2xl">🗨️</span>
            <span className="text-xs">No messages yet</span>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageItem key={msg._id || idx} msg={msg} myId={myId} activeContact={activeContact} />
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="h-6 px-4 flex items-center gap-1.5">
        {isTyping && (
          <>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full bounce-dot" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-[11px] text-zinc-600">{activeContact.name.split(" ")[0]} typing...</span>
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  );
}