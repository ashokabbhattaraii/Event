import { MapPin, Navigation } from "lucide-react"

// No API key required: OpenStreetMap's embeddable iframe for the preview,
// Google Maps for turn-by-turn directions (opens in a new tab).
export function VenueMap({
  lat,
  lng,
  venue,
}: {
  lat: number
  lng: number
  venue: string
}) {
  const delta = 0.01
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`
  const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 p-4 pb-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MapPin className="size-4 text-primary" /> {venue}
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted"
        >
          <Navigation className="size-3.5" /> Directions
        </a>
      </div>
      <div className="mt-3 h-56 w-full">
        <iframe
          title={`Map showing ${venue}`}
          src={osmSrc}
          className="size-full border-0"
          loading="lazy"
        />
      </div>
    </div>
  )
}
