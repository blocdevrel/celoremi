/**
 * OpenClaw money tick: health-check then run-due (Windows-safe single entry).
 * Usage: npm run openclaw:tick
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.env.REMIFI_ROOT || resolve(__dirname, "..");
process.chdir(root);
process.env.REMIFI_ROOT = root;

function run(scriptRel: string): void {
  const script = resolve(root, scriptRel);
  const r = spawnSync(
    process.execPath,
    [require.resolve("tsx/cli"), script],
    { stdio: "inherit", env: process.env, cwd: root },
  );
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

run("openclaw/skills/remifi-core/scripts/health-check.ts");
run("openclaw/skills/remifi-core/scripts/run-due.ts");
