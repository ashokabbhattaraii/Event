"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, QrCode, ShieldCheck, Ticket, XCircle } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useVerifyTicket } from "@/lib/queries/tickets"
import { events } from "@/lib/data"

const ticketPrograms = events.filter((event) => event.status !== "Past")

function VerifyTicketPanel() {
  const [qrToken, setQrToken] = useState("")
  const verify = useVerifyTicket()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrToken.trim()) return
    verify.mutate(qrToken.trim())
  }

  return (
    <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <QrCode className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold text-ink">Verify a Ticket</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the QR token from an attendee&apos;s ticket to check them in. Tickets from other organizations are rejected automatically.
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
  return (
    <AppShell role="Organizer" userName="Organizer" title="Tickets & Check-in">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Tickets & Entry Ops</h1>
          <p className="text-sm text-muted-foreground">Manage live ticketing readiness, QR validation, and front-of-house operations.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Programs Live" value={ticketPrograms.length} icon={Ticket} accent="primary" />
          <StatCard label="QR Coverage" value={96} suffix="%" icon={QrCode} accent="secondary" />
          <StatCard label="Verified Check-ins" value={842} icon={CheckCircle2} accent="flame" />
          <StatCard label="Fraud Blocks" value={9} icon={ShieldCheck} accent="primary" />
        </Reveal>

        <VerifyTicketPanel />

        <Reveal stagger={0.08} y={20} className="grid gap-5 lg:grid-cols-2">
          {ticketPrograms.map((event) => (
            <div key={event.id} className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">{event.title}</h2>
                  <p className="text-sm text-muted-foreground">{event.date} · {event.venue}</p>
                </div>
                <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">Ready</span>
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
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Forecast</p>
                  <p className="mt-2 font-display text-2xl font-bold text-ink">{event.predicted}</p>
                </div>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}
