"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, CheckCircle2, Loader2 } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { useOrgRegister } from "@/lib/queries/system"

function Field({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="auth-field">
      <label className="text-sm font-medium text-ink">
        {label} {required && <span className="text-flame">*</span>}
      </label>
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </div>
  )
}

export default function OrgRegisterPage() {
  const [form, setForm] = useState({
    orgName: "",
    orgEmail: "",
    orgPhone: "",
    orgAddress: "",
    orgCity: "",
    orgCountry: "",
    orgType: "Company",
    orgDescription: "",
    orgWebsite: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  })
  const [confirmPassword, setConfirmPassword] = useState("")
  const register = useOrgRegister()

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const canSubmit =
    !!form.orgName &&
    !!form.adminName &&
    !!form.adminEmail &&
    !!form.adminPassword &&
    form.adminPassword === confirmPassword

  return (
    <AuthShell
      heading="Register your organization"
      sub="Tell us about your company — a system admin will verify and approve your workspace."
    >
      {register.isSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-6 text-emerald-600" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">Application submitted</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-ink">{form.orgName}</span> is now pending review.
            A system admin will verify your details — you&apos;ll receive an email and can log in
            once your organization is approved.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) register.mutate(form)
          }}
        >
          {register.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(register.error as any)?.response?.data?.message || "Registration failed."}
            </div>
          )}

          <div className="auth-field flex items-center gap-2 pt-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Organization details
            </h2>
          </div>
          <Field label="Organization name" required placeholder="Yeti Adventures" value={form.orgName} onChange={set("orgName")} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business email" type="email" placeholder="hello@company.com" value={form.orgEmail} onChange={set("orgEmail")} />
            <Field label="Phone" placeholder="+977-1-5551234" value={form.orgPhone} onChange={set("orgPhone")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Address" placeholder="Thamel 28" value={form.orgAddress} onChange={set("orgAddress")} />
            <Field label="City" placeholder="Kathmandu" value={form.orgCity} onChange={set("orgCity")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Country" placeholder="Nepal" value={form.orgCountry} onChange={set("orgCountry")} />
            <Field label="Website" type="url" placeholder="https://company.com" value={form.orgWebsite} onChange={set("orgWebsite")} />
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
            This account will manage your organization once it&apos;s approved. Other members are
            invited later with role-based access.
          </p>
          <Field label="Admin full name" required placeholder="Ramesh Lama" value={form.adminName} onChange={set("adminName")} />
          <Field label="Admin email" type="email" required placeholder="ramesh@company.com" value={form.adminEmail} onChange={set("adminEmail")} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Password" type="password" required placeholder="••••••••" value={form.adminPassword} onChange={set("adminPassword")} />
            <Field label="Confirm password" type="password" required placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {form.adminPassword && confirmPassword && form.adminPassword !== confirmPassword && (
            <p className="auth-field text-xs text-amber-600">Passwords do not match.</p>
          )}

          <button
            type="submit"
            disabled={register.isPending || !canSubmit}
            className="auth-field flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {register.isPending && <Loader2 className="size-4 animate-spin" />}
            Submit for approval
          </button>

          <p className="auth-field text-center text-sm text-muted-foreground">
            Joining an existing organization?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Create an attendee account
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
