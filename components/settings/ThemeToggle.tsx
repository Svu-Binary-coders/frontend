"use client";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
      {themes.map((t) => (
        <Button
          key={t.value}
          variant="ghost"
          size="icon"
          onClick={() => setTheme(t.value)}
          className={cn(
            "h-7 w-7 rounded-md transition-all",
            theme === t.value
              ? "bg-white dark:bg-slate-700 shadow-sm text-sky-500"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          {t.icon}
        </Button>
      ))}
    </div>
  );
}