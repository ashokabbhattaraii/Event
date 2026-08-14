"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, Ticket, XCircle } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCheckoutStatus } from "@/lib/queries/payments"
import { useCurrentUser } from "@/lib/queries/auth"

function CheckoutSuccessContent() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const sessionId = useSearchParams().get("session_id")
  const { data, isLoading, isError } = useCheckoutStatus(sessionId)

  return (
    <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Payment">
      <div className="mx-auto max-w-md py-12">
        <Reveal className="rounded-2xl border border-border bg-card p-8 text-center">
          {isLoading && (
            <>
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <h1 className="font-display mt-4 text-xl font-bold text-ink">Confirming your payment…</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This usually takes a few seconds while we issue your ticket.
              </p>
            </>
          )}

          {!isLoading && !isError && data?.paid && (
            <>
              <CheckCircle2 className="mx-auto size-10 text-secondary" />
              <h1 className="font-display mt-4 text-xl font-bold text-ink">Payment successful!</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your ticket is ready. It&apos;s waiting for you in My Tickets, QR code included.
              </p>
              <Link
                href="/attendee/tickets"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                <Ticket className="size-4" /> View my ticket
              </Link>
            </>
          )}

          {!isLoading && (isError || !data?.paid) && (
            <>
              <XCircle className="mx-auto size-10 text-destructive" />
              <h1 className="font-display mt-4 text-xl font-bold text-ink">Couldn&apos;t confirm payment</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                If you completed checkout, your ticket may still be arriving — check My Tickets shortly, or contact
                support if it doesn&apos;t appear.
              </p>
              <Link
                href="/attendee/tickets"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-ink hover:bg-muted"
              >
                Go to My Tickets
              </Link>
            </>
          )}
        </Reveal>
      </div>
    </AppShell>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
