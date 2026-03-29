"use client";
import { useState, useEffect } from "react";
import {
  UserCircle,
  Lock,
  Bell,
  Shield,
  MessageSquare,
  Paintbrush,
  KeyRound,
  Database,
  HelpCircle,
  Crown,
  ChevronLeft,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation"; // রাউটার ইম্পোর্ট

import Profile from "../settings/Profile";
import { Notifications } from "../settings/Notifications";
import { Privacy } from "../settings/Privacy";
import AppearanceSettings from "../settings/Appearance";
import { Sequrity } from "../settings/Security";
import { DataAndStorage } from "../settings/DataAndStorage";
import { Help } from "../settings/Help";
import Accounts from "../settings/Accounts";

type SettingSection =
  | "profile"
  | "account"
  | "notifications"
  | "privacy"
  | "chat-lock"
  | "appearance"
  | "security"
  | "data"
  | "help";

interface NavItem {
  id: SettingSection;
  label: string;
  icon: React.ElementType;
}
const VALID_SECTIONS: SettingSection[] = [
  "profile",
  "account",
  "notifications",
  "privacy",
  "chat-lock",
  "appearance",
  "security",
  "data",
  "help",
];

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "account", label: "Account", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Security", icon: Shield },
  { id: "chat-lock", label: "Chat Lock", icon: MessageSquare },
  { id: "appearance", label: "Appearance", icon: Paintbrush },
  { id: "security", label: "Security (2FA)", icon: KeyRound },
  { id: "data", label: "Data & Storage", icon: Database },
  { id: "help", label: "Help & Support", icon: HelpCircle },
];

// ── Settings Content Area ──
function SettingsContent({
  section,
  onMobileBack,
}: {
  section: SettingSection;
  onMobileBack: () => void;
}) {
  const item = NAV_ITEMS.find((n) => n.id === section) || NAV_ITEMS[0];

  const renderBody = () => {
    switch (section) {
      case "profile":
        return <Profile />;
      case "account":
        return <Accounts />;
      case "notifications":
        return <Notifications />;
      case "privacy":
        return <Privacy />;
      case "appearance":
        return <AppearanceSettings />;
      case "security":
        return <Sequrity />;
      case "data":
        return <DataAndStorage />;
      case "help":
        return <Help />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 opacity-20">
            <SettingsIcon className="h-12 w-12 mb-2" />
            <p className="text-sm font-bold uppercase tracking-widest">
              Coming Soon
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0b141a] md:bg-transparent">
      {/* Content Header */}
      <div className="px-6 md:px-10 pt-6 md:pt-10 pb-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <button
          onClick={onMobileBack}
          className="md:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-600 dark:text-slate-300" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {item.label}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">
            Personalize and manage your {item.label.toLowerCase()} preferences.
          </p>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 custom-scrollbar">
        {renderBody()}
      </div>
    </div>
  );
}

// ── Main Settings View ──
export default function SettingsView({
  activeSubPage,
  onBackToApp,
}: {
  activeSubPage: string | null;
  onBackToApp: () => void;
}) {
  const router = useRouter();

  const currentSection = VALID_SECTIONS.includes(
    activeSubPage as SettingSection,
  )
    ? (activeSubPage as SettingSection)
    : "profile";

  const [isMobileContentOpen, setIsMobileContentOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        typeof window !== "undefined" &&
        window.innerWidth < 768 &&
        activeSubPage
      ) {
        setIsMobileContentOpen(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeSubPage]);

  const handleSelect = (id: SettingSection) => {
    router.push(`/chat?page=settings&subPage=${id}`);

    if (window.innerWidth < 768) {
      setIsMobileContentOpen(true);
    }
  };

  const handleMobileBack = () => {
    setIsMobileContentOpen(false);
    router.push("/chat?page=settings");
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-950 overflow-hidden animate-in fade-in duration-500">
      {/* ── Settings Sidebar ── */}
      <div
        className={cn(
          "flex flex-col w-full md:w-[320px] md:min-w-[320px] border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all",
          isMobileContentOpen ? "hidden md:flex" : "flex",
        )}
      >
        {/* Global Back Button Header */}
        <div className="px-6 py-6 flex items-center gap-3 border-b border-slate-50 dark:border-slate-900/50">
          <button
            onClick={onBackToApp}
            className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all group shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-sky-500 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Settings
          </h2>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <p className="px-4 pb-3 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase opacity-60">
            Account & Security
          </p>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden",
                  currentSection === id
                    ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.1)]"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    currentSection === id
                      ? "text-sky-500"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
                  )}
                />
                <span
                  className={cn(
                    "text-sm transition-colors",
                    currentSection === id ? "font-bold" : "font-medium",
                  )}
                >
                  {label}
                </span>

                {currentSection === id && (
                  <div className="absolute left-0 w-1 h-6 bg-sky-500 rounded-r-full shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                )}
              </button>
            ))}
          </nav>

          {/* Upgrade Card */}
          <div className="mt-8 mx-2 p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900/80 dark:to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
              <Crown className="h-20 w-20 text-sky-400" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-amber-400" />
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">
                Premium
              </p>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug mb-4">
              Get 100GB Cloud Storage and Priority Support.
            </p>
            <button className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-sky-900/20 uppercase tracking-widest">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>

      {/* ── Settings Content Area ── */}
      <div
        className={cn(
          "flex-1 overflow-hidden bg-slate-50 dark:bg-[#0b141a] md:bg-slate-50/30",
          isMobileContentOpen ? "block" : "hidden md:block",
        )}
      >
        <SettingsContent
          section={currentSection}
          onMobileBack={handleMobileBack}
        />
      </div>
    </div>
  );
}
