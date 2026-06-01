import { Lock, ShieldCheck, UserCog, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { iamUsers, roles } from "@/lib/data"

const statusStyle: Record<string, string> = {
  Active: "bg-secondary/15 text-secondary",
  Invited: "bg-primary/12 text-primary",
  Suspended: "bg-flame/15 text-flame",
}

export default function AdminUsersPage() {
  const admins = iamUsers.filter((user) => user.role === "Administrator").length
  const organizers = iamUsers.filter((user) => user.role === "Organizer").length
  const mfaEnabled = iamUsers.filter((user) => user.mfa).length

  return (
    <AppShell role="Administrator" userName="Jordan Reyes" title="Users & Roles">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Track access levels, invitations, and security posture across your user directory.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Managed Users" value={iamUsers.length} icon={Users} accent="primary" />
          <StatCard label="Administrators" value={admins} icon={ShieldCheck} accent="secondary" />
          <StatCard label="Organizers" value={organizers} icon={UserCog} accent="flame" />
          <StatCard label="MFA Enabled" value={mfaEnabled} icon={Lock} accent="primary" />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink">User Directory</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Organization</th>
                    <th className="pb-3 font-medium">MFA</th>
                    <th className="pb-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {iamUsers.map((user) => (
                    <tr key={user.email} className="transition-colors hover:bg-muted/40">
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-ink">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="py-3.5 text-muted-foreground">{user.role}</td>
                      <td className="py-3.5 text-muted-foreground">{user.org}</td>
                      <td className="py-3.5 text-xs font-medium text-ink">{user.mfa ? "Enabled" : "Off"}</td>
                      <td className="py-3.5 text-right">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[user.status]}`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal className="space-y-4">
            {roles.map((role) => (
              <div key={role.name} className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${role.color}`}>{role.name}</span>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{role.desc}</p>
                <p className="mt-4 font-display text-2xl font-bold text-ink">{role.users}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}