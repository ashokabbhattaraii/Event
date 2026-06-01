import { Building2, CircleAlert, ShieldCheck, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { organizations } from "@/lib/data"

const statusStyle: Record<string, string> = {
  Active: "bg-secondary/15 text-secondary",
  Pending: "bg-flame/15 text-flame",
  Suspended: "bg-destructive/10 text-destructive",
}

export default function AdminOrganizationsPage() {
  const active = organizations.filter((org) => org.status === "Active").length
  const pending = organizations.filter((org) => org.status === "Pending").length
  const suspended = organizations.filter((org) => org.status === "Suspended").length
  const totalUsers = organizations.reduce((sum, org) => sum + org.users, 0)

  return (
    <AppShell role="Administrator" userName="Jordan Reyes" title="Organizations">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Organization Directory</h1>
          <p className="text-sm text-muted-foreground">
            Monitor tenant health, user volumes, and activation state across the platform.
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Organizations" value={organizations.length} icon={Building2} accent="primary" />
          <StatCard label="Active Tenants" value={active} icon={ShieldCheck} accent="secondary" />
          <StatCard label="Pending Review" value={pending} icon={CircleAlert} accent="flame" />
          <StatCard label="Managed Users" value={totalUsers} icon={Users} accent="primary" />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink">Tenant Snapshot</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">Organization</th>
                    <th className="pb-3 font-medium">Tenant ID</th>
                    <th className="pb-3 font-medium">Admin</th>
                    <th className="pb-3 font-medium">Users</th>
                    <th className="pb-3 font-medium">Events</th>
                    <th className="pb-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {organizations.map((org) => (
                    <tr key={org.tenantId} className="transition-colors hover:bg-muted/40">
                      <td className="py-3.5 font-medium text-ink">{org.name}</td>
                      <td className="py-3.5 font-mono text-xs text-muted-foreground">{org.tenantId}</td>
                      <td className="py-3.5 text-muted-foreground">{org.admin}</td>
                      <td className="py-3.5 font-mono text-xs text-ink">{org.users}</td>
                      <td className="py-3.5 font-mono text-xs text-ink">{org.activeEvents}</td>
                      <td className="py-3.5 text-right">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[org.status]}`}>
                          {org.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink">Health Summary</h2>
            <div className="mt-5 space-y-4">
              {[
                { label: "Active", value: active, tone: "bg-secondary/15 text-secondary" },
                { label: "Pending", value: pending, tone: "bg-flame/15 text-flame" },
                { label: "Suspended", value: suspended, tone: "bg-destructive/10 text-destructive" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.tone}`}>{item.value}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(item.value / organizations.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}