"use client"

import { useState } from "react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { CountUp } from "@/components/anim/count-up"
import { iamUsers, roles, permissionMatrix, auditLog, sessions, securityScore } from "@/lib/data"
import { ShieldCheck, Check, X, Lock, Smartphone, Monitor, AlertTriangle, Search, UserPlus } from "lucide-react"

const statusStyle: Record<string, string> = {
  Active: "bg-secondary/15 text-secondary",
  Invited: "bg-primary/15 text-primary",
  Suspended: "bg-flame/15 text-flame",
}

const levelDot: Record<string, string> = {
  info: "bg-primary",
  warn: "bg-flame",
  danger: "bg-destructive",
}

export default function SecurityPage() {
  const [query, setQuery] = useState("")
  const filtered = iamUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.role.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <AppShell role="Administrator" userName="Jordan Reyes" title="Security & IAM">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Security & Identity Access</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Role-based access control, audit trails, and platform security posture.
          </p>
        </Reveal>

        {/* Security posture */}
        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {securityScore.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]"
            >
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="font-display mt-2 text-3xl font-bold text-ink">
                <CountUp to={s.value} />%
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-gradient transition-all"
                  style={{ width: `${s.value}%` }}
                />
              </div>
            </div>
          ))}
        </Reveal>

        {/* Roles */}
        <Reveal className="grid gap-4 lg:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r.name}
              className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.color}`}>{r.name}</span>
                <span className="font-mono text-sm font-medium text-ink">
                  <CountUp to={r.users} />
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </Reveal>

        {/* Permission matrix */}
        <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
          <h2 className="font-display text-lg font-semibold text-ink">Permission Matrix</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 font-medium">Capability</th>
                  <th className="pb-3 text-center font-medium">Admin</th>
                  <th className="pb-3 text-center font-medium">Organizer</th>
                  <th className="pb-3 text-center font-medium">Attendee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {permissionMatrix.map((p) => (
                  <tr key={p.feature} className="transition-colors hover:bg-muted/40">
                    <td className="py-3 pr-4 font-medium text-ink">{p.feature}</td>
                    {[p.admin, p.organizer, p.attendee].map((allowed, i) => (
                      <td key={i} className="py-3 text-center">
                        {allowed ? (
                          <Check className="mx-auto size-4 text-secondary" />
                        ) : (
                          <X className="mx-auto size-4 text-muted-foreground/40" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Users table */}
        <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">User Directory</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users…"
                  className="h-10 w-56 rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
              <button className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
                <UserPlus className="size-4" /> Invite
              </button>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium">MFA</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => (
                  <tr key={u.email} className="transition-colors hover:bg-muted/40">
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-ink">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="py-3.5 pr-4 text-muted-foreground">{u.role}</td>
                    <td className="py-3.5 pr-4 text-muted-foreground">{u.org}</td>
                    <td className="py-3.5 pr-4">
                      {u.mfa ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
                          <Lock className="size-3.5" /> On
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-flame">
                          <AlertTriangle className="size-3.5" /> Off
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono text-xs text-muted-foreground">{u.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Audit + sessions */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink">Audit Log</h2>
            <ul className="mt-5 space-y-4">
              {auditLog.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${levelDot[a.level]}`} />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug text-ink">
                      <span className="font-medium">{a.actor}</span> — {a.action}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {a.ip} · {a.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink">Active Sessions</h2>
            <ul className="mt-5 space-y-3">
              {sessions.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink">
                    {s.device.includes("iPhone") ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{s.device}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.location} · {s.ip}
                    </p>
                  </div>
                  {s.current ? (
                    <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary">
                      Current
                    </span>
                  ) : (
                    <button className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-flame hover:text-flame">
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
