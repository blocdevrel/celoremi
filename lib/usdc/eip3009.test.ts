import { describe, expect, it } from "vitest";
import {
  getAddress,
  hashTypedData,
  recoverAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import {
  CELO_USDC_FEE_ADAPTER,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  type TransferAuthorization,
} from "./eip3009-types";

const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as Address;

/** Mirrors Max / hire-fee clamp used in RemifiApp (Binance-style). */
function maxSpendable(balance: bigint, hirePrice: bigint): bigint {
  return balance > hirePrice ? balance - hirePrice : 0n;
}

function clampSendAmount(
  amount: bigint,
  balance: bigint,
  hirePrice: bigint,
): { ok: true; amount: bigint } | { ok: false; reason: string } {
  const spendable = maxSpendable(balance, hirePrice);
  if (spendable <= 0n) {
    return { ok: false, reason: "insufficient_for_fee" };
  }
  if (amount > balance) {
    return { ok: false, reason: "over_balance" };
  }
  if (amount > spendable) {
    return { ok: true, amount: spendable };
  }
  return { ok: true, amount };
}

const executeWalletBodySchema = z
  .object({
    policyId: z.string().min(1),
    amount: z.string().regex(/^\d+$/),
    payer: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
    transfers: z
      .array(
        z.object({
          to: z.string().min(1),
          amount: z.string().regex(/^\d+$/),
          txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        }),
      )
      .min(1)
      .max(20)
      .optional(),
    fundTxHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  })
  .refine((b) => Boolean(b.fundTxHash) || (b.transfers?.length ?? 0) > 0, {
    message: "Provide fundTxHash (one-sig split) or transfers",
  });

describe("hire fee Max clamp (Binance-style)", () => {
  it("Max leaves hire fee in wallet", () => {
    const balance = 84_000_000n; // 84 USDC
    const hire = 10_000n; // 0.01 USDC
    expect(maxSpendable(balance, hire)).toBe(83_990_000n);
  });

  it("clamps full-balance send down to spendable", () => {
    const balance = 84_000_000n;
    const hire = 10_000n;
    const result = clampSendAmount(balance, balance, hire);
    expect(result).toEqual({ ok: true, amount: 83_990_000n });
  });

  it("rejects amount above wallet balance", () => {
    const result = clampSendAmount(100_000_000n, 84_000_000n, 10_000n);
    expect(result).toEqual({ ok: false, reason: "over_balance" });
  });

  it("rejects when balance cannot cover hire fee", () => {
    const result = clampSendAmount(5_000n, 5_000n, 10_000n);
    expect(result).toEqual({ ok: false, reason: "insufficient_for_fee" });
  });
});

describe("execute/wallet body (one-sig fundTxHash)", () => {
  it("accepts fundTxHash without transfers", () => {
    const parsed = executeWalletBodySchema.parse({
      policyId: "pol_1",
      amount: "1000000",
      payer: "0x1111111111111111111111111111111111111111",
      fundTxHash: `0x${"a".repeat(64)}`,
    });
    expect(parsed.fundTxHash).toMatch(/^0x[a-f]+$/);
    expect(parsed.transfers).toBeUndefined();
  });

  it("accepts transfers without fundTxHash", () => {
    const parsed = executeWalletBodySchema.parse({
      policyId: "pol_1",
      amount: "1000000",
      payer: "0x1111111111111111111111111111111111111111",
      transfers: [
        {
          to: "0x2222222222222222222222222222222222222222",
          amount: "1000000",
          txHash: `0x${"b".repeat(64)}`,
        },
      ],
    });
    expect(parsed.transfers).toHaveLength(1);
  });

  it("rejects when neither fundTxHash nor transfers", () => {
    expect(() =>
      executeWalletBodySchema.parse({
        policyId: "pol_1",
        amount: "1000000",
        payer: "0x1111111111111111111111111111111111111111",
      }),
    ).toThrow(/fundTxHash|transfers/);
  });
});

describe("EIP-3009 transfer authorization", () => {
  it("exposes Celo USDC fee adapter", () => {
    expect(CELO_USDC_FEE_ADAPTER).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("recovers signer from TransferWithAuthorization typed data", async () => {
    const account = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
    const authorization: TransferAuthorization = {
      from: getAddress(account.address),
      to: getAddress("0x2222222222222222222222222222222222222222"),
      value: "1000000",
      validAfter: "0",
      validBefore: String(Math.floor(Date.now() / 1000) + 600),
      nonce: `0x${"11".repeat(32)}` as Hex,
    };

    const signature = await account.signTypedData({
      domain: {
        name: "USDC",
        version: "2",
        chainId: 42220,
        verifyingContract: USDC,
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

    const digest = hashTypedData({
      domain: {
        name: "USDC",
        version: "2",
        chainId: 42220,
        verifyingContract: USDC,
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

    const recovered = await recoverAddress({ hash: digest, signature });
    expect(getAddress(recovered)).toBe(getAddress(account.address));
  });
});

describe("parseUsdcHuman vs base units", () => {
  function usdcToBaseUnits(amount: string): string | null {
    const t = amount.trim();
    if (!t || !/^\d+(\.\d{1,6})?$/.test(t)) return null;
    const [w, f = ""] = t.split(".");
    const frac = (f + "000000").slice(0, 6);
    const raw = `${w}${frac}`.replace(/^0+(?=\d)/, "");
    return raw || "0";
  }
  function parseUsdcHuman(raw: string | null | undefined): bigint {
    if (!raw?.trim()) return 0n;
    const asBase = usdcToBaseUnits(raw.trim());
    return asBase ? BigInt(asBase) : 0n;
  }

  it("treats whole-number human balance as USDC not base units", () => {
    expect(parseUsdcHuman("56")).toBe(56_000_000n);
    expect(parseUsdcHuman("84")).toBe(84_000_000n);
    expect(parseUsdcHuman("56.01")).toBe(56_010_000n);
  });
});
