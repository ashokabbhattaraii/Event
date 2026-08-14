"use client"

import { useState } from "react"
import { Loader2, MessageSquareText, Star } from "lucide-react"
import { useMyFeedback, useSubmitFeedback } from "@/lib/queries/feedback"

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-secondary/12 text-secondary",
  neutral: "bg-muted text-muted-foreground",
  negative: "bg-destructive/10 text-destructive",
}

export function FeedbackForm({ eventId }: { eventId: string }) {
  const { data, isLoading } = useMyFeedback(eventId)
  const submit = useSubmitFeedback(eventId)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")

  if (isLoading) return null

  const existing = data?.feedback

  if (existing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-primary" />
          <h2 className="font-display text-lg font-bold text-ink">Your feedback</h2>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`size-4 ${n <= existing.rating ? "fill-flame text-flame" : "text-border"}`} />
          ))}
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${SENTIMENT_STYLE[existing.sentiment]}`}>
            {existing.sentiment}
          </span>
        </div>
        {existing.comment && <p className="mt-3 text-sm text-muted-foreground">{existing.comment}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Thanks — you already shared feedback for this event.</p>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    submit.mutate({ rating, comment: comment.trim() || undefined })
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <MessageSquareText className="size-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-ink">How was it?</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Your feedback helps the organizer improve future events.</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              className="p-0.5"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                className={`size-6 transition-colors ${
                  n <= (hoverRating || rating) ? "fill-flame text-flame" : "text-border"
                }`}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What stood out? (optional)"
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />

        <button
          type="submit"
          disabled={rating === 0 || submit.isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submit.isPending && <Loader2 className="size-4 animate-spin" />}
          Submit feedback
        </button>

        {submit.isError && (
          <p className="text-xs text-destructive">
            {(submit.error as any)?.response?.data?.message || "Couldn't submit feedback."}
          </p>
        )}
      </form>
    </div>
  )
}
