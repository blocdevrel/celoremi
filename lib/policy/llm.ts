import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env, getPublicAppUrl } from "../config";
import { BPS_TOTAL } from "./validate";

const llmPolicySchema = z.object({
  name: z.string().describe("Short human-readable policy name"),
  recipients: z
    .array(
      z.object({
        address: z
          .string()
          .describe(
            "Recipient 0x address, ENS name (vitalik.eth), or Base name (alice.base.eth)",
          ),
        label: z.string().describe("Role label: ops, growth, treasury, etc."),
        bps: z
          .number()
          .int()
          .positive()
          .describe(
            `Basis points. 100% = ${BPS_TOTAL}. 30% = 3000. Prefer shares that sum to ${BPS_TOTAL}.`,
          ),
      }),
    )
    .min(1)
    .max(20),
});

export type LlmPolicyDraft = z.infer<typeof llmPolicySchema>;

export function hasLlmKeys(): boolean {
  return Boolean(env.OPENROUTER_API_KEY || env.ANTHROPIC_API_KEY);
}

export function llmRequiredError(service: string): string {
  return `${service} needs natural-language interpretation — set OPENROUTER_API_KEY (or ANTHROPIC_API_KEY)`;
}

const policySystemPrompt = `You convert payment split instructions into structured USDC split policies for Remifi (Remifi on Celo).

Rules:
- Express each recipient share as basis points (bps). 100% = ${BPS_TOTAL} bps. 30% = 3000 bps.
- Prefer shares that sum exactly to ${BPS_TOTAL}. If the user gives ratios (e.g. "3:2"), convert to proportional bps of ${BPS_TOTAL}.
- If the user gives partial percents (e.g. 30% and 60%), keep those bps and leave the remainder unallocated — do not invent a third recipient.
- Keep addresses/names exactly as given (0x hex, ENS like vitalik.eth, or Base names like alice.base.eth).
- Use concise labels (ops, growth, treasury, alice, etc.).
- Input may be plain English or messy JSON — interpret intent and fill missing labels.
- Settlement is on Celo USDC; ENS/Base names are identity only.
- Respond with ONLY valid JSON matching the schema. No markdown.`;

function parsePolicyJson(text: string, provider: string): LlmPolicyDraft {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`${provider} returned no policy JSON`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]!);
  } catch {
    throw new Error(`${provider} returned invalid policy JSON`);
  }
  return llmPolicySchema.parse(parsed);
}

async function interpretViaOpenRouter(
  requirements: string,
): Promise<LlmPolicyDraft> {
  const key = env.OPENROUTER_API_KEY!;
  const model = env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5";
  const site = env.OPENROUTER_SITE_URL || getPublicAppUrl();
  const title = env.OPENROUTER_APP_NAME || "Remifi";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": site,
      "X-Title": title,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      // Keep low: OpenRouter free/low balance rejects when max_tokens > affordability.
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: policySystemPrompt },
        {
          role: "user",
          content: `Convert this into a split policy JSON object with keys name and recipients[{address,label,bps}]:\n\n${requirements}`,
        },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw.slice(0, 400);
    try {
      const j = JSON.parse(raw) as {
        error?: { message?: string } | string;
        message?: string;
      };
      if (typeof j.error === "string") detail = j.error;
      else if (j.error?.message) detail = j.error.message;
      else if (j.message) detail = j.message;
    } catch {
      /* keep slice */
    }
    throw new Error(`OpenRouter ${res.status}: ${detail}`);
  }

  let data: { choices?: Array<{ message?: { content?: string | null } }> };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }

  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return parsePolicyJson(text, "OpenRouter");
}

async function interpretViaAnthropic(
  requirements: string,
): Promise<LlmPolicyDraft> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! });
  const model = env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0,
    system: policySystemPrompt,
    messages: [
      {
        role: "user",
        content: `Convert this into a split policy JSON object with keys name and recipients[{address,label,bps}]:\n\n${requirements}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return parsePolicyJson(text, "Anthropic");
}

function isProviderCreditOrQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /openrouter\s*402|requires more credits|fewer max_tokens|credit balance is too low|purchase credits|can only afford|billing|insufficient.?credit|rate.?limit|overloaded/i.test(
    msg,
  );
}

/**
 * Plain-English (or messy JSON) → split policy draft.
 * Prefers OpenRouter; falls back to Anthropic if OpenRouter is missing or out of credits.
 */
export async function interpretPolicyText(
  requirements: string,
): Promise<LlmPolicyDraft> {
  if (env.OPENROUTER_API_KEY) {
    try {
      return await interpretViaOpenRouter(requirements);
    } catch (err) {
      if (env.ANTHROPIC_API_KEY && isProviderCreditOrQuotaError(err)) {
        return interpretViaAnthropic(requirements);
      }
      throw err;
    }
  }
  if (env.ANTHROPIC_API_KEY) {
    return interpretViaAnthropic(requirements);
  }
  throw new Error(llmRequiredError("createPolicy"));
}

/** Scale recipient bps so they sum to BPS_TOTAL (remainder on last). */
export function renormalizeBpsToTotal<
  T extends { bps: number },
>(recipients: T[]): T[] {
  const sum = recipients.reduce((a, r) => a + r.bps, 0);
  if (sum === BPS_TOTAL) return recipients;
  if (sum <= 0) {
    throw new Error("Recipient bps sum must be > 0");
  }

  let allocated = 0;
  return recipients.map((r, i) => {
    const isLast = i === recipients.length - 1;
    const bps = isLast
      ? BPS_TOTAL - allocated
      : Math.floor((r.bps * BPS_TOTAL) / sum);
    allocated += bps;
    return { ...r, bps };
  });
}
