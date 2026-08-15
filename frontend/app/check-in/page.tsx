"use client"

import { Calendar, CheckCircle2, Loader2, MapPin, QrCode } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { QrCode as TicketCode } from "@/components/app/qr-code"
import { useMyTickets } from "@/lib/queries/tickets"
import { useCurrentUser } from "@/lib/queries/auth"
import type { EventData } from "@/lib/api/events"

export default function AttendeeCheckInPage() {
  const { data: userData } = useCurrentUser()
  const { data, isLoading } = useMyTickets()
  const user = userData?.user
  const tickets = data?.tickets ?? []

  // Show the NEXT upcoming valid ticket, not just any valid one — the old
  // `tickets.find(status === "valid")` picked the most-recently-registered
  // ticket regardless of its event date, so a stale ticket for an event
  // that already happened (or one months away) was presented as the one
  // to scan at the door today.
  const upcomingTickets = tickets
    .filter((t) => {
      if (t.status !== "valid") return false
      const ev = typeof t.event === "object" ? (t.event as EventData) : null
      return ev ? new Date(ev.date).getTime() > Date.now() : false
    })
    .sort((a, b) => {
      const da = typeof a.event === "object" ? new Date((a.event as EventData).date).getTime() : 0
      const db = typeof b.event === "object" ? new Date((b.event as EventData).date).getTime() : 0
      return da - db
    })
  const nextTicket = upcomingTickets[0]
  const event = nextTicket && typeof nextTicket.event === "object" ? (nextTicket.event as EventData) : null

  if (isLoading) {
    return (
      <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Check-in">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your ticket...
        </div>
      </AppShell>
    )
  }

  if (!nextTicket || !event) {
    return (
      <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Check-in">
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No upcoming ticket ready for check-in.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Check-in">
      <div className="space-y-8">
        <Reveal className="rounded-2xl border border-secondary/20 bg-secondary/[0.05] p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <QrCode className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-ink">Ready for check-in</h1>
              <p className="text-sm text-muted-foreground">Present this QR code at the venue entrance.</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">Active Ticket</span>
            <h2 className="font-display mt-4 text-2xl font-bold text-ink">{event.title}</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Calendar className="size-4" /> {new Date(event.date).toLocaleString()}</p>
              <p className="flex items-center gap-2"><MapPin className="size-4" /> {event.venue}</p>
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary">
              <CheckCircle2 className="size-4" /> QR code is valid and ready to scan.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mx-auto flex w-fit rounded-2xl border border-border p-4">
              <TicketCode seed={nextTicket.qrToken} size={180} />
            </div>
            <p className="mt-4 break-all text-center text-xs text-muted-foreground">Ticket ID: {nextTicket._id.slice(-8).toUpperCase()}</p>
          </div>
        </Reveal>
      </div>
    </AppShell>
  )
}
