"use client"

import { useEffect, useState } from "react"
import { MapPin, X, Loader2, Check } from "lucide-react"
import { useCurrentUser } from "@/lib/queries/auth"
import { captureAndSaveLocation, getGeolocationPermission } from "@/lib/api/location"
import { useQueryClient } from "@tanstack/react-query"
import { authKeys } from "@/lib/queries/auth"

// Per-account dismissal. Namespaced by user id so one person declining on a
// shared browser doesn't suppress the prompt for the next account, and so
// signing back in doesn't nag someone who already said no.
const dismissKey = (userId: string) => `eventnexus-location-dismissed:${userId}`

// Asks for location ONCE, at a moment when asking can actually succeed.
//
// This replaces a prompt that lived on the login page. Two things made that
// one impossible to use:
//
//   1. useAuthSuccess navigates on login, unmounting the login page — the
//      dialog was destroyed in the same tick it appeared.
//   2. useAuthSuccess also called getCurrentPosition() immediately before
//      that navigation, and a browser dismisses a pending permission prompt
//      when the page navigates. So the native popup flashed and vanished too,
//      every login, and permission could never be granted.
//
// Rendered from AppShell instead, which is mounted on every signed-in page
// and survives the post-login redirect. It never auto-closes: it stays until
// the user explicitly enables or dismisses it.
export function LocationPrompt() {
  const queryClient = useQueryClient()
  const { data } = useCurrentUser()
  const user = data?.user
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  useEffect(() => {
    if (!user?._id) return
    let cancelled = false

    const decide = async () => {
      // Already saved a location → nothing to ask for.
      if (user.location?.lat != null) return
      // Already dismissed on this account → respect it.
      if (localStorage.getItem(dismissKey(user._id))) return

      const permission = await getGeolocationPermission()
      if (cancelled) return

      // Permission already granted: read it silently, no dialog. This is the
      // case that previously still showed a prompt on every login.
      if (permission === "granted") {
        const loc = await captureAndSaveLocation()
        if (loc && !cancelled) {
          queryClient.invalidateQueries({ queryKey: authKeys.me })
          queryClient.invalidateQueries({ queryKey: ["recommendations"] })
        }
        return
      }
      // Explicitly denied: the browser suppresses repeat prompts anyway, so
      // showing our dialog would just be a dead end.
      if (permission === "denied") return

      setOpen(true)
    }

    decide()
    return () => {
      cancelled = true
    }
  }, [user?._id, user?.location?.lat, queryClient])

  const dismiss = () => {
    if (user?._id) localStorage.setItem(dismissKey(user._id), "1")
    setOpen(false)
  }

  const enable = async () => {
    setStatus("saving")
    // Called from a real click, so the browser treats it as a user gesture
    // and the native prompt stays up until answered.
    const loc = await captureAndSaveLocation()
    if (loc) {
      setStatus("saved")
      queryClient.invalidateQueries({ queryKey: authKeys.me })
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      // Brief confirmation, then close. This is the ONLY auto-close, and it
      // only ever follows a successful action the user asked for.
      setTimeout(() => setOpen(false), 1200)
    } else {
      setStatus("error")
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[min(360px,calc(100vw-3rem))] rounded-2xl border border-border bg-card p-5 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <MapPin className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-ink">Find events near you</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Share your location to sort events by distance, get better recommendations, and be
            alerted when something is published nearby. You can turn this off any time in Settings.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Not now"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      {status === "error" && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Couldn&apos;t read your location. If you blocked it, re-enable location for this site in
          your browser&apos;s address-bar settings.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={enable}
          disabled={status === "saving" || status === "saved"}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "saving" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : status === "saved" ? (
            <Check className="size-3.5" />
          ) : (
            <MapPin className="size-3.5" />
          )}
          {status === "saved" ? "Location saved" : status === "error" ? "Try again" : "Enable location"}
        </button>
        <button
          onClick={dismiss}
          className="rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
