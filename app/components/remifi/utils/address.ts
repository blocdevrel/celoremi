export function shortAddr(a: string | null | undefined) {
  if (!a) return "—";
  const value = a.trim();
  if (!value) return "—";
  // ENS / Base-style names: keep readable, truncate only if long
  if (/\./.test(value) && !value.startsWith("0x")) {
    return truncateLabel(value, 18);
  }
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function truncateLabel(value: string | null | undefined, max = 18) {
  const text = (value ?? "").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}
