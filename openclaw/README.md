# Remifi × OpenClaw

OpenClaw runs the **always-on money heartbeat**. Remifi typed code still moves USDC.
Telegram user receipts stay on Remifi's Bot API webhook — **do not** give your Remifi
bot token to OpenClaw channels.

## Layout

| Path | Role |
|------|------|
| `HEARTBEAT.md` | Guardians (also copied into `~/.openclaw/workspace/`) |
| `skills/remifi-core/` | Typed scripts: health-check → run-due |
| `config/openclaw.config.example.jsonc` | Example gateway agent defaults |
| `../scripts/openclaw-tick.ts` | Windows-safe single entry (health + due) |
| `../scripts/wire-openclaw-cron.mjs` | Creates/updates the OpenClaw cron job |

## Wired on this machine (local gateway)

1. Skill `remifi-core` → `~/.openclaw/workspace/skills/remifi-core`
2. `agents.defaults.heartbeat.every` = `20m` (target `none`, Remifi prompt)
3. Cron **`remifi-heartbeat`** every **20m** → `npm.cmd run openclaw:tick`
4. Gateway on `127.0.0.1:18789` (connectivity ok)

Re-wire after path changes:

```bash
node scripts/wire-openclaw-cron.mjs
```

Manual one-shot:

```bash
npm run openclaw:tick
openclaw cron run <job-id>
```

## What each cycle does

1. Health-check against `NEXT_PUBLIC_APP_URL/api/health` (or local RPC)
2. `runDueSchedules()` — due Auto payroll + x402 burst + Telegram receipt flush

## Split of duties

| Concern | Owner |
|---------|--------|
| Due payroll + x402 hire settle | Remifi `lib/schedules/heartbeat.ts` |
| Wake every ~20m | OpenClaw cron `remifi-heartbeat` (+ optional agent heartbeat) |
| User Telegram receipts | Remifi `/api/telegram/*` |
| Operator chat (optional) | OpenClaw channel of your choice — not the Remifi bot |

## Production note

Keep one primary driver. Prefer OpenClaw cron on an always-on host; treat Railway
`POST /api/schedules/heartbeat` as backup only to avoid double-fires.
