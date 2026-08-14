"use client"

import { useState } from "react"
import { notFound, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Globe,
  Heart,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Share2,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { QrCode } from "@/components/app/qr-code"
import { FeedbackForm } from "@/components/app/feedback-form"
import { FeedbackSummaryPanel } from "@/components/app/feedback-summary"
import { NetworkingPanel } from "@/components/app/networking-panel"
import { VenueMap } from "@/components/app/venue-map"
import { EventQrPoster } from "@/components/app/event-qr-poster"
import { useEvent } from "@/lib/queries/events"
import { useMyTickets, useRegisterForEvent, useCancelTicket } from "@/lib/queries/tickets"
import { useCurrentUser } from "@/lib/queries/auth"
import { useUpdateLocation } from "@/lib/queries/location"
import { usePaymentConfig, useCreateCheckoutSession, useInitiateEsewaPayment } from "@/lib/queries/payments"
import { submitEsewaForm } from "@/lib/esewa"
import { formatPrice, isFreeEvent } from "@/lib/price"

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

// Haversine distance in km — mirrors the backend's utils/geo.js so the
// event detail page can show "X km away" without an extra API round-trip.
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
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
  const isAttendee = role === "Attendee"

  const { data: eventData, isLoading, isError } = useEvent(eventId)
  const { data: ticketData } = useMyTickets()
  const { data: userData } = useCurrentUser()
  const { data: paymentConfig } = usePaymentConfig()
  const registerMutation = useRegisterForEvent()
  const cancelMutation = useCancelTicket()
  const checkoutMutation = useCreateCheckoutSession()
  const esewaMutation = useInitiateEsewaPayment()
  const updateLocation = useUpdateLocation()
  const [saved, setSaved] = useState(false)
  const [showShareFeedback, setShowShareFeedback] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const event = eventData?.event
  const tickets = ticketData?.tickets ?? []
  const currentUser = userData?.user

  const registeredTicket = tickets.find((t) => {
    const ev = typeof t.event === "object" ? t.event : null
    return ev?._id === eventId
  })
  const isRegistered = !!registeredTicket && registeredTicket.status !== "cancelled"

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

  const pct = event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0
  const isFull = event.registered >= event.capacity
  const isPast = new Date(event.date) <= new Date()
  const free = isFreeEvent(event.price)

  const userHasLocation = currentUser?.location?.lat != null
  const distance =
    userHasLocation && event.coordinates?.lat != null
      ? distanceKm(currentUser!.location as any, event.coordinates as any)
      : null

  const handlePrimaryAction = async () => {
    if (!isAttendee) {
      router.push(ticketHref)
      return
    }
    if (isRegistered) {
      router.push(ticketHref)
      return
    }
    if (!free) {
      checkoutMutation.mutate(eventId, {
        onSuccess: (res) => {
          window.location.href = res.url
        },
      })
      return
    }
    registerMutation.mutate(eventId, {
      onSuccess: () => {
        router.push(ticketHref)
      },
    })
  }

  const handlePayWithStripe = () => {
    checkoutMutation.mutate(eventId, {
      onSuccess: (res) => {
        window.location.href = res.url
      },
    })
  }

  const handlePayWithEsewa = () => {
    esewaMutation.mutate(eventId, {
      onSuccess: (res) => submitEsewaForm(res.action, res.fields),
    })
  }

  const handleCancel = () => {
    if (!registeredTicket) return
    cancelMutation.mutate(registeredTicket._id, {
      onSuccess: () => setConfirmingCancel(false),
    })
  }

  // Always the public, no-login-required URL — sharing the authed route
  // (e.g. /attendee/123) would send recipients straight to a login wall.
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${eventId}` : ""

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on EventNexus!`,
          url: publicUrl,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(publicUrl)
      setShowShareFeedback(true)
      setTimeout(() => setShowShareFeedback(false), 2000)
    }
  }

  const aiInsight = (() => {
    const fillRate = event.capacity > 0 ? event.registered / event.capacity : 0
    const daysUntil = Math.max(0, Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

    if (isPast) {
      return `This event has concluded with ${event.registered}/${event.capacity} registered (${pct}% of capacity).`
    }
    if (fillRate > 0.8) return `${event.title} is nearly full at ${pct}% capacity. Register soon to secure a spot.`
    if (fillRate > 0.5) {
      return `Filling steadily at ${pct}% capacity, with ${daysUntil} day${daysUntil === 1 ? "" : "s"} to go — spots are going fast.`
    }
    if (fillRate > 0.2) {
      return `${event.capacity - event.registered} spots left. Good availability, but early registration is recommended.`
    }
    return "Plenty of availability right now — a great time to register."
  })()

  const canLeaveFeedback = isAttendee && isPast && isRegistered

  const primaryLabel = (() => {
    if (!isAttendee) return registerLabel
    if (isRegistered) return "View my ticket"
    if (isFull) return "Event full"
    if (!free) return `Buy ticket — ${formatPrice(event.price)}`
    return registerLabel
  })()

  const primaryPending = isAttendee && (registerMutation.isPending || checkoutMutation.isPending)
  const primaryDisabled = isAttendee ? primaryPending || (isFull && !isRegistered) : false

  // Paid events offer a choice of rail instead of a single generic "Buy
  // ticket" button: eSewa settles natively in NPR (works out of the box —
  // see utils/esewa.js's sandbox defaults), Stripe can't settle in NPR so
  // it charges a converted USD amount instead (see utils/currency.js).
  const showPaymentChoice = isAttendee && !isRegistered && !isFull && !free
  const isNprEvent = (event.price.currency || "NPR").toUpperCase() === "NPR"
  const usdEstimate =
    isNprEvent && paymentConfig?.nprUsdRate
      ? (event.price.amount / paymentConfig.nprUsdRate).toFixed(2)
      : null

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
          <div className="relative h-64 overflow-hidden rounded-2xl bg-primary/10">
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.3),transparent_55%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">{event.category}</span>
                <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">{event.type}</span>
                {distance != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
                    <MapPin className="size-3" /> {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)} km away`}
                  </span>
                )}
                {isPast && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">Concluded</span>
                )}
              </div>
              <h1 className="font-display mt-3 text-3xl font-bold">{event.title}</h1>
              <p className="mt-1 text-sm text-white/85">
                Hosted by{" "}
                {(typeof event.organizer === "object" && event.organizer?.name) || "Organizer"}
              </p>
              {!!event.tags?.length && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {event.tags.map((t) => (
                    <span key={t} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Reveal>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-ink">About this event</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {event.description || `Join us for ${event.title}, a ${event.category.toLowerCase()} gathering bringing together builders, leaders, and innovators.`}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { icon: Calendar, label: "Date", value: new Date(event.date).toLocaleDateString("en-US", { dateStyle: "medium" }) },
                    { icon: Clock, label: "Time", value: new Date(event.date).toLocaleTimeString("en-US", { timeStyle: "short" }) },
                    { icon: MapPin, label: "Venue", value: event.venue },
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

            {!!event.highlights?.length && (
              <Reveal>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
                    <Sparkles className="size-4 text-primary" /> What to expect
                  </h2>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {event.highlights.map((h, idx) => (
                      <li key={idx} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm text-ink">
                        <Check className="mt-0.5 size-4 shrink-0 text-secondary" /> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            {!!event.agenda?.length && (
              <Reveal>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
                    <ListChecks className="size-4 text-primary" /> Agenda
                  </h2>
                  <ol className="mt-4 space-y-4 border-l-2 border-border pl-4">
                    {event.agenda.map((item, idx) => (
                      <li key={idx} className="relative">
                        <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                        <div className="text-xs font-semibold uppercase tracking-wide text-primary">{item.time}</div>
                        <div className="text-sm font-semibold text-ink">{item.title}</div>
                        {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>
            )}

            {!!event.speakers?.length && (
              <Reveal>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-display text-lg font-bold text-ink">Speakers & Hosts</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {event.speakers.map((sp, idx) => (
                      <div key={idx} className="flex gap-3 rounded-xl bg-muted/40 p-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                          {sp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink">{sp.name}</div>
                          {sp.role && <div className="text-xs text-primary">{sp.role}</div>}
                          {sp.bio && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sp.bio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {(event.requirements || event.refundPolicy || event.contactEmail || event.contactPhone || event.website) && (
              <Reveal>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-display text-lg font-bold text-ink">Good to know</h2>
                  <div className="mt-4 space-y-4">
                    {event.requirements && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What to bring</div>
                        <p className="mt-1 text-sm text-ink">{event.requirements}</p>
                      </div>
                    )}
                    {event.refundPolicy && (
                      <div className="flex gap-2">
                        <RotateCcw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Refund policy</div>
                          <p className="mt-1 text-sm text-ink">{event.refundPolicy}</p>
                        </div>
                      </div>
                    )}
                    {(event.contactEmail || event.contactPhone || event.website) && (
                      <div className="flex flex-wrap gap-3 border-t border-border pt-4 text-sm">
                        {event.contactEmail && (
                          <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-1.5 text-primary hover:underline">
                            <Mail className="size-3.5" /> {event.contactEmail}
                          </a>
                        )}
                        {event.contactPhone && (
                          <a href={`tel:${event.contactPhone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                            <Phone className="size-3.5" /> {event.contactPhone}
                          </a>
                        )}
                        {event.website && (
                          <a href={event.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                            <Globe className="size-3.5" /> Website
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            )}

            {event.coordinates?.lat != null && event.coordinates?.lng != null && (
              <Reveal>
                <VenueMap lat={event.coordinates.lat} lng={event.coordinates.lng} venue={event.venue} />
              </Reveal>
            )}

            <Reveal>
              <EventQrPoster eventId={eventId} eventTitle={event.title} />
            </Reveal>

            {!isAttendee && <FeedbackSummaryPanel eventId={eventId} />}

            {isAttendee && canLeaveFeedback && (
              <Reveal>
                <FeedbackForm eventId={eventId} />
              </Reveal>
            )}

            {isAttendee && !isPast && (
              <Reveal>
                <NetworkingPanel eventId={eventId} isRegistered={isRegistered} />
              </Reveal>
            )}
          </div>

          <div>
            <Reveal x={20} y={0}>
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.05)]">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-extrabold text-ink">{formatPrice(event.price)}</span>
                  <span className="text-xs text-muted-foreground">per ticket</span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct}% full</span>
                    <span>{Math.max(0, event.capacity - event.registered)} spots left</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? "bg-flame" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                {isAttendee && isRegistered && registeredTicket && registeredTicket.status === "valid" && (
                  <div className="mt-4 flex flex-col items-center rounded-xl border border-border bg-muted/30 p-4">
                    <QrCode seed={registeredTicket.qrToken} size={120} />
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      Ticket #{registeredTicket._id.slice(-8).toUpperCase()} — present at check-in
                    </p>
                  </div>
                )}

                {showPaymentChoice ? (
                  <div className="mt-5 space-y-2">
                    <button
                      onClick={handlePayWithEsewa}
                      disabled={esewaMutation.isPending || checkoutMutation.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#60bb46] px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
                    >
                      {esewaMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                      Pay with eSewa — {formatPrice(event.price)}
                    </button>
                    <button
                      onClick={handlePayWithStripe}
                      disabled={checkoutMutation.isPending || esewaMutation.isPending || paymentConfig?.enabled === false}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CreditCard className="size-4" />
                      )}
                      Pay by card{usdEstimate ? ` — ~$${usdEstimate}` : ` — ${formatPrice(event.price)}`}
                    </button>
                    {isNprEvent && (
                      <p className="text-center text-[11px] text-muted-foreground">
                        Card payments are billed in USD (Stripe doesn&apos;t settle in NPR); eSewa charges the exact NPR price.
                      </p>
                    )}
                    {paymentConfig?.enabled === false && (
                      <p className="text-center text-[11px] text-amber-600">Card payments aren&apos;t configured on this server yet.</p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handlePrimaryAction}
                    disabled={primaryDisabled}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isAttendee && isRegistered
                        ? "bg-secondary text-secondary-foreground"
                        : isAttendee && isFull
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:-translate-y-0.5 shadow-[0_8px_20px_-10px_rgba(91,76,245,0.8)]"
                    }`}
                  >
                    {primaryPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isAttendee && isRegistered ? (
                      <>
                        <Check className="size-4" /> {primaryLabel}
                      </>
                    ) : (
                      <>
                        <RegisterIcon className="size-4" /> {primaryLabel}
                      </>
                    )}
                  </button>
                )}

                {(registerMutation.isError || checkoutMutation.isError || esewaMutation.isError) && (
                  <p className="mt-2 text-xs text-amber-600">
                    {(registerMutation.error as any)?.response?.data?.message ||
                      (checkoutMutation.error as any)?.response?.data?.message ||
                      (esewaMutation.error as any)?.response?.data?.message ||
                      "Something went wrong"}
                  </p>
                )}

                {isAttendee && isRegistered && !isPast && registeredTicket?.status === "valid" && (
                  <div className="mt-2">
                    {confirmingCancel ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-xs text-ink">Cancel your registration? This frees your spot for someone else.</p>
                        {cancelMutation.isError && (
                          <p className="mt-1 text-xs text-destructive">
                            {(cancelMutation.error as any)?.response?.data?.message || "Couldn't cancel"}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={handleCancel}
                            disabled={cancelMutation.isPending}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
                          >
                            {cancelMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                            Yes, cancel
                          </button>
                          <button
                            onClick={() => setConfirmingCancel(false)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-muted"
                          >
                            <X className="size-3.5" /> Keep it
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingCancel(true)}
                        className="w-full rounded-xl border border-border py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                      >
                        Cancel registration
                      </button>
                    )}
                  </div>
                )}

                <Link
                  href={ticketHref}
                  className="mt-2 block rounded-xl border border-border py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-muted"
                >
                  {isAttendee && isRegistered ? "View my ticket" : isAttendee ? "View related workspace" : registerLabel}
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
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{aiInsight}</p>
                </div>

                {isAttendee && !userHasLocation && (
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
