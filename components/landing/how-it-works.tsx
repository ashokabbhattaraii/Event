import { Settings2, Sparkles, BarChart3 } from "lucide-react"

const steps = [
  {
    icon: Settings2,
    n: "01",
    title: "Create & Configure",
    desc: "Set up your organization and build events with flexible registration, pricing, and access rules.",
  },
  {
    icon: Sparkles,
    n: "02",
    title: "AI Personalizes & Promotes",
    desc: "EventNexus matches your events to the right attendees and recommends optimal promotion windows.",
  },
  {
    icon: BarChart3,
    n: "03",
    title: "Manage & Analyze",
    desc: "Monitor check-ins, engagement, and outcomes in real time with live analytics dashboards.",
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <span className="inline-block rounded-full bg-flame/10 px-4 py-1.5 text-xs font-medium text-flame">
            How It Works
          </span>
          <h2 className="font-display mt-5 text-balance text-4xl font-bold tracking-tight text-ink">
            From setup to insight in three steps
          </h2>
        </div>

        <div className="relative mt-16">
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-border lg:block">
            <div className="timeline-progress h-full origin-left bg-brand-gradient" />
          </div>

          <div className="grid gap-10 lg:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} data-reveal className="relative text-center lg:text-left">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg lg:mx-0">
                  <s.icon className="size-6" />
                </div>
                <div className="font-mono mt-5 text-xs font-semibold tracking-widest text-muted-foreground">
                  STEP {s.n}
                </div>
                <h3 className="font-display mt-2 text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
