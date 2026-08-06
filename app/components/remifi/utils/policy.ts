import type { SavedPolicy } from "../types";
import { shortAddr, truncateLabel } from "./address";
import {
  isGenericRecipientLabel,
  meaningfulRecipientLabel,
} from "@/lib/policy/labels";

export { isGenericRecipientLabel, meaningfulRecipientLabel };

export function normalizePolicy(raw: unknown): SavedPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const policyId = String(row.policyId ?? row.id ?? "").trim();
  if (!policyId) return null;
  const rawRecipients = row.recipients;
  const recipients = Array.isArray(rawRecipients)
    ? (rawRecipients
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const r = entry as Record<string, unknown>;
          const address = String(r.address ?? "").trim();
          const bps = Number(r.bps);
          if (!address || !Number.isFinite(bps) || bps <= 0) return null;
          const label = meaningfulRecipientLabel(
            typeof r.label === "string" ? r.label : undefined,
          );
          return {
            address,
            bps,
            ...(label ? { label } : {}),
          };
        })
        .filter(Boolean) as SavedPolicy["recipients"])
    : [];
  return {
    policyId,
    name: typeof row.name === "string" ? row.name : null,
    recipients,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : typeof row.createdAt === "string"
          ? row.createdAt
          : undefined,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : typeof row.updatedAt === "string"
          ? row.updatedAt
          : undefined,
  };
}

export function sortPoliciesNewestFirst(policies: SavedPolicy[]) {
  return [...policies].sort((a, b) => {
    const aTs = a.updatedAt ?? a.createdAt ?? "";
    const bTs = b.updatedAt ?? b.createdAt ?? "";
    return bTs.localeCompare(aTs);
  });
}

/** "Finance 30%, 0x12ab…89cd 70%" — purpose when present, else address + %. */
export function summarizePolicyRecipients(
  recipients: Array<{ address: string; bps: number; label?: string }>,
  short = shortAddr,
) {
  return recipients
    .map((r) => {
      const pct =
        r.bps % 100 === 0 ? String(r.bps / 100) : (r.bps / 100).toFixed(1);
      const purpose = meaningfulRecipientLabel(r.label);
      const who = purpose ? truncateLabel(purpose, 16) : short(r.address);
      return `${who} ${pct}%`;
    })
    .join(", ");
}

export function policyMatchesSearch(policy: SavedPolicy, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    policy.name ?? "",
    policy.policyId,
    summarizePolicyRecipients(policy.recipients, (a) => a ?? ""),
    ...policy.recipients.flatMap((r) => [r.address, r.label ?? ""]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
