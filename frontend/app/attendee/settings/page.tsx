"use client"

import { useState } from "react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import { useSaveLocationCoords } from "@/lib/queries/location"
import { captureAndSaveLocation, getBrowserLocation } from "@/lib/api/location"
import {
  MapPin,
  Navigation,
  Loader2,
  Check,
  Trash2,
  Globe,
  Save,
  AlertCircle,
} from "lucide-react"

export default function AttendeeSettingsPage() {
  const { data: userData, refetch: refetchUser } = useCurrentUser()
  const saveCoords = useSaveLocationCoords()
  const user = userData?.user

  const [manualLat, setManualLat] = useState(user?.location?.lat?.toString() || "")
  const [manualLng, setManualLng] = useState(user?.location?.lng?.toString() || "")
  const [manualCity, setManualCity] = useState(user?.location?.city || "")
  const [isDetecting, setIsDetecting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [detectError, setDetectError] = useState("")

  const hasLocation = user?.location?.lat != null

  const handleDetectLocation = async () => {
    setIsDetecting(true)
    setDetectError("")
    try {
      const coords = await getBrowserLocation()
      if (coords) {
        setManualLat(coords.lat.toString())
        setManualLng(coords.lng.toString())
        await captureAndSaveLocation()
        await refetchUser()
      } else {
        setDetectError("Location permission denied or unavailable. Check your browser settings.")
      }
    } catch {
      setDetectError("Could not detect your location. Try again.")
    } finally {
      setIsDetecting(false)
    }
  }

  const handleSave = async () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setSaveStatus("error")
      return
    }
    setSaveStatus("saving")
    saveCoords.mutate(
      { lat, lng, city: manualCity || undefined },
      {
        onSuccess: () => {
          setSaveStatus("saved")
          refetchUser()
          setTimeout(() => setSaveStatus("idle"), 2000)
        },
        onError: () => {
          setSaveStatus("error")
        },
      }
    )
  }

  const handleRemoveLocation = async () => {
    setManualLat("")
    setManualLng("")
    setManualCity("")
    saveCoords.mutate(
      { lat: 0, lng: 0, city: "" },
      {
        onSuccess: () => {
          refetchUser()
        },
      }
    )
  }

  return (
    <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Settings">
      <div className="mx-auto max-w-2xl space-y-8">
        <Reveal y={16}>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your profile, location, and preferences.</p>
          </div>
        </Reveal>

        <Reveal y={16}>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Globe className="size-5 text-primary" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-ink">Location</h2>
                <p className="text-xs text-muted-foreground">
                  Your location powers distance-based event recommendations and AI matching.
                </p>
              </div>
            </div>

            {hasLocation && (
              <div className="mt-5 rounded-xl bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-primary" />
                  <span className="font-medium text-ink">
                    {user.location?.city || `${user.location?.lat?.toFixed(4)}, ${user.location?.lng?.toFixed(4)}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · Updated{" "}
                    {user.location?.updatedAt
                      ? new Date(user.location.updatedAt).toLocaleDateString()
                      : "recently"}
                  </span>
                </div>
              </div>
            )}

            {!hasLocation && (
              <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-3">
                <div className="flex items-start gap-2 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>No location set. Enable location access for personalized recommendations.</span>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <button
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
              >
                {isDetecting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Navigation className="size-4" />
                )}
                {isDetecting ? "Detecting..." : "Auto-detect my location"}
              </button>

              {detectError && (
                <p className="text-xs text-amber-600">{detectError}</p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="-90 to 90"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="-180 to 180"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink">City (optional)</label>
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving" || !manualLat || !manualLng}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {saveStatus === "saving" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : saveStatus === "saved" ? (
                    <>
                      <Check className="size-4" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="size-4" /> Save location
                    </>
                  )}
                </button>

                {hasLocation && (
                  <button
                    onClick={handleRemoveLocation}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
                  >
                    <Trash2 className="size-4" /> Remove
                  </button>
                )}
              </div>

              {saveStatus === "error" && (
                <p className="text-xs text-amber-600">
                  Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.
                </p>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal y={16}>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <span className="font-display text-sm font-bold text-ink">
                  {user?.name?.split(" ").map((n) => n[0]).join("") || "?"}
                </span>
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-ink">Profile</h2>
                <p className="text-xs text-muted-foreground">Your account information</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="text-sm font-semibold text-ink">{user?.name || "—"}</div>
              </div>
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm font-semibold text-ink">{user?.email || "—"}</div>
              </div>
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="text-sm font-semibold text-ink capitalize">{user?.role || "—"}</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </AppShell>
  )
}
