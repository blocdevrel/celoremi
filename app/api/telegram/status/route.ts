import { jsonError, jsonOk } from "@/lib/http";
import { getTelegramLinkStatus } from "@/lib/telegram/notify";

/** GET /api/telegram/status?wallet=0x… */
export async function GET(req: Request) {
  try {
    const wallet = new URL(req.url).searchParams.get("wallet")?.trim();
    if (!wallet) {
      return jsonOk({ error: "wallet query param required" }, 400);
    }
    const status = await getTelegramLinkStatus(wallet);
    return jsonOk(status);
  } catch (err) {
    return jsonError(err);
  }
}
