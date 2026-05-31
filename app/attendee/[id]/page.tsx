"use client"

import { use, useState } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app/app-shell"
import { attendeeNav } from "@/components/app/nav-configs"
import { Reveal } from "@/components/anim/reveal"
import { events } from "@/lib/data"
import {
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Clock,
  Check,
  Share2,
  Heart,
  ArrowLeft,
  Ticket,
  Sparkles,
} from "lucide-react"

const agenda = [
  { time: "09:00", title: "Registration & Coffee", speaker: "—" },
  { time: "09:45", title: "Opening Keynote: The Next Decade", speaker: "Dr. Lena Cho" },
  { time: "11:00", title: "Building at Scale (Workshop)", speaker: "Marcus Reid" },
  { time: "13:30", title: "Panel: AI in Production", speaker: "Industry Leaders" },
  { time: "15:30", title: "Networking & Closing", speaker: "—" },
]

const speakers = [
  { name: "Dr. Lena Cho", role: "Chief Scientist, Apex Labs" },
  { name: "Marcus Reid", role: "VP Engineering, Velocity" },
  { name: "Priya Nair", role: "Founder, Meridian" },
]

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const event = events.find((e) => e.id === id)
  const [registered, setRegistered] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!event) notFound()

  const pct = Math.round((event.registered / event.capacity) * 100)

  return (
    <AppShell nav={attendeeNav} role="Attendee" userName="Ava Lindqvist" title="Event Details">
      <div className="space-y-6">
        <Link
          href="/attendee"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to discover
        </Link>

        {/* Banner */}
        <Reveal y={18}>
          <div className={`relative h-56 overflow-hidden rounded-2xl ${event.gradient}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.3),transparent_55%)]" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">
                  {event.category}
                </span>
                <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
                  {event.type}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur">
                  <TrendingUp className="size-3" /> {event.matchScore}% match
                </span>
              </div>
              <h1 className="font-display mt-3 text-3xl font-bold">{event.title}</h1>
              <p className="mt-1 text-sm text-white/85">Hosted by {event.org}</p>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            <Reveal>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-ink">About this event</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Join {event.org} for {event.title}, a flagship {event.category.toLowerCase()} gathering bringing
                  together builders, leaders, and innovators. Expect hands-on workshops, keynote talks, and curated
                  networking — all powered by EventNexus&apos; intelligent scheduling and real-time coordination.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { icon: Calendar, label: "Date", value: event.date.split(" · ")[0] },
                    { icon: Clock, label: "Time", value: event.date.split(" · ")[1] ?? "TBA" },
                    { icon: MapPin, label: "Venue", value: event.venue },
                    { icon: Users, label: "Registered", value: `${event.registered}/${event.capacity}` },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-muted/50 p-3">
                      <m.icon className="size-4 text-primary" />
                      <div className="mt-2 text-xs text-muted-foreground">{m.label}</div>
                      <div className="text-sm font-semibold text-ink">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-ink">Agenda</h2>
                <ul className="mt-4 space-y-1">
                  {agenda.map((a, i) => (
                    <li key={i} className="flex gap-4 rounded-xl p-3 transition-colors hover:bg-muted/50">
                      <span className="font-mono text-sm font-semibold text-primary">{a.time}</span>
                      <div>
                        <div className="text-sm font-medium text-ink">{a.title}</div>
                        {a.speaker !== "—" && <div className="text-xs text-muted-foreground">{a.speaker}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-ink">Speakers</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {speakers.map((s) => (
                    <div key={s.name} className="rounded-xl border border-border p-4 text-center">
                      <span className="bg-brand-gradient mx-auto flex size-12 items-center justify-center rounded-full text-sm font-bold text-white">
                        {s.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <div className="mt-3 text-sm font-semibold text-ink">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Sticky register card */}
          <div>
            <Reveal x={20} y={0}>
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.05)]">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-extrabold text-ink">{event.price}</span>
                  <span className="text-xs text-muted-foreground">per ticket</span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct}% full</span>
                    <span>{event.capacity - event.registered} spots left</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <button
                  onClick={() => setRegistered((r) => !r)}
                  className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    registered
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-brand-gradient text-white hover:-translate-y-0.5"
                  }`}
                >
                  {registered ? (
                    <>
                      <Check className="size-4" /> You&apos;re registered
                    </>
                  ) : (
                    <>
                      <Ticket className="size-4" /> Register now
                    </>
                  )}
                </button>

                {registered && (
                  <Link
                    href="/attendee/tickets"
                    className="mt-2 block rounded-xl border border-border py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-muted"
                  >
                    View my ticket
                  </Link>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSaved((s) => !s)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      saved ? "border-flame bg-flame/10 text-flame" : "border-border text-ink hover:bg-muted"
                    }`}
                  >
                    <Heart className={`size-4 ${saved ? "fill-flame" : ""}`} /> {saved ? "Saved" : "Save"}
                  </button>
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-ink transition-colors hover:bg-muted">
                    <Share2 className="size-4" /> Share
                  </button>
                </div>

                <div className="mt-5 rounded-xl bg-primary/[0.05] p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" /> AI Insight
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Based on your interests, you&apos;re a {event.matchScore}% match. Attendees like you rated this
                    event 4.8/5.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
