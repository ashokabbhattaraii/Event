"use client"

import { useState } from "react"
import type { ReactElement } from "react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrgUsers, useUpdateUserRole } from "@/lib/queries/users"
import { useRoles, usePermissions, useUpdateRolePermissions } from "@/lib/queries/iam"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ShieldCheck,
  Search,
  UserPlus,
  Loader2,
  Users,
  UserCog,
} from "lucide-react"
import type { PermissionDefinition, RolePermission } from "@/lib/api/iam"

const roleIcons: Record<string, ReactElement> = {
  admin: <ShieldCheck className="size-5 text-primary" />,
  organizer: <UserCog className="size-5 text-secondary" />,
  attendee: <Users className="size-5 text-flame" />,
}

const roleColors: Record<string, string> = {
  admin: "bg-primary/12 text-primary",
  organizer: "bg-secondary/15 text-secondary",
  attendee: "bg-flame/12 text-flame",
}

export default function SecurityPage() {
  const { data: userData } = useCurrentUser()
  const { data: usersData, isLoading: usersLoading } = useOrgUsers({ limit: 100 })
  const { data: rolesData, isLoading: rolesLoading } = useRoles()
  const { data: permsData } = usePermissions()
  const updatePermissions = useUpdateRolePermissions()
  const updateRole = useUpdateUserRole()

  const user = userData?.user
  const isSystemAdmin = !user?.organization
  // Tenant admins (admin WITH an org) may edit their own roles but the
  // system roles stay locked to the system admin.
  const canEditRoles = !!user?.role && (isSystemAdmin || user.role === "admin")
  const users = usersData?.users ?? []
  const roles = rolesData?.roles ?? []
  const permissions = permsData?.permissions ?? []
  const [query, setQuery] = useState("")
  const loading = usersLoading

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.role.toLowerCase().includes(query.toLowerCase()),
  )

  const admins = users.filter((u) => u.role === "admin").length
  const organizers = users.filter((u) => u.role === "organizer").length
  const attendees = users.filter((u) => u.role === "attendee").length

  // Group permission definitions by scope so the matrix column headers
  // read "Event management" rather than "event:manage".
  const systemPerms = permissions.filter((p) => p.scope !== "organization")
  const orgPerms = permissions.filter((p) => p.scope === "organization")

  const roleDefinition = (name: string): RolePermission | undefined =>
    roles.find((r) => r.name === name)

  const togglePermission = (role: RolePermission, code: string, checked: boolean) => {
    if (!canEditRoles) return
    const next = checked
      ? Array.from(new Set([...role.permissions, code]))
      : role.permissions.filter((p) => p !== code)
    updatePermissions.mutate({ id: role._id, permissions: next })
  }

  // Grant (or revoke) a single permission across every system-scope role.
  // If all system roles already hold the permission, revoke it everywhere;
  // otherwise grant it to the ones that don't yet have it.
  const setPermissionAcrossRoles = (code: string) => {
    if (!canEditRoles) return
    const systemRoles = roles.filter((r) => r.scope === "system")
    const allHave = systemRoles.every((r) => roleAllows(r, code))
    const target = !allHave
    systemRoles.forEach((role) => {
      const currentlyOn = roleAllows(role, code)
      if (currentlyOn !== target) {
        togglePermission(role, code, target)
      }
    })
  }

  const roleAllows = (role: RolePermission, code: string) =>
    role.effectivePermissions.includes(code) || role.permissions.includes(code)

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Security & IAM">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              Security & Identity Access
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Identity &amp; access management for your{" "}
            <span className="font-medium text-ink">
              {isSystemAdmin ? "platform" : "organization"}
            </span>
            .
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
                Administrator
              </span>
              <span className="font-mono text-sm font-medium text-ink">{admins}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Full platform control, billing, and IAM.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">
                Organizer
              </span>
              <span className="font-mono text-sm font-medium text-ink">{organizers}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Create events, manage teams and check-in.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-flame/12 px-3 py-1 text-xs font-semibold text-flame">
                Attendee
              </span>
              <span className="font-mono text-sm font-medium text-ink">{attendees}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Browse, register, and manage tickets.
            </p>
          </div>
        </Reveal>

        {/* --- Granular RBAC permission matrix (advanced) ----------------- */}
        <Reveal className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-ink">Role permissions matrix</h2>
            <span className="text-xs text-muted-foreground">
              {isSystemAdmin
                ? "Platform scope — managed by the system admin."
                : "View-only for a tenant administrator."}
            </span>
          </div>

          {rolesLoading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading roles…
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Scope</th>
                    {systemPerms.map((p) => {
                      const systemRoles = roles.filter((r) => r.scope === "system")
                      const allHave = systemRoles.every((r) => roleAllows(r, p.code))
                      const canGrantAll = canEditRoles && isSystemAdmin
                      return (
                        <th
                          key={p.code}
                          className="pb-3 font-medium"
                          title={p.description}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs uppercase tracking-wider">
                              {p.code}
                            </span>
                            {canGrantAll && systemRoles.length > 0 && (
                              <button
                                onClick={() => setPermissionAcrossRoles(p.code)}
                                disabled={updatePermissions.isPending}
                                className={
                                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold opacity-60 transition-all hover:opacity-100 " +
                                  (allHave
                                    ? "bg-flame/12 text-flame hover:bg-flame/20"
                                    : "bg-secondary/12 text-secondary hover:bg-secondary/20")
                                }
                                title={
                                  allHave
                                    ? `Revoke ${p.code} from all roles`
                                    : `Grant ${p.code} to all roles`
                                }
                              >
                                {allHave ? "all" : "none"}
                              </button>
                            )}
                          </div>
                        </th>
                      )
                    })}
                    {orgPerms.length > 0 && (
                      <th className="pb-3 font-medium">Tenant permissions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roles.map((role) => (
                    <tr key={role._id} className="hover:bg-muted/40">
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          {roleIcons[role.name] ?? <ShieldCheck className="size-4" />}
                          <span className="font-medium text-ink">{role.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">{role.scope}</td>
                      {systemPerms.map((p) => {
                        const on = roleAllows(role, p.code)
                        const editable = canEditRoles && isSystemAdmin && role.scope === "system"
                        const disabled = !editable
                        return (
                          <td key={p.code} className="py-3.5 text-center">
                            <label className="inline-flex h-4 w-4 cursor-pointer items-center justify-center">
                              <Checkbox
                                checked={on}
                                disabled={disabled}
                                onCheckedChange={(checked) =>
                                  togglePermission(role, p.code, !!checked)
                                }
                              />
                            </label>
                          </td>
                        )
                      })}
                      {orgPerms.length > 0 && (
                        <td className="py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {orgPerms.map((p) => (
                              <span
                                key={p.code}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-1.5 py-0.5 text-[10px] font-medium"
                                title={p.description}
                              >
                                {p.code}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!canEditRoles && (
                <p className="mt-4 text-xs text-muted-foreground">
                  A tenant administrator can view but not change platform role permissions.
                </p>
              )}
              {canEditRoles && isSystemAdmin && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Toggle a permission to grant or revoke it for the role. Changes apply to new
                  tokens immediately (active sessions are invalidated on role edits).
                </p>
              )}
            </div>
          )}
        </Reveal>

        {/* --- User directory (still here) ---------------------------------- */}
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
              <a
                href="/admin/users?create=1"
                className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"
                title="Create a user from the Users & Roles page"
              >
                <UserPlus className="size-3.5" /> Add user
              </a>
              {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {loading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading users…
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
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="transition-colors hover:bg-muted/40">
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-ink">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold " +
                              (roleColors[u.role] || roleColors.attendee)
                            }
                            title={
                              roleDefinition(u.role)?.effectivePermissions?.length
                                ? `${u.role} — ${roleDefinition(u.role)!.effectivePermissions.length} permissions`
                                : u.role
                            }
                          >
                            {roleIcons[u.role] ?? <ShieldCheck className="size-3" />}
                            {u.role}
                          </span>
                          {roleDefinition(u.role)?.effectivePermissions?.length && (
                            <span
                              className="text-xs text-muted-foreground"
                              title={roleDefinition(u.role)!.effectivePermissions.join(", ")}
                            >
                              ({roleDefinition(u.role)!.effectivePermissions.length})
                            </span>
                          )}
                        </div>
                        <select
                          value={u.role}
                          disabled={updateRole.isPending || !canEditRoles}
                          onChange={(e) =>
                            updateRole.mutate({ id: u._id, role: e.target.value })
                          }
                          className="mt-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
                        >
                          {isSystemAdmin ? (
                            <>
                              <option value="admin">admin</option>
                              <option value="organizer">organizer</option>
                              <option value="attendee">attendee</option>
                            </>
                          ) : (
                            <>
                              <option value="organizer">organizer</option>
                              <option value="attendee">attendee</option>
                            </>
                          )}
                        </select>
                      </td>
                      <td className="py-3.5 text-right text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
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
