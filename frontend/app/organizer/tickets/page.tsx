"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
  Ticket,
  UserRound,
  XCircle,
} from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { QrScanner } from "@/components/app/qr-scanner"
import { useEventAttendees, useVerifyTicket } from "@/lib/queries/tickets"
import { useMyEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import type { EventAttendee } from "@/lib/api/tickets"

const statusPill: Record<EventAttendee["status"], { label: string; className: string }> = {
  "checked-in": { label: "Checked in", className: "bg-secondary/15 text-secondary" },
  valid: { label: "Registered", className: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
}

function AttendeeRow({ attendee }: { attendee: EventAttendee }) {
  const pill = statusPill[attendee.status]
  const paid = attendee.payment.status === "paid"
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <UserRound className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">{attendee.attendee.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}>
            {pill.label}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{attendee.attendee.email}</p>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-ink">
          <CreditCard className="size-3.5 text-muted-foreground" />
          {paid ? `${attendee.payment.amount} ${attendee.payment.currency}` : "—"}
        </div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {attendee.payment.status === "paid"
            ? `Paid · ${attendee.payment.provider}`
            : attendee.payment.status}
        </p>
      </div>
      <div className="hidden text-right text-xs text-muted-foreground sm:block">
        <div>Registered {new Date(attendee.registeredAt).toLocaleDateString()}</div>
        {attendee.checkedInAt && (
          <div className="text-secondary">
            Checked in {new Date(attendee.checkedInAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}

function AttendeeRoster({ eventId, isOpen }: { eventId: string; isOpen: boolean }) {
  const { data, isLoading, isError } = useEventAttendees(isOpen ? eventId : undefined)

  if (!isOpen) return null
  if (isLoading) {
    return (
      <div className="mt-4 flex items-center justify-center rounded-xl border border-border bg-background py-6">
        <Loader2 className="size-4 animate-spin text-primary" />
      </div>
    )
  }
  if (isError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Couldn't load the attendee list. Make sure you're the organizer or an admin of this event's
        organization.
      </div>
    )
  }

  const { attendees, counts } = data!
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="font-display text-xl font-bold text-ink">{counts.total}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Registered</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="font-display text-xl font-bold text-secondary">{counts.checkedIn}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Checked in</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="font-display text-xl font-bold text-primary">{counts.valid}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Not arrived</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="font-display text-xl font-bold text-destructive">{counts.cancelled}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cancelled</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {attendees.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No registrations yet. Tickets appear here as attendees register.
          </p>
        ) : (
          attendees.map((a) => <AttendeeRow key={a.ticketId} attendee={a} />)
        )}
      </div>
    </div>
  )
}

function VerifyTicketPanel({ onCheckedIn }: { onCheckedIn: () => void }) {
  const [qrToken, setQrToken] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const verify = useVerifyTicket()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrToken.trim()) return
    verify.mutate(qrToken.trim(), { onSuccess: onCheckedIn })
  }

  const handleScan = (decodedText: string) => {
    setScannerOpen(false)
    verify.mutate(decodedText, { onSuccess: onCheckedIn })
  }

  return (
    <Reveal className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <QrCode className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-ink">Verify a Ticket</h2>
        </div>
        <button
          type="button"
          onClick={() => setScannerOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            scannerOpen ? "border-primary bg-primary/10 text-primary" : "border-border text-ink hover:bg-muted"
          }`}
        >
          <Camera className="size-3.5" /> {scannerOpen ? "Close scanner" : "Scan with camera"}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Scan an attendee&apos;s QR ticket, or paste the QR token manually, to check them in.
      </p>

      {scannerOpen && (
        <div className="mt-4">
          <QrScanner active={scannerOpen} onScan={handleScan} onClose={() => setScannerOpen(false)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={qrToken}
          onChange={(e) => setQrToken(e.target.value)}
          placeholder="Paste QR token..."
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
        <button
          type="submit"
          disabled={verify.isPending || !qrToken.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {verify.isPending && <Loader2 className="size-4 animate-spin" />}
          Check In
        </button>
      </form>

      {verify.isSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary">
          <CheckCircle2 className="size-4" /> Ticket verified and checked in.
        </div>
      )}
      {verify.isError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <XCircle className="size-4" />
          {(verify.error as any)?.response?.data?.message || "Verification failed."}
        </div>
      )}
    </Reveal>
  )
}

export default function OrganizerTicketsPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData, isLoading } = useMyEvents({ limit: 50 })
  const user = userData?.user
  const events = eventsData?.events ?? []
  const queryClient = useQueryClient()

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const activeEvents = events.filter((e) => e.status !== "Past")
  const totalRegistered = events.reduce((sum, e) => sum + e.registered, 0)

  // After a successful check-in, refresh the roster of the expanded event so
  // the counts and status pills reflect the just-scanned ticket.
  const refreshRoster = () => {
    if (expandedId) {
      queryClient.invalidateQueries({ queryKey: ["events", expandedId, "attendees"] })
    }
  }

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Tickets & Check-in">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Tickets & Entry Ops</h1>
          <p className="text-sm text-muted-foreground">
            Manage live ticketing and QR validation — check attendees in and drill into each event's
            roster.
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Programs" value={activeEvents.length} icon={Ticket} accent="primary" />
          <StatCard label="Total Tickets" value={totalRegistered} icon={QrCode} accent="secondary" />
          <StatCard label="Upcoming Events" value={events.filter((e) => e.status === "Upcoming").length} icon={ShieldCheck} accent="flame" />
          <StatCard label="Live Events" value={events.filter((e) => e.status === "Live").length} icon={CheckCircle2} accent="primary" />
        </Reveal>

        <VerifyTicketPanel onCheckedIn={refreshRoster} />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <Reveal stagger={0.08} y={20} className="grid gap-5 lg:grid-cols-2">
            {activeEvents.map((event) => {
              const open = expandedId === event._id
              return (
                <div key={event._id} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-ink">{event.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()} · {event.venue}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued</p>
                      <p className="mt-2 font-display text-2xl font-bold text-ink">{event.registered}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Capacity</p>
                      <p className="mt-2 font-display text-2xl font-bold text-ink">{event.capacity}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Fill Rate</p>
                      <p className="mt-2 font-display text-2xl font-bold text-ink">
                        {Math.round((event.registered / event.capacity) * 100)}%
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : event._id)}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-muted"
                  >
                    {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    {open ? "Hide attendee list" : "View attendee list"}
                  </button>

                  <AttendeeRoster eventId={event._id} isOpen={open} />
                </div>
              )
            })}
          </Reveal>
        )}
      </div>
    </AppShell>
  )
}
