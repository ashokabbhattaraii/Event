// Shared scheduling bounds for event dates, mirrored on the backend
// (eventController.js: MAX_FUTURE_EVENT_MS) so the UI never lets an
// organizer pick a date the API would reject.

export const MAX_FUTURE_EVENT_YEARS = 2;

export function maxFutureEventDate(): Date {
  return new Date(Date.now() + MAX_FUTURE_EVENT_YEARS * 365 * 24 * 60 * 60 * 1000);
}

// datetime-local <input> values are "YYYY-MM-DDTHH:mm" without a timezone
// suffix — building them fresh avoids timezone rounding corrupting values
// round-tripped into the picker.
export function toDatetimeLocal(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Client-side verdict for a proposed event datetime. Returns an error
// message string when the value is unusable, or null when it's fine.
export function eventDateError(value: string): string | null {
  if (!value) return "Pick a date and time"
  const date = new Date(value)
  if (isNaN(date.getTime())) return "That doesn't look like a valid date"
  if (date <= new Date()) return "Event date must be in the future"
  if (date.getTime() > maxFutureEventDate().getTime()) {
    return `Events can't be scheduled more than ${MAX_FUTURE_EVENT_YEARS} years ahead`
  }
  return null
}