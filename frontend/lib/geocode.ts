// Venue → coordinates, via OpenStreetMap's Nominatim.
//
// Chosen because it needs no API key or billing account (the app already
// embeds OSM for the venue map, so there's no new dependency or vendor), and
// because coordinates are what make several existing features actually work:
//
//   · "new event near you" alerts — the 2dsphere proximity query silently
//     matches nothing when an event has no geo point, so an event created
//     without coordinates reaches nobody.
//   · distance ranking in recommendations and the chatbot's "near me".
//   · the venue map on the event page.
//
// Everything here is best-effort: geocoding is never allowed to block
// creating an event, since plenty of real venues ("Our office, 3rd floor")
// aren't in any gazetteer.

export type GeocodeHit = {
  lat: number
  lng: number
  label: string
}

// Nominatim's usage policy asks for a descriptive referrer and light use.
// Callers debounce; this is only ever hit on an explicit user action.
const ENDPOINT = "https://nominatim.openstreetmap.org/search"

export async function geocodeVenue(query: string, signal?: AbortSignal): Promise<GeocodeHit[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const url = `${ENDPOINT}?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`)

  const rows = (await res.json()) as Array<{
    lat: string
    lon: string
    display_name: string
  }>

  return rows
    .map((r) => ({
      lat: Number(r.lat),
      lng: Number(r.lon),
      label: r.display_name,
    }))
    // Guard against a malformed row poisoning the event with NaN coordinates,
    // which would produce an invalid GeoJSON point server-side.
    .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng))
}
