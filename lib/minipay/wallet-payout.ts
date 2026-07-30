import { toDataSuffix } from "@celo/attribution-tags";
import {
  concat,
  encodeFunctionData,
  erc20Abi,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import { celo } from "viem/chains";
import { createCeloBrowserPublicClient } from "./balance";
import { CELO_USDC, ensureCeloChain } from "./connect";

/**
 * Send tagged USDC via ERC-20 `transfer` + ERC-8021 suffix.
 *
 * Always direct from the user wallet (Track 1 counts classic tagged transfers).
 * MiniPay covers gas via fee abstraction; Web3 wallets need a small CELO/fee-token balance.
 * Agent EIP-3009 sponsorship is intentionally not used for payouts — leaderboard
 * queries often skip transferWithAuthorization relays even when tagged.
 */
export async function sendTaggedUsdcFromWallet(params: {
  client: WalletClient;
  account: Address;
  to: Address;
  amountBaseUnits: bigint;
  attributionTag: string;
}): Promise<Hex> {
  if (params.amountBaseUnits <= 0n) {
    throw new Error("Transfer amount must be > 0");
  }

  await ensureCeloChain();

  const tag = toDataSuffix(params.attributionTag) as Hex;
  const data = concat([
    encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [params.to, params.amountBaseUnits],
    }),
    tag,
  ]);

  const hash = await params.client.sendTransaction({
    account: params.account,
    chain: celo,
    to: CELO_USDC,
    data,
  });

  const receipt = await createCeloBrowserPublicClient().waitForTransactionReceipt(
    { hash },
  );
  if (receipt.status === "reverted") {
    throw new Error("USDC transfer failed on-chain");
  }

  return hash;
}
