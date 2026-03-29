"use client";
import {
  Paintbrush,
  Type,
  AlignLeft,
  MessageSquare,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/settings/ThemeToggle";
import { useAppearanceStore } from "@/stores/appearanceStore";

type FontStyle = "font-sans" | "font-serif";
type TextSize = "14px" | "16px" | "18px" | "20px";
const TEXT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "18px" },
  { label: "Huge", value: "20px" },
];

type BubbleStyle = "modern" | "classic" | "minimal";
type Wallpaper =
  | "none"
  | "dots"
  | "grid"
  | "gradient1"
  | "gradient2"
  | "gradient3";
type TimeFormat = "12h" | "24h";

function SectionHeading({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-6 first:mt-0">
      <Icon className="h-4 w-4 text-sky-500" />
      <p className="text-xs font-bold tracking-wide text-sky-500 uppercase">
        {label}
      </p>
    </div>
  );
}

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </p>
        {description && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

const FONTS = [
  { label: "Default", value: "font-sans", preview: "Ag" },
  { label: "Serif", value: "font-serif", preview: "Ag" },
];

const BUBBLE_STYLES = [
  {
    value: "modern",
    label: "Modern",
    preview: (
      <div className="space-y-1.5">
        <div className="ml-auto w-fit max-w-[80px] bg-sky-500 text-white text-[9px] px-2.5 py-1.5 rounded-2xl rounded-br-sm">
          Hey there! 👋
        </div>
        <div className="w-fit max-w-[80px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] px-2.5 py-1.5 rounded-2xl rounded-bl-sm">
          Hello! How are you?
        </div>
      </div>
    ),
  },
  {
    value: "classic",
    label: "Classic",
    preview: (
      <div className="space-y-1.5">
        <div className="ml-auto w-fit max-w-[80px] bg-sky-500 text-white text-[9px] px-2.5 py-1.5 rounded-lg">
          Hey there! 👋
        </div>
        <div className="w-fit max-w-[80px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] px-2.5 py-1.5 rounded-lg">
          Hello! How are you?
        </div>
      </div>
    ),
  },
  {
    value: "minimal",
    label: "Minimal",
    preview: (
      <div className="space-y-1.5">
        <div className="ml-auto w-fit max-w-[80px] bg-sky-500 text-white text-[9px] px-2.5 py-1.5 rounded-sm">
          Hey there! 👋
        </div>
        <div className="w-fit max-w-[80px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] px-2.5 py-1.5 rounded-sm">
          Hello! How are you?
        </div>
      </div>
    ),
  },
];

const WALLPAPERS = [
  { value: "none", bg: "bg-slate-50 dark:bg-slate-800", label: "None" },
  {
    value: "dots",
    bg: "bg-slate-50 dark:bg-slate-800",
    pattern: "dots",
    label: "Dots",
  },
  {
    value: "grid",
    bg: "bg-slate-50 dark:bg-slate-800",
    pattern: "grid",
    label: "Grid",
  },
  {
    value: "gradient1",
    bg: "bg-gradient-to-br from-sky-100 to-blue-50 dark:from-sky-900/40 dark:to-blue-900/20",
    label: "Ocean",
  },
  {
    value: "gradient2",
    bg: "bg-gradient-to-br from-rose-100 to-pink-50 dark:from-rose-900/40 dark:to-pink-900/20",
    label: "Rose",
  },
  {
    value: "gradient3",
    bg: "bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20",
    label: "Mint",
  },
];

const TimeFormats = [
  { label: "12-hour", value: "12h" },
  { label: "24-hour", value: "24h" },
];

export default function AppearanceContent() {
  const {
    fontStyle,
    setFontStyle,
    bubbleStyle,
    setBubbleStyle,
    wallpaper,
    setWallpaper,
    compactMode,
    setCompactMode,
    textSize,
    setTextSize,
    timeFormat,
    setTimeFormat,
  } = useAppearanceStore();

  const wallpaperStyle: React.CSSProperties =
    wallpaper === "dots"
      ? {
          backgroundImage:
            "radial-gradient(circle, #64748b 1px, transparent 1px)", // কালার একটু ডার্ক করেছি
          backgroundSize: "10px 10px",
        }
      : wallpaper === "grid"
        ? {
            backgroundImage:
              "linear-gradient(#94a3b822 1px, transparent 1px), linear-gradient(90deg, #94a3b822 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }
        : {};

  return (
    <div className="space-y-2 pb-6">
      {/* ── Theme ── */}
      <SectionHeading icon={Paintbrush} label="Theme" />
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4 shadow-sm">
        <SettingRow
          title="Color Theme"
          description="Choose between Light, Dark, or follow your system preference."
          control={<ThemeToggle />}
        />
        <SettingRow
          title="Compact Mode"
          description="Reduce spacing between messages for a denser layout."
          control={
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                compactMode ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                  compactMode ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          }
        />
      </div>

      {/* ── Typography ── */}
      <SectionHeading icon={Type} label="Typography" />
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4 shadow-sm">
        <SettingRow
          title="Font Style"
          description="Choose the font used throughout the app."
          control={
            <div className="flex gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFontStyle(f.value as FontStyle)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all duration-150",
                    fontStyle === f.value
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "text-lg font-bold leading-none",
                      f.value,
                      fontStyle === f.value
                        ? "text-sky-500"
                        : "text-slate-600 dark:text-slate-400",
                    )}
                  >
                    {f.preview}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      fontStyle === f.value
                        ? "text-sky-500"
                        : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          title="Text Size"
          description="Adjust the size of text across the application."
          control={
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {TEXT_SIZES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTextSize(t.value as TextSize)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                    textSize === t.value
                      ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          title="Time Format"
          description="Choose how to display time in the application."
          control={
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {TimeFormats.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTimeFormat(t.value as TimeFormat)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                    timeFormat === t.value
                      ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          }
        />
      </div>

      {/* ── Bubble Style ── */}
      <SectionHeading icon={MessageSquare} label="Chat Bubble Style" />
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-4 shadow-sm">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Choose the shape and style of chat bubbles.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {BUBBLE_STYLES.map((b) => (
            <button
              key={b.value}
              onClick={() => setBubbleStyle(b.value as BubbleStyle)}
              className={cn(
                "flex flex-col items-start gap-2 p-3 rounded-xl border-2 transition-all duration-150",
                bubbleStyle === b.value
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/50",
              )}
            >
              <div className="w-full">{b.preview}</div>
              <span
                className={cn(
                  "text-[10px] font-semibold self-center",
                  bubbleStyle === b.value
                    ? "text-sky-500"
                    : "text-slate-400 dark:text-slate-500",
                )}
              >
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Wallpaper ── */}
      <SectionHeading icon={Layers} label="Chat Wallpaper" />
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-4 shadow-sm">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Set a background for your chat window.
        </p>
        <div className="grid grid-cols-6 gap-2">
          {WALLPAPERS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWallpaper(w.value as Wallpaper)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "w-full aspect-square rounded-xl border-2 transition-all duration-150 overflow-hidden",
                  w.bg,
                  wallpaper === w.value
                    ? "border-sky-500 scale-105 shadow-md shadow-sky-100 dark:shadow-sky-900/20"
                    : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
                )}
              >
                {w.pattern === "dots" && (
                  <div
                    className="w-full h-full opacity-50"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, #64748b 1px, transparent 1px)",
                      backgroundSize: "8px 8px",
                    }}
                  />
                )}
                {w.pattern === "grid" && (
                  <div
                    className="w-full h-full opacity-50"
                    style={{
                      backgroundImage:
                        "linear-gradient(#94a3b822 1px, transparent 1px), linear-gradient(90deg, #94a3b822 1px, transparent 1px)",
                      backgroundSize: "8px 8px",
                    }}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-medium",
                  wallpaper === w.value
                    ? "text-sky-500"
                    : "text-slate-400 dark:text-slate-500",
                )}
              >
                {w.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Preview ── */}
      <SectionHeading icon={AlignLeft} label="Preview" />
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div
          className={cn(
            "p-4 min-h-[120px] flex flex-col justify-end gap-2 transition-colors duration-300",
            WALLPAPERS.find((w) => w.value === wallpaper)?.bg ??
              "bg-slate-50 dark:bg-[#0b141a]",
          )}
          style={wallpaperStyle}
        >
          <div
            className={cn(
              "w-fit max-w-[60%] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 px-3 py-2",
              fontStyle,
              bubbleStyle === "modern"
                ? "rounded-2xl rounded-bl-sm"
                : bubbleStyle === "classic"
                  ? "rounded-lg"
                  : "rounded-sm",
            )}
          >
            Hey! How&#39;s it going? 😊
          </div>
          <div
            className={cn(
              "ml-auto w-fit max-w-[60%] bg-sky-500 text-white shadow-sm px-3 py-2",
              fontStyle,
              bubbleStyle === "modern"
                ? "rounded-2xl rounded-br-sm"
                : bubbleStyle === "classic"
                  ? "rounded-lg"
                  : "rounded-sm",
            )}
          >
            All good! Just checking the new UI ✨
          </div>
        </div>
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
            Live preview of your appearance settings
          </p>
        </div>
      </div>
    </div>
  );
}
