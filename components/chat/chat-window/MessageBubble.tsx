/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Message, MessageStatus } from "@/types/chat";
import { useAuthStore } from "@/stores/authStore";
import LinkPreviewCard from "./LinkPreviewCard";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Ban,
  Star,
  CornerUpRight,
  ChevronDown,
  Download,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  File,
  FileSpreadsheet,
  Headphones,
  FileArchive,
  FileCode,
  FileAudio,
  FileVideo,
  FileImage,
  Play,
  Pause,
  Mic,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { timeFormatFn } from "@/lib/dateHelper";
import { MediaViewer } from "../media/MediaViewer";
import { VideoPlayer } from "../media/VideoPlayer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── helpers ────────────────────────────────────────────────────────────────

const sizeLabel = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ─── FileIcon ────────────────────────────────────────────────────────────────

export const FileIcon = ({
  mimeType,
  className,
}: {
  mimeType: string;
  className?: string;
}) => {
  const mime = mimeType?.toLowerCase() || "";
  if (mime.startsWith("image/"))
    return <FileImage className={cn("text-purple-400", className)} />;
  if (mime.startsWith("video/"))
    return <FileVideo className={cn("text-pink-400", className)} />;
  if (mime.startsWith("audio/"))
    return <Music className={cn("text-orange-400", className)} />;
  if (
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("json") ||
    mime.includes("html") ||
    mime.includes("css") ||
    mime.includes("xml") ||
    mime.includes("sql")
  )
    return (
      <FileCode
        className={cn("text-yellow-400 dark:text-yellow-300", className)}
      />
    );
  if (mime.includes("pdf"))
    return <FileText className={cn("text-red-400", className)} />;
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("tar") ||
    mime.includes("7z")
  )
    return (
      <FileArchive
        className={cn("text-amber-500 dark:text-amber-400", className)}
      />
    );
  if (mime.includes("word") || mime.includes("document"))
    return (
      <FileText className={cn("text-blue-400 dark:text-blue-300", className)} />
    );
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return (
      <FileSpreadsheet
        className={cn("text-green-500 dark:text-green-400", className)}
      />
    );
  if (mime.startsWith("text/"))
    return (
      <FileText
        className={cn("text-slate-400 dark:text-slate-300", className)}
      />
    );
  return <File className={cn("text-slate-400", className)} />;
};

// ─── Download button ─────────────────────────────────────────────────────────
type DlState = "idle" | "downloading" | "done" | "error";

function useDownload() {
  const [state, setState] = useState<DlState>("idle");
  const [progress, setProgress] = useState(0);

  const download = useCallback(
    async (url: string, name?: string) => {
      if (state === "downloading") return;
      setState("downloading");
      setProgress(0);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch failed");
        const total = Number(response.headers.get("content-length") ?? 0);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");
        const chunks: ArrayBuffer[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const copy = new Uint8Array(value.byteLength);
          copy.set(value);
          chunks.push(copy.buffer);
          received += value.byteLength;
          setProgress(total ? Math.round((received / total) * 100) : 50);
        }
        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        const ext = url.split("?")[0].match(/\.[a-z0-9]+$/i)?.[0] ?? "";
        link.download = name ?? `file_${Date.now()}${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        setProgress(100);
        setState("done");
        setTimeout(() => {
          setState("idle");
          setProgress(0);
        }, 2000);
      } catch {
        setState("error");
        setTimeout(() => {
          setState("idle");
          setProgress(0);
        }, 2000);
      }
    },
    [state],
  );
  return { download, state, progress };
}

function DownloadBtn({
  url,
  name,
  isMine,
}: {
  url: string;
  name?: string;
  isMine: boolean;
}) {
  const { download, state, progress } = useDownload();
  const label =
    state === "idle"
      ? "Download"
      : state === "done"
        ? "Saved!"
        : state === "error"
          ? "Failed"
          : `${progress}%`;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              download(url, name);
            }}
            disabled={state === "downloading"}
            className={cn(
              "relative h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all overflow-hidden",
              isMine
                ? "hover:bg-white/20"
                : "hover:bg-slate-200 dark:hover:bg-slate-700",
              state === "done" && "bg-emerald-500/20",
              state === "error" && "bg-red-500/20",
            )}
          >
            {state === "downloading" && (
              <svg
                className="absolute inset-0 w-8 h-8 -rotate-90"
                viewBox="0 0 32 32"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeWidth="2.5"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 13}`}
                  strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
                  className="transition-[stroke-dashoffset] duration-200"
                />
              </svg>
            )}
            <span className="relative">
              {state === "idle" && <Download className="h-4 w-4" />}
              {state === "downloading" && (
                <span className="text-[9px] font-bold tabular-nums">
                  {progress}%
                </span>
              )}
              {state === "done" && (
                <Check className="h-4 w-4 text-emerald-400" />
              )}
              {state === "error" && <X className="h-4 w-4 text-red-400" />}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Voice Message Player (শুধুমাত্র VoiceMessage এর জন্য) ────────────────────

