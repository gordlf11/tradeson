# TradesOn — Event Catalog (CRUD reference)

> Every user-triggered action that touches the backend. For each one: what the user does, what the frontend fires, what to look for in DevTools Network tab to confirm, what mutates in PG, and what the user should see when it works.
>
> **Use this when something feels off**: open DevTools → Network → filter to `api/v1`, do the action, compare the requests you see to the row below.

## Conventions

- All API routes are prefixed with `${VITE_API_URL}/api/v1` (production: `https://tradeson-api-63629008205.us-central1.run.app`).
- All authenticated routes require `Authorization: Bearer <firebase_id_token>` header.
- Response 401 = bad/missing token. 403 = wrong role. 404 = entity (or PG row) doesn't exist. 503 = DB unreachable.
- The non-blocking onboarding pattern (commit `702a0fa`) means many writes are wrapped in try/catch — the UI still navigates forward even if the server-side write fails. localStorage breadcrumbs cover the gap. Look for `console.warn('… non-blocking …')` in the console when this happens.

---

## Auth

### E1 — Sign up

- **User action:** On `/signup`, fill name + email + password, agree to terms, click **Create Account**.
- **Frontend trigger:** `Signup.tsx` → `useAuth().signup(email, password, name)` → `AuthContext.signup()`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | POST | `identitytoolkit.googleapis.com/v1/accounts:signUp?key=...` | 200 |
  | POST | `/api/v1/users` | 201 (new) or 409 (already exists) |
- **Backend writes:** `users` row inserted (or upserted by email); `user_notification_preferences` default row inserted.
- **Result on FE:** `firebaseUser` populated, `userProfile` populated, navigates to `/role-selection`.
- **Result on BE:** New user committed.
- **Failure mode:** If `POST /users` fails, signup catches it silently and `userProfile` stays null. Self-heal (E4) covers this on the next login.

### E2 — Sign in

- **User action:** On `/login`, fill email + password, click **Sign In**.
- **Frontend trigger:** `Login.tsx` → `useAuth().login(email, password)` → `AuthContext.login()`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | POST | `identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=...` | 200 |
  | GET | `/api/v1/users/me` | 200 (normal) or 404 (triggers self-heal — see E4) |
- **Backend writes:** None (read-only).
- **Result on FE:** `firebaseUser` + `userProfile` populated; navigates to `/dashboard` if profile present, `/role-selection` if not (with localStorage fallback per `a2f21bf`).
- **Result on BE:** No mutation.

### E3 — Sign out

- **User action:** TopNav user menu → **Sign Out**.
- **Frontend trigger:** `localStorage.clear()` + `navigate('/login')` (TopNav handles it directly).
- **Network:** None. Firebase token discarded client-side; server never notified.
- **Backend writes:** None.
- **Result on FE:** Lands on `/login`; localStorage wiped except whatever Firebase auth persistence leaves (gets cleared on `Login.tsx` mount per `a2f21bf` if `demoMode` was on).

### E4 — Self-heal (auto)

- **User action:** None — fires automatically when `GET /users/me` returns 404 but a Firebase user exists.
- **Frontend trigger:** `AuthContext.login()` catch block + `onAuthStateChanged` catch block (commit `760d004`).
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | GET | `/api/v1/users/me` | 404 (triggers heal) |
  | POST | `/api/v1/users` | 201 (heal) or 409 (race — re-fetch) |
  | GET | `/api/v1/users/me` | 200 (now succeeds) |
- **Console log:** `Self-healed missing PG row for <email>`.
- **Backend writes:** `users` row inserted with role pulled from `localStorage.userRole` (or default `'homeowner'`).
- **Result on FE:** Profile populated; user proceeds normally.
- **Failure mode:** If the heal POST fails too, `userProfile` stays null and TopNav shows the firebaseUser email. User can still navigate but personalized data is absent.

### E5 — Update profile

- **User action:** `/profile` → edit Full Name / Phone / Email → click **Save Changes**.
- **Frontend trigger:** `ProfileSettings.tsx` → `api.updateMe({ full_name, phone_number })`.
- **Network:** `PUT /api/v1/users/me` → 200.
- **Backend writes:** `users` row updated.
- **Result on FE:** Saved confirmation chip shown; `userProfile` refreshed on next mount.

