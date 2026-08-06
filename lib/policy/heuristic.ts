import { BPS_TOTAL } from "./validate";
import type { LlmPolicyDraft } from "./llm";
import { meaningfulRecipientLabel } from "./labels";

const ADDR =
  /(0x[a-fA-F0-9]{40}|[a-zA-Z0-9][a-zA-Z0-9.-]*\.(?:base\.)?eth)\b/gi;
const PCT = /(\d+(?:\.\d+)?)\s*%/gi;

/** Words that are connectors, not purpose labels. */
const STOP = new Set([
  "to",
  "for",
  "and",
  "or",
  "the",
  "a",
  "an",
  "of",
  "with",
  "respectively",
  "split",
  "share",
  "shares",
  "send",
  "pay",
  "paid",
  "each",
  "into",
  "onto",
  "via",
  "wallet",
  "wallets",
  "address",
  "addresses",
  "recipient",
  "recipients",
]);

function extractPurposeNear(
  text: string,
  pctIndex: number,
  addrIndex: number,
): string | undefined {
  // Prefer text between this percent and its address.
  const between = text.slice(pctIndex, addrIndex).trim();
  // Drop the leading "NN%" and connectors like "to" / "for".
  const cleaned = between
    .replace(/^\d+(?:\.\d+)?\s*%\s*/i, "")
    .replace(/^(?:to|for|at|=|:|-)\s+/i, "")
    .trim();

  // "Finance 0x…" / "ops:" / "growth -"
  const roleMatch = cleaned.match(
    /^([A-Za-z][A-Za-z0-9][\w-]{0,22})(?:\s|$|,|:|-)/,
  );
  if (roleMatch) {
    const role = roleMatch[1]!;
    if (!STOP.has(role.toLowerCase()) && !/^(0x|[a-z0-9-]+\.eth)/i.test(role)) {
      return role.slice(0, 24);
    }
  }

  // "to Finance" style after connector-only between
  const afterTo = cleaned.match(
    /^(?:to|for)\s+([A-Za-z][A-Za-z0-9][\w-]{0,22})\b/i,
  );
  if (afterTo) {
    const role = afterTo[1]!;
    if (!STOP.has(role.toLowerCase())) return role.slice(0, 24);
  }

  return undefined;
}

/**
 * Deterministic parser for common split phrases — no LLM required.
 * Handles: "30% and 70% respectively for 0xA and 0xB",
 * "60% to alice.eth and 40% to 0x…", "Split 20% Finance 0x…, 80% Ops 0x…"
 *
 * Labels are only set when the user provides a purpose/role (Finance, ops, …).
 * Bare hex addresses get no invented r1/r2 placeholders.
 */
export function tryParsePolicyTextHeuristic(
  text: string,
): LlmPolicyDraft | null {
  const raw = text.trim();
  if (!raw || raw.length > 4000) return null;

  const percentHits: Array<{ pct: number; index: number }> = [];
  for (const m of raw.matchAll(PCT)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
    percentHits.push({ pct: n, index: m.index ?? 0 });
  }

  const identityHits: Array<{ id: string; index: number }> = [];
  for (const m of raw.matchAll(ADDR)) {
    const id = m[1]!;
    if (!identityHits.some((x) => x.id.toLowerCase() === id.toLowerCase())) {
      identityHits.push({ id, index: m.index ?? 0 });
    }
  }

  if (percentHits.length < 1 || identityHits.length < 1) return null;
  if (percentHits.length !== identityHits.length) return null;

  const recipients = percentHits.map((p, i) => {
    const hit = identityHits[i]!;
    const bps = Math.round(p.pct * 100);
    const purpose = extractPurposeNear(raw, p.index, hit.index);
    const ensLabel =
      !purpose && !hit.id.startsWith("0x")
        ? hit.id.split(".")[0]!.slice(0, 24)
        : undefined;
    const label = meaningfulRecipientLabel(purpose ?? ensLabel);
    return {
      address: hit.id,
      bps,
      ...(label ? { label } : {}),
    };
  });

  const sum = recipients.reduce((a, r) => a + r.bps, 0);
  if (sum <= 0) return null;
  // Allow slight float rounding; renormalize later if not exact.
  if (Math.abs(sum - BPS_TOTAL) > 2 && sum > BPS_TOTAL * 1.05) return null;

  return {
    name: "Split policy",
    recipients,
  };
}
