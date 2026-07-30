"use client";

export type HomeHeroProps = {
  onCreatePolicy: () => void;
  onRunPayroll: () => void;
};

export function HomeHero({ onCreatePolicy, onRunPayroll }: HomeHeroProps) {
  return (
    <section className="relative flex flex-col overflow-hidden rounded-[1.5rem] bg-[#ebe6f4] sm:rounded-[2rem] md:block">
      <div className="relative isolate aspect-[5/4] w-full overflow-hidden sm:aspect-[4/3] md:aspect-auto md:h-auto">
        <img
          src="/assets/remihero.png"
          alt="Remifi AI agent on Celo"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center md:static md:h-auto md:w-full md:object-contain"
        />
      </div>

      <div className="relative z-10 flex items-start md:absolute md:inset-0 md:items-center">
        <div className="w-full px-4 pb-6 pt-4 text-left sm:px-6 sm:pb-7 sm:pt-5 md:w-[min(52%,22rem)] md:px-8 md:pb-0 md:pt-0 lg:w-[min(48%,24rem)] lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pp-ink/40 sm:text-[11px]">
            AI agent on Celo
          </p>
          <h1 className="mt-1.5 font-bold leading-[1.15] tracking-tight text-pp-ink text-[clamp(1.15rem,5.2vw,2.15rem)]">
            <span className="block whitespace-nowrap">Automate recurring</span>
            <span className="block whitespace-nowrap">payments and fund</span>
            <span className="block whitespace-nowrap">distributions</span>
          </h1>
          <p className="mt-2 max-w-[20rem] text-[14px] font-medium leading-snug text-pp-ink/55 sm:max-w-sm sm:text-[15px] md:text-base">
            Funds split automatically from your policy. Perfect for payrolls,
            DAO treasury flows, bounty payouts, and subscriptions.
          </p>
          <div className="mt-4 flex w-full flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onCreatePolicy}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-pp-ink px-5 text-sm font-semibold text-pp-white transition hover:bg-pp-ink/90 active:scale-[0.98] sm:w-auto"
            >
              Create policy
            </button>
            <button
              type="button"
              onClick={onRunPayroll}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-pp-ink/10 bg-pp-white/85 px-5 text-sm font-semibold text-pp-ink/70 transition hover:bg-pp-white hover:text-pp-ink active:scale-[0.98] sm:w-auto"
            >
              Hire &amp; run
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
