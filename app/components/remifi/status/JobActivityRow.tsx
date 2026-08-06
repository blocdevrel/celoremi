"use client";

import type { JobResult } from "../types";
import { shortAddr, truncateLabel } from "../utils/address";
import { meaningfulRecipientLabel } from "@/lib/policy/labels";
import {
  formatJobWhen,
  jobExplorerUrl,
  jobHeading,
  jobKindLabel,
} from "../utils/jobs";
import { formatUsdc } from "../utils/usdc";

export type JobActivityRowProps = {
  job: JobResult;
  variant: "home" | "status";
};

export function JobActivityRow({ job, variant }: JobActivityRowProps) {
  const isInstant = job.kind === "instant";
  const amount = job.totalAmount ?? job.amount;
  const status = (job.status ?? "").toLowerCase();
  const ok =
    status === "completed" || status === "success" || status === "settled";
  const firstTx = jobExplorerUrl(job);
  const transfers = job.transfers ?? [];
  const legs = transfers.length;
  const visibleLegs = transfers.slice(0, 2);
  const hiddenLegs = Math.max(0, legs - visibleLegs.length);
  const showLegs = variant === "status" && !isInstant && legs > 1;
  const meta = [
    jobKindLabel(job),
    job.hireMode === "x402" ? "x402" : null,
    !isInstant && legs > 0
      ? `${legs} recipient${legs === 1 ? "" : "s"}`
      : null,
    formatJobWhen(job.completedAt ?? job.createdAt),
  ]
    .filter(Boolean)
    .join(", ");

  const summary = (
    <>
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-bold uppercase tracking-wide ${
          isInstant
            ? "bg-pp-sky/50 text-pp-ink/70"
            : "bg-pp-mint/55 text-pp-ink/70"
        }`}
      >
        {isInstant ? "out" : "split"}
      </span>
      <div
        className={
          variant === "status"
            ? "min-w-0 flex-1 overflow-hidden"
            : "min-w-0 flex-1"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={
              variant === "status" ? "min-w-0 overflow-hidden" : "min-w-0"
            }
          >
            <p
              className="truncate text-sm font-semibold tracking-tight text-pp-ink"
              title={
                variant === "status"
                  ? job.kind === "instant"
                    ? job.to || job.transfers?.[0]?.to || undefined
                    : job.policyName?.trim() || undefined
                  : undefined
              }
            >
              {jobHeading(job)}
            </p>
            <p className="mt-0.5 truncate text-xs text-pp-ink/40">{meta}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums tracking-tight text-pp-ink">
              {amount ? `$${formatUsdc(amount)}` : "—"}
            </p>
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-medium text-pp-ink/40">
              {ok ? (
                <span className="inline-flex items-center gap-1 text-pp-teal">
                  <i className="h-1.5 w-1.5 rounded-full bg-pp-mint-deep" />
                  Paid
                </span>
              ) : (
                <span className="capitalize">{job.status ?? "—"}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const rowClassName =
    "flex items-center gap-3 px-4 py-3.5 transition hover:bg-pp-ink/[0.015] sm:gap-3.5 sm:px-6";
  const staticRowClassName =
    "flex items-center gap-3 px-4 py-3.5 sm:gap-3.5 sm:px-6";

  return (
    <li className="border-b border-pp-ink/[0.035] last:border-b-0">
      {firstTx ? (
        <a
          href={firstTx}
          target="_blank"
          rel="noreferrer"
          className={rowClassName}
        >
          {summary}
        </a>
      ) : (
        <div className={staticRowClassName}>{summary}</div>
      )}

      {showLegs ? (
        <ul className="divide-y divide-pp-ink/[0.04] border-t border-pp-ink/[0.04] bg-pp-soft/40">
          {visibleLegs.map((transfer, index) => {
            const txHref =
              transfer.explorer ||
              (transfer.txHash
                ? `https://celoscan.io/tx/${transfer.txHash}`
                : null);
            const purpose = meaningfulRecipientLabel(transfer.label);
            const legTitle = purpose || transfer.to || "Recipient";
            const legPrimary = purpose
              ? truncateLabel(purpose, 16)
              : shortAddr(transfer.to);
            const leg = (
              <>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pp-white text-[9px] font-bold uppercase tracking-wide text-pp-ink/45 ring-1 ring-pp-ink/[0.04]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p
                    className="truncate text-[13px] font-semibold tracking-tight text-pp-ink/80"
                    title={legTitle}
                  >
                    {legPrimary}
                  </p>
                  {purpose ? (
                    <p className="mt-0.5 truncate text-[11px] text-pp-ink/35">
                      {shortAddr(transfer.to)}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-[13px] font-semibold tabular-nums tracking-tight text-pp-ink/80">
                  ${formatUsdc(transfer.amount)}
                </p>
              </>
            );
            return (
              <li key={`${job.jobId}-${transfer.to}-${index}`}>
                {txHref ? (
                  <a
                    href={txHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 py-2.5 pl-14 pr-4 transition hover:bg-pp-ink/[0.02] sm:pl-16 sm:pr-6"
                  >
                    {leg}
                  </a>
                ) : (
                  <div className="flex items-center gap-3 py-2.5 pl-14 pr-4 sm:pl-16 sm:pr-6">
                    {leg}
                  </div>
                )}
              </li>
            );
          })}
          {hiddenLegs > 0 ? (
            <li className="px-4 py-2.5 pl-14 text-xs font-medium text-pp-ink/40 sm:pl-16 sm:pr-6">
              +{hiddenLegs} more…
            </li>
          ) : null}
        </ul>
      ) : null}

      {job.x402SettlementTxHash && !showLegs && variant === "status" ? (
        <div className="border-t border-pp-ink/[0.03] bg-pp-soft/30 px-4 py-2.5 sm:px-6">
          <a
            href={
              job.x402Explorer ??
              `https://celoscan.io/tx/${job.x402SettlementTxHash}`
            }
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-pp-ink/45 transition hover:text-pp-ink"
          >
            x402 settle {shortAddr(job.x402SettlementTxHash)}
          </a>
        </div>
      ) : null}
    </li>
  );
}
