import Link from "next/link"
import { MapPin, Calendar, TrendingUp, Users } from "lucide-react"
import type { AppEvent } from "@/lib/data"

const statusStyle: Record<string, string> = {
  Live: "bg-secondary text-secondary-foreground",
  Upcoming: "bg-white/90 text-ink",
  Past: "bg-white/70 text-ink",
}

export function EventCard({ event, href }: { event: AppEvent; href?: string }) {
  const pct = Math.round((event.registered / event.capacity) * 100)
  return (
    <Link
      href={href ?? `/attendee/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-28px_rgba(26,26,46,0.45)]"
    >
      {/* Banner */}
      <div className={`relative h-32 ${event.gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[event.status]}`}>
            {event.status}
          </span>
          <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {event.type}
          </span>
        </div>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <TrendingUp className="size-3" /> {event.matchScore}% match
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-medium text-primary">{event.category}</span>
        <h3 className="font-display mt-1 text-base font-bold leading-snug text-ink">{event.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">by {event.org}</p>

        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" /> {event.date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {event.venue}
          </span>
        </div>

        {/* Capacity bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {event.registered.toLocaleString()}/{event.capacity.toLocaleString()}
            </span>
            <span className="font-mono">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="font-display text-base font-bold text-ink">{event.price}</span>
          <span className="text-xs font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            View details &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}
