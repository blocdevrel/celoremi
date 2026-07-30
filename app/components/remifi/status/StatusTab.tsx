"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";

import { PROOF_FILTERS as proofFilters, PROOF_PAGE_SIZE } from "../constants";
import { JobActivityRow } from "./JobActivityRow";

export type StatusTabProps = { app: RemifiAppModel };

export function StatusTab({ app }: StatusTabProps) {
  const {
    connectTelegram,
    filteredJobs,
    health,
    hiddenJobCount,
    jobsErr,
    jobsLoading,
    loadRecentJobs,
    proofExpanded,
    proofFilter,
    recentJobs,
    setProofExpanded,
    setProofFilter,
    setSplitMode,
    setTab,
    telegramBusy,
    telegramLinked,
    visibleJobs,
    wallet,
  } = app;
  const showTelegramCallout =
    Boolean(health?.telegram?.enabled) &&
    Boolean(wallet.address) &&
    !telegramLinked;

  return (
        <main className="pp-rise mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 pb-8 sm:gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pp-ink/35 sm:text-[11px]">
                Proof
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-pp-ink sm:text-2xl">
                Settlement ledger
              </h2>
              <p className="mt-1.5 max-w-md text-sm font-medium text-pp-ink/50">
                Payroll splits, tagged sends, and x402 hires with on-chain proof.
              </p>
            </div>
            <button
              type="button"
              disabled={jobsLoading}
              onClick={() => void loadRecentJobs()}
              className="min-h-10 rounded-full border border-pp-ink/10 bg-pp-white px-4 text-sm font-semibold text-pp-ink transition hover:bg-pp-soft disabled:opacity-60"
            >
              {jobsLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {showTelegramCallout ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pp-sky/35 px-4 py-3 ring-1 ring-pp-ink/[0.04] sm:px-5">
              <p className="text-sm font-medium text-pp-ink/70">
                Link this wallet to your Telegram for receipts when payroll or
                sends settle. In MiniPay, your account auto-connects and gas is
                free.
              </p>
              <button
                type="button"
                disabled={telegramBusy}
                onClick={() => void connectTelegram()}
                className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-pp-ink px-4 text-sm font-semibold text-pp-white transition hover:bg-pp-ink/90 disabled:opacity-60"
              >
                {telegramBusy ? "Linking…" : "Link my account"}
              </button>
            </div>
          ) : null}
          <section className="overflow-hidden rounded-2xl bg-pp-white/80 ring-1 ring-pp-ink/[0.04] sm:rounded-[1.35rem] sm:bg-pp-white">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-pp-ink/[0.035] px-3 py-3 sm:gap-2 sm:px-5 sm:py-3.5">
              {proofFilters.map(({ id, label }) => {
                const active = proofFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setProofFilter(id);
                      setProofExpanded(false);
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                      active
                        ? "bg-pp-ink text-pp-white"
                        : "bg-pp-soft text-pp-ink/45 hover:text-pp-ink"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {jobsErr ? (
              <p className="mx-4 mt-4 rounded-xl bg-pp-salmon/28 px-3 py-2 text-sm text-[#7a322e] sm:mx-6">
                {jobsErr}
              </p>
            ) : null}

            {jobsLoading && recentJobs.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-pp-ink/45 sm:px-6">
                Loading settlements…
              </p>
            ) : recentJobs.length === 0 ? (
              <div className="px-4 py-12 text-center sm:px-6">
                <p className="text-sm font-semibold text-pp-ink">
                  No settlements yet
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-pp-ink/45 sm:text-sm">
                  Run payroll or send USDC. Proofs land here.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode("payroll");
                    setTab("split");
                  }}
                  className="mt-5 inline-flex min-h-10 items-center rounded-full bg-pp-ink px-5 text-sm font-semibold text-pp-white"
                >
                  Run first payroll
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-pp-ink/45 sm:px-6">
                No {proofFilter === "all" ? "settlements" : proofFilter} in the
                ledger yet.
              </p>
            ) : (
              <ul>
                {visibleJobs.map((job, idx) => (
                  <JobActivityRow
                    key={job.jobId ?? `job-${idx}`}
                    job={job}
                    variant="status"
                  />
                ))}
              </ul>
            )}

            {hiddenJobCount > 0 ? (
              <div className="border-t border-pp-ink/[0.035] px-4 py-3 text-center sm:px-6">
                <button
                  type="button"
                  onClick={() => setProofExpanded(true)}
                  className="text-sm font-semibold text-pp-ink/55 transition hover:text-pp-ink"
                >
                  Show {hiddenJobCount} more…
                </button>
              </div>
            ) : proofExpanded && filteredJobs.length > PROOF_PAGE_SIZE ? (
              <div className="border-t border-pp-ink/[0.035] px-4 py-3 text-center sm:px-6">
                <button
                  type="button"
                  onClick={() => setProofExpanded(false)}
                  className="text-sm font-semibold text-pp-ink/55 transition hover:text-pp-ink"
                >
                  Show less
                </button>
              </div>
            ) : null}
          </section>
        </main>
  );
}
