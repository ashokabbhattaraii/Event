"use client"

import { useState } from "react"
import { notFound, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Heart,
  Loader2,
  MapPin,
  Share2,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useEvent } from "@/lib/queries/events"
import { useMyTickets, useRegisterForEvent } from "@/lib/queries/tickets"
import { useCurrentUser } from "@/lib/queries/auth"
import { useUpdateLocation } from "@/lib/queries/location"
import { eventsApi } from "@/lib/api/events"

const PREDEFINED_AGENDAS: Record<string, { time: string; title: string; speaker: string }[]> = {
  technology: [
    { time: "09:00", title: "Registration & Coffee", speaker: "—" },
    { time: "09:45", title: "Opening Keynote: The Next Decade", speaker: "Dr. Lena Cho" },
    { time: "11:00", title: "Building at Scale (Workshop)", speaker: "Marcus Reid" },
    { time: "13:30", title: "Panel: AI in Production", speaker: "Industry Leaders" },
    { time: "15:30", title: "Networking & Closing", speaker: "—" },
  ],
  business: [
    { time: "09:30", title: "Breakfast & Networking", speaker: "—" },
    { time: "10:15", title: "Market Trends Keynote", speaker: "Sarah Chen" },
    { time: "11:30", title: "Growth Strategy Workshop", speaker: "Tom Adler" },
    { time: "14:00", title: "Investor Pitch Session", speaker: "Venture Panel" },
    { time: "16:00", title: "Closing Reception", speaker: "—" },
  ],
  workshop: [
    { time: "09:00", title: "Setup & Materials", speaker: "—" },
    { time: "10:00", title: "Hands-on Session 1", speaker: "Instructor Team" },
    { time: "12:00", title: "Lunch Break", speaker: "—" },
    { time: "13:00", title: "Hands-on Session 2", speaker: "Instructor Team" },
    { time: "15:30", title: "Showcase & Wrap-up", speaker: "—" },
  ],
}

const PREDEFINED_SPEAKERS: Record<string, { name: string; role: string }[]> = {
  technology: [
    { name: "Dr. Lena Cho", role: "Chief Scientist, Apex Labs" },
    { name: "Marcus Reid", role: "VP Engineering, Velocity" },
    { name: "Priya Nair", role: "Founder, Meridian" },
  ],
  business: [
    { name: "Sarah Chen", role: "CEO, MarketWise" },
    { name: "Tom Adler", role: "Growth Lead, Velocity" },
    { name: "Venture Panel", role: "Angel Investors Collective" },
  ],
  workshop: [
    { name: "Alex Rivera", role: "Senior Engineer, Coreflow" },
    { name: "Jamie Kim", role: "UX Lead, Northwind" },
  ],
}

type RoleEventDetailProps = {
  eventId: string
  role: "Administrator" | "Organizer" | "Attendee"
  userName: string
  title: string
  backHref: string
  backLabel: string
  ticketHref: string
  registerLabel?: string
  registerIcon?: LucideIcon
}

