"use client";
import { Phone, Video, MoreVertical, Search, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chatStore";

export default function ChatHeader({
  onProfileClick,
}: {
  onProfileClick: () => void;
}) {
  const { activeContact } = useChatStore();
  if (!activeContact) return null;

  const initials = activeContact.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const goBack = () => {
    useChatStore.setState({ activeContact: null });
  };

  return (
    <header className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 flex-shrink-0 h-[65px]">
      <button
        onClick={goBack}
        className="md:hidden h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center flex-shrink-0"
      >
        <ArrowLeft className="h-5 w-5 text-slate-600" />
      </button>

      <button
        onClick={onProfileClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={activeContact.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-sky-400 to-blue-600 text-white dark:bg-slate-900 dark:text-slate-200 text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {activeContact.isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {activeContact.name}
          </p>
          <p className="text-xs text-emerald-500 flex items-center gap-1">
            {activeContact.isOnline ? (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active now
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">
                Offline
              </span>
            )}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-slate-100"
        >
          <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Phone className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Video className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <MoreVertical className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </Button>
      </div>
    </header>
  );
}
