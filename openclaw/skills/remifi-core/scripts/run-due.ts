/**
 * OpenClaw Guardian 2 — run due Auto payroll + x402 traffic burst.
 * Same path as `npm run heartbeat`.
 * Optional: REMIFI_ROOT=/path/to/celoremi (Remifi package root)
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

function findRemifiRoot(): string {
  if (process.env.REMIFI_ROOT && existsSync(process.env.REMIFI_ROOT)) {
    return process.env.REMIFI_ROOT;
  }
  let dir = __dirname;
  for (let i = 0; i < 10; i += 1) {
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "remifi") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(__dirname, "../../../../");
}

const root = findRemifiRoot();
for (const file of [".env.local", ".env"]) {
  const p = resolve(root, file);
  if (existsSync(p)) loadEnv({ path: p, override: false });
}

async function main() {
  process.chdir(root);
  const { runDueSchedules } = await import(
    pathToFileURL(resolve(root, "lib/schedules/heartbeat.ts")).href
  );
  const result = await runDueSchedules();
  console.log(JSON.stringify({ remifiRoot: root, ...result }, null, 2));
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
