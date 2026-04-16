"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Check,
  ZoomOut,
  ZoomIn,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getVideoThumbnail } from "@/lib/cloudinary.helpers";
import Image from "next/image";

interface MediaItem {
  url: string;
  type: "image" | "video";
  name?: string;
  publicId?: string | null;
}

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex?: number;
  caption?: string;
  sentAt?: string;
  onClose: () => void;
}

//  URL থেকে extension বের করে
const getExtension = (url: string) => {
  const match = url.split("?")[0].match(/\.[a-z0-9]+$/i);
  return match ? match[0] : "";
};

//  blob URL কিনা check
const isBlobUrl = (url: string) => url.startsWith("blob:");

//  Download with progress
function useDownload() {
  const [state, setState] = useState<"idle" | "downloading" | "done" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);

  const download = async (url: string, name?: string) => {
    if (state === "downloading") return;

    // blob URL হলে সরাসরি download করো
    if (isBlobUrl(url)) {
      const link = document.createElement("a");
      link.href = url;
      link.download = name ?? `media_${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
      return;
    }

    setState("downloading");
    setProgress(0);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fetch failed");

      const total = Number(response.headers.get("content-length") ?? 0);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setProgress(total ? Math.round((received / total) * 100) : 50);
      }

      const blob = new Blob(chunks as BlobPart[]);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = name ?? `media_${Date.now()}${getExtension(url)}`;
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
    } catch (err) {
      console.error("Download failed:", err);
      setState("error");
      setTimeout(() => {
        setState("idle");
        setProgress(0);
      }, 2000);
    }
  };

  return { download, state, progress };
}

//  Download Button
function DownloadButton({
  onClick,
  state,
  progress,
}: {
  onClick: () => void;
  state: "idle" | "downloading" | "done" | "error";
  progress: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === "downloading"}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all overflow-hidden",
        state === "idle" && "bg-white/10 hover:bg-white/20 text-white",
        state === "downloading" && "bg-white/10 text-white/70 cursor-wait",
        state === "done" && "bg-emerald-500/30 text-emerald-300",
        state === "error" && "bg-red-500/30 text-red-300",
      )}
    >
      {state === "downloading" && (
        <div
          className="absolute inset-0 bg-white/10 transition-[width] duration-200 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      )}

      <span className="relative flex items-center gap-1.5">
        {state === "idle" && (
          <>
            <Download className="h-3.5 w-3.5" />
            Download
          </>
        )}
        {state === "downloading" && (
          <>
            <svg
              className="animate-spin h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            {progress > 0 ? `${progress}%` : "Starting..."}
          </>
        )}
        {state === "done" && (
          <>
            <Check className="h-3.5 w-3.5" />
            Saved!
          </>
        )}
        {state === "error" && (
          <>
            <X className="h-3.5 w-3.5" />
            Failed
          </>
        )}
      </span>
    </button>
  );
}

//  FullVideoPlayer
function FullVideoPlayer({ url, poster }: { url: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${ss.toString().padStart(2, "0")}`;
  };

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(hideTimer.current);
  }, [playing]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    resetHideTimer();
    if (v.paused) {
      try {
        await v.play();
        setPlaying(true);
      } catch {}
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted((m) => !m);
    resetHideTimer();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
    resetHideTimer();
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    resetHideTimer();
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = videoRef.current as any;
      if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-h-[75vh] flex items-center justify-center bg-black rounded-xl overflow-hidden"
      onMouseMove={resetHideTimer}
      onClick={togglePlay}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      <video
        ref={videoRef}
        key={url}
        src={url}
        poster={poster}
        playsInline
        preload="metadata"
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrent(v.currentTime);
          setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
        }}
        onEnded={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        onPlay={() => {
          setPlaying(true);
          setShowControls(true);
        }}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        className="max-w-full max-h-[75vh] object-contain"
      />

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none",
          showControls || !playing ? "opacity-100" : "opacity-0",
        )}
      >
        {!playing && (
          <div className="h-16 w-16 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="h-7 w-7 text-white ml-1" />
          </div>
        )}
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 px-3 pt-6 pb-3 transition-opacity duration-300",
          "bg-gradient-to-t from-black/80 to-transparent",
          showControls || !playing
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-3 group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-white rounded-full relative group-hover:bg-sky-400 transition-colors"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-white/80 transition-colors"
            >
              {playing ? (
                <Pause className="h-5 w-5" fill="white" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" fill="white" />
              )}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-white/80 transition-colors"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <span className="text-white/80 text-xs font-medium tabular-nums">
              {fmtTime(current)} / {fmtTime(duration)}
            </span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-white/80 transition-colors p-1"
          >
            {isFullscreen ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
              </svg>
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

//  Smart Image — blob হলে <img>, real URL হলে Next.js <Image>
function SmartImage({
  src,
  alt,
  className,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
}) {
  if (isBlobUrl(src)) {
    // ✅ blob URL — plain <img> ব্যবহার করো
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        draggable={false}
        style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }}
      />
    );
  }

  // ✅ real URL — Next.js <Image> ব্যবহার করো
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      width={width}
      height={height}
      loading="lazy"
    />
  );
}

