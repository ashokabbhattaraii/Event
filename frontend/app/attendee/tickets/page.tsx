"use client"

import { useState } from "react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { QrCode } from "@/components/app/qr-code"
import { useMyTickets } from "@/lib/queries/tickets"
import type { EventData } from "@/lib/api/events"
import { Calendar, MapPin, CheckCircle2, Loader2 } from "lucide-react"

const tabs = ["Upcoming", "Past"] as const

export default function MyTicketsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Upcoming")
  const { data, isLoading } = useMyTickets()
  const tickets = data?.tickets ?? []

  const list = tickets.filter((t) => {
    const event = typeof t.event === "object" ? (t.event as EventData) : null
    const isPast = event?.status === "Past"
    return tab === "Upcoming" ? !isPast : isPast
  })

  return (
    <AppShell role="Attendee" userName="Attendee" title="My Tickets">
      <div className="space-y-6">
        <Reveal y={14} className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
                tab === t ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </Reveal>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading tickets...
          </div>
        ) : (
          <Reveal stagger={0.1} y={24} className="grid gap-5 lg:grid-cols-2">
            {list.map((ticket) => {
              const event = typeof ticket.event === "object" ? (ticket.event as EventData) : null
              return (
                <div
                  key={ticket._id}
                  className="relative flex overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_24px_rgba(0,0,0,0.05)]"
                >
                  <div className="w-2 shrink-0 bg-brand-gradient" />

                  <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {ticket.status === "checked-in" ? "Checked In" : "Valid"}
                        </span>
                      </div>
                      <h3 className="font-display mt-2 text-lg font-bold text-ink">
                        {event?.title ?? "Event"}
                      </h3>
                      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                        {event && (
                          <>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="size-3.5" /> {new Date(event.date).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="size-3.5" /> {event.venue}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <span className="font-mono text-[10px] text-ink">{ticket._id}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-2 border-t border-dashed border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                      {ticket.status !== "checked-in" ? (
                        <>
                          <div className="rounded-xl border border-border p-2">
                            <QrCode seed={ticket.qrToken} size={84} />
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">Scan to check in</span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-secondary">
                          <CheckCircle2 className="size-10" />
                          <span className="text-xs font-semibold">Attended</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
                  <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
                </div>
              )
            })}
          </Reveal>
        )}

        {!isLoading && list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">No {tab.toLowerCase()} tickets.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
