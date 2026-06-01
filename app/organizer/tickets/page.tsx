import { CheckCircle2, QrCode, ShieldCheck, Ticket } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"

const ticketPrograms = events.filter((event) => event.status !== "Past")

export default function OrganizerTicketsPage() {
  return (
    <AppShell role="Organizer" userName="Marcus Reid" title="Tickets & Check-in">
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