function VoicePlayer({
  url,
  name,
  size,
  isMine,
}: {
  url: string;
  name: string;
  size: number;
  isMine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const bars = 28;

  const [heights] = useState(() =>
    Array.from({ length: bars }, (_, i) => {
      const seed = (url.charCodeAt(i % url.length) * (i + 1)) % 100;
      return 20 + (seed % 60);
    }),
  );

useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  const fetchExactDuration = async () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
      setDuration(decodedData.duration);
    } catch (err) {
      console.error("Failed to decode audio duration:", err);
    }
  };

  fetchExactDuration(); 

  const onTime = () => setCurrentTime(audio.currentTime);
  const onEnd = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  audio.addEventListener("timeupdate", onTime);
  audio.addEventListener("ended", onEnd);

  return () => {
    audio.removeEventListener("timeupdate", onTime);
    audio.removeEventListener("ended", onEnd);
  };
}, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const displayTime =
    duration > 0
      ? playing
        ? fmtDuration(currentTime)
        : fmtDuration(duration)
      : sizeLabel(size);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 w-[240px]",
        isMine
          ? "bg-sky-600"
          : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        onClick={togglePlay}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMine
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200",
        )}
      >
        {playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current translate-x-[1px]" />
        )}
      </button>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div
          className="flex items-center gap-[2px] h-7 cursor-pointer"
          onClick={seek}
          title="Seek"
        >
          {heights.map((h, i) => {
            const barProgress = i / bars;
            const active = barProgress <= progress;
            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={cn(
                  "inline-block w-[3px] rounded-full flex-shrink-0 transition-colors duration-150",
                  isMine
                    ? active
                      ? "bg-white"
                      : "bg-white/35"
                    : active
                      ? "bg-sky-500 dark:bg-sky-400"
                      : "bg-slate-300 dark:bg-slate-600",
                )}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums",
              isMine ? "text-white/60" : "text-slate-400",
            )}
          >
            {displayTime}
          </span>
          <Mic
            className={cn(
              "h-2.5 w-2.5",
              isMine ? "text-white/40" : "text-slate-400",
            )}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Reply Preview ───────────────────────────────────────────────────────────

function ReplyPreview({
  replyTo,
  myId,
  isMine,
  onClick,
}: {
  replyTo: any;
  myId: string;
  isMine: boolean;
  onClick: () => void;
}) {
  const atts = replyTo.attachments ?? [];
  const imgs = atts.filter((a: any) => a.type === "image");
  const vids = atts.filter((a: any) => a.type === "video");
  const voices = atts.filter((a: any) => a.type === "VoiceMessage");
  const files = atts.filter(
    (a: any) => a.type === "file" || a.type === "audio",
  );
  const hasText = !!replyTo.content?.trim();
  const senderLabel = replyTo.senderId === myId ? "You" : "Message";

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg text-[11px] border-l-2 cursor-pointer hover:opacity-80 overflow-hidden",
        isMine
          ? "border-sky-300 bg-sky-400/30"
          : "border-slate-300 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-600",
      )}
    >
      <CornerUpRight className="h-3 w-3 shrink-0 opacity-60" />

      {imgs.length > 0 && (
        <div className="relative w-9 h-9 rounded overflow-hidden shrink-0">
          <img
            src={imgs[0].url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {vids.length > 0 &&
        imgs.length === 0 &&
        (() => {
          const v = vids[0];
          const thumb = v.publicId
            ? v.url
                .replace(
                  "/video/upload/",
                  "/video/upload/w_80,h_80,c_fill,so_1,q_auto,f_auto/",
                )
                .replace(/\.(mp4|webm|mov|mkv|avi)$/i, ".jpg")
            : null;
          return (
            <div className="relative w-9 h-9 rounded overflow-hidden shrink-0 bg-slate-800">
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-4 w-4 text-white/60" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          );
        })()}

      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-semibold opacity-90 text-[10px] mb-0.5">
          {senderLabel}
        </span>
        <span className="truncate opacity-70 flex items-center gap-1">
          {imgs.length > 0 && !hasText && (
            <>
              <ImageIcon className="h-3 w-3 shrink-0" /> Photo
            </>
          )}
          {vids.length > 0 && imgs.length === 0 && !hasText && (
            <>
              <Video className="h-3 w-3 shrink-0" /> Video
            </>
          )}
          {voices.length > 0 &&
            imgs.length === 0 &&
            vids.length === 0 &&
            !hasText && (
              <>
                <Mic className="h-3 w-3 shrink-0" /> Voice Message
              </>
            )}
          {files.length > 0 &&
            imgs.length === 0 &&
            vids.length === 0 &&
            voices.length === 0 &&
            !hasText && (
              <>
                <FileIcon
                  mimeType={files[0].mimeType}
                  className="h-3 w-3 shrink-0"
                />{" "}
                {files[0].name ?? "File"}
              </>
            )}
          {hasText && replyTo.content}
        </span>
      </div>
    </div>
  );
}

// ─── Status icon ─────────────────────────────────────────────────────────────

const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === MessageStatus.SENDING)
    return <Clock className="h-3 w-3 text-white/60" />;
  if (status === MessageStatus.FAILED)
    return <AlertCircle className="h-3 w-3 text-red-300" />;
  if (status === MessageStatus.SENT)
    return <Check className="h-3 w-3 text-white/60" />;
  if (status === MessageStatus.DELIVERED)
    return <CheckCheck className="h-3 w-3 text-white/60" />;
  if (status === MessageStatus.READ)
    return <CheckCheck className="h-3 w-3 text-sky-300" />;
  return null;
};

