"use client";

import type { RemifiAppModel } from "../hooks/useRemifiApp";
import { CreatePolicyForm } from "./CreatePolicyForm";
import { RunPayrollPanel } from "./RunPayrollPanel";
import { SplitModeToggle } from "./SplitModeToggle";

export type SplitTabProps = { app: RemifiAppModel };

export function SplitTab({ app }: SplitTabProps) {
  const { splitMode, setSplitMode } = app;

  return (
    <main className="pp-rise mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 pb-8 sm:gap-6 lg:max-w-2xl">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pp-ink/35 sm:text-[11px]">
          Fund splits
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-pp-ink sm:text-2xl">
          {splitMode === "create"
            ? "Create a policy"
            : "Distribute"}
        </h2>
        <p className="mt-1.5 max-w-md text-sm font-medium leading-snug text-pp-ink/50">
          {splitMode === "create"
            ? "Define who gets what once. Funds split automatically on every run: payrolls, DAO treasury, bounties, or subscriptions."
            : "Pick a saved policy, enter an amount, and Remifi pays every recipient from your shares."}
        </p>
      </div>

      <SplitModeToggle mode={splitMode} onChange={setSplitMode} />

      {splitMode === "create" ? (
        <CreatePolicyForm
          addManualRecipient={app.addManualRecipient}
          busy={app.busy}
          englishText={app.englishText}
          manualRecipients={app.manualRecipients}
          policyId={app.policyId}
          policyInputMode={app.policyInputMode}
          policyName={app.policyName}
          removeManualRecipient={app.removeManualRecipient}
          resetPolicyDraft={app.resetPolicyDraft}
          savePolicy={app.savePolicy}
          setEnglishText={app.setEnglishText}
          setPolicyId={app.setPolicyId}
          setPolicyInputMode={app.setPolicyInputMode}
          setPolicyName={app.setPolicyName}
          updateManualRecipient={app.updateManualRecipient}
        />
      ) : (
        <RunPayrollPanel
          applyMaxAmount={app.applyMaxAmount}
          autoPayrollSchedule={app.autoPayrollSchedule}
          busy={app.busy}
          filteredPolicies={app.filteredPolicies}
          formatBalanceLine={app.formatBalanceLine}
          hirePriceBaseUnits={app.hirePriceBaseUnits}
          payPayroll={app.payPayroll}
          policiesLoading={app.policiesLoading}
          policyId={app.policyId}
          policySearch={app.policySearch}
          savedPolicies={app.savedPolicies}
          scheduleInterval={app.scheduleInterval}
          schedulesLoading={app.schedulesLoading}
          selectPolicy={app.selectPolicy}
          selectedPolicy={app.selectedPolicy}
          setPolicySearch={app.setPolicySearch}
          setScheduleInterval={app.setScheduleInterval}
          setSplitAmount={app.setSplitAmount}
          setSplitMode={app.setSplitMode}
          splitAmount={app.splitAmount}
          toggleAutoPayroll={app.toggleAutoPayroll}
          walletUsdcBalance={app.walletUsdcBalance}
        />
      )}
    </main>
  );
}
