/**
 * True when a recipient label is a placeholder (r1, recipient 2, …)
 * rather than a real purpose/role the user provided.
 */
export function isGenericRecipientLabel(
  label: string | null | undefined,
): boolean {
  const t = (label ?? "").trim();
  if (!t) return true;
  // r1, r_2, R-3
  if (/^r[-_]?\d{1,3}$/i.test(t)) return true;
  // recipient / recipients / recipient1 / Recipient 2 / recipient-3
  if (/^recipients?\s*[-_]?\s*\d*$/i.test(t)) return true;
  // share1, leg 2, wallet3
  if (/^(share|leg|wallet|addr|address|to)\s*[-_]?\s*\d+$/i.test(t)) {
    return true;
  }
  return false;
}

/** Keep only purpose/role labels; drop placeholders. */
export function meaningfulRecipientLabel(
  label: string | null | undefined,
): string | undefined {
  const t = (label ?? "").trim();
  if (!t || isGenericRecipientLabel(t)) return undefined;
  return t;
}
