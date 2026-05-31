"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { registrationTrend, predictedVsActual } from "@/lib/data"

const engagement = [
  { metric: "Reach", v: 92 },
  { metric: "Engagement", v: 78 },
  { metric: "Conversion", v: 64 },
  { metric: "Retention", v: 81 },
  { metric: "Advocacy", v: 70 },
  { metric: "Satisfaction", v: 88 },
]

const channels = [
  { ch: "Email", v: 420 },
  { ch: "Social", v: 360 },
  { ch: "Direct", v: 280 },
  { ch: "Partner", v: 190 },
  { ch: "Referral", v: 140 },
]

export function FunnelTrend() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
      <h3 className="font-display text-base font-bold text-ink">Registration Funnel</h3>
      <p className="text-xs text-muted-foreground">Daily sign-up momentum</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={registrationTrend} margin={{ left: -18, right: 8, top: 12 }}>
          <defs>
            <linearGradient id="anafill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00c9a7" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#00c9a7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" vertical={false} />
          <XAxis dataKey="d" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Area type="monotone" dataKey="v" name="Registrations" stroke="#00c9a7" strokeWidth={3} fill="url(#anafill)" animationDuration={1400} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PredictionAccuracy() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
      <h3 className="font-display text-base font-bold text-ink">Predicted vs. Actual</h3>
      <p className="text-xs text-muted-foreground">AI forecast accuracy</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={predictedVsActual} margin={{ left: -18, right: 8, top: 12 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" vertical={false} />
          <XAxis dataKey="event" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "rgba(91,76,245,0.05)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Legend iconType="circle" formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
          <Bar dataKey="predicted" name="Predicted" fill="#5b4cf5" radius={[5, 5, 0, 0]} animationDuration={1200} />
          <Bar dataKey="actual" name="Actual" fill="#00c9a7" radius={[5, 5, 0, 0]} animationDuration={1400} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EngagementRadar() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
      <h3 className="font-display text-base font-bold text-ink">Engagement Profile</h3>
      <p className="text-xs text-muted-foreground">Across the attendee lifecycle</p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={engagement} outerRadius={92}>
          <PolarGrid stroke="#e7e5df" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280", fontSize: 11 }} />
          <Radar dataKey="v" stroke="#5b4cf5" fill="#5b4cf5" fillOpacity={0.25} strokeWidth={2} animationDuration={1300} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChannelBars() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
      <h3 className="font-display text-base font-bold text-ink">Acquisition Channels</h3>
      <p className="text-xs text-muted-foreground">Registrations by source</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={channels} layout="vertical" margin={{ left: 12, right: 16, top: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" horizontal={false} />
          <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="ch" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={64} />
          <Tooltip cursor={{ fill: "rgba(0,201,167,0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Bar dataKey="v" name="Registrations" fill="#ff6b35" radius={[0, 5, 5, 0]} animationDuration={1300} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
