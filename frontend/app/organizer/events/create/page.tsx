"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app/app-shell"
import { useCreateEvent } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import { Loader2 } from "lucide-react"

const eventTypes = ["In-person", "Hybrid", "Virtual"] as const
const categories = ["Technology", "Business", "Academic", "Workshop", "Social", "Health", "Arts"]
const statuses = ["Draft", "Upcoming", "Live"] as const

export default function CreateEventPage() {
  const router = useRouter()
  const { data: userData } = useCurrentUser()
  const createEvent = useCreateEvent()
  const user = userData?.user

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
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Create Event">
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
              placeholder="Describe what the event is about..."
              rows={4}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Date & Time</label>
              <input
                required
                type="datetime-local"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Venue</label>
              <input
                required
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
                placeholder="Venue name or URL"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Type</label>
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary"
              >
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Category</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Capacity</label>
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
                placeholder="Free or amount (e.g. $25)"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={createEvent.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {createEvent.isPending && <Loader2 className="size-4 animate-spin" />}
            Create Event
          </button>
        </form>
      </div>
    </AppShell>
  )
}
