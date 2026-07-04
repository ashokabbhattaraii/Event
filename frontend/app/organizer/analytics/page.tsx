import { DollarSign, Gauge, Ticket, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { RegistrationTrendChart, TicketMixChart } from "@/components/app/organizer-charts"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"

export default function OrganizerAnalyticsPage() {
  return (
    <AppShell role="Organizer" userName="Marcus Reid" title="Analytics">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Event Analytics</h1>
          <p className="text-sm text-muted-foreground">Measure registration velocity, ticket performance, and conversion quality across your events.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Registrations" value={1759} icon={Users} accent="primary" trend="+22%" />
          <StatCard label="Revenue (MTD)" value={48200} prefix="$" icon={DollarSign} accent="secondary" trend="+14%" />
          <StatCard label="Tickets Sold" value={1240} icon={Ticket} accent="flame" trend="+8%" />
          <StatCard label="Fill Quality" value={91} suffix="%" icon={Gauge} accent="primary" trend="+4%" />
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