### E6 — Delete (deactivate) account

- **User action:** `/privacy-settings` → **Delete Account** → confirm in modal.
- **Frontend trigger:** `PrivacySettings.tsx` → `api.deleteMe()` → Firebase `signOut(auth)` → `localStorage.clear()` → `navigate('/login')`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | DELETE | `/api/v1/users/me` | 200 (or 404 if already gone — non-blocking) |
- **Backend writes:** `users.is_active = false` (soft delete; row preserved for audit). Firebase user stays.
- **Result on FE:** Signed out, lands on `/login`.

---

## Onboarding (one event per role)

### E7 — Complete homeowner onboarding

- **User action:** `/onboarding/homeowner` → walk 4 steps (Location, Property, Preferences, Payment) → click **Complete Setup** (or Skip Payment).
- **Frontend trigger:** `HomeownerOnboarding.tsx` `handleNext` final step → `api.onboardHomeowner({...})` → `api.updateMe({ full_name, phone_number })`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | POST | `/api/v1/onboarding/homeowner` | 201 |
  | PUT | `/api/v1/users/me` | 200 |
- **Backend writes:** `homeowner_profiles` row, `user_addresses` row, `user_notification_preferences` updated.
- **Result on FE:** Navigates to `/job-creation`. localStorage gets `userRole='homeowner'`, `hasOnboarded='true'`, `userName`, `userPhone`, and the four `location*` keys.
- **Result on BE:** Homeowner profile fully populated.

### E8 — Complete licensed tradesperson onboarding

- **User action:** `/onboarding/licensed-trade` → 6 steps including the **two-tier sub-services picker** (PR 3) → **Complete Setup**.
- **Frontend trigger:** `LicensedTradespersonOnboarding.tsx` `handleNext` final step → `api.onboardLicensedTrade({ business_name, primary_trades, offered_services, areas_served, ... })` → `api.updateMe(...)`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | POST | `/api/v1/onboarding/licensed-trade` | 201 |
  | PUT | `/api/v1/users/me` | 200 |
- **Backend writes:** `tradesperson_profiles` (with `offered_services` text[]), `service_areas` rows, `user_notification_preferences` updated, `users.role` confirmed. Wrapped in PG transaction (commit `d026489`) — rollback on partial failure.
- **Result on FE:** Navigates to `/job-board`. localStorage gets `userRole='licensed-trade'`, `tradespersonData` JSON.
- **Result on BE:** Tradesperson fully onboarded; appears in `GET /admin/compliance` queue with `compliance_status = 'pending'`.

### E9 — Complete unlicensed tradesperson onboarding

Same as E8 but route is `POST /api/v1/onboarding/non-licensed-trade` and `users.role = 'unlicensed_tradesperson'`. No `compliance_documents` row — compliance review is implicit.

### E10 — Complete property manager onboarding

- **Network:** `POST /api/v1/onboarding/property-manager` 201 + `PUT /users/me` 200.
- **Backend writes:** `property_manager_profiles` row + `user_addresses` + `user_notification_preferences`.
- **Result:** Navigates to `/job-creation`.

### E11 — Complete realtor onboarding

- **Network:** `POST /api/v1/onboarding/realtor` 201 + `PUT /users/me` 200.
- **Backend writes:** `realtor_profiles` row + (optionally) `realtor_clients` rows for any client emails entered + `user_addresses` + `user_notification_preferences`.
- **Result:** Navigates to `/dashboard/realtor` (the Realtor command center).

---

## Jobs

### E12 — Post a job

- **User action:** `/job-creation` → walk 5 steps (Room, Trade, Severity, Details, Description) → **Post Job**.
- **Frontend trigger:** `JobCreation.tsx` `handleSubmit` → `api.createJob({ title, description, category, room, severity, job_nature, ... intake fields ...})`. Photos uploaded separately via Firebase Storage `uploadFile()`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | POST | `/api/v1/jobs` | 201 |
  | (Firebase Storage uploads) | `firebasestorage.googleapis.com/...` | 200 (per file) |
