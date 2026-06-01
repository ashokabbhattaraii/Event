import { Reveal } from "@/components/anim/reveal"
import { Activity, Aperture, Zap, Globe, Cpu } from "lucide-react"

const logos = [
  { name: "Northwind", icon: Activity, color: "text-[#5b4cf5]" },
  { name: "Apex Labs", icon: Aperture, color: "text-[#00c9a7]" },
  { name: "Velocity", icon: Zap, color: "text-[#ff6b35]" },
  { name: "Meridian", icon: Globe, color: "text-[#5b4cf5]" },
  { name: "Coreflow", icon: Cpu, color: "text-[#00c9a7]" },
]

export function TrustBar() {
  return (
    <section className="border-y border-border bg-card/60 backdrop-blur-sm py-10">
      <Reveal className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/90">
          Trusted by event teams across industries
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((logo) => {
            const Icon = logo.icon
            return (
              <div key={logo.name} className="flex items-center gap-2.5 opacity-75 transition-opacity hover:opacity-100">
                <span className={`flex size-8 items-center justify-center rounded-lg bg-zinc-100 border border-border shrink-0`}>
                  <Icon className={`size-4 ${logo.color}`} strokeWidth={2.5} />
                </span>
                <span className="font-display text-base font-bold text-ink tracking-tight">{logo.name}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-8 text-center text-xs sm:text-sm text-muted-foreground">
          <span className="font-mono font-bold text-ink bg-primary/10 px-2 py-0.5 rounded text-primary">72</span> survey respondents validated
          this platform
        </p>
      </Reveal>
    </section>
  )
}
