import {
  concat,
  encodeFunctionData,
  getAddress,
  keccak256,
  parseAbi,
  stringToHex,
  type Hex,
} from "viem";
import { routerAbi } from "../abi";
import { attributionDataSuffix } from "../attribution";
import {
  createCeloPublicClient,
  createCeloWalletClient,
  getAgentAddress,
  requireAgentAccount,
} from "./clients";
import { celoFeeHints } from "./gas";
import { CELOSCAN_TX, env } from "../config";
import type { PolicyRecipient, TransferProof } from "../policy/validate";
import { computeSplitAmounts } from "../policy/validate";

export { routerAbi };

export function jobToOrderKey(jobId: string): Hex {
  return keccak256(stringToHex(jobId));
}

export function getRouterAddress(): `0x${string}` | undefined {
  const raw = env.ROUTER_ADDRESS;
  if (!raw) return undefined;
  return getAddress(raw);
}

export function isRouterConfigured(): boolean {
  return Boolean(getRouterAddress());
}

export type RouterSplitResult = {
  settlement: "router_payroll";
  fundTxHash: Hex;
  splitTxHash: Hex;
  transfers: TransferProof[];
};

export async function executeRouterPayroll(
  recipients: PolicyRecipient[],
  totalAmount: bigint,
  orderKey: Hex,
): Promise<RouterSplitResult> {
  const router = getRouterAddress();
  if (!router) {
    throw new Error("ROUTER_ADDRESS is not set");
  }

  const legs = computeSplitAmounts(recipients, totalAmount);

  if (env.DEV_MOCK_PAYOUT) {
    const mockFund = `0x${"b".repeat(64)}` as Hex;
    const mockSplit = `0x${"c".repeat(64)}` as Hex;
    console.log("[remifi] mock router payroll", {
      recipients: legs.length,
      totalAmount: totalAmount.toString(),
    });
    return {
      settlement: "router_payroll",
      fundTxHash: mockFund,
      splitTxHash: mockSplit,
      transfers: legs.map((leg) => ({
        to: leg.address,
        amount: leg.amount.toString(),
        txHash: mockSplit,
        explorer: CELOSCAN_TX(mockSplit),
        ...(leg.label ? { label: leg.label } : {}),
      })),
    };
  }

  const account = requireAgentAccount();
  const publicClient = createCeloPublicClient();
  const walletClient = createCeloWalletClient(account);
  const usdc = env.USDC_ADDRESS as `0x${string}`;
  const tag = attributionDataSuffix();

  const fundData = concat([
    encodeFunctionData({
      abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
      functionName: "transfer",
      args: [router, totalAmount],
    }),
    tag,
  ]);
  const fees = await celoFeeHints(publicClient);
  const fundTxHash = await walletClient.sendTransaction({
    account,
    to: usdc,
    data: fundData,
    chain: publicClient.chain,
    ...fees,
  });
  const fundReceipt = await publicClient.waitForTransactionReceipt({
    hash: fundTxHash,
  });
  if (fundReceipt.status !== "success") {
    throw new Error(`Router fund transfer reverted: ${fundTxHash}`);
  }

  const split = await executeRouterSplitOnly(recipients, totalAmount, orderKey);

  console.log("[remifi] router payroll", {
    fundTxHash,
    splitTxHash: split.splitTxHash,
    recipients: legs.length,
  });

  return {
    settlement: "router_payroll",
    fundTxHash,
    splitTxHash: split.splitTxHash,
    transfers: split.transfers,
  };
}

export type RouterSplitOnlyResult = {
  splitTxHash: Hex;
  transfers: TransferProof[];
};

/**
 * Split funds already sitting on the Router (e.g. user funded in one wallet tx).
 * Agent executor signs executeSplit — recipients get paid in a single on-chain call.
 */
export async function executeRouterSplitOnly(
  recipients: PolicyRecipient[],
  totalAmount: bigint,
  orderKey: Hex,
): Promise<RouterSplitOnlyResult> {
  const router = getRouterAddress();
  if (!router) {
    throw new Error("ROUTER_ADDRESS is not set");
  }

  const legs = computeSplitAmounts(recipients, totalAmount);
  const recipientAddrs = legs.map((l) => l.address);
  const amounts = legs.map((l) => l.amount);

  if (env.DEV_MOCK_PAYOUT) {
    const mockSplit = `0x${"c".repeat(64)}` as Hex;
    return {
      splitTxHash: mockSplit,
      transfers: legs.map((leg) => ({
        to: leg.address,
        amount: leg.amount.toString(),
        txHash: mockSplit,
        explorer: CELOSCAN_TX(mockSplit),
        ...(leg.label ? { label: leg.label } : {}),
      })),
    };
  }

  const account = requireAgentAccount();
  const agent = getAgentAddress();
  if (!agent) throw new Error("Agent wallet not configured");

  const publicClient = createCeloPublicClient();
  const walletClient = createCeloWalletClient(account);
  const usdc = env.USDC_ADDRESS as `0x${string}`;
  const tag = attributionDataSuffix();

  const [onChainToken, onChainExecutor, already] = await Promise.all([
    publicClient.readContract({
      address: router,
      abi: routerAbi,
      functionName: "token",
    }),
    publicClient.readContract({
      address: router,
      abi: routerAbi,
      functionName: "executor",
    }),
    publicClient.readContract({
      address: router,
      abi: routerAbi,
      functionName: "executed",
      args: [orderKey],
    }),
  ]);

  if ((onChainToken as string).toLowerCase() !== usdc.toLowerCase()) {
    throw new Error(
      `Router token ${onChainToken} != USDC_ADDRESS ${usdc} — redeploy Router on Celo with Circle USDC`,
    );
  }
  if ((onChainExecutor as string).toLowerCase() !== agent.toLowerCase()) {
    throw new Error(
      `Router executor ${onChainExecutor} != agent ${agent} — deploy with ROUTER_EXECUTOR_ADDRESS = AGENT_ADDRESS`,
    );
  }
  if (already) {
    throw new Error(`Router split already executed for orderKey ${orderKey}`);
  }

  const balance = await publicClient.readContract({
    address: usdc,
    abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
    functionName: "balanceOf",
    args: [router],
  });
  if (balance < totalAmount) {
    throw new Error(
      `Router USDC balance ${balance} < required ${totalAmount} — fund the router first`,
    );
  }

  const splitData = concat([
    encodeFunctionData({
      abi: routerAbi,
      functionName: "executeSplit",
      args: [orderKey, recipientAddrs, amounts, totalAmount],
    }),
    tag,
  ]);
  const fees = await celoFeeHints(publicClient);
  const splitTxHash = await walletClient.sendTransaction({
    account,
    to: router,
    data: splitData,
    chain: publicClient.chain,
    ...fees,
  });
  const splitReceipt = await publicClient.waitForTransactionReceipt({
    hash: splitTxHash,
  });
  if (splitReceipt.status !== "success") {
    throw new Error(`Router executeSplit reverted: ${splitTxHash}`);
  }

  console.log("[remifi] router split-only", {
    splitTxHash,
    recipients: recipientAddrs.length,
  });

  return {
    splitTxHash,
    transfers: legs.map((leg) => ({
      to: leg.address,
      amount: leg.amount.toString(),
      txHash: splitTxHash,
      explorer: CELOSCAN_TX(splitTxHash),
      ...(leg.label ? { label: leg.label } : {}),
    })),
  };
}
