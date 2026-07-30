import { describe, expect, it } from "vitest";
import { computeSplitAmounts, validateRecipients } from "../policy/validate";
import { jobToOrderKey } from "../chain/router";

describe("multi-recipient router split amounts", () => {
  it("splits total across recipients exactly", () => {
    const recipients = validateRecipients([
      { address: "0x1111111111111111111111111111111111111111", bps: 5000, label: "A" },
      { address: "0x2222222222222222222222222222222222222222", bps: 3000, label: "B" },
      { address: "0x3333333333333333333333333333333333333333", bps: 2000, label: "C" },
    ]);
    const total = 84_000_000n;
    const legs = computeSplitAmounts(recipients, total);
    expect(legs).toHaveLength(3);
    expect(legs.reduce((s, l) => s + l.amount, 0n)).toBe(total);
    expect(legs[0]!.amount).toBe(42_000_000n);
    expect(legs[1]!.amount).toBe(25_200_000n);
    expect(legs[2]!.amount).toBe(16_800_000n);
  });

  it("produces stable orderKey from job id", () => {
    const a = jobToOrderKey("job_abc");
    const b = jobToOrderKey("job_abc");
    const c = jobToOrderKey("job_xyz");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});
