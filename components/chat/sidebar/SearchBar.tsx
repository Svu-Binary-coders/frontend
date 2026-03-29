"use client";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white group-focus-within:text-sky-400 transition-colors duration-150" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search conversations..."
        className="w-full pl-9 pr-9 h-9 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl
                    placeholder:text-zinc-600 dark:placeholder:text-zinc-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500
                   focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500
                   transition-all duration-150"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2  hover:text-sky-400 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}