"use client"

import { QRCodeSVG } from "qrcode.react"

// Real, camera-scannable QR code encoding the signed ticket token (the same
// qrToken the backend's /tickets/verify endpoint checks). Previously this
// rendered a decorative fake pixel-noise SVG that looked like a QR code but
// couldn't actually be scanned by anything.
export function QrCode({ seed, size = 84 }: { seed: string; size?: number }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <QRCodeSVG value={seed} size={size} level="M" includeMargin={false} />
    </div>
  )
}
