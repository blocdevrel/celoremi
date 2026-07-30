import { describe, expect, it } from "vitest";
import { getAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { parseXPaymentAuthorization } from "./settle-tagged";
import { createXPaymentHeader } from "./sign-payment";
import type { PaymentRequirements } from "./types";

describe("parseXPaymentAuthorization", () => {
  it("decodes agent-signed hire payload", async () => {
    const account = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
    const requirements: PaymentRequirements = {
      scheme: "exact",
      network: "celo",
      maxAmountRequired: "10000",
      resource: "/api/pay/wallet",
      description: "test",
      mimeType: "application/json",
      payTo: "0xF76727a58AF2A8bb6ab88Eff50f62930Bc8FF3A3",
      maxTimeoutSeconds: 300,
      asset: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      extra: { name: "USDC", version: "2" },
    };

    const { header, payload } = await createXPaymentHeader(account, requirements);
    const signed = parseXPaymentAuthorization(header);

    expect(getAddress(signed.authorization.from)).toBe(getAddress(account.address));
    expect(getAddress(signed.authorization.to)).toBe(
      getAddress(requirements.payTo),
    );
    expect(signed.authorization.value).toBe("10000");
    expect(signed.signature).toBe(payload.payload.signature as Hex);
  });
});
