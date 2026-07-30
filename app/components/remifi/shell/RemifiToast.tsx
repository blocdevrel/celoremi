"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";

export type RemifiToastProps = { app: RemifiAppModel };

export function RemifiToast({ app }: RemifiToastProps) {
  const { setToast, toast } = app;
  if (!toast) return null;

  const isOk = toast.kind === "ok";
  const isErr = toast.kind === "err";
  const isInfo = toast.kind === "info";

  const title =
    toast.title ??
    (isOk ? "Done" : isErr ? "Couldn't complete" : "Working");

  return (
    <div
      role={isErr ? "alert" : "status"}
      aria-live={isErr ? "assertive" : "polite"}
      className="pp-toast pointer-events-auto fixed inset-x-3 z-40 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-5 sm:bottom-8 sm:max-w-[22rem] lg:bottom-8"
    >
      <button
        type="button"
        onClick={() => setToast(null)}
        className={`flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left shadow-pp-soft ring-1 backdrop-blur-md transition active:scale-[0.99] sm:w-[22rem] ${
          isOk
            ? "bg-pp-mint-soft/95 ring-pp-mint-deep/35"
            : isErr
              ? "bg-[#fff5f4]/95 ring-pp-salmon/55"
              : "bg-pp-white/95 ring-pp-ink/[0.08]"
        }`}
      >
        <span
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold ${
            isOk
              ? "bg-pp-mint/80 text-pp-ink"
              : isErr
                ? "bg-pp-salmon/55 text-pp-ink"
                : "bg-pp-brand-soft text-pp-brand-deep"
          }`}
          aria-hidden
        >
          {isOk ? "✓" : isErr ? "!" : "…"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8rem] font-bold tracking-tight text-pp-ink">
            {title}
          </span>
          <span
            className={`mt-0.5 block text-[0.75rem] font-medium leading-snug ${
              isErr ? "text-[#8f2f28]" : "text-pp-ink/60"
            }`}
          >
            {toast.text}
          </span>
          {isInfo ? (
            <span className="mt-2 block h-0.5 overflow-hidden rounded-full bg-pp-ink/[0.06]">
              <span className="pp-toast-bar block h-full w-1/2 rounded-full bg-pp-brand/70" />
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 text-xs font-semibold text-pp-ink/30" aria-hidden>
          ✕
        </span>
      </button>
    </div>
  );
}
