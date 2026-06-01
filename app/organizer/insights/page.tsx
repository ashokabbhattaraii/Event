import { AlertTriangle, Brain, Sparkles, TrendingUp } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"

const insights = [
  { title: "Boost weekend promotion", body: "DevSummit registrations spike 38% on weekends. Queue the next push for Saturday 9 AM.", tone: "text-primary bg-primary/12", icon: TrendingUp },
  { title: "Capacity alert", body: "Growth Marketing Live is 76% full and trending. Open 100 additional seats before tomorrow.", tone: "text-flame bg-flame/12", icon: AlertTriangle },
  { title: "No-show risk", body: "Predicted no-show rate is 12%. Send a reminder 24 hours before to recover an estimated 38 attendees.", tone: "text-secondary bg-secondary/15", icon: Sparkles },
]

export default function OrganizerInsightsPage() {
  return (
    <AppShell role="Organizer" userName="Marcus Reid" title="AI Insights">
      <div className="space-y-8">
        <Reveal className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6">
          <div className="flex items-center gap-3">
            <span className="bg-brand-gradient flex size-11 items-center justify-center rounded-xl text-white">
              <Brain className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-ink">AI-generated recommendations</h1>
              <p className="text-sm text-muted-foreground">Recommendations based on attendee demand, conversion friction, and event readiness.</p>
            </div>
          </div>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => (
            <div key={insight.title} className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
              <span className={`flex size-10 items-center justify-center rounded-xl ${insight.tone}`}>
                <insight.icon className="size-5" />
              </span>
              <h2 className="font-display mt-4 text-lg font-semibold text-ink">{insight.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}