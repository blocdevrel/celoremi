import type { JobResult, ProofFilter } from "../types";
import { shortAddr, truncateLabel } from "./address";

export function formatJobWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function jobHeading(job: JobResult) {
  if (job.kind === "instant") {
    const to = job.to || job.transfers?.[0]?.to;
    return to ? shortAddr(to) : "USDC transfer";
  }
  return truncateLabel(job.policyName?.trim() || "Payroll split", 22);
}

export function jobKindLabel(job: JobResult) {
  return job.kind === "instant" ? "Send" : "Split";
}

export function matchesProofFilter(job: JobResult, filter: ProofFilter) {
  switch (filter) {
    case "sends": return job.kind === "instant";
    case "splits": return job.kind !== "instant";
    case "x402": return job.hireMode === "x402" || Boolean(job.x402SettlementTxHash);
    default: return true;
  }
}

export function jobExplorerUrl(job: JobResult): string | null {
  return job.explorer ||
    (job.txHash ? `https://celoscan.io/tx/${job.txHash}` : null) ||
    job.x402Explorer ||
    (job.x402SettlementTxHash
      ? `https://celoscan.io/tx/${job.x402SettlementTxHash}`
      : null) ||
    job.transfers?.[0]?.explorer ||
    (job.transfers?.[0]?.txHash
      ? `https://celoscan.io/tx/${job.transfers[0].txHash}`
      : null) ||
    null;
}
