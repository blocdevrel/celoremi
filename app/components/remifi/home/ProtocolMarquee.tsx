import { PROTOCOL_LOGOS } from "../constants";

export function ProtocolMarquee() {
  return (
          <section className="w-full py-2">
            <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-pp-ink/40 sm:mb-5 sm:text-[11px] sm:tracking-[0.2em]">
                  Built on Celo, works with
            </p>
            <div className="relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-pp-soft to-transparent sm:w-14"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-pp-soft to-transparent sm:w-14"
              />
              <div className="pp-logo-marquee flex w-max">
                {[0, 1].map((set) => (
                  <div
                    key={set}
                    className="flex items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
                    aria-hidden={set !== 0}
                  >
                    {PROTOCOL_LOGOS.map((logo) => (
                      <div
                        key={`${set}-${logo.name}`}
                        className="flex h-10 shrink-0 items-center justify-center sm:h-11"
                        title={set === 0 ? logo.name : undefined}
                      >
                        <img
                          src={logo.src}
                          alt={set === 0 ? logo.name : ""}
                          draggable={false}
                          loading="lazy"
                          className={`w-auto object-contain opacity-90 ${
                            logo.kind === "mark"
                              ? "h-9 sm:h-10"
                              : "h-8 max-w-[8.5rem] sm:h-9 sm:max-w-[10rem]"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
  );
}
