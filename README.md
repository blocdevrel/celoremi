# Remifi

**An AI agent that automates recurring payments and fund distributions on Celo.**

**Live:** · **Identity:** [ERC-8004 #9745](https://8004scan.io/agents/celo/9745) · **Marketplace:** [Aigora](https://aigora.org/services/42220_0x8004a169fb4a3325136eb29fa0ceb6d2e539a432_9745)

[![Hackathon](https://img.shields.io/badge/Celo-Agentic%20Payments%20%26%20DeFAI-FCFF52)](https://celobuilders.xyz)
[![Track 1](https://img.shields.io/badge/Track%201-Most%20Revenue%20Generated-000)](https://dune.com/celo/agentic-payments-defai-hackathon)
[![Track 2](https://img.shields.io/badge/Track%202-Most%20x402%20Payments-35D07F)](https://x402.celo.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

**Remifi** is an AI agent that lets users automate recurring payments and fund distributions. Funds are then split automatically based on a policy created by the user:

```
20% → Finance
20% → Management
60% → Operations
```

Perfect for payrolls, DAO treasury flows, bounty payouts, and automated subscriptions.

Create the policy once. Hire Remifi. Every recipient gets USDC on Celo with on-chain proof. Built for people on [MiniPay](https://docs.minipay.xyz) / web, and for other agents that need a composable payout leg via x402.

**Tracks:** Most Revenue Generated (primary) · Most x402 Payments (secondary) · Askbots · Aigora feedback

---

## How it works

```
1. Create a policy     →  who gets what (shares / roles)
2. Hire Remifi         →  fund the run with USDC
3. Auto-split          →  every recipient paid + proof on Celo
```

| Step | What you do | What you get |
|------|-------------|--------------|
| **Policy** | Set shares once (e.g. 20 / 20 / 60) | Reusable split rules |
| **Pay** | One hire / execute | Funds split to every recipient |
| **Proof** | Open the Proof tab | Tx hashes + Celoscan links |

Need a one-off send? Instant pay delivers in a single call. Prefer the phone wallet? Open the same app in MiniPay — it auto-connects.

---

## What you can hire

| Capability | For |
|------------|-----|
| Create policy | Multi-recipient split rules |
| Execute payroll | One hire → USDC to **all** recipients + proof |
| Instant USDC pay | Single-shot send to a wallet or name |
| Job proof | Status, tx hashes, Celoscan links |
| Health | Liveness + agent balance hint |

Hire via the [live app](https://remifi.up.railway.app), HTTP APIs, or x402. Every **Pay** / **Execute** settles an x402 hire (Track 2) then a tagged USDC transfer (Track 1).

---

## Demo (≤5 min)

1. **Hook** — *"Remifi is an AI agent for recurring payments and fund distributions."*
2. **Policy** — Set a 20 / 20 / 60 split → save policy.
3. **Execute** — One pay. USDC lands in every wallet.
4. **Proof** — Celoscan shows the transfers + attribution tag.
5. **Leaderboard** — Tagged volume on [Dune](https://dune.com/celo/agentic-payments-defai-hackathon).

---

## Quick start

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Copy vars from [`.env.example`](./.env.example) (attribution tag, agent wallet, database, optional x402 / Router). App: `http://localhost:3000`.

---

## Stack

Next.js · TypeScript · viem on **Celo** · USDC · ERC-8021 attribution · ERC-8004 identity · MiniPay · x402 · Neon Postgres

---

## Links

| | |
|---|---|
| **App** | https://remifi.up.railway.app |
| **8004scan** | https://8004scan.io/agents/celo/9745 |
| **Aigora** | https://aigora.org/services/42220_0x8004a169fb4a3325136eb29fa0ceb6d2e539a432_9745 |
| **Leaderboard** | https://dune.com/celo/agentic-payments-defai-hackathon |
| **Builders** | https://celobuilders.xyz |
| **Explorer** | https://celoscan.io |

## License

MIT — see [LICENSE](../LICENSE).
