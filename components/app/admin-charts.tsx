"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { platformActivity, roleDistribution } from "@/lib/data"

const ranges = ["Daily", "Weekly", "Monthly"]

export function PlatformActivityChart() {
  const [range, setRange] = useState("Weekly")
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Platform Activity</h3>
          <p className="text-xs text-muted-foreground">Registrations & logins this month</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                range === r ? "bg-card text-ink shadow-sm" : "text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={platformActivity} margin={{ left: -18, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" vertical={false} />
          <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e7e5df",
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          />
          <Line
            type="monotone"
            dataKey="logins"
            stroke="#5b4cf5"
            strokeWidth={3}
            dot={{ r: 3, fill: "#5b4cf5" }}
            animationDuration={1400}
          />
          <Line
            type="monotone"
            dataKey="registrations"
            stroke="#00c9a7"
            strokeWidth={3}
            dot={{ r: 3, fill: "#00c9a7" }}
            animationDuration={1400}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-6 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 rounded-full bg-primary" /> Logins
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 rounded-full bg-secondary" /> Registrations
        </span>
      </div>
    </div>
  )
}

export function RoleDonut() {
  const total = roleDistribution.reduce((s, r) => s + r.value, 0)
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
      <h3 className="font-display text-base font-bold text-ink">User Role Distribution</h3>
      <p className="text-xs text-muted-foreground">{total.toLocaleString()} total users</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={roleDistribution}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={92}
            paddingAngle={3}
            animationDuration={1200}
          >
            {roleDistribution.map((r) => (
              <Cell key={r.name} fill={r.fill} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }}
          />
          <Legend
            iconType="circle"
            formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
