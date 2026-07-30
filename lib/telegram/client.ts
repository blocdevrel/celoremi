import { timingSafeEqual } from "node:crypto";
import { env } from "../config";

export function isTelegramEnabled(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);
}

export function telegramBotUsername(): string | null {
  if (!env.TELEGRAM_BOT_USERNAME) return null;
  return env.TELEGRAM_BOT_USERNAME.replace(/^@/, "");
}

type TelegramApiResult = {
  ok: boolean;
  description?: string;
  result?: unknown;
};

async function telegramApi(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResult> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN not set" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });

  const data = (await res.json()) as TelegramApiResult;
  if (!data.ok) {
    console.warn(
      "[remifi] telegram",
      method,
      data.description ?? res.statusText,
    );
  }
  return data;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts?: {
    disableWebPagePreview?: boolean;
    parseMode?: "HTML" | "Markdown";
  },
): Promise<boolean> {
  if (!isTelegramEnabled()) return false;
  const result = await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: opts?.disableWebPagePreview ?? true,
    ...(opts?.parseMode ? { parse_mode: opts.parseMode } : {}),
  });
  return Boolean(result.ok);
}

export function buildTelegramStartUrl(token: string): string {
  const username = telegramBotUsername();
  if (!username) {
    throw new Error("TELEGRAM_BOT_USERNAME is not configured");
  }
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}

/** Constant-time compare of Telegram webhook secret header. */
export function assertWebhookSecret(headerValue: string | null): boolean {
  const configured = env.TELEGRAM_WEBHOOK_SECRET;
  if (!configured) {
    return env.NODE_ENV !== "production";
  }
  const provided = Buffer.from(headerValue ?? "", "utf8");
  const expected = Buffer.from(configured, "utf8");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
