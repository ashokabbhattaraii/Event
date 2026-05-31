"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"

const stepsMeta = ["Account Info", "Organization", "Verification"]
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
  const [role, setRole] = useState("organizer")

  return (
    <AuthShell heading="Create your account" sub="Set up your EventNexus workspace in minutes.">
      {/* Progress breadcrumb */}
      <div className="auth-field mb-8 flex items-center">
        {stepsMeta.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i === 0 ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-xs font-medium ${i === 0 ? "text-ink" : "text-muted-foreground"}`}>
                {s}
              </span>
            </div>
            {i < stepsMeta.length - 1 && <span className="mx-3 h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Field label="Full Name" placeholder="Anjali Mishra" />
        <Field label="Email" type="email" placeholder="you@organization.com" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Password" type="password" placeholder="••••••••" />
          <Field label="Confirm Password" type="password" placeholder="••••••••" />
        </div>
        <Field label="Organization Name" placeholder="Asia Pacific University" />

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

        <Link
          href="/admin"
          className="auth-field flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5"
        >
          Create Account
        </Link>

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
