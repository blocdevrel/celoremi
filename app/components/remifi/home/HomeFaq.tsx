"use client";

import type { Dispatch, SetStateAction } from "react";
import { HOME_FAQS } from "../constants";

export type HomeFaqProps = {
  openIndex: number | null;
  setOpenIndex: Dispatch<SetStateAction<number | null>>;
};

export function HomeFaq({
  openIndex: faqOpen,
  setOpenIndex: setFaqOpen,
}: HomeFaqProps) {
  return (
          <section className="rounded-2xl bg-[#eef2f6] px-4 py-8 sm:rounded-[1.35rem] sm:px-6 sm:py-10">
            <h2 className="text-center text-[1.65rem] font-bold tracking-tight text-pp-ink sm:text-3xl">
              Common questions
            </h2>
            <div className="mx-auto mt-6 max-w-2xl divide-y divide-pp-ink/10 border-y border-pp-ink/10 md:mt-8">
              {HOME_FAQS.map((f, i) => {
                const isOpen = faqOpen === i;
                return (
                  <div key={f.q}>
                    <button
                      type="button"
                      onClick={() => setFaqOpen(isOpen ? null : i)}
                      className="flex min-h-12 w-full items-center justify-between gap-4 py-4 text-left sm:py-5"
                    >
                      <span className="text-base font-semibold text-pp-ink md:text-lg">
                        {f.q}
                      </span>
                      <span
                        aria-hidden
                        className={`grid h-5 w-5 shrink-0 place-items-center text-pp-ink/45 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          className="h-5 w-5"
                          aria-hidden
                        >
                          <path
                            d="M5 7.5 10 12.5 15 7.5"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-3xl pb-5 text-sm leading-relaxed text-pp-ink/60 md:text-[15px]">
                          {f.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
  );
}
