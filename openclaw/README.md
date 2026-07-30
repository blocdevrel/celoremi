# Remifi × OpenClaw

OpenClaw runs the **always-on money heartbeat**. Remifi typed code still moves USDC.
Telegram user receipts stay on Remifi's Bot API webhook — **do not** give `@RemifismcBot`
(or your bot token) to OpenClaw channels.

## Layout

| Path | Role |
|------|------|
| `HEARTBEAT.md` | Guardians the agent follows each cycle |
| `skills/remifi-core/` | Typed scripts: health-check → run-due |
| `config/openclaw.config.example.jsonc` | Example gateway agent defaults |

## What each cycle does

1. **Guardian 1:** `npx tsx openclaw/skills/remifi-core/scripts/health-check.ts`
2. **Guardian 2:** `npx tsx openclaw/skills/remifi-core/scripts/run-due.ts`  
   (= `npm run heartbeat` → `runDueSchedules()`: Auto payroll + x402 burst + receipt flush)

## Local setup

1. OpenClaw installed (`openclaw --version`).
2. Point the agent workspace at this folder (absolute path), e.g. in config:

   ```json
   "workspace": "C:/Users/you/OneDrive/Desktop/celoremi/celoremi/openclaw"
   ```

3. Enable skill `remifi-core` and heartbeat `every: "20m"`.
4. Ensure Remifi `.env` is loadable from the repo root (same secrets as Railway).
5. Restart the gateway: `openclaw gateway restart` (or your host's service).

Manual one-shot (no LLM):

```bash
cd celoremi
npx tsx openclaw/skills/remifi-core/scripts/health-check.ts
npx tsx openclaw/skills/remifi-core/scripts/run-due.ts
# or: npm run heartbeat
```

## Production notes

- OpenClaw needs an **always-on host** (VPS, your PC with gateway service, etc.).
  Railway cron can still call `POST /api/schedules/heartbeat` as a backup; prefer
  one primary driver to avoid double-runs (idempotent schedules help, but don't double-fire).
- Keep `HEARTBEAT_SCHEDULES_ENABLED` / `X402_TRAFFIC_*` as today.
- Telegram: Remifi webhook only.

## Split of duties

| Concern | Owner |
|---------|--------|
| Due payroll + x402 hire settle | Remifi `lib/schedules/heartbeat.ts` |
| Wake every ~20m + guardians | OpenClaw |
| User Telegram receipts | Remifi `/api/telegram/*` |
| Operator chat (optional) | OpenClaw channel of your choice — not the Remifi bot |
