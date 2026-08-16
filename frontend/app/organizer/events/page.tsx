"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpRight, CalendarDays, DollarSign, Loader2, Plus, Ticket, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { SearchInput, FilterSelect } from "@/components/app/search-input"
import { Pagination } from "@/components/app/pagination"
import { useMyEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { formatPrice, isFreeEvent } from "@/lib/price"

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Upcoming", value: "Upcoming" },
  { label: "Live", value: "Live" },
  { label: "Past", value: "Past" },
  { label: "Draft", value: "Draft" },
]

export default function OrganizerEventsPage() {
  const { data: userData } = useCurrentUser()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)
  const user = userData?.user

  // Seed search from the topbar's URL (?q=...) — done in an effect, not a
  // state initializer, so it stays hydration-safe on the server render.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")
    if (q) setSearch(q)
  }, [])

  const { data, isLoading, isError, isFetching } = useMyEvents({
    search: debouncedSearch,
    status,
    page,
    limit: 9,
  })
  const events = data?.events || []
  const pagination = data?.pagination

  // Reset to page 1 whenever the search term or filter changes.
  const onSearchChange = (v: string) => {
    setSearch(v)
    setPage(1)
  }
  const onStatusChange = (v: string) => {
    setStatus(v)
    setPage(1)
  }

  const revenueEvents = events.filter((e) => !isFreeEvent(e.price)).length
  const registrations = events.reduce((sum, e) => sum + e.registered, 0)

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="My Events">
      <div className="space-y-8">
        <Reveal className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Event Portfolio</h1>
            <p className="text-sm text-muted-foreground">Track every active program, forecast demand, and review monetization performance.</p>
          </div>
          <Link
            href="/organizer/events/create"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" />
            New Event
          </Link>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Managed Events" value={pagination?.total ?? events.length} icon={CalendarDays} accent="primary" />
          <StatCard label="Registrations (page)" value={registrations} icon={Users} accent="secondary" />
          <StatCard label="Paid Events (page)" value={revenueEvents} icon={DollarSign} accent="flame" />
          <StatCard label="Ticketed Programs" value={pagination?.total ?? events.length} icon={Ticket} accent="primary" />
        </Reveal>

        <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search events by title, venue, or category..."
            className="flex-1"
          />
          <FilterSelect value={status} onChange={onStatusChange} options={statusOptions} />
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </Reveal>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Could not load events from server. Make sure the backend is running.
          </div>
        )}

        {!isLoading && events.length === 0 && !isError && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16">
            <CalendarDays className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || status !== "all"
                ? "No events match your search or filters."
                : "No events yet. Create your first event!"}
            </p>
            {!debouncedSearch && status === "all" && (
              <Link
                href="/organizer/events/create"
                className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Create Event
              </Link>
            )}
          </div>
        )}

        {events.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event._id}
                href={`/organizer/events/${event._id}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    event.status === "Live" ? "bg-green-100 text-green-700" :
                    event.status === "Upcoming" ? "bg-blue-100 text-blue-700" :
                    event.status === "Draft" ? "bg-gray-100 text-gray-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {event.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{event.type}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-ink group-hover:text-primary">
                  {event.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{event.venue}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{event.registered}/{event.capacity} registered</span>
                  <span className="font-semibold text-ink">{formatPrice(event.price)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold text-primary">
                  View workspace
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Reveal>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </Reveal>
        )}
      </div>
    </AppShell>
  )
}
