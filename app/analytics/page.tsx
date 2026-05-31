"use client"

import { AppShell } from "@/components/app/app-shell"
import { adminNav } from "@/components/app/nav-configs"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { FunnelTrend, PredictionAccuracy, EngagementRadar, ChannelBars } from "@/components/app/analytics-charts"
import { Sparkles, TrendingUp, Target, Gauge, Users } from "lucide-react"

const insights = [
  {
    icon: TrendingUp,
    title: "Attendance surge predicted",
    body: "DevSummit 2026 is tracking 23% above forecast. Consider opening a waitlist tier before Friday.",
    tone: "text-secondary bg-secondary/12",
  },
  {
    icon: Target,
    title: "Drop-off at payment step",
    body: "18% of attendees abandon at checkout. A one-click pay option could recover ~$14k in revenue.",
    tone: "text-flame bg-flame/12",
  },
  {
    icon: Users,
    title: "Audience overlap detected",
    body: "Design Week and ProductCon share 41% of registrants. A bundled pass may lift conversions.",
    tone: "text-primary bg-primary/12",
  },
]

export default function AnalyticsPage() {
  return (
    <AppShell nav={adminNav} role="Administrator" userName="Jordan Reyes" title="Analytics & Insights">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Analytics & Insights</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered forecasting, engagement scoring, and revenue attribution across all events.
          </p>
        </Reveal>

        {/* KPIs */}
        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Forecast Accuracy" value={94} suffix="%" trend="+2.1%" icon={Gauge} accent="primary" />
          <StatCard label="Avg. Engagement" value={78} suffix="/100" trend="+5.4" icon={Target} accent="secondary" />
          <StatCard label="Conversion Rate" value={62} suffix="%" trend="+3.8%" icon={TrendingUp} accent="flame" />
          <StatCard label="Repeat Attendees" value={3412} trend="+11%" icon={Users} accent="primary" />
        </Reveal>

        {/* AI insight cards */}
        <Reveal stagger={0.1} y={24} className="grid gap-4 lg:grid-cols-3">
          {insights.map((i) => (
            <div
              key={i.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]"
            >
              <span className={`flex size-9 items-center justify-center rounded-lg ${i.tone}`}>
                <i.icon className="size-[18px]" />
              </span>
              <h3 className="font-display mt-3 text-sm font-semibold text-ink">{i.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
            </div>
          ))}
        </Reveal>

        {/* Charts */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal>
            <FunnelTrend />
          </Reveal>
          <Reveal>
            <PredictionAccuracy />
          </Reveal>
          <Reveal>
            <EngagementRadar />
          </Reveal>
          <Reveal>
            <ChannelBars />
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
