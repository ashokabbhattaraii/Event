"use client"

import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { AdminRevenueChart, AdminAttendanceChart, AdminCategoryChart } from "@/components/app/admin-charts"
import { Reveal } from "@/components/anim/reveal"
import { useAllEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrgStats } from "@/lib/queries/users"
import { useAdminAnalytics } from "@/lib/queries/analytics"
import { Calendar, DollarSign, Users, TrendingUp, Loader2 } from "lucide-react"
import { formatPrice } from "@/lib/price"

const statusStyle: Record<string, string> = {
  Live: "bg-secondary/15 text-secondary",
  Upcoming: "bg-primary/15 text-primary",
  Past: "bg-ink/10 text-ink",
}

export default function AdminDashboardPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData, isLoading } = useAllEvents({ limit: 50 })
  const { data: stats } = useOrgStats()
  const { data: analytics } = useAdminAnalytics()

  const user = userData?.user
  const events = eventsData?.events ?? []
  const eventCount = stats?.eventCount ?? events.length
  const userCount = stats?.userCount ?? 0
  const totalRegistrations = events.reduce((sum, e) => sum + e.registered, 0)
  const avgFillRate = events.length > 0
    ? Math.round(events.reduce((sum, e) => sum + (e.registered / e.capacity) * 100, 0) / events.length)
    : 0

  const activityData = analytics?.trend.map((t) => ({
    day: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    registrations: t.registrations,
  }))

  const roleData = stats
    ? [
        { name: "Attendees", value: stats.roleCounts.attendee, fill: "#ff6b35" },
        { name: "Organizers", value: stats.roleCounts.organizer, fill: "#00c9a7" },
        { name: "Admins", value: stats.roleCounts.admin, fill: "#5b4cf5" },
      ].filter((r) => r.value > 0)
    : undefined

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Platform Overview">
      <div className="space-y-8">
        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Events" value={eventCount} icon={Calendar} accent="primary" />
          <StatCard label="Active Users" value={userCount} icon={Users} accent="secondary" />
          <StatCard label="Registrations" value={totalRegistrations} icon={TrendingUp} accent="flame" />
          <StatCard label="Avg. Fill Rate" value={avgFillRate} suffix="%" icon={DollarSign} accent="primary" />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <AdminRevenueChart data={activityData} />
          </Reveal>
          <Reveal>
            <AdminCategoryChart data={roleData} />
          </Reveal>
        </div>

        <Reveal>
          <AdminAttendanceChart data={analytics?.categories} />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Recent Events</h2>
                <button className="text-sm font-medium text-primary hover:underline">View all</button>
              </div>
              <div className="mt-5 overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading events...
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-3 font-medium">Event</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Registered</th>
                        <th className="pb-3 text-right font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {events.slice(0, 6).map((e) => (
                        <tr key={e._id} className="transition-colors hover:bg-muted/40">
                          <td className="py-3.5 pr-4">
                            <div className="font-medium text-ink">{e.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {e.venue} · {new Date(e.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[e.status]}`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-ink">
                            {e.registered.toLocaleString()}/{e.capacity.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right font-mono text-xs font-medium text-ink">{formatPrice(e.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Platform Stats</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Total Users</p>
                  <p className="font-display text-2xl font-bold text-ink">{userCount}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Total Events</p>
                  <p className="font-display text-2xl font-bold text-ink">{eventCount}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Avg Fill Rate</p>
                  <p className="font-display text-2xl font-bold text-ink">{avgFillRate}%</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
