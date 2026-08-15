"use client"

import { useState } from "react"
import { Bell, Loader2, Plus, Trash2 } from "lucide-react"
import type { EventData, EventReminderSettings } from "@/lib/api/events"
import type { useUpdateEvent } from "@/lib/queries/events"

type RemindersPanelProps = {
  event: EventData
  onUpdate: ReturnType<typeof useUpdateEvent>["mutate"]
}

const DEFAULT_SETTINGS: EventReminderSettings = { enabled: true, offsets: [1440, 60], feedbackDelayHours: 24 };

// Minutes-before-start offsets are edited as human units (days/hours) rather
// than raw minutes — organizers think in "a day before", not "1440".
const toLabel = (minutes: number) => {
  if (minutes % 1440 === 0) return `${minutes / 1440}d before`
  if (minutes % 60 === 0) return `${minutes / 60}h before`
  return `${minutes}m before`
}

const PRESET_OFFSETS = [10080, 1440, 60, 30, 15]

export function RemindersPanel({ event, onUpdate }: RemindersPanelProps) {
  const settings = event.reminderSettings || DEFAULT_SETTINGS
  const [pending, setPending] = useState(false)

  const save = (next: EventReminderSettings) => {
    setPending(true)
    onUpdate(
      { id: event._id, data: { reminderSettings: next } },
      { onSettled: () => setPending(false) }
    )
  }

  const toggleEnabled = () => save({ ...settings, enabled: !settings.enabled })
  const removeOffset = (m: number) => save({ ...settings, offsets: settings.offsets.filter((o) => o !== m) })
  const addOffset = (m: number) => {
    if (settings.offsets.includes(m)) return
    save({ ...settings, offsets: [...settings.offsets, m].sort((a, b) => b - a) })
  }
  const setFeedbackDelay = (hours: number) => save({ ...settings, feedbackDelayHours: hours })

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
          <Bell className="size-4 text-primary" /> Reminders
        </h2>
        <button
          onClick={toggleEnabled}
          disabled={pending}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${settings.enabled ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${settings.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Registered attendees get an in-app + email reminder before the event, and a feedback nudge after it ends.
      </p>

      {settings.enabled && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Send reminders</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {settings.offsets.map((m) => (
                <span key={m} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {toLabel(m)}
                  <button onClick={() => removeOffset(m)} disabled={pending}>
                    <Trash2 className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_OFFSETS.filter((m) => !settings.offsets.includes(m)).map((m) => (
                <button
                  key={m}
                  onClick={() => addOffset(m)}
                  disabled={pending}
                  className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="size-3" /> {toLabel(m)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feedback nudge</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={settings.feedbackDelayHours}
                onChange={(e) => setFeedbackDelay(Number(e.target.value) || 1)}
                disabled={pending}
                className="w-20 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground">hours after the event ends</span>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </div>
      )}
    </div>
  )
}
