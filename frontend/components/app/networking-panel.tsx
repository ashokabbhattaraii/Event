"use client"

import { Loader2, Users2 } from "lucide-react"
import { useEventNetworking } from "@/lib/queries/networking"

export function NetworkingPanel({ eventId, isRegistered }: { eventId: string; isRegistered: boolean }) {
  const { data, isLoading, isError } = useEventNetworking(eventId, isRegistered)

  if (!isRegistered) return null
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    )
  }
  if (isError) return null

  const suggestions = data?.suggestions ?? []

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Users2 className="size-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-ink">People you might want to meet</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Other attendees at this event, matched by shared interests from your registration history.
      </p>

      {suggestions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No matches yet — as more attendees register, we&apos;ll surface people with overlapping interests.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {suggestions.slice(0, 6).map((s) => (
            <div key={s.attendeeId} className="flex items-start gap-3 rounded-xl border border-border p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{s.name}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {s.sharedInterests.length > 0 ? (
                    s.sharedInterests.map((interest) => (
                      <span key={interest} className="rounded-full bg-secondary/12 px-2 py-0.5 text-[10px] font-medium text-secondary">
                        {interest}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Also attending</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
