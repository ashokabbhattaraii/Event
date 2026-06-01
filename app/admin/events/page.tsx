import { CalendarDays, Radio, Ticket, TrendingUp } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { EventCard } from "@/components/app/event-card"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"

export default function AdminEventsPage() {
  const live = events.filter((event) => event.status === "Live").length
  const upcoming = events.filter((event) => event.status === "Upcoming").length
  const totalRegistrations = events.reduce((sum, event) => sum + event.registered, 0)

  return (
    <AppShell role="Administrator" userName="Jordan Reyes" title="Events Oversight">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Events Oversight</h1>
          <p className="text-sm text-muted-foreground">Review event performance, live status, and demand trends across the platform.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tracked Events" value={events.length} icon={CalendarDays} accent="primary" />
          <StatCard label="Live Right Now" value={live} icon={Radio} accent="secondary" />
          <StatCard label="Upcoming" value={upcoming} icon={TrendingUp} accent="flame" />
          <StatCard label="Registrations" value={totalRegistrations} icon={Ticket} accent="primary" />
        </Reveal>

        <Reveal stagger={0.08} y={22} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} href={`/admin/events/${event.id}`} />
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}