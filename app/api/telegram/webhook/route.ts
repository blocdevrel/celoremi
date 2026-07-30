import { env } from "@/lib/config";
import { jsonOk } from "@/lib/http";
import {
  assertWebhookSecret,
  isTelegramEnabled,
  sendTelegramMessage,
  telegramBotUsername,
} from "@/lib/telegram/client";
import {
  bindTelegramFromLinkCode,
  linkedWelcomeMessage,
  unlinkTelegramByChatId,
} from "@/lib/telegram/notify";
import { withDb } from "@/lib/db";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string; username?: string };
  };
};

function shortWallet(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** POST /api/telegram/webhook — /start links account, /stop unlinks. */
export async function POST(req: Request) {
  if (!assertWebhookSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return jsonOk({ ok: false, error: "Unauthorized" }, 401);
  }

  if (!isTelegramEnabled()) {
    return jsonOk({ ok: true, ignored: true });
  }

  let update: TelegramUpdate = {};
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return jsonOk({ ok: true });
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim() ?? "";
  if (chatId == null || !text) {
    return jsonOk({ ok: true });
  }

  const chat = String(chatId);
  const fromId = message?.from?.id != null ? String(message.from.id) : undefined;
  const username = message?.from?.username;

  try {
    if (text.startsWith("/start")) {
      const payload = text.replace(/^\/start(@\w+)?\s*/i, "").trim();
      if (!payload) {
        await sendTelegramMessage(
          chat,
          `Remifi receipts\n\nThis bot delivers receipts for <b>your</b> Remifi account — it doesn’t hold funds.\nOpen Remifi in MiniPay (auto-connect, gas-free) or connect a wallet, then tap <b>Link my account</b>.\n${env.NEXT_PUBLIC_APP_URL}`,
          { parseMode: "HTML" },
        );
        return jsonOk({ ok: true });
      }

      const result = await bindTelegramFromLinkCode({
        token: payload,
        chatId: chat,
        telegramUserId: fromId,
        telegramUsername: username,
      });

      if ("error" in result) {
        await sendTelegramMessage(chat, result.error);
        return jsonOk({ ok: true });
      }

      await sendTelegramMessage(chat, linkedWelcomeMessage(result.walletAddress), {
        parseMode: "HTML",
      });
      return jsonOk({ ok: true });
    }

    if (text.startsWith("/stop") || text.startsWith("/unlink")) {
      const removed = await unlinkTelegramByChatId(chat);
      await sendTelegramMessage(
        chat,
        removed
          ? "Unlinked. You will no longer receive Remifi receipts here."
          : "This chat wasn't linked to a Remifi wallet.",
      );
      return jsonOk({ ok: true });
    }

    if (text.startsWith("/status")) {
      const link = await withDb((db) =>
        db.telegramLink.findUnique({ where: { chatId: chat } }),
      );
      if (!link) {
        await sendTelegramMessage(
          chat,
          "Not linked. Open Remifi → Connect Telegram.",
        );
      } else {
        const bot = telegramBotUsername();
        await sendTelegramMessage(
          chat,
          `Linked to <code>${shortWallet(link.walletAddress)}</code>${
            link.telegramUsername ? ` · @${link.telegramUsername}` : ""
          }.\nBot: @${bot}\nApp: ${env.NEXT_PUBLIC_APP_URL}`,
          { parseMode: "HTML" },
        );
      }
      return jsonOk({ ok: true });
    }

    if (text.startsWith("/help")) {
      await sendTelegramMessage(
        chat,
        "Remifi Telegram receipts\n\n/start — finish linking from the app\n/status — show linked wallet\n/stop — unlink",
      );
      return jsonOk({ ok: true });
    }
  } catch (err) {
    console.warn(
      "[remifi] telegram webhook failed",
      err instanceof Error ? err.message : err,
    );
  }

  return jsonOk({ ok: true });
}

export async function GET() {
  return jsonOk({
    ok: true,
    service: "remifi-telegram-webhook",
    enabled: isTelegramEnabled(),
    bot: telegramBotUsername(),
  });
}
