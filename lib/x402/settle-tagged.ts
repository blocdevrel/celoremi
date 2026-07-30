import {
  getAddress,
  type Address,
  type Hex,
} from "viem";
import { relayTaggedTransferWithAuthorization } from "../usdc/relay-authorization";
import type { SignedTransferAuthorization } from "../usdc/eip3009-types";
import type { ExactEvmPayload } from "./sign-payment";
import type { PaymentRequirements } from "./types";

function asPayload(raw: unknown): ExactEvmPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (obj.authorization && obj.signature) {
    return obj as ExactEvmPayload;
  }

  if (obj.payload && typeof obj.payload === "object") {
    const inner = obj.payload as Record<string, unknown>;
    if (inner.authorization && inner.signature) {
      return inner as ExactEvmPayload;
    }
  }

  return null;
}

/** Decode base64 X-PAYMENT / JSON payment into EIP-3009 auth + signature. */
export function parseXPaymentAuthorization(
  paymentHeader: string,
): SignedTransferAuthorization {
  let decoded: unknown = paymentHeader;
  try {
    decoded = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf8"),
    );
  } catch {
    try {
      decoded = JSON.parse(paymentHeader);
    } catch {
      throw new Error("Invalid X-PAYMENT encoding");
    }
  }

  const exact = asPayload(decoded);
  if (!exact?.authorization || !exact.signature) {
    throw new Error("X-PAYMENT missing authorization/signature");
  }

  const a = exact.authorization;
  return {
    authorization: {
      from: getAddress(a.from) as Address,
      to: getAddress(a.to) as Address,
      value: String(a.value),
      validAfter: String(a.validAfter),
      validBefore: String(a.validBefore),
      nonce: a.nonce as Hex,
    },
    signature: exact.signature as Hex,
  };
}

/**
 * Last-resort hire settle: agent submits EIP-3009 + ERC-8021 tag.
 * Prefer Celo facilitator settle for Track 2; use this only when facilitator fails.
 * Track 1 volume should come from classic tagged `transfer` payroll/sends.
 */
export async function settleX402HireTagged(
  paymentHeader: string,
  requirements: PaymentRequirements,
): Promise<{ txHash: Hex }> {
  const signed = parseXPaymentAuthorization(paymentHeader);

  const expectedTo = getAddress(requirements.payTo);
  const expectedValue = BigInt(requirements.maxAmountRequired);
  if (getAddress(signed.authorization.to) !== expectedTo) {
    throw new Error(
      `Hire payTo mismatch: got ${signed.authorization.to}, expected ${expectedTo}`,
    );
  }
  if (BigInt(signed.authorization.value) !== expectedValue) {
    throw new Error(
      `Hire amount mismatch: got ${signed.authorization.value}, expected ${expectedValue}`,
    );
  }

  const result = await relayTaggedTransferWithAuthorization(signed, {
    skipAmountCaps: true,
  });
  return { txHash: result.txHash };
}
