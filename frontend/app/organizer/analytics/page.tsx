"use client"

import { Gauge, Loader2, Target, Ticket, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { RegistrationTrendChart, TicketMixChart } from "@/components/app/organizer-charts"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useOrganizerAnalytics } from "@/lib/queries/analytics"

export default function OrganizerAnalyticsPage() {
  const { data, isLoading } = useOrganizerAnalytics()

  const totalRegistered = data?.events.reduce((s, e) => s + e.registered, 0) ?? 0
  const totalCapacity = data?.events.reduce((s, e) => s + e.capacity, 0) ?? 0
  const totalPredicted = data?.events.reduce((s, e) => s + e.predictedAttendance, 0) ?? 0
  const avgFillRate = data?.events.length
    ? Math.round(data.events.reduce((s, e) => s + e.fillRate, 0) / data.events.length)
    : 0

  const trendData = data?.trend.map((t) => ({ d: t.date.slice(5), v: t.registrations })) ?? []

  return (
    <AppShell role="Organizer" userName="Organizer" title="Analytics">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Event Analytics</h1>
          <p className="text-sm text-muted-foreground">Registration velocity, capacity fill, and predicted turnout across your events.</p>
        </Reveal>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading analytics...
          </div>
        ) : (
          <>
            <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Registrations" value={totalRegistered} icon={Users} accent="primary" />
              <StatCard label="Capacity Booked" value={totalCapacity ? Math.round((totalRegistered / totalCapacity) * 100) : 0} suffix="%" icon={Ticket} accent="secondary" />
              <StatCard label="Avg Fill Rate" value={avgFillRate} suffix="%" icon={Gauge} accent="flame" />
              <StatCard label="Predicted Turnout" value={totalPredicted} icon={Target} accent="primary" />
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-3">
              <Reveal className="lg:col-span-2">
                <RegistrationTrendChart data={trendData} />
              </Reveal>
              <Reveal>
                <TicketMixChart />
              </Reveal>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
