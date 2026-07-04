import { Calendar, CheckCircle2, MapPin, QrCode } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { QrCode as TicketCode } from "@/components/app/qr-code"
import { events } from "@/lib/data"

const currentTicket = events.find((event) => event.status === "Live") ?? events[0]

export default function AttendeeCheckInPage() {
  return (
    <AppShell role="Attendee" userName="Ava Lindqvist" title="Check-in">
      <div className="space-y-8">
        <Reveal className="rounded-2xl border border-secondary/20 bg-secondary/[0.05] p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <QrCode className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-ink">Ready for check-in</h1>
              <p className="text-sm text-muted-foreground">Present this QR code at the venue entrance or attendee registration desk.</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
            <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">Active Ticket</span>
            <h2 className="font-display mt-4 text-2xl font-bold text-ink">{currentTicket.title}</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Calendar className="size-4" /> {currentTicket.date}</p>
              <p className="flex items-center gap-2"><MapPin className="size-4" /> {currentTicket.venue}</p>
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary">
              <CheckCircle2 className="size-4" /> QR code is valid and ready to scan.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
            <div className="mx-auto flex w-fit rounded-2xl border border-border p-4">
              <TicketCode seed={`${currentTicket.id}-checkin`} size={180} />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">Ticket ID: {currentTicket.id.toUpperCase()}</p>
          </div>
        </Reveal>
      </div>
    </AppShell>
  )
}