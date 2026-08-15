"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, ShieldCheck, Loader2, Navigation, X, MapPin } from "lucide-react"
import { GoogleLogin } from "@react-oauth/google"
import { AuthShell } from "@/components/auth/auth-shell"
import { useLogin, useGoogleLogin } from "@/lib/queries/auth"
import { captureAndSaveLocation } from "@/lib/api/location"

const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

function detectRole(email: string) {
  if (!email.includes("@")) return null
  if (email.startsWith("admin")) return { label: "Admin", color: "bg-primary/12 text-primary" }
  if (email.startsWith("organizer") || email.startsWith("org"))
    return { label: "Organizer", color: "bg-secondary/15 text-secondary" }
  return { label: "Attendee", color: "bg-flame/12 text-flame" }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [locationStatus, setLocationStatus] = useState<"idle" | "saving" | "saved" | "skipped" | "error">("idle")
  const role = detectRole(email)

  const loginMutation = useLogin()
  const googleMutation = useGoogleLogin()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          setShowLocationPrompt(true)
        },
      }
    )
  }

  const handleGoogleSuccess = (credential: string) => {
    googleMutation.mutate(credential, {
      onSuccess: () => {
        setShowLocationPrompt(true)
      },
    })
  }

  const handleEnableLocation = async () => {
    setLocationStatus("saving")
    const loc = await captureAndSaveLocation()
    if (loc) {
      setLocationStatus("saved")
    } else {
      setLocationStatus("error")
    }
    setTimeout(() => {
      setShowLocationPrompt(false)
      setLocationStatus("idle")
    }, 1500)
  }

  const handleSkipLocation = () => {
    setLocationStatus("skipped")
    setTimeout(() => {
      setShowLocationPrompt(false)
      setLocationStatus("idle")
    }, 500)
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
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

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
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </AuthShell>

      {showLocationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <MapPin className="size-5 text-primary" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Enable location</h3>
                  <p className="text-xs text-muted-foreground">Enhance your event experience</p>
                </div>
              </div>
              <button
                onClick={handleSkipLocation}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Share your location to discover events near you, get distance-based recommendations, and find relevant AI-matches in your area.
            </p>

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>Get personalized event recommendations based on proximity</span>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>See distance to venues and check travel time</span>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>You can always update or remove your location in Settings</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSkipLocation}
                disabled={locationStatus === "saving"}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-muted disabled:opacity-50"
              >
                Skip
              </button>
              <button
                onClick={handleEnableLocation}
                disabled={locationStatus === "saving"}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {locationStatus === "saving" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : locationStatus === "saved" ? (
                  <>
                    <MapPin className="size-4" /> Saved
                  </>
                ) : (
                  <>
                    <Navigation className="size-4" /> Share location
                  </>
                )}
              </button>
            </div>

            {locationStatus === "error" && (
              <p className="mt-3 text-xs text-amber-600">
                Could not access location. Check your browser permissions or try again from Settings later.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
