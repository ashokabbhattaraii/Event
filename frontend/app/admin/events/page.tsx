"use client"

import { CalendarDays, Loader2, Radio, Ticket, TrendingUp } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { EventCard } from "@/components/app/event-card"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useAllEvents } from "@/lib/queries/events"
import { toAppEvent } from "@/lib/adapters/event"

export default function AdminEventsPage() {
  const { data, isLoading, isError } = useAllEvents({ limit: 50 })
  const events = data?.events ?? []
  const total = data?.pagination?.total ?? events.length

  const live = events.filter((e) => e.status === "Live").length
  const upcoming = events.filter((e) => e.status === "Upcoming").length
  const totalRegistrations = events.reduce((sum, e) => sum + e.registered, 0)

  return (
    <AppShell role="Administrator" userName="Admin" title="Events Oversight">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Events Oversight</h1>
          <p className="text-sm text-muted-foreground">Review event performance, live status, and demand trends across the platform.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tracked Events" value={total} icon={CalendarDays} accent="primary" />
          <StatCard label="Live Right Now" value={live} icon={Radio} accent="secondary" />
          <StatCard label="Upcoming" value={upcoming} icon={TrendingUp} accent="flame" />
          <StatCard label="Registrations" value={totalRegistrations} icon={Ticket} accent="primary" />
        </Reveal>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Could not load events. Make sure the backend is running.
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No events published yet.
          </div>
        )}

        {events.length > 0 && (
          <Reveal stagger={0.08} y={22} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={toAppEvent(event)}
                href={`/admin/events/${event._id}`}
              />
            ))}
          </Reveal>
        )}
      </div>
    </AppShell>
  )
}
