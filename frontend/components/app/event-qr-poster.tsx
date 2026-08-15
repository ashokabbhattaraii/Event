"use client"

import { useRef, useState } from "react"
import { Check, Copy, Download, ExternalLink, QrCode as QrCodeIcon } from "lucide-react"
import { QrCodeCanvas } from "@/components/app/qr-code"

// A separate QR from the ticket QR: this one just encodes the public,
// no-login-required event page URL — scan it from a poster/flyer and land
// straight on the event details page, where the visitor can register (if
// signed out or not yet joined) or see their ticket (if already registered).
export function EventQrPoster({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/event/${eventId}` : ""

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `${eventTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "event"}-qr.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <QrCodeIcon className="size-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-ink">Public event QR</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Put this on a poster, flyer, or slide. Scanning it opens this event&rsquo;s public page for &ldquo;{eventTitle}&rdquo;
        — visitors can register right away, and anyone already signed in and registered sees their ticket instead.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <QrCodeCanvas ref={canvasRef} seed={publicUrl} size={140} />
        <div className="flex-1 space-y-2">
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground break-all">
            {publicUrl}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted"
            >
              {copied ? <Check className="size-3.5 text-secondary" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted"
            >
              <Download className="size-3.5" /> Download QR
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-3.5" /> Preview public page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
