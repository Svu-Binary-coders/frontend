"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/useChatStore";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import { ContextMenu, ForwardModal } from "./MessageItem";

export default function ChatContainer() {
  const {
    contextMenu, forwardMsg, contacts, activeContact,
    setContextMenu, setForwardMsg, handleAction, handleForward,
    initSocket,
  } = useChatStore();

  // Init socket on mount
  useEffect(() => {
    const cleanup = initSocket();

    // Close context menu on scroll
    const onScroll = () => setContextMenu(null);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      cleanup();
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
        *{font-family:'DM Mono',monospace}.title{font-family:'Syne',sans-serif}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#27273a;border-radius:99px}
        input::placeholder{color:#3f3f5a}
        .msg-in{animation:slideIn .15s ease-out}
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .bounce-dot{animation:bounceDot 1.2s infinite}
        @keyframes bounceDot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        .modal-in{animation:modalIn .18s cubic-bezier(.4,0,.2,1)}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes ctxIn{from{opacity:0;transform:scale(.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-3xl h-[680px] bg-zinc-950 border border-zinc-800/60 rounded-2xl flex overflow-hidden shadow-2xl relative">
          <Sidebar />
          <ChatArea />
        </div>

        {/* Context menu (portal-like, rendered outside the card) */}
        {contextMenu && (
          <ContextMenu
            msg={contextMenu.msg}
            isMine={contextMenu.isMine}
            position={contextMenu.position}
            onAction={handleAction}
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* Forward modal */}
        {forwardMsg && (
          <ForwardModal
            msg={forwardMsg}
            contacts={contacts.filter((c) => c._id !== activeContact?._id)}
            onForward={handleForward}
            onClose={() => setForwardMsg(null)}
          />
        )}
      </div>
    </>
  );
}