"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts"
import { Loader2, Users2 } from "lucide-react"
import type { AudienceSegments } from "@/lib/api/analytics"

const PALETTE = ["#5b4cf5", "#00c9a7", "#ff6b35", "#f5c451", "#8b5cf6", "#38bdf8"]

export function SegmentsChart({ data, isLoading }: { data?: AudienceSegments; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    )
  }

  if (!data || data.totalAttendees === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <Users2 className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Audience segments appear once attendees start registering.</p>
      </div>
    )
  }

  const newTier = data.byEngagement.find((t) => t.tier.startsWith("New"))?.count ?? 0
  const returningTier = data.byEngagement.find((t) => t.tier.startsWith("Returning"))?.count ?? 0
  const returningPct = data.totalAttendees > 0 ? Math.round((returningTier / data.totalAttendees) * 100) : 0

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Audience Segments</h3>
          <p className="text-xs text-muted-foreground">By interest category, from real registration history</p>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-ink">{data.totalAttendees}</div>
          <div className="text-[11px] text-muted-foreground">total attendees</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.byInterestCategory} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" horizontal={false} />
          <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="category" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={90} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Bar dataKey="count" name="Registrations" radius={[0, 6, 6, 0]} animationDuration={1200}>
            {data.byInterestCategory.map((row, i) => (
              <Cell key={row.category} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-center">
        <div>
          <div className="font-display text-lg font-bold text-ink">{returningPct}%</div>
          <div className="text-[11px] text-muted-foreground">returning attendees ({returningTier})</div>
        </div>
        <div>
          <div className="font-display text-lg font-bold text-ink">{data.checkInRate}%</div>
          <div className="text-[11px] text-muted-foreground">check-in rate</div>
        </div>
      </div>
      {newTier > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">{newTier} first-time attendee{newTier === 1 ? "" : "s"} across your events.</p>
      )}
    </div>
  )
}
