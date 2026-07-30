import { describe, expect, it, vi } from "vitest";

vi.mock("../config", () => ({
  env: {
    X402_TRAFFIC_ENABLED: false,
    X402_TRAFFIC_PER_TICK: 25,
    X402_TRAFFIC_END: "2026-08-03T09:00:00Z",
  },
  isX402Enabled: () => true,
}));

vi.mock("../x402", () => ({
  settleAgentSignedHire: vi.fn(async () => {
    throw new Error("should not be called when traffic disabled");
  }),
}));

describe("runX402TrafficBurst", () => {
  it("no-ops when X402_TRAFFIC_ENABLED is false", async () => {
    const { runX402TrafficBurst } = await import("./x402-traffic");
    const { settleAgentSignedHire } = await import("../x402");

    const result = await runX402TrafficBurst();
    expect(result).toEqual({
      enabled: false,
      attempted: 0,
      ok: 0,
      failed: 0,
      stoppedReason: "disabled",
      settlements: [],
    });
    expect(settleAgentSignedHire).not.toHaveBeenCalled();
  });
});
