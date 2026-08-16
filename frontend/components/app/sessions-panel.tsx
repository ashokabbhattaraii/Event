"use client"

import { useState } from "react"
import {
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react"
import type { EventData } from "@/lib/api/events"
import type { CreateSessionPayload, SessionData, SpeakerData } from "@/lib/api/sessions"
import type { useCreateSession, useDeleteSession, useEventSessions, useUpdateSession } from "@/lib/queries/sessions"

type SessionsPanelProps = {
  event: EventData
  sessions: ReturnType<typeof useEventSessions>["data"]
  createSession: ReturnType<typeof useCreateSession>
  updateSession: ReturnType<typeof useUpdateSession>
  deleteSession: ReturnType<typeof useDeleteSession>
  orgSpeakers: SpeakerData[]
}

const emptyForm: CreateSessionPayload = {
  title: "",
  description: "",
  track: "",
  startTime: "",
  endTime: "",
  location: "",
  speakers: [],
  capacity: 0,
  isPublic: true,
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

const statusPill: Record<SessionData["status"], { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-primary/10 text-primary" },
  live: { label: "Live now", className: "bg-secondary/15 text-secondary" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
}

// Datetime-local input values are "YYYY-MM-DDTHH:mm" without a timezone
// suffix — converting fresh keeps the timezone rounding from corrupting a
// saved session on the next edit.
const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const toForm = (s: SessionData): CreateSessionPayload => ({
  title: s.title,
  description: s.description,
  track: s.track,
  startTime: toDatetimeLocal(s.startTime),
  endTime: toDatetimeLocal(s.endTime),
  location: s.location,
  speakers: s.speakers.map((sp) => sp._id),
  capacity: s.capacity,
  isPublic: s.isPublic,
})

// Organizer/admin-only schedule builder — a Session is a talk/workshop slot
// within an Event (distinct from the event itself), grouped by track so a
// multi-room conference reads as parallel tracks rather than one long list.
export function SessionsPanel({ event, sessions, createSession, updateSession, deleteSession, orgSpeakers }: SessionsPanelProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SessionData | null>(null)
  const [form, setForm] = useState<CreateSessionPayload>(emptyForm)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  const update = <K extends keyof CreateSessionPayload>(field: K, value: CreateSessionPayload[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleSpeaker = (id: string) =>
    update("speakers", form.speakers?.includes(id) ? form.speakers.filter((s) => s !== id) : [...(form.speakers ?? []), id])

  const startAdding = () => {
    setEditing(null)
    setForm(emptyForm)
    setAdding(true)
  }

  const startEditing = (s: SessionData) => {
    setAdding(false)
    setEditing(s)
    setForm(toForm(s))
  }

  const closeForm = () => {
    setAdding(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.startTime || !form.endTime) return
    if (form.endTime <= form.startTime) return
    if (editing) {
      updateSession.mutate(
        { id: editing._id, data: form },
        { onSuccess: closeForm }
      )
    } else {
      createSession.mutate(form, { onSuccess: closeForm })
    }
  }

  // Sessions live inside the event window: a slot can't start before the
  // event's date, and ends must come after starts (the backend enforces the
  // latter too — this keeps the picker honest before submit).
  const eventStart = toDatetimeLocal(event.date)
  const timesValid =
    !!form.startTime && !!form.endTime && form.startTime >= eventStart && form.endTime > form.startTime

  const changeStatus = (s: SessionData, status: SessionData["status"]) => {
    updateSession.mutate({ id: s._id, data: { status } })
  }

  const byTrack = sessions?.byTrack ?? {}
  const trackNames = Object.keys(byTrack)
  const inputClass = "w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-ink outline-none focus:border-primary"
  const busy =
    createSession.isPending || updateSession.isPending || deleteSession.isPending

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
          <Calendar className="size-4 text-primary" /> Sessions & schedule
        </h2>
        {!adding && !editing && (
          <button
            onClick={startAdding}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-muted"
          >
            <Plus className="size-3.5" /> Add session
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Session title" className={inputClass} />
            <input value={form.track} onChange={(e) => update("track", e.target.value)} placeholder="Track (optional)" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={form.startTime}
              min={eventStart}
              max={form.endTime || undefined}
              onChange={(e) => update("startTime", e.target.value)}
              className={inputClass}
            />
            <input
              type="datetime-local"
              value={form.endTime}
              min={form.startTime || eventStart}
              onChange={(e) => update("endTime", e.target.value)}
              className={inputClass}
            />
          </div>
          {form.startTime && form.endTime && !timesValid && (
            <p className="text-xs font-medium text-red-600">
              Sessions must run between the event's date and end after they start.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Location / room" className={inputClass} />
            <input
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) => update("capacity", Number(e.target.value))}
              placeholder="Capacity (0 = unlimited)"
              className={inputClass}
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className={`${inputClass} resize-none`}
          />
          {orgSpeakers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {orgSpeakers.map((sp) => (
                <button
                  key={sp._id}
                  type="button"
                  onClick={() => toggleSpeaker(sp._id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    form.speakers?.includes(sp._id) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {sp.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={busy || !form.title.trim() || !timesValid}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-3 animate-spin" />} {editing ? "Save changes" : "Save session"}
            </button>
            <button
              onClick={closeForm}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted"
            >
              Cancel
            </button>
          </div>
          {(createSession.isError || updateSession.isError) && (
            <p className="text-xs text-destructive">
              {(createSession.error as any)?.response?.data?.message ||
                (updateSession.error as any)?.response?.data?.message ||
                "Couldn't save session"}
            </p>
          )}
        </div>
      )}

      {trackNames.length === 0 && !adding && !editing && (
        <p className="mt-3 text-sm text-muted-foreground">No sessions scheduled yet — add one to build out the event's agenda.</p>
      )}

      <div className="mt-4 space-y-5">
        {trackNames.map((track) => (
          <div key={track}>
            {track && <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{track}</h3>}
            <div className="space-y-2">
              {byTrack[track].map((s: SessionData) => {
                const pill = statusPill[s.status] ?? statusPill.scheduled
                return (
                  <div key={s._id} className="rounded-xl bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{s.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}>
                            {pill.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatTime(s.startTime)}</span>
                          {s.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" /> {s.location}
                            </span>
                          )}
                          {s.capacity > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="size-3" /> {s.registered}/{s.capacity}
                            </span>
                          )}
                        </div>
                        {s.speakers.length > 0 && (
                          <div className="mt-1 text-xs text-primary">{s.speakers.map((sp) => sp.name).join(", ")}</div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => startEditing(s)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-ink"
                          title="Edit session"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {s.status === "scheduled" && (
                          <button
                            onClick={() => changeStatus(s, "live")}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg bg-secondary/10 px-2 py-1.5 text-[10px] font-semibold text-secondary hover:bg-secondary/20 disabled:opacity-60"
                            title="Start the session now"
                          >
                            <Play className="size-3" /> Start live
                          </button>
                        )}
                        {s.status === "live" && (
                          <button
                            onClick={() => changeStatus(s, "completed")}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-60"
                            title="Mark session as finished"
                          >
                            <CheckCircle2 className="size-3" /> Complete
                          </button>
                        )}
                        {s.status === "cancelled" && (
                          <button
                            onClick={() => changeStatus(s, "scheduled")}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-60"
                            title="Restore the session"
                          >
                            <RotateCcw className="size-3" /> Restore
                          </button>
                        )}
                        {confirmingDelete === s._id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => deleteSession.mutate(s._id, { onSettled: () => setConfirmingDelete(null) })}
                              disabled={busy}
                              className="rounded-lg bg-destructive px-2 py-1.5 text-[10px] font-semibold text-destructive-foreground disabled:opacity-60"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmingDelete(null)}
                              className="rounded-lg border border-border px-2 py-1.5 text-[10px] font-medium text-ink hover:bg-muted"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmingDelete(s._id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete session"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}