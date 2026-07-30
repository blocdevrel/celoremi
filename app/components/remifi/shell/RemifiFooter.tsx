"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";

import { TABS as tabs } from "../constants";

export type RemifiFooterProps = { app: RemifiAppModel };

export function RemifiFooter({ app }: RemifiFooterProps) {
  const { setTab } = app;
  return (
<>
      <footer className="pp-rise-slow mt-auto hidden w-full border-t border-pp-ink/10 bg-pp-white/90 backdrop-blur-md lg:block">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-6 px-8 py-6 xl:max-w-7xl">
          <div className="grid gap-2">
            <div className="inline-flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt=""
                className="h-7 w-7 shrink-0 rounded-lg object-cover"
                draggable={false}
              />
              <strong className="text-base font-extrabold tracking-[-0.035em]">
                Remifi
              </strong>
            </div>
            <p className="max-w-xs pl-9 text-sm font-medium leading-snug text-pp-muted">
              AI agent for recurring payments and fund distributions. Create a
              policy once, funds split automatically.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="border-b-[1.5px] border-transparent pb-0.5 text-sm font-bold tracking-tight text-pp-ink transition hover:border-pp-mint-deep"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-pp-ink/10 px-8 py-3.5 text-xs font-medium text-pp-muted xl:max-w-7xl">
          <span>Celo mainnet, Circle USDC, Operated by Remifi</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 font-bold text-pp-ink">
            <a href="/legal/terms" className="underline underline-offset-2">
              Terms
            </a>
            <a href="/legal/privacy" className="underline underline-offset-2">
              Privacy
            </a>
            <a
              href="https://t.me/allenrel"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Support
            </a>
          </nav>
        </div>
      </footer>

      {/* Mobile legal strip (MiniPay listing requires in-app Terms + Privacy + Support) */}
      <div className="mx-auto w-full max-w-md px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-2 text-center text-[0.68rem] font-semibold text-pp-muted lg:hidden">
        <a href="/legal/terms" className="underline underline-offset-2">
          Terms
        </a>
        {", "}
        <a href="/legal/privacy" className="underline underline-offset-2">
          Privacy
        </a>
        {", "}
        <a
          href="https://t.me/allenrel"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Support
        </a>
        <span className="mt-1 block font-medium">Operated by Remifi, not MiniPay</span>
      </div>
</>
  );
}
