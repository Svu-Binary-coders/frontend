"use client";

import { useChatStore } from "@/stores/useChatStore";

export default function LoginScreen() {
  const { myIdInput, setMyIdInput, handleConnect } = useChatStore();

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
        *{font-family:'DM Mono',monospace}.title{font-family:'Syne',sans-serif}
        .glow{box-shadow:0 0 30px rgba(99,102,241,.25)}input::placeholder{color:#3f3f5a}
      `}</style>

      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl glow">
            ⌘
          </div>
          <h1 className="title text-white text-2xl font-bold mb-1">Chat Devkit</h1>
          <p className="text-zinc-600 text-xs">Socket test environment</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 glow">
          <label className="text-zinc-500 text-[11px] uppercase tracking-widest">
            Your MongoDB _id
          </label>
          <input
            type="text"
            placeholder="6650f3a2b4c1234567890abc"
            value={myIdInput}
            onChange={(e) => setMyIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-xs outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleConnect}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm rounded-xl py-3 transition-all mt-1"
          >
            Connect →
          </button>
        </div>
      </div>
    </div>
  );
}