// ─── Image grid ──────────────────────────────────────────────────────────────

const MessageImageGrid = ({
  mediaAtts,
  hasCaption,
  isMine,
  isTemp,
  progress,
  createdAt,
  timeFormat,
  status,
  onOpen,
}: {
  mediaAtts: any[];
  hasCaption: boolean;
  isMine: boolean;
  isTemp: boolean;
  progress: number;
  createdAt: any;
  timeFormat: any;
  status?: MessageStatus;
  onOpen: (index: number) => void;
}) => {
  const imgs = mediaAtts.filter((a: any) => a.type === "image");
  if (imgs.length === 0) return null;

  if (imgs.length === 1) {
    const absoluteIndex = mediaAtts.findIndex(
      (a: any) => a.url === imgs[0].url,
    );
    return (
      <div
        className="relative cursor-pointer"
        onClick={() => onOpen(absoluteIndex >= 0 ? absoluteIndex : 0)}
      >
        <img
          src={imgs[0].url}
          alt={imgs[0].name ?? "image"}
          className={cn(
            "block w-full max-w-[280px] object-cover",
            hasCaption
              ? "rounded-t-2xl"
              : isMine
                ? "rounded-2xl rounded-br-sm"
                : "rounded-2xl rounded-bl-sm",
            isTemp && "brightness-50",
          )}
          style={{ maxHeight: "300px" }}
        />
        {isTemp && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
            <div className="w-11 h-11 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
            <div className="w-4/5 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-white text-[11px] font-medium">
              {progress}%
            </span>
          </div>
        )}
        {!hasCaption && !isTemp && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/35 rounded-full px-1.5 py-0.5">
            <span className="text-[10px] text-white/90">
              {createdAt ? timeFormatFn(createdAt, timeFormat) : ""}
            </span>
            {isMine && status && <StatusIcon status={status} />}
          </div>
        )}
        {!hasCaption && isTemp && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/35 rounded-full px-1.5 py-0.5">
            <span className="text-[10px] text-white/80">Sending...</span>
          </div>
        )}
      </div>
    );
  }

  const visible = imgs.slice(0, 4);
  const extra = imgs.length - 4;

  return (
    <div className="grid gap-0.5 w-[240px] grid-cols-2">
      {visible.map((img: any, i: number) => {
        const isLast = i === 3 && extra > 0;
        const absoluteIndex = mediaAtts.findIndex(
          (a: any) => a.url === img.url,
        );
        return (
          <div
            key={i}
            className={cn(
              "relative overflow-hidden cursor-pointer",
              imgs.length === 2 ? "h-[140px]" : "h-[110px]",
              i === 0 && "rounded-tl-2xl",
              i === 1 && "rounded-tr-2xl",
              i === 2 && imgs.length <= 3 && "rounded-bl-sm",
              i === 3 && "rounded-br-sm",
              imgs.length === 3 &&
                i === 2 &&
                "col-span-2 rounded-b-xl h-[110px]",
            )}
            onClick={() => onOpen(absoluteIndex >= 0 ? absoluteIndex : 0)}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            {isLast && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <span className="text-white text-2xl font-medium">
                  +{extra + 1}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── MessageBubble (main export) ─────────────────────────────────────────────

export default function MessageBubble({ message }: { message: Message }) {
  const { myId } = useAuthStore();
  const { openCtx } = useChatStore();
  const { fontStyle, textSize, bubbleStyle, compactMode, timeFormat } =
    useAppearanceStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const isMine = message.senderId === myId;
  const isDeleted = message.is_deleted_for_everyone;
  const isTemp = (message as any).isTemp === true;
  const attachments: any[] = (message as any).attachments ?? [];
  const uploadProgress = (message as any).uploadProgress ?? 0;
  const hasCaption = !!message.content?.trim();

  // ── 🔴 Attachment buckets (Audio এবং VoiceMessage আলাদা করা হলো) ──
  const mediaAtts = attachments.filter(
    (a) => a.type === "image" || a.type === "video",
  );

  // শুধুমাত্র অ্যাপ থেকে রেকর্ড করা ভয়েস
  const voiceAtts = attachments.filter((a) => a.type === "VoiceMessage");

  // গান/মিউজিক এবং অন্যান্য ফাইল একই ফাইলে (ফাইল কার্ড) হিসেবে দেখাবে
  const fileAtts = attachments.filter(
    (a) => a.type === "file" || a.type === "audio",
  );

  const hasMedia = mediaAtts.length > 0;
  const hasVoice = voiceAtts.length > 0;
  const hasFiles = fileAtts.length > 0;

  // ── Radii ───────────────────────────────────────────────────────────────
  const textRadius =
    bubbleStyle === "modern"
      ? isMine
        ? "rounded-2xl rounded-br-sm"
        : "rounded-2xl rounded-bl-sm"
      : bubbleStyle === "classic"
        ? "rounded-lg"
        : "rounded-none";

  const mediaRadius = isMine
    ? "rounded-2xl rounded-br-sm overflow-hidden"
    : "rounded-2xl rounded-bl-sm overflow-hidden";

  // ── Scroll to replied message ────────────────────────────────────────────
  const scrollToReply = () => {
    if (!message.replyTo?._id) return;
    const el = document.getElementById(`message-${message.replyTo._id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add(
      "opacity-50",
      "scale-[1.02]",
      "transition-all",
      "duration-300",
    );
    setTimeout(() => el.classList.remove("opacity-50", "scale-[1.02]"), 800);
  };

  // ── Media / attachment bubble ────────────────────────────────────────────
  if ((hasMedia || hasVoice || hasFiles) && !isDeleted) {
    const videoAtts = mediaAtts.filter((a) => a.type === "video");

    return (
      <>
        {viewerOpen && (
          <MediaViewer
            items={mediaAtts.map((a) => ({
              url: a.url,
              type: a.type,
              name: a.name,
              publicId: a.publicId,
            }))}
            initialIndex={viewerIndex}
            caption={message.content}
            sentAt={
              message.createdAt
                ? timeFormatFn(message.createdAt, timeFormat)
                : undefined
            }
            onClose={() => setViewerOpen(false)}
          />
        )}

        <div
          id={`message-${message._id}`}
          className={cn(
            "flex items-end gap-2 group",
            compactMode ? "mb-0.5" : "mb-2",
            isMine ? "ml-auto flex-row-reverse" : "mr-auto",
            "max-w-[75%]",
          )}
        >
          <div
            onContextMenu={(e) => !isTemp && openCtx(e, message, isMine)}
            className={cn("relative", mediaRadius)}
          >
            {/* ── Context menu button ── */}
            {!isTemp && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openCtx(e, message, isMine);
                }}
                className="absolute top-2 right-2 z-20 p-0.5 rounded-full bg-black/30 text-white hover:bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            )}

            {/* ── Reply preview ── */}
            {message.replyTo && (
              <div
                className={cn(
                  "px-2 pt-2",
                  isMine ? "bg-sky-600" : "bg-slate-100 dark:bg-slate-800",
                  isMine
                    ? "rounded-t-2xl rounded-tr-2xl"
                    : "rounded-t-2xl rounded-tl-2xl",
                )}
              >
                <ReplyPreview
                  replyTo={message.replyTo}
                  myId={myId}
                  isMine={isMine}
                  onClick={scrollToReply}
                />
              </div>
            )}

            {/* ── Image grid ── */}
            {hasMedia && (
              <MessageImageGrid
                mediaAtts={mediaAtts}
                hasCaption={hasCaption}
                isMine={isMine}
                isTemp={isTemp}
                progress={uploadProgress}
                createdAt={message.createdAt}
                timeFormat={timeFormat}
                status={message.status}
                onOpen={(index) => {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }}
              />
            )}

            {/* ── Video player ── */}
            {videoAtts.map((v: any, i: number) => {
              const absoluteIndex = mediaAtts.findIndex((a) => a.url === v.url);
              return (
                <VideoPlayer
                  key={i}
                  url={v.url}
                  publicId={v.publicId}
                  name={v.name}
                  size={v.size}
                  isMine={isMine}
                  disabled={isTemp}
                  onExpand={() => {
                    setViewerIndex(absoluteIndex >= 0 ? absoluteIndex : 0);
                    setViewerOpen(true);
                  }}
                />
              );
            })}

            {/* ── 🔴 Voice Message (শুধুমাত্র অ্যাপের রেকর্ড করা ভয়েস) ── */}
            {voiceAtts.map((a: any, i: number) => (
              <VoicePlayer
                key={i}
                url={a.url}
                name={a.name}
                size={a.size}
                isMine={isMine}
              />
            ))}

            {/* ── 🔴 Generic File AND Audio (গান/মিউজিক) ── */}
            {fileAtts.map((f: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 w-[240px]",
                  isMine
                    ? "bg-sky-600"
                    : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    isMine ? "bg-white/15" : "bg-slate-200 dark:bg-slate-700",
                  )}
                >
                  <FileIcon mimeType={f.mimeType} className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium truncate",
                      isMine
                        ? "text-white"
                        : "text-slate-700 dark:text-slate-200",
                    )}
                  >
                    {f.name}
                  </p>
                  <p
                    className={cn(
                      "text-[10px]",
                      isMine ? "text-white/60" : "text-slate-400",
                    )}
                  >
                    {sizeLabel(f.size)} ·{" "}
                    {f.mimeType?.split("/")[1]?.toUpperCase()}
                  </p>
                </div>
                <DownloadBtn url={f.url} name={f.name} isMine={isMine} />
              </div>
            ))}

            {/* ── Caption bar ── */}
            {hasCaption && (
              <div
                className={cn(
                  "flex items-end justify-between gap-2 px-3 py-2",
                  isMine
                    ? "bg-sky-600 rounded-b-2xl rounded-br-sm"
                    : "bg-slate-100 dark:bg-slate-800 rounded-b-2xl rounded-bl-sm border-x border-b border-slate-100 dark:border-slate-700",
                )}
              >
                <span
                  className={cn(
                    "text-sm flex-1",
                    isMine
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-200",
                  )}
                >
                  {message.content}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={cn(
                      "text-[10px]",
                      isMine ? "text-white/60" : "text-slate-400",
                    )}
                  >
                    {isTemp
                      ? "Sending..."
                      : timeFormatFn(message.createdAt!, timeFormat)}
                  </span>
                  {isMine && message.status && !isTemp && (
                    <StatusIcon status={message.status} />
                  )}
                </div>
              </div>
            )}

            {/* ── Standalone time/status for voice/file when NO caption ── */}
            {!hasCaption && !hasMedia && (hasVoice || hasFiles) && (
              <div
                className={cn(
                  "flex justify-end items-center gap-1 px-3 py-1.5",
                  isMine
                    ? "bg-sky-600 rounded-b-2xl rounded-br-sm"
                    : "bg-slate-100 dark:bg-slate-800 rounded-b-2xl rounded-bl-sm border-x border-b border-slate-200 dark:border-slate-700",
                )}
              >
                <span
                  className={cn(
                    "text-[10px]",
                    isMine ? "text-white/60" : "text-slate-400",
                  )}
                >
                  {isTemp
                    ? "Sending..."
                    : message.createdAt &&
                      timeFormatFn(message.createdAt, timeFormat)}
                </span>
                {isMine && message.status && !isTemp && (
                  <StatusIcon status={message.status} />
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Text bubble ────────────────────────────────────────────────────────────
  return (
    <div
      id={`message-${message._id}`}
      className={cn(
        "flex items-end gap-2 group transition-all duration-200",
        compactMode ? "mb-0.5" : "mb-3",
        isMine ? "ml-auto flex-row-reverse" : "mr-auto",
        "max-w-[80%]",
      )}
    >
      <div
        onContextMenu={(e) => !isDeleted && openCtx(e, message, isMine)}
        className={cn(
          "relative cursor-context-menu select-text transition-all duration-150 group-hover:shadow-md leading-relaxed",
          fontStyle,
          textSize,
          textRadius,
          compactMode ? "px-2.5 py-1" : "px-4 py-2.5",
          isMine
            ? "bg-sky-600 text-white dark:bg-sky-600"
            : "bg-slate-100 text-slate-700 border border-slate-100 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
          isDeleted && "opacity-70 italic",
        )}
      >
        {!isDeleted && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCtx(e, message, isMine);
            }}
            className={cn(
              "absolute top-1 right-1 p-0.5 rounded-full z-10 transition-all duration-200",
              "opacity-100 md:opacity-0 md:group-hover:opacity-100",
              isMine
                ? "bg-sky-700/50 text-white hover:bg-sky-800/80"
                : "bg-slate-200/80 text-slate-500 hover:bg-slate-300 dark:bg-slate-700/80",
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {message.replyTo && !isDeleted && (
          <ReplyPreview
            replyTo={message.replyTo}
            myId={myId}
            isMine={isMine}
            onClick={scrollToReply}
          />
        )}

        <div className="flex flex-col gap-0.5 pr-2">
          {isDeleted ? (
            <span className="flex items-center gap-1.5 text-xs opacity-80">
              <Ban className="h-3.5 w-3.5 shrink-0" />
              This message was deleted
            </span>
          ) : (
            <>
              <LinkPreviewCard content={message.content} isMine={isMine} />
              <span className="whitespace-pre-wrap break-words mt-1">
                {message.content}
              </span>
            </>
          )}

          <div
            className={cn(
              "flex items-center justify-end gap-1 select-none",
              compactMode ? "mt-0" : "mt-1",
            )}
          >
            {message.isImportant && (
              <Star className="h-2.5 w-2.5 fill-current text-amber-400" />
            )}
            {message.is_edited && !isDeleted && (
              <span className="text-[9px] opacity-50 uppercase font-bold">
                edited
              </span>
            )}
            <span
              className={cn(
                "text-[10px] font-medium",
                isMine ? "text-white/60" : "text-slate-400",
              )}
            >
              {isTemp
                ? "Sending..."
                : message.createdAt &&
                  timeFormatFn(message.createdAt, timeFormat)}
            </span>
            {isMine && message.status && !isTemp && (
              <StatusIcon status={message.status} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
