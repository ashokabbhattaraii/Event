"use client"

import { Loader2, Megaphone, Send, TrendingUp } from "lucide-react"
import type { MarketingInsight } from "@/lib/api/analytics"

export function MarketingInsightCard({ data, isLoading }: { data?: MarketingInsight; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
      <div className="flex items-center gap-2">
        <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl text-white">
          <Megaphone className="size-4" />
        </span>
        <div>
          <h3 className="font-display text-base font-bold text-ink">Marketing insight</h3>
          <p className="text-xs text-muted-foreground">From your real registration timing data</p>
        </div>
      </div>

      {data?.hasEnoughData ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Send className="size-3.5" /> Best send window
            </div>
            <p className="mt-1.5 text-sm font-semibold text-ink">{data.suggestedSendWindow}</p>
            <p className="mt-1 text-xs text-muted-foreground">Registrations peak in this window — schedule reminders and promos here.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
              <TrendingUp className="size-3.5" /> Top-converting category
            </div>
            <p className="mt-1.5 text-sm font-semibold text-ink">{data.topPerformingCategory ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Highest fill rate — lean into this category's format and content.</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{data?.note ?? "Not enough registration history yet to generate a recommendation."}</p>
      )}
    </div>
  )
}