export function RoleEventDetail({
  eventId,
  role,
  userName,
  title,
  backHref,
  backLabel,
  ticketHref,
  registerLabel = "Open tickets",
  registerIcon: RegisterIcon = Ticket,
}: RoleEventDetailProps) {
  const router = useRouter()
  const { data: eventData, isLoading, isError } = useEvent(eventId)
  const { data: ticketData } = useMyTickets()
  const { data: userData } = useCurrentUser()
  const registerMutation = useRegisterForEvent()
  const updateLocation = useUpdateLocation()
  const [saved, setSaved] = useState(false)
  const [showShareFeedback, setShowShareFeedback] = useState(false)

  const event = eventData?.event
  const tickets = ticketData?.tickets ?? []
  const currentUser = userData?.user

  const registeredTicket = tickets.find((t) => {
    const ev = typeof t.event === "object" ? t.event : null
    return ev?._id === eventId
  })
  const isRegistered = !!registeredTicket

  if (isLoading) {
    return (
      <AppShell role={role} userName={userName} title={title}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (isError || !event) notFound()

  const pct = Math.round((event.registered / event.capacity) * 100)
  const isFull = event.registered >= event.capacity
  const categoryKey = event.category?.toLowerCase() || "technology"
  const agenda = PREDEFINED_AGENDAS[categoryKey] || PREDEFINED_AGENDAS.technology
  const speakers = PREDEFINED_SPEAKERS[categoryKey] || PREDEFINED_SPEAKERS.technology

  const userHasLocation = currentUser?.location?.lat != null
  const distanceInfo = null

  const handleRegister = async () => {
    if (isRegistered) {
      router.push(ticketHref)
      return
    }
    registerMutation.mutate(eventId, {
      onSuccess: () => {
        router.push(ticketHref)
      },
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on EventNexus!`,
          url: window.location.href,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setShowShareFeedback(true)
      setTimeout(() => setShowShareFeedback(false), 2000)
    }
  }

  const generateAIInsight = () => {
    const fillRate = event.registered / event.capacity
    const daysUntil = Math.max(0, Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

    let insight = `Based on current demand, ${event.title} `
    if (fillRate > 0.8) {
      insight += "is nearly full. Register soon to secure your spot!"
    } else if (fillRate > 0.5) {
      insight += `is filling steadily at ${pct}% capacity. With ${daysUntil} days to go, spots are going fast.`
    } else if (fillRate > 0.2) {
      insight += `has ${event.capacity - event.registered} spots left. Good availability, but early registration is recommended.`
    } else {
      insight += "has plenty of availability. Great time to register!"
    }

    if (categoryKey === "technology") {
      insight += " AI-driven analysis shows this category has a 4.5/5 attendee satisfaction rating."
    } else if (categoryKey === "business") {
      insight += " Business events in this network see 40%+ networking conversion rates."
    }

    return insight
  }

  return (
    <AppShell role={role} userName={userName} title={title}>
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>

        <Reveal y={18}>
          <div className="relative h-56 overflow-hidden rounded-2xl bg-primary/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.3),transparent_55%)]" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">{event.category}</span>
                <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">{event.type}</span>
                {distanceInfo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
                    <MapPin className="size-3" /> {distanceInfo}
                  </span>
                )}
              </div>
              <h1 className="font-display mt-3 text-3xl font-bold">{event.title}</h1>
              <p className="mt-1 text-sm text-white/85">
                Hosted by{" "}
                {(typeof event.organizer === "object" && event.organizer?.name) || "Organizer"}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Reveal>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-ink">About this event</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {event.description || `Join us for ${event.title}, a ${event.category.toLowerCase()} gathering bringing together builders, leaders, and innovators. Expect hands-on workshops, keynote talks, and curated networking.`}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { icon: Calendar, label: "Date", value: new Date(event.date).toLocaleDateString("en-US", { dateStyle: "medium" }) },
                    { icon: Clock, label: "Time", value: new Date(event.date).toLocaleTimeString("en-US", { timeStyle: "short" }) },
                    { icon: MapPin, label: "Venue", value: event.coordinates?.lat ? `${event.venue} (${event.coordinates.lat.toFixed(4)}, ${event.coordinates.lng.toFixed(4)})` : event.venue },
                    { icon: Users, label: "Registered", value: `${event.registered}/${event.capacity}` },
                  ].map((meta) => (
                    <div key={meta.label} className="rounded-xl bg-muted/50 p-3">
                      <meta.icon className="size-4 text-primary" />
                      <div className="mt-2 text-xs text-muted-foreground">{meta.label}</div>
                      <div className="text-sm font-semibold text-ink">{meta.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-ink">Agenda</h2>
                <ul className="mt-4 space-y-1">
                  {agenda.map((item, index) => (
                    <li key={index} className="flex gap-4 rounded-xl p-3 transition-colors hover:bg-muted/50">
                      <span className="font-mono text-sm font-semibold text-primary">{item.time}</span>
                      <div>
                        <div className="text-sm font-medium text-ink">{item.title}</div>
                        {item.speaker !== "—" && <div className="text-xs text-muted-foreground">{item.speaker}</div>}
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
                  {speakers.map((speaker) => (
                    <div key={speaker.name} className="rounded-xl border border-border p-4 text-center">
                      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {speaker.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <div className="mt-3 text-sm font-semibold text-ink">{speaker.name}</div>
                      <div className="text-xs text-muted-foreground">{speaker.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          <div>
            <Reveal x={20} y={0}>
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.05)]">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-extrabold text-ink">
                    {event.price === "Free" || !event.price ? "Free" : `$${event.price}`}
                  </span>
                  <span className="text-xs text-muted-foreground">per ticket</span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct}% full</span>
                    <span>{event.capacity - event.registered} spots left</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull ? "bg-flame" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={registerMutation.isPending || (isFull && !isRegistered)}
                  className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isRegistered
                      ? "bg-secondary text-secondary-foreground"
                      : isFull
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:-translate-y-0.5 shadow-[0_8px_20px_-10px_rgba(91,76,245,0.8)]"
                  }`}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isRegistered ? (
                    <>
                      <Check className="size-4" /> Registered
                    </>
                  ) : isFull ? (
                    "Event full"
                  ) : (
                    <>
                      <RegisterIcon className="size-4" /> {registerLabel}
                    </>
                  )}
                </button>

                {registerMutation.isError && (
                  <p className="mt-2 text-xs text-amber-600">
                    {(registerMutation.error as any)?.response?.data?.message || "Registration failed"}
                  </p>
                )}

                <Link
                  href={ticketHref}
                  className="mt-2 block rounded-xl border border-border py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-muted"
                >
                  {isRegistered ? "View my ticket" : "View related workspace"}
                </Link>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSaved((value) => !value)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      saved ? "border-flame bg-flame/10 text-flame" : "border-border text-ink hover:bg-muted"
                    }`}
                  >
                    <Heart className={`size-4 ${saved ? "fill-flame" : ""}`} /> {saved ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={handleShare}
                    className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-ink transition-colors hover:bg-muted"
                  >
                    <Share2 className="size-4" /> {showShareFeedback ? "Copied!" : "Share"}
                  </button>
                </div>

                <div className="mt-5 rounded-xl bg-primary/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" /> AI Insight
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {generateAIInsight()}
                  </p>
                </div>

                {!userHasLocation && (
                  <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <MapPin className="size-3.5" /> Enable location
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Share your location to get distance info and better recommendations.
                    </p>
                    <button
                      onClick={() => updateLocation.mutate()}
                      disabled={updateLocation.isPending}
                      className="mt-2 w-full rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      {updateLocation.isPending ? (
                        <Loader2 className="mx-auto size-3.5 animate-spin" />
                      ) : (
                        "Update my location"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
