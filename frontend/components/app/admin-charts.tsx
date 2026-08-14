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
  BarChart,
  Bar,
} from "recharts"

const ranges = ["Daily", "Weekly", "Monthly"]

const defaultActivity = [
  { day: "W1", registrations: 220 },
  { day: "W2", registrations: 340 },
  { day: "W3", registrations: 410 },
  { day: "W4", registrations: 560 },
]

const defaultRoles = [
  { name: "Attendees", value: 1042, fill: "#ff6b35" },
  { name: "Organizers", value: 178, fill: "#00c9a7" },
  { name: "Admins", value: 27, fill: "#5b4cf5" },
]

const defaultCategories = [
  { category: "Technology", events: 3, registered: 120 },
  { category: "Business", events: 2, registered: 60 },
]

export function PlatformActivityChart({ data }: { data?: { day: string; registrations: number }[] }) {
  const [range, setRange] = useState("Weekly")
  const rows = data && data.length > 0 ? data : defaultActivity
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Registration Activity</h3>
          <p className="text-xs text-muted-foreground">New registrations across all your organization&apos;s events</p>
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
        <LineChart data={rows} margin={{ left: -18, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" vertical={false} />
          <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Line type="monotone" dataKey="registrations" stroke="#00c9a7" strokeWidth={3} dot={{ r: 3, fill: "#00c9a7" }} animationDuration={1400} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RoleDonut({ data }: { data?: { name: string; value: number; fill: string }[] }) {
  const rows = data && data.length > 0 ? data : defaultRoles
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-bold text-ink">User Role Distribution</h3>
      <p className="text-xs text-muted-foreground">{total.toLocaleString()} users</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={3} animationDuration={1200}>
            {rows.map((r) => (
              <Cell key={r.name} fill={r.fill} stroke="none" />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Legend iconType="circle" formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AdminRevenueChart({ data }: { data?: { day: string; registrations: number }[] }) {
  return <PlatformActivityChart data={data} />
}

export function AdminCategoryChart({ data }: { data?: { name: string; value: number; fill: string }[] }) {
  return <RoleDonut data={data} />
}

export function AdminAttendanceChart({
  data,
}: {
  data?: { category: string; events: number; registered: number }[]
}) {
  const rows = data && data.length > 0 ? data : defaultCategories
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-display text-base font-bold text-ink">Registrations by Category</h3>
        <p className="text-xs text-muted-foreground">Events run and attendees registered, across your organization</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ left: -18, right: 8, top: 8 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5df" vertical={false} />
          <XAxis dataKey="category" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "rgba(91,76,245,0.05)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e7e5df", fontSize: 12 }} />
          <Legend iconType="circle" formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
          <Bar dataKey="events" name="Events" fill="#5b4cf5" radius={[6, 6, 0, 0]} animationDuration={1200} />
          <Bar dataKey="registered" name="Registered" fill="#00c9a7" radius={[6, 6, 0, 0]} animationDuration={1400} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
