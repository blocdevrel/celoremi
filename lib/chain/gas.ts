import type { PublicClient } from "viem";

/**
 * Celo base fee moves quickly; underpriced maxFeePerGas causes
 * "fee cap cannot be lower than the block base fee" / allowance(0) failures.
 */
export async function celoFeeHints(publicClient: PublicClient): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  const block = await publicClient.getBlock({ blockTag: "latest" });
  const base = block.baseFeePerGas ?? 25_000_000_000n;
  const tip = 2_000_000_000n;
  return {
    maxFeePerGas: base * 2n + tip,
    maxPriorityFeePerGas: tip,
  };
}
