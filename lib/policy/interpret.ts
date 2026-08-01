import { resolveRecipientAddresses } from "../ens/resolve";
import { tryParsePolicyTextHeuristic } from "./heuristic";
import {
  hasLlmKeys,
  interpretPolicyText,
  llmRequiredError,
  renormalizeBpsToTotal,
} from "./llm";
import { meaningfulRecipientLabel } from "./labels";
import { validateRecipients, type PolicyRecipient } from "./validate";

export type InterpretedPolicy = {
  name: string;
  recipients: PolicyRecipient[];
  source: "json" | "text";
  /** Original ENS / Base names before resolution, when present */
  resolvedFrom?: Array<{ input: string; address: `0x${string}`; ens?: string }>;
};

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unwrapNaturalLanguage(asJson: unknown): string | null {
  if (!asJson || typeof asJson !== "object" || Array.isArray(asJson)) {
    return null;
  }
  const o = asJson as Record<string, unknown>;
  for (const key of ["text", "prompt", "instructions", "description"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function isLlmCreditError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /openrouter\s*402|requires more credits|fewer max_tokens|credit balance is too low|purchase credits|can only afford|billing|insufficient.?credit|rate.?limit|overloaded/i.test(
    msg,
  );
}

async function fromDraft(
  name: string,
  recipients: Array<{ address: string; bps: number; label?: string }>,
  source: "json" | "text",
): Promise<InterpretedPolicy> {
  const scaled = renormalizeBpsToTotal(recipients);
  const resolved = await resolveRecipientAddresses(scaled);
  const validated = validateRecipients(
    resolved.map((r) => {
      const label = meaningfulRecipientLabel(r.label);
      return {
        address: r.address,
        bps: r.bps,
        ...(label ? { label } : {}),
      };
    }),
  );

  return {
    name,
    recipients: validated,
    source,
    resolvedFrom: resolved.map((r, i) => ({
      input: scaled[i]!.address,
      address: r.address,
      ...(r.ens ? { ens: r.ens } : {}),
    })),
  };
}

function resolvePolicyName(userName?: string, fallback?: string): string {
  const fromUser = userName?.trim();
  if (fromUser) return fromUser;
  const fromFallback = fallback?.trim();
  if (fromFallback) return fromFallback;
  return "Split policy";
}

/**
 * Remifi-style policy intake: heuristic / Anthropic English, or JSON recipients.
 * User-supplied `name` from the UI always wins over LLM/JSON suggestions.
 * ENS / Base names are resolved before validate.
 */
export async function interpretPolicyFromInput(input: {
  text?: string;
  name?: string;
  recipients?: Array<{ address: string; bps: number; label?: string }>;
}): Promise<InterpretedPolicy> {
  const text = input.text?.trim();

  if (text) {
    const asJson = tryParseJson(text);
    if (asJson && typeof asJson === "object" && !Array.isArray(asJson)) {
      const o = asJson as Record<string, unknown>;
      if (Array.isArray(o.recipients)) {
        return fromDraft(
          resolvePolicyName(
            input.name,
            typeof o.name === "string" ? o.name : undefined,
          ),
          o.recipients as Array<{
            address: string;
            bps: number;
            label?: string;
          }>,
          "json",
        );
      }
      const nested = unwrapNaturalLanguage(asJson);
      if (nested) {
        return interpretPolicyFromInput({ text: nested, name: input.name });
      }
    }

    // Prefer local parse for clear % + address phrases (works without Anthropic credits).
    const heuristic = tryParsePolicyTextHeuristic(text);
    if (heuristic) {
      return fromDraft(
        resolvePolicyName(input.name, heuristic.name),
        heuristic.recipients,
        "text",
      );
    }

    if (!hasLlmKeys()) {
      throw new Error(llmRequiredError("createPolicy"));
    }

    try {
      const draft = await interpretPolicyText(text);
      return fromDraft(
        resolvePolicyName(input.name, draft.name),
        draft.recipients,
        "text",
      );
    } catch (err) {
      if (isLlmCreditError(err)) {
        throw new Error(
          "AI policy parsing is unavailable. Use Manual shares, or write percents and 0x addresses like: 30% to 0x… and 70% to 0x…",
        );
      }
      throw err;
    }
  }

  if (input.recipients?.length) {
    return fromDraft(
      resolvePolicyName(input.name),
      input.recipients,
      "json",
    );
  }

  throw new Error(
    'Provide plain English in { "text": "..." } or JSON { "recipients": [...] }',
  );
}
