"use client"

import { useState } from "react"
import {
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import {
  useApproveOrganization,
  usePendingOrganizations,
  useRejectOrganization,
} from "@/lib/queries/system"

export default function OrgApprovalsPage() {
  const { data: userData } = useCurrentUser()
  const [status, setStatus] = useState("pending")
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const { data, isLoading } = usePendingOrganizations(status)
  const approve = useApproveOrganization()
  const reject = useRejectOrganization()

  const user = userData?.user
  const isSystemAdmin = user?.role === "admin" && !user?.organization

  return (
    <AppShell
      role="Administrator"
      userName={user?.name || "Admin"}
      title="Organization approvals"
    >
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Organization approvals
          </h1>
          <p className="text-sm text-muted-foreground">
            Verify and approve organization registrations. Approved orgs can log in and build
            their workspace; rejected orgs receive the reason.
          </p>
        </Reveal>

        {!isSystemAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-5" />
              <p className="text-sm font-medium">
                Only the system admin (admin without an organization) can approve organizations.
                Your account is scoped to a tenant.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Reveal stagger={0.1} y={24}>
              <div className="flex gap-2">
                {["pending", "active", "rejected"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      status === s
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                {isLoading && (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading organizations…
                  </div>
                )}
                {!isLoading && data?.organizations.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                    No {status} organizations.
                  </div>
                )}
                {data?.organizations.map((org) => (
                  <div key={org._id} className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                            <Building2 className="size-5 text-primary" />
                          </span>
                          <div>
                            <h3 className="font-display text-lg font-bold text-ink">{org.name}</h3>
                            <span
                              className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                org.status === "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : org.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {org.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Globe className="size-4" /> {org.website || "—"}
                          </p>
                          <p className="flex items-center gap-2">
                            <Mail className="size-4" /> {org.email || "—"}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="size-4" /> {org.phone || "—"}
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            {[org.address, org.city, org.country].filter(Boolean).join(", ") || "—"}
                          </p>
                          {org.type && (
                            <p className="flex items-center gap-2">
                              <Building2 className="size-4" /> {org.type}
                            </p>
                          )}
                        </div>
                        {org.description && (
                          <p className="mt-3 text-sm text-muted-foreground">{org.description}</p>
                        )}
                        {org.rejectionReason && org.status === "rejected" && (
                          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            Rejection reason: {org.rejectionReason}
                          </p>
                        )}
                        <p className="mt-3 text-xs text-muted-foreground">
                          Registered {new Date(org.createdAt).toLocaleDateString()} · Admin:{" "}
                          <span className="font-semibold text-ink">{org.admin?.name || "—"}</span>{" "}
                          ({org.admin?.email || "—"})
                        </p>
                      </div>

                      {org.status === "pending" && (
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            onClick={() => approve.mutate(org._id)}
                            disabled={approve.isPending}
                            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                          >
                            {approve.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejecting(org._id)}
                            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <XCircle className="size-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {rejecting === org._id && (
                      <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                        <label className="text-xs font-medium text-ink">
                          Reason for rejection (shown to the org admin)
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          placeholder="e.g. No verifiable business presence"
                          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              if (rejectReason.trim()) {
                                reject.mutate({ id: org._id, reason: rejectReason.trim() })
                                setRejecting(null)
                                setRejectReason("")
                              }
                            }}
                            disabled={!rejectReason.trim() || reject.isPending}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {reject.isPending ? "Rejecting…" : "Confirm rejection"}
                          </button>
                          <button
                            onClick={() => setRejecting(null)}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Reveal>
          </>
        )}
      </div>
    </AppShell>
  )
}
