/**
 * Burst Remifi-style instant pays: x402 hire + tagged USDC transfer.
 *
 * Mirrors the dominant history pattern (kind=instant, hire + Track-1 tag).
 * Spends REAL agent USDC on Celo mainnet. Start with --dry-run.
 *
 * Usage:
 *   npx tsx scripts/burst-instant-pays.ts --to 0xRecipient --count 5 --dry-run
 *   npx tsx scripts/burst-instant-pays.ts --to 0xRecipient --count 10 --min 100 --max 250 --delay-ms 8000
 *
 * Env: AGENT_PRIVATE_KEY, ATTRIBUTION_TAG, X402_API_KEY, X402_PAY_TO, DATABASE_URL (optional job rows)
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = resolve(process.cwd(), file);
  if (existsSync(p)) loadEnv({ path: p, override: false });
}

type Args = {
  to: string;
  count: number;
  minUsdc: number;
  maxUsdc: number;
  delayMs: number;
  dryRun: boolean;
  jitter: boolean;
  recordJob: boolean;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const to = get("--to");
  if (!to) {
    console.error(
      "Usage: npx tsx scripts/burst-instant-pays.ts --to 0xAddr [--count N] [--min 100] [--max 250] [--delay-ms 8000] [--dry-run] [--no-jitter] [--no-job]",
    );
    process.exit(1);
  }
  return {
    to,
    count: Number(get("--count") ?? "5"),
    minUsdc: Number(get("--min") ?? "100"),
    maxUsdc: Number(get("--max") ?? "250"),
    delayMs: Number(get("--delay-ms") ?? "8000"),
    dryRun: argv.includes("--dry-run"),
    jitter: !argv.includes("--no-jitter"),
    recordJob: !argv.includes("--no-job"),
  };
}

function usdcToBase(usdc: number): bigint {
  return BigInt(Math.round(usdc * 1e6));
}

function pickAmountUsdc(args: Args, index: number): number {
  const lo = Math.min(args.minUsdc, args.maxUsdc);
  const hi = Math.max(args.minUsdc, args.maxUsdc);
  if (!args.jitter || lo === hi) return lo;
  // History often used mid-size rounds + tiny .xx drifts
  const base = lo + Math.random() * (hi - lo);
  const drift = (index % 7) * 0.01;
  return Math.round((base + drift) * 100) / 100;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(args.count) || args.count < 1 || args.count > 200) {
    throw new Error("--count must be 1..200");
  }
  if (args.minUsdc <= 0 || args.maxUsdc <= 0) {
    throw new Error("--min/--max must be > 0 USDC");
  }

  const { env } = await import("../lib/config");
  const { normalizeAddress } = await import("../lib/policy/validate");
  const { assertAmountWithinCaps, sendTaggedUsdcTransfer } = await import(
    "../lib/payout"
  );
  const { settleAgentSignedHire } = await import("../lib/x402");
  const { getAgentAddress, createCeloPublicClient } = await import(
    "../lib/chain/clients"
  );
  const { erc20Abi, formatUnits } = await import("viem");

  const to = normalizeAddress(args.to);
  const agent = getAgentAddress();
  if (!agent) throw new Error("AGENT_ADDRESS / agent key not configured");
  if (!env.ATTRIBUTION_TAG) throw new Error("ATTRIBUTION_TAG required");
  if (!env.AGENT_PRIVATE_KEY && !args.dryRun) {
    throw new Error("AGENT_PRIVATE_KEY required (or use --dry-run)");
  }

  const publicClient = createCeloPublicClient();
  const bal = await publicClient.readContract({
    address: env.USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [agent],
  });

  const plan: Array<{ usdc: number; base: bigint }> = [];
  for (let i = 0; i < args.count; i++) {
    const usdc = pickAmountUsdc(args, i);
    const base = usdcToBase(usdc);
    assertAmountWithinCaps(base);
    plan.push({ usdc, base });
  }
  const totalBase = plan.reduce((s, p) => s + p.base, 0n);
  const hireEach = env.X402_HIRE_PRICE;
  const hireTotal = hireEach * BigInt(args.count);

  console.log("[burst] plan", {
    agent,
    to,
    count: args.count,
    tag: env.ATTRIBUTION_TAG,
    agentUsdc: formatUnits(bal, 6),
    payoutUsdc: formatUnits(totalBase, 6),
    hireUsdc: formatUnits(hireTotal, 6),
    needUsdc: formatUnits(totalBase + hireTotal, 6),
    delayMs: args.delayMs,
    dryRun: args.dryRun,
  });

  if (bal < totalBase + hireTotal) {
    console.warn(
      "[burst] WARNING: agent USDC may be short for payouts+hires — runs can fail mid-burst",
    );
  }

  if (args.dryRun) {
    plan.forEach((p, i) =>
      console.log(`[burst] dry ${i + 1}/${args.count}: ${p.usdc} USDC -> ${to}`),
    );
    console.log("[burst] dry-run complete — re-run without --dry-run to send");
    return;
  }

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i]!;
    const label = `${i + 1}/${plan.length}`;
    try {
      const hire = await settleAgentSignedHire(
        `/api/pay#burst-${Date.now()}-${i}`,
      );
      const result = await sendTaggedUsdcTransfer(to, step.base);

      if (args.recordJob) {
        try {
          const { createPayoutJob, completePayoutJob } = await import(
            "../lib/db"
          );
          const job = await createPayoutJob({
            kind: "instant",
            totalAmount: step.base.toString(),
            clientJobId: `burst-${Date.now()}-${i}`,
          });
          await completePayoutJob(
            job.id,
            [
              {
                to: result.to,
                amount: result.amount.toString(),
                txHash: result.txHash,
                explorer: result.explorer,
              },
            ],
            {
              settlement: "instant",
              ...(hire.settlementTxHash
                ? { x402SettlementTxHash: hire.settlementTxHash }
                : {}),
              hireMode: hire.mode,
            },
          );
        } catch (dbErr) {
          console.warn(
            "[burst] job row skipped",
            dbErr instanceof Error ? dbErr.message : dbErr,
          );
        }
      }

      ok += 1;
      console.log(`[burst] ok ${label}`, {
        usdc: step.usdc,
        payTx: result.txHash,
        hireTx: hire.settlementTxHash,
        explorer: result.explorer,
      });
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[burst] fail ${label}:`, msg.slice(0, 300));
      if (/insufficient|balance|X402_API_KEY|not set/i.test(msg)) {
        console.error("[burst] stopping on hard error");
        break;
      }
    }

    if (i < plan.length - 1 && args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  }

  console.log("[burst] done", { ok, failed });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});