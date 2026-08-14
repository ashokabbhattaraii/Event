"use client"

import Link from "next/link"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { RegistrationTrendChart, TicketMixChart, PredictedAttendanceChart } from "@/components/app/organizer-charts"
import { SegmentsChart } from "@/components/app/segments-chart"
import { MarketingInsightCard } from "@/components/app/marketing-insight-card"
import { Reveal } from "@/components/anim/reveal"
import { useMyEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrganizerAnalytics, useAudienceSegments, useMarketingInsight } from "@/lib/queries/analytics"
import { CalendarDays, Users, DollarSign, Sparkles } from "lucide-react"
import { isFreeEvent } from "@/lib/price"

export default function OrganizerAnalyticsPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData } = useMyEvents({ limit: 50 })
  const { data: analytics } = useOrganizerAnalytics()
  const { data: segments, isLoading: segmentsLoading } = useAudienceSegments()
  const { data: marketingInsight, isLoading: marketingLoading } = useMarketingInsight()
  const user = userData?.user
  const events = eventsData?.events ?? []

  const totalRegistrations = events.reduce((sum, e) => sum + e.registered, 0)
  const totalCapacity = events.reduce((sum, e) => sum + e.capacity, 0)
  const fillRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0
  const revenueEvents = events.filter((e) => !isFreeEvent(e.price))

  const trendData = analytics?.trend.map((t) => ({
    d: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    v: t.registrations,
  }))

  const freeRegistered = events.filter((e) => isFreeEvent(e.price)).reduce((s, e) => s + e.registered, 0)
  const paidRegistered = events.filter((e) => !isFreeEvent(e.price)).reduce((s, e) => s + e.registered, 0)
  const ticketMixData = [
    { name: "Free", value: freeRegistered, fill: "#5b4cf5" },
    { name: "Paid", value: paidRegistered, fill: "#00c9a7" },
  ].filter((t) => t.value > 0)

  const predictedData = (analytics?.events ?? []).map((e) => ({
    event: e.title.length > 14 ? `${e.title.slice(0, 14)}…` : e.title,
    predicted: e.predictedAttendance,
    actual: e.registered,
  }))

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Analytics">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Event Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance metrics across all your events.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Events" value={events.length} icon={CalendarDays} accent="primary" />
          <StatCard label="Total Registrations" value={totalRegistrations} icon={Users} accent="secondary" />
          <StatCard label="Paid Events" value={revenueEvents.length} icon={DollarSign} accent="flame" />
          <StatCard label="Avg. Fill Rate" value={fillRate} suffix="%" icon={Sparkles} accent="primary" />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <RegistrationTrendChart data={trendData} />
          </Reveal>
          <Reveal>
            <TicketMixChart data={ticketMixData} />
          </Reveal>
        </div>

        <Reveal>
          <PredictedAttendanceChart data={predictedData} />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <SegmentsChart data={segments} isLoading={segmentsLoading} />
          </Reveal>
          <Reveal>
            <MarketingInsightCard data={marketingInsight} isLoading={marketingLoading} />
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
