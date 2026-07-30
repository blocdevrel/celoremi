import { getAddress, type Address, type Hex, type WalletClient } from "viem";
import { CELO_USDC } from "../minipay/connect";
import {
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  type SignedTransferAuthorization,
  type TransferAuthorization,
} from "./eip3009-types";

function randomNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Browser: sign EIP-3009 (no gas). Agent relays on-chain and pays gas. */
export async function signUsdcTransferAuthorization(params: {
  client: WalletClient;
  account: Address;
  to: Address;
  amountBaseUnits: bigint;
  usdcAddress?: Address;
  /** Seconds the auth stays valid (default 10 minutes). */
  validForSeconds?: number;
}): Promise<SignedTransferAuthorization> {
  if (params.amountBaseUnits <= 0n) {
    throw new Error("Transfer amount must be > 0");
  }

  const now = Math.floor(Date.now() / 1000);
  const validFor = params.validForSeconds ?? 600;
  const authorization: TransferAuthorization = {
    from: getAddress(params.account),
    to: getAddress(params.to),
    value: params.amountBaseUnits.toString(),
    validAfter: String(now - 60),
    validBefore: String(now + validFor),
    nonce: randomNonce(),
  };

  const usdc = getAddress(params.usdcAddress ?? CELO_USDC);

  const signature = await params.client.signTypedData({
    account: params.account,
    domain: {
      name: "USDC",
      version: "2",
      chainId: 42220,
      verifyingContract: usdc,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    },
  });

  return { authorization, signature };
}
