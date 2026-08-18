"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Building2, Loader2, UserRound } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { useRegister } from "@/lib/queries/auth"
import { useOrganizations } from "@/lib/queries/organizations"
import { useOrgRegister } from "@/lib/queries/system"

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="auth-field">
      <label className="text-sm font-medium text-ink">{label}</label>
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </div>
  )
}

type RegisterMode = "attendee" | "organization"

export default function RegisterPage() {
  // Initial mode comes from the URL (?type=organization) — read in an effect,
  // not a state initializer, so the client render stays identical to the
  // server render (hydration-safe; same pattern as /admin/events).
  const [mode, setMode] = useState<RegisterMode>("attendee")

  // --- Attendee account ------------------------------------------------------
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [organizationId, setOrganizationId] = useState("")

  // --- Organization registration ---------------------------------------------
  const [form, setForm] = useState({
    orgName: "",
    orgPhone: "",
    orgAddress: "",
    orgCity: "",
    orgCountry: "",
    orgType: "Company",
    orgDescription: "",
    orgWebsite: "",
    adminName: "",
    // The org's business email IS the admin account's email — one address
    // for both, so applicants aren't asked for the same email twice.
    orgEmail: "",
  })
  const [adminPassword, setAdminPassword] = useState("")
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("")

  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type")
    if (type === "organization") setMode("organization")
  }, [])

  const registerMutation = useRegister()
  const orgRegister = useOrgRegister()
  const { data: orgData, isLoading: orgsLoading } = useOrganizations()
  const organizations = orgData?.organizations ?? []

  const setOrg = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  // Self-service registration is attendee-only. Admin/organizer roles are
  // privileged (event management, tenant administration) and are assigned by
  // an existing admin or via the ADMIN_EMAILS allowlist — the backend
  // rejects privileged roles from this form (authController.register).
  const handleAttendeeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    registerMutation.mutate({ name, email, password, role: "attendee", organizationId })
  }

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword !== adminConfirmPassword) return
    orgRegister.mutate({
      ...form,
      // Single email shared by the organization record and the admin account.
      adminEmail: form.orgEmail,
      adminName: form.adminName,
      adminPassword,
    })
  }

  const attendeeCanSubmit =
    !!name && !!email && !!password && password === confirmPassword && !!organizationId
  const orgCanSubmit =
    !!form.orgName &&
    !!form.adminName &&
    !!form.orgEmail &&
    !!adminPassword &&
    adminPassword === adminConfirmPassword

  const errorMessage = (m: { isError: boolean; error: unknown }) =>
    m.isError
      ? ((m as any).error?.response?.data?.message || "Something went wrong.")
      : null

  return (
    <AuthShell heading="Create your account" sub="Set up your EventNexus workspace in minutes.">
      {/* Account type selector: join as an attendee or register a whole
          organization. Both live on this page — no separate /org-register. */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("attendee")}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
            mode === "attendee" ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
          }`}
        >
          <UserRound className="size-4" /> Attendee
        </button>
        <button
          type="button"
          onClick={() => setMode("organization")}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
            mode === "organization"
              ? "bg-card text-ink shadow-sm"
              : "text-muted-foreground hover:text-ink"
          }`}
        >
          <Building2 className="size-4" /> Organization
        </button>
      </div>

      {mode === "attendee" ? (
        <form className="space-y-5" onSubmit={handleAttendeeSubmit}>
          {errorMessage(registerMutation) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage(registerMutation)}
            </div>
          )}

          {password && confirmPassword && password !== confirmPassword && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Passwords do not match.
            </div>
          )}

          <Field label="Full Name" placeholder="Anjali Mishra" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" placeholder="you@organization.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Field label="Confirm Password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          <div className="auth-field">
            <label className="text-sm font-medium text-ink">Organization</label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option value="">
                {orgsLoading ? "Loading organizations..." : "Select an organization"}
              </option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              You&apos;ll join as an attendee. Organizer and admin accounts are granted by your organization&apos;s
              admin.
            </p>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending || !attendeeCanSubmit}
            className="auth-field flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {registerMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Create Account
          </button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleOrgSubmit}>
          {orgRegister.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(orgRegister.error as any)?.response?.data?.message || "Registration failed."}
            </div>
          )}
          {orgRegister.isSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <h2 className="font-display text-lg font-bold text-ink">Application submitted</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-ink">{form.orgName}</span> is now pending review.
                A system admin will verify your details — you&apos;ll receive an email and can log in
                once your organization is approved.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Back to login
              </Link>
            </div>
          )}

          {!orgRegister.isSuccess && (
            <>
              <div className="auth-field flex items-center gap-2 pt-2">
                <Building2 className="size-4 text-primary" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Organization details
                </h2>
              </div>
              <Field label="Organization name" required placeholder="Yeti Adventures" value={form.orgName} onChange={setOrg("orgName")} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Business / admin email" type="email" placeholder="hello@company.com" value={form.orgEmail} onChange={setOrg("orgEmail")} />
                <Field label="Phone" placeholder="+977-1-5551234" value={form.orgPhone} onChange={setOrg("orgPhone")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Address" placeholder="Thamel 28" value={form.orgAddress} onChange={setOrg("orgAddress")} />
                <Field label="City" placeholder="Kathmandu" value={form.orgCity} onChange={setOrg("orgCity")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Country" placeholder="Nepal" value={form.orgCountry} onChange={setOrg("orgCountry")} />
                <Field label="Website" type="url" placeholder="https://company.com" value={form.orgWebsite} onChange={setOrg("orgWebsite")} />
              </div>
              <div className="auth-field">
                <label className="text-sm font-medium text-ink">Organization type</label>
                <select
                  value={form.orgType}
                  onChange={(e) => setForm((f) => ({ ...f, orgType: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                >
                  {["Company", "Non-Profit", "Educational", "Community", "Government", "Other"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <label className="text-sm font-medium text-ink">Description</label>
                <textarea
                  value={form.orgDescription}
                  onChange={(e) => setForm((f) => ({ ...f, orgDescription: e.target.value }))}
                  placeholder="What does your organization do?"
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="auth-field flex items-center gap-2 pt-4">
                <Building2 className="size-4 text-primary" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Organization admin account
                </h2>
              </div>
              <p className="auth-field -mt-2 text-xs text-muted-foreground">
                This account will manage your organization once it&apos;s approved. It uses the same
                email as your organization — other members are invited later with role-based access.
              </p>
              <Field label="Admin full name" required placeholder="Ramesh Lama" value={form.adminName} onChange={setOrg("adminName")} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Password" type="password" required placeholder="••••••••" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                <Field label="Confirm password" type="password" required placeholder="••••••••" value={adminConfirmPassword} onChange={(e) => setAdminConfirmPassword(e.target.value)} />
              </div>
              {adminPassword && adminConfirmPassword && adminPassword !== adminConfirmPassword && (
                <p className="auth-field text-xs text-amber-600">Passwords do not match.</p>
              )}

              <button
                type="submit"
                disabled={orgRegister.isPending || !orgCanSubmit}
                className="auth-field flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {orgRegister.isPending && <Loader2 className="size-4 animate-spin" />}
                Submit for approval
              </button>
            </>
          )}
        </form>
      )}

      <p className="auth-field text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log In
        </Link>
      </p>
    </AuthShell>
  )
}