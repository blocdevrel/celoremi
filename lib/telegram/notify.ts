import { createHash } from "node:crypto";
import { CELOSCAN_TX } from "../config";
import { withDb } from "../db";
import { normalizeOwnerAddress } from "../wallet/owner";
import {
  buildTelegramStartUrl,
  isTelegramEnabled,
  sendTelegramMessage,
} from "./client";
import { linkCodeExpiresAt, makeLinkCode, verifyLinkCode } from "./linkCode";

function formatUsdcHuman(baseUnits: string): string {
  const n = Number(baseUnits) / 1e6;
  if (!Number.isFinite(n)) return baseUnits;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

function truncate(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shortWallet(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function proofTag(parts: Record<string, string | null | undefined>): string {
  const material = Object.entries(parts)
    .map(([k, v]) => `${k}=${v ?? ""}`)
    .join("|");
  return `0x${createHash("sha256").update(material).digest("hex").slice(0, 16)}`;
}

export async function createTelegramLinkToken(walletAddress: string): Promise<{
  token: string;
  url: string;
  deepLink: string;
  expiresAt: string;
}> {
  if (!isTelegramEnabled()) {
    throw new Error("Telegram updates are not configured");
  }
  const wallet = normalizeOwnerAddress(walletAddress);
  const token = makeLinkCode(wallet);
  const url = buildTelegramStartUrl(token);
  return {
    token,
    url,
    deepLink: url,
    expiresAt: linkCodeExpiresAt().toISOString(),
  };
}

export async function getTelegramLinkStatus(walletAddress: string): Promise<{
  linked: boolean;
  username: string | null;
  enabled: boolean;
}> {
  const enabled = isTelegramEnabled();
  if (!enabled) {
    return { linked: false, username: null, enabled: false };
  }
  const wallet = normalizeOwnerAddress(walletAddress).toLowerCase();
  const link = await withDb((db) =>
    db.telegramLink.findUnique({ where: { walletAddress: wallet } }),
  );
  return {
    linked: Boolean(link),
    username: link?.telegramUsername ?? null,
    enabled: true,
  };
}

export async function unlinkTelegram(walletAddress: string): Promise<void> {
  const wallet = normalizeOwnerAddress(walletAddress).toLowerCase();
  await withDb((db) =>
    db.telegramLink.deleteMany({ where: { walletAddress: wallet } }),
  );
}

export async function unlinkTelegramByChatId(chatId: string): Promise<boolean> {
  const result = await withDb((db) =>
    db.telegramLink.deleteMany({ where: { chatId: String(chatId) } }),
  );
  return result.count > 0;
}

/**
 * Bind chat ↔ wallet from a verified link code.
 * Rebind guard: if this wallet is already linked to a different chat, refuse
 * (send /stop from the old chat first).
 */
export async function bindTelegramFromLinkCode(params: {
  token: string;
  chatId: string;
  telegramUserId?: string;
  telegramUsername?: string;
}): Promise<{ walletAddress: string } | { error: string }> {
  const token = params.token.trim();
  if (!token) {
    return {
      error:
        "Missing link code. Open Remifi (MiniPay or wallet) and tap Connect Telegram again.",
    };
  }

  const wallet = verifyLinkCode(token);
  if (!wallet) {
    return {
      error:
        "That link has expired. Open Remifi and tap Connect Telegram again.",
    };
  }

  const chatId = String(params.chatId);
  const walletKey = wallet.toLowerCase();

  const existing = await withDb((db) =>
    db.telegramLink.findUnique({ where: { walletAddress: walletKey } }),
  );
  if (existing && existing.chatId !== chatId) {
    return {
      error:
        "This Remifi wallet already gets receipts on another Telegram. Send /stop from that chat first, then reconnect here.",
    };
  }

  await withDb(async (db) => {
    await db.$transaction([
      db.telegramLink.deleteMany({
        where: {
          OR: [{ walletAddress: walletKey }, { chatId }],
        },
      }),
      db.telegramLink.create({
        data: {
          walletAddress: walletKey,
          chatId,
          telegramUserId: params.telegramUserId
            ? String(params.telegramUserId)
            : null,
          telegramUsername: params.telegramUsername?.replace(/^@/, "") ?? null,
        },
      }),
    ]);
  });

  return { walletAddress: walletKey };
}

/** @deprecated use bindTelegramFromLinkCode */
export const consumeTelegramLinkToken = bindTelegramFromLinkCode;

export type ReceiptKind = "payroll" | "instant" | "auto";

export type ReceiptPayload = {
  kind: ReceiptKind;
  status: "confirmed" | "failed";
  amount: string;
  recipientCount?: number;
  txHash?: string | null;
  error?: string;
  walletAddress?: string | null;
};

/** Statuses worth interrupting the user for. */
export function receiptWorthy(status: ReceiptPayload["status"]): boolean {
  return status === "confirmed" || status === "failed";
}

export function formatReceiptHtml(params: {
  kind: ReceiptKind;
  status: "confirmed" | "failed";
  amount: string;
  recipientCount?: number;
  txHash?: string | null;
  error?: string;
}): string {
  const dollars = esc(formatUsdcHuman(params.amount));
  const n = params.recipientCount ?? 0;
  const lines: string[] = [];

  if (params.status === "failed") {
    const label =
      params.kind === "instant"
        ? "Send"
        : params.kind === "auto"
          ? "Auto payroll"
          : "Payroll";
    lines.push(`⛔ <b>${esc(label)} failed</b>`);
    if (params.error) lines.push(esc(truncate(params.error)));
  } else if (params.kind === "instant") {
    lines.push(`✅ <b>Send delivered</b> · $${dollars} USDC`);
  } else {
    const label = params.kind === "auto" ? "Auto payroll" : "Payroll";
    lines.push(
      `✅ <b>${esc(label)} sent</b> · $${dollars} USDC · ${n} recipient${n === 1 ? "" : "s"}`,
    );
  }

  if (params.txHash && /^0x[0-9a-fA-F]{64}$/.test(params.txHash)) {
    lines.push(
      `<a href="${CELOSCAN_TX(params.txHash)}">View on Celoscan</a>`,
    );
  }

  const proof = proofTag({
    kind: params.kind,
    status: params.status,
    amount: params.amount,
    tx: params.txHash ?? "",
  });
  lines.push(`proof <code>${proof}…</code>`);
  return lines.join("\n");
}

export function settlementSuccessMessage(params: {
  kind: ReceiptKind;
  amount: string;
  recipientCount?: number;
  txHash?: string | null;
}): string {
  return formatReceiptHtml({ ...params, status: "confirmed" });
}

export function settlementFailMessage(params: {
  kind: ReceiptKind;
  error: string;
  amount?: string;
}): string {
  return formatReceiptHtml({
    kind: params.kind,
    status: "failed",
    amount: params.amount ?? "0",
    error: params.error,
  });
}

export function firstTransferTxHash(
  transfers: Array<{ txHash?: string | null }> | null | undefined,
): string | null {
  const hash = transfers?.find((t) => t.txHash)?.txHash;
  return hash ?? null;
}

export async function notifyWallet(
  walletAddress: string | null | undefined,
  text: string,
  opts?: { parseMode?: "HTML" | "Markdown" },
): Promise<void> {
  if (!walletAddress || !isTelegramEnabled()) return;
  try {
    const wallet = normalizeOwnerAddress(walletAddress).toLowerCase();
    const link = await withDb((db) =>
      db.telegramLink.findUnique({ where: { walletAddress: wallet } }),
    );
    if (!link) return;
    await sendTelegramMessage(link.chatId, text, {
      parseMode: opts?.parseMode ?? "HTML",
      disableWebPagePreview: true,
    });
  } catch (err) {
    console.warn(
      "[remifi] telegram notify failed",
      err instanceof Error ? err.message : err,
    );
  }
}

const pendingReceipts: Promise<void>[] = [];

/** Fire-and-forget so settlement paths never block on Telegram. */
export function notifyWalletAsync(
  walletAddress: string | null | undefined,
  text: string,
): void {
  pendingReceipts.push(notifyWallet(walletAddress, text, { parseMode: "HTML" }));
}

/** Drain in-flight receipts before heartbeat / serverless exit. */
export async function flushReceipts(): Promise<void> {
  const inflight = pendingReceipts.splice(0);
  if (inflight.length > 0) await Promise.allSettled(inflight);
}

export function linkedWelcomeMessage(walletAddress: string): string {
  return (
    `Linked to your Remifi account <code>${esc(shortWallet(walletAddress))}</code>.\n\n` +
    `The bot only delivers receipts — when this wallet’s payroll or sends settle, you’ll get Celoscan + proof here.\n` +
    `In MiniPay that account auto-connects and gas is free on Celo.\n\n` +
    `Commands:\n/stop — unlink this account\n/status — show linked wallet`
  );
}
