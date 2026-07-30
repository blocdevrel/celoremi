"use client";

import { shortAddr, truncateLabel } from "../utils/address";

export type SplitShare = {
  pct: string;
  role: string;
  detail?: string;
  amount?: string;
};

export type SplitSharePreviewProps = {
  shares: SplitShare[];
  emptyHint?: string;
};

/** Skip placeholder labels like recipient1 / Recipient 2. */
function isGenericRecipientLabel(label: string | null | undefined): boolean {
  const t = (label ?? "").trim();
  if (!t) return true;
  return /^recipients?\s*[-_]?\s*\d+$/i.test(t);
}

function looksLikeName(value: string): boolean {
  return /\.(eth|base\.eth|celo)$/i.test(value.trim());
}

/** Prefer real role/ENS; otherwise short 0x… address. */
export function displayRecipientRole(
  label: string | null | undefined,
  address: string | null | undefined,
): { role: string; detail?: string } {
  const addr = (address ?? "").trim();
  const lab = (label ?? "").trim();

  if (lab && !isGenericRecipientLabel(lab)) {
    return {
      role: truncateLabel(lab, 16),
      detail: addr ? shortAddr(addr) : undefined,
    };
  }

  if (addr && looksLikeName(addr)) {
    return { role: truncateLabel(addr, 18) };
  }

  if (addr) {
    return { role: shortAddr(addr) };
  }

  return { role: "Recipient" };
}

export function SplitSharePreview({
  shares,
  emptyHint = "Add recipients to preview the split",
}: SplitSharePreviewProps) {
  if (shares.length === 0) {
    return (
      <p className="rounded-xl bg-pp-soft px-4 py-3 text-sm font-medium text-pp-ink/45">
        {emptyHint}
      </p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-3">
      {shares.map((row, i) => (
        <li
          key={`${row.role}-${row.pct}-${i}`}
          className="flex items-baseline justify-between gap-3 rounded-xl bg-pp-soft px-4 py-3 sm:flex-col sm:items-start sm:gap-1"
        >
          <span className="text-xl font-bold tabular-nums tracking-tight text-pp-ink">
            {row.pct}
          </span>
          <div className="min-w-0 text-right sm:text-left">
            <span
              className="block truncate text-sm font-semibold text-pp-ink/55"
              title={row.detail ? `${row.role} · ${row.detail}` : row.role}
            >
              {row.role}
            </span>
            {row.amount ? (
              <span className="mt-0.5 block text-xs font-semibold tabular-nums text-pp-ink/70">
                ${row.amount}
              </span>
            ) : row.detail ? (
              <span className="mt-0.5 block truncate text-[11px] font-medium text-pp-ink/35">
                {row.detail}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function sharesFromPercentRows(
  rows: Array<{ address: string; bps: string; label: string }>,
): SplitShare[] {
  return rows
    .filter((r) => r.address.trim() || r.label.trim() || r.bps.trim())
    .map((r) => {
      const pctNum = Number(r.bps);
      const pct = Number.isFinite(pctNum)
        ? `${pctNum % 1 === 0 ? pctNum : pctNum.toFixed(1)}%`
        : "—";
      const { role, detail } = displayRecipientRole(r.label, r.address);
      return { pct, role, detail };
    });
}

export function sharesFromPolicyRecipients(
  recipients: Array<{ address: string; bps: number; label?: string }>,
  amounts?: Array<{ address: string; amount: string; label?: string }>,
): SplitShare[] {
  return recipients.map((r, i) => {
    const pct =
      r.bps % 100 === 0 ? `${r.bps / 100}%` : `${(r.bps / 100).toFixed(1)}%`;
    const { role, detail } = displayRecipientRole(r.label, r.address);
    const amount = amounts?.[i]?.amount;
    return {
      pct,
      role,
      detail,
      ...(amount ? { amount } : {}),
    };
  });
}
