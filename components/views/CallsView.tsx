// views/CallsView.tsx
import { Phone } from "lucide-react";

export default function CallsView() {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">Calls</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
          <Phone className="h-6 w-6 text-slate-300" />
        </div>
        <p className="text-xs text-slate-400">No recent calls</p>
      </div>
    </div>
  );
}