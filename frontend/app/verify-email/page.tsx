"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { BadgeCheck, Loader2, MailX } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { useVerifyEmail } from "@/lib/queries/auth"

function VerifyEmailForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""
  const verify = useVerifyEmail()
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!token || started) return
    setStarted(true)
    verify.mutate(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const failed = verify.isError

  return (
    <AuthShell heading="Email verification" sub="Confirm your address to activate your account.">
      {verify.isPending && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Verifying your email…</p>
        </div>
      )}

      {verify.isSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100">
            <BadgeCheck className="size-6 text-emerald-600" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">Email verified!</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your account is fully activated. You can now log in and start using EventNexus.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Log in
          </button>
        </div>
      )}

      {failed && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100">
            <MailX className="size-6 text-red-600" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">Link invalid or expired</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Verification links expire after 24 hours. Log in and request a fresh one — you'll find
            the option on your dashboard.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Go to login
          </Link>
        </div>
      )}
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  )
}
