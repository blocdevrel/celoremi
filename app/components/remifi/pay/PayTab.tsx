"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";
import { formatUsdc } from "../utils/usdc";

export type PayTabProps = { app: RemifiAppModel };

export function PayTab({ app }: PayTabProps) {
  const {
    applyMaxAmount,
    busy,
    formatBalanceLine,
    hirePriceBaseUnits,
    instantPay,
    payAmount,
    payTo,
    setPayAmount,
    setPayTo,
    walletUsdcBalance,
  } = app;
  const hireFee = hirePriceBaseUnits();
  const canSend = Boolean(payTo.trim() && payAmount.trim());

  return (
    <main className="pp-rise mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 pb-8 sm:gap-6 lg:max-w-2xl">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pp-ink/35 sm:text-[11px]">
          Send
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-pp-ink sm:text-2xl">
          Hire Remifi &amp; send
        </h2>
      </div>

      <div className="grid gap-0 overflow-hidden rounded-2xl bg-pp-white/80 ring-1 ring-pp-ink/[0.04] sm:rounded-[1.35rem] sm:bg-pp-white">
        <div className="grid gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-pp-ink">To</span>
            <input
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              placeholder="0x… or name.eth"
              className="min-h-12 w-full rounded-xl border border-pp-ink/8 bg-pp-soft px-4 font-mono text-sm font-medium text-pp-ink outline-none transition placeholder:text-pp-ink/35 placeholder:font-normal focus:border-pp-ink/20 focus:bg-pp-white"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-pp-ink">Amount</span>
            <div className="relative">
              <input
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="min-h-12 w-full rounded-xl border border-pp-ink/8 bg-pp-soft px-4 pr-24 text-[0.92rem] font-medium tabular-nums text-pp-ink outline-none transition placeholder:text-pp-ink/35 placeholder:font-normal focus:border-pp-ink/20 focus:bg-pp-white"
              />
              <button
                type="button"
                onClick={() => applyMaxAmount(setPayAmount)}
                className="absolute right-14 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-[0.7rem] font-semibold text-pp-ink/55 transition hover:bg-pp-white hover:text-pp-ink"
              >
                Max
              </button>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-pp-ink/40">
                USDC
              </span>
            </div>
            <p className="text-xs font-medium text-pp-ink/40">
              Balance{" "}
              <strong className="text-pp-ink">
                ${formatBalanceLine(walletUsdcBalance)} USDC
              </strong>
              {hireFee > 0n ? (
                <span>
                  {" "}
                  · Hire fee {formatUsdc(hireFee.toString())} USDC
                </span>
              ) : null}
            </p>
          </label>
        </div>

        <div className="border-t border-pp-ink/[0.04] px-4 py-4 sm:px-6">
          <button
            type="button"
            disabled={busy || !canSend}
            onClick={() => void instantPay()}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-pp-ink px-6 text-sm font-semibold text-pp-white transition hover:bg-pp-ink/90 enabled:active:scale-[0.98] disabled:opacity-50"
          >
            {busy
              ? "Sending…"
              : payAmount.trim()
                ? `${payAmount.trim()} USDC · Hire Remifi & send`
                : "Hire Remifi & send"}
          </button>
        </div>
      </div>
    </main>
  );
}
