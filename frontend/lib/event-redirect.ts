// Validates a "come back here after signing in" path for the QR/poster flow
// (scan → public event landing → Join → auth → land back on that event).
//
// Deliberately narrow rather than accepting any `redirect` string: an
// unchecked redirect taken from a URL query param is a classic open-redirect
// vector (`?redirect=https://evil.example` or `?redirect=//evil.example`
// both parse as "valid" strings if all you check is non-emptiness). Only a
// same-origin `/event/<24-hex-id>` path is accepted — the one destination
// this flow ever needs — so the param can't be turned into anything else.
const EVENT_PATH_RE = /^\/event\/[0-9a-f]{24}$/i;

export function sanitizeEventRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return EVENT_PATH_RE.test(raw) ? raw : null;
}
