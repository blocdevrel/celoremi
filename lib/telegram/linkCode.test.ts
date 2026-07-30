import { describe, expect, it } from "vitest";
import { makeLinkCode, verifyLinkCode } from "./linkCode";

const WALLET = "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37";

describe("telegram link codes", () => {
  it("round-trips a wallet within the ttl", () => {
    const code = makeLinkCode(WALLET);
    expect(code).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyLinkCode(code)).toBe(WALLET.toLowerCase());
  });

  it("rejects an expired code", () => {
    const code = makeLinkCode(WALLET, Date.now() - 5 * 60 * 1000);
    expect(verifyLinkCode(code)).toBeNull();
  });

  it("rejects tampering", () => {
    const code = makeLinkCode(WALLET);
    const flip = (s: string, i: number) =>
      s.slice(0, i) + (s[i] === "0" ? "1" : "0") + s.slice(i + 1);
    expect(verifyLinkCode(flip(code, 3))).toBeNull();
    expect(verifyLinkCode(flip(code, 42))).toBeNull();
    expect(verifyLinkCode(flip(code, 55))).toBeNull();
    expect(verifyLinkCode("garbage")).toBeNull();
  });
});
