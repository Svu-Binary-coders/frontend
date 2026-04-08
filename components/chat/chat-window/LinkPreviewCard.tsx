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
        "flex flex-col mt-2 w-full max-w-70 sm:max-w-100 rounded-xl overflow-hidden border shadow-sm transition-all duration-300",
        "bg-white border-slate-200 hover:bg-slate-50",
        "dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900/50",
      )}
    >
      {/* OG Image */}
      {preview.image && (
        <div className="w-full h-35 sm:h-52.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 relative">
          <img
            src={preview.image}
            alt={preview.title ?? "Link preview"}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      )}

      {/* Info Container */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-0.5">
        {preview.siteName && (
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
            {preview.siteName}
          </span>
        )}

        {/* Title */}
        <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
          {preview.title}
        </span>

        {/* Description */}
        {preview.description && (
          <span className="text-[11px] sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
            {preview.description}
          </span>
        )}

        {/* Link Footer */}
        <span className="text-[10px] sm:text-[11px] flex items-center gap-1.5 mt-2 sm:mt-2.5 text-emerald-600 dark:text-emerald-500 font-medium">
          <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {new URL(url).hostname}
        </span>
      </div>
    </a>
  );
}
