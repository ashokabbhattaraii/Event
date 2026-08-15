"use client"

import { useState } from "react"
import { Calendar, Loader2, MapPin, Plus, Trash2, Users } from "lucide-react"
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

// Organizer/admin-only schedule builder — a Session is a talk/workshop slot
// within an Event (distinct from the event itself), grouped by track so a
// multi-room conference reads as parallel tracks rather than one long list.
export function SessionsPanel({ event, sessions, createSession, updateSession, deleteSession, orgSpeakers }: SessionsPanelProps) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<CreateSessionPayload>(emptyForm)

  const update = <K extends keyof CreateSessionPayload>(field: K, value: CreateSessionPayload[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleSpeaker = (id: string) =>
    update("speakers", form.speakers?.includes(id) ? form.speakers.filter((s) => s !== id) : [...(form.speakers ?? []), id])

  const handleCreate = () => {
    if (!form.title.trim() || !form.startTime || !form.endTime) return
    createSession.mutate(form, {
      onSuccess: () => {
        setForm(emptyForm)
        setAdding(false)
      },
    })
  }

  const byTrack = sessions?.byTrack ?? {}
  const trackNames = Object.keys(byTrack)
  const inputClass = "w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-ink outline-none focus:border-primary"

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
          <Calendar className="size-4 text-primary" /> Sessions & schedule
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-muted"
          >
            <Plus className="size-3.5" /> Add session
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Session title" className={inputClass} />
            <input value={form.track} onChange={(e) => update("track", e.target.value)} placeholder="Track (optional)" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="datetime-local" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} className={inputClass} />
            <input type="datetime-local" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} className={inputClass} />
          </div>
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
              onClick={handleCreate}
              disabled={createSession.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {createSession.isPending && <Loader2 className="size-3 animate-spin" />} Save session
            </button>
            <button
              onClick={() => {
                setAdding(false)
                setForm(emptyForm)
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted"
            >
              Cancel
            </button>
          </div>
          {createSession.isError && (
            <p className="text-xs text-destructive">{(createSession.error as any)?.response?.data?.message || "Couldn't create session"}</p>
          )}
        </div>
      )}

      {trackNames.length === 0 && !adding && (
        <p className="mt-3 text-sm text-muted-foreground">No sessions scheduled yet — add one to build out the event's agenda.</p>
      )}

      <div className="mt-4 space-y-5">
        {trackNames.map((track) => (
          <div key={track}>
            {track && <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{track}</h3>}
            <div className="space-y-2">
              {byTrack[track].map((s: SessionData) => (
                <div key={s._id} className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{s.title}</div>
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
                  <button
                    onClick={() => deleteSession.mutate(s._id)}
                    disabled={deleteSession.isPending}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
