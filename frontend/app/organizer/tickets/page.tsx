"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, QrCode, ShieldCheck, Ticket, XCircle } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useVerifyTicket } from "@/lib/queries/tickets"
import { useMyEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"

function VerifyTicketPanel() {
  const [qrToken, setQrToken] = useState("")
  const verify = useVerifyTicket()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrToken.trim()) return
    verify.mutate(qrToken.trim())
  }

  return (
    <Reveal className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <QrCode className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold text-ink">Verify a Ticket</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the QR token from an attendee&apos;s ticket to check them in.
      </p>
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

  const activeEvents = events.filter((e) => e.status !== "Past")
  const totalRegistered = events.reduce((sum, e) => sum + e.registered, 0)

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Tickets & Check-in">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Tickets & Entry Ops</h1>
          <p className="text-sm text-muted-foreground">Manage live ticketing and QR validation.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Programs" value={activeEvents.length} icon={Ticket} accent="primary" />
          <StatCard label="Total Tickets" value={totalRegistered} icon={QrCode} accent="secondary" />
          <StatCard label="Upcoming Events" value={events.filter((e) => e.status === "Upcoming").length} icon={ShieldCheck} accent="flame" />
          <StatCard label="Live Events" value={events.filter((e) => e.status === "Live").length} icon={CheckCircle2} accent="primary" />
        </Reveal>

        <VerifyTicketPanel />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <Reveal stagger={0.08} y={20} className="grid gap-5 lg:grid-cols-2">
            {activeEvents.map((event) => (
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
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </AppShell>
  )
}
