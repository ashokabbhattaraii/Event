import { Reveal } from "@/components/anim/reveal"

export function TrustBar() {
  const logos = ["Northwind", "Apex Labs", "Velocity", "Meridian", "Coreflow"]
  return (
    <section className="border-y border-border bg-card/50 py-10">
      <Reveal className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by event teams across industries
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {logos.map((name) => (
            <div key={name} className="flex items-center gap-2 opacity-60">
              <span className="bg-brand-gradient size-6 rounded-md" />
              <span className="font-display text-lg font-bold text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-ink">72</span> survey respondents validated
          this platform
        </p>
      </Reveal>
    </section>
  )
}
