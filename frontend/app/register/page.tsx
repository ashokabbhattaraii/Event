"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { useRegister } from "@/lib/queries/auth"
import { useOrganizations } from "@/lib/queries/organizations"

const roles = [
  { id: "admin", label: "Admin" },
  { id: "organizer", label: "Organizer" },
  { id: "attendee", label: "Attendee" },
]

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

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [organizationId, setOrganizationId] = useState("")
  const [role, setRole] = useState("organizer")

  const registerMutation = useRegister()
  const { data: orgData, isLoading: orgsLoading } = useOrganizations()
  const organizations = orgData?.organizations ?? []

  const isAdmin = role === "admin"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    registerMutation.mutate({
      name,
      email,
      password,
      role,
      ...(isAdmin ? { organizationName } : { organizationId }),
    })
  }

  const canSubmit =
    !!name &&
    !!email &&
    !!password &&
    password === confirmPassword &&
    (isAdmin ? !!organizationName : !!organizationId)

  return (
    <AuthShell heading="Create your account" sub="Set up your EventNexus workspace in minutes.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {registerMutation.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(registerMutation.error as any)?.response?.data?.message || "Registration failed."}
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
          <label className="text-sm font-medium text-ink">Role</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2 rounded-xl bg-muted p-1">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  role === r.id
                    ? "bg-card text-ink shadow-sm"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {isAdmin ? (
          <Field
            label="Organization Name"
            placeholder="Asia Pacific University"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        ) : (
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
          </div>
        )}

        <button
          type="submit"
          disabled={registerMutation.isPending || !canSubmit}
          className="auth-field flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {registerMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          Create Account
        </button>

        <p className="auth-field text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log In
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
