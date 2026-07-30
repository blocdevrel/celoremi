---
name: remifi-core
description: >
  Remifi money heartbeat. Use on every OpenClaw cycle to health-check Celo /
  agent / x402, then run due Auto payroll schedules and the x402 traffic burst
  via typed scripts (never raw model txs).
---

# remifi-core

## Purpose

OpenClaw orchestrates; Remifi typed code moves money. This skill wraps the same
path as `npm run heartbeat` / `POST /api/schedules/heartbeat`.

## When to use

- Every OpenClaw heartbeat (Guardian 1 then Guardian 2 in `HEARTBEAT.md`).
- Manual ops: run `run-due.ts` once to drain due schedules.

## Scripts

- `scripts/health-check.ts` — blocking preflight (RPC, agent, USDC, x402, router).
  Exit code 0 only when safe to move money.
- `scripts/run-due.ts` — runs `runDueSchedules()` (due Auto payroll + x402 burst +
  Telegram receipt flush). Prints JSON summary to stdout.

## Guardrails

- Never invent transfer calldata. Always call these scripts.
- If health-check fails, do not call `run-due.ts`.
- Telegram user receipts stay on Remifi's webhook; do not reconfigure the bot
  channel inside OpenClaw.

## Outputs

- `health-check.ts`: JSON health snapshot; non-zero exit on failure.
- `run-due.ts`: JSON `{ due, completed, failed, x402Traffic, ... }`.
