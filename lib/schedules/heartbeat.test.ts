import { beforeEach, describe, expect, it, vi } from "vitest";

const listDueSchedules = vi.fn();
const settleAgentSignedHire = vi.fn();
const executePayrollJob = vi.fn();
const runX402TrafficBurst = vi.fn();

vi.mock("../config", () => ({
  env: {
    HEARTBEAT_SCHEDULES_ENABLED: false,
    X402_TRAFFIC_ENABLED: false,
  },
}));

vi.mock("../db/schedules", () => ({
  listDueSchedules: (...args: unknown[]) => listDueSchedules(...args),
  advanceScheduleAfterRun: vi.fn(),
  markScheduleFailed: vi.fn(),
}));

vi.mock("../x402", () => ({
  settleAgentSignedHire: (...args: unknown[]) => settleAgentSignedHire(...args),
}));

vi.mock("../job/execute-payroll", () => ({
  executePayrollJob: (...args: unknown[]) => executePayrollJob(...args),
}));

vi.mock("./x402-traffic", () => ({
  runX402TrafficBurst: (...args: unknown[]) => runX402TrafficBurst(...args),
}));

describe("runDueSchedules kill switches", () => {
  beforeEach(() => {
    listDueSchedules.mockReset();
    settleAgentSignedHire.mockReset();
    executePayrollJob.mockReset();
    runX402TrafficBurst.mockReset();
    runX402TrafficBurst.mockResolvedValue({
      enabled: false,
      attempted: 0,
      ok: 0,
      failed: 0,
      stoppedReason: "disabled",
      settlements: [],
    });
  });

  it("skips auto payroll and agent self-hire when schedules disabled", async () => {
    const { runDueSchedules } = await import("./heartbeat");
    const result = await runDueSchedules();

    expect(result.schedulesEnabled).toBe(false);
    expect(result.due).toBe(0);
    expect(result.completed).toBe(0);
    expect(listDueSchedules).not.toHaveBeenCalled();
    expect(settleAgentSignedHire).not.toHaveBeenCalled();
    expect(executePayrollJob).not.toHaveBeenCalled();
    expect(runX402TrafficBurst).toHaveBeenCalledOnce();
    expect(result.x402Traffic.stoppedReason).toBe("disabled");
  });
});
