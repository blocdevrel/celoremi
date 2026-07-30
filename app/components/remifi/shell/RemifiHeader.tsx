"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";

import { TABS as tabs } from "../constants";
import { shortAddr } from "../utils/address";
import { openInMiniPay } from "../../../../lib/minipay/connect";

export type RemifiHeaderProps = { app: RemifiAppModel };

export function RemifiHeader({ app }: RemifiHeaderProps) {
  const {
    connectTelegram,
    disconnectTelegram,
    health,
    inMiniPay,
    isMobile,
    setTab,
    tab,
    telegramBusy,
    telegramLinked,
    telegramUsername,
    wallet,
  } = app;
  const telegramEnabled = Boolean(health?.telegram?.enabled);

  return (
      <header className="pp-rise sticky top-0 z-20 -mx-4 mb-4 border-b border-pp-ink/5 bg-pp-soft/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:mb-8 lg:px-8 lg:py-4">
        <div className="flex items-center justify-between gap-3 lg:gap-6">
          <button
            type="button"
            onClick={() => setTab("home")}
            aria-label="Remifi home"
            className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg text-left transition hover:opacity-85 active:scale-[0.98]"
          >
            <img
              src="/logo.png"
              alt=""
              className="h-8 w-8 shrink-0 rounded-xl object-cover shadow-pp-soft lg:h-9 lg:w-9"
              draggable={false}
            />
            <span className="text-lg font-extrabold tracking-[-0.045em] lg:text-xl">
              Remifi
            </span>
          </button>

          <nav className="hidden items-center gap-1 rounded-full border border-pp-ink/8 bg-white/70 p-1 lg:flex">
            {tabs.map(([id, label]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`min-h-9 rounded-full px-4 text-sm font-extrabold tracking-tight transition ${
                    active
                      ? "bg-pp-ink text-pp-white"
                      : "text-pp-muted hover:text-pp-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {wallet.address ? (
              <span
                className="inline-flex max-w-[11rem] items-center gap-1 truncate rounded-full border border-pp-mint-deep/45 bg-pp-mint/50 py-1.5 pl-2.5 pr-1.5 text-[0.7rem] font-extrabold tracking-tight text-pp-ink sm:max-w-[12rem]"
                title={wallet.address}
              >
                <span className="truncate">
                  {wallet.isMiniPay ? "MiniPay" : "Wallet"}{" "}
                  {shortAddr(wallet.address)}
                </span>
                {!inMiniPay && !wallet.isMiniPay ? (
                  <button
                    type="button"
                    onClick={() => void wallet.disconnect()}
                    aria-label="Disconnect wallet"
                    title="Disconnect wallet"
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm leading-none text-pp-muted transition hover:bg-pp-ink/10 hover:text-pp-ink"
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ) : null}
            {wallet.address && telegramEnabled ? (
              telegramLinked ? (
                <span className="inline-flex max-w-[9.5rem] items-center gap-1 truncate rounded-full border border-pp-sky/80 bg-pp-sky/40 py-1.5 pl-2.5 pr-1.5 text-[0.7rem] font-extrabold tracking-tight text-pp-ink">
                  <span className="truncate">
                    TG {telegramUsername ? `@${telegramUsername}` : "linked"}
                  </span>
                  <button
                    type="button"
                    disabled={telegramBusy}
                    onClick={() => void disconnectTelegram()}
                    aria-label="Unlink Telegram from this account"
                    title="Unlink Telegram from this account"
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm leading-none text-pp-muted transition hover:bg-pp-ink/10 hover:text-pp-ink disabled:opacity-50"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={telegramBusy}
                  onClick={() => void connectTelegram()}
                  className="inline-flex min-h-8 items-center rounded-full border border-pp-ink/10 bg-pp-white/80 px-2.5 text-[0.7rem] font-extrabold text-pp-ink transition hover:bg-pp-white active:scale-[0.98] disabled:opacity-60 sm:px-3"
                >
                  {telegramBusy ? "Linking…" : "Telegram"}
                </button>
              )
            ) : null}
            {!inMiniPay ? (
              <button
                type="button"
                onClick={() => openInMiniPay()}
                className="inline-flex min-h-8 items-center rounded-full border border-pp-mint-deep/45 bg-pp-mint/70 px-2.5 text-[0.7rem] font-extrabold text-pp-ink transition active:scale-[0.98] sm:px-3"
              >
                Open MiniPay
              </button>
            ) : null}
            {!wallet.address ? (
              inMiniPay ? (
                wallet.connecting ? (
                  <span className="inline-flex min-h-8 items-center rounded-full border border-pp-ink/10 bg-pp-mist/80 px-3 text-[0.72rem] font-extrabold text-pp-muted">
                    Connecting MiniPay…
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={wallet.connecting}
                    onClick={() => void wallet.connect()}
                    className="inline-flex min-h-8 items-center rounded-full border border-pp-ink/10 bg-pp-ink px-3 text-[0.72rem] font-extrabold text-pp-white transition active:scale-[0.98] disabled:opacity-60"
                  >
                    Connect MiniPay
                  </button>
                )
              ) : !isMobile ? (
                <button
                  type="button"
                  disabled={wallet.connecting}
                  onClick={() => void wallet.connect()}
                  className="inline-flex min-h-8 items-center rounded-full border border-pp-ink/10 bg-pp-ink px-3 text-[0.72rem] font-extrabold text-pp-white transition active:scale-[0.98] disabled:opacity-60"
                >
                  {wallet.connecting ? "Connecting…" : "Connect wallet"}
                </button>
              ) : null
            ) : null}
            <span className="hidden min-h-8 items-center gap-1.5 rounded-full border border-pp-ink/10 bg-white/70 px-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.02em] sm:inline-flex">
              <i
                className={`relative block h-1.5 w-1.5 rounded-full ${
                  health?.chainOk ? "bg-pp-mint-deep" : "bg-pp-salmon"
                }`}
              >
                {health?.chainOk ? (
                  <span className="absolute -inset-[3px] animate-[pp-live-pulse_1.6s_ease-out_infinite] rounded-full border-[1.5px] border-pp-mint-deep opacity-65" />
                ) : null}
              </i>
              Celo
            </span>
          </div>
        </div>
      </header>
  );
}
