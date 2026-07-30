import { erc20Abi, getAddress, parseEventLogs, type Address, type Hex } from "viem";
import { assertTagPresent, verifyAttribution } from "../attribution";
import { createCeloPublicClient, getAgentAddress } from "../chain/clients";
import { env } from "../config";

export async function verifyWalletUsdcTransfer(input: {
  txHash: Hex;
  payer: Address;
  to: Address;
  amount: bigint;
}): Promise<void> {
  const payer = getAddress(input.payer);
  const to = getAddress(input.to);
  const publicClient = createCeloPublicClient();

  const receipt = await publicClient.getTransactionReceipt({
    hash: input.txHash,
  });
  if (receipt.status !== "success") {
    throw new Error(`Transfer tx reverted: ${input.txHash}`);
  }

  const tx = await publicClient.getTransaction({ hash: input.txHash });
  const txFrom = getAddress(tx.from);
  const agent = getAgentAddress();
  const agentSponsored =
    Boolean(agent) && txFrom === getAddress(agent as Address);

  // Direct MiniPay send: payer broadcasts. Web3 sponsored: agent relays EIP-3009.
  if (txFrom !== payer && !agentSponsored) {
    throw new Error(`Transfer tx sender mismatch for ${input.txHash}`);
  }

  const decoded = await verifyAttribution(input.txHash);
  assertTagPresent(decoded);

  const usdc = getAddress(env.USDC_ADDRESS);
  const transferLogs = parseEventLogs({
    abi: erc20Abi,
    logs: receipt.logs,
    eventName: "Transfer",
  }).filter((log) => log.address.toLowerCase() === usdc.toLowerCase());

  const match = transferLogs.find(
    (log) =>
      getAddress(log.args.from as Address) === payer &&
      getAddress(log.args.to as Address) === to &&
      log.args.value === input.amount,
  );

  if (!match) {
    throw new Error(
      `No matching USDC transfer in ${input.txHash} (${payer} → ${to}, ${input.amount})`,
    );
  }
}
