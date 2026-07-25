"use client"

import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrganizations } from "@/lib/queries/organizations"
import { Check, X, Network, UserPlus, Crown, Shield, Eye, Clock, Loader2 } from "lucide-react"

const orgStatusStyle: Record<string, string> = {
  active: "bg-secondary/15 text-secondary",
  pending: "bg-flame/15 text-flame",
  suspended: "bg-destructive/10 text-destructive",
}

export default function CollaborationPage() {
  const { data: userData } = useCurrentUser()
  const { data: orgsData, isLoading } = useOrganizations()
  const user = userData?.user
  const organizations = orgsData?.organizations ?? []

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Collaboration Hub">
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
                <p className="text-sm text-white/80">Co-host events and work across tenants.</p>
              </div>
            </div>
          </div>
        </Reveal>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading organizations...
          </div>
        ) : (
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-ink">Organization Directory</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-ink">
                  {organizations.length} total
                </span>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-3 font-medium">Organization</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 text-right font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {organizations.map((o) => (
                      <tr key={o._id} className="transition-colors hover:bg-muted/40">
                        <td className="py-3.5 font-medium text-ink">{o.name}</td>
                        <td className="py-3.5">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${orgStatusStyle[o.status] || "bg-muted text-muted-foreground"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {organizations.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No organizations found.
                </p>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </AppShell>
  )
}
