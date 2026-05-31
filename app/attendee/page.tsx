"use client"

import { useState, useMemo } from "react"
import { AppShell } from "@/components/app/app-shell"
import { attendeeNav } from "@/components/app/nav-configs"
import { EventCard } from "@/components/app/event-card"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"
import { Search, Sparkles, SlidersHorizontal } from "lucide-react"

const categories = ["All", "Technology", "Marketing", "Business", "Design", "Networking"]

export default function AttendeeDiscoverPage() {
  const [active, setActive] = useState("All")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchCat = active === "All" || e.category === active
      const matchQuery =
        query === "" ||
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.org.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQuery
    })
  }, [active, query])

  const recommended = [...events].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3)

  return (
    <AppShell nav={attendeeNav} role="Attendee" userName="Ava Lindqvist" title="Discover Events">
      <div className="space-y-8">
        {/* Hero search */}
        <Reveal y={16}>
          <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-7 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_15%,rgba(255,255,255,0.28),transparent_50%)]" />
            <div className="relative">
              <h2 className="font-display text-2xl font-bold">Find your next event</h2>
              <p className="mt-1 text-sm text-white/80">847 events curated for you this month</p>
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

        {/* AI recommendations */}
        <div id="ai">
          <Reveal y={14} className="mb-4 flex items-center gap-2">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
              <Sparkles className="size-4" />
            </span>
            <h3 className="font-display text-lg font-bold text-ink">Recommended for you</h3>
            <span className="rounded-full bg-secondary/12 px-2 py-0.5 text-[11px] font-semibold text-secondary">
              AI matched
            </span>
          </Reveal>
          <Reveal stagger={0.1} y={28} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </Reveal>
        </div>

        {/* Filters + grid */}
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

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <p className="text-sm text-muted-foreground">No events match your search.</p>
            </div>
          ) : (
            <Reveal stagger={0.07} y={28} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </Reveal>
          )}
        </div>
      </div>
    </AppShell>
  )
}
