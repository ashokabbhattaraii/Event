"use client"

import { useState, useMemo } from "react"
import { AppShell } from "@/components/app/app-shell"
import { EventCard } from "@/components/app/event-card"
import { Reveal } from "@/components/anim/reveal"
import { useAllEvents } from "@/lib/queries/events"
import { useRecommendations } from "@/lib/queries/recommendations"
import { useCurrentUser } from "@/lib/queries/auth"
import { toAppEvent } from "@/lib/adapters/event"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { Loader2, Search, Sparkles, SlidersHorizontal } from "lucide-react"

const categories = ["All", "Technology", "Business", "Music", "Education", "Design"]

export default function AttendeeDiscoverPage() {
  const { data: userData } = useCurrentUser()
  const [active, setActive] = useState("All")
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const user = userData?.user

  const { data, isLoading, isError } = useAllEvents({
    search: debouncedQuery,
    category: active === "All" ? undefined : active,
    limit: 50,
  })
  // The real recommendation engine (backend/src/utils/recommendationEngine.js
  // — CF via the AI service, or a deterministic fallback) already filters to
  // Upcoming/Live events and ranks by actual interest/proximity/demand
  // signals. This used to be hand-rolled from the plain event list sorted by
  // fill rate, which pulled in Past events since that list isn't
  // status-filtered — a naive local sort is never a substitute for the real
  // engine, only a stand-in that quietly drifted from what it should show.
  const { data: recommendationsData } = useRecommendations()

  const events = useMemo(() => (data?.events ?? []).map(toAppEvent), [data])
  const recommended = useMemo(
    () => (recommendationsData?.recommendations ?? []).slice(0, 3).map((r) => toAppEvent(r.event)),
    [recommendationsData]
  )

  return (
    <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Discover Events">
      <div className="space-y-8">
        <Reveal y={16}>
          <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-7 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_15%,rgba(255,255,255,0.28),transparent_50%)]" />
            <div className="relative">
              <h2 className="font-display text-2xl font-bold">Find your next event</h2>
              <p className="mt-1 text-sm text-white/80">{events.length} events available</p>
              <div className="mt-5 flex max-w-xl items-center gap-2 rounded-xl bg-white p-1.5">
                <Search className="ml-2 size-5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events, organizers, topics..."
                  className="flex-1 bg-transparent px-1 py-2 text-sm text-ink outline-none"
                />
                <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Search</button>
              </div>
            </div>
          </div>
        </Reveal>

        {recommended.length > 0 && (
          <div id="ai">
            <Reveal y={14} className="mb-4 flex items-center gap-2">
              <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
                <Sparkles className="size-4" />
              </span>
              <h3 className="font-display text-lg font-bold text-ink">Recommended for you</h3>
              <span className="rounded-full bg-secondary/12 px-2 py-0.5 text-[11px] font-semibold text-secondary">AI matched</span>
            </Reveal>
            <Reveal stagger={0.1} y={28} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </Reveal>
          </div>
        )}

        <div>
          <Reveal y={14} className="mb-5 flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active === c
                    ? "bg-ink text-white"
                    : "border border-border bg-card text-muted-foreground hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
            <button className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-ink">
              <SlidersHorizontal className="size-4" /> Filters
            </button>
          </Reveal>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 py-6 text-center text-sm text-amber-700">
              Could not load events. Make sure the backend is running.
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <p className="text-sm text-muted-foreground">No events match your search.</p>
            </div>
          ) : (
            <Reveal stagger={0.07} y={28} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </Reveal>
          )}
        </div>
      </div>
    </AppShell>
  )
}
