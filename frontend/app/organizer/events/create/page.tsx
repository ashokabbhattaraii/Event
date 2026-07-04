"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, MapPin, Users, Tag, Loader2 } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { useCreateEvent } from "@/lib/queries/events"

const eventTypes = ["In-person", "Hybrid", "Virtual"] as const
const categories = ["Technology", "Business", "Academic", "Workshop", "Social", "Health", "Arts"]
const statuses = ["Draft", "Upcoming", "Live"] as const

export default function CreateEventPage() {
  const router = useRouter()
  const createEvent = useCreateEvent()

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    venue: "",
    type: "In-person" as (typeof eventTypes)[number],
    category: "Technology",
    capacity: 100,
    price: "Free",
    status: "Draft" as (typeof statuses)[number],
  })

  const update = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createEvent.mutate(
      { ...form, capacity: Number(form.capacity) },
      { onSuccess: () => router.push("/organizer/events") }
    )
  }

  return (
    <AppShell role="Organizer" userName="Organizer" title="Create Event">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Create New Event</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fill in the details to publish a new event.</p>
        </div>

        {createEvent.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(createEvent.error as any)?.response?.data?.message || "Failed to create event."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Event Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="DevSummit 2026"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe your event..."
              rows={3}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <CalendarDays className="size-3.5" /> Date & Time
              </label>
              <input
                required
                type="datetime-local"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <MapPin className="size-3.5" /> Venue
              </label>
              <input
                required
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
                placeholder="APU Auditorium"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Event Type</label>
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Tag className="size-3.5" /> Category
              </label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Users className="size-3.5" /> Capacity
              </label>
              <input
                required
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Price</label>
              <input
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="Free or $49"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Status</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {createEvent.isPending && <Loader2 className="size-4 animate-spin" />}
              Create Event
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
