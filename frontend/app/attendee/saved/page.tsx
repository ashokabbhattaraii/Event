"use client"

import { useState, useEffect, useMemo } from "react"
import { Bookmark, Heart, Loader2, Sparkles, Users, Trash2 } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useAllEvents } from "@/lib/queries/events"
import { toAppEvent } from "@/lib/adapters/event"
import { useCurrentUser } from "@/lib/queries/auth"

const STORAGE_KEY = "savedEventIds"

function getSavedIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export default function SavedEventsPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData, isLoading } = useAllEvents({ limit: 100 })
  const [savedIds, setSavedIds] = useState<string[]>([])

  const user = userData?.user
  const displayName = user?.name || "Attendee"

  useEffect(() => {
    setSavedIds(getSavedIds())
  }, [])

  const allEvents = useMemo(() => (eventsData?.events ?? []).map(toAppEvent), [eventsData])
  const savedEvents = useMemo(
    () => allEvents.filter((e) => savedIds.includes(e.id)),
    [allEvents, savedIds]
  )

  const handleRemove = (id: string) => {
    const next = savedIds.filter((sid) => sid !== id)
    setSavedIds(next)
    saveIds(next)
  }

  const handleClearAll = () => {
    setSavedIds([])
    saveIds([])
  }

  return (
    <AppShell role="Attendee" userName={displayName} title="Saved Events">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Saved Events</h1>
          <p className="text-sm text-muted-foreground">Keep track of interesting events and compare options before you register.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Saved Events" value={savedEvents.length} icon={Bookmark} accent="primary" />
          <StatCard label="High Match" value={savedEvents.filter((e) => (e as any).matchScore && (e as any).matchScore >= 80).length} icon={Sparkles} accent="secondary" />
          <StatCard label="Wishlist Score" value={savedEvents.length > 0 ? Math.round(savedEvents.reduce((a, e) => a + (e as any).matchScore || 80, 0) / savedEvents.length) : 0} suffix="%" icon={Heart} accent="flame" />
        </Reveal>

        {savedIds.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
            >
              <Trash2 className="size-4" /> Clear all
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : savedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <Heart className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No saved events yet. Browse events and tap the heart icon to save them.
            </p>
          </div>
        ) : (
          <Reveal stagger={0.08} y={24} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {savedEvents.map((event) => (
              <div
                key={event.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1.5"
              >
                <a href={`/attendee/${event.id}`} className="flex flex-1 flex-col">
                  <div className={`relative h-32 ${event.gradient}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
                    <div className="absolute left-3 top-3 flex gap-2">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink">
                        {event.status}
                      </span>
                      <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                        {event.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-medium text-primary">{event.category}</span>
                    <h3 className="font-display mt-1 text-base font-bold leading-snug text-ink">{event.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">by {event.org}</p>
                    <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" /> {event.registered}/{event.capacity}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <span className="font-display text-base font-bold text-ink">{event.price}</span>
                      <span className="text-xs font-semibold text-primary">View details &rarr;</span>
                    </div>
                  </div>
                </a>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleRemove(event.id)
                  }}
                  className="absolute right-3 top-36 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-flame shadow-sm transition-colors hover:bg-white hover:text-flame"
                  title="Remove from saved"
                >
                  <Heart className="size-4 fill-flame" />
                </button>
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </AppShell>
  )
}
