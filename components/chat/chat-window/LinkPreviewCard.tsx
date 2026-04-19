/* eslint-disable @next/next/no-img-element */
"use client";
import { ExternalLink } from "lucide-react";
import { useLinkPreview } from "@/hooks/useLinkPreview";
import { cn } from "@/lib/utils";
import { extractUrl } from "@/lib/linkDetector";

interface Props {
  content: string;
  isMine: boolean;
}

export default function LinkPreviewCard({ content }: Props) {
  const url = extractUrl(content);
  const { data: preview, isLoading } = useLinkPreview(url);

  if (!url || isLoading || !preview?.title) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        // flex-row ব্যবহার করে পাশাপাশি আনা হয়েছে এবং width ছোট করা হয়েছে
        "flex flex-row mt-2 w-full max-w-[260px] sm:max-w-[320px] rounded-xl overflow-hidden border shadow-sm transition-all duration-200 items-stretch",
        "bg-white border-slate-200 hover:bg-slate-50",
        "dark:bg-slate-800/80 dark:border-slate-700 dark:hover:bg-slate-800",
      )}
    >
      {/* OG Image (Left Side) */}
      {preview.image && (
        <div className="w-20 sm:w-24 shrink-0 flex bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
          <img
            src={preview.image}
            alt={preview.title ?? "Link preview"}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      )}

      {/* Info Container (Right Side) */}
      <div className="p-2 sm:p-2.5 flex flex-col justify-center flex-1 min-w-0">
        {/* Title (উপরে থাকবে) */}
        <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
          {preview.title}
        </span>

        {/* Description (টাইটেলের নিচে থাকবে) */}
        {preview.description && (
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
            {preview.description}
          </span>
        )}

        {/* Link Footer (Website URL) */}
        <span className="text-[9px] sm:text-[10px] flex items-center gap-1 mt-1.5 text-emerald-600 dark:text-emerald-500 font-medium truncate">
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{new URL(url).hostname}</span>
        </span>
      </div>
    </a>
  );
}
