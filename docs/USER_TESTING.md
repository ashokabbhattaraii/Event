# EventNexus — Feature, Pipeline & Test-Flow Guide

Hands-on user-acceptance manual. Each feature is described as:

1. **Pipeline** — how it works end-to-end (frontend → API → AI service → database).
2. **Test flow** — numbered steps a tester can follow with a seeded account.
3. **Expected result** — what "correct" looks like (including the guarded/failure paths).
4. **Result / notes** — fill in `PASS` / `FAIL` + any observation.

> **Status: verified against code.** Every flow below was audited against the
> implementation (backend routes/controllers + frontend pages/hooks) — nothing
> is aspirational. Two checks are environment-dependent and listed in §1.

---

## 1. Environment & seeded accounts

| Service | Where | Port |
|---|---|---|
| Frontend (Next.js) | `frontend/` (`pnpm dev`) | http://localhost:3000 |
| API (Express + MongoDB) | `backend/` (`npm run dev` or `npm start`) | http://localhost:5000 |
| AI service (FastAPI, Python) | `ai-service/` (`uvicorn app:app`) | http://localhost:8000 |

> The AI service is **optional for almost everything**: every AI feature has a
> deterministic Node fallback. If it's down, features keep working with
> heuristic results and the UI shows that. ML models auto-train on first boot
> (cold start) from MongoDB data; retrain manually in **Admin → AI Training**.

Seed accounts (run `npm run seed` in `backend/`; every seeded account uses password `password123`):

| Account | Email | Role |
|---|---|---|
| System admin (no org) | `admin@eventnexus.dev` | platform admin — sees every tenant |
| Org admin | `orgadmin@eventnexus.dev` | tenant-scoped admin |
| Attendee | `attendee@eventnexus.dev` | regular user (own tickets, feedback…) |
| Other demo users | `priya@eventnexus.dev`, `sam@eventnexus.dev`, … | attendees across Kathmandu/Pokhara |

Environment-dependent checks (all other flows work out of the box):

| Check | Requires | If unset, expect |
|---|---|---|
| Google sign-in (B1) | `GOOGLE_CLIENT_ID` in `backend/.env` | Google button hidden — fine, counts as N/A |
| Paid checkout (C1) | Stripe keys (test mode) | free-event registration still works; paid flow can't be tested |
| eSewa rail (C1) | `ESEWA_FORM_URL` / `ESEWA_STATUS_URL` | Stripe is the only payment rail |
| Email delivery (A6, B2, B3, F2) | SMTP config | reset/verify/reminder emails go to the console log + `Mail` collection instead — expected in dev |

Other test notes:
- Email (verify / reset / reminders) in dev goes to the **console log** and the **`Mail` collection** (no SMTP needed). Check `backend` console output for reset/verify links.
- Stripe checkout runs in **test mode** — pay with card `4242 4242 4242 4242`, any future expiry, any CVC.
- Reminder offsets can be tested with a 2-minute offset on an upcoming event (seed events are near-future).
- Known tooling quirk (not a feature bug): `frontend/` has no `eslint` binary installed, so `pnpm lint` can't run — `tsc --noEmit` is the type gate.

---

## 2. Architecture in one paragraph

Next.js frontend → Express REST API (`/api`, JWT + refresh-token sessions, role/permission gates) → MongoDB (events, users, tickets, sessions, audit trail…). The Python AI service owns the trained models (attendance prediction, recommendations, chatbot intent, collaboration matching) and the LLM calls (Groq/Gemini). Every AI integration is best-effort: if the AI service or a model is unavailable, the API falls back to deterministic Node logic and audits the call. All admin actions are written to the immutable **audit trail** (visible on the Security page and per-user in the Users console).

---

## 3. Feature test flows

### A. Admin — User Management (Users & Roles)

