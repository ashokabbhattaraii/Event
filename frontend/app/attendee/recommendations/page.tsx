import { Compass, Sparkles, TrendingUp, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { EventCard } from "@/components/app/event-card"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"

const recommended = [...events].sort((a, b) => b.matchScore - a.matchScore).slice(0, 4)

export default function AttendeeRecommendationsPage() {
  return (
    <AppShell role="Attendee" userName="Ava Lindqvist" title="Recommendations">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">AI Recommendations</h1>
          <p className="text-sm text-muted-foreground">Events selected from your interests, attendance history, and live community momentum.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Matched Events" value={recommended.length} icon={Compass} accent="primary" />
          <StatCard label="Top Match" value={recommended[0]?.matchScore ?? 0} suffix="%" icon={Sparkles} accent="secondary" />
          <StatCard label="Trending Picks" value={2} icon={TrendingUp} accent="flame" />
          <StatCard label="Shared Interest" value={68} suffix="%" icon={Users} accent="primary" />
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {recommended.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}