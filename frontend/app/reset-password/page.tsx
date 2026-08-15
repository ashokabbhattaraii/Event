"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { useResetPassword } from "@/lib/queries/auth"

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [clientError, setClientError] = useState("")
  const reset = useResetPassword()
  const done = reset.isSuccess

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setClientError("")
    if (password.length < 6) {
      setClientError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirm) {
      setClientError("Passwords do not match.")
      return
    }
    reset.mutate({ token, password })
  }

  return (
    <AuthShell heading="Set a new password" sub="Choose a strong password for your account.">      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100">
            <ShieldCheck className="size-6 text-emerald-600" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">Password updated</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your password has been changed and all other sessions have been signed out.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Log in
          </Link>
        </div>
      ) : !token ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="font-display text-lg font-bold text-ink">Link is missing</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This page needs a reset token. Use the link from your reset email, or request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          {(clientError || reset.isError) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {clientError ||
                (reset.error as any)?.response?.data?.message ||
                "Could not reset the password. The link may have expired — request a new one."}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              New password
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-11 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirm" className="text-sm font-medium text-ink">
              Confirm new password
            </label>
            <input
              id="confirm"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <button
            type="submit"
            disabled={reset.isPending}
            className="auth-field flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {reset.isPending && <Loader2 className="size-4 animate-spin" />}
            Reset password
          </button>

          <p className="auth-field text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
