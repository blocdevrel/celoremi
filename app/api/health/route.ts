import { erc20Abi, formatUnits } from "viem";
import { getAgentAddress, createCeloPublicClient } from "@/lib/chain/clients";
import { readRouterHealth } from "@/lib/chain/router-health";
import {
  env,
  USDC_DECIMALS,
  getX402PayTo,
  isX402Enabled,
} from "@/lib/config";
import { isTelegramEnabled } from "@/lib/telegram/client";
import { jsonOk } from "@/lib/http";

const HEALTH_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("health probe timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function GET() {
  const agent = getAgentAddress();
  let usdcBalance: string | null = null;
  let usdcBalanceFormatted: string | null = null;
  let chainOk = false;
  let chainError: string | null = null;
  let facilitatorOk: boolean | null = null;

  try {
    const client = createCeloPublicClient();
    await withTimeout(client.getBlockNumber(), HEALTH_MS);
    chainOk = true;

    if (agent) {
      const balance = await withTimeout(
        client.readContract({
          address: env.USDC_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [agent],
        }),
        HEALTH_MS,
      );
      usdcBalance = balance.toString();
      usdcBalanceFormatted = formatUnits(balance, USDC_DECIMALS);
    }
  } catch (err) {
    chainError = err instanceof Error ? err.message : "chain error";
  }

  try {
    // Remifi hires POST /settle only. Celo's /supported on api.x402.celo.org
    // often 500s while settle still works — probe settle readiness (non-5xx).
    const base =
      env.X402_FACILITATOR_URL === "https://x402.celo.org"
        ? "https://api.x402.celo.org"
        : env.X402_FACILITATOR_URL.replace(/\/$/, "");
    const settleRes = await fetch(`${base}/settle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_MS),
    });
    if (settleRes.status < 500) {
      facilitatorOk = true;
    } else {
      // Fallback: public portal /supported (api host is flaky)
      const supportedRes = await fetch("https://x402.celo.org/supported", {
        cache: "no-store",
        signal: AbortSignal.timeout(HEALTH_MS),
      });
      facilitatorOk = supportedRes.ok;
    }
  } catch {
    facilitatorOk = false;
  }

  let router: Awaited<ReturnType<typeof readRouterHealth>>;
  try {
    router = await withTimeout(readRouterHealth(), HEALTH_MS);
  } catch {
    router = {
      configured: Boolean(env.ROUTER_ADDRESS),
      address: (env.ROUTER_ADDRESS as `0x${string}` | undefined) ?? null,
      ok: false,
      token: null,
      executor: null,
      error: "health probe timeout",
    };
  }

  return jsonOk({
    ok: true,
    service: "remifi",
    tracks: ["most-revenue-generated", "most-x402-payments"],
    network: "celo-mainnet",
    chainId: env.CELO_CHAIN_ID,
    usdc: env.USDC_ADDRESS,
    attributionTagConfigured: Boolean(env.ATTRIBUTION_TAG),
    attributionTag: env.ATTRIBUTION_TAG ?? null,
    agentAddress: agent ?? null,
    x402: {
      enabled: isX402Enabled(),
      payTo: getX402PayTo() ?? null,
      hirePrice: env.X402_HIRE_PRICE.toString(),
      facilitator: env.X402_FACILITATOR_URL,
      facilitatorOk,
      hireSettle: "facilitator_primary",
      hireGate: isX402Enabled() ? "x402_then_tagged_payout" : "api_key_or_open_dev",
    },
    trackStrategy: {
      track1: "erc8021_tagged_usdc_transfer",
      track2: "x402_facilitator_settle_to_payTo",
    },
    router,
    usdcBalance,
    usdcBalanceFormatted,
    chainOk,
    chainError,
    mockPayout: Boolean(env.DEV_MOCK_PAYOUT),
    payrollMode: router.configured ? "router_payroll" : "wallet_payroll",
    executeAuthRequired: Boolean(env.EXECUTE_API_KEY),
    telegram: {
      enabled: isTelegramEnabled(),
    },
    maxDailyAmount: env.MAX_DAILY_AMOUNT.toString(),
  });
}
