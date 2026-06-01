import { CalendarDays, DollarSign, Ticket, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { EventCard } from "@/components/app/event-card"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"

const myEvents = events.filter((event) => event.org === "Apex Labs" || event.status !== "Past")

export default function OrganizerEventsPage() {
  const revenueEvents = myEvents.filter((event) => event.price !== "Free").length
  const registrations = myEvents.reduce((sum, event) => sum + event.registered, 0)

  return (
    <AppShell role="Organizer" userName="Marcus Reid" title="My Events">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Event Portfolio</h1>
          <p className="text-sm text-muted-foreground">Track every active program, forecast demand, and review monetization performance.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Managed Events" value={myEvents.length} icon={CalendarDays} accent="primary" />
          <StatCard label="Registrations" value={registrations} icon={Users} accent="secondary" />
          <StatCard label="Paid Events" value={revenueEvents} icon={DollarSign} accent="flame" />
          <StatCard label="Ticketed Programs" value={myEvents.length} icon={Ticket} accent="primary" />
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {myEvents.map((event) => (
            <EventCard key={event.id} event={event} href={`/organizer/events/${event.id}`} />
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}