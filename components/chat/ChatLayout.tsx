/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";
import Sidebar from "./sidebar/Sidebar";
import ChatWindow from "./chat-window/ChatWindow";
import ContextMenu from "./context-menu/ContextMenu";
import NewChatModal from "./modals/NewChatModal";
import ForwardModal from "./modals/ForwardModal";
import AdvanceSettingsSidebar from "./main-sidebar/advanceSettingSidebar";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import CallsView from "../views/CallsView";
import InviteView from "../views/InviteView";
import SettingsView from "../views/settingsView";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ChatLockView from "../views/chatLockView";

export default function ChatLayout() {
  useKeyboardShortcuts();
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    initSocket,
    setContextMenu,
    activeContact,
    activeView,
    setActiveView,
  } = useChatStore();

  const page = searchParams.get("page") || "chats";
  const subPage = searchParams.get("subPage");

  useEffect(() => {
    if (page && page !== activeView) {
      setActiveView(page as any);
    }
  }, [page, activeView, setActiveView]);

  useEffect(() => {
    const cleanup = initSocket();
    return cleanup;
  }, [initSocket]);

  const isSettingsView = activeView === "settings";

  const handleBackToApp = () => {
    router.push("/chat?page=chats");
  };

  return (
    <div
      className="flex h-screen h-dvh overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans"
      onClick={() => setContextMenu(null)}
    >
      <AdvanceSettingsSidebar />

      <div className="flex-1 flex overflow-hidden">
        {isSettingsView ? (
          <div className="flex-1 animate-in slide-in-from-left duration-300">
            <SettingsView
              activeSubPage={subPage}
              onBackToApp={handleBackToApp}
            />
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex shrink-0 border-r border-slate-100 dark:border-slate-800 transition-all duration-200",
                activeContact
                  ? "hidden md:flex md:w-[320px] lg:w-[360px]"
                  : "flex w-full md:w-[320px] lg:w-[360px]", 
              )}
            >
              <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950 shrink-0">
                {renderBodyLeftPanel(activeView)}
              </div>
            </div>

            {/* Right Chat Window Panel */}
            <div
              className={cn(
                "flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-50 dark:bg-[#0b141a]",
                activeContact
                  ? "flex" 
                  : "hidden md:flex",
              )}
            >
              <ChatWindow />
            </div>
          </>
        )}
      </div>

      <ContextMenu />
      <NewChatModal />
      <ForwardModal />
    </div>
  );
}

function renderBodyLeftPanel(view: string) {
  switch (view) {
    case "calls":
      return <CallsView />;
    case "invite":
      return <InviteView />;
    case "archive":
      return <div>Archive View</div>;
    case "chat-lock":
      return <ChatLockView />;
    default:
      return <Sidebar />;
  }
}
