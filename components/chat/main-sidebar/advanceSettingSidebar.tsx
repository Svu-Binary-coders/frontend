"use client";
import {
  MessageSquare,
  Phone,
  Users,
  Settings,
  Shield,
  FolderDownIcon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter, useSearchParams } from "next/navigation";

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Chats", view: "chats" },
  { icon: Phone, label: "Calls", view: "calls" },
  { icon: Users, label: "Invite", view: "invite" },
] as const;

const BOTTOM_ITEMS = [
  { icon: FolderDownIcon, label: "archive chat", view: "archive" },
  { icon: Shield, label: "chat lock", view: "chat-lock" },
  { icon: Settings, label: "settings", view: "settings" },
] as const;

export default function AdvanceSettingsSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const activePage = searchParams.get("page") || "chats";

  // নেভিগেশন হ্যান্ডলার
  const handleNavigation = (view: string) => {
    if (view === "settings") {
      router.push("/chat?page=settings&subPage=profile");
    } else {
      router.push(`/chat?page=${view}`);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="hidden md:flex flex-col items-center w-[60px] min-w-[60px] h-full py-4 gap-1 transition-colors duration-200 bg-slate-50 border-r border-slate-100 dark:bg-slate-950 dark:border-slate-800">
        {/* Logo Icon */}
        <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center mb-4 shadow-md shadow-sky-200 dark:shadow-none">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>

        {/* Top Navigation Items */}
        <div className="flex flex-col items-center gap-1 w-full px-2">
          {NAV_ITEMS.map(({ icon: Icon, label, view }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNavigation(view)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
                    activePage === view
                      ? "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
                      : "text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs capitalize">
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Navigation Items */}
        <div className="flex flex-col items-center gap-1 w-full px-2">
          {BOTTOM_ITEMS.map(({ icon: Icon, label, view }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNavigation(view)} 
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
                    activePage === view
                      ? "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
                      : "text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300",
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs capitalize">
                {label}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Divider */}
          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />

          {/* Logout Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
                  "text-slate-400 hover:bg-red-50 hover:text-red-500",
                  "dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400",
                )}
              >
                <LogOut className="w-4 h-4 pl-0.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Logout
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}