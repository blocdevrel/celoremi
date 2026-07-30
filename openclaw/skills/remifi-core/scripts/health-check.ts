/**
 * OpenClaw Guardian 1 — blocking health check before money movement.
 * Usage: npx tsx openclaw/skills/remifi-core/scripts/health-check.ts
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
  const { env } = await import(pathToFileURL(resolve(root, "lib/config.ts")).href);

  const base =
    env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";

  let remote: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) remote = (await res.json()) as Record<string, unknown>;
  } catch {
    remote = null;
  }

  if (remote) {
    const ok = Boolean(remote.ok) && Boolean(remote.chainOk);
    const x402 = remote.x402 as { facilitatorOk?: boolean } | undefined;
    const router = remote.router as { ok?: boolean } | undefined;
    const healthy =
      ok &&
      x402?.facilitatorOk !== false &&
      (router?.ok !== false || router == null);

    console.log(
      JSON.stringify(
        {
          source: "remote",
          remifiRoot: root,
          url: `${base}/api/health`,
          ok: healthy,
          chainOk: remote.chainOk,
          agentAddress: remote.agentAddress,
          usdcBalanceFormatted: remote.usdcBalanceFormatted,
          x402: remote.x402,
          router: remote.router,
          telegram: remote.telegram,
        },
        null,
        2,
      ),
    );
    if (!healthy) process.exit(1);
    return;
  }

  if (!env.AGENT_PRIVATE_KEY || !env.CELO_RPC_URL) {
    console.log(
      JSON.stringify({
        source: "local",
        remifiRoot: root,
        ok: false,
        error:
          "Missing AGENT_PRIVATE_KEY or CELO_RPC_URL; remote health unreachable",
      }),
    );
    process.exit(1);
  }

  const rpc = await fetch(env.CELO_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const rpcBody = (await rpc.json()) as { result?: string };
  const chainOk = rpcBody.result?.toLowerCase() === "0xa4ec";

  console.log(
    JSON.stringify({
      source: "local",
      remifiRoot: root,
      ok: chainOk,
      chainIdHex: rpcBody.result ?? null,
      agentAddress: env.AGENT_ADDRESS,
    }),
  );
  if (!chainOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
