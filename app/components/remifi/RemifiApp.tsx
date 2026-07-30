"use client";

import { HomeTab } from "./home/HomeTab";
import { useRemifiApp } from "./hooks/useRemifiApp";
import { PayTab } from "./pay/PayTab";
import { RemifiBottomNav } from "./shell/RemifiBottomNav";
import { RemifiFooter } from "./shell/RemifiFooter";
import { RemifiHeader } from "./shell/RemifiHeader";
import { RemifiToast } from "./shell/RemifiToast";
import { SplitTab } from "./split/SplitTab";
import { StatusTab } from "./status/StatusTab";

export function RemifiApp() {
  const app = useRemifiApp();
  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-28 pt-4 sm:max-w-xl sm:px-6 md:max-w-3xl lg:max-w-6xl lg:px-8 lg:pb-16 xl:max-w-7xl">
        <RemifiHeader app={app} />
        {app.tab === "home" ? <HomeTab app={app} /> : null}
        {app.tab === "split" ? <SplitTab app={app} /> : null}
        {app.tab === "pay" ? <PayTab app={app} /> : null}
        {app.tab === "status" ? <StatusTab app={app} /> : null}
        <RemifiToast app={app} />
        <RemifiBottomNav app={app} />
      </div>
      <RemifiFooter app={app} />
    </div>
  );
}
