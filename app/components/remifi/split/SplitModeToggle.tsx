"use client";

import type { SplitMode } from "../types";

export type SplitModeToggleProps = {
  mode: SplitMode;
  onChange: (mode: SplitMode) => void;
};

export function SplitModeToggle({ mode, onChange }: SplitModeToggleProps) {
  return (
    <div className="flex rounded-full border border-pp-ink/8 bg-pp-white/80 p-1 shadow-pp-soft">
      <button
        type="button"
        onClick={() => onChange("create")}
        className={`min-h-10 flex-1 rounded-full text-sm font-semibold transition ${
          mode === "create"
            ? "bg-pp-ink text-pp-white"
            : "text-pp-ink/45 hover:text-pp-ink"
        }`}
      >
        New policy
      </button>
      <button
        type="button"
        onClick={() => onChange("payroll")}
        className={`min-h-10 flex-1 rounded-full text-sm font-semibold transition ${
          mode === "payroll"
            ? "bg-pp-ink text-pp-white"
            : "text-pp-ink/45 hover:text-pp-ink"
        }`}
      >
        Hire &amp; run
      </button>
    </div>
  );
}
