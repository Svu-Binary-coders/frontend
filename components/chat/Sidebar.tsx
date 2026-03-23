"use client";

import { useChatStore } from "@/stores/useChatStore";
import { avatarColor, initials, fmtTime } from "@/lib/chat-helpers";

export default function Sidebar() {
  const {
    myId, contacts, contactsLoading, activeContact,
    showNewChat, newChatId, newChatLoading, newChatError, newChatPreview,
    setShowNewChat, openChat, loadContacts,
    handleNewChatIdChange, createAndOpenChat, closeNewChat,
  } = useChatStore();

  return (
    <>
      {/* ── New Chat Modal ── */}
      {showNewChat && (
        <div
          className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={(e) => e.target === e.currentTarget && closeNewChat()}
        >
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700/80 rounded-2xl p-5 modal-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="title text-zinc-100 text-sm font-semibold">New Conversation</h2>
                <p className="text-zinc-600 text-[11px] mt-0.5">Enter receiver&#39;s MongoDB _id</p>
              </div>
              <button
                onClick={closeNewChat}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="relative mb-3">
              <input
                type="text"
                placeholder="6650f3a2b4c1234567890abc"
                value={newChatId}
                autoFocus
                onChange={(e) => handleNewChatIdChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newChatPreview && createAndOpenChat()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-xs font-mono outline-none focus:border-indigo-500 transition-colors pr-10"
              />
              {newChatLoading && !newChatPreview && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border border-zinc-600 border-t-indigo-400 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {newChatError && (
              <div className="bg-rose-950/50 border border-rose-800/50 rounded-lg px-3 py-2 text-rose-400 text-xs mb-3 flex items-center gap-2">
                <span>⚠</span>{newChatError}
              </div>
            )}

            {newChatPreview && (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-3 flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(newChatPreview._id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {newChatPreview.avatar
                    ? <img src={newChatPreview.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    : initials(newChatPreview.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="title text-zinc-100 text-sm font-semibold truncate">{newChatPreview.name}</p>
                  <p className="text-zinc-500 text-[10px] font-mono truncate">{newChatPreview._id}</p>
                </div>
                <span className="text-emerald-400 text-[10px] shrink-0 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Found
                </span>
              </div>
            )}

            {!newChatPreview && !newChatError && !newChatLoading && (
              <div className="text-zinc-700 text-[11px] mb-4 flex items-center gap-1.5">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Paste a valid 24-char MongoDB ObjectId
              </div>
            )}

            <button
              onClick={createAndOpenChat}
              disabled={!newChatPreview || newChatLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25 disabled:cursor-not-allowed active:scale-[.98] text-white font-semibold text-sm rounded-xl py-2.5 transition-all flex items-center justify-center gap-2"
            >
              {newChatLoading && newChatPreview
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Start Chat →</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <div className="w-72 border-r border-zinc-800/60 flex flex-col shrink-0">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-800/60 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(myId)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {myId[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-200 text-xs font-medium truncate title">Me</p>
            <p className="text-zinc-600 text-[10px] font-mono truncate">{myId}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <button
              onClick={() => setShowNewChat(true)}
              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar (UI only) */}
        <div className="px-3 py-2.5 border-b border-zinc-800/40">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-transparent text-zinc-300 text-xs outline-none placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 bounce-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-zinc-600 text-xs text-center py-8">No contacts yet</div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact._id}
                onClick={() => openChat(contact)}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-all hover:bg-zinc-900/60 border-b border-zinc-800/30
                  ${activeContact?._id === contact._id ? "bg-zinc-900 border-l-2 border-l-indigo-500" : ""}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(contact._id)} flex items-center justify-center text-white text-xs font-bold`}>
                    {contact.avatar
                      ? <img src={contact.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      : initials(contact.name)}
                  </div>
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-zinc-950 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 text-xs font-medium truncate title">{contact.name}</span>
                    <span className="text-zinc-600 text-[10px] shrink-0 ml-1">{fmtTime(contact.lastMessage?.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-zinc-500 text-[11px] truncate">{contact.lastMessage?.content || "No messages yet"}</span>
                    {(contact.unreadCount || 0) > 0 && (
                      <span className="ml-1 shrink-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {contact.unreadCount! > 99 ? "99+" : contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800/40">
          <button
            onClick={() => loadContacts(myId)}
            className="w-full text-[11px] text-zinc-600 hover:text-indigo-400 transition-colors py-1"
          >
            ↻ Refresh contacts
          </button>
        </div>
      </div>
    </>
  );
}