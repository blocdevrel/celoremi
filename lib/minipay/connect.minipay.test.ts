import { afterEach, describe, expect, it, vi } from "vitest";
import { getInjectedEthereum, isMiniPayRuntime } from "./detect";

describe("MiniPay runtime detection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects isMiniPay on window.ethereum", () => {
    vi.stubGlobal("window", { ethereum: { isMiniPay: true } });
    expect(isMiniPayRuntime()).toBe(true);
  });

  it("detects MiniPay inside ethereum.providers", () => {
    vi.stubGlobal("window", {
      ethereum: {
        isMetaMask: true,
        providers: [{ isMiniPay: true }, { isMetaMask: true }],
      },
    });
    expect(isMiniPayRuntime()).toBe(true);
    expect(getInjectedEthereum()?.isMiniPay).toBe(true);
  });

  it("is false without MiniPay", () => {
    vi.stubGlobal("window", { ethereum: { isMetaMask: true } });
    expect(isMiniPayRuntime()).toBe(false);
  });
});