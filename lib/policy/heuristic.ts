import { BPS_TOTAL } from "./validate";
import type { LlmPolicyDraft } from "./llm";

const ADDR =
  /(0x[a-fA-F0-9]{40}|[a-zA-Z0-9][a-zA-Z0-9.-]*\.(?:base\.)?eth)\b/g;
const PCT = /(\d+(?:\.\d+)?)\s*%/g;

/**
 * Deterministic parser for common split phrases — no LLM required.
 * Handles: "30% and 70% respectively for 0xA and 0xB",
 * "60% to alice.eth and 40% to 0x…", "Split 20% Finance 0x…, 80% Ops 0x…"
 */
export function tryParsePolicyTextHeuristic(
  text: string,
): LlmPolicyDraft | null {
  const raw = text.trim();
  if (!raw || raw.length > 4000) return null;

  const percents: number[] = [];
  for (const m of raw.matchAll(PCT)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
    percents.push(n);
  }

  const identities: string[] = [];
  for (const m of raw.matchAll(ADDR)) {
    const id = m[1]!;
    if (!identities.some((x) => x.toLowerCase() === id.toLowerCase())) {
      identities.push(id);
    }
  }

  if (percents.length < 1 || identities.length < 1) return null;
  if (percents.length !== identities.length) return null;

  const recipients = percents.map((pct, i) => {
    const id = identities[i]!;
    const bps = Math.round(pct * 100);
    const label = id.startsWith("0x")
      ? `r${i + 1}`
      : id.split(".")[0]!.slice(0, 24);
    return { address: id, label, bps };
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
