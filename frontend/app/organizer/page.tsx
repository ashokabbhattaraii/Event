"use client"

import Link from "next/link"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { EventCard } from "@/components/app/event-card"
import { RegistrationTrendChart, TicketMixChart } from "@/components/app/organizer-charts"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"
import { CalendarDays, Users, DollarSign, Sparkles, Plus, ArrowUpRight, Brain } from "lucide-react"

const myEvents = events.filter((e) => e.org === "Apex Labs" || e.status !== "Past").slice(0, 3)

const aiInsights = [
  {
    title: "Boost weekend promotion",
    body: "DevSummit registrations spike 38% on weekends. Schedule your next email blast for Saturday 9 AM.",
    tag: "Marketing",
  },
  {
    title: "Capacity alert",
    body: "Growth Marketing Live is 76% full and trending. Consider opening 100 more seats now.",
    tag: "Capacity",
  },
  {
    title: "Predicted no-shows",
    body: "Expect ~12% no-show rate. Send a reminder 24h before to recover an estimated 38 attendees.",
    tag: "Retention",
  },
]

export default function OrganizerDashboardPage() {
  return (
    <AppShell role="Organizer" userName="Marcus Reid" title="My Events">
      <div className="space-y-8">
        {/* Header action */}
        <Reveal y={16} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Welcome back, Marcus</h2>
            <p className="text-sm text-muted-foreground">You have 3 active events and 2 collaboration requests.</p>
          </div>
          <button className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5">
            <Plus className="size-4" /> Create Event
          </button>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Registrations" value={1759} trend="+22%" icon={Users} accent="primary" />
          <StatCard label="Revenue (MTD)" value={48200} prefix="$" trend="+14%" icon={DollarSign} accent="secondary" />
          <StatCard label="Active Events" value={3} trend="+1" icon={CalendarDays} accent="flame" />
          <StatCard label="Avg. Match Score" value={91} suffix="%" trend="+4%" icon={Sparkles} accent="primary" />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <RegistrationTrendChart />
          </Reveal>
          <Reveal>
            <TicketMixChart />
          </Reveal>
        </div>

        {/* AI Insights */}
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

        {/* My events */}
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
            {myEvents.map((e) => (
              <EventCard key={e.id} event={e} href={`/organizer/events/${e.id}`} />
            ))}
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
