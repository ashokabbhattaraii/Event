"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"

function detectRole(email: string) {
  if (!email.includes("@")) return null
  if (email.startsWith("admin")) return { label: "Admin", color: "bg-primary/12 text-primary" }
  if (email.startsWith("organizer") || email.startsWith("org"))
    return { label: "Organizer", color: "bg-secondary/15 text-secondary" }
  return { label: "Attendee", color: "bg-flame/12 text-flame" }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [show, setShow] = useState(false)
  const role = detectRole(email)

  return (
    <AuthShell heading="Welcome back" sub="Log in to your EventNexus workspace.">
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="auth-field">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.com"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            {role && (
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${role.color}`}
              >
                <ShieldCheck className="size-3.5" />
                {role.label}
              </span>
            )}
          </div>
        </div>

        <div className="auth-field">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <Link href="#" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={show ? "text" : "password"}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-11 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-ink"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Link
          href="/admin"
          className="auth-field flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5"
        >
          Log In
        </Link>

        <div className="auth-field flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or continue with
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          className="auth-field flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-muted"
        >
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75Z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="auth-field text-center text-sm text-muted-foreground">
          {"Don't have an account? "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
