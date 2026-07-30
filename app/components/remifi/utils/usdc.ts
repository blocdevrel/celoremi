export function usdcToBaseUnits(amount: string): string | null {
  const t = amount.trim();
  if (!t || !/^\d+(\.\d{1,6})?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  const frac = (f + "000000").slice(0, 6);
  const raw = `${w}${frac}`.replace(/^0+(?=\d)/, "");
  return raw || "0";
}

/** Human USDC decimals from the balance API (e.g. "56" or "56.01") → base units. */
export function parseUsdcHuman(raw: string | null | undefined): bigint {
  if (!raw?.trim()) return 0n;
  const asBase = usdcToBaseUnits(raw.trim());
  return asBase ? BigInt(asBase) : 0n;
}

/** Integer USDC base units (hire price, agent balance, transfer amounts). */
export function parseUsdcBaseUnits(raw: string | null | undefined): bigint {
  if (!raw?.trim()) return 0n;
  const t = raw.trim();
  if (!/^\d+$/.test(t)) {
    const asBase = usdcToBaseUnits(t);
    return asBase ? BigInt(asBase) : 0n;
  }
  return BigInt(t);
}

export function formatUsdc(base?: string | null) {
  if (!base) return "0.00";
  const n = Number(base) / 1e6;
  if (!Number.isFinite(n)) return base;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}
