"use client";
import { useState } from "react";
import { MessageSquareDashed } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import InputBar from "../input/InputBar";
import ProfilePanel from "@/components/profile/userProfile";
import { useChatStore } from "@/stores/chatStore";

export default function ChatWindow() {
  const { activeContact } = useChatStore();
  const [showProfile, setShowProfile] = useState(false);

  if (!activeContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <div className="h-20 w-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 shadow-sm flex items-center justify-center">
          <MessageSquareDashed className="h-9 w-9 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
            No conversation selected
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Choose a contact from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <ChatHeader onProfileClick={() => setShowProfile(true)} />
      <MessageList />
      <InputBar />
      {showProfile && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setShowProfile(false)}
        />
      )}
      <ProfilePanel
        userId={activeContact._id}
        open={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
}
