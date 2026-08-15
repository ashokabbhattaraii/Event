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

## Round 5 — Automated reminders & notifications engine
- [x] `User.reminderEmail` boolean (default true) — attendee preference for email reminders
- [x] `Event.reminderSettings` (enabled, offsets[], feedbackDelayHours) — per-event reminder config
- [x] `ReminderJob` model — tracks scheduled/sent reminders per attendee per event (idempotent upserts)
- [x] In-process scheduler (`setInterval` tick, no external cron) — ensures jobs for registered attendees, dispatches due jobs
- [x] Hook into `claimAndIssueTicket` → auto-create reminder jobs on registration
- [x] `PUT /api/users/me/reminders` — attendee toggles email reminders (Settings → Notifications card)
- [x] `PUT /api/events/:id` includes `reminderSettings` — organizer configures offsets/feedback delay in event workspace
- [x] Frontend: Settings Notifications card with toggle; Organizer event workspace "Reminders" panel with preset offsets + feedback delay dropdown
- [x] Dispatch creates in-app Notification (type "reminder") + dev-mode email (Mail collection) when user has reminderEmail=true
- [x] Verified: near-future event (2-min offset) → registration → tick → in-app + email reminder dispatched, job marked sent

## Round 6 — Multi-Org Co-Host Collaboration
- [x] `Event.coHostOrganizations` array — additional organizations that can manage an event
- [x] `canManageEvent` extended: co-host org admins/owners gain organizer-level access
- [x] Authorization updated across controllers: events, tickets/attendees/check-in, feedback, analytics (organizer + admin)
- [x] API: `GET/POST/DELETE /api/events/:id/co-hosts` — list/add/remove co-host orgs (event organizer or owning org admin)
- [x] Frontend: `/organizer/collaboration` page — search orgs, add/remove co-hosts, status badges, permissions summary
- [x] Frontend queries: `useCoHostOrganizations`, `useAddCoHostOrganization`, `useRemoveCoHostOrganization`
- [x] Organization type updated with full details (email, phone, city, country, status) for co-host directory
- [x] Verified: owning org cannot be added as co-host; co-host org admins can access attendees, analytics, feedback

## Round 7 — GDPR & Account Lifecycle
- [x] `GET /api/auth/me/export` — downloads JSON with profile, tickets, organized events, feedback, notifications, sessions
- [x] `DELETE /api/auth/me` — permanently deletes account, anonymizes user-owned content (tickets, feedback, notifications), revokes all sessions, removes OrganizationMember
- [x] User model: deleted accounts get dummy password + googleId, name="Deleted User", email=deleted-{id}@eventnexus.local, organization=null, role=attendee, tokenVersion bumped
- [x] Frontend: Settings page "Privacy & Data" card with "Download JSON" button and "Delete Account" confirmation flow (email match required)
- [x] Frontend hooks: `useExportMyData`, `useDeleteMyAccount`
- [x] Verified: export returns full JSON; delete anonymizes user + tickets + feedback + notifications; user can no longer log in

## Round 8 — Admin control plane, IAM matrix & tenant lifecycle
- [x] `/admin/security` page — role⇄permission matrix (rows = permissions, columns = roles) with per-column grant/revoke-all toggle; writes `PUT /api/iam/roles/:id/permissions` (admin-only, cache invalidation on save); tenant admins get a view-only matrix, system admin gets write access
- [x] `/admin/organizations` page — system-admin tenant directory (status filter: all/active/pending/suspended/rejected; suspend/activate toggle; double-click-to-rename inline) backed by `GET /api/system/orgs` + `PATCH /api/system/orgs/:id`; tenant admin sees a single-org profile view (rename org form)
- [x] `PATCH /api/system/orgs/:id` — admin can rename a provisioned tenant or flip `active`↔`suspended`; suspending revokes every active refresh-token session for that tenant's members (session-revocation + audit: `organization_updated`)
- [x] IAM seed matrix realigned with `ROLE_PERMISSIONS` in `middleware/auth.js` — the DB role/permission table is now the authoritative source of truth and mirrors the static fallback, so `requirePermission` gates resolve consistently whether served from the DB cache or the boot-time fallback
- [x] Bug fix: `feedback:submit` is now granted to the `attendee` role in the seed — previously the seeded attendee lacked it, so `POST /api/events/:id/feedback` (enforced via `requirePermission`) returned `403 Not authorized for this action` for every attendee
- [x] Bug fix: `Session` model collision resolved — restored `models/Session.js` as the refresh-token session store (`user, refreshTokenHash, previousTokenHash, ip, userAgent, expiresAt, lastUsedAt, revokedAt`) and extracted the event-schedule session into `models/EventSession.js` (`event, organization, title, startTime, endTime, track, ...`); `sessionController.js` and `/api/events/:id/sessions` repointed to `EventSession`. Login / refresh / sessions-list / logout / org-suspend session revocation all hit the correct model again
- [x] Verified: admin login `200` (token + refreshToken); refresh rotation `200`; `GET /api/auth/sessions` lists active sessions; attendee posts feedback `201` with sentiment classification; suspend/rename org PATCH `200`
- [ ] Pending cleanup: prune phantom permission codes not enforced by any `requirePermission` gate or surfaced in the UI (`ai:use`, `report:view`, `role:manage`) and reconcile the `report:view` vs `analytics:view` naming drift so the matrix UI and the runtime matrix stay in lockstep
- [ ] `role-event-detail.tsx` rebuild: the event schedule-sessions panel (`SessionsPanel`) was scaffolded but its component body was removed mid-refactor; finish the panel (create/edit/delete schedule sessions) and restore a compiling event detail page
