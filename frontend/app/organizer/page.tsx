"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { EventCard } from "@/components/app/event-card"
import { RegistrationTrendChart, TicketMixChart } from "@/components/app/organizer-charts"
import { Reveal } from "@/components/anim/reveal"
import { useMyEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrganizerAnalytics } from "@/lib/queries/analytics"
import { toAppEvent } from "@/lib/adapters/event"
import { isFreeEvent } from "@/lib/price"
import { CalendarDays, Users, DollarSign, Sparkles, Plus, ArrowUpRight, Brain, TrendingUp } from "lucide-react"

export default function OrganizerDashboardPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData } = useMyEvents({ limit: 50 })
  const { data: analytics } = useOrganizerAnalytics()
  const user = userData?.user
  const events = eventsData?.events ?? []

  const myEvents = events.map(toAppEvent)
  const totalRegistrations = events.reduce((sum, e) => sum + e.registered, 0)
  const activeEvents = events.filter((e) => e.status === "Upcoming" || e.status === "Live").length
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

  const aiInsights = useMemo(() => {
    const insights: { title: string; body: string; tag: string }[] = []

    if (events.length > 0) {
      const highestFill = events.reduce((best, e) =>
        e.registered / e.capacity > (best?.registered / best?.capacity || 0) ? e : best
      , events[0])
      const fillPct = Math.round((highestFill.registered / highestFill.capacity) * 100)
      if (fillPct > 60) {
        insights.push({
          title: "Capacity alert",
          body: `"${highestFill.title}" is ${fillPct}% full and trending. Consider expanding capacity soon.`,
          tag: "Capacity",
        })
      }

      const lowFill = events.reduce((lowest, e) =>
        e.registered / e.capacity < (lowest?.registered / lowest?.capacity || 1) ? e : lowest
      , events[events.length - 1])
      if (lowFill && lowFill.registered / lowFill.capacity < 0.3) {
        insights.push({
          title: "Promotion opportunity",
          body: `"${lowFill.title}" has only ${Math.round((lowFill.registered / lowFill.capacity) * 100)}% fill rate. A targeted email campaign could boost registrations.`,
          tag: "Marketing",
        })
      }

      if (activeEvents > 0) {
        insights.push({
          title: "Engagement tip",
          body: `You have ${activeEvents} active event(s). Sending reminder notifications 24h before each event can reduce no-shows by up to 40%.`,
          tag: "Retention",
        })
      }
    }

    if (insights.length === 0) {
      insights.push({
        title: "Create your first event",
        body: "Get started by creating a new event. Use AI recommendations to optimize your reach.",
        tag: "Getting Started",
      })
    }

    return insights
  }, [events, activeEvents])

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="My Events">
      <div className="space-y-8">
        <Reveal y={16} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Welcome back, {user?.name?.split(" ")[0] || "Organizer"}</h2>
            <p className="text-sm text-muted-foreground">
              You have {activeEvents} active event{activeEvents !== 1 ? "s" : ""}.
            </p>
          </div>
          <Link
            href="/organizer/events/create"
            className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> Create Event
          </Link>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Registrations" value={totalRegistrations} icon={Users} accent="primary" />
          <StatCard label="Paid Events" value={revenueEvents.length} icon={DollarSign} accent="secondary" />
          <StatCard label="Active Events" value={activeEvents} icon={CalendarDays} accent="flame" />
          <StatCard label="Managed Events" value={events.length} icon={Sparkles} accent="primary" />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <RegistrationTrendChart data={trendData} />
          </Reveal>
          <Reveal>
            <TicketMixChart data={ticketMixData} />
          </Reveal>
        </div>

        {aiInsights.length > 0 && (
          <Reveal id="ai">
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6">
              <div className="flex items-center gap-2">
                <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl text-white">
                  <Brain className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">AI Insights</h3>
                  <p className="text-xs text-muted-foreground">Generated from your event data</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {aiInsights.map((ins) => (
                  <div key={ins.title} className="rounded-xl border border-border bg-card p-4">
                    <span className="inline-block rounded-full bg-secondary/12 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                      {ins.tag}
                    </span>
                    <h4 className="font-display mt-2.5 text-sm font-semibold text-ink">{ins.title}</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{ins.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        <div>
          <Reveal y={16} className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">My Events</h3>
            <Link
              href="/organizer/collaboration"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Collaboration hub <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>
          <Reveal stagger={0.1} y={28} className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {myEvents.slice(0, 6).map((e) => (
              <EventCard key={e.id} event={e} href={`/organizer/events/${e.id}`} />
            ))}
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
