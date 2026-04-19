"use client";
import { useRef, useEffect } from "react";
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
  Loader2,
  Check,
  Mic, // 🔴 New Icon
  Trash2, // 🔴 New Icon
  Square, // 🔴 New Icon
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import {
  useMediaStore,
  SelectedMedia,
  UploadingMedia,
} from "@/stores/mediaStore";
import { useVoiceStore } from "@/stores/voiceStore"; // 🔴 New Store
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// File type icon
function FileTypeIcon({ type }: { type: string }) {
  if (type === "video") return <Film className="h-6 w-6 text-purple-400" />;
  if (type === "audio") return <Music className="h-6 w-6 text-green-400" />;
  return <FileText className="h-6 w-6 text-orange-400" />;
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
// Helper to safely extract string from object
const safeStr = (val: unknown): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const obj = val as any;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.content === "string") return obj.content;
  }
  return "";
};
//  Time Formatter Helper for Voice Recording
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// SVG circular progress ring
function CircularProgress({
  progress,
  done,
}: {
  progress: number;
  done: boolean;
}) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
      {done ? (
        <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          <svg width="52" height="52" className="-rotate-90">
            <circle
              cx="26"
              cy="26"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="4"
            />
            <circle
              cx="26"
              cy="26"
              r={r}
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.2s ease-out" }}
            />
          </svg>
          <span className="absolute text-[11px] font-bold text-white tabular-nums">
            {progress}%
          </span>
        </div>
      )}
    </div>
  );
}

// Uploading thumbnail card
function UploadingThumb({ item }: { item: UploadingMedia }) {
  return (
    <div className="relative shrink-0 h-16 w-16">
      {item.type === "image" && item.previewUrl ? (
        <img
          src={item.previewUrl}
          alt={item.name}
          className="h-full w-full object-cover rounded-xl"
        />
      ) : (
        <div className="h-full w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-0.5 px-1">
          <FileTypeIcon type={item.type} />
          <span className="text-[8px] text-slate-400">
            {sizeLabel(item.size)}
          </span>
        </div>
      )}
      <CircularProgress progress={item.progress} done={item.done} />
      <span
        className={cn(
          "absolute top-0.5 left-0.5 text-[8px] font-bold px-1 py-0.5 rounded-md uppercase",
          item.type === "image" && "bg-sky-500/80 text-white",
          item.type === "video" && "bg-purple-500/80 text-white",
          item.type === "audio" && "bg-green-500/80 text-white",
          item.type === "file" && "bg-orange-500/80 text-white",
        )}
      >
        {item.type}
      </span>
    </div>
  );
}

