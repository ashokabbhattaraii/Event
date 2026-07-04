"use client"

import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { organizations } from "@/lib/data"
import { Check, X, Network, UserPlus, Crown, Shield, Eye, Clock } from "lucide-react"

const collaborators = [
  { name: "R. Tanaka", org: "Apex Labs", role: "Owner", icon: Crown, color: "text-primary bg-primary/10" },
  { name: "S. Okoye", org: "Velocity", role: "Co-host", icon: Shield, color: "text-secondary bg-secondary/12" },
  { name: "L. Fernandez", org: "Meridian", role: "Editor", icon: Shield, color: "text-secondary bg-secondary/12" },
  { name: "J. Park", org: "Northwind", role: "Viewer", icon: Eye, color: "text-flame bg-flame/12" },
]

const requests = [
  { org: "Meridian", admin: "L. Fernandez", event: "DevSummit 2026", role: "Co-host", time: "26m ago" },
  { org: "Coreflow", admin: "M. Ahmed", event: "Hands-on UX Workshop", role: "Editor", time: "3h ago" },
]

const sharedEvents = [
  { name: "DevSummit 2026", partners: ["Apex Labs", "Velocity", "Meridian"], status: "Active" },
  { name: "Founder Networking Mixer", partners: ["Northwind", "Apex Labs"], status: "Planning" },
]

const orgStatusStyle: Record<string, string> = {
  Active: "bg-secondary/15 text-secondary",
  Pending: "bg-flame/15 text-flame",
  Suspended: "bg-destructive/10 text-destructive",
}

export default function CollaborationPage() {
  return (
    <AppShell role="Organizer" userName="Marcus Reid" title="Collaboration Hub">
      <div className="space-y-8">
        <Reveal y={16}>
          <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-6 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
            <div className="relative flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Network className="size-6" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold">Multi-Organization Collaboration</h2>
                <p className="text-sm text-white/80">Co-host events, assign granular roles, and work across tenants.</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Pending requests */}
        <div>
          <Reveal y={14} className="mb-4 flex items-center gap-2">
            <Clock className="size-4 text-flame" />
            <h3 className="font-display text-lg font-bold text-ink">Pending Requests</h3>
            <span className="rounded-full bg-flame/12 px-2 py-0.5 text-xs font-semibold text-flame">
              {requests.length}
            </span>
          </Reveal>
          <Reveal stagger={0.1} y={20} className="grid gap-4 md:grid-cols-2">
            {requests.map((r) => (
              <div key={r.org} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-display text-base font-semibold text-ink">{r.org}</h4>
                    <p className="text-xs text-muted-foreground">
                      {r.admin} · {r.time}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {r.role}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Wants to collaborate on <span className="font-medium text-ink">{r.event}</span>
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground transition-transform hover:-translate-y-0.5">
                    <Check className="size-4" /> Accept
                  </button>
                  <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-muted">
                    <X className="size-4" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </Reveal>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Team members */}
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-ink">Team & Roles</h3>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted">
                  <UserPlus className="size-3.5" /> Invite
                </button>
              </div>
              <ul className="mt-5 space-y-3">
                {collaborators.map((c) => (
                  <li key={c.name} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <span className={`flex size-9 items-center justify-center rounded-full ${c.color}`}>
                      <c.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.org}</div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-ink">{c.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Shared events */}
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-ink">Shared Events</h3>
              <ul className="mt-5 space-y-3">
                {sharedEvents.map((s) => (
                  <li key={s.name} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-sm font-semibold text-ink">{s.name}</h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          s.status === "Active" ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center -space-x-2">
                      {s.partners.map((p, i) => (
                        <span
                          key={p}
                          className="bg-brand-gradient flex size-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white"
                          style={{ zIndex: s.partners.length - i }}
                          title={p}
                        >
                          {p.slice(0, 2)}
                        </span>
                      ))}
                      <span className="pl-4 text-xs text-muted-foreground">{s.partners.length} organizations</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Org directory */}
        <Reveal>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-bold text-ink">Organization Directory</h3>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">Organization</th>
                    <th className="pb-3 font-medium">Tenant ID</th>
                    <th className="pb-3 font-medium">Admin</th>
                    <th className="pb-3 font-medium">Active Events</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {organizations.map((o) => (
                    <tr key={o.tenantId} className="transition-colors hover:bg-muted/40">
                      <td className="py-3.5 font-medium text-ink">{o.name}</td>
                      <td className="py-3.5 font-mono text-xs text-muted-foreground">{o.tenantId}</td>
                      <td className="py-3.5 text-ink">{o.admin}</td>
                      <td className="py-3.5 font-mono text-xs text-ink">{o.activeEvents}</td>
                      <td className="py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${orgStatusStyle[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>
    </AppShell>
  )
}
