"use client";
import { useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      //  Ctrl + S (Search)
      if (isCtrlOrCmd && e.key.toLowerCase() === "s") {
        e.preventDefault();
      }

      //  Ctrl + E (Emoji)
      if (isCtrlOrCmd && e.key.toLowerCase() === "e") {
        e.preventDefault();
        useChatStore.setState((state) => ({
          showEmojiPicker: !state.showEmojiPicker,
        }));
      }

      //   Ctrl + / (Focus Input)
      if (isCtrlOrCmd && e.key === "/") {
        e.preventDefault();
        document.getElementById("chat-message-input")?.focus();
      }

      //   Escape (Close everything)
      if (e.key === "Escape") {
        useChatStore.setState({
          editingMsg: null,
          replyTo: null,
          contextMenu: null,
          showEmojiPicker: false,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
};
