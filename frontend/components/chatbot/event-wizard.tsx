"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Loader2,
  MapPin,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react"
import { useCreateEvent } from "@/lib/queries/events"
import { EVENT_CATEGORIES, EVENT_TYPES, SUGGESTED_TAGS } from "@/lib/constants/event-options"
import { eventDateError, toDatetimeLocal } from "@/lib/event-date"
import { formatPrice } from "@/lib/price"
import { useChatbotStore } from "@/lib/stores/chatbot-store"

// ---------------------------------------------------------------------------
// EventBot's guided event-creation workspace.
//
// Intent: "smooth event creating for the chatbot, in a very professional
// approach" — instead of free-typed slots parsed out of chat (fragile,
// unpredictable), the bot hands the organizer a deterministic, form-driven
// workspace that mirrors the standalone Create Event page 1:1 (same field
// rules, same date bounds, same payload → same backend), then reports the
// result back INTO the conversation with deep links. Nothing about event
// creation moves into the fuzzy-LLM path; the chat just elegantly hands off
// to the wizard and celebrates the result.
// ---------------------------------------------------------------------------

type WizardForm = {
  title: string
  description: string
  date: string
  venue: string
  type: (typeof EVENT_TYPES)[number]
  category: (typeof EVENT_CATEGORIES)[number] | string
  tags: string[]
  capacity: string
  price: string
  status: "Draft" | "Upcoming"
}

interface WizardStep {
  id: number
  label: string
  icon: typeof Calendar
}

