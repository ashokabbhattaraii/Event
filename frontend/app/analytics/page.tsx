"use client"

import { useMemo } from "react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { FunnelTrend, PredictionAccuracy, EngagementRadar, ChannelBars } from "@/components/app/analytics-charts"
import { useCurrentUser } from "@/lib/queries/auth"
import { useAllEvents } from "@/lib/queries/events"
import { Sparkles, TrendingUp, Target, Users } from "lucide-react"

export default function AnalyticsPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData } = useAllEvents({ limit: 100 })
  const user = userData?.user
  const events = eventsData?.events ?? []

  const totalCapacity = events.reduce((s, e) => s + e.capacity, 0)
  const totalRegistered = events.reduce((s, e) => s + e.registered, 0)
  const fillRate = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0
  const conversionRate = events.length > 0
    ? Math.round(events.reduce((s, e) => s + (e.registered / e.capacity) * 100, 0) / events.length)
    : 0

  const insights = useMemo(() => {
    const list = []
    if (events.length > 0) {
      const topEvent = events.reduce((best, e) =>
        e.registered > best.registered ? e : best
      , events[0])
      list.push({
        icon: TrendingUp,
        title: "Top performing event",
        body: `"${topEvent.title}" has ${topEvent.registered} registrations — the highest across all events.`,
        tone: "text-secondary bg-secondary/12",
      })
      const lowFill = events.filter(e => e.capacity > 0 && e.registered / e.capacity < 0.3)
      if (lowFill.length > 0) {
        list.push({
          icon: Target,
          title: "Underperforming events",
          body: `${lowFill.length} event(s) have less than 30% fill rate. Consider boosting promotion.`,
          tone: "text-flame bg-flame/12",
        })
      }
      list.push({
        icon: Users,
        title: "Total audience reach",
        body: `${totalRegistered} total registrations across ${events.length} events with an average ${fillRate}% fill rate.`,
        tone: "text-primary bg-primary/12",
      })
    } else {
      list.push({ icon: Sparkles, title: "No data yet", body: "Create events to see analytics.", tone: "text-primary bg-primary/12" })
    }
    return list
  }, [events, totalRegistered, fillRate])

  return (
    <AppShell role={user?.role === "admin" ? "Administrator" : "Organizer"} userName={user?.name || "User"} title="Analytics & Insights">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Analytics & Insights</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered forecasting and engagement scoring across all events.
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Events" value={events.length} icon={Sparkles} accent="primary" />
          <StatCard label="Fill Rate" value={fillRate} suffix="%" icon={Target} accent="secondary" />
          <StatCard label="Conversion Rate" value={conversionRate} suffix="%" icon={TrendingUp} accent="flame" />
          <StatCard label="Total Registrations" value={totalRegistered} icon={Users} accent="primary" />
        </Reveal>

        <Reveal stagger={0.1} y={24} className="grid gap-4 lg:grid-cols-3">
          {insights.map((i) => (
            <div key={i.title} className="rounded-2xl border border-border bg-card p-5">
              <span className={`flex size-9 items-center justify-center rounded-lg ${i.tone}`}>
                <i.icon className="size-[18px]" />
              </span>
              <h3 className="font-display mt-3 text-sm font-semibold text-ink">{i.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
            </div>
          ))}
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal><FunnelTrend /></Reveal>
          <Reveal><PredictionAccuracy /></Reveal>
          <Reveal><EngagementRadar /></Reveal>
          <Reveal><ChannelBars /></Reveal>
        </div>
      </div>
    </AppShell>
  )
}
