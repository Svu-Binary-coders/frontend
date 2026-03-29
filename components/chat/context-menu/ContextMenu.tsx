"use client";
import { useEffect, useRef } from "react";
import {
  Reply,
  Copy,
  Star,
  StarOff, // ──> 🛠️ নতুন আইকন ইমপোর্ট করা হলো <──
  Forward,
  Pencil,
  Trash2,
  Trash,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { cn } from "@/lib/utils";

const MINE_ACTIONS = [
  { id: "reply", label: "Reply", icon: Reply, danger: false },
  { id: "copy", label: "Copy", icon: Copy, danger: false },
  { id: "star", label: "Star", icon: Star, danger: false },
  { id: "forward", label: "Forward", icon: Forward, danger: false },
  { id: "edit", label: "Edit", icon: Pencil, danger: false },
  { id: "delete_me", label: "Delete for me", icon: Trash, danger: false },
  {
    id: "delete_all",
    label: "Delete for everyone",
    icon: Trash2,
    danger: true,
  },
] as const;

const OTHER_ACTIONS = [
  { id: "reply", label: "Reply", icon: Reply, danger: false },
  { id: "copy", label: "Copy", icon: Copy, danger: false },
  { id: "star", label: "Star", icon: Star, danger: false },
  { id: "forward", label: "Forward", icon: Forward, danger: false },
  { id: "delete_me", label: "Delete for me", icon: Trash, danger: false },
] as const;

export default function ContextMenu() {
  const { contextMenu, setContextMenu, handleAction } = useChatStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [setContextMenu]);

  if (!contextMenu) return null;

  const { msg, isMine, position } = contextMenu;
  const actions = isMine ? MINE_ACTIONS : OTHER_ACTIONS;

  const style = position.flip
    ? { bottom: window.innerHeight - position.y, left: position.x }
    : { top: position.y, left: position.x };

  return (
    <div
      ref={menuRef}
      style={{ ...style, position: "fixed", zIndex: 9999 }}
      className="w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-600 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {actions.map(({ id, label, icon: Icon, danger }, i) => {
        // ──> 🛠️ ডাইনামিক Star/Unstar লজিক <──
        const isStarAction = id === "star";
        const displayLabel = isStarAction
          ? msg.isImportant
            ? "Unstar"
            : "Star"
          : label;
        const DisplayIcon = isStarAction
          ? msg.isImportant
            ? StarOff
            : Star
          : Icon;

        return (
          <button
            key={id}
            onClick={() => {
              handleAction(id, msg);
              setContextMenu(null);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              (danger as boolean)
                ? "text-red-500 hover:bg-red-50"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
              i > 0 &&
                id === "delete_me" &&
                "border-t border-slate-100 mt-1 pt-2 dark:border-slate-600",
            )}
          >
            <DisplayIcon
              className={cn(
                "h-3.5 w-3.5 flex-shrink-0",
                isStarAction && !msg.isImportant && "text-amber-500",
                isStarAction && msg.isImportant && "text-slate-400", 
              )}
            />
            {displayLabel}
          </button>
        );
      })}
    </div>
  );
}
