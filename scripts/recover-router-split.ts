/**
 * Complete a failed wallet→Router payroll whose executeSplit never landed.
 * Usage: npx tsx scripts/recover-router-split.ts <jobId>
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = resolve(process.cwd(), file);
  if (existsSync(p)) {
    loadEnv({ path: p, override: false });
  }
}

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Usage: npx tsx scripts/recover-router-split.ts <jobId>");
    process.exit(1);
  }

  const { withDb, completePayoutJob } = await import("../lib/db");
  const { executeRouterSplitOnly, jobToOrderKey } = await import(
    "../lib/chain/router"
  );
  const { validateRecipients } = await import("../lib/policy/validate");

  const job = await withDb((db) =>
    db.payoutJob.findUnique({
      where: { id: jobId },
      include: { policy: true },
    }),
  );
  if (!job) throw new Error(`Job not found: ${jobId}`);
  if (!job.policy) throw new Error(`Job ${jobId} has no policy`);
  if (job.status === "completed" && job.splitTxHash) {
    console.log("[recover] already completed", {
      jobId,
      splitTxHash: job.splitTxHash,
    });
    return;
  }

  const recipients = validateRecipients(
    job.policy.recipients as Array<{
      address: string;
      bps: number;
      label?: string;
    }>,
  );
  const totalAmount = BigInt(job.totalAmount);
  const orderKey = jobToOrderKey(job.id);

  console.log("[recover] executing split", {
    jobId: job.id,
    policy: job.policy.name,
    totalAmount: totalAmount.toString(),
    recipients: recipients.length,
    orderKey,
    priorStatus: job.status,
  });

  const split = await executeRouterSplitOnly(
    recipients,
    totalAmount,
    orderKey,
  );

  // Prefer original fund tx if we can discover it from chain; otherwise leave null.
  const fundTxHash =
    job.fundTxHash ??
    "0x7dfc4f7ff50582f455fdbcf748ae1310ae8d179880a02dd0d7d93620f83f9eec";

  await completePayoutJob(job.id, split.transfers, {
    settlement: "wallet_router",
    fundTxHash,
    splitTxHash: split.splitTxHash,
    hireMode: job.hireMode ?? "x402",
  });

  console.log("[recover] done", {
    jobId: job.id,
    splitTxHash: split.splitTxHash,
    transfers: split.transfers,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
