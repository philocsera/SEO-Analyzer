"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accessory?: React.ReactNode;
};

export function Section({ title, children, defaultOpen = false, accessory }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-slate-700/20 transition-colors"
      >
        <h2 className="text-base font-semibold text-slate-200 flex-1">{title}</h2>
        {accessory}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}
