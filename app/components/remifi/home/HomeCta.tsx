export function HomeCta() {
  return (
          <section className="relative grid overflow-hidden rounded-[1.5rem] bg-pp-ink text-pp-white sm:rounded-[2rem] md:grid-cols-2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(190,238,168,0.35) 1px, transparent 0)",
                backgroundSize: "22px 22px",
                maskImage:
                  "radial-gradient(70% 70% at 20% 50%, black, transparent)",
                WebkitMaskImage:
                  "radial-gradient(70% 70% at 20% 50%, black, transparent)",
              }}
            />
            <div className="relative z-10 flex flex-col justify-center p-5 sm:p-8 md:p-10">
              <h2 className="text-balance text-[1.4rem] font-bold leading-tight tracking-tight sm:text-[1.65rem] md:text-3xl">
                Stop guessing who gets paid each run
              </h2>
              <p className="mt-3 max-w-md text-[14px] font-medium leading-snug text-white/70 sm:text-[15px] md:text-base">
                Hire Remifi once. Your policy splits USDC to every recipient
                with ENS subnames and proof on Celo.
              </p>
              <div className="mt-7 flex items-baseline gap-5 sm:mt-10 sm:gap-8">
                <div>
                  <div className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl md:text-3xl">
                    1 hire
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-white/65 sm:text-xs">
                    Agent executes the split
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl md:text-3xl">
                    100%
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-white/65 sm:text-xs">
                    Policy shares paid out
                  </div>
                </div>
              </div>
            </div>
            <div className="relative min-h-[200px] w-full bg-[#1a1a1a] sm:min-h-[260px] md:min-h-full">
              <img
                src="/assets/cta-panel.png"
                alt="Managing payroll on the go"
                className="absolute inset-0 h-full w-full object-cover object-[center_20%] sm:object-center"
                draggable={false}
              />
            </div>
          </section>
  );
}
