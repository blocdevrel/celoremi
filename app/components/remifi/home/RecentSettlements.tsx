"use client";

import type { JobResult } from "../types";
import { JobActivityRow } from "../status/JobActivityRow";

export type RecentSettlementsProps = {
  jobs: JobResult[];
  loading: boolean;
  onViewAll: () => void;
  onRunFirst: () => void;
};

export function RecentSettlements({
  jobs: recentJobs,
  loading: jobsLoading,
  onViewAll,
  onRunFirst,
}: RecentSettlementsProps) {
  return (
          <section className="overflow-hidden rounded-2xl bg-pp-white/80 ring-1 ring-pp-ink/[0.04] sm:rounded-[1.35rem] sm:bg-pp-white">
            <div className="flex items-center justify-between gap-3 border-b border-pp-ink/[0.035] px-4 py-3.5 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-pp-ink sm:text-lg">
                  Recent settlements
                </h2>
                <p className="mt-0.5 text-xs text-pp-ink/40 sm:text-sm">
                  Latest on-chain payroll and sends
                </p>
              </div>
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs font-semibold text-pp-ink/55 transition hover:text-pp-ink sm:text-sm"
              >
                View all
              </button>
            </div>

            {jobsLoading && recentJobs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-pp-ink/45 sm:px-6">
                Loading settlements…
              </p>
            ) : recentJobs.length === 0 ? (
              <div className="px-4 py-10 text-center sm:px-6">
                <p className="text-sm font-semibold text-pp-ink">
                  No settlements yet
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-pp-ink/45 sm:text-sm">
                  Run payroll or send USDC. Proofs land here.
                </p>
                <button
                  type="button"
                  onClick={onRunFirst}
                  className="mt-5 inline-flex min-h-10 items-center rounded-full bg-pp-ink px-5 text-sm font-semibold text-pp-white"
                >
                  Run first payroll
                </button>
              </div>
            ) : (
              <ul>
                {recentJobs.slice(0, 6).map((job, idx) => (
                  <JobActivityRow
                    key={job.jobId ?? `home-job-${idx}`}
                    job={job}
                    variant="home"
                  />
                ))}
              </ul>
            )}
          </section>
  );
}
