/**
 * Wire Remifi money heartbeat into local OpenClaw cron (every 20m).
 * Usage: node scripts/wire-openclaw-cron.mjs
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, "..");
const oc = resolve(
  process.env.APPDATA || "",
  "npm/node_modules/openclaw/openclaw.mjs",
);

function run(args) {
  console.log(">", "node", "openclaw.mjs", ...args);
  const r = spawnSync(process.execPath, [oc, ...args], {
    stdio: "inherit",
    cwd: repo,
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Clear existing remifi-heartbeat jobs
const listed = spawnSync(
  process.execPath,
  [oc, "cron", "list", "--all", "--json"],
  { encoding: "utf8", env: process.env },
);
try {
  const data = JSON.parse(listed.stdout || "{}");
  for (const job of data.jobs || []) {
    if (job.name === "remifi-heartbeat") {
      run(["cron", "rm", job.id]);
    }
  }
} catch {
  /* ignore */
}

const argv = JSON.stringify([
  "cmd.exe",
  "/c",
  "npm.cmd run openclaw:tick",
]);

run([
  "cron",
  "add",
  "--name",
  "remifi-heartbeat",
  "--every",
  "20m",
  "--session",
  "isolated",
  "--timeout-seconds",
  "600",
  "--description",
  "Remifi Auto payroll + x402 burst",
  "--command-cwd",
  repo,
  "--command-argv",
  argv,
  "--command-env",
  `REMIFI_ROOT=${repo}`,
  "--no-deliver",
  "--agent",
  "main",
  "--json",
]);

run(["cron", "list", "--all"]);
console.log("Wired remifi-heartbeat every 20m.");
