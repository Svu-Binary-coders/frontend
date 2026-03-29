"use client";
import { useState, useRef, useEffect } from "react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import {
  Send,
  Paperclip,
  Image,
  Smile,
  X,
  CornerUpRight,
  Pencil,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function InputBar() {
  const {
    msgInput,
    handleTyping,
    sendMessage,
    editingMsg,
    replyTo,
    setContextMenu,
    showEmojiPicker,
    setShowEmojiPicker
  } = useChatStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (replyTo || editingMsg) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [replyTo, editingMsg]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiObject: EmojiClickData) => {
    handleTyping(msgInput + emojiObject.emoji);
    inputRef.current?.focus();
  };

  const onSendMessage = () => {
    if (msgInput.trim()) {
      sendMessage();
      setShowEmojiPicker(false);
      inputRef.current?.focus(); // when send is clicked, keep the focus on the input for faster typing
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
    if (e.key === "Escape") {
      useChatStore.setState({ editingMsg: null, replyTo: null, msgInput: "" });
      setShowEmojiPicker(false);
    }
  };

  const clearContext = () => {
    useChatStore.setState({ editingMsg: null, replyTo: null, msgInput: "" });
    inputRef.current?.focus();
  };

  return (
    <div className="relative border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3 flex-shrink-0 transition-colors duration-200">
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-20 right-4 z-50 animate-in slide-in-from-bottom-5 duration-200 shadow-2xl rounded-2xl overflow-hidden"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            searchDisabled={false}
            skinTonesDisabled={true}
            width={320}
            height={400}
          />
        </div>
      )}

      {/* Reply / Edit preview bar */}
      {(replyTo || editingMsg) && (
        <div
          className={cn(
            "flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl text-xs transition-colors duration-200",
            editingMsg
              ? "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50"
              : "bg-sky-50 border border-sky-200 dark:bg-sky-950/30 dark:border-sky-900/50",
          )}
        >
          {editingMsg ? (
            <Pencil className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          ) : (
            <CornerUpRight className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 flex-shrink-0" />
          )}

          <span
            className={cn(
              "font-semibold flex-shrink-0 tracking-wide",
              editingMsg
                ? "text-amber-600 dark:text-amber-500"
                : "text-sky-600 dark:text-sky-400",
            )}
          >
            {editingMsg ? "Editing" : "Replying to"}
          </span>

          <span className="text-slate-500 dark:text-slate-400 truncate flex-1 opacity-90">
            {editingMsg?.content ?? replyTo?.content}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={clearContext}
            className={cn(
              "h-6 w-6 rounded-full flex-shrink-0",
              "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
            )}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attachment icons */}
        <div className="flex items-center mb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
          >
            <Paperclip className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
          >
            <Image className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors" />
          </Button>
        </div>

        {/* Input Box */}
        <div
          className={cn(
            "flex-1 flex items-center gap-2 border rounded-2xl px-4 py-2.5 transition-all duration-200",
            "bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100",
            "dark:bg-slate-950 dark:border-slate-800 dark:focus-within:bg-slate-900 dark:focus-within:border-sky-500 dark:focus-within:ring-sky-900/30",
          )}
        >
          <input
            ref={inputRef}
            value={msgInput}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message here..."
            id="chat-message-input"
            className="flex-1 bg-transparent text-[15px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none w-full"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex-shrink-0"
          >
            <Smile className="h-4 w-4 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" />
          </Button>
        </div>

        {/* Send Button */}
        <Button
          onClick={onSendMessage}
          disabled={!msgInput.trim()}
          size="icon"
          className={cn(
            "h-11 w-11 rounded-2xl flex-shrink-0 transition-all duration-200 shadow-sm",
            "bg-sky-500 hover:bg-sky-600 text-white",
            "dark:bg-sky-600 dark:hover:bg-sky-500",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sky-500 dark:disabled:hover:bg-sky-600",
            msgInput.trim() ? "scale-100" : "scale-95",
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Footer Info (Keyboard Shortcuts) */}
      <div className="hidden md:flex justify-center items-center gap-2 mt-3 text-[10px] font-medium text-slate-400 dark:text-slate-500 select-none">
        <span>
          Press
          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 mx-0.5 font-sans">
            Enter
          </kbd>
          to send
        </span>
        <span className="opacity-50">•</span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 mx-0.5 font-sans">
            Esc
          </kbd>
          to cancel
        </span>
      </div>
    </div>
  );
}
