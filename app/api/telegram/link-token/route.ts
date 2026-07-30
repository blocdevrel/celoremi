import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { isTelegramEnabled } from "@/lib/telegram/client";
import { createTelegramLinkToken } from "@/lib/telegram/notify";

const bodySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
});

/**
 * POST /api/telegram/link-token — mint a signed 3-minute deep-link code
 * (stateless signed code). MiniPay users: wallet auto-connects first,
 * then tap Connect Telegram.
 */
export async function POST(req: Request) {
  try {
    if (!isTelegramEnabled()) {
      return jsonOk(
        { error: "Telegram updates are not configured on this Remifi deploy" },
        503,
      );
    }
    const body = bodySchema.parse(await req.json());
    const result = await createTelegramLinkToken(body.walletAddress);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err);
  }
}