//  Main MediaViewer
export function MediaViewer({
  items,
  initialIndex = 0,
  caption,
  sentAt,
  onClose,
}: MediaViewerProps) {
  const [current, setCurrent] = useState(initialIndex);
  const { download, state: dlState, progress: dlProgress } = useDownload();
  const item = items[current];

  // ── Zoom & Pan ──
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const imageContainerRef = useRef<HTMLDivElement>(null);

  // ── Zoom helpers ──
  const clampScale = (s: number) => Math.min(Math.max(s, 1), 5);

  const handleZoomIn = useCallback(
    () => setScale((s) => clampScale(s + 0.5)),
    [],
  );
  const handleZoomOut = useCallback(
    () =>
      setScale((s) => {
        const next = clampScale(s - 0.5);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      }),
    [],
  );
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // ── Scroll to zoom ── 
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (item.type !== "image") return;

      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      const newScale = clampScale(scale + delta);

      if (newScale === scale) return;

      if (newScale === 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        return;
      }
      const dx = e.clientX - window.innerWidth / 2 - position.x;
      const dy = e.clientY - window.innerHeight / 2 - position.y;

      const newX = position.x - (dx * (newScale - scale)) / scale;
      const newY = position.y - (dy * (newScale - scale)) / scale;

      setScale(newScale);
      setPosition({ x: newX, y: newY });
    },
    [item.type, scale, position],
  );

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        }
        if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
        }
        if (e.key === "0") {
          e.preventDefault();
          resetZoom();
        }
      } else {
        if (e.key === "ArrowLeft") setCurrent((i) => Math.max(0, i - 1));
        if (e.key === "ArrowRight")
          setCurrent((i) => Math.min(items.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items.length, onClose, handleZoomIn, handleZoomOut, resetZoom]);

  // ── Drag to pan ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-hidden"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 relative z-50 bg-gradient-to-b from-black/60 to-transparent">
        <div>
          <p className="text-white text-sm font-medium truncate max-w-[200px]">
            {item.name ?? (item.type === "video" ? "Video" : "Image")}
          </p>
          {sentAt && <p className="text-white/50 text-[11px]">{sentAt}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls — image only */}
          {item.type === "image" && (
            <div className="flex items-center gap-1 mr-2 bg-black/40 rounded-full px-2 py-1">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 1}
                title="Zoom Out (Ctrl -)"
                className="p-1.5 rounded-full hover:bg-white/20 disabled:opacity-30 transition-colors"
              >
                <ZoomOut className="h-4 w-4 text-white" />
              </button>
              <span className="text-white/80 text-xs w-10 text-center tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 5}
                title="Zoom In (Ctrl +)"
                className="p-1.5 rounded-full hover:bg-white/20 disabled:opacity-30 transition-colors"
              >
                <ZoomIn className="h-4 w-4 text-white" />
              </button>
              {scale > 1 && (
                <button
                  onClick={resetZoom}
                  title="Reset (Ctrl 0)"
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors ml-1"
                >
                  <RotateCcw className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
          )}

          <DownloadButton
            onClick={() => download(item.url, item.name)}
            state={dlState}
            progress={dlProgress}
          />
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-2"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* ── Media area ── */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0 px-12 overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        {current > 0 && (
          <button
            onClick={() => setCurrent((i) => i - 1)}
            className="absolute left-4 z-50 p-2 rounded-full bg-black/50 hover:bg-white/25 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}

        {item.type === "image" && (
          <div
            ref={imageContainerRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
              cursor:
                scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            }}
            className="relative flex items-center justify-center"
          >
            <SmartImage
              src={item.url}
              alt={item.name ?? "image"}
              className="max-w-full max-h-[75vh] object-contain rounded-xl select-none pointer-events-none"
              width={1200}
              height={800}
            />
          </div>
        )}

        {item.type === "video" && (
          <div className="w-full max-w-4xl z-10">
            <FullVideoPlayer
              url={item.url}
              poster={
                item.publicId && !isBlobUrl(item.url)
                  ? getVideoThumbnail(item.url, {
                      width: 1280,
                      height: 720,
                      second: 1,
                    })
                  : undefined
              }
            />
          </div>
        )}

        {current < items.length - 1 && (
          <button
            onClick={() => setCurrent((i) => i + 1)}
            className="absolute right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-white/25 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* ── Bottom ── */}
      <div className="shrink-0 px-4 pb-5 pt-3 flex flex-col gap-3 relative z-50 bg-gradient-to-t from-black/80 to-transparent">
        {caption && (
          <p className="text-white/85 text-sm text-center">{caption}</p>
        )}

        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all",
                  i === current
                    ? "border-sky-400 scale-105"
                    : "border-transparent opacity-50 hover:opacity-90",
                )}
              >
                {it.type === "image" ? (
                  <SmartImage
                    src={it.url}
                    alt=""
                    className="w-full h-full object-cover"
                    width={48}
                    height={48}
                  />
                ) : it.publicId && !isBlobUrl(it.url) ? (
                  <Image
                    src={getVideoThumbnail(it.url, {
                      width: 48,
                      height: 48,
                      second: 1,
                    })}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                    width={48}
                    height={48}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                    <span className="text-white text-base">▶</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {items.length > 1 && (
          <p className="text-white/40 text-xs text-center">
            {current + 1} / {items.length}
          </p>
        )}
      </div>
    </div>
  );
}
