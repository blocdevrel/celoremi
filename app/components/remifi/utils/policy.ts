import type { SavedPolicy } from "../types";
import { shortAddr, truncateLabel } from "./address";

function isGenericRecipientLabel(label: string | null | undefined): boolean {
  const t = (label ?? "").trim();
  if (!t) return true;
  return /^recipients?\s*[-_]?\s*\d+$/i.test(t);
}

export function normalizePolicy(raw: unknown): SavedPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const policyId = String(row.policyId ?? row.id ?? "").trim();
  if (!policyId) return null;
  const rawRecipients = row.recipients;
  const recipients = Array.isArray(rawRecipients)
    ? rawRecipients.map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const r = entry as Record<string, unknown>;
        const address = String(r.address ?? "").trim();
        const bps = Number(r.bps);
        if (!address || !Number.isFinite(bps) || bps <= 0) return null;
        return {
          address,
          bps,
          ...(typeof r.label === "string" && r.label.trim()
            ? { label: r.label.trim() }
            : {}),
        };
      }).filter(Boolean) as SavedPolicy["recipients"]
    : [];
  return {
    policyId,
    name: typeof row.name === "string" ? row.name : null,
    recipients,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : typeof row.createdAt === "string" ? row.createdAt : undefined,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : typeof row.updatedAt === "string" ? row.updatedAt : undefined,
  };
}

export function sortPoliciesNewestFirst(policies: SavedPolicy[]) {
  return [...policies].sort((a, b) => {
    const aTs = a.updatedAt ?? a.createdAt ?? "";
    const bTs = b.updatedAt ?? b.createdAt ?? "";
    return bTs.localeCompare(aTs);
  });
}

export function summarizePolicyRecipients(
  recipients: Array<{ address: string; bps: number; label?: string }>,
  short = shortAddr,
) {
  return recipients.map((r) => {
    const pct = r.bps % 100 === 0 ? String(r.bps / 100) : (r.bps / 100).toFixed(1);
    const lab = r.label?.trim();
    const who =
      lab && !isGenericRecipientLabel(lab)
        ? truncateLabel(lab, 16)
        : short(r.address);
    return `${who} ${pct}%`;
  }).join(", ");
}

export function policyMatchesSearch(policy: SavedPolicy, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    policy.name ?? "",
    policy.policyId,
    summarizePolicyRecipients(policy.recipients, (a) => a ?? ""),
    ...policy.recipients.flatMap((r) => [r.address, r.label ?? ""]),
  ].join(" ").toLowerCase();
  return haystack.includes(q);
}
