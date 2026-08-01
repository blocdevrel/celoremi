"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address, WalletClient } from "viem";
import { readUsdcBalanceBaseUnits } from "../../../../lib/minipay/balance";
import { isMiniPayRuntime, isMobileDevice } from "../../../../lib/minipay/connect";
import { sendTaggedUsdcFromWallet } from "../../../../lib/minipay/wallet-payout";
import { computeSplitAmounts } from "../../../../lib/policy/validate";
import { fetchWithX402Hire } from "../../../../lib/x402/browser";
import { useMiniPayWallet } from "../../../hooks/useMiniPayWallet";
import { DEFAULT_MANUAL_RECIPIENTS, PROOF_PAGE_SIZE } from "../constants";
import type {
  Health,
  JobResult,
  ManualRecipient,
  ProofFilter,
  SavedPolicy,
  Tab,
} from "../types";
import { matchesProofFilter } from "../utils/jobs";
import {
  connectWalletMessage,
  friendlyAppError,
  friendlyWalletError,
  hireFeeShortfallMessage,
  lowBalanceMessage,
  type RemifiToastState,
} from "../utils/errors";
import { normalizePolicy, policyMatchesSearch, sortPoliciesNewestFirst, summarizePolicyRecipients } from "../utils/policy";
import { meaningfulRecipientLabel } from "@/lib/policy/labels";
import {
  clampSendAmountToReserve,
  formatUsdc,
  formatBaseUnitsForInput,
  maxSpendableAfterReserve,
  parseUsdcBaseUnits,
  parseUsdcHuman,
  reserveBeforeSend,
  usdcToBaseUnits,
} from "../utils/usdc";
import { shortAddr } from "../utils/address";

