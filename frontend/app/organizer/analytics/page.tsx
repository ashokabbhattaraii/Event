"use client"

import Link from "next/link"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { RegistrationTrendChart, TicketMixChart } from "@/components/app/organizer-charts"
import { Reveal } from "@/components/anim/reveal"
import { useMyEvents } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"
import { CalendarDays, Users, DollarSign, Sparkles } from "lucide-react"

export default function OrganizerAnalyticsPage() {
  const { data: userData } = useCurrentUser()
  const { data: eventsData } = useMyEvents({ limit: 50 })
  const user = userData?.user
  const events = eventsData?.events ?? []

  const totalRegistrations = events.reduce((sum, e) => sum + e.registered, 0)
  const totalCapacity = events.reduce((sum, e) => sum + e.capacity, 0)
  const fillRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0
  const revenueEvents = events.filter((e) => e.price && e.price !== "Free" && e.price !== "0")

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Analytics">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Event Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance metrics across all your events.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Events" value={events.length} icon={CalendarDays} accent="primary" />
          <StatCard label="Total Registrations" value={totalRegistrations} icon={Users} accent="secondary" />
          <StatCard label="Paid Events" value={revenueEvents.length} icon={DollarSign} accent="flame" />
          <StatCard label="Avg. Fill Rate" value={fillRate} suffix="%" icon={Sparkles} accent="primary" />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <RegistrationTrendChart />
          </Reveal>
          <Reveal>
            <TicketMixChart />
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
