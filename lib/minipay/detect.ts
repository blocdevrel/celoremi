/** MiniPay / injected-provider detection (no viem — safe for unit tests). */

export function getInjectedEthereum(): NonNullable<Window["ethereum"]> | null {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const eth = window.ethereum;
  if (eth.isMiniPay) return eth;
  const list = eth.providers;
  if (Array.isArray(list)) {
    const mini = list.find((p) => p?.isMiniPay);
    if (mini) return mini as NonNullable<Window["ethereum"]>;
  }
  return eth;
}

export function isMiniPayRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const eth = window.ethereum;
  if (!eth) return false;
  if (eth.isMiniPay) return true;
  const list = eth.providers;
  return Array.isArray(list) && list.some((p) => Boolean(p?.isMiniPay));
}

/** Wait for MiniPay's late provider injection (common on first WebView load). */
export function waitForMiniPayRuntime(timeoutMs = 5000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (isMiniPayRuntime()) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener("ethereum#initialized", onReady);
      resolve(ok);
    };
    const onReady = () => {
      if (isMiniPayRuntime()) finish(true);
    };
    const timer = window.setTimeout(() => finish(isMiniPayRuntime()), timeoutMs);
    const poll = window.setInterval(() => {
      if (isMiniPayRuntime()) finish(true);
    }, 150);
    window.addEventListener("ethereum#initialized", onReady);
  });
}