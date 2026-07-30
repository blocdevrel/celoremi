export function PolicyStory() {
  return (
          <section className="overflow-hidden rounded-2xl bg-pp-white/80 ring-1 ring-pp-ink/[0.04] sm:rounded-[1.35rem] sm:bg-pp-white">
            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pp-ink/35 sm:text-[11px]">
                Policy splits
              </p>
              <h2 className="mt-1.5 text-lg font-bold tracking-tight text-pp-ink sm:text-xl">
                Funds split automatically from your policy
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-snug text-pp-ink/50">
                Remifi is an AI agent that lets you automate recurring payments
                and fund distributions. Create a policy once, then funds are
                split automatically. Perfect for payrolls, DAO treasury flows,
                bounty payouts, and automated subscriptions.
              </p>

              <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                {[
                  { pct: "20%", role: "Finance" },
                  { pct: "20%", role: "Management" },
                  { pct: "60%", role: "Operations" },
                ].map((row) => (
                  <li
                    key={row.role}
                    className="flex items-baseline justify-between gap-3 rounded-xl bg-pp-soft px-4 py-3 sm:flex-col sm:items-start sm:gap-1"
                  >
                    <span className="text-xl font-bold tabular-nums tracking-tight text-pp-ink">
                      {row.pct}
                    </span>
                    <span className="text-sm font-semibold text-pp-ink/55">
                      {row.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
  );
}
