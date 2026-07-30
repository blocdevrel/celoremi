"use client";

import { useMemo } from "react";
import {
  DEFAULT_ENGLISH_POLICY,
  DEFAULT_POLICY_NAME,
} from "../constants";
import type { RemifiAppModel } from "../hooks/useRemifiApp";
import {
  sharesFromPercentRows,
  SplitSharePreview,
} from "../shared/SplitSharePreview";
import { RemifiSelect } from "../shared/RemifiSelect";

const fieldClass =
  "min-h-12 w-full rounded-xl border border-pp-ink/8 bg-pp-soft px-4 text-[0.92rem] font-medium text-pp-ink outline-none transition placeholder:text-pp-ink/35 placeholder:font-normal focus:border-pp-ink/20 focus:bg-pp-white";

const areaClass =
  "min-h-32 w-full resize-y rounded-xl border border-pp-ink/8 bg-pp-soft px-4 py-3 text-[0.92rem] font-medium leading-snug text-pp-ink outline-none transition placeholder:text-pp-ink/35 placeholder:font-normal focus:border-pp-ink/20 focus:bg-pp-white";

const smallFieldClass =
  "min-h-10 w-full rounded-lg border border-pp-ink/8 bg-pp-white px-3 text-sm outline-none placeholder:text-pp-ink/35 placeholder:font-normal focus:border-pp-ink/20";

export type CreatePolicyFormProps = Pick<
  RemifiAppModel,
  | "addManualRecipient"
  | "busy"
  | "englishText"
  | "manualRecipients"
  | "policyId"
  | "policyInputMode"
  | "policyName"
  | "removeManualRecipient"
  | "resetPolicyDraft"
  | "savePolicy"
  | "setEnglishText"
  | "setPolicyId"
  | "setPolicyInputMode"
  | "setPolicyName"
  | "updateManualRecipient"
>;

export function CreatePolicyForm({
  addManualRecipient,
  busy,
  englishText,
  manualRecipients,
  policyId,
  policyInputMode,
  policyName,
  removeManualRecipient,
  resetPolicyDraft,
  savePolicy,
  setEnglishText,
  setPolicyId,
  setPolicyInputMode,
  setPolicyName,
  updateManualRecipient,
}: CreatePolicyFormProps) {
  const previewShares = useMemo(
    () => sharesFromPercentRows(manualRecipients),
    [manualRecipients],
  );
  const totalPct = useMemo(
    () =>
      manualRecipients.reduce((sum, row) => {
        const n = Number(row.bps);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [manualRecipients],
  );
  const totalOk = Math.abs(totalPct - 100) < 0.001;

  return (
    <div className="grid gap-5 overflow-hidden rounded-2xl bg-pp-white/80 ring-1 ring-pp-ink/[0.04] sm:rounded-[1.35rem] sm:bg-pp-white">
      <div className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-pp-soft px-3 py-2.5">
          <div className="mr-auto min-w-0">
            <p className="text-xs font-semibold text-pp-ink">
              {policyInputMode === "english" ? "Plain English" : "Manual shares"}
            </p>
            <p className="text-[11px] font-medium text-pp-ink/40">
              {policyInputMode === "english"
                ? "Describe the split in a sentence"
                : "Set each recipient and share"}
            </p>
          </div>
          <RemifiSelect
            ariaLabel="Policy input mode"
            value={policyInputMode}
            onChange={(next) =>
              setPolicyInputMode(next === "manual" ? "manual" : "english")
            }
            options={[
              { value: "english", label: "Plain English" },
              { value: "manual", label: "Manual" },
            ]}
          />
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-pp-ink">Policy name</span>
          <input
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            placeholder={DEFAULT_POLICY_NAME}
            className={fieldClass}
          />
        </label>

        {policyInputMode === "english" ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-pp-ink">
              Who gets what
            </span>
            <textarea
              value={englishText}
              onChange={(e) => {
                setEnglishText(e.target.value);
                if (policyId) setPolicyId("");
              }}
              rows={5}
              placeholder={DEFAULT_ENGLISH_POLICY}
              className={areaClass}
            />
            <p className="text-xs font-medium leading-snug text-pp-ink/40">
              Describe shares with ENS, Base names, or 0x addresses. Example:
              20% Finance, 20% Management, 60% Operations.
            </p>
          </label>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-pp-ink">
                Recipients
              </span>
              <button
                type="button"
                onClick={addManualRecipient}
                className="rounded-full border border-pp-ink/10 bg-pp-white px-3 py-1 text-xs font-semibold text-pp-ink transition hover:bg-pp-soft"
              >
                + Add
              </button>
            </div>

            <ul className="grid gap-2">
              {manualRecipients.map((row, index) => (
                <li
                  key={`manual-${index}`}
                  className="grid gap-2 rounded-xl bg-pp-soft p-3 sm:grid-cols-[1fr_5.5rem_4.25rem_auto] sm:items-end sm:gap-2"
                >
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pp-ink/35">
                      Address / name
                    </span>
                    <input
                      value={row.address}
                      onChange={(e) =>
                        updateManualRecipient(index, "address", e.target.value)
                      }
                      placeholder={
                        index === 0
                          ? "finance.yourdao.eth"
                          : index === 1
                            ? "management.yourdao.eth"
                            : "ops.yourdao.eth"
                      }
                      className={`${smallFieldClass} font-mono text-xs`}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pp-ink/35">
                      Role
                    </span>
                    <input
                      value={row.label}
                      onChange={(e) =>
                        updateManualRecipient(index, "label", e.target.value)
                      }
                      placeholder="Finance"
                      className={smallFieldClass}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pp-ink/35">
                      %
                    </span>
                    <input
                      inputMode="decimal"
                      value={row.bps}
                      onChange={(e) =>
                        updateManualRecipient(index, "bps", e.target.value)
                      }
                      placeholder="20"
                      className={`${smallFieldClass} tabular-nums`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeManualRecipient(index)}
                    disabled={manualRecipients.length <= 1}
                    className="min-h-10 rounded-lg px-2 text-xs font-semibold text-pp-ink/40 enabled:hover:bg-pp-white enabled:hover:text-pp-ink disabled:opacity-35"
                    aria-label="Remove recipient"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 text-xs font-medium">
              <span className="text-pp-ink/40">Shares must total 100%</span>
              <span
                className={`tabular-nums font-semibold ${
                  totalOk ? "text-pp-teal" : "text-[#b42318]"
                }`}
              >
                {Number.isFinite(totalPct) ? totalPct.toFixed(totalPct % 1 ? 1 : 0) : "0"}%
              </span>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-pp-ink/35">
                Split preview
              </p>
              <SplitSharePreview shares={previewShares} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-pp-ink/[0.04] px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={resetPolicyDraft}
          className="min-h-11 rounded-full border border-pp-ink/10 px-5 text-sm font-semibold text-pp-ink/50 transition hover:text-pp-ink"
        >
          Reset
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void savePolicy()}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-pp-ink px-6 text-sm font-semibold text-pp-white transition hover:bg-pp-ink/90 enabled:active:scale-[0.98] disabled:opacity-60 sm:flex-none"
        >
          {busy ? "Saving…" : "Save policy"}
        </button>
      </div>
    </div>
  );
}
