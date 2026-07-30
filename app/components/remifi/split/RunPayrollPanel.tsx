"use client";

import { useMemo } from "react";
import type { RemifiAppModel } from "../hooks/useRemifiApp";
import {
  sharesFromPolicyRecipients,
  SplitSharePreview,
} from "../shared/SplitSharePreview";
import { RemifiSelect } from "../shared/RemifiSelect";
import { summarizePolicyRecipients } from "../utils/policy";
import { formatUsdc, usdcToBaseUnits } from "../utils/usdc";

export type RunPayrollPanelProps = Pick<
  RemifiAppModel,
  | "applyMaxAmount"
  | "autoPayrollSchedule"
  | "busy"
  | "filteredPolicies"
  | "formatBalanceLine"
  | "hirePriceBaseUnits"
  | "payPayroll"
  | "policiesLoading"
  | "policyId"
  | "policySearch"
  | "savedPolicies"
  | "scheduleInterval"
  | "schedulesLoading"
  | "selectPolicy"
  | "selectedPolicy"
  | "setPolicySearch"
  | "setScheduleInterval"
  | "setSplitAmount"
  | "setSplitMode"
  | "splitAmount"
  | "toggleAutoPayroll"
  | "walletUsdcBalance"
>;

function previewAmountsForPolicy(
  recipients: Array<{ address: string; bps: number; label?: string }>,
  totalBase: bigint,
): Array<{ address: string; amount: string; label?: string }> {
  let allocated = 0n;
  return recipients.map((r, i) => {
    const isLast = i === recipients.length - 1;
    const amount = isLast
      ? totalBase - allocated
      : (totalBase * BigInt(r.bps)) / 10_000n;
    allocated += amount;
    return {
      address: r.address,
      amount: formatUsdc(amount.toString()),
      ...(r.label ? { label: r.label } : {}),
    };
  });
}

