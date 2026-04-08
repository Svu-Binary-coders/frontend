/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useCallback } from "react";
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
  Music,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  File,
  FileSpreadsheet,
  Archive,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { timeFormatFn } from "@/lib/dateHelper";
import { MediaViewer } from "../media/MediaViewer";
import { VideoPlayer } from "../media/VideoPlayer";

// ── helpers ──
const sizeLabel = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

// ✅ Lucide icon — mimeType অনুযায়ী
const FileIcon = ({
  mimeType,
  className,
}: {
  mimeType: string;
  className?: string;
}) => {
  if (mimeType?.includes("pdf")) return <FileText className={className} />;
  if (mimeType?.includes("zip") || mimeType?.includes("rar"))
    return <Archive className={className} />;
  if (mimeType?.includes("word")) return <FileText className={className} />;
  if (mimeType?.includes("sheet") || mimeType?.includes("excel"))
    return <FileSpreadsheet className={className} />;
  return <File className={className} />;
};

const getExtension = (url: string) => {
  const match = url.split("?")[0].match(/\.[a-z0-9]+$/i);
  return match ? match[0] : "";
};

// ── Download hook ──
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
        link.download = name ?? `file_${Date.now()}${getExtension(url)}`;
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
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        download(url, name);
      }}
      disabled={state === "downloading"}
      title={
        state === "idle"
          ? "Download"
          : state === "done"
            ? "Saved!"
            : state === "error"
              ? "Failed"
              : `${progress}%`
      }
      className={cn(
        "relative h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all overflow-hidden",
        isMine
          ? "hover:bg-sky-500/30"
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
          <span className="text-[9px] font-bold tabular-nums">{progress}%</span>
        )}
        {state === "done" && <Check className="h-4 w-4 text-emerald-400" />}
        {state === "error" && <X className="h-4 w-4 text-red-400" />}
      </span>
    </button>
  );
}

// ✅ Shared ReplyPreview — media bubble + text bubble দুটোতেই কাজ করবে
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
  const replyAtts = replyTo.attachments ?? [];
  const replyImages = replyAtts.filter((a: any) => a.type === "image");
  const replyVideos = replyAtts.filter((a: any) => a.type === "video");
  const replyAudios = replyAtts.filter((a: any) => a.type === "audio");
  const replyFiles = replyAtts.filter((a: any) => a.type === "file");
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

      {/* ✅ image thumbnail */}
      {replyImages.length > 0 && (
        <div className="relative w-9 h-9 rounded overflow-hidden shrink-0">
          <img
            src={replyImages[0].url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* video thumbnail */}
      {replyVideos.length > 0 &&
        replyImages.length === 0 &&
        (() => {
          const v = replyVideos[0];
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
              {/* play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          );
        })()}

      {/* text area */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-semibold opacity-90 text-[10px] mb-0.5">
          {senderLabel}
        </span>
        <span className="truncate opacity-70 flex items-center gap-1">
          {/* ✅ Lucide icon hint — no emoji */}
          {replyImages.length > 0 && !hasText && (
            <>
              <ImageIcon className="h-3 w-3 shrink-0" /> Photo
            </>
          )}
          {replyVideos.length > 0 && replyImages.length === 0 && !hasText && (
            <>
              <Video className="h-3 w-3 shrink-0" /> Video
            </>
          )}
          {replyAudios.length > 0 &&
            replyImages.length === 0 &&
            replyVideos.length === 0 &&
            !hasText && (
              <>
                <Headphones className="h-3 w-3 shrink-0" />{" "}
                {replyAudios[0].name ?? "Audio"}
              </>
            )}
          {replyFiles.length > 0 &&
            replyImages.length === 0 &&
            replyVideos.length === 0 &&
            replyAudios.length === 0 &&
            !hasText && (
              <>
                <FileIcon
                  mimeType={replyFiles[0].mimeType}
                  className="h-3 w-3 shrink-0"
                />{" "}
                {replyFiles[0].name ?? "File"}
              </>
            )}
          {hasText && replyTo.content}
        </span>
      </div>
    </div>
  );
}

// ── Status icon ──
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
  const attachments = (message as any).attachments ?? [];
  const progress = (message as any).uploadProgress ?? 0;
  const hasCaption = !!message.content?.trim();

  const mediaAtts = attachments.filter(
    (a: any) => a.type === "image" || a.type === "video",
  );
  const audioAtts = attachments.filter((a: any) => a.type === "audio");
  const fileAtts = attachments.filter((a: any) => a.type === "file");
  const hasMedia = mediaAtts.length > 0;

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

  // ── Media bubble ──
  if ((hasMedia || audioAtts.length > 0 || fileAtts.length > 0) && !isDeleted) {
    const videoAtts = mediaAtts.filter((a: any) => a.type === "video");

    return (
      <>
        {viewerOpen && (
          <MediaViewer
            items={mediaAtts.map((a: any) => ({
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

            {/* ✅ ReplyPreview — media bubble-এর উপরে */}
            {message.replyTo && (
              <div
                className={cn(
                  "px-2 pt-2",
                  isMine ? "bg-sky-600" : "bg-slate-100 dark:bg-slate-800",
                  // top radius — media-র উপরে থাকবে বলে নিচে radius নেই
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

            {hasMedia && (
              <MessageImageGrid
                mediaAtts={mediaAtts}
                hasCaption={hasCaption}
                isMine={isMine}
                isTemp={isTemp}
                progress={progress}
                createdAt={message.createdAt}
                timeFormat={timeFormat}
                status={message.status}
                onOpen={(index) => {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }}
              />
            )}

            {videoAtts.map((v: any, i: number) => {
              const absoluteIndex = mediaAtts.findIndex(
                (a: any) => a.url === v.url,
              );
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

            {audioAtts.map((a: any, i: number) => (
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
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                    isMine ? "bg-sky-400/30" : "bg-slate-200 dark:bg-slate-700",
                  )}
                >
                  <Music className="h-4 w-4" />
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
                    {a.name}
                  </p>
                  <p
                    className={cn(
                      "text-[10px]",
                      isMine ? "text-white/60" : "text-slate-400",
                    )}
                  >
                    {sizeLabel(a.size)}
                  </p>
                </div>
                <DownloadBtn url={a.url} name={a.name} isMine={isMine} />
              </div>
            ))}

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
                    isMine ? "bg-sky-400/30" : "bg-slate-200 dark:bg-slate-700",
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
          </div>
        </div>
      </>
    );
  }

  // ── Text bubble ──
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

        {/* ✅ ReplyPreview — text bubble-এও একই component */}
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
              <span className="whitespace-pre-wrap wrap-break-word mt-1">
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
