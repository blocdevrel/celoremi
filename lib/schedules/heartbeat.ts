import { env } from "../config";
import { settleAgentSignedHire } from "../x402";
import { executePayrollJob } from "../job/execute-payroll";
import {
  advanceScheduleAfterRun,
  listDueSchedules,
  markScheduleFailed,
} from "../db/schedules";
import { notifyWalletAsync, settlementFailMessage, flushReceipts } from "../telegram/notify";
import { runX402TrafficBurst, type X402TrafficResult } from "./x402-traffic";

export type HeartbeatResult = {
  checkedAt: string;
  due: number;
  completed: number;
  failed: number;
  results: Array<{
    scheduleId: string;
    policyId: string;
    status: "completed" | "failed" | "skipped";
    jobId?: string;
    error?: string;
    x402SettlementTxHash?: string;
  }>;
  x402Traffic: X402TrafficResult;
  schedulesEnabled: boolean;
};

/** Run due payroll schedules + x402 traffic burst.
 * Invoked by OpenClaw (`openclaw/skills/remifi-core/scripts/run-due.ts`),
 * `npm run heartbeat`, or `POST /api/schedules/heartbeat`.
 */
export async function runDueSchedules(): Promise<HeartbeatResult> {
  const results: HeartbeatResult["results"] = [];
  let completed = 0;
  let failed = 0;
  let dueCount = 0;

  if (env.HEARTBEAT_SCHEDULES_ENABLED) {
    const due = await listDueSchedules();
    dueCount = due.length;

    for (const schedule of due) {
      const clientJobId = `schedule-${schedule.id}-${Date.now()}`;
      let jobStarted = false;
      try {
        const hire = await settleAgentSignedHire("/api/execute");
        jobStarted = true;
        const job = await executePayrollJob({
          policyId: schedule.policyId,
          amount: schedule.amount,
          clientJobId,
          hire,
          notifyKind: "auto",
        });
        await advanceScheduleAfterRun(schedule.id, schedule.intervalMinutes);
        completed += 1;
        results.push({
          scheduleId: schedule.id,
          policyId: schedule.policyId,
          status: "completed",
          jobId: job.jobId,
          ...(job.x402SettlementTxHash
            ? { x402SettlementTxHash: job.x402SettlementTxHash }
            : {}),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Schedule run failed";
        await markScheduleFailed(schedule.id, message);
        if (!jobStarted) {
          notifyWalletAsync(
            schedule.policy?.ownerAddress,
            settlementFailMessage({ kind: "auto", error: message }),
          );
        }
        failed += 1;
        results.push({
          scheduleId: schedule.id,
          policyId: schedule.policyId,
          status: "failed",
          error: message,
        });
      }
    }
  }

  const x402Traffic = await runX402TrafficBurst();

  await flushReceipts();

  return {
    checkedAt: new Date().toISOString(),
    due: dueCount,
    completed,
    failed,
    results,
    x402Traffic,
    schedulesEnabled: Boolean(env.HEARTBEAT_SCHEDULES_ENABLED),
  };
}
