const stats = [
  { value: 95.8, suffix: "%", label: "rate secure login as critical" },
  { value: 86, suffix: "%", label: "want AI-based event recommendations" },
  { value: 87.5, suffix: "%", label: "find QR ticketing useful" },
  { value: 83.3, suffix: "%", label: "would use an AI-powered platform" },
]

export function SurveyStats() {
  return (
    <section className="bg-[#eef0ff] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            Validated by Research
          </span>
          <h2 className="font-display mt-5 text-balance text-4xl font-bold tracking-tight text-ink">
            Users Want This — The Numbers Prove It
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              data-reveal
              className="rounded-2xl border border-border bg-card p-7 text-center shadow-[0_2px_24px_rgba(0,0,0,0.04)]"
            >
              <div className="font-display text-5xl font-extrabold tracking-tight text-gradient">
                <span
                  className="count-up"
                  data-count-target={s.value}
                  data-count-suffix={s.suffix}
                  data-count-decimals={Number.isInteger(s.value) ? 0 : 1}
                >
                  0{s.suffix}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
