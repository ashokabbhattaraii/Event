"use client"

import { Calendar, Check, Compass, Loader2, MapPin, Sparkles, TrendingUp, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useRecommendations } from "@/lib/queries/recommendations"
import { useMyTickets, useRegisterForEvent } from "@/lib/queries/tickets"

export default function AttendeeRecommendationsPage() {
  const { data, isLoading } = useRecommendations()
  const { data: ticketData } = useMyTickets()
  const registerMutation = useRegisterForEvent()

  const recommendations = data?.recommendations ?? []
  const registeredEventIds = new Set(
    (ticketData?.tickets ?? []).map((t) => (typeof t.event === "object" ? t.event._id : t.event))
  )

  const topScore = recommendations[0]?.score ?? 0
  const trendingCount = recommendations.filter((r) => r.event.registered / Math.max(1, r.event.capacity) > 0.5).length

  return (
    <AppShell role="Attendee" userName="Attendee" title="Recommendations">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">AI Recommendations</h1>
          <p className="text-sm text-muted-foreground">
            Events ranked by overlap with categories you&apos;ve registered for before, plus live demand.
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Matched Events" value={recommendations.length} icon={Compass} accent="primary" />
          <StatCard label="Top Match Score" value={topScore} icon={Sparkles} accent="secondary" />
          <StatCard label="Trending Picks" value={trendingCount} icon={TrendingUp} accent="flame" />
        </Reveal>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Finding recommendations...
          </div>
        ) : (
          <Reveal stagger={0.08} y={24} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {recommendations.map(({ event, score }) => {
              const isRegistered = registeredEventIds.has(event._id)
              const pct = Math.round((event.registered / event.capacity) * 100)
              return (
                <div
                  key={event._id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_24px_rgba(0,0,0,0.04)]"
                >
                  <div className="relative h-24 bg-brand-gradient">
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      <TrendingUp className="size-3" /> score {score}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-medium text-primary">{event.category}</span>
                    <h3 className="font-display mt-1 text-base font-bold leading-snug text-ink">{event.title}</h3>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" /> {new Date(event.date).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" /> {event.venue}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" /> {event.registered}/{event.capacity} ({pct}%)
                      </span>
                    </div>
                    <button
                      onClick={() => !isRegistered && registerMutation.mutate(event._id)}
                      disabled={isRegistered || registerMutation.isPending}
                      className={`mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        isRegistered
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-brand-gradient text-white hover:-translate-y-0.5"
                      }`}
                    >
                      {isRegistered ? (
                        <>
                          <Check className="size-4" /> Registered
                        </>
                      ) : registerMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Register now"
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </Reveal>
        )}

        {!isLoading && recommendations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No recommendations yet — register for a few events to help us learn your interests.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
