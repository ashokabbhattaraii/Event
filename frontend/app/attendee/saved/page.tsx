import { Bookmark, Heart, Sparkles, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { EventCard } from "@/components/app/event-card"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"

const savedEvents = events.slice(0, 4)

export default function SavedEventsPage() {
  return (
    <AppShell role="Attendee" userName="Ava Lindqvist" title="Saved Events">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Saved Events</h1>
          <p className="text-sm text-muted-foreground">Keep track of interesting events and compare options before you register.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Saved Events" value={savedEvents.length} icon={Bookmark} accent="primary" />
          <StatCard label="High Match" value={3} icon={Sparkles} accent="secondary" />
          <StatCard label="Popular Picks" value={2} icon={Users} accent="flame" />
          <StatCard label="Wishlist Score" value={89} suffix="%" icon={Heart} accent="primary" />
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {savedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}