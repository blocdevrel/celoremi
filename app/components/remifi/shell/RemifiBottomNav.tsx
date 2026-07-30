"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";

import { TABS as tabs } from "../constants";

export type RemifiBottomNavProps = { app: RemifiAppModel };

export function RemifiBottomNav({ app }: RemifiBottomNavProps) {
  const { setTab, tab } = app;
  return (
      <nav className="fixed bottom-4 left-1/2 z-30 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-full border border-pp-ink/5 bg-pp-white/95 p-1.5 shadow-pp backdrop-blur-md lg:hidden">
        <ul className="grid grid-cols-4 gap-1">
          {tabs.map(([id, label]) => {
            const active = tab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex min-h-11 w-full items-center justify-center rounded-full text-xs font-extrabold tracking-tight transition ${
                    active
                      ? "bg-pp-ink text-pp-white"
                      : "text-pp-muted hover:text-pp-ink"
                  }`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
  );
}
