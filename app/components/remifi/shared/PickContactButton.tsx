"use client";

type PickContactButtonProps = {
  busy?: boolean;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
  className?: string;
};

export function PickContactButton({
  busy,
  disabled,
  label = "Pick contact",
  onClick,
  className = "",
}: PickContactButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={
        className ||
        "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-pp-ink/10 bg-pp-white px-3 text-xs font-semibold text-pp-ink transition hover:bg-pp-soft enabled:active:scale-[0.98] disabled:opacity-50"
      }
    >
      {busy ? "Opening…" : label}
    </button>
  );
}