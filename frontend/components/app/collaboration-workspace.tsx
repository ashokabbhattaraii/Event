"use client"

import { useState } from "react"
import Link from "next/link"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrganizations } from "@/lib/queries/organizations"
import { useMyEvents, useOrgEvents } from "@/lib/queries/events"
import {
  useCoHostOrganizations,
  useRemoveCoHostOrganization,
  useEventInvitations,
  useInviteCoHost,
  useCancelInvitation,
  useMyInvitations,
  useRespondToInvitation,
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
  Tag,
  Layers,
  CalendarClock,
  MapPin,
  FileText,
  Hash,
  Users,
  ShieldCheck,
  Clock,
  Send,
  Inbox,
  Building2,
} from "lucide-react"

// Dimension keys emitted by the backend match engine
// (utils/collaborationEngine.js). Keeping the mapping here — rather than
// parsing the human-readable `detail` string — is why the engine persists a
// stable `factor` key at all.
const FACTOR_ICONS: Record<string, typeof Sparkles> = {
  category: Tag,
  format: Layers,
  date: CalendarClock,
  location: MapPin,
  audience: Users,
  content: FileText,
  tags: Hash,
}

const FACTOR_LABELS: Record<string, string> = {
  category: "Same category",
  format: "Same format",
  date: "Date proximity",
  location: "Location proximity",
  audience: "Audience size fit",
  content: "Content overlap",
  tags: "Shared tags",
}

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
  return role === "admin" || role === "org_admin" ? orgEvents : myEvents
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

