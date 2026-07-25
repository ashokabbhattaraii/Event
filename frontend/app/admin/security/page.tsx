"use client"

import { useState } from "react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrgUsers } from "@/lib/queries/users"
import { ShieldCheck, Check, X, Search, UserPlus, Loader2, Users, UserCog } from "lucide-react"

const roleColors: Record<string, string> = {
  admin: "bg-primary/12 text-primary",
  organizer: "bg-secondary/15 text-secondary",
  attendee: "bg-flame/12 text-flame",
}

export default function SecurityPage() {
  const { data: userData } = useCurrentUser()
  const { data: usersData, isLoading } = useOrgUsers({ limit: 100 })
  const [query, setQuery] = useState("")

  const user = userData?.user
  const users = usersData?.users ?? []
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.role.toLowerCase().includes(query.toLowerCase()),
  )

  const admins = users.filter((u) => u.role === "admin").length
  const organizers = users.filter((u) => u.role === "organizer").length
  const attendees = users.filter((u) => u.role === "attendee").length

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Security & IAM">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Security & Identity Access</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Role-based access control and user management for your organization.
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">Administrator</span>
              <span className="font-mono text-sm font-medium text-ink">{admins}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Full platform control, billing, and IAM.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">Organizer</span>
              <span className="font-mono text-sm font-medium text-ink">{organizers}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Create events, manage teams and check-in.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-flame/12 px-3 py-1 text-xs font-semibold text-flame">Attendee</span>
              <span className="font-mono text-sm font-medium text-ink">{attendees}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Browse, register, and manage tickets.</p>
          </div>
        </Reveal>

        <Reveal className="rounded-2xl border border-border bg-card p-6">
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
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading users...
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => (
                    <tr key={u._id} className="transition-colors hover:bg-muted/40">
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-ink">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[u.role] || "bg-muted text-muted-foreground"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {query ? "No users match your search." : "No users found."}
                </p>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </AppShell>
  )
}
