"use client"

import { useState } from "react"
import { Building2, CalendarDays, Loader2, ShieldCheck, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { useMyOrganization, useUpdateMyOrganization } from "@/lib/queries/organizations"
import { useOrgStats } from "@/lib/queries/users"

export default function AdminOrganizationsPage() {
  const { data: orgData, isLoading: orgLoading } = useMyOrganization()
  const { data: stats } = useOrgStats()
  const updateOrg = useUpdateMyOrganization()

  const organization = orgData?.organization
  const [name, setName] = useState("")

  return (
    <AppShell role="Administrator" userName="Admin" title="Organization">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Your Organization</h1>
          <p className="text-sm text-muted-foreground">
            EventNexus scopes every admin to their own tenant — this is your organization&apos;s profile and activity.
          </p>
        </Reveal>

        {orgLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading organization...
          </div>
        ) : organization ? (
          <>
            <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
                <div className="font-display mt-4 truncate text-xl font-extrabold tracking-tight text-ink">
                  {organization.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Organization</div>
              </div>
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
            </Reveal>

            <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-secondary" />
                <h2 className="font-display text-lg font-semibold text-ink">Status: {organization.status}</h2>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium text-ink">Rename Organization</label>
                  <input
                    defaultValue={organization.name}
                    placeholder={organization.name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
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
