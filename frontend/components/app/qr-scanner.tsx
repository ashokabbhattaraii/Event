"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, X } from "lucide-react"

interface QrScannerProps {
  onScan: (decodedText: string) => void
  active: boolean
  onClose: () => void
}

// Camera-based check-in scanner for organizers, backed by html5-qrcode.
// Complements the manual paste-token input — either path calls the same
// /tickets/verify endpoint, so a broken camera never blocks check-in.
export function QrScanner({ onScan, active, onClose }: QrScannerProps) {
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).slice(2)}`)
  const scannerRef = useRef<any>(null)
  // Parents pass an inline handler that gets a new identity on every render
  // (e.g. when a verify mutation flips isPending), which used to tear down
  // and restart the camera after every scan attempt. Keep the latest
  // callback in a ref so the effect only reacts to `active` toggling.
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return
      const scanner = new Html5Qrcode(containerId.current)
      scannerRef.current = scanner

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            onScanRef.current(decodedText)
          },
          () => {
            // per-frame "no QR found" callback — expected constantly, ignore
          }
        )
        .catch(() => {
          setError("Couldn't access the camera. Check permissions, or use manual entry below.")
        })
    })

    return () => {
      cancelled = true
      const scanner = scannerRef.current
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
    }
  }, [active])

  if (!active) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Camera className="size-4 text-primary" /> Scan ticket QR
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
          aria-label="Close scanner"
        >
          <X className="size-4" />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-amber-600">{error}</p>
      ) : (
        <div id={containerId.current} className="mx-auto max-w-xs overflow-hidden rounded-xl" />
      )}
    </div>
  )
}
