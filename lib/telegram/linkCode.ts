/**
 * Stateless Telegram deep-link codes.
 * Payload fits Telegram's 64-char /start limit:
 *   40 (wallet XOR) + 8 (expiry unix hex) + 16 (HMAC truncate) = 64
 * Signs with TELEGRAM_WEBHOOK_SECRET (preferred) or TELEGRAM_BOT_TOKEN.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config";
import { normalizeOwnerAddress } from "../wallet/owner";

const CODE_TTL_SECONDS = 3 * 60;
const SIG_HEX_CHARS = 16;

function linkSecret(): string {
  const secret = env.TELEGRAM_WEBHOOK_SECRET || env.TELEGRAM_BOT_TOKEN;
  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET or TELEGRAM_BOT_TOKEN required for link codes");
  }
  return secret;
}

function sign(obfHex: string, expHex: string): string {
  return createHmac("sha256", linkSecret())
    .update(`tglink|${obfHex}|${expHex}`)
    .digest("hex")
    .slice(0, SIG_HEX_CHARS);
}

function keystream(expHex: string): Buffer {
  return createHmac("sha256", linkSecret())
    .update(`tgkdf|${expHex}`)
    .digest()
    .subarray(0, 20);
}

function xor(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i]! ^ b[i]!;
  return out;
}

export function makeLinkCode(walletAddress: string, nowMs = Date.now()): string {
  const wallet = normalizeOwnerAddress(walletAddress).toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(wallet)) {
    throw new Error("walletAddress must be a 20-byte hex address");
  }
  const exp = Math.floor(nowMs / 1000) + CODE_TTL_SECONDS;
  const expHex = exp.toString(16).padStart(8, "0");
  const obfHex = xor(Buffer.from(wallet, "hex"), keystream(expHex)).toString("hex");
  return `${obfHex}${expHex}${sign(obfHex, expHex)}`;
}

/** Returns checksummed lowercase 0x wallet or null if invalid/expired/tampered. */
export function verifyLinkCode(code: string, nowMs = Date.now()): string | null {
  if (!/^[0-9a-f]{64}$/i.test(code)) return null;
  const normalized = code.toLowerCase();
  const obfHex = normalized.slice(0, 40);
  const expHex = normalized.slice(40, 48);
  const sig = normalized.slice(48);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(sign(obfHex, expHex), "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (parseInt(expHex, 16) * 1000 < nowMs) return null;
  const walletHex = xor(Buffer.from(obfHex, "hex"), keystream(expHex)).toString("hex");
  if (!/^[0-9a-f]{40}$/.test(walletHex)) return null;
  return `0x${walletHex}`;
}

export function linkCodeExpiresAt(nowMs = Date.now()): Date {
  return new Date(nowMs + CODE_TTL_SECONDS * 1000);
}
