"use client";

import { useState, useRef, useCallback } from "react";
import { Play, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { getVideoThumbnail } from "@/lib/cloudinary.helpers";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  url: string;
  publicId?: string | null;
  name?: string;
  size?: number;
  isMine: boolean;
  hasCaption?: boolean;
  disabled?: boolean;
  onExpand?: () => void; 
}

const sizeLabel = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

export function VideoPlayer({
  url,
  publicId,
  name,
  size,
  isMine,
  hasCaption = false,
  disabled = false,
  onExpand,
}: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const thumbnail = publicId
    ? getVideoThumbnail(url, { width: 280, height: 200, second: 1 })
    : null;

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handlePlay = useCallback(async () => {
    if (disabled) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      try {
        setIsLoading(true);
        await v.play();
        setPlaying(true);
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error(err);
      } finally {
        setIsLoading(false);
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [disabled]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (disabled) return;
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || disabled) return;
    videoRef.current.muted = !muted;
    setMuted((m) => !m);
  };

  const radius = hasCaption
    ? "rounded-t-2xl"
    : isMine
      ? "rounded-2xl rounded-br-sm"
      : "rounded-2xl rounded-bl-sm";

  return (
    <div
      className={cn(
        "relative w-full max-w-[280px] overflow-hidden bg-black select-none",
        radius,
      )}
      onClick={handlePlay}
    >
      <video
        ref={videoRef}
        src={url}
        poster={thumbnail ?? undefined}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrent(v.currentTime);
          setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
        }}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration ?? 0);
          setIsLoading(false);
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onEnded={() => setPlaying(false)}
        muted={muted}
        playsInline
        preload="none"
        className="w-full object-cover"
        style={{ height: "180px" }}
      />

      {/* Uploading */}
      {disabled && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 cursor-not-allowed">
          <svg
            className="animate-spin h-8 w-8 text-white/70"
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
          <span className="text-white/70 text-xs">Uploading...</span>
        </div>
      )}

      {/* Play overlay */}
      {!disabled && !playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors cursor-pointer">
          <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform pointer-events-none">
            <Play className="h-6 w-6 text-slate-800 ml-1" />
          </div>

          {/* ✅ Expand button — top right কোণে */}
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              title="Full screen"
            >
              <Maximize2 className="h-3.5 w-3.5 text-white" />
            </button>
          )}

          <div className="absolute bottom-2 left-2 right-2 flex justify-between pointer-events-none">
            {size && (
              <span className="text-[10px] text-white bg-black/50 rounded px-1.5 py-0.5">
                {sizeLabel(size)}
              </span>
            )}
            <span className="text-[10px] text-white bg-black/50 rounded px-1.5 py-0.5 ml-auto">
              {duration > 0 ? fmtTime(duration) : "Video"}
            </span>
          </div>
        </div>
      )}

      {/* Buffering */}
      {!disabled && playing && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            className="animate-spin h-8 w-8 text-white/80"
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
        </div>
      )}

      {/* Controls */}
      {!disabled && playing && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 pt-1 pb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-1.5"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-white rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay();
                }}
                className="text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
              <button onClick={toggleMute} className="text-white">
                {muted ? (
                  <VolumeX className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-white" />
                )}
              </button>
              <span className="text-[10px] text-white/80 font-medium">
                {fmtTime(current)} / {fmtTime(duration)}
              </span>
            </div>

            {/* ✅ playing অবস্থায়ও expand button */}
            {onExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
                className="p-0.5 rounded hover:bg-white/20 transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
