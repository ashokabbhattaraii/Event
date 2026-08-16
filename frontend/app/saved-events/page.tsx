"use client"

import { useState, useEffect, useMemo } from "react"
import { Bookmark, Heart, Loader2, Sparkles, Users, Trash2 } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { SearchInput } from "@/components/app/search-input"
import { Pagination } from "@/components/app/pagination"
import { useAllEvents } from "@/lib/queries/events"
import { useSavedEvents, useRemoveSavedEvent } from "@/lib/queries/saved"
import { toAppEvent } from "@/lib/adapters/event"
import { useCurrentUser } from "@/lib/queries/auth"
import { getSavedIds, saveIds } from "@/lib/saved-events"
import type { AppEvent } from "@/lib/adapters/event"

const PAGE_SIZE = 9

export default function SavedEventsPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData, isLoading } = useAllEvents({ limit: 100 })
  // Signed-in users read/write the server-side saved list; guests use the
  // localStorage fallback so the page works without an account.
  const user = userData?.user
  const isAuthed = !!user
  const { data: savedData, isLoading: isSavedLoading } = useSavedEvents()
  const removeSaved = useRemoveSavedEvent()
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const displayName = user?.name || "Attendee"

  useEffect(() => {
    setSavedIds(getSavedIds())
  }, [])

  const allEvents = useMemo(() => (eventsData?.events ?? []).map(toAppEvent), [eventsData])
  const serverSaved = useMemo(
    () => (savedData?.savedEvents ?? []).map(toAppEvent),
    [savedData]
  )
  const localSaved = useMemo(
    () => allEvents.filter((e) => savedIds.includes(e.id)),
    [allEvents, savedIds]
  )
  const savedEvents = isAuthed ? serverSaved : localSaved

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return savedEvents
    return savedEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.org.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
    )
  }, [savedEvents, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleRemove = (id: string) => {
    if (isAuthed) {
      removeSaved.mutate(id)
      return
    }
    const next = savedIds.filter((sid) => sid !== id)
    setSavedIds(next)
    saveIds(next)
  }

  const handleClearAll = () => {
    if (isAuthed) {
      savedEvents.forEach((e) => removeSaved.mutate(e.id))
      return
    }
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
          <StatCard
            label="High Demand"
            value={savedEvents.filter((e) => e.capacity > 0 && e.registered / e.capacity >= 0.8).length}
            icon={Sparkles}
            accent="secondary"
          />
          <StatCard
            label="Avg Fill Rate"
            value={savedEvents.length > 0 ? Math.round(savedEvents.reduce((a, e) => a + (e.capacity > 0 ? (e.registered / e.capacity) * 100 : 0), 0) / savedEvents.length) : 0}
            suffix="%"
            icon={Heart}
            accent="flame"
          />
        </Reveal>

        {savedIds.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search saved events..."
              className="sm:max-w-sm"
            />
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
            >
              <Trash2 className="size-4" /> Clear all
            </button>
          </div>
        )}

        {(isLoading || (isAuthed && isSavedLoading)) ? (
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
          <>
            {visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
                <p className="text-sm text-muted-foreground">No saved events match your search.</p>
              </div>
            )}
            <Reveal stagger={0.08} y={24} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((event) => (
              <div
                key={event.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1.5"
              >
                <a href={`/event/${event.id}`} className="flex flex-1 flex-col">
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
            {pageCount > 1 && (
              <div className="mt-6">
                <Pagination
                  pagination={{ page: safePage, limit: PAGE_SIZE, total: filtered.length, totalPages: pageCount, hasMore: safePage < pageCount }}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
