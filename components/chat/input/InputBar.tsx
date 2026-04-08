"use client";
import { useRef } from "react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  X,
  CornerUpRight,
  Pencil,
  Film,
  Music,
  FileText,
  Plus,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useMediaStore, SelectedMedia } from "@/stores/mediaStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── File type icon ──
function FileTypeIcon({ type }: { type: string }) {
  if (type === "video") return <Film className="h-6 w-6 text-purple-500" />;
  if (type === "audio") return <Music className="h-6 w-6 text-green-500" />;
  return <FileText className="h-6 w-6 text-orange-500" />;
}

// ── File size label ──
function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function InputBar() {
  const {
    msgInput,
    handleTyping,
    sendMessage,
    editingMsg,
    replyTo,
    showEmojiPicker,
    setShowEmojiPicker,
    activeContact,
    addOptimisticMessage,
    replaceTempMessage,
    removeTempMessage,
  } = useChatStore();

  const {
    selectedMedias,
    isUploading,
    addFiles,
    removeFile,
    clearMedia,
    uploadAndConfirm,
  } = useMediaStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // ── file picker entries ──
  const pickers = [
    {
      id: "picker-image",
      icon: ImageIcon,
      label: "Image",
      accept: "image/jpeg,image/png,image/webp,image/gif",
      multiple: true,
    },
    {
      id: "picker-video",
      icon: Film,
      label: "Video",
      accept: "video/mp4,video/webm,video/quicktime",
      multiple: false,
    },
    {
      id: "picker-audio",
      icon: Music,
      label: "Audio",
      accept: "audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4",
      multiple: false,
    },
    {
      id: "picker-file",
      icon: FileText,
      label: "File",
      accept: ".pdf,.zip,.rar,.doc,.docx,.xls,.xlsx,.txt,.csv",
      multiple: true,
    },
  ] as const;

  // ── handlers ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const { ok, error } = addFiles(files);
    if (!ok && error) toast.error(error);
    e.target.value = "";
  };

  const handleEmojiClick = (emojiObject: EmojiClickData) => {
    handleTyping(msgInput + emojiObject.emoji);
    inputRef.current?.focus();
  };

  const clearContext = () => {
    useChatStore.setState({ editingMsg: null, replyTo: null, msgInput: "" });
    inputRef.current?.focus();
  };

  const onSendMessage = async () => {
    if (!activeContact) return;

    // ── media send ──
    if (selectedMedias.length > 0) {
      const customChatId = activeContact.customChatId;
      if (!customChatId) {
        toast.error("Failed to send media: missing chat ID");
        return;
      }

      const text = msgInput.trim();
      useChatStore.setState({ msgInput: "" });
      inputRef.current?.focus();

      await uploadAndConfirm(
        customChatId,
        text,
        (tempMsg) => addOptimisticMessage(tempMsg),
        (realData) => replaceTempMessage(realData.tempId, realData),
        (tempId) => {
          removeTempMessage(tempId);
          toast.error("Failed to send media");
        },
      );
      return;
    }

    // ── text send ──
    if (msgInput.trim()) {
      sendMessage();
      setShowEmojiPicker(false);
      inputRef.current?.focus();
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
      clearMedia();
    }
  };

  const hasContent = msgInput.trim().length > 0 || selectedMedias.length > 0;

  const openPicker = (id: string) => {
    document.getElementById(id)?.click();
  };

  return (
    <div className="relative border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3 shrink-0 transition-colors duration-200">
      {/* ── Hidden file inputs ── */}
      {pickers.map(({ id, accept, multiple, label }) => (
        <input
          key={label}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
      ))}

      {/* ── Emoji picker ── */}
      {showEmojiPicker && (
        <div
          ref={emojiRef}
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

      {/* ── Reply / Edit bar ── */}
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
            <Pencil className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          ) : (
            <CornerUpRight className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          )}
          <span
            className={cn(
              "font-semibold shrink-0 tracking-wide",
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
            className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Media preview strip ── */}
      {selectedMedias.length > 0 && (
        <div className="flex items-end gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {selectedMedias.map((m: SelectedMedia) => (
            <div key={m.id} className="relative shrink-0 group/thumb">
              {/* image thumbnail */}
              {m.type === "image" ? (
                <img
                  src={m.previewUrl}
                  alt={m.file.name}
                  className="h-16 w-16 object-cover rounded-xl border-2 border-sky-200 dark:border-sky-800"
                />
              ) : (
                // video / audio / file → icon + name + size
                <div className="h-16 w-16 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-0.5 px-1">
                  <FileTypeIcon type={m.type} />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate w-full text-center px-0.5 leading-tight">
                    {m.file.name.length > 10
                      ? m.file.name.slice(0, 8) + "…"
                      : m.file.name}
                  </span>
                  <span className="text-[8px] text-slate-400">
                    {sizeLabel(m.file.size)}
                  </span>
                </div>
              )}

              {/* remove button */}
              <button
                onClick={() => removeFile(m.id)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>

              {/* type badge */}
              <span
                className={cn(
                  "absolute bottom-0.5 left-0.5 text-[8px] font-bold px-1 py-0.5 rounded-md uppercase",
                  m.type === "image" &&
                    "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
                  m.type === "video" &&
                    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                  m.type === "audio" &&
                    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                  m.type === "file" &&
                    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                )}
              >
                {m.type}
              </span>
            </div>
          ))}

          {/* + more button */}
          {selectedMedias.length < 5 && (
            <button
              onClick={() => openPicker("picker-image")}
              className="h-16 w-16 shrink-0 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-sky-400 hover:text-sky-500 dark:hover:border-sky-500 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[9px]">Add more</span>
            </button>
          )}
        </div>
      )}

      {/* ── Input row ── */}
      <div className="flex items-end gap-2">
        {/* Attachment picker */}
        <div className="relative group/picker mb-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={isUploading}
            className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <Paperclip className="h-4.5 w-4.5 text-slate-400 hover:text-sky-500 transition-colors" />
          </Button>

          {/* popup menu */}
          <div
            className={cn(
              "absolute bottom-11 left-0 z-50",
              "bg-white dark:bg-slate-900",
              "border border-slate-200 dark:border-slate-700",
              "rounded-2xl shadow-lg p-1.5",
              "flex flex-col gap-0.5 min-w-[130px]",
              "opacity-0 pointer-events-none scale-95 origin-bottom-left",
              "group-focus-within/picker:opacity-100 group-focus-within/picker:pointer-events-auto group-focus-within/picker:scale-100",
              "group-hover/picker:opacity-100 group-hover/picker:pointer-events-auto group-hover/picker:scale-100",
              "transition-all duration-150",
            )}
          >
            {pickers.map(({ id, icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => openPicker(id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Icon className="h-4 w-4 text-sky-500 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Text input box */}
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
            placeholder={
              selectedMedias.length > 0
                ? "Add a caption..."
                : "Write your message here..."
            }
            className="flex-1 bg-transparent text-[15px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none w-full"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
          >
            <Smile className="h-4 w-4 text-slate-400 hover:text-amber-500 transition-colors" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          onClick={onSendMessage}
          disabled={!hasContent}
          size="icon"
          className={cn(
            "h-11 w-11 rounded-2xl shrink-0 transition-all duration-200 shadow-sm",
            "bg-sky-500 hover:bg-sky-600 text-white",
            "dark:bg-sky-600 dark:hover:bg-sky-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            hasContent ? "scale-100" : "scale-95",
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Keyboard hints ── */}
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
