"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";
import { HomeCta } from "./HomeCta";
import { HomeFaq } from "./HomeFaq";
import { HomeHero } from "./HomeHero";
import { PoliciesPreview } from "./PoliciesPreview";
import { PolicyStory } from "./PolicyStory";
import { ProtocolMarquee } from "./ProtocolMarquee";
import { RecentSettlements } from "./RecentSettlements";

export type HomeTabProps = { app: RemifiAppModel };

export function HomeTab({ app }: HomeTabProps) {
  const {
    faqOpen,
    jobsLoading,
    recentJobs,
    savedPolicies,
    selectPolicy,
    setFaqOpen,
    setSplitMode,
    setTab,
    wallet,
    walletIsAgent,
  } = app;

  const openCreatePolicy = () => {
    setSplitMode("create");
    setTab("split");
  };
  const openRunPayroll = () => {
    setSplitMode("payroll");
    setTab("split");
  };

  return (
    <main className="pp-rise mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 pb-8 sm:gap-6">
      <HomeHero
        onCreatePolicy={openCreatePolicy}
        onRunPayroll={openRunPayroll}
      />
      <ProtocolMarquee />
      <PolicyStory />
      <RecentSettlements
        jobs={recentJobs}
        loading={jobsLoading}
        onViewAll={() => setTab("status")}
        onRunFirst={openRunPayroll}
      />
      <PoliciesPreview
        walletAddress={wallet.address}
        walletIsAgent={walletIsAgent}
        policies={savedPolicies}
        onNewPolicy={openCreatePolicy}
        onSelectPolicy={(policy) => {
          selectPolicy(policy);
          openRunPayroll();
        }}
      />
      <HomeFaq openIndex={faqOpen} setOpenIndex={setFaqOpen} />
      <HomeCta />
    </main>
  );
}
