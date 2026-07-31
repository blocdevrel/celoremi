import type { ProofFilter, Tab } from "./types";

export const PROTOCOL_LOGOS = [
  { name: "Celo", src: "/assets/protocols/celo.png", kind: "mark" },
  { name: "USDC", src: "/assets/protocols/usdc-token.png", kind: "mark" },
  { name: "MiniPay", src: "/assets/protocols/minipay-icon.svg", kind: "mark" },
  { name: "x402", src: "/assets/protocols/x402.svg", kind: "wordmark" },
] as const;

export const HOME_FAQS = [
  {
    q: "What is Remifi?",
    a: "Remifi is an AI agent that lets you automate recurring payments and fund distributions. You create a policy once, hire the agent, and funds are split automatically to every recipient with on-chain proof on Celo.",
  },
  {
    q: "How do fund splits work?",
    a: "You create a policy once, for example 20% Finance, 20% Management, 60% Operations. When you hire Remifi and fund a run, it splits USDC to those recipients based on your shares.",
  },
  {
    q: "What are ENS subnames used for?",
    a: "ENS and Base names map roles to wallets, so policies stay readable. Point finance.yourdao.eth or ops.team.eth at the right address and Remifi pays that wallet when the policy runs.",
  },
  {
    q: "What can I use Remifi for?",
    a: "Payrolls, DAO treasury flows, bounty payouts, and automated subscriptions. Humans or other agents can hire Remifi to execute the same policy.",
  },
  {
    q: "How do I hire the agent?",
    a: "Open Remifi in MiniPay and your wallet auto-connects — transactions are gas-free on Celo. Or connect any wallet with USDC on Celo. Pick or create a policy, enter an amount, and pay. Remifi takes a small x402 hire fee, then executes the split with tagged on-chain proof.",
  },
] as const;

export const TABS: Array<[Tab, string]> = [
  ["home", "Home"],
  ["split", "Policy"],
  ["pay", "Send"],
  ["status", "Proof"],
];

export const PROOF_FILTERS: Array<{ id: ProofFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "sends", label: "Sends" },
  { id: "splits", label: "Splits" },
  { id: "x402", label: "x402" },
];

export const PROOF_PAGE_SIZE = 6;

/** Example copy for placeholders — not prefilled into inputs. */
export const DEFAULT_POLICY_NAME = "Team payroll";

export const DEFAULT_ENGLISH_POLICY =
  "Split 20% to Finance at finance.yourdao.eth, 20% to Management at management.yourdao.eth, and 60% to Operations at ops.yourdao.eth";

export const DEFAULT_MANUAL_RECIPIENTS = [
  { address: "", bps: "20", label: "Finance" },
  { address: "", bps: "20", label: "Management" },
  { address: "", bps: "60", label: "Operations" },
] as const;