// Pending thumbnail card
function PendingThumb({
  item,
  onRemove,
}: {
  item: SelectedMedia;
  onRemove: () => void;
}) {
  return (
    <div className="relative shrink-0 group/thumb h-16 w-16">
      {item.type === "image" ? (
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="h-full w-full object-cover rounded-xl border-2 border-sky-200 dark:border-sky-800"
        />
      ) : (
        <div className="h-full w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-0.5 px-1">
          <FileTypeIcon type={item.type} />
          <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate w-full text-center px-0.5 leading-tight">
            {item.file.name.length > 10
              ? item.file.name.slice(0, 8) + "…"
              : item.file.name}
          </span>
          <span className="text-[8px] text-slate-400">
            {sizeLabel(item.file.size)}
          </span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity shadow-sm"
      >
        <X className="h-3 w-3" />
      </button>
      <span
        className={cn(
          "absolute bottom-0.5 left-0.5 text-[8px] font-bold px-1 py-0.5 rounded-md uppercase",
          item.type === "image" &&
            "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
          item.type === "video" &&
            "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
          item.type === "audio" &&
            "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
          item.type === "file" &&
            "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        )}
      >
        {item.type}
      </span>
    </div>
  );
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
    uploadingMedias,
    isUploading: isMediaUploading,
    addFiles,
    removeFile,
    clearMedia,
    uploadAndConfirm,
  } = useMediaStore();

  // 🔴 Voice Store Integration
  const {
    isRecording,
    recordingTime,
    compressedAudioFile,
    isUploading: isVoiceUploading,
    startRecording,
    stopRecording,
    cancelRecording,
    sendVoiceMessage,
  } = useVoiceStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    addFiles(files).then(({ ok, error }) => {
      if (!ok && error) toast.error(error);
    });
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
    if (!activeContact?.customChatId) return;

    // 🔴 1. Voice Message Send Logic
    if (compressedAudioFile) {
      if (isVoiceUploading) return;
      await sendVoiceMessage(activeContact.customChatId);
      return;
    }

    // 2. Media Send Logic
    if (selectedMedias.length > 0) {
      if (isMediaUploading) return;
      const text = msgInput.trim();
      useChatStore.setState({ msgInput: "" });
      inputRef.current?.focus();

      await uploadAndConfirm(
        activeContact.customChatId,
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

    // 3. Text Send Logic
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
      cancelRecording(); // 🔴 Cancel voice recording on Esc
    }
  };

  const openPicker = (id: string) => document.getElementById(id)?.click();

  // 🔴 Update hasContent to check for voice files too
  const hasContent =
    msgInput.trim().length > 0 ||
    selectedMedias.length > 0 ||
    !!compressedAudioFile;
  const isAnyUploading = isMediaUploading || isVoiceUploading;

  return (
    <div className="relative border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3 shrink-0 transition-colors duration-200">
      {/* Hidden file inputs */}
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

      {/* Emoji picker */}
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

      {/* Reply / Edit bar */}
      {(replyTo || editingMsg) && (
        <div
          className={cn(
            "flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl text-xs transition-colors duration-200",
            editingMsg
              ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50"
              : "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900/50",
          )}
        >
          {editingMsg ? (
            <Pencil className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          ) : (
            <CornerUpRight className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          )}
          <span
            className={cn(
              "font-semibold shrink-0",
              editingMsg ? "text-amber-600" : "text-sky-600",
            )}
          >
            {editingMsg ? "Editing" : "Replying to"}
          </span>
          <span className="text-slate-500 truncate flex-1 opacity-90">
            {safeStr(editingMsg?.content ?? replyTo?.content)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearContext}
            className="h-6 w-6 rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Media strip */}
      {(selectedMedias.length > 0 || uploadingMedias.length > 0) && (
        <div className="flex items-end gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {selectedMedias.map((m) => (
            <PendingThumb
              key={m.id}
              item={m}
              onRemove={() => removeFile(m.id)}
            />
          ))}
          {uploadingMedias.map((m) => (
            <UploadingThumb key={m.id} item={m} />
          ))}
          {!isMediaUploading &&
            selectedMedias.length < MAX_FILES &&
            selectedMedias.length > 0 && (
              <button
                onClick={() => openPicker("picker-image")}
                className="h-16 w-16 shrink-0 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[9px]">Add more</span>
              </button>
            )}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attachment picker */}
        <div className="relative group/picker mb-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={isAnyUploading || isRecording}
            className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 disabled:opacity-40"
          >
            <Paperclip className="h-4.5 w-4.5 text-slate-400" />
          </Button>

          <div
            className={cn(
              "absolute bottom-11 left-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-1.5 flex flex-col gap-0.5 min-w-[130px] opacity-0 pointer-events-none scale-95 origin-bottom-left group-focus-within/picker:opacity-100 group-focus-within/picker:pointer-events-auto group-focus-within/picker:scale-100 group-hover/picker:opacity-100 group-hover/picker:pointer-events-auto group-hover/picker:scale-100 transition-all duration-150",
            )}
          >
            {pickers.map(({ id, icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => openPicker(id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Icon className="h-4 w-4 text-sky-500 shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* 🔴 Dynamic Input Area (Text OR Voice Recording UI) */}
        <div
          className={cn(
            "flex-1 flex items-center min-h-[44px] gap-2 border rounded-2xl px-2 transition-all duration-200",
            isRecording || compressedAudioFile
              ? "bg-slate-50 border-sky-200 dark:bg-slate-900/50 dark:border-sky-900/50" // Voice Active Style
              : "bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:bg-slate-950 dark:border-slate-800 dark:focus-within:bg-slate-900 dark:focus-within:border-sky-500 dark:focus-within:ring-sky-900/30",
          )}
        >
          {isRecording ? (
            // Recording State UI
            <div className="flex flex-1 items-center justify-between px-2 w-full">
              <div className="flex items-center gap-2 text-red-500 animate-pulse">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="font-medium text-sm tabular-nums">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cancelRecording}
                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stopRecording}
                  className="h-8 w-8 text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/50 rounded-full"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              </div>
            </div>
          ) : compressedAudioFile ? (
            // Recorded Voice Preview UI
            <div className="flex flex-1 items-center gap-3 px-2 w-full">
              <audio
                controls
                src={URL.createObjectURL(compressedAudioFile)}
                className="h-8 flex-1 max-w-[200px]"
              />
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            // Normal Text Input State
            <>
              <input
                ref={inputRef}
                value={msgInput}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedMedias.length > 0 || uploadingMedias.length > 0
                    ? "Add a caption or write a message..."
                    : "Write your message here..."
                }
                className="flex-1 bg-transparent text-[15px] px-2 py-2.5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none w-full"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
              >
                <Smile className="h-4 w-4 text-slate-400 hover:text-amber-500 transition-colors" />
              </Button>
            </>
          )}
        </div>

        {/* 🔴 Dynamic Send / Record Button */}
        {!hasContent && !isRecording && !compressedAudioFile ? (
          // Microphone Button (When Input is empty)
          <Button
            onClick={startRecording}
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-2xl shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Mic className="h-5 w-5 text-slate-500" />
          </Button>
        ) : (
          // Send Button (When text/media/voice is present)
          <Button
            onClick={onSendMessage}
            disabled={(!hasContent && !isRecording) || isAnyUploading}
            size="icon"
            className={cn(
              "relative h-11 w-11 rounded-2xl shrink-0 transition-all duration-200 shadow-sm overflow-hidden",
              isRecording ? "hidden" : "flex", // Hide Send button while actively recording
              "bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-500",
              "disabled:opacity-80 disabled:cursor-not-allowed",
            )}
          >
            {isAnyUploading ? (
              <Loader2 className="relative h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Keyboard hints */}
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

const MAX_FILES = 5;
