# TradesOn — Backend ↔ Frontend Data Mapping

> One row per Postgres table. Tells you which API routes touch the table and which UI components consume those routes. Use this when something on the screen looks wrong and you need to trace the data backward to the table that's misbehaving.

## How to read this

Each row has three columns:

- **Table** — the PG table.
- **API routes** — every route that reads or writes the table. `R` = SELECT, `W` = INSERT/UPDATE/DELETE.
- **Frontend consumer(s)** — pages/components that call those routes (via `src/services/api.ts`).

If you see a UI bug, follow it left: which component → which route(s) → which table.

If you see a data bug in PG, follow it right: which table → which route writes it → which UI triggers that route.

---

## Identity & profile

| Table | API routes | Frontend consumer(s) |
|---|---|---|
| `users` | `R/W POST /users` (create + upsert by email)<br>`R GET /users/me`<br>`W PUT /users/me` (also flips `is_verified`, `is_active`)<br>`W DELETE /users/me` (soft delete via PrivacySettings) | `AuthContext.tsx` (signup + login + self-heal), `Signup.tsx`, `RoleSelection.tsx`, all `*Onboarding.tsx`, `ProfileSettings.tsx`, `PrivacySettings.tsx`, `TopNav.tsx` (email + role) |
| `user_addresses` | `W` via the onboarding routes (each onboarding inserts the user's primary address) | All `*Onboarding.tsx` |
| `user_notification_preferences` | `W POST /users` (default row inserted)<br>`W` updates via onboarding routes | All `*Onboarding.tsx` (notification toggles step) |
| `homeowner_profiles` | `W POST /onboarding/homeowner` | `HomeownerOnboarding.tsx` |
| `property_manager_profiles` | `W POST /onboarding/property-manager` | `PropertyManagerOnboarding.tsx` |
| `managed_properties` | (Schema present; PR 7 will wire UI — not yet consumed) | (planned: `PropertyManagerOnboarding.tsx`, `CustomerDashboard.tsx`) |
| `realtor_profiles` | `W POST /onboarding/realtor`<br>`R GET /realtor/dashboard` | `RealtorOnboarding.tsx`, `RealtorDashboard.tsx` |
| `realtor_clients` | `W POST /onboarding/realtor` (initial invitations) | `RealtorOnboarding.tsx`, `RealtorDashboard.tsx` |
| `realtor_favorites` | `R GET /realtor/dashboard` (joined)<br>`R GET /realtor/tradespeople-used`<br>`W POST /realtor/favorites`<br>`W DELETE /realtor/favorites/:id` | `RealtorDashboard.tsx` |
| `tradesperson_profiles` | `W POST /onboarding/licensed-trade`<br>`W POST /onboarding/non-licensed-trade`<br>`R/W GET /admin/compliance` (admin reads)<br>`W POST /admin/compliance/:id/decision` (admin sets compliance_status) | `LicensedTradespersonOnboarding.tsx`, `UnlicensedTradespersonOnboarding.tsx`, `AdminDashboard.tsx`, `TradespersonDashboard.tsx` |
| `service_areas` | `W` via the licensed/unlicensed onboarding routes | `LicensedTradespersonOnboarding.tsx`, `UnlicensedTradespersonOnboarding.tsx` |
| `compliance_documents` | `W` via licensed-trade onboarding (initial)<br>`W InsuranceUpload.tsx` (post-onboarding doc uploads — uses storage service)<br>`W POST /admin/compliance/:id/decision` (admin marks `verification_status = 'approved'`) | `LicensedTradespersonOnboarding.tsx`, `InsuranceUpload.tsx`, `AdminDashboard.tsx` |
| `payout_accounts` | `W POST /stripe/create-connect-account`<br>`R GET /stripe/connect-status` | `LicensedTradespersonOnboarding.tsx`, `UnlicensedTradespersonOnboarding.tsx`, `PaymentSettings.tsx` |

## Job lifecycle

| Table | API routes | Frontend consumer(s) |
|---|---|---|
| `jobs` | `W POST /jobs`<br>`R GET /jobs?...` (auto-filtered by role)<br>`R GET /jobs/:id`<br>`W PATCH /jobs/:id/status` (auto-fires platform-payout on `completed`)<br>`W POST /jobs/:id/confirm-complete` (homeowner side) | `JobCreation.tsx`, `JobBoardEnhanced.tsx`, `CustomerDashboard.tsx`, `TradespersonDashboard.tsx`, `JobExecution.tsx`, `JobCompletion.tsx`, `JobDayOf.tsx` |
| `job_photos` | `W` via Firebase Storage (not the API directly) — URL written to a future `job_photos` row | `JobCreation.tsx` (intake photos), `JobExecution.tsx` (before/after) |
| `quotes` | `W POST /quotes/:jobId/quotes`<br>`W POST /quotes/:id/accept` (sets status='accepted', other quotes='rejected') | `JobBoardEnhanced.tsx` (`QuoteSubmissionModal`), `CustomerDashboard.tsx` (`QuoteAcceptanceModal`) |
| `appointments` | `W` triggered by `POST /quotes/:id/accept` + `Scheduling.tsx` save | `Scheduling.tsx`, `JobDayOf.tsx`, `JobExecution.tsx` |
| `appointment_checklist` | `W` via Job Execution checklist toggles | `JobExecution.tsx` |
| `scope_changes` | (Schema present; UI not yet wired) | (planned: `JobExecution.tsx`) |

## Payments

| Table | API routes | Frontend consumer(s) |
|---|---|---|
| `payments` | `W POST /stripe/authorize-job` (pre-auth hold)<br>`W POST /stripe/direct-charge`<br>`W POST /stripe/platform-payout`<br>`W POST /stripe/webhooks` (Stripe → updates status)<br>`R GET /payments/me` | `StripeCheckoutWrapper.tsx`, `PaymentSettings.tsx`, `JobCompletion.tsx` |
| `invoices` | `W` triggered server-side after `direct-charge` succeeds<br>`R GET /payments/me` (joined) | `PaymentSettings.tsx` (Payment History list) |
| `invoice_line_items` | `W` server-side when invoice is created | (read via parent `invoices`) |

## Reviews

| Table | API routes | Frontend consumer(s) |
|---|---|---|
| `reviews` | `W POST /reviews`<br>`R GET /reviews/:tradespersonId` | `JobCompletion.tsx` (homeowner submits), `JobBoardEnhanced.tsx` (`QuoteSubmissionModal` shows rating), `TradespersonDashboard.tsx` |

## Communication

| Table | API routes | Frontend consumer(s) |
|---|---|---|
| `conversations` | (Server inserts on first message; client uses Firestore for live messages) | `MessagingModal.tsx` |
| `notifications` | (Server inserts when actions trigger; client reads optionally) | (planned: notification bell) |
| `device_tokens` | (Server stores FCM tokens written from client via Firestore — not API today) | `AuthContext.tsx` (writes to Firestore `users/{uid}.fcmToken`) |

## Admin + audit

| Table | API routes | Frontend consumer(s) |
|---|---|---|
| `flagged_accounts` | `R GET /admin/flagged-accounts`<br>`W` resolved via `POST /admin/resolutions` (sets `resolved_at`)<br>`W` populated by future cron jobs (insurance expiry, low ratings, dispute webhooks) | `AdminDashboard.tsx` |
| `admin_resolutions` | `W POST /admin/resolutions` (also flips `users.is_active=false` for suspension/deactivation) | `AdminDashboard.tsx` |
| `audit_log` | `W` from every admin route via `logAuditEvent()`<br>`W` from key user routes (job created, quote accepted, etc.) | `AdminDashboard.tsx` (Audit Log section reads Firestore mirror today; Postgres reads planned) |
| `match_events` | `W` from `GET /jobs?...` (`shown` event), quote routes (`quoted`, `accepted`), job-status route (`completed`) | (planned: PR 6 — recommendation routes that emit these events) |

---

## Field-level callouts (most-confused mappings)

These are the spots where the field name in the UI doesn't obviously match the column name in PG.

| UI label / variable | API field | PG column | Notes |
|---|---|---|---|
| Trade picker `tradeType` (kebab) | `category` | `jobs.category` | Frontend uses `'snow-removal'`; PG accepts the same. |
| Cleaning intake fields (`cleaningType`, `snowAreas`, etc.) | `cleaning_type`, `snow_areas`, etc. | `jobs.intake_answers` (JSONB) | Currently sent as flat fields; PR 5 will pack them into a single `intake_answers` blob. |
| `JOB_NATURE_OPTIONS` | `job_nature` | `jobs.job_nature` | Aligned to Service Mix dashboard buckets: `Repair / Maintenance / New Install / Replacement`. |
| Sub-services picker (`offeredServices`) | `offered_services` | `users.offered_services` (text[]) | Tradesperson onboarding writes leaves like `'plumbing.drain_cleaning'`. |
| Quote tools checklist | `tool_inventory` | `quotes.tool_inventory` (JSONB) | Per-quote, not per-user. |
| TopNav role display | (no API) | `localStorage.userRole` (kebab) | Not from PG. PG uses snake_case (`licensed_tradesperson`); frontend uses kebab-case (`licensed-trade`). The role mapper in `RoleSelection.tsx` translates between them. |
| TopNav email display | `email` (PG `users.email`) → falls back to `firebaseUser.email` → falls back to `localStorage.userEmail` | `users.email` | After commit `b050431` — was placeholder before. |

---

## Quick lookup — frontend file → API methods called

(For each file, run `grep -nE "api\." src/<file>` to confirm. This list is a snapshot.)

| File | Methods used |
|---|---|
| `AuthContext.tsx` | `createUser`, `getMe` |
| `Signup.tsx` | (calls `auth.signup()` which wraps the above) |
| `RoleSelection.tsx` | `updateMe` |
| `HomeownerOnboarding.tsx` | `onboardHomeowner`, `updateMe` |
| `PropertyManagerOnboarding.tsx` | `onboardPropertyManager`, `updateMe` |
| `RealtorOnboarding.tsx` | `onboardRealtor`, `updateMe` |
| `LicensedTradespersonOnboarding.tsx` | `onboardLicensedTrade`, `updateMe`, `createConnectAccount` |
| `UnlicensedTradespersonOnboarding.tsx` | `onboardUnlicensedTrade`, `updateMe`, `createConnectAccount` |
| `JobCreation.tsx` | `createJob` |
| `JobBoardEnhanced.tsx` | `listJobs`, `submitQuote` |
| `CustomerDashboard.tsx` | `listJobs`, `acceptQuote` |
| `TradespersonDashboard.tsx` | `listJobs` |
| `JobExecution.tsx` | `updateJobStatus`, `confirmJobComplete` |
| `JobCompletion.tsx` | (review POST via api.ts new method) |
| `PaymentSettings.tsx` | `listMyPayments`, `getConnectStatus` |
| `PrivacySettings.tsx` | `deleteMe` |
| `StripeCheckoutWrapper.tsx` | `createSetupIntent` |
| `RealtorDashboard.tsx` | `getRealtorDashboard`, `addRealtorFavorite`, `removeRealtorFavorite`, `getRealtorTradespeoplePicker` |
| `AdminDashboard.tsx` | `listComplianceSubmissions`, `updateComplianceDecision`, `listFlaggedAccounts`, `applyResolution`, `getPlatformMetrics` |
