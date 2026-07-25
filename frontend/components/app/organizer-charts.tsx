"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const defaultTrend = [
  { d: "Day -7", v: 60 }, { d: "Day -6", v: 95 }, { d: "Day -5", v: 180 },
  { d: "Day -4", v: 240 }, { d: "Day -3", v: 420 }, { d: "Day -2", v: 560 },
  { d: "Day -1", v: 720 }, { d: "Day 0", v: 847 },
]

const defaultTickets = [
  { name: "Free", value: 1240, fill: "#5b4cf5" },
  { name: "Paid", value: 680, fill: "#00c9a7" },
  { name: "VIP", value: 120, fill: "#ff6b35" },
]

export function RegistrationTrendChart({ data }: { data?: { d: string; v: number }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-display text-base font-bold text-ink">Registration Velocity</h3>
        <p className="text-xs text-muted-foreground">Sign-ups over recent days</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data ?? defaultTrend} margin={{ left: -18, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="regfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b4cf5" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5b4cf5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" vertical={false} />
          <XAxis dataKey="d" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Area type="monotone" dataKey="v" name="Registrations" stroke="#5b4cf5" strokeWidth={3} fill="url(#regfill)" animationDuration={1400} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TicketMixChart() {
  const total = defaultTickets.reduce((s, t) => s + t.value, 0)
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-bold text-ink">Ticket Mix</h3>
      <p className="text-xs text-muted-foreground">{total.toLocaleString()} tickets issued</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={defaultTickets} dataKey="value" nameKey="name" outerRadius={88} paddingAngle={2} animationDuration={1200}>
            {defaultTickets.map((t) => (
              <Cell key={t.name} fill={t.fill} stroke="none" />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        {defaultTickets.map((t) => (
          <span key={t.name} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ background: t.fill }} /> {t.name}
          </span>
        ))}
      </div>
    </div>
  )
}
