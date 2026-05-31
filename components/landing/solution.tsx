import { Check, Cloud } from "lucide-react"

const bullets = [
  "AI-driven automation for recommendations & forecasting",
  "Enterprise RBAC security with full audit trails",
  "AWS-native elastic scaling that handles any peak",
]

export function Solution() {
  return (
    <section id="solution" className="py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2">
        {/* Left text */}
        <div data-reveal>
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            EventNexus Solution
          </span>
          <h2 className="font-display mt-5 text-balance text-4xl font-bold tracking-tight text-ink">
            Built for the Complexity of Modern Events
          </h2>
          <p className="mt-5 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            One platform that unifies intelligent automation, airtight security, and seamless
            multi-organization collaboration — so your teams can focus on the experience, not the
            logistics.
          </p>
          <ul className="mt-8 space-y-4">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-sm font-medium text-ink">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right isometric-ish hub illustration */}
        <div data-reveal className="relative flex justify-center">
          <div className="relative aspect-square w-full max-w-md">
            {/* connecting lines */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400" fill="none" aria-hidden>
              <line x1="80" y1="80" x2="200" y2="200" stroke="#5b4cf5" strokeWidth="2" strokeDasharray="6 6" opacity="0.4" />
              <line x1="320" y1="90" x2="200" y2="200" stroke="#00c9a7" strokeWidth="2" strokeDasharray="6 6" opacity="0.4" />
              <line x1="90" y1="320" x2="200" y2="200" stroke="#ff6b35" strokeWidth="2" strokeDasharray="6 6" opacity="0.4" />
            </svg>

            {/* central hub */}
            <div className="absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-3xl bg-brand-gradient text-white shadow-[0_20px_60px_-20px_rgba(91,76,245,0.7)]">
              <Cloud className="size-8" />
              <span className="font-display mt-1 text-xs font-bold">Nexus Hub</span>
            </div>

            {/* org nodes */}
            {[
              { c: "left-2 top-2", label: "Org A", ring: "ring-primary" },
              { c: "right-2 top-4", label: "Org B", ring: "ring-secondary" },
              { c: "bottom-2 left-6", label: "Org C", ring: "ring-flame" },
            ].map((n) => (
              <div
                key={n.label}
                className={`absolute ${n.c} flex size-20 flex-col items-center justify-center rounded-2xl border border-border bg-card shadow-lg ring-2 ${n.ring}`}
              >
                <span className="bg-brand-gradient size-7 rounded-lg" />
                <span className="font-display mt-1.5 text-xs font-bold text-ink">{n.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
