import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { unlinkTelegram } from "@/lib/telegram/notify";

const bodySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
});

/** DELETE /api/telegram/link — disconnect Telegram from wallet. */
export async function DELETE(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    await unlinkTelegram(body.walletAddress);
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
