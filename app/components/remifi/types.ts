export type Tab = "home" | "split" | "pay" | "status";
export type ProofFilter = "all" | "sends" | "splits" | "x402";
export type SplitMode = "payroll" | "create";
export type PolicyInputMode = "english" | "manual";
export type ToastState = { kind: "ok" | "err"; text: string } | null;

export type Health = {
  ok: boolean;
  agentAddress: string | null;
  usdcBalance: string | null;
  usdcBalanceFormatted: string | null;
  usdc?: string;
  chainOk: boolean;
  mockPayout: boolean;
  payrollMode: string;
  attributionTagConfigured: boolean;
  attributionTag?: string | null;
  x402: {
    enabled: boolean;
    payTo: string | null;
    hirePrice: string;
    facilitatorOk: boolean | null;
  };
  router: {
    configured: boolean;
    ok?: boolean | null;
    address?: string | null;
  };
  telegram?: {
    enabled: boolean;
  };
};

export type SavedPolicy = {
  policyId: string;
  name: string | null;
  recipients: Array<{ address: string; bps: number; label?: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export type ManualRecipient = {
  address: string;
  bps: string;
  label: string;
};

export type ActiveSchedule = {
  id: string;
  policyId: string;
  intervalMinutes: number;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

export type JobTransfer = {
  to: string;
  amount: string;
  txHash?: string;
  explorer?: string;
  label?: string;
};

export type JobResult = {
  jobId?: string;
  status?: string;
  totalAmount?: string;
  amount?: string;
  to?: string;
  txHash?: string;
  explorer?: string;
  hireMode?: string;
  kind?: string;
  settlement?: string | null;
  policyName?: string | null;
  x402SettlementTxHash?: string | null;
  x402Explorer?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  transfers?: JobTransfer[];
  error?: string;
  policyId?: string;
};
