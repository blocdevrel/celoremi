"use client";

/** Lavender matched to mobileimage.png so the hand fade blends into the section. */
const HERO_LAVENDER = "#e5e0f3";

export type HomeHeroProps = {
  onCreatePolicy: () => void;
  onRunPayroll: () => void;
};

function HeroCopy({
  className = "",
  largerMobile = false,
}: {
  className?: string;
  largerMobile?: boolean;
}) {
  return (
    <div className={className}>
      <p
        className={`font-semibold uppercase tracking-[0.16em] text-pp-ink/40 ${
          largerMobile ? "text-[11px] sm:text-xs" : "text-[10px] sm:text-[11px]"
        }`}
      >
        AI agent on Celo
      </p>
      <h1
        className={`mt-1.5 font-bold leading-[1.12] tracking-tight text-pp-ink ${
          largerMobile
            ? "text-[clamp(1.4rem,6vw,2.05rem)]"
            : "text-[clamp(1.15rem,5.2vw,2.15rem)]"
        }`}
      >
        {largerMobile ? (
          <>Automate recurring payments and fund distributions</>
        ) : (
          <>
            <span className="block whitespace-nowrap">Automate recurring</span>
            <span className="block whitespace-nowrap">payments and fund</span>
            <span className="block whitespace-nowrap">distributions</span>
          </>
        )}
      </h1>
      <p
        className={`mt-2 max-w-[22rem] font-medium leading-snug text-pp-ink/55 ${
          largerMobile
            ? "text-[15px] sm:text-base"
            : "text-[14px] sm:text-[15px] md:text-base"
        }`}
      >
        Funds split automatically from your policy. Perfect for payrolls, DAO
        treasury flows, bounty payouts, and subscriptions.
      </p>
    </div>
  );
}

function HeroButtons({
  onCreatePolicy,
  onRunPayroll,
  className = "",
}: {
  onCreatePolicy: () => void;
  onRunPayroll: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onCreatePolicy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-pp-ink px-5 text-sm font-semibold text-white transition hover:bg-pp-ink/90 active:scale-[0.98] sm:w-auto"
      >
        Create policy
      </button>
      <button
        type="button"
        onClick={onRunPayroll}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-pp-ink/15 bg-white/90 px-5 text-sm font-semibold text-pp-ink/80 backdrop-blur-[2px] transition hover:bg-white hover:text-pp-ink active:scale-[0.98] sm:w-auto"
      >
        Distribute
      </button>
    </div>
  );
}

export function HomeHero({ onCreatePolicy, onRunPayroll }: HomeHeroProps) {
  return (
    <section
      className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]"
      style={{ backgroundColor: HERO_LAVENDER }}
    >
      {/* Desktop / tablet */}
      <div className="relative isolate hidden w-full md:block">
        <img
          src="/assets/remihero.png"
          alt="Remifi AI agent on Celo"
          draggable={false}
          className="pointer-events-none h-auto w-full select-none object-contain"
        />
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="w-[min(52%,22rem)] px-8 lg:w-[min(48%,24rem)] lg:px-10">
            <HeroCopy />
            <HeroButtons
              onCreatePolicy={onCreatePolicy}
              onRunPayroll={onRunPayroll}
              className="mt-6 flex flex-row flex-wrap items-center gap-2"
            />
          </div>
        </div>
      </div>

      {/*
        Mobile: keep content in document flow (no absolute clip).
        Pull the copy up over the hand fade with a matching lavender gradient.
      */}
      <div className="md:hidden">
        <img
          src="/assets/mobileimage.png?v=4"
          alt="Remifi on mobile — balance and recent transactions"
          draggable={false}
          className="pointer-events-none block h-auto w-full select-none"
        />
        <div
          className="relative z-10 -mt-[38%] px-4 pb-5 pt-16 sm:-mt-[34%] sm:px-6 sm:pb-6 sm:pt-20"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(229,224,243,0) 0%, rgba(229,224,243,0.75) 22%, #e5e0f3 48%, #e5e0f3 100%)",
          }}
        >
          <HeroCopy largerMobile />
          <HeroButtons
            onCreatePolicy={onCreatePolicy}
            onRunPayroll={onRunPayroll}
            className="mt-5 flex w-full flex-col gap-2.5"
          />
        </div>
      </div>
    </section>
  );
}
