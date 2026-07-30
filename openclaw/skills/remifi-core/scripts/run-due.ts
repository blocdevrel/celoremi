/**
 * OpenClaw Guardian 2 — run due Auto payroll + x402 traffic burst.
 * Same path as `npm run heartbeat`.
 * Usage (from repo root): npx tsx openclaw/skills/remifi-core/scripts/run-due.ts
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../../../");
for (const file of [".env.local", ".env"]) {
  const p = resolve(root, file);
  if (existsSync(p)) loadEnv({ path: p, override: false });
}

async function main() {
  process.chdir(root);
  const { runDueSchedules } = await import("../../../../lib/schedules/heartbeat");
  const result = await runDueSchedules();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
