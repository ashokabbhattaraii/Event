import { Sparkles, LineChart, QrCode, ShieldCheck, Activity, MessageSquareText, ArrowRight } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "AI Event Recommendations",
    desc: "Collaborative filtering surfaces personalized event suggestions for every attendee.",
    ai: true,
  },
  {
    icon: LineChart,
    title: "Predictive Attendance Modeling",
    desc: "ML-based forecasts predict turnout so you can plan capacity with confidence.",
    ai: true,
  },
  {
    icon: QrCode,
    title: "QR Code Ticketing",
    desc: "Secure digital tickets with instant, contactless check-in at the door.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access Control",
    desc: "Granular Admin / Organizer / Attendee hierarchy with full permission control.",
  },
  {
    icon: Activity,
    title: "Real-Time Analytics",
    desc: "Live dashboards track registrations, check-ins, and engagement as it happens.",
  },
  {
    icon: MessageSquareText,
    title: "AI Chatbot Support",
    desc: "24/7 EventBot resolves participant queries instantly across every event.",
    ai: true,
  },
]

export function Features() {
  return (
    <section id="features" className="bg-card/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <span className="inline-block rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-medium text-secondary">
            Features
          </span>
          <h2 className="font-display mt-5 text-balance text-4xl font-bold tracking-tight text-ink">
            Everything you need, intelligently connected
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              data-reveal
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_20px_48px_-24px_rgba(91,76,245,0.4)]"
            >
              {f.ai && (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-secondary/12 px-2.5 py-1 text-[10px] font-semibold text-secondary">
                  <Sparkles className="size-3" /> AI
                </span>
              )}
              <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-xl text-white">
                <f.icon className="size-6" />
              </span>
              <h3 className="font-display mt-5 text-lg font-bold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <a
                href="#"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Learn more
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
