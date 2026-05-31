"use client"

import { AppShell } from "@/components/app/app-shell"
import { adminNav } from "@/components/app/nav-configs"
import { StatCard } from "@/components/app/stat-card"
import { AdminRevenueChart, AdminAttendanceChart, AdminCategoryChart } from "@/components/app/admin-charts"
import { Reveal } from "@/components/anim/reveal"
import { events, activityFeed, platformKpis } from "@/lib/data"
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react"

const statusStyle: Record<string, string> = {
  Live: "bg-secondary/15 text-secondary",
  Upcoming: "bg-primary/15 text-primary",
  Past: "bg-ink/10 text-ink",
}

export default function AdminDashboardPage() {
  return (
    <AppShell nav={adminNav} role="Administrator" userName="Sarah Chen" title="Platform Overview">
      <div className="space-y-8">
        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={platformKpis.revenue}
            prefix="$"
            trend="+18.2%"
            icon={DollarSign}
            accent="primary"
          />
          <StatCard label="Active Events" value={platformKpis.events} trend="+6" icon={Calendar} accent="secondary" />
          <StatCard label="Total Attendees" value={platformKpis.attendees} trend="+12.4%" icon={Users} accent="flame" />
          <StatCard
            label="Avg. Fill Rate"
            value={platformKpis.fillRate}
            suffix="%"
            trend="+3.1%"
            icon={TrendingUp}
            accent="primary"
          />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <AdminRevenueChart />
          </Reveal>
          <Reveal>
            <AdminCategoryChart />
          </Reveal>
        </div>

        <Reveal>
          <AdminAttendanceChart />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Events table */}
          <Reveal className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Recent Events</h2>
                <button className="text-sm font-medium text-primary hover:underline">View all</button>
              </div>
              <div className="mt-5 overflow-x-auto">
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
                      <tr key={e.id} className="transition-colors hover:bg-muted/40">
                        <td className="py-3.5 pr-4">
                          <div className="font-medium text-ink">{e.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.venue} · {e.date}
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[e.status]}`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-xs text-ink">
                          {e.registered.toLocaleString()}/{e.capacity.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right font-mono text-xs font-medium text-ink">{e.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          {/* Activity feed */}
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Live Activity</h2>
              <ul className="mt-5 space-y-4">
                {activityFeed.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="relative mt-1 flex size-2.5 shrink-0">
                      <span className={`absolute inline-flex size-full rounded-full ${a.color} opacity-40`} />
                      <span className={`relative inline-flex size-2.5 rounded-full ${a.color}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-ink">
                        <span className="font-medium">{a.who}</span> {a.action}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
