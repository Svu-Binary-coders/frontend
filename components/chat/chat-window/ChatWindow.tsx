"use client";

import { useState, useEffect } from "react";
import { MessageSquareDashed } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import InputBar from "../input/InputBar";
import ProfilePanel from "@/components/profile/userProfile";
import { useChatStore } from "@/stores/chatStore";
import { useChatSettings } from "@/stores/chatSettingsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatWindow() {
  const { activeContact, contextMenu } = useChatStore();
  const [showProfile, setShowProfile] = useState(false);

  const [isBlurred, setIsBlurred] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const chatId = activeContact?.customChatId ?? activeContact?._id ?? "";
  const chatSettings = useChatSettings(chatId);
  const isProtected = !!chatSettings?.isScreenShotBlur;
  const isShowWatermark = !!chatSettings?.isScreenShotBlur;
  // screensort protctions
  useEffect(() => {
    if (!isProtected) {
      // Avoid calling setState synchronously inside effect to prevent cascading renders
      // Schedule state update on next tick
      const t = window.setTimeout(() => setIsBlurred(false), 0);
      return () => window.clearTimeout(t);
    }

    const blur = () => {
      if (useChatStore.getState().contextMenu) return;
      setIsBlurred(true);
    };

    const unblur = () => setIsBlurred(false);

    // Tab switch
    const handleVisibility = () => {
      if (document.hidden) blur();
      else unblur();
    };

    // Window focus/blur
    window.addEventListener("blur", blur);
    window.addEventListener("focus", unblur);
    document.addEventListener("visibilitychange", handleVisibility);

    // Keyboard screenshot attempts
    const onKey = (e: KeyboardEvent) => {
      const isScreenshot =
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") || // Windows Snip
        (e.metaKey && e.shiftKey && e.key === "4"); // Mac

      if (isScreenshot) {
        blur();
        toast.warning("Screenshot blocked 🛡️");
        setTimeout(unblur, 2000);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", unblur);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("keydown", onKey);
    };
  }, [isProtected]);

  useEffect(() => {
    if (isProtected && !contextMenu && !isHovering && !document.hidden) {
      const t = window.setTimeout(() => setIsBlurred(true), 0);
      return () => window.clearTimeout(t);
    }
  }, [contextMenu, isHovering, isProtected]);

  // copy block
  const handleCopy = (e: React.ClipboardEvent) => {
    if (isProtected && !chatSettings?.isCopyEnabled) {
      e.preventDefault();
      toast.error("Copy blocked 🚫");
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isProtected && !chatSettings?.isCopyEnabled) {
      e.preventDefault();
    }
  };

  // if no conversation is selected
  if (!activeContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <div className="h-20 w-20 rounded-3xl bg-white dark:bg-slate-900 border shadow-sm flex items-center justify-center">
          <MessageSquareDashed className="h-9 w-9 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-500">
            No conversation selected
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Choose a contact to start chatting
          </p>
        </div>
      </div>
    );
  }

  // ================================
  // ✅ MAIN UI
  // ================================
  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950"
      onMouseEnter={() => {
        setIsHovering(true);
        setIsBlurred(false);
      }}
      onMouseMove={() => {
        if (isBlurred) setIsBlurred(false);
        if (!isHovering) setIsHovering(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        if (isProtected && !useChatStore.getState().contextMenu) {
          setIsBlurred(true);
        }
      }}
    >
      <ChatHeader onProfileClick={() => setShowProfile(true)} />

      {/* 🔒 PROTECTION OVERLAY */}
      {isProtected && isBlurred && (
        <div className="absolute inset-0 z-50 backdrop-blur-xl bg-black/40 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="text-4xl">🛡️</div>
          <p className="text-white text-lg font-semibold">Protected Content</p>
        </div>
      )}

      {isProtected && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 opacity-5 text-6xl font-black pointer-events-none z-10 select-none">
          {activeContact?.name}
        </div>
      )}

      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          isProtected && isBlurred && "blur-md select-none",
        )}
        onCopy={handleCopy}
        onContextMenu={handleContextMenu}
      >
        <MessageList />
      </div>

      <InputBar />

      {/* PROFILE */}
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
