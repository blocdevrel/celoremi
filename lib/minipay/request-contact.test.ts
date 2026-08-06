import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendContactToEnglish,
  parseMiniPayContact,
  requestMiniPayContact,
} from "./request-contact";

const ADDR = "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37";

describe("parseMiniPayContact", () => {
  it("accepts name + address", () => {
    expect(parseMiniPayContact({ name: "Alex", address: ADDR })).toEqual({
      name: "Alex",
      address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37",
    });
  });

  it("accepts walletAddress / displayName aliases", () => {
    expect(
      parseMiniPayContact({
        displayName: "Sam",
        walletAddress: ADDR.toLowerCase(),
      }),
    ).toEqual({
      name: "Sam",
      address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37",
    });
  });

  it("defaults missing name to Friend", () => {
    expect(parseMiniPayContact({ address: ADDR }).name).toBe("Friend");
  });

  it("rejects invalid address", () => {
    expect(() => parseMiniPayContact({ name: "X", address: "nope" })).toThrow(
      /valid wallet address/i,
    );
  });
});

describe("appendContactToEnglish", () => {
  it("fills empty text", () => {
    expect(
      appendContactToEnglish("", {
        name: "Alex",
        address: ADDR as `0x${string}`,
      }),
    ).toBe(`Alex (${ADDR})`);
  });

  it("appends with a space", () => {
    expect(
      appendContactToEnglish("Split 50/50 between", {
        name: "Alex",
        address: ADDR as `0x${string}`,
      }),
    ).toBe(`Split 50/50 between Alex (${ADDR})`);
  });
});

describe("requestMiniPayContact", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws outside MiniPay", async () => {
    vi.stubGlobal("window", { ethereum: { isMiniPay: false } });
    await expect(requestMiniPayContact()).rejects.toThrow(/Open Remifi in MiniPay/i);
  });

  it("calls minipay_requestContact and returns contact", async () => {
    const request = vi.fn().mockResolvedValue({ name: "Alex", address: ADDR });
    vi.stubGlobal("window", {
      ethereum: { isMiniPay: true, request },
    });
    const contact = await requestMiniPayContact();
    expect(request).toHaveBeenCalledWith({
      method: "minipay_requestContact",
      params: [],
    });
    expect(contact).toEqual({
      name: "Alex",
      address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37",
    });
  });
});