const emptyWizardForm = (): WizardForm => {
  // Dynamic defaults: next available weekday slot a week out, matching the
  // create page's own sensible starting points.
  const next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  next.setHours(10, 0, 0, 0)
  return {
    title: "",
    description: "",
    date: toDatetimeLocal(next),
    venue: "",
    type: "In-person",
    category: "Technology",
    tags: [],
    capacity: "100",
    price: "0",
    status: "Upcoming",
  }
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10"

const STEP_LABELS: WizardStep[] = [
  { id: 1, label: "Basics", icon: Sparkles },
  { id: 2, label: "Schedule & venue", icon: Compass },
  { id: 3, label: "Review & publish", icon: BadgeCheck },
]

function LivePreview({ form }: { form: WizardForm }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative h-24 bg-brand-gradient">
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {form.type}
        </span>
        {form.tags.length > 0 && (
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
            {form.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2.5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          {form.category}
        </p>
        <h3 className="font-display text-base font-bold leading-snug text-ink">
          {form.title || "Your event title"}
        </h3>
        {form.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{form.description}</p>
        )}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />{" "}
            {form.date ? new Date(form.date).toLocaleString() : "—"}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {form.venue || "Venue TBA"}
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="size-3.5" /> {form.capacity} seats ·{" "}
            {formatPrice({ amount: Number(form.price) || 0, currency: "NPR" })}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Seat occupancy preview</span>
          <span>0%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-0 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}

export function EventWizard() {
  const creationOpen = useChatbotStore((s) => s.creationOpen)
  const setCreationOpen = useChatbotStore((s) => s.setCreationOpen)
  const pushBotMessage = useChatbotStore((s) => s.pushBotMessage)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardForm>(emptyWizardForm)
  const [tagInput, setTagInput] = useState("")
  const [created, setCreated] = useState<{ eventId: string; title: string; status: string } | null>(null)

  const createEvent = useCreateEvent()

  const update = <K extends keyof WizardForm>(field: K, value: WizardForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const dateError = eventDateError(form.date)
  const step1Valid = form.title.trim().length >= 3 && form.description.trim().length >= 20
  const step2Valid =
    !dateError && form.venue.trim().length >= 2 && Number(form.capacity) >= 1 && Number(form.price) >= 0
  const canNext = (step === 1 && step1Valid) || (step === 2 && step2Valid) || step === 3
  const canSubmit = step1Valid && step2Valid

  const addTag = (value: string) => {
    const t = value.trim().replace(/,+$/, "").toLowerCase()
    if (!t) return
    if (form.tags.includes(t)) return
    update("tags", [...form.tags, t].slice(0, 8))
    setTagInput("")
  }

  const submit = () => {
    if (!canSubmit || createEvent.isPending) return
    createEvent.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        venue: form.venue.trim(),
        type: form.type,
        category: form.category,
        tags: form.tags,
        capacity: Number(form.capacity),
        price: Number(form.price),
        status: form.status,
      },
      {
        onSuccess: ({ event }) => {
          setCreated({ eventId: event._id, title: event.title, status: event.status })
          const noun = event.status === "Draft" ? "draft" : "published"
          pushBotMessage(
            `🎉 Your event **${event.title}** is now a ${noun === "published" ? "**published, live on EventNexus**" : "**draft**, ready when you are"}.\n\n` +
              `- [View event page](/event/${event._id})\n` +
              `- [Open organizer workspace](/organizer/events/${event._id})`
          )
        },
      }
    )
  }

  const close = () => {
    if (createEvent.isPending) return
    setCreationOpen(false)
    // Reset so the next open starts clean.
    setStep(1)
    setForm(emptyWizardForm())
    setTagInput("")
    setCreated(null)
  }

  const busy = createEvent.isPending
  const errorMsg =
    (createEvent.error as any)?.response?.data?.message || (createEvent.error as any)?.message

  if (!creationOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="EventBot event creation workspace">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-full text-white">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-ink">Event creation workspace</p>
              <p className="text-[11px] text-muted-foreground">Guided by EventBot · 3 quick steps</p>
            </div>
          </div>
          <button
            onClick={close}
            disabled={busy}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
            aria-label="Close workspace"
          >
            <X className="size-4" />
          </button>
        </div>

        {created ? (
          /* ---- Success state ---- */
          <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-6 py-10 text-center">
            <span className="bg-brand-gradient flex size-14 items-center justify-center rounded-full text-white">
              <Check className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Event created</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-ink">{created.title}</span>{" "}
                {created.status === "Draft"
                  ? "was saved as a draft — review and publish it whenever you're ready."
                  : "is live and open for registration."}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Link
                href={`/event/${created.eventId}`}
                onClick={close}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <MapPin className="size-4" /> View event page
              </Link>
              <Link
                href={`/organizer/events/${created.eventId}`}
                onClick={close}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-muted"
              >
                <Compass className="size-4" /> Open organizer workspace
              </Link>
              <button
                onClick={close}
                className="py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-ink"
              >
                Back to chat
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A summary with links has been added to your conversation.
            </p>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              {STEP_LABELS.map((s, i) => {
                const active = step === s.id
                const done = step > s.id
                const Icon = s.icon
                return (
                  <div key={s.id} className="flex flex-1 items-center gap-2">
                    <button
                      onClick={() => done && setStep(s.id)}
                      disabled={!done || busy}
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                        done ? "bg-primary text-white" : active ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="size-3.5" /> : s.id}
                    </button>
                    <div className="hidden min-w-0 sm:block">
                      <p className={`truncate text-xs font-semibold ${active ? "text-ink" : "text-muted-foreground"}`}>{s.label}</p>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div className={`h-px flex-1 ${done ? "bg-primary/50" : "bg-border"}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {step === 1 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-ink">Event title *</label>
                    <input
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="e.g. Product Design Sprint 2026"
                      className={`${inputClass} mt-1.5`}
                      autoFocus
                    />
                    {form.title && form.title.trim().length > 0 && form.title.trim().length < 3 && (
                      <p className="mt-1 text-[11px] font-medium text-destructive">At least 3 characters.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink">One-line description *</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="What is this event about? (20+ characters)"
                      rows={3}
                      className={`${inputClass} mt-1.5 resize-none`}
                    />
                    {form.description && form.description.trim().length < 20 && (
                      <p className="mt-1 text-[11px] font-medium text-destructive">A bit more detail helps attendees (min 20 chars).</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => update("category", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                      >
                        {EVENT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink">Format</label>
                      <select
                        value={form.type}
                        onChange={(e) => update("type", e.target.value as WizardForm["type"])}
                        className={`${inputClass} mt-1.5`}
                      >
                        {EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink">Tags</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault()
                            addTag(tagInput)
                          }
                        }}
                        placeholder="Type a tag + Enter"
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        onClick={() => addTag(tagInput)}
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
                        aria-label="Add tag"
                      >
                        <Tag className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.tags.map((t) => (
                        <button
                          key={t}
                          onClick={() => update("tags", form.tags.filter((x) => x !== t))}
                          className="group flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          {t} <X className="size-3 opacity-60" />
                        </button>
                      ))}
                      {form.tags.length === 0 &&
                        SUGGESTED_TAGS.slice(0, 4).map((s) => (
                          <button
                            key={s}
                            onClick={() => addTag(s)}
                            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-ink"
                          >
                            + {s}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-ink">Event date & time *</label>
                    <input
                      type="datetime-local"
                      value={form.date}
                      min={toDatetimeLocal(new Date())}
                      max={toDatetimeLocal(new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000))}
                      onChange={(e) => update("date", e.target.value)}
                      className={`${inputClass} mt-1.5 ${dateError ? "border-destructive ring-4 ring-destructive/10" : ""}`}
                    />
                    {dateError && (
                      <p className="mt-1 text-[11px] font-medium text-destructive">{dateError}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {form.date ? `${new Date(form.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${new Date(form.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Pick a date"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink">Venue *</label>
                    <input
                      value={form.venue}
                      onChange={(e) => update("venue", e.target.value)}
                      placeholder="e.g. Nepal Academy Hall, Kathmandu"
                      className={`${inputClass} mt-1.5`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink">Capacity</label>
                      <input
                        type="number"
                        min={1}
                        value={form.capacity}
                        onChange={(e) => update("capacity", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink">Ticket price (NPR)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">0 = free event.</p>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                      <div className="mt-1.5 flex gap-1.5">
                        {(["Draft", "Upcoming"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => update("status", s)}
                            disabled={busy}
                            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                              form.status === s ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-ink"
                            }`}
                          >
                            {s === "Upcoming" ? "Publish live" : s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <LivePreview form={form} />
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700">
                    {form.status === "Upcoming"
                      ? "Publishing live makes the event immediately visible and registerable on the public Discover page."
                      : "Drafts stay private — only you can see them until you publish from the organizer workspace."}
                  </div>
                  {errorMsg && (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-medium text-destructive">{errorMsg}</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1 || busy}
                className="flex items-center gap-1 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                >
                  Continue <ChevronRight className="size-4" />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!canSubmit || busy}
                  className="bg-brand-gradient flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {form.status === "Upcoming" ? "Create & publish" : "Save as draft"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}