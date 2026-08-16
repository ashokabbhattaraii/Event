"use client"

import { useState } from "react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrganizations } from "@/lib/queries/organizations"
import { useMyEvents, useOrgEvents } from "@/lib/queries/events"
import {
  useCoHostOrganizations,
  useAddCoHostOrganization,
  useRemoveCoHostOrganization,
} from "@/lib/queries/organizations"
import {
  Check,
  X,
  Network,
  UserPlus,
  Shield,
  Loader2,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  ChevronLeft,
} from "lucide-react"

const orgStatusStyle: Record<string, string> = {
  active: "bg-secondary/15 text-secondary",
  pending: "bg-flame/15 text-flame",
  suspended: "bg-destructive/10 text-destructive",
  rejected: "bg-muted text-muted-foreground",
}

// Org admins can collaborate on behalf of the whole organization (any event
// under it, not just ones they personally created), matching canManageEvent
// on the backend — organizers only see events they created themselves.
function useManagedEvents(role: string | undefined) {
  const orgEvents = useOrgEvents({ limit: 100, sort: "-date" })
  const myEvents = useMyEvents({ limit: 100, sort: "-date" })
  return role === "admin" ? orgEvents : myEvents
}

function EventPicker({
  onSelect,
}: {
  onSelect: (event: { id: string; title: string; date: string }) => void
}) {
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const { data, isLoading, isError } = useManagedEvents(user?.role)
  const [search, setSearch] = useState("")

  const events = data?.events ?? []
  const filtered = events.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <Reveal y={16}>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-bold text-ink">Choose an event</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Co-hosting is configured per event. Pick which event you want to add or remove
          co-host organizations for.
        </p>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your events..."
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading events...
          </div>
        )}

        {isError && (
          <div className="mt-4 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
            Couldn't load your events.
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
            <Calendar className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              You don't have any events yet. Create one first, then come back here to add
              co-hosts.
            </p>
          </div>
        )}

        {!isLoading && !isError && events.length > 0 && filtered.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No events match "{search}".
          </p>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
            {filtered.map((event) => (
              <button
                key={event._id}
                onClick={() => onSelect({ id: event._id, title: event.title, date: event.date })}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("en-US", { dateStyle: "medium" })} ·{" "}
                    {event.status}
                  </p>
                </div>
                <Network className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  )
}

function CoHostManager({
  eventId,
  eventTitle,
  onBack,
}: {
  eventId: string
  eventTitle: string
  onBack: () => void
}) {
  const { data: userData } = useCurrentUser()
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations()
  const { data: coHostsData, isLoading: coHostsLoading } = useCoHostOrganizations(eventId)
  const addCoHost = useAddCoHostOrganization(eventId)
  const removeCoHost = useRemoveCoHostOrganization(eventId)
  const user = userData?.user
  const organizations = orgsData?.organizations ?? []
  const coHostOrgs = coHostsData?.coHostOrganizations ?? []
  const coHostIds = new Set(coHostOrgs.map((o) => o._id))
  const [search, setSearch] = useState("")
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Exclude owning org and already added co-hosts from addable list
  const addableOrgs = organizations.filter(
    (o) => o._id !== user?.organization && !coHostIds.has(o._id)
  )
  const filteredOrgs = addableOrgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async (orgId: string) => {
    setAddingId(orgId)
    try {
      await addCoHost.mutateAsync(orgId)
    } catch (e) {
      console.error("Failed to add co-host:", e)
    } finally {
      setAddingId(null)
    }
  }

  const handleRemove = async (orgId: string) => {
    setRemovingId(orgId)
    try {
      await removeCoHost.mutateAsync(orgId)
    } catch (e) {
      console.error("Failed to remove co-host:", e)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <Reveal y={16}>
        <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-6 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
          <div className="relative flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Network className="size-6" />
            </span>
            <div className="min-w-0">
              <button
                onClick={onBack}
                className="mb-1 flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white"
              >
                <ChevronLeft className="size-3.5" /> Choose a different event
              </button>
              <h2 className="font-display truncate text-xl font-bold">{eventTitle}</h2>
              <p className="text-sm text-white/80">
                Invite other organizations to co-host this event. Co-host admins can manage
                attendees, check-in, analytics, and event details.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

        {/* Current Co-Hosts */}
        <Reveal stagger={0.1} y={24}>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">Co-Host Organizations</h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {coHostOrgs.length} co-host{coHostOrgs.length !== 1 ? "s" : ""}
              </span>
            </div>

            {(coHostsLoading || addCoHost.isPending || removeCoHost.isPending) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Updating...
              </div>
            )}

            {!coHostsLoading && coHostOrgs.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
                <Network className="mx-auto size-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No co-host organizations yet. Add one below to share event management.
                </p>
              </div>
            )}

            {!coHostsLoading && coHostOrgs.length > 0 && (
              <div className="mt-5 space-y-3">
                {coHostOrgs.map((org) => (
                  <div
                    key={org._id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                        <Shield className="size-5 text-primary" />
                      </span>
                      <div>
                        <p className="font-medium text-ink">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.email || org.phone || org.city ? " · " : ""}
                          {[org.city, org.country].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${org.status ? orgStatusStyle[org.status] : "bg-muted text-muted-foreground"}`}>
                        {org.status}
                      </span>
                      {removingId === org._id ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <button
                          onClick={() => handleRemove(org._id)}
                          className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          disabled={removeCoHost.isPending}
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Add Co-Host */}
        <Reveal stagger={0.1} y={24}>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-bold text-ink">Invite Co-Host Organization</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Search for an approved organization to add as a co-host. They will receive
              organizer-level access to this event (manage attendees, check-in, analytics).
            </p>

            <div className="mt-4 flex gap-2">
              <label htmlFor="search-cohost" className="sr-only">
                Search organizations
              </label>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="search"
                  id="search-cohost"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search organizations by name..."
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            {(orgsLoading || coHostsLoading) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading organizations...
              </div>
            )}

            {!orgsLoading && !coHostsLoading && filteredOrgs.length === 0 && addableOrgs.length > 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-3 text-center">
                <p className="text-sm text-amber-700">No organizations match "{search}".</p>
              </div>
            )}

            {!orgsLoading && !coHostsLoading && addableOrgs.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
                <AlertCircle className="mx-auto size-6 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  All available organizations are already co-hosts or belong to you.
                </p>
              </div>
            )}

            {!orgsLoading && !coHostsLoading && filteredOrgs.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {filteredOrgs.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => handleAdd(org._id)}
                    disabled={addingId === org._id || addCoHost.isPending}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                        <Network className="size-5 text-secondary" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.status === "active" ? "Active" : `Status: ${org.status}`}
                          {org.city && ` · ${org.city}`}
                        </p>
                      </div>
                    </div>
                    {addingId === org._id ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <Plus className="size-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Info */}
        <Reveal stagger={0.1} y={24}>
          <div className="rounded-2xl border border-border bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 size-5 text-primary shrink-0" />
              <div className="space-y-2 text-sm">
                <h4 className="font-bold text-ink">What co-host admins can do</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>View and manage event details (except ownership)</li>
                  <li>Access full attendee roster and check-in dashboard</li>
                  <li>View event analytics and audience segments</li>
                  <li>Manage feedback and networking features</li>
                  <li>Configure reminders and event settings</li>
                </ul>
                <p className="text-xs text-primary/80">
                  <strong>Note:</strong> Only organization admins/owners in the co-host organization
                  receive these permissions. Regular members are not affected.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
    </div>
  )
}

export default function CollaborationPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const [selected, setSelected] = useState<{ id: string; title: string; date: string } | null>(null)

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Collaboration">
      {selected ? (
        <CoHostManager
          eventId={selected.id}
          eventTitle={selected.title}
          onBack={() => setSelected(null)}
        />
      ) : (
        <EventPicker onSelect={setSelected} />
      )}
    </AppShell>
  )
}