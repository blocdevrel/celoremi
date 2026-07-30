"use client";

import type { SavedPolicy } from "../types";
import { summarizePolicyRecipients } from "../utils/policy";

export type PoliciesPreviewProps = {
  walletAddress: string | null;
  walletIsAgent: boolean;
  policies: SavedPolicy[];
  onNewPolicy: () => void;
  onSelectPolicy: (policy: SavedPolicy) => void;
};

export function PoliciesPreview({
  walletAddress,
  walletIsAgent,
  policies: savedPolicies,
  onNewPolicy,
  onSelectPolicy,
}: PoliciesPreviewProps) {
  return (
    <>
          {walletAddress && !walletIsAgent && savedPolicies.length > 0 ? (
            <section className="overflow-hidden rounded-2xl bg-pp-white/80 ring-1 ring-pp-ink/[0.04] sm:rounded-[1.35rem] sm:bg-pp-white">
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-pp-ink sm:text-lg">
                    Policies
                  </h2>
                  <p className="mt-0.5 text-xs text-pp-ink/40 sm:text-sm">
                    Ready to pay
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNewPolicy}
                  className="text-xs font-semibold text-pp-ink/55 transition hover:text-pp-ink sm:text-sm"
                >
                  New policy
                </button>
              </div>
              <ul>
                {savedPolicies.slice(0, 4).map((policy) => (
                  <li key={policy.policyId}>
                    <button
                      type="button"
                      onClick={() => onSelectPolicy(policy)}
                      className="flex w-full items-center justify-between gap-3 border-t border-pp-ink/[0.04] px-4 py-3.5 text-left transition hover:bg-pp-mint-soft/60 sm:px-6"
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-semibold tracking-tight text-pp-ink">
                          {policy.name?.trim() || "Untitled policy"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-pp-ink/40">
                          {summarizePolicyRecipients(policy.recipients)}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-pp-ink/35">
                        Pay
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
    </>
  );
}
