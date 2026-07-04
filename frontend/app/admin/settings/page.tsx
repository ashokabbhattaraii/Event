import { Bell, Database, Globe2, Shield, Workflow } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"

const settingsGroups = [
  { title: "Platform Access", icon: Shield, body: "Require SSO for administrators and enforce session limits across all tenants.", status: "Enforced" },
  { title: "Notification Routing", icon: Bell, body: "Define escalation channels for critical alerts, billing failures, and live-event incidents.", status: "Healthy" },
  { title: "Regional Delivery", icon: Globe2, body: "Set default regions, CDN policy, and data residency preferences for each organization.", status: "AP Southeast" },
  { title: "Automations", icon: Workflow, body: "Manage lifecycle triggers for publishing, reminders, archival, and anomaly detection.", status: "12 active" },
  { title: "Backups", icon: Database, body: "Daily snapshots, log retention, and restore testing cadence for critical platform services.", status: "Daily" },
]

export default function AdminSettingsPage() {
  return (
    <AppShell role="Administrator" userName="Jordan Reyes" title="System Settings">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">System Settings</h1>
          <p className="text-sm text-muted-foreground">Centralize platform defaults, automation controls, and service policies.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {settingsGroups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <group.icon className="size-5" />
              </span>
              <h2 className="font-display mt-4 text-lg font-semibold text-ink">{group.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{group.body}</p>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Current state</span>
                <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">{group.status}</span>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}