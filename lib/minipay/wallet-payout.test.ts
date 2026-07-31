import { toDataSuffix } from "@celo/attribution-tags";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  concat,
  encodeFunctionData,
  erc20Abi,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";

const sendTransaction = vi.fn();
const waitForTransactionReceipt = vi.fn();
const ensureCeloChain = vi.fn();

vi.mock("./connect", () => ({
  CELO_USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as Address,
  ensureCeloChain: (...args: unknown[]) => ensureCeloChain(...args),
}));

vi.mock("./balance", () => ({
  createCeloBrowserPublicClient: () => ({
    waitForTransactionReceipt: (...args: unknown[]) =>
      waitForTransactionReceipt(...args),
  }),
}));

describe("sendTaggedUsdcFromWallet", () => {
  beforeEach(() => {
    sendTransaction.mockReset();
    waitForTransactionReceipt.mockReset();
    ensureCeloChain.mockReset();
    ensureCeloChain.mockResolvedValue(undefined);
    waitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  it(
    "sends classic tagged ERC-20 transfer (not EIP-3009 sponsorship)",
    async () => {
    const { sendTaggedUsdcFromWallet } = await import("./wallet-payout");
    const account = "0x1111111111111111111111111111111111111111" as Address;
    const to = "0x2222222222222222222222222222222222222222" as Address;
    const amountBaseUnits = 1_990_000n;
    const attributionTag = "celo_2febfd2084bb";
    const txHash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;

    sendTransaction.mockResolvedValue(txHash);

    const client = { sendTransaction } as unknown as WalletClient;
    const hash = await sendTaggedUsdcFromWallet({
      client,
      account,
      to,
      amountBaseUnits,
      attributionTag,
    });

    expect(hash).toBe(txHash);
    expect(ensureCeloChain).toHaveBeenCalledOnce();
    expect(sendTransaction).toHaveBeenCalledOnce();

    const call = sendTransaction.mock.calls[0]![0] as {
      to: Address;
      data: Hex;
      account: Address;
    };
    expect(call.account).toBe(account);
    expect(call.to.toLowerCase()).toBe(
      "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
    );

    // Classic transfer selector — Track 1 typically scores these, not 0xe3ee160e
    expect(call.data.startsWith("0xa9059cbb")).toBe(true);
    expect(call.data.startsWith("0xe3ee160e")).toBe(false);

    const expected = concat([
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [to, amountBaseUnits],
      }),
      toDataSuffix(attributionTag) as Hex,
    ]);
    expect(call.data.toLowerCase()).toBe(expected.toLowerCase());
    expect(waitForTransactionReceipt).toHaveBeenCalledWith({ hash: txHash });
    },
    15_000,
  );

  it("rejects zero amount", async () => {
    const { sendTaggedUsdcFromWallet } = await import("./wallet-payout");
    await expect(
      sendTaggedUsdcFromWallet({
        client: { sendTransaction } as unknown as WalletClient,
        account: "0x1111111111111111111111111111111111111111",
        to: "0x2222222222222222222222222222222222222222",
        amountBaseUnits: 0n,
        attributionTag: "celo_2febfd2084bb",
      }),
    ).rejects.toThrow(/must be > 0/i);
    expect(sendTransaction).not.toHaveBeenCalled();
  });
});
