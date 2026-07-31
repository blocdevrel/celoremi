import { formatUsdc } from "./usdc";

export type ToastKind = "ok" | "err" | "info";

export type RemifiToastState = {
  kind: ToastKind;
  /** Short headline shown above the detail line */
  title?: string;
  text: string;
};

/** Human-readable wallet / chain / rejection errors. */
export function friendlyWalletError(
  err: unknown,
  opts?: { preferMiniPay?: boolean },
): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const msg = raw.trim() || "Something went wrong";

  if (/user rejected|denied|user denied|rejected the request|ACTION_REJECTED/i.test(msg)) {
    return "Request cancelled in your wallet";
  }
  if (/42220|target chain|Current Chain ID|chain mismatch|wrong network|switch.*celo/i.test(msg)) {
    return opts?.preferMiniPay
      ? "Open Remifi in MiniPay on Celo to continue"
      : "Switch your wallet to Celo Mainnet";
  }
  if (/insufficient funds|exceeds balance|transfer amount exceeds/i.test(msg)) {
    return "Not enough USDC in this wallet on Celo";
  }
  if (/gas|fee.*too low|intrinsic gas/i.test(msg)) {
    return "Not enough CELO for gas — top up a little and retry";
  }
  if (/connector|no ethereum|no provider|provider not found|wallet not found/i.test(msg)) {
    return opts?.preferMiniPay
      ? "Open this page in MiniPay to connect"
      : "No wallet found — install MetaMask or open MiniPay";
  }
  if (/already pending|request already/i.test(msg)) {
    return "Check your wallet — a request is already waiting";
  }
  if (/timeout|timed out|network error|failed to fetch|fetch failed/i.test(msg)) {
    return "Network hiccup — check connection and try again";
  }
  if (/credit balance is too low|Anthropic|AI policy parsing|purchase credits/i.test(msg)) {
    return "AI parsing is offline (no Anthropic credits). Switch to Manual, or use clear percents + addresses like 30% to 0x… and 70% to 0x…";
  }
  if (/personal wallet/i.test(msg)) return msg;

  return msg.length > 120 ? `${msg.slice(0, 117)}…` : msg;
}

export function friendlyAppError(
  err: unknown,
  fallback = "Something went wrong",
  opts?: { preferMiniPay?: boolean },
): string {
  if (!(err instanceof Error) && typeof err !== "string") {
    return fallback;
  }
  const msg = err instanceof Error ? err.message : err;
  if (!msg?.trim()) return fallback;
  return friendlyWalletError(err, opts);
}

export function lowBalanceMessage(params: {
  need: bigint;
  have: bigint;
  hireFee?: bigint;
}): RemifiToastState {
  const need = formatUsdc(params.need.toString());
  const have = formatUsdc(params.have.toString());
  const hire =
    params.hireFee && params.hireFee > 0n
      ? formatUsdc(params.hireFee.toString())
      : null;

  return {
    kind: "err",
    title: "Low USDC balance",
    text: hire
      ? `Need $${need} (incl. $${hire} hire). You have $${have} on Celo.`
      : `Need $${need} USDC. You have $${have} on Celo.`,
  };
}

export function hireFeeShortfallMessage(hireFee: bigint): RemifiToastState {
  const fee = formatUsdc(hireFee.toString());
  return {
    kind: "err",
    title: "Not enough for hire fee",
    text: `Add more than $${fee} USDC on Celo, then try again.`,
  };
}

export function connectWalletMessage(opts?: {
  agentWallet?: boolean;
  forAction?: string;
}): RemifiToastState {
  if (opts?.agentWallet) {
    return {
      kind: "err",
      title: "Wrong wallet",
      text: "Disconnect the Remifi agent and connect your personal wallet",
    };
  }
  return {
    kind: "err",
    title: "Wallet needed",
    text: opts?.forAction
      ? `Connect a wallet with USDC on Celo to ${opts.forAction}`
      : "Connect a wallet with USDC on Celo to continue",
  };
}
