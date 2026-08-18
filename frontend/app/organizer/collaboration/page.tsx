"use client"

import { useState } from "react"
import Link from "next/link"
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
  useCollaborationSuggestions,
  useGenerateSuggestions,
  useAcceptSuggestion,
  useDeclineSuggestion,
} from "@/lib/queries/collaboration"
import type { CollaborationSuggestion } from "@/lib/api/collaboration"
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
  Sparkles,
  RefreshCw,
  Bot,
  CheckCircle2,
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

// --- AI Collaboration Suggestions -----------------------------------------
// The backend match engine (collaborationEngine.js) pairs this org's events
// with other organizations' events on category, format, date proximity,
// venue, audience size, content and tags. Both orgs' admins see the same
// suggestion; when BOTH accept, the events become mutual co-hosts and the
// full collaboration surface unlocks (event workspace, attendees, check-in,
// analytics, feedback on both events).
function SuggestionCard({
  suggestion,
  user,
}: {
  suggestion: CollaborationSuggestion
  user?: { _id: string; organization?: string; role?: string }
}) {
  const accept = useAcceptSuggestion()
  const decline = useDeclineSuggestion()
  const [acting, setActing] = useState<"accept" | "decline" | null>(null)

  const orgId = user?.organization
  const isMineA = !!orgId && String(suggestion.orgA._id) === String(orgId)
  const mine = isMineA ? suggestion.statusA : suggestion.statusB
  const theirs = isMineA ? suggestion.statusB : suggestion.statusA
  const myEvent = isMineA ? suggestion.eventA : suggestion.eventB
  const theirEvent = isMineA ? suggestion.eventB : suggestion.eventA
  const theirOrg = isMineA ? suggestion.orgB : suggestion.orgA
  const isAdmin = user?.role === "admin"
  const isCoHosted = suggestion.resolvedOutcome === "co-hosted"
  const closed = suggestion.resolvedOutcome === "rejected"

  const scoreTone =
    suggestion.score >= 80
      ? "bg-secondary/15 text-secondary"
      : suggestion.score >= 70
        ? "bg-primary/10 text-primary"
        : "bg-flame/10 text-flame"

  const handleAccept = async () => {
    setActing("accept")
    try {
      await accept.mutateAsync(suggestion._id)
    } catch {
    } finally {
      setActing(null)
    }
  }
  const handleDecline = async () => {
    setActing("decline")
    try {
      await decline.mutateAsync(suggestion._id)
    } catch {
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-colors">
      {/* Header: score + AI badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone}`}>
            {suggestion.score}% match
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {suggestion.rationaleSource === "ai" ? (
              <><Bot className="size-3" /> AI match</>
            ) : (
              <>
                <Sparkles className="size-3" /> Match analysis
              </>
            )}
          </span>
        </div>
        {isCoHosted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
            <CheckCircle2 className="size-3.5" /> Co-hosting
          </span>
        )}
      </div>

      {/* The two events */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Your event</p>
          <p className="mt-1 font-semibold text-ink">{myEvent.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(myEvent.date).toLocaleDateString("en-US", { dateStyle: "medium" })} · {myEvent.venue} ·{" "}
            {myEvent.capacity} capacity
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {theirOrg.name}
          </p>
          <p className="mt-1 font-semibold text-ink">{theirEvent.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(theirEvent.date).toLocaleDateString("en-US", { dateStyle: "medium" })} · {theirEvent.venue} ·{" "}
            {theirEvent.capacity} capacity
          </p>
        </div>
      </div>

      {/* AI rationale */}
      <p className="mt-4 rounded-xl bg-muted/40 p-3.5 text-sm leading-relaxed text-ink/90">
        {suggestion.rationale}
      </p>

      {/* Matched factors */}
      {suggestion.matchedFactors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestion.matchedFactors.map((f) => (
            <span
              key={f.factor + f.detail}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {f.detail}
            </span>
          ))}
        </div>
      )}

      {/* Decision / status area */}
      <div className="mt-5 border-t border-border pt-4">
        {isCoHosted ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-secondary">
                <CheckCircle2 className="size-4" /> You&apos;re co-hosting {theirOrg.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Both sides accepted — you can now manage both events together
                (attendees, check-in, analytics, feedback, session schedule).
                Remove the partnership anytime from the co-host list.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/organizer/events/${myEvent._id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Calendar className="size-3.5" /> Open {myEvent.title}
              </Link>
              <Link
                href={`/organizer/events/${theirEvent._id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Network className="size-3.5" /> Open {theirEvent.title}
              </Link>
            </div>
          </div>
        ) : closed ? (
          <p className="text-xs text-muted-foreground">
            {mine === "declined"
              ? "You declined this suggestion."
              : `${theirOrg.name} declined this suggestion.`}
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {mine === "accepted" ? (
                <>
                  <span className="font-semibold text-secondary">You accepted</span> — waiting for{" "}
                  {theirOrg.name} to accept.
                </>
              ) : theirs === "accepted" ? (
                <>
                  <span className="font-semibold text-ink">{theirOrg.name} accepted</span> — accept to
                  start co-hosting.
                </>
              ) : (
                <>Your organization must accept — {theirOrg.name} hasn&apos;t decided yet.</>
              )}
            </p>
            <div className="flex gap-2">
              {isAdmin && mine === "suggested" ? (
                <>
                  <button
                    onClick={handleAccept}
                    disabled={acting !== null || accept.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
                  >
                    {acting === "accept" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Accept
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={acting !== null || decline.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
                  >
                    <X className="size-3.5" /> Decline
                  </button>
                </>
              ) : (
                <span className="rounded-lg bg-muted px-3 py-2 text-[11px] font-medium text-muted-foreground">
                  Awaiting your org admin&apos;s decision
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CollaborationSuggestions({
  user,
}: {
  user?: { _id: string; organization?: string; role?: string }
}) {
  const { data, isLoading, isError } = useCollaborationSuggestions()
  const generate = useGenerateSuggestions()
  const suggestions = data?.suggestions ?? []

  // Confirmed co-hosts (both accepted) sink to the bottom; actionable ones
  // and rejected ones stay grouped: active first, closed last.
  const active = suggestions.filter((s) => !s.resolvedOutcome)
  const closed = suggestions.filter((s) => s.resolvedOutcome)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h2 className="font-display text-xl font-bold text-ink">AI Collaboration Suggestions</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Events from other organizations that match yours on category, format, dates, venue,
            audience and content. Accept together and you&apos;ll manage both events as co-hosts.
          </p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          {generate.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {generate.isPending ? "Scanning..." : "Scan for new matches"}
        </button>
      </div>

      {generate.isSuccess && (
        <div className="rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary">
          {generate.data?.message}
        </div>
      )}
      {generate.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {(generate.error as any)?.response?.data?.message || "Couldn't scan for matches."}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading suggestions...
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
          Couldn&apos;t load suggestions.
        </div>
      )}

      {!isLoading && !isError && suggestions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Bot className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No collaboration matches yet. Publish an event and hit{" "}
            <span className="font-semibold text-ink">Scan for new matches</span> — the AI will pair it
            with compatible events from other organizations.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-4">
          {active.map((s) => (
            <SuggestionCard key={s._id} suggestion={s} user={user} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <h3 className="pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Resolved
          </h3>
          <div className="space-y-4">
            {closed.map((s) => (
              <SuggestionCard
                key={s._id}
                suggestion={s}
                user={user}
              />
            ))}
          </div>
        </>
      )}
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
        <div className="space-y-10">
          <CollaborationSuggestions user={user} />
          <EventPicker onSelect={setSelected} />
        </div>
      )}
    </AppShell>
  )
}