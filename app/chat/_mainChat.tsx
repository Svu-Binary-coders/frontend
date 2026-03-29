"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";
import ChatLayout from "@/components/chat/ChatLayout";
import { Loader2 } from "lucide-react";
import { useChatHistory } from "@/hooks/useChatHistory";

export default function ChatPage() {
  const { myId, activeContact } = useChatStore();
const { isLoading: msgLoading } = useChatHistory(
  myId,
  activeContact?.customChatId,
  activeContact?._id
);

  if (msgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <p className="text-sm text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return <ChatLayout />;
}
