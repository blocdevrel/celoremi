"use client";

import { useEffect, useState } from "react";

import type { RemifiAppModel } from "../hooks/useRemifiApp";

import { TABS as tabs } from "../constants";

/**
 * MiniPay / mobile WebViews often use interactive-widget=resizes-content,
 * so innerHeight and visualViewport shrink together and the old
 * (innerHeight - vv.height) check never fires. Hide the nav whenever an
 * editable field is focused, and also when the viewport clearly shrinks.
 */
function useKeyboardOpen() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    let baseline = vv?.height ?? window.innerHeight;

    const isEditable = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
      }
      return el.isContentEditable;
    };

    const update = () => {
      const editing = isEditable(document.activeElement);
      const height = vv?.height ?? window.innerHeight;

      if (!editing) {
        baseline = Math.max(baseline, height);
        setKeyboardOpen(false);
        return;
      }

      const shrunk = baseline - height > 80;
      const offset = (vv?.offsetTop ?? 0) > 24;
      setKeyboardOpen(editing || shrunk || offset);
    };

    const onFocusIn = () => {
      if (isEditable(document.activeElement)) {
        setKeyboardOpen(true);
      }
      // Re-measure after the keyboard animates in.
      window.setTimeout(update, 50);
      window.setTimeout(update, 250);
    };

    const onFocusOut = () => {
      window.setTimeout(update, 50);
      window.setTimeout(update, 200);
    };

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return keyboardOpen;
}

export type RemifiBottomNavProps = { app: RemifiAppModel };

export function RemifiBottomNav({ app }: RemifiBottomNavProps) {
  const { setTab, tab } = app;
  const keyboardOpen = useKeyboardOpen();

  return (
    <nav
      aria-label="Primary"
      aria-hidden={keyboardOpen}
      className={`fixed bottom-4 left-1/2 z-30 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-full border border-pp-ink/5 bg-pp-white/95 p-1.5 shadow-pp backdrop-blur-md transition duration-150 lg:hidden ${
        keyboardOpen
          ? "pointer-events-none invisible translate-y-3 opacity-0"
          : "visible opacity-100"
      }`}
    >
      <ul className="grid grid-cols-4 gap-1">
        {tabs.map(([id, label]) => {
          const active = tab === id;
          return (
            <li key={id}>
              <button
                type="button"
                tabIndex={keyboardOpen ? -1 : undefined}
                onClick={() => setTab(id)}
                className={`flex min-h-11 w-full items-center justify-center rounded-full text-xs font-extrabold tracking-tight transition ${
                  active
                    ? "bg-pp-ink text-white"
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
