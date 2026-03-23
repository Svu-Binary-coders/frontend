"use client";

import { Message, MessageStatus, Contact } from "@/types/chat";
import { avatarColor, initials, fmtTime } from "@/lib/chat-helpers";
import { useChatStore } from "@/stores/useChatStore";

// ── Ticks ────────────────────────────────────────────────────────────────────
export function Ticks({ status }: { status?: MessageStatus }) {
  if (!status || status === MessageStatus.SENDING)
    return (
      <svg className="w-3 h-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );

  if (status === MessageStatus.FAILED)
    return (
      <svg className="w-3 h-3 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );

  if (status === MessageStatus.SENT)
    return (
      <svg className="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );

  if (status === MessageStatus.DELIVERED)
    return (
      <svg className="w-4 h-3.5 opacity-50" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="4 12 9 17 20 6" />
        <polyline points="10 12 15 17 26 6" />
      </svg>
    );

  // READ
  return (
    <svg className="w-4 h-3.5" viewBox="0 0 28 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="4 12 9 17 20 6" />
      <polyline points="10 12 15 17 26 6" />
    </svg>
  );
}

// ── ReactionBar ───────────────────────────────────────────────────────────────
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ReactionBar({ isMine, onMenuOpen }: { isMine: boolean; onMenuOpen: (e: React.MouseEvent) => void }) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5
        bg-zinc-900/95 border border-zinc-700/60 rounded-full px-1.5 py-1 shadow-lg
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
        pointer-events-none group-hover:pointer-events-auto
        ${isMine ? "right-full mr-2" : "left-full ml-2"}`}
      style={{ zIndex: 10 }}
    >
      {QUICK_REACTIONS.map((e) => (
        <button key={e} className="w-6 h-6 flex items-center justify-center text-sm hover:scale-125 transition-transform rounded-full hover:bg-zinc-700/60">
          {e}
        </button>
      ))}
      <span className="w-px h-4 bg-zinc-700 mx-0.5" />
      <button
        onClick={onMenuOpen}
        className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 rounded-full transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
    </div>
  );
}

// ── ContextMenu ───────────────────────────────────────────────────────────────
interface ContextMenuProps {
  msg: Message;
  isMine: boolean;
  position: { x: number; y: number; flip: boolean };
  onAction: (a: string, m: Message) => void;
  onClose: () => void;
}

export function ContextMenu({ msg, isMine, position, onAction, onClose }: ContextMenuProps) {
  const items = [
    { action: "reply",      label: "Reply",               ownerOnly: false, danger: false, d: "M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6 6-6" },
    { action: "copy",       label: "Copy text",            ownerOnly: false, danger: false, d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8zM16 4v4h4M10 12h4M10 16h4" },
    { action: "star",       label: msg.isImportant ? "Unstar" : "Star", ownerOnly: false, danger: false, d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
    { action: "forward",    label: "Forward",              ownerOnly: false, danger: false, d: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" },
    { action: "edit",       label: "Edit",                 ownerOnly: true,  danger: false, d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" },
    { action: "delete_me",  label: "Delete for me",        ownerOnly: false, danger: true,  d: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" },
    { action: "delete_all", label: "Delete for everyone",  ownerOnly: true,  danger: true,  d: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" },
  ].filter((i) => !i.ownerOnly || isMine);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-52 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden"
        style={{
          left: position.x,
          top: position.flip ? "auto" : position.y,
          bottom: position.flip ? `calc(100vh - ${position.y}px)` : "auto",
          animation: "ctxIn .12s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {items.map((item, idx) => (
          <button
            key={item.action}
            onClick={() => { onAction(item.action, msg); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors text-left
              ${item.danger ? "text-rose-400 hover:bg-rose-950/50" : "text-zinc-300 hover:bg-zinc-800"}
              ${idx > 0 && item.danger && !items[idx - 1]?.danger ? "border-t border-zinc-800" : ""}`}
          >
            <svg
              className={`w-3.5 h-3.5 shrink-0 ${item.danger ? "text-rose-500" : "text-zinc-500"}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d={item.d} />
            </svg>
            {item.label}
            {item.action === "star" && msg.isImportant && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </>
  );
}

// ── ForwardModal ──────────────────────────────────────────────────────────────
interface ForwardModalProps {
  msg: Message;
  contacts: Contact[];
  onForward: (id: string) => void;
  onClose: () => void;
}

export function ForwardModal({ msg, contacts, onForward, onClose }: ForwardModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xs bg-zinc-900 border border-zinc-700/80 rounded-2xl p-4 shadow-2xl" style={{ animation: "ctxIn .15s ease" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-zinc-100 text-sm font-semibold">Forward to</h3>
            <p className="text-zinc-600 text-[11px] mt-0.5 truncate max-w-[200px]">&ldquo;{msg.content}&rdquo;</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
          {contacts.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-4">No other contacts</p>
          ) : (
            contacts.map((c) => (
              <button key={c._id} onClick={() => onForward(c._id)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors text-left">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(c._id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-xs font-medium truncate">{c.name}</p>
                  {c.isOnline && <p className="text-emerald-400 text-[10px]">Online</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── MessageItem ───────────────────────────────────────────────────────────────
interface MessageItemProps {
  msg: Message;
  myId: string;
  activeContact: Contact;
}

export default function MessageItem({ msg, myId, activeContact }: MessageItemProps) {
  const { openCtx, handleAction } = useChatStore();
  const isMine = msg.senderId === myId;
  const isDeleted = msg.is_deleted_for_everyone;

  return (
    <div className={`group relative flex ${isMine ? "justify-end" : "justify-start"} msg-in py-0.5`}>
      {!isMine && (
        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColor(activeContact._id)} flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-auto mb-1`}>
          {initials(activeContact.name)}
        </div>
      )}

      <div className="relative max-w-[65%]">
        {/* Reaction + menu bar */}
        {!isDeleted && (
          <ReactionBar isMine={isMine} onMenuOpen={(e) => openCtx(e, msg, isMine)} />
        )}

        {/* Bubble */}
        <div
          onContextMenu={(e) => !isDeleted && openCtx(e, msg, isMine)}
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words select-text
            ${isMine ? "bg-indigo-600 text-white rounded-br-sm" : "bg-zinc-800/80 text-zinc-200 rounded-bl-sm border border-zinc-700/60"}
            ${msg.isImportant ? "ring-1 ring-amber-400/50" : ""}
            ${isDeleted ? "opacity-50" : "cursor-pointer"}`}
        >
          {/* Reply preview */}
          {msg.replyTo && (
            <div className={`mb-1.5 px-2 py-1.5 rounded-lg border-l-2 ${isMine ? "bg-indigo-700/50 border-white/40" : "bg-zinc-700/50 border-indigo-400"}`}>
              <p className={`text-[10px] font-medium mb-0.5 ${isMine ? "text-white/60" : "text-indigo-400"}`}>
                {msg.replyTo.senderId === myId ? "You" : activeContact.name.split(" ")[0]}
              </p>
              <p className="text-[11px] opacity-70 truncate">{msg.replyTo.content}</p>
            </div>
          )}

          {/* Content */}
          {isDeleted ? (
            <span className="flex items-center gap-1.5 text-xs italic">
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              This message was deleted
            </span>
          ) : (
            <p>{msg.content}</p>
          )}

          {/* Meta */}
          {!isDeleted && (
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {msg.isImportant && (
                <svg className="w-2.5 h-2.5 text-amber-300 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )}
              {msg.is_edited && <span className="text-[9px] opacity-40 italic">edited</span>}
              <span className="text-[10px] opacity-50">{fmtTime(msg.createdAt) || "now"}</span>
              {isMine && <Ticks status={msg.status} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}