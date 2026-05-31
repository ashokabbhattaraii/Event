"use client"

import { useState } from "react"
import { AppShell } from "@/components/app/app-shell"
import { attendeeNav } from "@/components/app/nav-configs"
import { Reveal } from "@/components/anim/reveal"
import { QrCode } from "@/components/app/qr-code"
import { events } from "@/lib/data"
import { Calendar, MapPin, Download, CheckCircle2 } from "lucide-react"

const tabs = ["Upcoming", "Past"] as const

const ticketMeta: Record<string, { seat: string; tier: string; code: string }> = {
  "devsummit-2026": { seat: "GA · Hall A", tier: "Standard", code: "DVS-26-4471" },
  "ai-research-forum": { seat: "Row C · Seat 12", tier: "VIP", code: "AIR-26-0098" },
  "ux-workshop": { seat: "Lab 2", tier: "Standard", code: "UXW-26-2231" },
  "founder-mixer": { seat: "Rooftop", tier: "Standard", code: "FNM-26-1180" },
  "growth-marketing": { seat: "Online", tier: "Standard", code: "GML-26-7752" },
}

export default function MyTicketsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Upcoming")
  const myTickets = events.filter((e) => ticketMeta[e.id])
  const list = myTickets.filter((e) => (tab === "Upcoming" ? e.status !== "Past" : e.status === "Past"))

  return (
    <AppShell nav={attendeeNav} role="Attendee" userName="Ava Lindqvist" title="My Tickets">
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
              {t} ({myTickets.filter((e) => (t === "Upcoming" ? e.status !== "Past" : e.status === "Past")).length})
            </button>
          ))}
        </Reveal>

        <Reveal stagger={0.1} y={24} className="grid gap-5 lg:grid-cols-2">
          {list.map((e) => {
            const meta = ticketMeta[e.id]
            return (
              <div
                key={e.id}
                className="relative flex overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_24px_rgba(0,0,0,0.05)]"
              >
                {/* Left color rail */}
                <div className={`w-2 shrink-0 ${e.gradient}`} />

                <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {meta.tier}
                      </span>
                      {e.status === "Live" && (
                        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                          Live now
                        </span>
                      )}
                    </div>
                    <h3 className="font-display mt-2 text-lg font-bold text-ink">{e.title}</h3>
                    <p className="text-xs text-muted-foreground">by {e.org}</p>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" /> {e.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" /> {e.venue} · {meta.seat}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="font-mono text-xs text-ink">{meta.code}</span>
                      <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <Download className="size-3.5" /> Save
                      </button>
                    </div>
                  </div>

                  {/* QR / status */}
                  <div className="flex shrink-0 flex-col items-center gap-2 border-t border-dashed border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    {tab === "Upcoming" ? (
                      <>
                        <div className="rounded-xl border border-border p-2">
                          <QrCode seed={meta.code} size={84} />
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

                {/* Perforation notches */}
                <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
                <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
              </div>
            )
          })}
        </Reveal>

        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">No {tab.toLowerCase()} tickets.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
