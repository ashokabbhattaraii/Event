# EventNexus — Missing Features Implementation Checklist

Scope: items 1, 4, 5, 6 from the gap analysis vs the investigation report, plus
real (scannable) event QR codes, plus a professional redesign of the event
detail page.

## 1. Online payment processor (Stripe)
- [x] `Event.price` → structured `{ amount, currency }` (was a free-text string)
- [x] `Ticket.payment` subdocument (status, amount, currency, Stripe session/intent ids)
- [x] `POST /api/events/:id/checkout` — creates a Stripe Checkout Session for paid events
- [x] `POST /api/payments/webhook` — verifies Stripe signature, creates the ticket on `checkout.session.completed`
- [x] Free events keep instant registration (no payment step)
- [x] Atomic capacity check (`findOneAndUpdate` + `$lt`) — fixes the overbooking race condition
- [x] Frontend checkout button → Stripe-hosted Checkout → success/cancel pages

## 4. Post-event feedback + sentiment analysis
- [x] `Feedback` model (event, attendee, rating, comment, sentiment, sentimentScore)
- [x] Lexicon-based sentiment scorer with optional LLM refinement (reuses existing `aiProvider`)
- [x] `POST /api/events/:id/feedback` (attendee, one per event)
- [x] `GET /api/events/:id/feedback` (organizer/admin — list + sentiment breakdown)
- [x] Frontend: feedback form (attendee) + sentiment summary panel (organizer)

## 5. Audience segmentation + marketing/content optimization + networking
- [x] `GET /api/analytics/segments` — attendee breakdown by interest category, engagement tier, distance bucket
- [x] `GET /api/analytics/marketing-insight` — best send-time/channel suggestion from historical registration timing
- [x] `GET /api/events/:id/networking` — "people you might want to meet" based on shared category interest
- [x] Frontend: segments chart on organizer analytics, marketing insight card, networking panel on event detail

## 6. Self-service ticket cancellation
- [x] `POST /api/tickets/:id/cancel` — attendee cancels own ticket, atomically frees the capacity slot
- [x] Chatbot's cancellation intent performs the real cancellation instead of deflecting
- [x] Frontend: cancel button + confirm dialog on ticket card / event detail

## Event QR — make it real
- [x] Replace the decorative fake QR SVG with a real scannable QR (encodes the signed ticket token)
- [x] Organizer check-in gets a camera-based scanner in addition to manual paste

## Event detail page — professional redesign
- [x] Remove fabricated agenda/speaker placeholder data
- [x] Real sections: overview, pricing/payment, capacity + AI attendance prediction, feedback & sentiment, networking suggestions, QR ticket, cancel registration

## Bug fixes bundled in (from prior review)
- [x] `getEventById` — no longer leaks other orgs' Draft events (tenant isolation)
- [x] `updateEvent` — whitelist updatable fields (mass-assignment fix)
- [x] Registration race condition — atomic capacity increment

## Round 2 — proximity alerts, public QR access, real dashboards
- [x] GeoJSON + 2dsphere indexes on `User.location` and `Event.coordinates`
- [x] Proximity notifications: publishing an event (create non-draft, or Draft→published) notifies same-org attendees/organizers within 25km (`NEARBY_EVENT_RADIUS_KM`), via a real `$near` geo query, capped at 300 recipients
- [x] Public, unauthenticated event page at `/events/[id]` — the QR/link destination for posters; adapts CTA to signed-out / attendee / organizer-admin viewers
- [x] Event QR poster component (separate from the ticket QR) encoding the public URL, shown on the organizer/admin event workspace
- [x] Embedded venue map (OpenStreetMap, no API key) + Google Maps directions link on both the public and authenticated event detail pages
- [x] Share button now shares the public URL instead of the login-walled authenticated route
- [x] De-faked all dashboard charts — organizer/admin analytics, registration trend, ticket mix, predicted-vs-actual attendance, role distribution, and category breakdown now render real backend data instead of hardcoded demo arrays
- [x] Audience segments and marketing-insight endpoints (built in round 1 but never surfaced) now have real chart/card UI on the organizer analytics page
- [x] `getOrgStats` extended with real per-role user counts

## Round 3 — IAM, session security, email verification
- [x] IAM API (`/api/iam` roles/permissions), organization membership API, `/api/audit` admin audit trail with audit() wired into auth/event/user/role/session flows
- [x] Central error middleware `{success:false,message,code}`, sanitized validator, helmet
- [x] `Session` model: SHA-256 hashed tokens, rotation on refresh, reuse → revoke whole token family, TTL
- [x] Refresh/logout/sessions-list/revoke endpoints; axios single-flight 401 auto-refresh on the frontend
- [x] Email verification (`/verify-email`, resend), forgot/reset password flows; dev-mode mail log (console + Mail collection, no SMTP)
- [x] Frontend `/verify-email`, `/forgot-password`, `/reset-password` pages, unverified-email banner, sessions manager in Settings

## Round 4 — org registration + system-admin approval workflow (per PDF roles)
- [x] `Organization` extended: registration details (email/phone/address/city/country/type/description/website) + approval fields (pending/active/rejected/suspended, approvedBy/At, rejectionReason)
- [x] `POST /api/auth/org-register` — org self-registers with full details + org-admin credentials → org is **pending**; admin can't log in yet
- [x] Login gate: pending/rejected/suspended orgs return 403 with clear reason (rejection reason shown to the org admin)
- [x] System admin = `admin` role **without** an organization (controls all tenants per PDF); org admin = `admin` **with** organization (tenant-scoped). `requireSystemAdmin` guard
- [x] `GET /api/system/orgs` (filter by status), `POST /api/system/orgs/:id/approve`, `POST /api/system/orgs/:id/reject` — approval emails + audit (`org_registered`/`org_approved`/`org_rejected`)
- [x] `POST /api/users` — org/system admin creates user credentials with full RBAC (name/email/password/role) for their tenant
- [x] User listing/stats: system admin sees all tenants, org admin only their own
- [x] Frontend: `/org-register` form, `/admin/approvals` console (approve/reject with reason), nav item, register/login page links
- [x] Seed: system admin `admin@eventnexus.dev` (no org) + org admin `orgadmin@eventnexus.dev` (tenant-scoped), roles seeded with `org:approve` permission
