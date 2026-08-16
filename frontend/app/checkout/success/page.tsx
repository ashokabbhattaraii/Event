"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, CreditCard, Loader2, Ticket, XCircle } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCheckoutStatus, useCreateCheckoutSession, usePaymentConfig } from "@/lib/queries/payments"
import { useCurrentUser } from "@/lib/queries/auth"

// Offered after any eSewa failure/cancel (never after a confirmed success) —
// lets the attendee retry the same event with a card instead of bouncing
// back to find the event page again. Hidden when Stripe itself isn't
// configured on this server, matching the disabled state on the event page.
function RetryWithStripe({ eventId }: { eventId: string }) {
  const { data: paymentConfig } = usePaymentConfig()
  const checkoutMutation = useCreateCheckoutSession()

  if (paymentConfig?.enabled === false) return null

  const handleRetry = () => {
    checkoutMutation.mutate(eventId, {
      onSuccess: (res) => {
        window.location.href = res.url
      },
    })
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      <p className="text-sm text-muted-foreground">eSewa not working? Pay with a card instead.</p>
      <button
        onClick={handleRetry}
        disabled={checkoutMutation.isPending}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-ink hover:bg-muted disabled:opacity-60"
      >
        {checkoutMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CreditCard className="size-4" />
        )}
        Pay with card
      </button>
      {checkoutMutation.isError && (
        <p className="mt-2 text-xs text-destructive">
          {(checkoutMutation.error as any)?.response?.data?.message || "Couldn't start card checkout."}
        </p>
      )}
    </div>
  )
}

// eSewa's redirect already carries a confirmed outcome — by the time the
// browser lands here the backend has verified the payment signature *and*
// done a server-to-server status check, and only issues `ticketId` once the
// ticket actually exists (see paymentController.handleEsewaSuccess). So
// there's nothing to poll for eSewa, unlike Stripe where the webhook can
// lag a beat behind the redirect.
function EsewaResult({
  ticketId,
  error,
  eventId,
}: {
  ticketId: string | null
  error: string | null
  eventId: string | null
}) {
  if (ticketId) {
    return (
      <>
        <CheckCircle2 className="mx-auto size-10 text-secondary" />
        <h1 className="font-display mt-4 text-xl font-bold text-ink">Payment successful!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paid via eSewa — your ticket is ready in My Tickets, QR code included.
        </p>
        <Link
          href="/my-tickets"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          <Ticket className="size-4" /> View my ticket
        </Link>
      </>
    )
  }

  const reasons: Record<string, string> = {
    cancelled: "The eSewa payment was cancelled.",
    signature: "eSewa's response couldn't be verified.",
    not_complete: "eSewa reported the payment as incomplete.",
    unconfirmed: "eSewa couldn't confirm the payment status.",
  }

  return (
    <>
      <XCircle className="mx-auto size-10 text-destructive" />
      <h1 className="font-display mt-4 text-xl font-bold text-ink">Payment not completed</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {reasons[error || ""] || "Something went wrong with the eSewa payment. No charge should have gone through."}
      </p>
      <Link
        href="/my-tickets"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-ink hover:bg-muted"
      >
        Go to My Tickets
      </Link>
      {eventId && <RetryWithStripe eventId={eventId} />}
    </>
  )
}

function StripeResult({ sessionId }: { sessionId: string | null }) {
  const { data, isLoading, isError } = useCheckoutStatus(sessionId)

  if (isLoading) {
    return (
      <>
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <h1 className="font-display mt-4 text-xl font-bold text-ink">Confirming your payment…</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This usually takes a few seconds while we issue your ticket.
        </p>
      </>
    )
  }

  if (!isError && data?.paid) {
    // Stripe webhooks can lag a beat behind the redirect — the query above
    // polls until the ticket exists, so only claim it's ready when it is.
    if (!data.ticket) {
      return (
        <>
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <h1 className="font-display mt-4 text-xl font-bold text-ink">Payment confirmed — issuing your ticket…</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your payment went through. We&apos;re generating your QR ticket — this usually takes a few seconds.
          </p>
        </>
      )
    }
    return (
      <>
        <CheckCircle2 className="mx-auto size-10 text-secondary" />
        <h1 className="font-display mt-4 text-xl font-bold text-ink">Payment successful!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your ticket is ready. It&apos;s waiting for you in My Tickets, QR code included.
        </p>
        <Link
          href="/my-tickets"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          <Ticket className="size-4" /> View my ticket
        </Link>
      </>
    )
  }

  return (
    <>
      <XCircle className="mx-auto size-10 text-destructive" />
      <h1 className="font-display mt-4 text-xl font-bold text-ink">Couldn&apos;t confirm payment</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        If you completed checkout, your ticket may still be arriving — check My Tickets shortly, or contact
        support if it doesn&apos;t appear.
      </p>
      <Link
        href="/my-tickets"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-ink hover:bg-muted"
      >
        Go to My Tickets
      </Link>
    </>
  )
}

function CheckoutSuccessContent() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const params = useSearchParams()
  const provider = params.get("provider")
  const sessionId = params.get("session_id")
  const ticketId = params.get("ticketId")
  const error = params.get("error")
  const eventId = params.get("eventId")

  return (
    <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Payment">
      <div className="mx-auto max-w-md py-12">
        <Reveal className="rounded-2xl border border-border bg-card p-8 text-center">
          {provider === "esewa" ? (
            <EsewaResult ticketId={ticketId} error={error} eventId={eventId} />
          ) : (
            <StripeResult sessionId={sessionId} />
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
