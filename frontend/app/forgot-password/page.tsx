"use client"

import { useState } from "react"
import Link from "next/link"
import { KeyRound, Loader2, MailCheck } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { useForgotPassword } from "@/lib/queries/auth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const forgot = useForgotPassword()
  const sent = forgot.isSuccess

  return (
    <AuthShell heading="Reset your password" sub="We'll email you a secure link to set a new one.">
      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100">
            <MailCheck className="size-6 text-emerald-600" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">Check your inbox</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If an account exists for <span className="font-semibold text-ink">{email}</span>, a
            password reset link is on its way. It expires in 24 hours.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (email) forgot.mutate(email)
          }}
        >
          {forgot.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(forgot.error as any)?.response?.data?.message || "Something went wrong. Try again."}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <KeyRound className="size-4" />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.com"
                className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={forgot.isPending}
            className="auth-field flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {forgot.isPending && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </button>

          <p className="auth-field text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
