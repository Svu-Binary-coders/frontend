"use client";
import { useState } from "react";
import {
  Plus,
  Users,
  MessageSquare,
  Bell,
  MoreVertical,
  Archive,
  Lock,
  ChevronRight,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Contact } from "@/types/chat";
import ContactItem from "./ContactItem";
import SearchBar from "./SearchBar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useAuthStore } from "@/stores/authStore";

export default function Sidebar() {
  const { myId } = useAuthStore();
  const { contacts, activeContact, openChat, setShowNewChat } = useChatStore();
  const { data: authData } = useAuth();
  const { isLoading: contactsLoading } = useContacts(myId);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "unread">("all");

  const filtered = contacts.filter((c) => {
    const matchName = c.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || (tab === "unread" && !!c.unreadCount);
    return matchName && matchTab;
  });

  const unreadTotal = contacts.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <aside className="flex flex-col w-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Profile bar */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-600">
        <div className="relative">
          <Avatar className="w-9 h-9">
            <AvatarImage src={authData?.profilePicture} alt="Profile" />
            <AvatarFallback className="bg-sky-100 text-sky-600 text-xs font-bold">
              {authData?.userName?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400  ring-2 ring-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {authData?.userName}
          </p>
          <p className="text-[10px] text-slate-400 truncate font-mono">
            {authData?.customId}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <Bell className="h-4 w-4" />
            {unreadTotal > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-sky-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 px-4 pb-3">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all duration-150",
              tab === t
                ? "bg-sky-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {t === "all"
              ? "All"
              : `Unread${unreadTotal > 0 ? ` (${unreadTotal})` : ""}`}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent">
        {!search && (
          <div className="md:hidden">
            {/* Archived */}
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-50">
              <div className="h-11 w-11 rounded-full bg-amber-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                <Archive className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800">Archived</p>
                <p className="text-xs text-slate-400">
                  Tap to see archived chats
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>

            {/* Locked Chats */}
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100">
              <div className="h-11 w-11 rounded-full bg-sky-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                <Lock className="h-5 w-5 text-sky-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800">
                  Locked Chats
                </p>
                <p className="text-xs text-slate-400">
                  Use fingerprint or PIN to unlock
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>

            {/* Section divider */}
            <p className="px-4 pt-3 pb-1 text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              Recent Messages
            </p>
          </div>
        )}

        {/* ── Desktop section label ── */}
        {!search && (
          <p className="hidden md:block px-4 pb-1.5 text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">
            Recent Messages
          </p>
        )}

        {/* Contact list */}
        {contactsLoading ? (
          <div className="flex flex-col gap-1 p-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-2 py-3 animate-pulse"
              >
                <div className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-900 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-slate-100 dark:bg-slate-600 rounded-md" />
                  <div className="h-2.5 w-36 bg-slate-100 dark:bg-slate-600 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-600 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-slate-300 dark:text-slate-400" />
            </div>
            <p className="text-xs text-slate-400">No conversations found</p>
          </div>
        ) : (
          filtered.map((contact: Contact) => (
            <ContactItem
              key={contact._id}
              contact={contact}
              isActive={activeContact?._id === contact._id}
              onClick={() => openChat(contact)}
            />
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-slate-100 p-4 space-y-2">
        <Button
          onClick={() => setShowNewChat(true)}
          className="w-full h-9 bg-sky-500 hover:bg-sky-600 dark:hover:bg-sky-600 text-white rounded-xl text-sm gap-2 shadow-sm shadow-sky-200 dark:shadow-sky-900"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
        <Button
          variant="ghost"
          className="w-full h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-sm gap-2 rounded-xl"
        >
          <Users className="h-4 w-4" />
          Invite Team
        </Button>
      </div>
    </aside>
  );
}
