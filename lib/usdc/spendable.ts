/** Binance-style Max / hire-fee reserve for wallet sends (MiniPay + external). */

/** MiniPay fee abstraction may debit a little USDC for the tagged send before x402 settle. */
export const MINIPAY_SEND_PAD_BASE = 10_000n; // 0.01 USDC

/** Hire fee (+ optional MiniPay pad) that must remain after the send. */
export function reserveBeforeSend(
  hirePriceBase: bigint,
  opts?: { miniPay?: boolean },
): bigint {
  const pad = opts?.miniPay ? MINIPAY_SEND_PAD_BASE : 0n;
  return hirePriceBase + pad;
}

/** Binance-style Max: balance minus reserved hire/pad. */
export function maxSpendableAfterReserve(
  balanceBase: bigint,
  reserveBase: bigint,
): bigint {
  return balanceBase > reserveBase ? balanceBase - reserveBase : 0n;
}

/**
 * Clamp a requested send amount so amount + reserve ≤ balance.
 * Returns the amount to send (base units), or 0n if nothing is spendable.
 */
export function clampSendAmountToReserve(
  requestedBase: bigint,
  balanceBase: bigint,
  reserveBase: bigint,
): bigint {
  if (requestedBase <= 0n || balanceBase <= 0n) return 0n;
  const spendable = maxSpendableAfterReserve(balanceBase, reserveBase);
  if (spendable <= 0n) return 0n;
  return requestedBase > spendable ? spendable : requestedBase;
}

/** Exact USDC amount for inputs — bigint only (no float rounding). */
export function formatBaseUnitsForInput(base: bigint): string {
  if (base <= 0n) return "";
  const whole = base / 1_000_000n;
  const frac = (base % 1_000_000n)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}.00`;
}
