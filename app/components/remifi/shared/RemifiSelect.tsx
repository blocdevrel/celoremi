"use client";

import { useEffect, useId, useRef, useState } from "react";

export type RemifiSelectOption = {
  value: string;
  label: string;
};

export type RemifiSelectProps = {
  value: string;
  options: RemifiSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  menuAlign?: "left" | "right";
};

export function RemifiSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
  menuAlign = "right",
}: RemifiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`inline-flex h-8 min-w-[7.5rem] items-center justify-between gap-2 rounded-lg border border-pp-ink/8 bg-pp-white px-2.5 text-xs font-semibold text-pp-ink transition enabled:hover:border-pp-ink/15 enabled:hover:bg-pp-soft disabled:cursor-not-allowed disabled:opacity-45 ${
          open ? "border-pp-brand/35 ring-2 ring-pp-brand/15" : ""
        }`}
      >
        <span className="truncate">{selected?.label ?? "Select"}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className={`h-3.5 w-3.5 shrink-0 text-pp-ink/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M4 6.25 8 10.25 12 6.25"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute top-[calc(100%+0.35rem)] z-40 min-w-full overflow-hidden rounded-xl border border-pp-ink/8 bg-pp-white py-1 shadow-pp-soft ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold transition ${
                    isActive
                      ? "bg-pp-brand-soft text-pp-brand-deep"
                      : "text-pp-ink hover:bg-pp-soft"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-pp-brand"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
