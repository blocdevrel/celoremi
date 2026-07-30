import { describe, expect, it } from "vitest";
import {
  clampSendAmountToReserve,
  formatBaseUnitsForInput,
  maxSpendableAfterReserve,
  reserveBeforeSend,
} from "./spendable";

function parseHuman(raw: string): bigint {
  const [w, f = ""] = raw.trim().split(".");
  const frac = (f + "000000").slice(0, 6);
  return BigInt(`${w}${frac}`.replace(/^0+(?=\d)/, "") || "0");
}

describe("formatBaseUnitsForInput", () => {
  it("formats exact micros without float drift", () => {
    expect(formatBaseUnitsForInput(50_033_098n)).toBe("50.033098");
    expect(formatBaseUnitsForInput(50_030_000n)).toBe("50.03");
    expect(formatBaseUnitsForInput(1_000_000n)).toBe("1.00");
    expect(formatBaseUnitsForInput(0n)).toBe("");
  });

  it("round-trips with human parse", () => {
    const base = 50_033_098n;
    expect(parseHuman(formatBaseUnitsForInput(base))).toBe(base);
  });
});

describe("Binance-style send reserve (screenshot regression)", () => {
  // Balance displayed as $50.04; true balance was 50.043098 USDC.
  // Amount 50.033098 + hire 0.01 = 50.043098 — leaves zero pad for MiniPay gas.
  const balance = 50_043_098n;
  const hire = 10_000n; // 0.01 USDC

  it("external wallet Max leaves exact hire fee", () => {
    const reserve = reserveBeforeSend(hire, { miniPay: false });
    const spendable = maxSpendableAfterReserve(balance, reserve);
    expect(reserve).toBe(10_000n);
    expect(spendable).toBe(50_033_098n);
    expect(spendable + hire).toBe(balance);
    expect(formatBaseUnitsForInput(spendable)).toBe("50.033098");
  });

  it("MiniPay Max keeps hire + gas pad so settle still has funds", () => {
    const reserve = reserveBeforeSend(hire, { miniPay: true });
    const spendable = maxSpendableAfterReserve(balance, reserve);
    expect(reserve).toBe(20_000n); // 0.01 hire + 0.01 pad
    expect(spendable).toBe(50_023_098n);
    expect(balance - spendable).toBeGreaterThanOrEqual(hire);
    expect(spendable + hire).toBeLessThanOrEqual(balance);
  });

  it("clamps typed full-balance amount down to spendable", () => {
    const reserve = reserveBeforeSend(hire, { miniPay: true });
    const typed = parseHuman("50.04");
    const clamped = clampSendAmountToReserve(typed, balance, reserve);
    expect(clamped).toBe(50_023_098n);
    expect(clamped + reserve).toBeLessThanOrEqual(balance);
  });

  it("returns 0 when balance cannot cover hire reserve", () => {
    const reserve = reserveBeforeSend(hire, { miniPay: false });
    expect(maxSpendableAfterReserve(5_000n, reserve)).toBe(0n);
    expect(clampSendAmountToReserve(1_000n, 5_000n, reserve)).toBe(0n);
  });

  it("documents old failing Max: leftover equals hire with no pad", () => {
    const oldMax = balance - hire;
    expect(oldMax).toBe(50_033_098n);
    expect(balance - oldMax).toBe(hire);
  });
});