export function useRemifiApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [health, setHealth] = useState<Health | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<RemifiToastState | null>(null);
  const [lastJob, setLastJob] = useState<JobResult | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobResult[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsErr, setJobsErr] = useState<string | null>(null);
  const [proofFilter, setProofFilter] = useState<ProofFilter>("all");
  const [proofExpanded, setProofExpanded] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [savedPolicies, setSavedPolicies] = useState<SavedPolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<"payroll" | "create">("payroll");
  const [policyInputMode, setPolicyInputMode] = useState<"english" | "manual">(
    "english",
  );
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>(() =>
    DEFAULT_MANUAL_RECIPIENTS.map((recipient) => ({ ...recipient })),
  );
  const [policySearch, setPolicySearch] = useState("");
  const wallet = useMiniPayWallet();
  const walletIsAgent = Boolean(
    wallet.address &&
      health?.agentAddress &&
      wallet.address.toLowerCase() === health.agentAddress.toLowerCase(),
  );

  const [policyName, setPolicyName] = useState("");
  const [englishText, setEnglishText] = useState("");
  const [splitAmount, setSplitAmount] = useState("1.00");
  const [policyId, setPolicyId] = useState("");
  const [resolvedPreview, setResolvedPreview] = useState<string | null>(null);

  const [payTo, setPayTo] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState("1440");
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [activeSchedules, setActiveSchedules] = useState<
    Array<{
      scheduleId: string;
      policyId: string;
      policyName: string | null;
      amount: string;
      intervalMinutes: number;
      enabled: boolean;
      runCount: number;
      nextRunAt: string | null;
      lastError: string | null;
    }>
  >([]);
  const [walletUsdcBalance, setWalletUsdcBalance] = useState<string | null>(null);
  const [inMiniPay, setInMiniPay] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);

  useEffect(() => {
    setInMiniPay(isMiniPayRuntime());
    setIsMobile(isMobileDevice());
  }, []);

  const loadTelegramStatus = useCallback(async () => {
    if (!wallet.address || !health?.telegram?.enabled) {
      setTelegramLinked(false);
      setTelegramUsername(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/telegram/status?wallet=${encodeURIComponent(wallet.address)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) return;
      setTelegramLinked(Boolean(data.linked));
      setTelegramUsername(
        typeof data.username === "string" ? data.username : null,
      );
    } catch {
      /* ignore */
    }
  }, [wallet.address, health?.telegram?.enabled]);

  useEffect(() => {
    void loadTelegramStatus();
  }, [loadTelegramStatus]);

  async function connectTelegram() {
    if (!wallet.address) {
      setToast(connectWalletMessage({ forAction: "link your account for Telegram receipts" }));
      return;
    }
    if (!health?.telegram?.enabled) {
      setToast({
        kind: "err",
        title: "Telegram unavailable",
        text: "Telegram receipts aren’t configured on this Remifi deploy yet",
      });
      return;
    }
    setTelegramBusy(true);
    try {
      const res = await fetch("/api/telegram/link-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start Telegram link");
      const deepLink =
        typeof data.deepLink === "string"
          ? data.deepLink
          : typeof data.url === "string"
            ? data.url
            : null;
      if (deepLink) {
        window.open(deepLink, "_blank", "noopener,noreferrer");
      }
      setToast({
        kind: "info",
        title: "Confirm in Telegram",
        text: "Tap Start to link this Remifi account — the bot only delivers your receipts",
      });
      window.setTimeout(() => void loadTelegramStatus(), 4000);
    } catch (e) {
      setToast({
        kind: "err",
        title: "Couldn't link account",
        text: friendlyAppError(e, "Telegram link failed"),
      });
    } finally {
      setTelegramBusy(false);
    }
  }

  async function disconnectTelegram() {
    if (!wallet.address) return;
    setTelegramBusy(true);
    try {
      const res = await fetch("/api/telegram/link", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not unlink Telegram");
      setTelegramLinked(false);
      setTelegramUsername(null);
      setToast({
        kind: "ok",
        title: "Account unlinked",
        text: "This Remifi wallet won’t get Telegram receipts anymore",
      });
    } catch (e) {
      setToast({
        kind: "err",
        title: "Couldn't unlink",
        text: friendlyAppError(e, "Telegram unlink failed"),
      });
    } finally {
      setTelegramBusy(false);
    }
  }

  const loadWalletBalance = useCallback(async (): Promise<boolean> => {
    if (!wallet.address) {
      setWalletUsdcBalance(null);
      return false;
    }
    if (
      health?.agentAddress &&
      wallet.address.toLowerCase() === health.agentAddress.toLowerCase()
    ) {
      setWalletUsdcBalance(null);
      return false;
    }
    try {
      const res = await fetch(
        `/api/wallet/balance?address=${encodeURIComponent(wallet.address)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Balance lookup failed");
      }
      setWalletUsdcBalance(
        typeof data.balance === "string" ? data.balance : null,
      );
      return true;
    } catch {
      setWalletUsdcBalance(null);
      return false;
    }
  }, [wallet.address, health?.agentAddress]);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Health failed");
      setHealth(data);
      setHealthErr(null);
    } catch (e) {
      setHealthErr(e instanceof Error ? e.message : "Health failed");
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const loadRecentJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch("/api/jobs?limit=50", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load proof ledger");
      setRecentJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setJobsErr(null);
    } catch (e) {
      setJobsErr(e instanceof Error ? e.message : "Failed to load proof ledger");
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "status" || tab === "home") void loadRecentJobs();
  }, [tab, loadRecentJobs]);

  const loadSavedPolicies = useCallback(
    async (opts?: { silent?: boolean }): Promise<SavedPolicy[]> => {
      const isAgentWallet = Boolean(
        wallet.address &&
          health?.agentAddress &&
          wallet.address.toLowerCase() === health.agentAddress.toLowerCase(),
      );
      if (!wallet.address || isAgentWallet) {
        if (!opts?.silent) setSavedPolicies([]);
        return [];
      }
      if (!opts?.silent) setPoliciesLoading(true);
      try {
        const owner = encodeURIComponent(wallet.address);
        const res = await fetch(`/api/policies?owner=${owner}&limit=100`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load policies");
        const policies = sortPoliciesNewestFirst(
          (Array.isArray(data.policies) ? data.policies : [])
            .map(normalizePolicy)
            .filter((p: SavedPolicy | null): p is SavedPolicy => p !== null),
        );
        setSavedPolicies(policies);
        return policies;
      } catch (e) {
        if (!opts?.silent) {
          setToast({
            kind: "err",
            title: "Couldn't load policies",
            text: friendlyAppError(e, "Failed to load policies"),
          });
        }
        return [];
      } finally {
        if (!opts?.silent) setPoliciesLoading(false);
      }
    },
    [wallet.address, health?.agentAddress],
  );

  useEffect(() => {
    if (tab === "split" || tab === "home") void loadSavedPolicies();
  }, [tab, loadSavedPolicies, wallet.address]);

  useEffect(() => {
    if (wallet.address) void loadWalletBalance();
  }, [wallet.address, loadWalletBalance]);

  useEffect(() => {
    if (tab === "split" || tab === "pay") void loadWalletBalance();
  }, [tab, loadWalletBalance]);

  function formatBalanceLine(raw: string | null | undefined) {
    if (!raw) return "—";
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function hirePriceBaseUnits(): bigint {
    return health?.x402?.enabled && health.x402.hirePrice
      ? parseUsdcBaseUnits(health.x402.hirePrice)
      : 0n;
  }

  /** Reserved before send so x402 hire settle still has funds (and MiniPay gas pad). */
  function reserveBeforeSendBaseUnits(): bigint {
    return reserveBeforeSend(hirePriceBaseUnits(), {
      miniPay: inMiniPay || wallet.isMiniPay,
    });
  }

  /** Spendable after reserving hire (+ MiniPay pad) — Binance-style Max. */
  function maxSpendableBaseUnits(balanceBase?: bigint): bigint {
    const bal = balanceBase ?? parseUsdcHuman(walletUsdcBalance);
    return maxSpendableAfterReserve(bal, reserveBeforeSendBaseUnits());
  }

  async function refreshPayerUsdcBalance(): Promise<bigint> {
    if (!wallet.address || walletIsAgent) return 0n;
    try {
      const onChain = await readUsdcBalanceBaseUnits(wallet.address);
      const human = formatBaseUnitsForInput(onChain) || "0.00";
      setWalletUsdcBalance(human);
      return onChain;
    } catch {
      await loadWalletBalance();
      return parseUsdcHuman(walletUsdcBalance);
    }
  }

  async function applyMaxAmount(setter: (value: string) => void) {
    const bal = await refreshPayerUsdcBalance();
    if (bal <= 0n) {
      setToast(
        wallet.address
          ? {
              kind: "err",
              title: "No USDC yet",
              text: "This wallet has $0 USDC on Celo. Bridge or buy USDC, then retry.",
            }
          : connectWalletMessage({ forAction: "use Max" }),
      );
      return;
    }
    const reserve = reserveBeforeSendBaseUnits();
    const spendable = maxSpendableBaseUnits(bal);
    if (spendable <= 0n) {
      setToast(
        reserve > 0n
          ? hireFeeShortfallMessage(hirePriceBaseUnits() || reserve)
          : {
              kind: "err",
              title: "No USDC yet",
              text: "This wallet has $0 USDC on Celo. Bridge or buy USDC, then retry.",
            },
      );
      return;
    }
    const formatted = formatBaseUnitsForInput(spendable);
    if (formatted) setter(formatted);
  }

  async function requireConnectedPayer(): Promise<{
    client: WalletClient;
    account: Address;
  } | null> {
    if (!wallet.address || walletIsAgent) {
      setToast(
        connectWalletMessage({
          agentWallet: walletIsAgent,
          forAction: "pay",
        }),
      );
      return null;
    }
    const connected = await wallet.getWalletClient();
    if (!connected) {
      setToast(connectWalletMessage({ forAction: "pay" }));
      return null;
    }
    return connected;
  }

  /**
   * Ensures the payer can cover send amount + hire fee.
   * Clamps to balance − reserve (Binance Max) so x402 settle still has funds after the send.
   */
  async function ensureWalletFundedForPay(
    amountStr: string,
  ): Promise<string | null> {
    let amount = parseUsdcBaseUnits(amountStr);
    if (amount <= 0n) {
      setToast({
        kind: "err",
        title: "Enter an amount",
        text: "Add how much USDC to send, then try again",
      });
      return null;
    }
    const hirePrice = hirePriceBaseUnits();
    const reserve = reserveBeforeSendBaseUnits();

    if (!wallet.address || walletIsAgent) {
      setToast(
        connectWalletMessage({
          agentWallet: walletIsAgent,
          forAction: "pay",
        }),
      );
      return null;
    }

    const userBal = await refreshPayerUsdcBalance();
    amount = clampSendAmountToReserve(amount, userBal, reserve);

    if (amount <= 0n) {
      setToast(
        hirePrice > 0n || reserve > 0n
          ? hireFeeShortfallMessage(hirePrice || reserve)
          : {
              kind: "err",
              title: "No USDC yet",
              text: "This wallet has $0 USDC on Celo. Bridge or buy USDC, then retry.",
            },
      );
      return null;
    }

    if (amount + reserve > userBal) {
      setToast(
        lowBalanceMessage({
          need: amount + reserve,
          have: userBal,
          hireFee: hirePrice > 0n ? hirePrice : undefined,
        }),
      );
      return null;
    }

    if (!health?.attributionTag) {
      setToast({
        kind: "err",
        title: "Remifi unavailable",
        text: "Attribution isn’t configured yet. Refresh and try again shortly.",
      });
      return null;
    }

    return amount.toString();
  }

  /** Auto payroll runs server-side from the agent wallet — fund it first. */
  async function ensureAgentFundedForAutoPay(amountStr: string): Promise<boolean> {
    const amount = parseUsdcBaseUnits(amountStr);
    if (amount <= 0n) {
      setToast({
        kind: "err",
        title: "Enter an amount",
        text: "Add how much USDC each auto run should send",
      });
      return false;
    }
    const hirePrice =
      health?.x402?.enabled && health.x402.hirePrice
        ? parseUsdcBaseUnits(health.x402.hirePrice)
        : 0n;
    const agentBal = parseUsdcBaseUnits(health?.usdcBalance);
    const agentNeed = amount + hirePrice;

    if (agentBal >= agentNeed) return true;

    if (!wallet.address || walletIsAgent) {
      setToast({
        kind: "err",
        title: "Fund the agent first",
        text: "Auto payroll pays from Remifi’s agent wallet. Connect yours to top it up.",
      });
      return false;
    }

    const agent = health?.agentAddress as Address | undefined;
    if (!agent) {
      setToast({
        kind: "err",
        title: "Remifi unavailable",
        text: "Couldn’t reach the agent. Refresh and try again.",
      });
      return false;
    }

    const deficit = agentNeed - agentBal;
    try {
      setToast({
        kind: "info",
        title: "Funding agent",
        text: `Confirm $${formatUsdc(deficit.toString())} USDC to Remifi for auto payroll`,
      });
      await wallet.fundAgent(agent, deficit);
      const funded = await readUsdcBalanceBaseUnits(agent);
      if (funded < agentNeed) {
        setToast(
          lowBalanceMessage({
            need: agentNeed,
            have: funded,
            hireFee: hirePrice > 0n ? hirePrice : undefined,
          }),
        );
        return false;
      }
      await loadHealth();
      return true;
    } catch (e) {
      setToast({
        kind: "err",
        title: "Funding cancelled",
        text: friendlyWalletError(e, { preferMiniPay: useMiniPayLink }),
      });
      return false;
    }
  }

  async function sendWalletSplitPayments(params: {
    policyId: string;
    amount: string;
    connected: { client: WalletClient; account: Address };
  }): Promise<
    | { mode: "router"; fundTxHash: string }
    | {
        mode: "direct";
        transfers: Array<{
          to: string;
          amount: string;
          txHash: string;
          explorer: string;
          label?: string;
        }>;
      }
  > {
    const policyRes = await fetch(
      `/api/policies/${params.policyId}?owner=${encodeURIComponent(params.connected.account)}`,
      { cache: "no-store" },
    );
    const policy = await policyRes.json();
    if (!policyRes.ok) {
      throw new Error(policy.error || "Policy not found");
    }

    const legs = computeSplitAmounts(
      policy.recipients,
      BigInt(params.amount),
    ).filter((leg) => leg.amount > 0n);

    const tag = health?.attributionTag;
    if (!tag) throw new Error("Attribution tag not configured");

    const routerAddress = health?.router?.address as Address | undefined;
    const useRouter =
      legs.length > 1 &&
      Boolean(health?.router?.configured && health.router.ok && routerAddress);

    // Multi-recipient: one wallet signature → fund Router; agent executeSplit pays everyone
    if (useRouter && routerAddress) {
      setToast({
        kind: "info",
        title: "Confirm in wallet",
        text: `One USDC transfer covers ${legs.length} recipients`,
      });
      const fundTxHash = await sendTaggedUsdcFromWallet({
        client: params.connected.client,
        account: params.connected.account,
        to: routerAddress,
        amountBaseUnits: BigInt(params.amount),
        attributionTag: tag,
      });
      return { mode: "router", fundTxHash };
    }

    const transfers: Array<{
      to: string;
      amount: string;
      txHash: string;
      explorer: string;
      label?: string;
    }> = [];

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]!;
      setToast({
        kind: "info",
        title: "Confirm in wallet",
        text:
          legs.length > 1
            ? `Approve transfer ${i + 1} of ${legs.length}`
            : "Approve the USDC transfer",
      });
      const txHash = await sendTaggedUsdcFromWallet({
        client: params.connected.client,
        account: params.connected.account,
        to: leg.address,
        amountBaseUnits: leg.amount,
        attributionTag: tag,
      });
      transfers.push({
        to: leg.address,
        amount: leg.amount.toString(),
        txHash,
        explorer: `https://celoscan.io/tx/${txHash}`,
        ...(leg.label ? { label: leg.label } : {}),
      });
    }

    return { mode: "direct", transfers };
  }

  function x402HireConfig(resource: string) {
    if (!health?.x402?.enabled || !health.x402.payTo || !health.usdc) {
      return null;
    }
    return {
      resource,
      payTo: health.x402.payTo,
      hirePrice: health.x402.hirePrice,
      usdcAddress: health.usdc,
    };
  }

  async function postWithX402Hire(
    resource: string,
    body: Record<string, unknown>,
  ) {
    const connected = wallet.address ? await wallet.getWalletClient() : null;
    return fetchWithX402Hire(
      resource,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
      connected,
      x402HireConfig(resource),
    );
  }

  function recipientsToText(
    recipients: Array<{ address: string; bps: number; label?: string }>,
  ) {
    const parts = recipients.map((r) => {
      const pct =
        r.bps % 100 === 0 ? String(r.bps / 100) : (r.bps / 100).toFixed(2);
      const purpose = meaningfulRecipientLabel(r.label);
      const who = purpose ? `${purpose} (${r.address})` : r.address;
      return `${pct}% to ${who}`;
    });
    return `Split ${parts.join(" and ")}`;
  }

  function selectPolicy(policy: SavedPolicy) {
    setPolicyId(policy.policyId);
    setPolicyName(policy.name?.trim() || "Team payroll");
    setEnglishText(recipientsToText(policy.recipients));
    setResolvedPreview(summarizePolicyRecipients(policy.recipients));
  }

  function resetPolicyDraft() {
    setPolicyId("");
    setResolvedPreview(null);
    setPolicyName("");
    setEnglishText("");
    setManualRecipients(
      DEFAULT_MANUAL_RECIPIENTS.map((recipient) => ({ ...recipient })),
    );
    setPolicyInputMode("english");
  }

  function updateManualRecipient(
    index: number,
    field: "address" | "bps" | "label",
    value: string,
  ) {
    setManualRecipients((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
    if (policyId) setPolicyId("");
  }

  function addManualRecipient() {
    setManualRecipients((rows) => [...rows, { address: "", bps: "", label: "" }]);
    if (policyId) setPolicyId("");
  }

  function removeManualRecipient(index: number) {
    setManualRecipients((rows) =>
      rows.length <= 1 ? rows : rows.filter((_, i) => i !== index),
    );
    if (policyId) setPolicyId("");
  }

  useEffect(() => {
    if (!toast) return;
    const ms = toast.kind === "err" ? 5600 : toast.kind === "info" ? 9000 : 3800;
    const id = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!wallet.error) return;
    setToast({
      kind: "err",
      title: "Couldn't connect",
      text: friendlyWalletError(wallet.error, {
        preferMiniPay: isMobileDevice() && !isMiniPayRuntime(),
      }),
    });
  }, [wallet.error]);

  const jsonHeaders: HeadersInit = { "content-type": "application/json" };

  async function savePolicy(): Promise<string | null> {
    setToast(null);
    setBusy(true);
    setResolvedPreview(null);
    try {
      if (!wallet.address) {
        throw new Error("Connect a wallet with USDC on Celo to save a policy");
      }
      const isAgentWallet = Boolean(
        health?.agentAddress &&
          wallet.address.toLowerCase() === health.agentAddress.toLowerCase(),
      );
      if (isAgentWallet) {
        throw new Error(
          "Disconnect the Remifi agent and connect your personal wallet",
        );
      }

      let body: Record<string, unknown>;

      if (policyInputMode === "english") {
        if (!englishText.trim()) {
          throw new Error("Describe who gets what in plain English");
        }
        body = {
          ownerAddress: wallet.address,
          text: englishText.trim(),
          name: policyName.trim() || undefined,
        };
      } else {
        const rows = manualRecipients.filter((r) => r.address.trim());
        if (rows.length === 0) {
          throw new Error("Add at least one recipient address");
        }
        const recipients = rows.map((r) => {
          const pct = Number(r.bps);
          if (!Number.isFinite(pct) || pct <= 0) {
            throw new Error("Each share must be a positive percent");
          }
          return {
            address: r.address.trim(),
            bps: Math.round(pct * 100),
            ...(r.label.trim() ? { label: r.label.trim() } : {}),
          };
        });
        const totalBps = recipients.reduce((sum, r) => sum + r.bps, 0);
        if (totalBps !== 10_000) {
          throw new Error(
            `Shares must add up to 100% (now ${totalBps / 100}%)`,
          );
        }
        body = {
          ownerAddress: wallet.address,
          name: policyName.trim() || undefined,
          recipients,
        };
      }

      const policyRes = await fetch("/api/policies", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });
      const policy = await policyRes.json();
      if (!policyRes.ok) throw new Error(policy.error || "Couldn't save policy");

      const id = String(policy.policyId);
      const savedRecipients = Array.isArray(policy.recipients)
        ? (policy.recipients as SavedPolicy["recipients"])
        : [];

      const saved =
        normalizePolicy({
          policyId: id,
          name: (policy.name ?? policyName.trim()) || null,
          recipients: savedRecipients,
          createdAt: policy.createdAt,
          updatedAt: policy.createdAt,
        }) ??
        ({
          policyId: id,
          name: policyName.trim() || null,
          recipients: savedRecipients,
          createdAt: policy.createdAt,
          updatedAt: policy.createdAt,
        } satisfies SavedPolicy);

      setSavedPolicies((prev) =>
        sortPoliciesNewestFirst([
          saved,
          ...prev.filter((p) => p.policyId !== id),
        ]),
      );
      setPolicySearch("");
      selectPolicy(saved);
      setSplitMode("payroll");
      setToast({
        kind: "ok",
        title: "Policy saved",
        text: `${saved.name?.trim() || "Split"} is ready — enter an amount and hire Remifi`,
      });
      const fresh = await loadSavedPolicies({ silent: true });
      const match = fresh.find((p) => p.policyId === id);
      if (match) selectPolicy(match);
      return id;
    } catch (e) {
      setToast({
        kind: "err",
        title: "Couldn't save policy",
        text: friendlyAppError(e, "Policy create failed", {
          preferMiniPay: useMiniPayLink,
        }),
      });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function executePayroll(existingId?: string) {
    setToast(null);
    setBusy(true);
    try {
      const id = (existingId ?? policyId).trim();
      if (!id) {
        throw new Error("Create or select a policy before running payroll");
      }
      const rawAmount = usdcToBaseUnits(splitAmount);
      if (!rawAmount || rawAmount === "0") {
        throw new Error("Enter how much USDC to split");
      }
      const amount = await ensureWalletFundedForPay(rawAmount);
      if (!amount) return;
      if (amount !== rawAmount) {
        const clamped = formatBaseUnitsForInput(BigInt(amount));
        if (clamped) setSplitAmount(clamped);
      }

      const connected = await requireConnectedPayer();
      if (!connected) return;

      const payout = await sendWalletSplitPayments({
        policyId: id,
        amount,
        connected,
      });

      setToast({
        kind: "info",
        title: "Settling payroll",
        text: "Hiring Remifi and recording on-chain proof…",
      });
      const execRes = await postWithX402Hire("/api/execute/wallet", {
        policyId: id,
        amount,
        payer: connected.account,
        ...(payout.mode === "router"
          ? { fundTxHash: payout.fundTxHash }
          : {
              transfers: payout.transfers.map(
                ({ to, amount: legAmount, txHash }) => ({
                  to,
                  amount: legAmount,
                  txHash,
                }),
              ),
            }),
        clientJobId: `ui-${Date.now()}`,
      });
      const job = await execRes.json();
      if (!execRes.ok) throw new Error(job.error || "Payroll settlement failed");

      setLastJob(job);
      setToast({
        kind: "ok",
        title: "Payroll sent",
        text: `$${formatUsdc(amount)} USDC split and settled on Celo`,
      });
      setTab("status");
      void loadHealth();
      void loadWalletBalance();
      void loadRecentJobs();
    } catch (e) {
      setToast({
        kind: "err",
        title: "Payroll didn't finish",
        text: friendlyAppError(e, "Execute failed", {
          preferMiniPay: useMiniPayLink,
        }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadSchedules() {
    if (!wallet.address) {
      setActiveSchedules([]);
      return;
    }
    setSchedulesLoading(true);
    try {
      const owner = encodeURIComponent(wallet.address);
      const res = await fetch(`/api/schedules?owner=${owner}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load schedules");
      setActiveSchedules(Array.isArray(data.schedules) ? data.schedules : []);
    } catch {
      setActiveSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "split" && splitMode === "payroll") void loadSchedules();
  }, [tab, splitMode, wallet.address]);

  async function disableAutoPayroll(scheduleId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scheduleId, enabled: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not turn off auto payroll");
      setToast({
        kind: "ok",
        title: "Auto payroll off",
        text: "Scheduled runs are paused for this policy",
      });
      void loadSchedules();
    } catch (e) {
      setToast({
        kind: "err",
        title: "Couldn't update schedule",
        text: friendlyAppError(e, "Could not turn off auto payroll"),
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutoPayroll(next: boolean) {
    if (!policyId.trim()) {
      setToast({
        kind: "err",
        title: "Pick a policy",
        text: "Select a saved split before turning on auto payroll",
      });
      return;
    }
    const existing = activeSchedules.find(
      (s) => s.policyId === policyId.trim() && s.enabled,
    );
    if (next) {
      if (existing) return;
      await enableAutoPayroll();
      return;
    }
    if (existing) await disableAutoPayroll(existing.scheduleId);
  }

  async function enableAutoPayroll() {
    if (!policyId.trim()) {
      setToast({
        kind: "err",
        title: "Pick a policy",
        text: "Select a saved split before turning on auto payroll",
      });
      return;
    }
    const amount = usdcToBaseUnits(splitAmount);
    if (!amount || amount === "0") {
      setToast({
        kind: "err",
        title: "Enter an amount",
        text: "Set how much USDC each auto run should send",
      });
      return;
    }
    if (!(await ensureAgentFundedForAutoPay(amount))) return;

    setBusy(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerAddress: wallet.address,
          policyId: policyId.trim(),
          amount,
          intervalMinutes: Number(scheduleInterval),
          name:
            savedPolicies.find((p) => p.policyId === policyId.trim())?.name?.trim() ||
            "Auto payroll",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Schedule create failed");
      setToast({
        kind: "ok",
        title: "Auto payroll on",
        text: "Remifi will run this split on your cadence",
      });
      void loadSchedules();
    } catch (e) {
      setToast({
        kind: "err",
        title: "Couldn't enable auto payroll",
        text: friendlyAppError(e, "Schedule create failed"),
      });
    } finally {
      setBusy(false);
    }
  }

  async function payPayroll() {
    const amount = usdcToBaseUnits(splitAmount);
    if (!amount || amount === "0") {
      setToast({
        kind: "err",
        title: "Enter an amount",
        text: "Add how much USDC to split across recipients",
      });
      return;
    }
    const id = policyId.trim();
    if (!id) {
      setToast({
        kind: "err",
        title: "Pick a policy",
        text: "Select or create a split policy first",
      });
      return;
    }
    await executePayroll(id);
  }

  async function instantPay() {
    setToast(null);
    setBusy(true);
    try {
      const rawAmount = usdcToBaseUnits(payAmount);
      if (!rawAmount || rawAmount === "0") {
        throw new Error("Enter how much USDC to send");
      }
      if (!payTo.trim()) {
        throw new Error("Add a recipient — 0x address, ENS, or Base name");
      }
      const amount = await ensureWalletFundedForPay(rawAmount);
      if (!amount) return;
      if (amount !== rawAmount) {
        const clamped = formatBaseUnitsForInput(BigInt(amount));
        if (clamped) setPayAmount(clamped);
      }

      const connected = await requireConnectedPayer();
      if (!connected) return;

      const resolveRes = await fetch("/api/ens/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: payTo.trim() }),
      });
      const resolved = await resolveRes.json();
      const hit = resolved.results?.[0];
      if (!resolveRes.ok || !hit?.resolved) {
        throw new Error(hit?.error || "Couldn't resolve that recipient");
      }

      setToast({
        kind: "info",
        title: "Confirm in wallet",
        text: `Send $${formatUsdc(amount)} USDC to ${
          hit.ens
            ? shortAddr(hit.ens)
            : shortAddr(hit.address || hit.input || "recipient")
        }`,
      });
      const txHash = await sendTaggedUsdcFromWallet({
        client: connected.client,
        account: connected.account,
        to: hit.address as Address,
        amountBaseUnits: BigInt(amount),
        attributionTag: health!.attributionTag!,
      });

      setToast({
        kind: "info",
        title: "Hiring Remifi",
        text: "Settling the hire fee and recording proof…",
      });
      const res = await postWithX402Hire("/api/pay/wallet", {
        to: hit.address,
        amount,
        payer: connected.account,
        txHash,
      });
      const job = await res.json();
      if (!res.ok) throw new Error(job.error || "Send failed");

      setLastJob({
        ...job,
        totalAmount: job.amount,
        transfers: job.transfers ?? [
          {
            to: job.to,
            amount: job.amount,
            txHash: job.txHash,
            explorer: job.explorer,
          },
        ],
      });
      setToast({
        kind: "ok",
        title: "Sent",
        text: `Remifi delivered $${formatUsdc(job.amount)} USDC on Celo`,
      });
      setTab("status");
      void loadHealth();
      void loadWalletBalance();
      void loadRecentJobs();
    } catch (e) {
      setToast({
        kind: "err",
        title: "Send didn't finish",
        text: friendlyAppError(e, "Pay failed", {
          preferMiniPay: useMiniPayLink,
        }),
      });
    } finally {
      setBusy(false);
    }
  }

  const filteredJobs = recentJobs.filter((job) => matchesProofFilter(job, proofFilter));
  const visibleJobs = proofExpanded
    ? filteredJobs
    : filteredJobs.slice(0, PROOF_PAGE_SIZE);
  const hiddenJobCount = Math.max(0, filteredJobs.length - visibleJobs.length);

  const useMiniPayLink = isMobile && !inMiniPay;

  const filteredPolicies = useMemo(() => {
    const sorted = sortPoliciesNewestFirst(savedPolicies);
    if (!policySearch.trim()) return sorted;
    return sorted.filter((p) => policyMatchesSearch(p, policySearch));
  }, [savedPolicies, policySearch]);

  const selectedPolicy = useMemo(
    () => savedPolicies.find((p) => p.policyId === policyId) ?? null,
    [savedPolicies, policyId],
  );

  const autoPayrollSchedule = useMemo(
    () =>
      activeSchedules.find((s) => s.policyId === policyId && s.enabled) ?? null,
    [activeSchedules, policyId],
  );

  useEffect(() => {
    if (autoPayrollSchedule) {
      setScheduleInterval(String(autoPayrollSchedule.intervalMinutes));
    }
  }, [autoPayrollSchedule]);

  useEffect(() => {
    if (tab !== "split" || splitMode !== "payroll" || policiesLoading) return;

    const visible = filteredPolicies;
    const selectedVisible = policyId
      ? visible.some((p) => p.policyId === policyId)
      : false;

    if (policyId && !savedPolicies.some((p) => p.policyId === policyId)) {
      if (visible[0]) selectPolicy(visible[0]);
      else setPolicyId("");
      return;
    }

    if (!policyId && visible[0]) {
      selectPolicy(visible[0]);
    } else if (policyId && !selectedVisible && visible[0]) {
      selectPolicy(visible[0]);
    }
  }, [
    tab,
    splitMode,
    policiesLoading,
    policyId,
    filteredPolicies,
    savedPolicies,
  ]);
  return {
    tab, setTab, health, healthErr, busy, toast, setToast, lastJob,
    recentJobs, jobsLoading, jobsErr, proofFilter, setProofFilter,
    proofExpanded, setProofExpanded, faqOpen, setFaqOpen, savedPolicies,
    policiesLoading, splitMode, setSplitMode, policyInputMode,
    setPolicyInputMode, manualRecipients, policySearch, setPolicySearch,
    wallet, policyName, setPolicyName, englishText, setEnglishText,
    splitAmount, setSplitAmount, policyId, setPolicyId, resolvedPreview,
    payTo, setPayTo, payAmount, setPayAmount, scheduleInterval,
    setScheduleInterval, schedulesLoading, activeSchedules,
    walletUsdcBalance, inMiniPay, isMobile, loadRecentJobs,
    formatBalanceLine, hirePriceBaseUnits, maxSpendableBaseUnits, applyMaxAmount, selectPolicy,
    resetPolicyDraft, updateManualRecipient, addManualRecipient,
    removeManualRecipient, savePolicy, payPayroll, toggleAutoPayroll,
    instantPay, filteredJobs, visibleJobs, hiddenJobCount, walletIsAgent,
    filteredPolicies, selectedPolicy, autoPayrollSchedule,
    telegramLinked, telegramUsername, telegramBusy, connectTelegram,
    disconnectTelegram, loadTelegramStatus,
  };
}

export type RemifiAppModel = ReturnType<typeof useRemifiApp>;
