"use client"

import { Loader2, MessageSquareText, Star } from "lucide-react"
import { useEventFeedback } from "@/lib/queries/feedback"

const BARS: { key: "positive" | "neutral" | "negative"; label: string; color: string }[] = [
  { key: "positive", label: "Positive", color: "bg-secondary" },
  { key: "neutral", label: "Neutral", color: "bg-muted-foreground/40" },
  { key: "negative", label: "Negative", color: "bg-destructive" },
]

export function FeedbackSummaryPanel({ eventId }: { eventId: string }) {
  const { data, isLoading } = useEventFeedback(eventId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    )
  }

  const summary = data?.summary
  const feedback = data?.feedback ?? []

  if (!summary || summary.count === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <MessageSquareText className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No feedback submitted yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <MessageSquareText className="size-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-ink">Feedback & sentiment</h2>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-extrabold text-ink">{summary.avgRating.toFixed(1)}</span>
          <Star className="size-4 fill-flame text-flame" />
        </div>
        <span className="text-sm text-muted-foreground">from {summary.count} response{summary.count === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-4 space-y-2">
        {BARS.map(({ key, label, color }) => {
          const count = summary.breakdown[key]
          const pct = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{label}</span>
                <span>{count} ({pct}%)</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {feedback.some((f) => f.comment) && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          {feedback
            .filter((f) => f.comment)
            .slice(0, 6)
            .map((f) => (
              <div key={f._id} className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    {typeof f.attendee === "object" ? f.attendee.name : "Attendee"}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`size-3 ${n <= f.rating ? "fill-flame text-flame" : "text-border"}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.comment}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