- **Backend writes:** `jobs` row (`status='open'`); `job_photos` rows once URLs are returned (currently from frontend after upload). Audit log entry.
- **Result on FE:** Confirmation screen for ~2.5s, then `/job-board`. localStorage `localJobs` updated immediately so the job appears even if the API call lagged.
- **Result on BE:** New open job; will appear on tradesperson Job Boards within their service area + trade.

### E13 — View jobs

- **User action:** Bottom-nav **Jobs I Posted** (homeowner) or **Job Board** (tradesperson).
- **Frontend trigger:** `JobBoardEnhanced.tsx` `useEffect` → `api.listJobs()`.
- **Network:** `GET /api/v1/jobs` → 200.
- **Backend writes:** None (auto-filtered by signed-in user's role: tradespeople see open jobs in their categories + radius; customers see jobs they posted).
- **Result on FE:** Job cards rendered; `match_events` row written server-side per visible job (`event_type = 'shown'`) — *future, after PR 6*.

### E14 — View job detail

- **User action:** Click a job card → opens detail view or modal.
- **Frontend trigger:** `JobBoardEnhanced.tsx` (`CompareModalJob`) or `CustomerDashboard.tsx` → `api.getJob(id)`.
- **Network:** `GET /api/v1/jobs/:id` → 200.
- **Backend writes:** None.

### E15 — Mark job complete (tradesperson)

- **User action:** `/job-execution/:id` → check off all checklist items → click **Mark Complete**.
- **Frontend trigger:** `JobExecution.tsx` → `api.updateJobStatus(id, 'completed')`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | PATCH | `/api/v1/jobs/:id/status` | 200 |
  | (server-side, no FE call) | `/api/v1/stripe/platform-payout` | (auto-fired) |
- **Backend writes:** `jobs.status = 'completed'`, `jobs.completed_at = now()`. **Auto-fires** Stripe `platform-payout` route (commit `d026489`) — transfers funds minus 10% fee to tradesperson's Connect account. New `payments` row inserted.
- **Result on FE:** Customer redirected to `/completion` (review step).
- **Result on BE:** Job locked; payment record created; tradesperson's Stripe Connect balance bumped.

---

## Quotes

### E16 — Submit a quote

- **User action:** Tradesperson opens a job from `/job-board` → fills `QuoteSubmissionModal` (price, hours, hourly overage rate, message, **tools checklist**) → **Submit Quote**.
- **Frontend trigger:** `JobBoardEnhanced.tsx` (`QuoteSubmissionModal`) → `api.submitQuote(jobId, { price, estimated_hours, hourly_overage_rate, message, tool_inventory })`.
- **Network:** `POST /api/v1/quotes/:jobId/quotes` → 201.
- **Backend writes:** `quotes` row inserted with `status='pending'` and `tool_inventory` JSONB blob. Audit log entry.
- **Result on FE:** Modal closes; the job's quote count increments locally.

### E17 — Accept a quote

- **User action:** Customer opens job → **Compare & Accept Quotes** modal → click **Accept** on a quote.
- **Frontend trigger:** `CustomerDashboard.tsx` (`QuoteAcceptanceModal`) → `api.acceptQuote(quoteId)`.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | POST | `/api/v1/quotes/:id/accept` | 200 |
  | POST | `/api/v1/stripe/authorize-job` | 200 (pre-auth hold) |
- **Backend writes:** `quotes.status='accepted'` for the chosen one; sibling quotes set to `'rejected'`. `jobs.assigned_tradesperson_id` set. `payments` row created with status `'pending'` (pre-auth hold). Audit log entry.
- **Result on FE:** Navigates to `/scheduling` with the accepted quote.

---

## Payments

### E18 — View payment history

- **User action:** `/payment-settings` → scroll to Payment History.
- **Frontend trigger:** `PaymentSettings.tsx` → `api.listMyPayments()`.
- **Network:** `GET /api/v1/payments/me` → 200.
- **Backend writes:** None.
- **Returned shape:** Per row: `id, amount, platform_fee, net_payout, status, date, job_title, category, invoice_url, tx_type` (`payment` for outgoing, `earning` for incoming).

### E19 — Set up Stripe Connect (tradesperson)

- **User action:** Tradesperson onboarding payout step → **Set Up Stripe Payouts** → opens Stripe-hosted onboarding in a popup.
- **Frontend trigger:** `LicensedTradespersonOnboarding.tsx` → `api.createConnectAccount()`.
- **Network:** `POST /api/v1/stripe/create-connect-account` → 200 with `{ onboarding_url }`.
- **Backend writes:** `payout_accounts` row inserted with placeholder Stripe account ID (gets confirmed via Stripe webhook later).
- **Result on FE:** Popup opens to Stripe onboarding URL. Tradesperson completes flow there; webhook updates `payouts_enabled = true` async.

### E20 — Save payment method (customer)

- **User action:** Onboarding payment step or `/payment-settings` → enter card details in the embedded `StripeCheckoutWrapper`.
- **Frontend trigger:** `StripeCheckoutWrapper.tsx` → `api.createSetupIntent()` → renders Stripe `<PaymentElement>` → user submits.
- **Network:**
  | Method | URL | Status |
  |---|---|---|
  | POST | `/api/v1/stripe/create-setup-intent` | 200 with `{ client_secret }` |
  | (Stripe-side, no FE log) | Stripe confirms via webhook | webhook 200 |
- **Backend writes:** Stripe SetupIntent created; `users.stripe_customer_id` stamped if not yet set. Webhook updates payment method on file.

### E21 — Pre-auth hold (auto on quote accept)

Already covered as part of E17. Rendered separately as a row in `payments` with status `'pending'`. The hold becomes a real charge when the job completes (E15 → E22).

### E22 — Auto-payout on job completion

Already covered as part of E15. Server-side flow:
1. `PATCH /jobs/:id/status` accepts `status='completed'`.
2. Same handler internally calls the equivalent of `POST /stripe/platform-payout`.
3. New `payments` row reflects the disbursement (status `'completed'`).
4. Tradesperson sees it in their dashboard earnings.

---

## Reviews

### E23 — Submit a review (homeowner)

- **User action:** `/completion` after a job → 1-5 star rating + comment → **Submit Review**.
- **Frontend trigger:** `JobCompletion.tsx` → `POST /api/v1/reviews` (via api.ts; method to be added if missing).
- **Network:** `POST /api/v1/reviews` → 201.
- **Backend writes:** `reviews` row inserted. UNIQUE constraint on `(job_id, reviewer_id)` prevents duplicates. Server also recomputes `tradesperson_profiles.rating` (rolling average).

### E24 — View reviews on a tradesperson

- **User action:** Click "# reviews" link on a quote card.
- **Frontend trigger:** `JobBoardEnhanced.tsx` → `GET /api/v1/reviews/:tradespersonId`.
- **Network:** `GET /api/v1/reviews/:tradespersonId` → 200 (array).
- **Backend writes:** None.

---

## Realtor / Broker

### E25 — Open Realtor command center

- **User action:** Realtor signs in → lands on `/dashboard/realtor`.
- **Frontend trigger:** `RealtorDashboard.tsx` → `api.getRealtorDashboard()` + `api.getRealtorTradespeoplePicker()`.
- **Network:** `GET /api/v1/realtor/dashboard` 200 + `GET /api/v1/realtor/tradespeople-used` 200.
- **Backend writes:** None.
- **Returned shape:** Active jobs, client list, favorited tradespeople, recent activity.

### E26 — Favorite a tradesperson (Realtor)

- **User action:** From a tradesperson card, click the heart icon.
- **Frontend trigger:** `RealtorDashboard.tsx` → `api.addRealtorFavorite(tradespersonUserId, tradeCategory, note)`.
- **Network:** `POST /api/v1/realtor/favorites` → 201.
- **Backend writes:** `realtor_favorites` row inserted.

### E27 — Unfavorite a tradesperson

- **User action:** Same UI, click filled heart to remove.
- **Network:** `DELETE /api/v1/realtor/favorites/:tradespersonUserId` → 200.
- **Backend writes:** `realtor_favorites` row deleted.

---

## Admin

> All admin routes require `requireAuth + requireAdmin` middleware. Admin claim is set via `node scripts/setAdminClaim.mjs <email>`. After setting, sign out and back in to refresh the token.

### E28 — View compliance queue

- **User action:** `/dashboard/admin` → click **Compliance** card.
- **Frontend trigger:** `AdminDashboard.tsx` → `api.listComplianceSubmissions()`.
- **Network:** `GET /api/v1/admin/compliance` → 200 (array of submissions).
- **Backend writes:** None.

### E29 — Decide on a compliance submission

- **User action:** Open a submission → click **Approve / Reject / Request Docs** → enter admin note.
- **Frontend trigger:** `AdminDashboard.tsx` → `api.updateComplianceDecision(id, decision, adminNote)`.
- **Network:** `POST /api/v1/admin/compliance/:id/decision` → 200.
- **Backend writes:**
  - `tradesperson_profiles.compliance_status = decision`, `compliance_admin_note`, `compliance_reviewed_at`, `compliance_reviewed_by`.
  - On `approved`: `users.is_verified = true` + `compliance_documents.verification_status = 'approved'`.
  - On `rejected`: `users.is_active = false`.
  - Audit log entry: `compliance.<decision>`.

### E30 — Apply a resolution to a flagged account

- **User action:** **Accounts** card → open flagged account → choose Warning / Suspension / Deactivation / Explanation Request → enter reason.
- **Frontend trigger:** `AdminDashboard.tsx` → `api.applyResolution({ user_id, action_type, reason, suspend_until })`.
- **Network:** `POST /api/v1/admin/resolutions` → 200.
- **Backend writes:**
  - `admin_resolutions` row inserted.
  - On `deactivation` or `suspension`: `users.is_active = false`.
  - All open `flagged_accounts` rows for the user get `resolved_at = now()`.
  - Audit log entry: `resolution.<action_type>`.

### E31 — View platform metrics

- **User action:** **Metrics** card.
- **Frontend trigger:** `AdminDashboard.tsx` → `api.getPlatformMetrics()`.
- **Network:** `GET /api/v1/admin/metrics` → 200.
- **Backend writes:** None.
- **Returned shape:** `users` (counts by role), `mau`, `jobs` (open/in_progress/completed), `revenue` (gross/net/platformFee), `funnel` (customer + tradesperson stages), `activationRate`.

---

## Stripe webhooks (server-to-server, no user action)

### E32 — Stripe webhook delivery

- **Trigger:** Stripe sends webhook to `${API_BASE}/api/v1/stripe/webhooks` for `account.updated`, `transfer.created`, `payment_intent.succeeded`, `charge.dispute.created`, etc.
- **Frontend trigger:** None.
- **Network:** Inbound `POST /api/v1/stripe/webhooks` (visible in Cloud Run logs, not in the user's DevTools).
- **Backend writes:** Various, depending on event. `payments.status` updated; `payout_accounts.payouts_enabled` updated; `flagged_accounts` row inserted on dispute.
- **Verification:** Stripe Dashboard → Webhooks → Recent deliveries (200/4xx).

---

## Network-tab cheatsheet

When testing on production, open DevTools (Cmd+Option+I) → Network tab → filter by `api/v1`:

- **Sign in**: `users/me` 200 (or 404 → POST `users` 201 → `users/me` 200 = self-heal in action).
- **Post a job**: `jobs` POST 201.
- **Submit a quote**: `quotes/<jobId>/quotes` POST 201.
- **Accept a quote**: `quotes/<id>/accept` POST 200 + `stripe/authorize-job` POST 200.
- **Mark job complete**: `jobs/<id>/status` PATCH 200 (the platform-payout fires server-side; not visible in your tab).
- **Open admin dashboard**: `admin/compliance` GET 200, `admin/flagged-accounts` GET 200, `admin/metrics` GET 200.

If you see a request firing **2-4 times** for the same URL, that's React StrictMode in dev — it collapses to one in production.
