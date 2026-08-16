"use client"

import { useState } from "react"
import { CalendarDays, Loader2, Radio, Ticket, TrendingUp } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { EventCard } from "@/components/app/event-card"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { SearchInput, FilterSelect } from "@/components/app/search-input"
import { Pagination } from "@/components/app/pagination"
import { useOrgEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import { toAppEvent } from "@/lib/adapters/event"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { EVENT_CATEGORIES, EVENT_TYPES } from "@/lib/constants/event-options"

const statusFilterOptions = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Upcoming", value: "Upcoming" },
  { label: "Live", value: "Live" },
  { label: "Past", value: "Past" },
]

const categoryFilterOptions = [
  { label: "All categories", value: "all" },
  ...EVENT_CATEGORIES.map((c) => ({ label: c, value: c })),
]

const typeFilterOptions = [
  { label: "All formats", value: "all" },
  ...EVENT_TYPES.map((t) => ({ label: t, value: t })),
]

const sortOptions = [
  { label: "Newest first", value: "-createdAt" },
  { label: "Oldest first", value: "createdAt" },
  { label: "Soonest event date", value: "date" },
  { label: "Latest event date", value: "-date" },
  { label: "Title A–Z", value: "title" },
  { label: "Title Z–A", value: "-title" },
]

export default function AdminEventsPage() {
  const { data: userData } = useCurrentUser()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [category, setCategory] = useState("all")
  const [type, setType] = useState("all")
  const [sort, setSort] = useState("-createdAt")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, isError, isFetching } = useOrgEvents({
    search: debouncedSearch,
    status,
    category,
    type,
    sort,
    page,
    limit: 12,
  })
  const user = userData?.user
  const events = data?.events ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? events.length

  const live = events.filter((e) => e.status === "Live").length
  const upcoming = events.filter((e) => e.status === "Upcoming").length
  const totalRegistrations = events.reduce((sum, e) => sum + e.registered, 0)

  const resetPage = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setPage(1)
  }

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Events Oversight">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Events Oversight</h1>
          <p className="text-sm text-muted-foreground">Review event performance across the platform.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tracked Events" value={total} icon={CalendarDays} accent="primary" />
          <StatCard label="Live Right Now" value={live} icon={Radio} accent="secondary" />
          <StatCard label="Upcoming" value={upcoming} icon={TrendingUp} accent="flame" />
          <StatCard label="Registrations" value={totalRegistrations} icon={Ticket} accent="primary" />
        </Reveal>

        <Reveal className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={resetPage(setSearch)}
            placeholder="Search events by title or venue..."
            className="flex-1"
          />
          <div className="flex flex-wrap gap-3">
            <FilterSelect value={status} onChange={resetPage(setStatus)} options={statusFilterOptions} />
            <FilterSelect value={category} onChange={resetPage(setCategory)} options={categoryFilterOptions} />
            <FilterSelect value={type} onChange={resetPage(setType)} options={typeFilterOptions} />
            <FilterSelect value={sort} onChange={resetPage(setSort)} options={sortOptions} />
            {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
        </Reveal>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Could not load events.
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {debouncedSearch || status !== "all" || category !== "all" || type !== "all"
              ? "No events match your search or filters."
              : "No events published yet."}
          </div>
        )}

        {events.length > 0 && (
          <Reveal stagger={0.08} y={22} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event._id} event={toAppEvent(event)} href={`/admin/events/${event._id}`} />
            ))}
          </Reveal>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination pagination={pagination} onPageChange={setPage} />
        )}
      </div>
    </AppShell>
  )
}
