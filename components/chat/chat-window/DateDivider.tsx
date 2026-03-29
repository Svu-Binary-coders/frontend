interface DateDividerProps {
  label: string;
}

export default function DateDivider({ label }: DateDividerProps) {
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-600" />
      <span className="text-[10px] font-semibold tracking-widest text-slate-400 dark:text-slate-500 px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-600" />
    </div>
  );
}