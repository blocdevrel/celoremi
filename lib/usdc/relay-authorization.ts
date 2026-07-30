import {
  concat,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  parseSignature,
  recoverAddress,
  type Address,
  type Hex,
} from "viem";
import { attributionDataSuffix } from "../attribution";
import {
  createCeloPublicClient,
  createCeloWalletClient,
  getAgentAddress,
  requireAgentAccount,
} from "../chain/clients";
import { celoFeeHints } from "../chain/gas";
import { CELOSCAN_TX, env } from "../config";
import { assertAmountWithinCaps } from "../payout";
import {
  CELO_USDC_FEE_ADAPTER,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  eip3009TransferAbi,
  type SignedTransferAuthorization,
} from "./eip3009-types";

/**
 * Agent submits transferWithAuthorization (+ ERC-8021 tag). Agent pays gas (USDC fee currency).
 * On-chain Transfer is still from the user → recipient.
 */
export async function relayTaggedTransferWithAuthorization(
  input: SignedTransferAuthorization,
  opts?: { skipAmountCaps?: boolean },
): Promise<{ txHash: Hex; explorer: string }> {
  const value = BigInt(input.authorization.value);
  if (!opts?.skipAmountCaps) {
    assertAmountWithinCaps(value);
  }
  if (value <= 0n) {
    throw new Error("Transfer amount must be > 0");
  }

  const from = getAddress(input.authorization.from);
  const to = getAddress(input.authorization.to);
  const validAfter = BigInt(input.authorization.validAfter);
  const validBefore = BigInt(input.authorization.validBefore);
  const nonce = input.authorization.nonce as Hex;
  const usdc = env.USDC_ADDRESS as Address;

  const digest = hashTypedData({
    domain: {
      name: "USDC",
      version: "2",
      chainId: 42220,
      verifyingContract: usdc,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    },
  });
  const recovered = await recoverAddress({
    hash: digest,
    signature: input.signature,
  });
  if (getAddress(recovered) !== from) {
    throw new Error("Invalid transfer authorization signature");
  }

  const now = Math.floor(Date.now() / 1000);
  if (now + 30 < Number(validAfter)) {
    throw new Error("Transfer authorization is not valid yet");
  }
  if (now > Number(validBefore)) {
    throw new Error("Transfer authorization expired — sign again");
  }

  if (env.DEV_MOCK_PAYOUT) {
    const mockHash = `0x${"d".repeat(64)}` as Hex;
    return { txHash: mockHash, explorer: CELOSCAN_TX(mockHash) };
  }

  const parsed = parseSignature(input.signature);
  const v = Number(parsed.v);
  const r = parsed.r;
  const s = parsed.s;

  const account = requireAgentAccount();
  const publicClient = createCeloPublicClient();
  const walletClient = createCeloWalletClient(account);
  const tag = attributionDataSuffix();

  const data = concat([
    encodeFunctionData({
      abi: eip3009TransferAbi,
      functionName: "transferWithAuthorization",
      args: [from, to, value, validAfter, validBefore, nonce, v, r, s],
    }),
    tag,
  ]);

  const fees = await celoFeeHints(publicClient);

  let hash: Hex;
  try {
    hash = await walletClient.sendTransaction({
      account,
      to: usdc,
      data,
      chain: publicClient.chain,
      feeCurrency: CELO_USDC_FEE_ADAPTER,
      ...fees,
    });
  } catch (feeErr) {
    console.warn(
      "[remifi] USDC feeCurrency relay failed, retrying with CELO gas",
      feeErr instanceof Error ? feeErr.message : feeErr,
    );
    hash = await walletClient.sendTransaction({
      account,
      to: usdc,
      data,
      chain: publicClient.chain,
      ...fees,
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Sponsored USDC transfer reverted: ${hash}`);
  }

  return { txHash: hash, explorer: CELOSCAN_TX(hash) };
}

export function isAgentRelayedTxSender(txFrom: Address): boolean {
  const agent = getAgentAddress();
  if (!agent) return false;
  return getAddress(txFrom) === getAddress(agent);
}
