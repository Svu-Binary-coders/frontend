// views/InviteView.tsx
import { Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InviteView() {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">Invite Team</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center">
          <Users className="h-6 w-6 text-sky-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">Invite your team</p>
          <p className="text-xs text-slate-400 mt-1">Share the link below</p>
        </div>
        <div className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-500 flex-1 truncate font-mono">
            https://ucoder.in/invite/abc123
          </span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200">
            <Copy className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}