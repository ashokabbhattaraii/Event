"use client"

import { useState } from "react"
import {
  Building2,
  CalendarDays,
  Loader2,
  ShieldCheck,
  Users,
  Pause,
  Play,
  Search,
  ExternalLink,
} from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useMyOrganization, useUpdateMyOrganization } from "@/lib/queries/organizations"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrgStats, useOrgUsers } from "@/lib/queries/users"
import {
  usePendingOrganizations,
  useUpdateOrganization,
} from "@/lib/queries/system"
import { FilterSelect } from "@/components/app/search-input"
import type { PendingOrganization } from "@/lib/queries/system"

const statusFilterOptions = [
  { label: "All tenants", value: "" },
  { label: "Active", value: "active" },
  { label: "Pending approval", value: "pending" },
  { label: "Suspended", value: "suspended" },
  { label: "Rejected", value: "rejected" },
]

function OrgDirectory() {
  const [status, setStatus] = useState("active")
  const [renameId, setRenameId] = useState<string | null>(null)
  const [rename, setRename] = useState("")
  const { data, isLoading } = usePendingOrganizations(status)
  const updateOrg = useUpdateOrganization()
  const { data: stats, isLoading: statsLoading } = useOrgStats()
  const organizations: PendingOrganization[] = data?.organizations ?? []

  const handleStatusToggle = (org: PendingOrganization) => {
    const next = org.status === "suspended" ? "active" : "suspended"
    updateOrg.mutate({ id: org._id, status: next })
  }
  const startRename = (org: PendingOrganization) => {
    setRenameId(org._id)
    setRename(org.name)
  }
  const submitRename = (org: PendingOrganization) => {
    if (rename.trim() && rename.trim() !== org.name) {
      updateOrg.mutate({ id: org._id, name: rename.trim() })
    }
    setRenameId(null)
  }

  return (
    <div className="space-y-6">
      <Reveal className="flex flex-col gap-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              Platform Organizations
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              System admin view — manage every tenant on the platform.
            </p>
          </div>
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={statusFilterOptions}
            className="w-full sm:w-52"
          />
        </div>
      </Reveal>

      <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tenants" value={organizations.length} icon={Building2} accent="primary" />
        <StatCard
          label="Team Members"
          value={stats?.userCount ?? 0}
          icon={Users}
          accent="secondary"
        />
        <StatCard
          label="Events Hosted"
          value={stats?.eventCount ?? 0}
          icon={CalendarDays}
          accent="flame"
        />
        <StatCard
          label="Administrators"
          value={stats?.roleCounts?.admin ?? 0}
          icon={ShieldCheck}
          accent="primary"
        />
      </Reveal>

      <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
        <h2 className="font-display text-lg font-semibold text-ink">Tenants</h2>
        {isLoading || statsLoading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading tenants…
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium">Owner / Admin</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org) => {
                  const suspended = org.status === "suspended"
                  const isPending = org.status === "pending"
                  return (
                    <tr key={org._id} className="hover:bg-muted/40">
                      <td className="py-3.5">
                        <div className="font-medium text-ink">
                          {renameId === org._id ? (
                            <input
                              value={rename}
                              onChange={(e) => setRename(e.target.value)}
                              onBlur={() => submitRename(org)}
                              onKeyDown={(e) => e.key === "Enter" && submitRename(org)}
                              className="w-full max-w-xs rounded-xl border border-border bg-background px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary"
                              autoFocus
                            />
                          ) : (
                            <div
                              className={
                                "inline-flex items-center gap-2 cursor-pointer"
                              }
                              onDoubleClick={() => startRename(org)}
                              title="Double-click to rename"
                            >
                              <Building2 className="size-4 text-muted-foreground" />
                              {org.name}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {org.slug} {isPending && "· pending approval"}
                        </div>
                      </td>
                      <td className="py-3.5 text-sm text-muted-foreground">
                        {org.admin ? `${org.admin.name} (${org.admin.email})` : (
                          <span className="text-xs italic">No admin assigned</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold " +
                            (org.status === "active"
                              ? "bg-secondary/15 text-secondary"
                              : org.status === "suspended"
                              ? "bg-flame/12 text-flame"
                              : org.status === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/15 text-amber-700")
                          }
                        >
                          <span
                            className={
                              "size-1.5 rounded-full " +
                              (org.status === "active"
                                ? "bg-secondary"
                                : "bg-flame")
                            }
                          />
                          {org.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {!isPending && (
                          <button
                            onClick={() => handleStatusToggle(org)}
                            disabled={updateOrg.isPending}
                            className={
                              "inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors " +
                                (suspended
                                  ? "border-secondary bg-secondary/10 text-secondary hover:bg-secondary/20"
                                  : "border-flame bg-flame/10 text-flame hover:bg-flame/20")
                            }
                            title={suspended ? "Reactivate tenant" : "Suspend tenant"}
                          >
                            {suspended ? <Play className="size-3" /> : <Pause className="size-3" />}
                            {suspended ? "Activate" : "Suspend"}
                          </button>
                        )}
                        <a
                          href={`/admin/users`}
                          className="ml-2 inline-flex items-center text-xs text-muted-foreground hover:text-ink"
                          title="Manage this tenant's users"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {organizations.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No tenants match the selected status.
              </p>
            )}
          </div>
        )}
      </Reveal>
    </div>
  )
}

export default function AdminOrganizationsPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const isSystemAdmin = !user?.organization

  return isSystemAdmin ? (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Organization">
      <OrgDirectory />
    </AppShell>
  ) : (
    <OrgProfile />
  )
}

function OrgProfile() {
  const { data: userData } = useCurrentUser()
  const { data: orgData, isLoading: orgLoading } = useMyOrganization()
  const { data: stats } = useOrgStats()
  const updateOrg = useUpdateMyOrganization()
  const user = userData?.user
  const organization = orgData?.organization
  const [name, setName] = useState("")

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Organization">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Your Organization</h1>
          <p className="text-sm text-muted-foreground">This is your organization&apos;s profile and activity.</p>
        </Reveal>

        {orgLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading organization...
          </div>
        ) : organization ? (
          <>
            <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
                <div className="font-display mt-4 truncate text-xl font-extrabold tracking-tight text-ink">
                  {organization.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Organization</div>
              </div>
              <StatCard label="Team Members" value={stats?.userCount ?? 0} icon={Users} accent="secondary" />
              <StatCard label="Events Hosted" value={stats?.eventCount ?? 0} icon={CalendarDays} accent="flame" />
            </Reveal>

            <Reveal className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-secondary" />
                <h2 className="font-display text-lg font-semibold text-ink">
                  Status: {organization.status}
                </h2>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium text-ink">Rename Organization</label>
                  <input
                    defaultValue={organization.name}
                    placeholder={organization.name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-ink outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={() => name && updateOrg.mutate({ name })}
                  disabled={updateOrg.isPending || !name}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {updateOrg.isPending && <Loader2 className="size-4 animate-spin" />}
                  Save
                </button>
              </div>
            </Reveal>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No organization found for your account.
          </div>
        )}
      </div>
    </AppShell>
  )
}
