"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, Ticket } from "lucide-react"
import { GoogleLogin } from "@react-oauth/google"
import { AuthShell } from "@/components/auth/auth-shell"
import { useLogin, useGoogleLogin } from "@/lib/queries/auth"
import { useEvent } from "@/lib/queries/events"
import { sanitizeEventRedirect } from "@/lib/event-redirect"

const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

// Reads ?redirect=/event/<id> — set when the visitor arrived from
// PublicEventLanding's Join button (a signed-out QR/link scan) — and shows
// which event they're about to be sent back to, so "Log In" doesn't feel
// like a detour away from what they actually came here to do.
function JoiningEventBanner({ eventId }: { eventId: string }) {
  const { data, isLoading } = useEvent(eventId)
  const event = data?.event
  if (isLoading || !event) return null
  return (
    <div className="auth-field flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-ink">
      <Ticket className="size-4 shrink-0 text-primary" />
      <span>
        Log in to join <span className="font-semibold">{event.title}</span>
      </span>
    </div>
  )
}

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)

  const redirectTo = sanitizeEventRedirect(useSearchParams().get("redirect"))
  const eventIdFromRedirect = redirectTo?.split("/event/")[1]
  const registerHref = redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"

  const loginMutation = useLogin(redirectTo)
  const googleMutation = useGoogleLogin(redirectTo)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    loginMutation.mutate({ email, password })
  }

  const handleGoogleSuccess = (credential: string) => {
    googleMutation.mutate(credential)
  }

  const errorMessage =
    (loginMutation.isError || googleMutation.isError) &&
    ((loginMutation.error as any)?.response?.data?.message ||
      (googleMutation.error as any)?.response?.data?.message ||
      "Login failed. Please try again.")

  return (
    <>
      <AuthShell heading="Welcome back" sub="Log in to your EventNexus workspace.">
        <form className="space-y-5" onSubmit={handleLogin}>
          {eventIdFromRedirect && <JoiningEventBanner eventId={eventIdFromRedirect} />}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.com"
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="auth-field">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="auth-field flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loginMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Log In
          </button>

          <div className="auth-field flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with
            <span className="h-px flex-1 bg-border" />
          </div>

          {googleEnabled ? (
            <div className="auth-field flex w-full justify-center">
              <GoogleLogin
                onSuccess={(cred) => {
                  if (cred.credential) handleGoogleSuccess(cred.credential)
                }}
                onError={() => {}}
                width="320"
                text="continue_with"
                shape="pill"
              />
            </div>
          ) : (
            <p className="auth-field text-center text-xs text-muted-foreground">
              Google sign-in is not configured.
            </p>
          )}

          <p className="auth-field text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href={registerHref} className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </AuthShell>
    </>
  )
}

export default function LoginPage() {
  // useSearchParams() requires a Suspense boundary in the App Router — the
  // surrounding shell renders instantly while the search params resolve.
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