// Three genuinely different things, previously blurred into one list:
//   1. ACTIVE co-hosts — the other org agreed; the access link is live.
//   2. PENDING invitations — sent, awaiting their answer; no access granted.
//   3. Everything else (declined/cancelled) — closed, kept for context.
// The old UI showed only (1), labelled the invite form "Invite" while it
// actually granted access instantly, and rendered the ORGANIZATION's account
// status ("active") next to each row — which read as "this co-host is
// active" and hid the fact that no agreement had ever taken place.
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
  const { data: invitesData, isLoading: invitesLoading } = useEventInvitations(eventId)
  const invite = useInviteCoHost(eventId)
  const cancelInvite = useCancelInvitation(eventId)
  const removeCoHost = useRemoveCoHostOrganization(eventId)

  const user = userData?.user
  const organizations = orgsData?.organizations ?? []
  const coHostOrgs = coHostsData?.coHostOrganizations ?? []
  const invitations = invitesData?.invitations ?? []

  const [search, setSearch] = useState("")
  const [composeFor, setComposeFor] = useState<{ id: string; name: string } | null>(null)
  const [message, setMessage] = useState("")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const pending = invitations.filter((i) => i.status === "pending")
  const closed = invitations.filter((i) => i.status === "declined" || i.status === "cancelled")

  const coHostIds = new Set(coHostOrgs.map((o) => o._id))
  const pendingOrgIds = new Set(pending.map((i) => i.toOrganization._id))

  // Only offer organizations that aren't already co-hosting, aren't already
  // invited, and aren't us.
  const invitable = organizations.filter(
    (o) => o._id !== user?.organization && !coHostIds.has(o._id) && !pendingOrgIds.has(o._id)
  )
  const filtered = invitable.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))

  const handleSend = async () => {
    if (!composeFor) return
    try {
      await invite.mutateAsync({ organizationId: composeFor.id, message })
      setComposeFor(null)
      setMessage("")
      setSearch("")
    } catch {
      // Error surfaced inline from invite.isError below.
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

  const handleCancel = async (invitationId: string) => {
    setCancellingId(invitationId)
    try {
      await cancelInvite.mutateAsync(invitationId)
    } catch (e) {
      console.error("Failed to cancel invitation:", e)
    } finally {
      setCancellingId(null)
    }
  }

  const loading = coHostsLoading || invitesLoading

  return (
    <div className="space-y-6">
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
                Invite other organizations to co-host. They must accept before they get any
                access to this event.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 1. ACTIVE CO-HOSTS — agreed, access is live */}
      <Reveal stagger={0.1} y={24}>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Active co-hosts</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Accepted the invitation — their admins can manage this event now.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
              {coHostOrgs.length} active
            </span>
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && coHostOrgs.length === 0 && (
            <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center">
              <Network className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No active co-hosts yet. Invite an organization below — nobody gets access until
                they accept.
              </p>
            </div>
          )}

          {!loading && coHostOrgs.length > 0 && (
            <div className="mt-5 space-y-3">
              {coHostOrgs.map((org) => (
                <div
                  key={org._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary/25 bg-secondary/[0.05] px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15">
                      <ShieldCheck className="size-5 text-secondary" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{org.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[org.city, org.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
                      <CheckCircle2 className="size-3.5" /> Co-hosting
                    </span>
                    {removingId === org._id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        onClick={() => handleRemove(org._id)}
                        disabled={removeCoHost.isPending}
                        title="Revoke this organization's access to the event"
                        className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                      >
                        <Trash2 className="size-3.5" /> Revoke access
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* 2. PENDING — sent, awaiting their decision, NO access granted */}
      {pending.length > 0 && (
        <Reveal stagger={0.1} y={24}>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">Awaiting response</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Invitation sent — no access granted until they accept.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-flame/15 px-2.5 py-1 text-xs font-semibold text-flame">
                {pending.length} pending
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {pending.map((inv) => (
                <div
                  key={inv._id}
                  className="rounded-xl border border-flame/25 bg-flame/[0.04] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-flame/15">
                        <Clock className="size-5 text-flame" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{inv.toOrganization.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited {new Date(inv.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-flame/15 px-2.5 py-1 text-xs font-semibold text-flame">
                        <Clock className="size-3.5" /> Pending
                      </span>
                      {cancellingId === inv._id ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <button
                          onClick={() => handleCancel(inv._id)}
                          disabled={cancelInvite.isPending}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-ink disabled:opacity-60"
                        >
                          Cancel invite
                        </button>
                      )}
                    </div>
                  </div>
                  {inv.message && (
                    <p className="mt-2.5 rounded-lg bg-background/70 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">
                      “{inv.message}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* 3. INVITE — explicit request, with a message */}
      <Reveal stagger={0.1} y={24}>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-bold text-ink">Invite an organization</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Sends a request they can accept or decline. Co-host admins get access to attendees,
            check-in and analytics — so nothing is shared until they agree.
          </p>

          {composeFor ? (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Network className="size-4 text-primary" /> Inviting {composeFor.name}
                </div>
                <button
                  onClick={() => {
                    setComposeFor(null)
                    setMessage("")
                  }}
                  className="rounded-md p-1 text-muted-foreground hover:text-ink"
                  aria-label="Cancel"
                >
                  <X className="size-4" />
                </button>
              </div>
              <label htmlFor="invite-message" className="mt-3 block text-xs font-medium text-muted-foreground">
                Message (optional) — tell them why you want to work together
              </label>
              <textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="e.g. Our audiences overlap and we'd love to run a joint workshop track…"
                className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{message.length}/1000</span>
              </div>
              {invite.isError && (
                <p className="mt-2 text-xs text-destructive">
                  {(invite.error as any)?.response?.data?.message || "Couldn't send the invitation."}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={invite.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {invite.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Send invitation
                </button>
                <button
                  onClick={() => {
                    setComposeFor(null)
                    setMessage("")
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-ink hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search organizations by name..."
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {orgsLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading organizations...
                </div>
              )}

              {!orgsLoading && invitable.length === 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
                  <AlertCircle className="mx-auto size-6 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Every available organization is already co-hosting or has a pending invitation.
                  </p>
                </div>
              )}

              {!orgsLoading && invitable.length > 0 && filtered.length === 0 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  No organizations match &ldquo;{search}&rdquo;.
                </p>
              )}

              {!orgsLoading && filtered.length > 0 && (
                <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {filtered.map((org) => (
                    <button
                      key={org._id}
                      onClick={() => setComposeFor({ id: org._id, name: org.name })}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Network className="size-5 text-primary" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{org.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[org.city, org.country].filter(Boolean).join(", ") || "Location not set"}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                        <Send className="size-3.5" /> Invite
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Reveal>

      {/* Closed invitations — context for why an org isn't co-hosting */}
      {closed.length > 0 && (
        <Reveal stagger={0.1} y={24}>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Previous invitations
            </h3>
            <div className="mt-4 space-y-2">
              {closed.map((inv) => (
                <div
                  key={inv._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{inv.toOrganization.name}</p>
                    {inv.responseMessage && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">
                        “{inv.responseMessage}”
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* Info */}
      <Reveal stagger={0.1} y={24}>
        <div className="rounded-2xl border border-border bg-primary/5 p-6">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-2 text-sm">
              <h4 className="font-bold text-ink">What an accepted co-host can do</h4>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>View and manage event details (except ownership)</li>
                <li>Access the full attendee roster and check-in dashboard</li>
                <li>View event analytics and audience segments</li>
                <li>Manage feedback and networking features</li>
                <li>Configure reminders and event settings</li>
              </ul>
              <p className="text-xs text-primary/80">
                <strong>Note:</strong> only organization admins in the co-host organization
                receive these permissions — regular members are unaffected. Revoking access
                removes them immediately.
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
  // Matches backend collaborationController's requireOrgAdmin: only an
  // org_admin (never the org-less system admin) can accept/decline on
  // behalf of an organization.
  const isAdmin = user?.role === "org_admin"
  // Admin-side roles live under /admin/*, organizers under /organizer/* —
  // link into whichever console the viewer actually belongs to.
  const eventBase =
    user?.role === "admin" || user?.role === "org_admin" ? "/admin/events" : "/organizer/events"
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

      {/* Matched factors — strongest contributor first (the engine sorts
          them), each labelled with its dimension and how many of the final
          score's points it actually supplied. Previously every reason was
          rendered as an identical grey pill, implying they all weighed the
          same when "Same city" and "No shared tags" plainly don't. */}
      {suggestion.matchedFactors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestion.matchedFactors.map((f) => {
            const Icon = FACTOR_ICONS[f.factor] ?? Sparkles
            return (
              <span
                key={f.factor + f.detail}
                title={`${FACTOR_LABELS[f.factor] ?? f.factor}${f.contribution != null ? ` — contributes ${f.contribution} of ${suggestion.score} points` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <Icon className="size-3 shrink-0 text-primary/70" />
                {f.detail}
                {f.contribution != null && f.contribution > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                    +{f.contribution}
                  </span>
                )}
              </span>
            )
          })}
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
            {/* Keep each role inside its own console: an org admin works out
                of /admin/*, an organizer out of /organizer/*. Hardcoding
                /organizer/* here sent org admins across into the organizer
                section for what is the same event workspace. */}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${eventBase}/${myEvent._id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Calendar className="size-3.5" /> Open {myEvent.title}
              </Link>
              <Link
                href={`${eventBase}/${theirEvent._id}`}
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

// Shared by /organizer/collaboration and /admin/collaboration (an Org
// Admin's tenant-scoped console) — identical UI, both driven entirely by the
// signed-in user's actual role/organization rather than which URL they're
// on, so it behaves correctly under either shell.
// The other half of the handshake: invitations addressed to MY organization.
// Without this the invited side had no way to answer at all — which is why
// the old implementation skipped consent and wrote the co-host link directly.
// Shown at the top of the workspace because it's the only part that needs
// action from someone else.
function InvitationInbox({ user }: { user?: { role?: string } }) {
  const { data, isLoading } = useMyInvitations()
  const respond = useRespondToInvitation()
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const pending = (data?.invitations ?? []).filter((i) => i.status === "pending")
  // Matches the server: only an org admin can bind the organization.
  const canRespond = user?.role === "org_admin"

  if (isLoading || pending.length === 0) return null

  const act = async (invitationId: string, action: "accept" | "decline", message = "") => {
    setActingOn(invitationId)
    try {
      await respond.mutateAsync({ invitationId, action, message })
      setDecliningId(null)
      setReason("")
    } catch (e) {
      console.error("Failed to respond to invitation:", e)
    } finally {
      setActingOn(null)
    }
  }

  return (
    <Reveal y={16}>
      <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6">
        <div className="flex items-center gap-2">
          <Inbox className="size-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-ink">
            Co-host invitations for you
          </h2>
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {pending.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Another organization wants you to co-host their event. Accepting gives your admins
          access to its attendees, check-in and analytics.
        </p>

        <div className="mt-5 space-y-3">
          {pending.map((inv) => (
            <div key={inv._id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Building2 className="size-3.5" /> {inv.fromOrganization.name}
                  </p>
                  <p className="mt-1 font-semibold text-ink">{inv.event.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(inv.event.date).toLocaleDateString("en-US", { dateStyle: "medium" })} ·{" "}
                    {inv.event.venue} · {inv.event.capacity} capacity
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-flame/15 px-2.5 py-1 text-xs font-semibold text-flame">
                  Awaiting your decision
                </span>
              </div>

              {inv.message && (
                <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm italic leading-relaxed text-ink/90">
                  “{inv.message}”
                  {inv.invitedBy?.name && (
                    <span className="mt-1 block text-[11px] not-italic text-muted-foreground">
                      — {inv.invitedBy.name}
                    </span>
                  )}
                </p>
              )}

              <div className="mt-4 border-t border-border pt-3">
                {!canRespond ? (
                  <p className="text-xs text-muted-foreground">
                    Only an organization admin can accept or decline this invitation.
                  </p>
                ) : decliningId === inv._id ? (
                  <div>
                    <label htmlFor={`decline-${inv._id}`} className="text-xs font-medium text-muted-foreground">
                      Reason (optional) — shared with {inv.fromOrganization.name}
                    </label>
                    <textarea
                      id={`decline-${inv._id}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="e.g. Dates clash with our own event that week."
                      className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => act(inv._id, "decline", reason)}
                        disabled={actingOn === inv._id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {actingOn === inv._id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                        Confirm decline
                      </button>
                      <button
                        onClick={() => {
                          setDecliningId(null)
                          setReason("")
                        }}
                        className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-ink hover:bg-muted"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => act(inv._id, "accept")}
                      disabled={actingOn === inv._id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {actingOn === inv._id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      Accept &amp; co-host
                    </button>
                    <button
                      onClick={() => setDecliningId(inv._id)}
                      disabled={actingOn === inv._id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
                    >
                      <X className="size-3.5" /> Decline
                    </button>
                  </div>
                )}
                {respond.isError && actingOn === inv._id && (
                  <p className="mt-2 text-xs text-destructive">
                    {(respond.error as any)?.response?.data?.message || "Couldn't submit your response."}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  )
}

export function CollaborationWorkspace() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const [selected, setSelected] = useState<{ id: string; title: string; date: string } | null>(null)

  if (selected) {
    return (
      <div className="space-y-6">
        <InvitationInbox user={user} />
        <CoHostManager
          eventId={selected.id}
          eventTitle={selected.title}
          onBack={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <InvitationInbox user={user} />
      <CollaborationSuggestions user={user} />
      <EventPicker onSelect={setSelected} />
    </div>
  )
}