export function RunPayrollPanel({
  applyMaxAmount,
  autoPayrollSchedule,
  busy,
  filteredPolicies,
  formatBalanceLine,
  hirePriceBaseUnits,
  payPayroll,
  policiesLoading,
  policyId,
  policySearch,
  savedPolicies,
  scheduleInterval,
  schedulesLoading,
  selectPolicy,
  selectedPolicy,
  setPolicySearch,
  setScheduleInterval,
  setSplitAmount,
  setSplitMode,
  splitAmount,
  toggleAutoPayroll,
  walletUsdcBalance,
}: RunPayrollPanelProps) {
  const hireFee = hirePriceBaseUnits();

  const amountPreview = useMemo(() => {
    if (!selectedPolicy?.recipients?.length) return null;
    const base = usdcToBaseUnits(splitAmount);
    if (!base || BigInt(base) <= 0n) {
      return sharesFromPolicyRecipients(selectedPolicy.recipients);
    }
    return sharesFromPolicyRecipients(
      selectedPolicy.recipients,
      previewAmountsForPolicy(selectedPolicy.recipients, BigInt(base)),
    );
  }, [selectedPolicy, splitAmount]);

  return (
    <div className="grid gap-0 overflow-hidden rounded-2xl bg-pp-white/80 ring-1 ring-pp-ink/[0.04] sm:rounded-[1.35rem] sm:bg-pp-white">
      <div className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-pp-soft px-3 py-2.5">
          <div className="mr-auto min-w-0">
            <p className="text-xs font-semibold text-pp-ink">Auto run</p>
            <p className="text-[11px] font-medium text-pp-ink/40">
              Recurring hire on a cadence
            </p>
          </div>
          <RemifiSelect
            ariaLabel="Auto payroll cadence"
            value={scheduleInterval}
            onChange={setScheduleInterval}
            disabled={busy || !policyId || Boolean(autoPayrollSchedule)}
            options={[
              { value: "20", label: "Every 20m" },
              { value: "60", label: "Hourly" },
              { value: "1440", label: "Daily" },
              { value: "10080", label: "Weekly" },
              { value: "43200", label: "Monthly" },
            ]}
          />
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(autoPayrollSchedule)}
            aria-label="Auto payroll"
            disabled={busy || !policyId || schedulesLoading}
            onClick={() => void toggleAutoPayroll(!autoPayrollSchedule)}
            className={`relative h-7 w-11 shrink-0 rounded-full transition-colors disabled:opacity-45 ${
              autoPayrollSchedule ? "bg-pp-teal" : "bg-pp-ink/15"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                autoPayrollSchedule ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="grid gap-3">
          <div className="flex items-end justify-between gap-2">
            <label className="grid flex-1 gap-1.5">
              <span className="text-sm font-semibold text-pp-ink">
                Choose policy
              </span>
              <input
                type="search"
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                placeholder="Search by name or recipient"
                className="min-h-11 w-full rounded-xl border border-pp-ink/8 bg-pp-soft px-4 text-[0.92rem] font-medium text-pp-ink outline-none transition placeholder:text-pp-ink/35 placeholder:font-normal focus:border-pp-ink/20 focus:bg-pp-white"
              />
            </label>
            {policiesLoading && savedPolicies.length > 0 ? (
              <span className="shrink-0 pb-3 text-xs font-medium text-pp-ink/40">
                Updating…
              </span>
            ) : null}
          </div>

          {policiesLoading && savedPolicies.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-pp-ink/45">
              Loading policies…
            </p>
          ) : savedPolicies.length === 0 ? (
            <div className="rounded-xl bg-pp-soft px-4 py-10 text-center">
              <p className="text-sm font-semibold text-pp-ink">
                No policies yet
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs font-medium text-pp-ink/45">
                Create a 20 / 20 / 60 style policy once, then hire Remifi whenever
                you need to distribute funds.
              </p>
              <button
                type="button"
                onClick={() => setSplitMode("create")}
                className="mt-5 inline-flex min-h-10 items-center rounded-full bg-pp-ink px-5 text-sm font-semibold text-pp-white"
              >
                Create policy
              </button>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <p className="rounded-xl bg-pp-soft px-4 py-8 text-center text-sm font-medium text-pp-ink/45">
              No policies match &ldquo;{policySearch.trim()}&rdquo;
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-pp-ink/40">
                {filteredPolicies.length} of {savedPolicies.length} polic
                {savedPolicies.length === 1 ? "y" : "ies"}
                {policySearch.trim() ? " matching" : ""}
              </p>
              <ul className="grid max-h-56 gap-2 overflow-y-auto">
                {filteredPolicies.map((policy) => {
                  const selected = policyId === policy.policyId;
                  return (
                    <li key={policy.policyId}>
                      <button
                        type="button"
                        onClick={() => selectPolicy(policy)}
                        className={`flex w-full flex-col gap-1 rounded-xl px-4 py-3.5 text-left transition ${
                          selected
                            ? "bg-pp-ink text-pp-white"
                            : "bg-pp-soft text-pp-ink hover:bg-pp-mist"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold tracking-tight">
                            {policy.name?.trim() || "Untitled policy"}
                          </span>
                          {selected ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-pp-mint">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`truncate text-xs font-medium ${
                            selected ? "text-white/55" : "text-pp-ink/40"
                          }`}
                        >
                          {summarizePolicyRecipients(policy.recipients)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {selectedPolicy && amountPreview ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-pp-ink/35">
              This run pays
            </p>
            <SplitSharePreview shares={amountPreview} />
          </div>
        ) : null}

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-pp-ink">
            Amount to distribute
          </span>
          <div className="relative">
            <input
              inputMode="decimal"
              value={splitAmount}
              onChange={(e) => setSplitAmount(e.target.value)}
              placeholder="1.00"
              className="min-h-12 w-full rounded-xl border border-pp-ink/8 bg-pp-soft px-4 pr-24 text-[0.92rem] font-medium tabular-nums text-pp-ink outline-none transition placeholder:text-pp-ink/35 placeholder:font-normal focus:border-pp-ink/20 focus:bg-pp-white"
            />
            <button
              type="button"
              onClick={() => applyMaxAmount(setSplitAmount)}
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
                · Max keeps {formatUsdc(hireFee.toString())} for hire fee
              </span>
            ) : null}
          </p>
        </label>
      </div>

      <div className="border-t border-pp-ink/[0.04] px-4 py-4 sm:px-6">
        <button
          type="button"
          disabled={busy || !policyId}
          onClick={() => void payPayroll()}
          className="flex min-h-12 w-full items-center justify-center rounded-full bg-pp-ink px-6 text-sm font-semibold text-pp-white transition hover:bg-pp-ink/90 enabled:active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Distributing…" : "Distribute"}
        </button>
        <p className="mt-2 text-center text-[11px] font-medium text-pp-ink/35">
          Policy shares paid out with proof on Celo.
        </p>
      </div>
    </div>
  );
}
