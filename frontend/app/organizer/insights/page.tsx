"use client"

import { useMemo } from "react"
import { AlertTriangle, Brain, Sparkles, TrendingUp } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useMyEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"

export default function OrganizerInsightsPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData } = useMyEvents({ limit: 50 })
  const user = userData?.user
  const events = eventsData?.events ?? []

  const insights = useMemo(() => {
    const list: { title: string; body: string; tone: string; icon: typeof TrendingUp }[] = []

    if (events.length === 0) {
      list.push({
        title: "No events yet",
        body: "Create your first event to get AI-powered insights about registration trends and audience engagement.",
        tone: "text-primary bg-primary/12",
        icon: Sparkles,
      })
      return list
    }

    events.forEach((e) => {
      const fillPct = Math.round((e.registered / e.capacity) * 100)
      if (fillPct >= 70) {
        list.push({
          title: `Capacity alert: ${e.title}`,
          body: `"${e.title}" is ${fillPct}% full with ${e.capacity - e.registered} spots remaining. Consider expanding capacity or creating a waitlist.`,
          tone: "text-flame bg-flame/12",
          icon: AlertTriangle,
        })
      }
      if (new Date(e.date) > new Date() && fillPct < 30) {
        list.push({
          title: `Low registration: ${e.title}`,
          body: `"${e.title}" is only ${fillPct}% full. A promotional push via email or social media could help boost registrations.`,
          tone: "text-secondary bg-secondary/15",
          icon: TrendingUp,
        })
      }
    })

    if (list.length === 0) {
      list.push({
        title: "Healthy event portfolio",
        body: "All your events have steady registration rates. Keep up the great work!",
        tone: "text-primary bg-primary/12",
        icon: Sparkles,
      })
    }

    return list.slice(0, 6)
  }, [events])

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="AI Insights">
      <div className="space-y-8">
        <Reveal className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6">
          <div className="flex items-center gap-3">
            <span className="bg-brand-gradient flex size-11 items-center justify-center rounded-xl text-white">
              <Brain className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-ink">AI-generated recommendations</h1>
              <p className="text-sm text-muted-foreground">Data-driven insights based on your event registration trends.</p>
            </div>
          </div>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => (
            <div key={insight.title} className="rounded-2xl border border-border bg-card p-6">
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
