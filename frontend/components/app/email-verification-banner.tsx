"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck, ShieldAlert } from "lucide-react"
import { useCurrentUser, useResendVerification } from "@/lib/queries/auth"

// Dismissible banner shown while the logged-in user's email is unverified.
// Hidden once verified (server flags it on /auth/me).
export function EmailVerificationBanner() {
  const { data } = useCurrentUser()
  const resend = useResendVerification()
  const [dismissed, setDismissed] = useState(false)

  const user = data?.user
  if (!user || user.emailVerified || dismissed) return null

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm text-amber-800">
      <ShieldAlert className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 truncate">
        Your email isn&apos;t verified yet.{" "}
        <Link href="/verify-email" className="font-semibold underline underline-offset-2">
          Verify now
        </Link>
      </p>
      {resend.isPending ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : resend.isSuccess ? (
        <span className="flex shrink-0 items-center gap-1 font-semibold text-emerald-700">
          <MailCheck className="size-4" /> Sent
        </span>
      ) : (
        <button
          onClick={() => resend.mutate()}
          className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-900"
        >
          Resend email
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto shrink-0 rounded p-0.5 text-amber-600 transition-colors hover:text-amber-900"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