**Pipeline:** `/admin/users` → `GET /api/users` (tenant-scoped, one aggregate per page for live counts) → `GET /api/users/stats` for the cards → actions call `PATCH /api/users/:id/status`, `PUT /:id/role`, `POST /:id/revoke-sessions`, `POST /:id/reset-password`, `DELETE /:id`. Every action bumps the user's token version (kills JWTs), optionally revokes refresh sessions, and writes an audit-log entry. Deactivated users are blocked at login, Google sign-in and token refresh.

**Flow A1 — Directory accuracy & filters** (sign in as `admin@eventnexus.dev`)

1. Open **Admin → Users & Roles**.
2. Look at the four stat cards: Total accounts, Administrators, Organizers, Attendees.
   - **Expected:** Numbers come from the stats endpoint and match the real DB (equal to the count you'll see in the Org Approvals/AI Training data panels), NOT just the rows on the current page. "Total accounts" may show a "+N this month" pill.
3. Search a name (e.g. `Alex`) — results filter as you type (400ms debounce).
4. Use the **Status** filter → `Deactivated`.
   - **Expected:** only deactivated accounts; an amber banner appears if any exist.
5. Use the **Tenant** filter (system admin only) → pick one organization.
   - **Expected:** directory scopes to that tenant and its name appears per row.
6. Verify columns: User (avatar, name, email, Google/local icon), Role, Status, Tenant, Last active, Tickets, Joined.
   - **Expected:** "Last active" shows relative time (e.g. `2h ago`), Tickets column shows the user's live ticket count. No "—" for users who have actually been active.

**Flow A2 — Create a user**

1. Click **Add user** → fill name, email, role `organizer`, tenant, password ≥ 6 → Create.
2. **Expected:** success toast; the account appears immediately in the directory on page 1 (cache refresh); it can log in right away.
3. Try creating the same email again → **Expected:** backend error "User already exists" shown in a toast.
4. As an **org admin** (`orgadmin@eventnexus.dev`, pick their row context): the role select only offers organizer/attendee, and the "Administrator role only for system admin" note shows.

**Flow A3 — Role change**

1. Change an attendee's role to `organizer` via the row's role select.
2. **Expected:** toast "…is now organizer. They'll be signed out everywhere…". The row updates instantly.
3. Sign out, log in as that user → **Expected:** you must log in again (old session dead), and their nav shows organizer items.
4. Guard cases (each must produce the backend's exact error, surfaced in a toast):
   - Org admin tries to grant the `admin` role → 403 "Only the system admin can grant the admin role".
   - Any admin changes **their own** role → 400 "You can't change your own role".
   - Change the **org owner's** role (owner row on the tenant) → 400 "The organization owner's role can't be changed".
   - Org admin changes a user of **another tenant** → 403 (cross-tenant).

**Flow A4 — User detail panel (accuracy + reflection)**

1. On any row click ⋮ → **View profile**.
2. **Expected:** dialog with identity (role/status/auth-method/email-verified badges), live metrics (active sessions, tickets, hosted events, saved events), account facts (org, joined, last active), the user's **sessions** (device/IP/last used) and **Activity trail** (recent audit entries with relative times).
3. Have the same user log in on another browser → reopen the panel → **Expected:** session count and trail entries update (cache invalidation).

**Flow A5 — Deactivate / reactivate**

1. Click ⋮ → **Deactivate account** → confirm dialog (destructive, warning copy) → confirm.
2. **Expected:** success toast; the row flips to a `Deactivated` badge; status-card counts and the amber banner update; the audit trail gains a `user_deactivated` entry.
3. Try to log in as that user → **Expected:** login refused, 403 "Your account has been disabled by an administrator". Google sign-in and refresh are blocked the same way.
4. Reopen ⋮ → **Reactivate account** → confirm.
5. **Expected:** user can log in again; `user_reactivated` in their trail.
6. Guard: deactivating **yourself** → 400 "You can't manage your own account". Deactivating the tenant's **only active admin** → 400 "This is the organization's only active admin…".

**Flow A6 — Sign out everywhere / Reset password**

1. With the user signed in on 2 browsers: ⋮ → **Sign out everywhere**.
2. **Expected:** both sessions die on their next API call; toast "N session(s) revoked"; the detail panel's session list empties.
3. ⋮ → **Email reset link** (non-Google account).
4. **Expected:** toast "Password reset link sent to …". Open the link from the backend console/Mail collection → reset page → set a new password → login with the new password works; the old one doesn't.
5. Google-linked account → the menu item is disabled (no password to reset).

**Flow A7 — Remove permanently (guarded)**

1. Pick an attendee with at least one active ticket → ⋮ → **Remove permanently** → confirm.
2. **Expected:** refuses with "…still holds N active ticket(s)…" — the exact guard message appears **inside the confirm dialog**, and a toast explains.
3. Pick a user who hosts events → same → **Expected:** refuses ("hosts N event(s)…").
4. Pick a clean user (no tickets/events) → confirm → **Expected:** row disappears, toast "removed permanently", `user_removed` audit entry.
5. Attempt removal of yourself / the org owner / the last admin → **Expected:** each is refused with its specific message.

**Result (A):** ______ Pass / Fail — notes: _____

---

### B. Authentication, verification & account security

**Pipeline:** email/password or Google OAuth → JWT access token (+ version) + hashed refresh-token session (rotation + reuse detection) → email verification gate → org-approval gate. Passwords never stored in plaintext (bcrypt), reset tokens hashed, one session per account per browser.

**Flow B1 — Login & session security**
1. Log in as `attendee@eventnexus.dev` → **Expected:** works; success audit entry.
2. Open Settings → **Sessions** tab → **Expected:** this session listed with device/IP/last-used; "Revoke" kills it (you're redirected to login).
3. Log in twice on the same browser (different accounts) → **Expected:** one active session per browser (the earlier one is revoked server-side).
4. Wrong password → **Expected:** generic "Invalid email or password" (no account enumeration).

**Flow B2 — Registration flows**
1. Sign up as a brand-new user from **Register** → **Expected:** account created as attendee; an email-verification link is logged to the console/Mail collection; an unverified banner shows.
2. Open the verify link → **Expected:** banner clears; `verify_email` audit entry.
3. Try to register an email that already exists → **Expected:** clear error.
4. **Org registration:** `/org-register` → fill org details + admin credentials → submit.
5. **Expected:** org status `pending`; the org admin **cannot log in yet** (403 with "organizations pending approval" style message).
6. As system admin: **Admin → Org Approvals** → approve (or reject with a reason).
7. **Expected:** approval email logged; the org admin can now log in; rejected orgs show the rejection reason at login; `org_approved`/`org_rejected` audit entries.

**Flow B3 — Forgot / reset password**
1. `/forgot-password` with an existing email → **Expected:** "If an account exists, a reset link has been sent".
2. Open the reset link from the console (24h, single-use) → set password ≥ 6 chars → login with the new password.
3. Reusing the same reset link → **Expected:** "Reset link is invalid or has expired".

**Result (B):** ______ Pass / Fail — notes: _____

---

### C. Events, ticketing, payments & check-in

**Pipeline:** event browsing (public detail page adapts to signed-out/attendee/organizer) → registration: free = instant with atomic capacity check; paid = Stripe Checkout (test mode) → webhook mints the ticket (QR = signed token) → attendee can cancel (frees capacity) → check-in verifies the signature at the door (camera scanner or manual paste).

**Flow C1 — Browse & register**
1. Browse `/events`, open an event detail → **Expected:** overview, pricing (NPR), capacity, venue map + directions link, AI attendance prediction, feedback/sentiment, networking suggestions (if registered), share → public URL.
2. Register for a **free** event → **Expected:** instant ticket, capacity decrements atomically; reminder job auto-created; in-app notification.
3. Register for a **paid** event → **Expected:** redirect to Stripe test checkout → pay `4242…` → success page → ticket appears in **My Tickets**. (NPR events may offer the local eSewa rail where configured.)
4. Click **Register** twice fast (different browsers) for a near-full event → **Expected:** no overbooking − second attempt fails cleanly.
5. **Cancel** a ticket → confirm → **Expected:** ticket marked cancelled, capacity freed, you can register again.

**Flow C2 — Ticket QR & check-in**
1. My Tickets → open a ticket → **Expected:** real scannable QR (encodes the signed token).
2. Sign in as the event's organizer → `/check-in` → camera scan (or paste token) → **Expected:** valid ticket → "Checked in", ticket status flips; duplicate scan is refused.
3. Attendee roster in the organizer dashboards → **Expected:** check-in status updated live.
4. Organizer event workspace → **QR poster** → **Expected:** a scannable poster QR that encodes the **public** event URL (anything opening it sees the public page, no login wall).

**Flow C3 — Organizer: create & publish an event (wizard)**
1. Organizer dashboard → **Create event** (wizard).
2. **Expected:** structured steps — basics (title, category, type, description), schedule (date/venue/map coordinates from address), capacity & pricing (free or NPR amount), agenda/speakers/highlights, and a review step — invalid or missing required fields block submission with inline messages (no partial saves).
3. Save as **Draft** → **Expected:** draft is invisible publicly and to other tenants (tenant isolation); it appears in the organizer's event workspace with a Draft badge.
4. **Publish** → **Expected:** status flips (Upcoming); attendees within 25 km get a proximity notification (see F4); the event appears in browse/chatbot/recommendations; share link becomes public.
5. Edit the event (reminder settings panel included — see F2) → **Expected:** changes reflect in the workspace and on the public page.

**Flow C4 — Saved events & recommendations page**
1. Heart an event from a card or detail page → **Expected:** Saved count updates; it persists across devices (server-side list, sign in on another browser to confirm).
2. Remove the heart → **Expected:** it disappears from `/saved-events` immediately.
3. `/recommendations` waiting for personalized picks → **Expected:** ranked list for the signed-in attendee (CF scores when trained, hybrid fallback otherwise) with a "why" line.
4. As a guest (signed out) hearts stay in localStorage only → **Expected:** after sign-in the guest list is kept as a fallback until server-side hearts exist.

**Result (C):** ______ Pass / Fail — notes: _____

---

### D. AI features (chatbot, recommendations, predictions, AI console)

**Pipeline:** The Node backend calls the AI service (FastAPI) which holds trained Scikit-learn models + the LLM router (Groq/Gemini). Fault-tolerant: service down/model missing → deterministic fallback (rules/heuristics), never a crash.

**Flow D1 — Chatbot** (attendee, on the chat bubble)
1. "What events are coming up?" → **Expected:** list (ML intent + LLM-backed answer; follow-up chips).
2. "recommend events for me" → **Expected:** ranked picks (CF model when available).
3. "cancel my registration for <event>" → **Expected:** actually cancels the ticket, frees the spot (not a deflection).
4. "find events near me", "my tickets", "how many events are there", "is it free" → each resolves correctly.
5. Turn off the AI service (stop uvicorn) and repeat → **Expected:** same features degrade to rules/deterministic answers (no broken page).

**Flow D2 — Recommendations & AI insights**
1. `/recommendations` → **Expected:** personalized list for the signed-in attendee (CF scores when trained).
2. Organizer → **AI Insights** on an event → **Expected:** predicted attendance vs capacity chart + wording (attendance model).
3. Organizer analytics → **Expected:** real data charts (registrations trend, ticket mix, predicted-vs-actual, segments, marketing insight card — no demo numbers).

**Flow D3 — AI Training console** (system admin → **Admin → AI Training**)
1. **Expected:** stats panel shows real data counts (events, past/upcoming, tickets, chatlog, collaboration pairs) from `GET /api/ai/stats`.
2. Fix a mislabeled chatbot sample (change its intent) → **Retrain all**.
3. **Expected:** retrain completes with per-model results (trained/skipped reasons); model health flags update (attendance, CF, intent, collaboration).
4. The collaboration note: the ML co-host model only trains once ≥ 8 real accept/decline decisions exist — until then its health shows off and suggestions run on the heuristic.

**Result (D):** ______ Pass / Fail — notes: _____

---

### E. Multi-org collaboration (co-hosts + AI suggestions)

**Pipeline:** organizer's Collaboration page → co-hosts API (tenant-scoped, co-host org admins gain organizer-level access to attendees/analytics/feedback) → the engine scans event pairs, scores them with a deterministic heuristic, then batches candidates to the AI service's collaboration-match classifier (RandomForest trained on real accept/decline decisions + mutual co-hosts); the final score blends ML (55%) + heuristic (45%) and every suggestion carries an LLM rationale (heuristic-assembled fallback).

**Flow E1 — Co-hosts**
1. As organizer of an event → Collaboration → search another org → **Add as co-host**.
2. **Expected:** status badge updates; the owning org can't be added to itself (refused); co-host org admin can now view attendees/analytics/feedback for that event.
3. Remove the co-host → **Expected:** access is revoked immediately.

**Flow E2 — AI suggestion engine**
1. Ensure the AI service is running (for ML scores) and at least two orgs have events.
2. Trigger a scan (open the collaboration page with pending suggestions, or restart backend → scheduled scan).
3. **Expected:** suggestions appear with a score (0–100), a rationale paragraph, and the matched factors; `scoreSource` distinguishes "ml" vs "heuristic" (visible in detail).
4. **Accept** a suggestion → **Expected:** the two orgs become co-hosts on the event; this decision is recorded as a positive training pair.
5. **Decline** a suggestion → **Expected:** recorded as a negative pair for retraining.
6. Restart the AI service with no model trained yet → **Expected:** engine still produces suggestions from the heuristic alone (scoreSource "heuristic"), no errors.

**Result (E):** ______ Pass / Fail — notes: _____

---

### F. Notifications, reminders, feedback, networking

**Pipeline:** in-app Notification model + Socket.IO live toasts; ReminderJob scheduler (in-process tick) creates jobs on registration and dispatches due reminders (in-app + dev-email if the user opted in); feedback → lexicon sentiment scoring (optional LLM refinement); networking = shared-category attendee suggestions.

**Flow F1 — Live notifications**
1. Ask an attendee to register for your event from another browser.
2. **Expected:** you get a live toast + notification (socket) and it appears in the bell list.

**Flow F2 — Reminders**
1. In the event workspace → Reminders panel → enable + set a 2-minute offset → save.
2. Register (or have an attendee register).
3. **Expected:** ~2 minutes later the attendee receives the in-app notification + email logged to console/Mail (respects their Settings → Notifications toggle; toggling off stops email).

**Flow F3 — Feedback & sentiment**
1. For a **past** event (or seed a past event + ticket), attendee submits rating + comment.
2. **Expected:** one feedback per attendee enforced; organizer sees the feedback list + sentiment summary (positive/negative split).
3. Networking panel on the event detail → **Expected:** "people you might want to meet" from shared categories (registered attendees only).

**Flow F4 — Proximity alerts (geo)**
1. Ensure a signed-in attendee has a saved location (browser location is captured at login; Settings can update it) and sits inside the 25 km radius of an org's venue.
2. As that org's organizer, publish a new event (or flip a Draft → published).
3. **Expected:** same-org attendees within 25 km receive a "new event near you" in-app notification (geo `$near` query, capped at 300 recipients); attendees outside the radius get nothing.
4. Remove the attendee's location in Settings → publish again → **Expected:** they're no longer in the radius set.

**Result (F):** ______ Pass / Fail — notes: _____

---

### G. Security & IAM (admin)

**Pipeline:** roles & permissions live in MongoDB (seeded matrix), mirrored by a static fallback, cached and invalidated on edit. `requirePermission` gates every protected action. Org suspension revokes all tenant sessions. All admin/security actions are audited.

**Flow G1 — Permission matrix** (system admin → **Admin → Security & IAM**)
1. **Expected:** matrix = permissions × roles, editable columns for system admin (view-only for org admins).
2. Remove `event:manage` from `organizer` → save → log in as an organizer → **Expected:** they can no longer edit events; restore afterward.
3. Change a permission → check the org admin's view refreshes (cache invalidation).

**Flow G2 — Audit trail**
1. Perform a few actions (login, role change, org suspend, user deactivate, feedback).
2. Admin → Security → **Expected:** every action has an audit row: who, action, resource, IP, user-agent, timestamp; filter by action/user/date.
3. Suspend a tenant (Admin → Organizations → Suspend) → **Expected:** that tenant's members are signed out everywhere, `organization_updated` audit entry; reactivation restores login.

**Flow G3 — Admin consoles sweep** (system admin)
1. **Admin dashboard** → **Expected:** real platform statistics (users, events, tickets, orgs; recent activity), not demo numbers.
2. **Admin → Organizations** → tenant directory with status filter → rename a tenant (double-click inline) → suspend/activate → **Expected:** changes persist; suspended tenants' logins blocked; audit entries written.
3. **Admin → Events** → pick an event → **Expected:** oversight view of any tenant's event (attendees, tickets, analytics, feedback) with the same tenant isolation rules the API enforces.
4. **Admin → Notifications** → **Expected:** send/see platform notifications; per-item detail view works.
5. **Admin → Settings / System Settings** → **Expected:** editable platform settings persist across reloads.

**Result (G):** ______ Pass / Fail — notes: _____

---

### H. Privacy & account lifecycle (attendee Settings → Privacy & Data)

**Flow H1 — Export & delete**
1. **Download JSON** → **Expected:** full archive: profile, tickets, organized events, feedback, notifications, sessions.
2. **Delete account** (type email to confirm) → **Expected:** account anonymized (Deleted User, dummy password), tickets/feedback/notifications anonymized, all sessions revoked, `me_deleted`-style audit; the email can no longer log in.

**Result (H):** ______ Pass / Fail — notes: _____

---

## 4. Quick test sheet

| # | Feature | Flow | Tester | Result | Notes |
|---|---|---|---|---|---|
| A1 | Directory accuracy & filters | §A1 | | | |
| A2 | Create user | §A2 | | | |
| A3 | Role change + guards | §A3 | | | |
| A4 | Detail panel reflection | §A4 | | | |
| A5 | Deactivate / reactivate | §A5 | | | |
| A6 | Sign out everywhere / reset | §A6 | | | |
| A7 | Remove (guards) | §A7 | | | |
| B1 | Login / sessions | §B1 | | | |
| B2 | Registration + org approval | §B2 | | | |
| B3 | Password reset | §B3 | | | |
| C1 | Register (free/paid/cancel) | §C1 | | | |
| C2 | QR check-in + public poster | §C2 | | | |
| C3 | Event wizard (draft → publish) | §C3 | | | |
| C4 | Saved events & recommendations | §C4 | | | |
| D1 | Chatbot | §D1 | | | |
| D2 | Recommendations / insights | §D2 | | | |
| D3 | AI training console | §D3 | | | |
| E1 | Co-hosts | §E1 | | | |
| E2 | AI suggestion engine | §E2 | | | |
| F1 | Live notifications | §F1 | | | |
| F2 | Reminders | §F2 | | | |
| F3 | Feedback / networking | §F3 | | | |
| F4 | Proximity alerts | §F4 | | | |
| G1 | IAM matrix | §G1 | | | |
| G2 | Audit & org suspend | §G2 | | | |
| G3 | Admin consoles sweep | §G3 | | | |
| H1 | Export / delete account | §H1 | | | |

**Overall verdict:** ______ &nbsp; **Bugs found:** ______