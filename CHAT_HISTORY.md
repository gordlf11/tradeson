# Chat History -- TradesOn

> Session log for all Claude Code and Claude.ai conversations on this project.
> **Both developers (Larry and Kevin) should log sessions here** so each partner's Claude has full context.
>
> Format: Add new sessions at the top. Include who ran the session (Larry/Kevin), what was done, decisions made, and next steps.

---

<!-- Add new sessions at the top. Template:

## YYYY-MM-DD -- [Developer] -- [Session Title]
- [What was done]
- [Decisions made]
- [Next steps]
-->

## 2026-05-26 to 2026-05-28 -- Larry (Claude Opus 4.7) -- Pre-touchbase production push: FCM live, Trusted Badge shipped, all of Kevin's blockers closed

### What was done

**Auth & access (closes long-standing CLAUDE.md items)**
- VAPID key baked into the bundle via Dockerfile ENV → `getToken()` finally succeeds → `users/{uid}.fcmToken` writes confirmed end-to-end (Claude in Chrome smoke test PASS). FCM round-trip fan-out works.
- Role switcher in TopNav + AdminDashboard avatar dropdown (`src/components/RoleSwitcherMenu.tsx`). Closes the Admin Portal dead-end. Admin row only renders when the Firebase ID token carries `admin: true`.
- `contact@tradeson.io` provisioned as third admin via new `scripts/inviteAdmin.mjs` (creates Firebase Auth user + sets admin claim + generates password-reset link in one shot). Alongside `larryfgordon89@gmail.com` and `kevinbradfo@gmail.com`.
- `Demo.tsx` fix: now signs out the live Firebase session before flipping `demoMode`, so `/demo` works correctly even when a real user is already signed in.
- `/forgot-password` flow confirmed already built end-to-end (CLAUDE.md tracker was stale on that one).

**Trusted Badge — built, shipped, verified (CLAUDE.md scope #1 — closed)**
- Spec: `docs/TradesOn Trusted Badge.docx`. 4 swipe cards + completion screen, ~2 min, boost-only ranking on quote lists. NOT a gate.
- Schema: `tradesperson_profiles.trusted_badge_earned_at TIMESTAMPTZ` (migration applied to prod via `scripts/run_trusted_badge_migration.mjs`; gitignored — uses live PG password).
- API: `POST /api/v1/onboarding/trusted-badge/complete` — idempotent (COALESCE preserves the original earn time). Quote-list query now LEFT JOINs the trusted flag and orders `Trusted DESC, rating DESC, price ASC`.
- Frontend: `/onboarding/trusted-badge` (4 cards + completion, swipeable on mobile, Skip on each card). Inserted at the end of both Licensed and Unlicensed tradesperson onboarding flows. `TrustedBadgePill` component (light/dark/compact) rendered on TradespersonDashboard hero + JobBoard quote cards. Demo mode: Volt Masters Electric tagged trusted so the pill is visible without real onboarding.
- Claude in Chrome end-to-end test: 6/7 PASS (Step 7 "blocked" because /demo was buggy at the time — now fixed).

**Backend: onboarding_completed + referrals (CLAUDE.md items #1 and #7)**
- Migration applied: `users.onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE` + `users.referred_by_realtor_id UUID` + FK to `realtor_profiles(id)` + partial index.
- 3 existing tradesperson/homeowner accounts backfilled to `onboarding_completed=TRUE` (those with role-profile rows).
- All 5 `POST /api/v1/onboarding/{role}` handlers now set `onboarding_completed=TRUE` in their transaction.
- `PUT /api/v1/users/me` accepts `onboarding_completed`.
- `POST /api/v1/users` accepts `referred_by_code` → resolves via `realtor_profiles.referral_code` → stamps `users.referred_by_realtor_id`. Soft failure if code unknown.

**CORS fix (was silently breaking every API call from app.tradeson.io)**
- The 2026-05-20 custom-domain rescue moved the frontend to `app.tradeson.io` but never updated the API CORS allowlist. Result: every POST from prod returned "Failed to fetch". Larry only noticed during testing today ("Could not post job").
- Added `app.tradeson.io`, `www.tradeson.io`, `tradeson.io` to the allowlist in `api/src/index.ts`.

**Auto-release Cloud Scheduler (CLAUDE.md item #8)**
- Generated `INTERNAL_SECRET`, stored in Secret Manager as `tradeson-internal-secret`, bound via `api/cloudbuild.yaml --set-secrets` line. Service account `63629008205-compute@developer` already has project-level Secret Manager Accessor.
- Cloud Scheduler API enabled. Job `release-expired-payment-holds` created in `us-central1`, schedule `*/30 * * * *` UTC, POSTs to `/api/v1/internal/release-expired-holds` with the `x-internal-secret` header. Verified live with `curl` returning 200.

**Kevin's three blockers — all closed today**
- Item 1 (Firestore rules + indexes deploy): `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project tradeson-491518`. Includes new COLLECTION_GROUP composite on `messages(recipientUID ASC, readAt ASC)` — required for unread badge.
- Item 2 (`GET /api/v1/jobs/:id` JOIN): now returns `homeowner_firebase_uid`, `assigned_tradesperson_firebase_uid`, `customer_name`, `tradesperson_name`, `tradesperson_phone`. Note Kevin's email used `j.customer_id`; actual column is `j.homeowner_user_id` (translated).
- Item 3 (server-side `tracking/{jobId}` creation): wired into `POST /api/v1/quotes/:id/accept`. Pulls both Firebase UIDs in one JOIN, calls `firestore.collection('tracking').doc(jobId).set({...}, { merge: true })` via Admin SDK. Non-fatal on failure. Kevin now clear to flip `OnMyWayControls` to `updateDoc` + tighten the create rule to `allow create: if false`.

**GCP — grant tracking & infra**
- AI Microgrant decision: deploy the full $3K on the GCP project (defensible under Elevate's "AI integration" clause). Cloud Run, Cloud SQL, Pub/Sub, Storage, Cloud Build buckets all labeled `funded_by=elevate-microgrant-2026`. New Secret Manager secret labeled the same.
- Cloud SQL `tradeson-db` label NOT applied (gcloud doesn't expose the flag on `sql instances patch`) — needs Console UI, ~30 sec.
- Billing budget alert created: $200/mo on `tradeson-491518`, thresholds at 50% / 80% / 100% / 120% of current+forecasted spend. Notifications go to billing-admin emails by default.
- Discovered two legacy services: `sbs-digital-demo` (not TradesOn, deployed 2026-04-10) and `tradeson` (old name for the frontend, last deploy 2026-03-27 from SHA `d1cf262b`). Both respond 200 but appear orphaned. Pending Larry's confirmation to delete.

### Decisions
- **Grant funding**: full $3K to GCP infrastructure, tagged in books as `elevate-microgrant-2026`, $200/mo cap. Tax reserve ~$800 separate. Progress report due 2026-11-26, final 2027-05-26.
- **Sales tax**: TradesOn registers as marketplace facilitator with SD DOR (Skylar to call ref # L-05202026-0813-1), integrates Stripe Tax with `automatic_tax: enabled`. Matches Uber/DoorDash model. ~3-4 dev days post-confirmation. EPath portal: https://sd.gov/EPath.
- **Trusted Badge**: boost-only enforcement at launch (non-Trusted can still quote, just rank lower). Soft requirement at 30 days deferred to v1.1.
- **Profile switching**: multi-role-on-one-account model (not multi-account). Role state in localStorage today; server-side `user_roles` junction deferred.
- **/demo route**: should always sign out the live session first. Bug found mid-session, fixed same session.

### Notable findings
- `larryfgordon89@gmail.com` AND `kevinbradfo@gmail.com` both carry `admin: true` claim — surfaced by Step 5 of the messaging smoke test (thread delete succeeded despite the rule saying admin-only). Intentional for now; means both have full Firestore admin powers. `admin@tradeson.com` is NOT admin (would have failed every Firestore read had Larry tried).
- Cloud Run admin routes (`/api/v1/admin/*`) don't currently check the admin claim — gap worth closing soon. Right now anyone with a Firebase token could potentially call them.
- gcloud is broken on Larry's machine — wrapper hardcodes Python 3.13 which doesn't exist; using `CLOUDSDK_PYTHON=/opt/homebrew/bin/python3.12` as override. Permanent fix is one zshrc line or `brew reinstall google-cloud-sdk`.
- Cloud SQL public IP allowlist had a stale entry; added Larry's current public IP `104.244.243.90/32` alongside `172.59.185.162/32`. Password rotated since the marathon — fetched current `123trades` from `gcloud secrets versions access latest --secret=tradeson-db-pass`.

### Next steps
- Kevin: flip `OnMyWayControls` `setDoc` → `updateDoc`; tighten tracking create rule to `allow create: if false`. Both small now that server-side seeding is in.
- Larry (Console-only, ~5 min total):
  - Firebase Console → Authentication → Settings → Authorized domains → add `app.tradeson.io` + `www.tradeson.io`. Required for future password-reset/email-link continueUrls to point at the app.
  - Cloud SQL → `tradeson-db` → Edit → Labels → `funded_by=elevate-microgrant-2026`.
  - Decide: delete `sbs-digital-demo` and `tradeson` (legacy) Cloud Run services? Both respond 200 but are not used.
  - Run the password-reset Claude-in-Chrome test (signed-out flow only; do NOT click any email link).
- Skylar: call SD DOR (1-800-829-9188, ref L-05202026-0813-1) to register TradesOn as marketplace facilitator. Send the Tokio Marine HCC TechGuard application using `docs/backend/TECH_GUIDE.pdf` as Exhibit A.
- All: touchbase tomorrow — three decisions on the table (sales tax registration, Trusted Badge enforcement, ~3-week soft launch target).

### CLAUDE.md priority list status after this session
- ✅ #1 `onboarding_completed` — shipped
- ✅ #2 `support_tickets` Firestore rule — shipped + redeployed
- ✅ #3 Account deletion endpoint — already done (Kevin, dd0152d)
- ✅ #4 Job query authorization gap — already done (Kevin, dd0152d)
- ✅ #5 `support_tickets` UID rule — already done (Kevin, dd0152d)
- ⏳ #6 Nightly flagged accounts auto-population — not started
- ✅ #7 Referral backend — shipped
- ✅ #8 Auto-release Cloud Scheduler — shipped

---

## 2026-05-27 -- Kevin (Claude Sonnet 4.6) -- HANDOFF TO LARRY: Firestore deploy required + WS3 server-side blocker

> **LARRY — READ THIS FIRST.** This entry is a direct handoff. The three workstreams below are built and pushed to master. Two actions are required from you before the messaging unread badge and live tracking are production-safe.

### What Kevin shipped today (WS1–WS3)

**WS1 — Messaging schema + unread badge**
- Message schema: `read: boolean` → `recipientUID: string, readAt: Date | null` across `messagingService.ts`, `MessagingModal.tsx`, Firestore rules
- `markThreadRead(threadId, currentUID)` — batch-updates `readAt` on unread messages addressed to the current user
- `subscribeToUnreadCount(userId, callback)` — nested Firestore listeners; sums unread across all user threads
- `MessagingModal.tsx` — calls `markThreadRead` on open; writes `recipientUID` with every outbound message
- `App.tsx` BottomNav — `UnreadBadge` on messaging icon for all four role variants

**WS2 — Admin Dashboard live data**
- Audit log + support tickets: one-time `getDocs` → `onSnapshot` real-time listeners
- Metrics section: 30s interval polling against Postgres API; `LiveDot` + `LastUpdatedLabel` components

**WS3 — Live GPS tracking**
- `JobTrackingMap.tsx` (new): Leaflet + OSM; `onSnapshot` to `tracking/{jobId}`; smooth van animation; Haversine distance; stale-location warning; status banners; tradesperson info card with tel: link
- `OnMyWayControls`: geolocation guard; "I'm On My Way" → GPS stream → `setDoc tracking/{jobId}`; "I've Arrived" → `updateDoc status: arrived`; `GeoPermissionBanner` with per-browser re-enable instructions
- Both views wired with real `JobData` from route param + `api.getJob(jobId)`; demo mode falls back to `MOCK_JOB`
- App.tsx: `/job-day-of` → `/job-day-of/:jobId?` (optional param preserves demo mode)

**Tests + Vitest**
- Vitest installed; `vite.config.ts` uses `vitest/config`; jsdom + jest-dom
- `haversinemiles.test.ts` (5 unit tests), `GeoPermissionBanner.test.tsx` (5 UI tests) — all pass

### 🔴 Action required from Larry: Firestore deploy

These changes are committed to master but **not yet deployed** to Firestore:

**1. Firestore rules** (`firebase/firestore.rules`) — two changes:
- `tracking/{jobId}` get rule: added `|| resource == null` guard so the poster's `onSnapshot` doesn't permission-error before the tracking doc exists
- Message update rule: `changedKeys().hasOnly(['readAt'])` replaces the old `['read']`
- `support_tickets` collection rule is now in the file (covers Larry priority list items 2 + 5)

**2. Firestore index** (`firebase/firestore.indexes.json`) — new COLLECTION_GROUP index:
- `messages(recipientUID ASC, readAt ASC)` — without this, `subscribeToUnreadCount` and `markThreadRead` fail silently; unread badge never updates

**Deploy command** (from tradeson repo root):
```bash
./node_modules/.bin/firebase login        # skip if already authenticated
./node_modules/.bin/firebase deploy --only firestore:rules,firestore:indexes
```

### Item 9 — Server-side tracking doc creation (WS3 blocker)

Full code snippet is in CLAUDE.md under **Larry priority list item 9**. Short version:

On quote acceptance (`PATCH /api/v1/quotes/:id/accept`), use the Admin SDK to write the initial `tracking/{jobId}` doc:
```ts
await adminDb.collection('tracking').doc(jobId).set({
  jobId, tradespersonUID: tradesperson_firebase_uid, posterUID: homeowner_firebase_uid,
  participants: [homeowner_firebase_uid, tradesperson_firebase_uid],
  lat: null, lng: null, status: 'accepted',
  enRouteAt: null, arrivedAt: null, updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
```

**Once item 9 ships, Kevin will immediately do (5-minute change):**
1. `OnMyWayControls.handleOnMyWay()`: `setDoc(..., { merge: true })` → `updateDoc(...)`
2. `tracking` create rule: `allow create: if isSignedIn()...` → `allow create: if false`

Just ping Kevin when item 9 is deployed.

### Kevin's remaining backlog (post-Larry item 9)
- Dashboard "Track Job" nav links → `/job-day-of/${job.id}` (blocked on data layer wiring)
- WS3E Firestore emulator tests (blocked on emulator setup)

---

## 2026-05-27 -- Kevin (Claude Sonnet 4.6) -- WS1–WS3: Messaging schema, Admin live data, Live GPS tracking

### What was done

**Git sync**
- Merged remote `origin/main` + `origin/master` into local `master`; resolved three-way conflicts in `CLAUDE.md`, `docs/DATABASE_SCHEMA.md`, and `api/src/routes/jobs.ts` (kept Larry's naming: `homeowner_firebase_uid`, `assigned_tradesperson_firebase_uid`)
- Committed uncommitted changes in `api/src/routes/jobs.ts` (field aliases for dashboard filters) and pushed everything to GitHub

**WS1 — Real-time in-platform messaging** (commit `2f4e062`)
- **Message schema**: replaced `read: boolean` with `recipientUID: string` and `readAt: Date | null` across `messagingService.ts`, `MessagingModal.tsx`, and Firestore rules
- `sendMessage`: now accepts and writes `recipientUID` per message
- `markThreadRead(threadId, currentUID)`: batch-updates `readAt` on all unread messages addressed to current user
- `subscribeToUnreadCount(userId, callback)`: nested `onSnapshot` across user's threads → sums unread per thread → fires total
- `MessagingModal.tsx`: calls `markThreadRead` on thread open and on new message; sends `otherUserId` as `recipientUID`; race-condition guard (`cancelled` flag)
- `App.tsx` BottomNav: unread badge (`UnreadBadge`) added to messaging nav item for all four role variants; subscribes to `subscribeToUnreadCount(firebaseUser?.uid, setUnreadCount)`
- Firestore rules: message update `changedKeys → ['readAt']`; `tracking/{jobId}` field-level control (tradesperson may only write `lat, lng, updatedAt, status, enRouteAt, arrivedAt`)

**WS2 — Admin Dashboard live data** (commit `3132600`)
- `AuditLogSection` + `SupportSection`: converted from one-time `getDocs` to `subscribeToAuditLog` / `subscribeToSupportTickets` with `liveActive/liveError/updatedAt` state per section
- `MetricsSection`: 30s `setInterval` polling for Postgres-backed metrics (no Firestore mirror); live indicator state; fires immediately on mount
- `LiveDot` component: green pulse (active), red (error), grey (inactive)
- `LastUpdatedLabel` component: "Updated Xs ago" with 1s tick in each section header
- Removed unused `getSupportTickets` import

**WS3 — Live job tracking** (commit `27459f4`)
- **`JobTrackingMap.tsx`** (new Leaflet + OpenStreetMap component):
  - Subscribes to `tracking/{jobId}` via `onSnapshot`; smooth van animation via `requestAnimationFrame` lerp over 2s
  - Geocodes job address with Nominatim (no API key); stale-location warning >3 min while en_route
  - STATUS_BANNER by jobStatus; Haversine distance; tradesperson info card with tel: link + message button
- **`OnMyWayControls`** (added to `JobDayOf.tsx`):
  - HTTPS + `navigator.geolocation` guard on mount; real `navigator.permissions.query` for permission state
  - "I'm On My Way" → `getCurrentPosition` → `setDoc tracking/{jobId}` → `watchPosition` continuous updates
  - "I've Arrived" → `clearWatch` → `updateDoc status: arrived`
  - `GeoPermissionBanner`: per-browser re-enable instructions (Chrome/Edge/Firefox/Safari)
  - Low-accuracy warning at >100m
- **`TradespersonView`** now renders `<OnMyWayControls>` (only when `state === 'waiting'`)
- **`JobPosterView`** now renders `<JobTrackingMap>` with demo buttons to simulate `en_route`/`arrived` states
- Leaflet dep: `leaflet@^1.9.4` + `@types/leaflet@^1.9.21`
- Firestore rules: `tracking/{jobId}` locked to field-level writes; participants array gates poster reads

### Decisions
- Used `tracking/{jobId}` Firestore collection (not `jobs/{jobId}`) — `jobs` is admin-only (PG is source of truth); `tracking` was pre-provisioned with appropriate rules
- Leaflet + OSM chosen over Mapbox GL JS (no existing map library; TODO to upgrade for Directions API / driving ETA)
- Firebase UIDs (not PG UUIDs) in `participants` array — Firestore security rules check `request.auth.uid`
- Demo controls for tracking states isolated from real Firestore state so demo never writes real data

### Next steps (WS3 incomplete items)
- Replace mock `jobId="mock-job-001"` and `participants` with real data from route params once data layer is wired (Larry's WS: JobBoard → api.ts)
- WS3E: Write tests — unit (haversinemiles), integration (Firestore emulator), security rule test, UI test
- Larry: `POST /api/v1/jobs/{id}/tracking` endpoint to create the initial `tracking/{jobId}` doc server-side on quote acceptance
- Consider upgrading `JobTrackingMap` from Leaflet/OSM to Mapbox GL JS for driving ETA (Directions API)
- `onMessageClick` in `JobPosterView` should open `MessagingModal` with real thread — wire once job data is available

---

## 2026-05-17 to 2026-05-20 -- Larry (Claude Opus 4.7) -- Marathon: pre-test stabilization + custom domain + messaging fix

### What was done
**Pre-test cleanup (2026-05-10 to 2026-05-13)**
- Backend technical guide drafted at `docs/backend/TECH_GUIDE.pdf` covering ERD, Pub/Sub architecture, CRUD events, and full security posture (mapped section-by-section to Tokio Marine HCC TechGuard cyber liability application — draft filled locally, not in repo)
- Generated `testing-guide.html` + `backend-architecture.html` in `docs/testing/` for the in-person session with Kevin; reachable via GitHub Pages at `https://gordlf11.github.io/tradeson/testing/testing-guide.html`
- Verified the Pub/Sub → `fcm-fanout` Cloud Function path end-to-end (4/4 events round-trip)

**Production data wipe (2026-05-13)**
- Wiped 10 Firestore collections (`threads`, `reviews`, `audit_log`, `support_tickets`, `jobs`, `quotes`, `compliance_submissions`, `flagged_accounts`, `platform_metrics`, `users`) via `firebase firestore:delete -r --force`
- Truncated Postgres: 13 tables via `TRUNCATE ... CASCADE`, then `DELETE FROM users WHERE role <> 'admin'` (kept Larry's admin row intact)
- Aggressive Firebase Auth cleanup: deleted 36 dummy identities via `admin.auth().deleteUsers([...])`, preserved only `larryfgordon89@gmail.com` and `kevinbradfo@gmail.com`

**Production bug fixes (2026-05-17 to 2026-05-19)**
- Fixed `routes/jobs.ts` `42P18` bug — dropped unused `null` $2 placeholder in 4 query branches; `GET /jobs` no longer 500s
- Fixed `jobs_job_nature_check` constraint mismatch — schema accepted legacy values (`Cosmetic / Routine Maintenance / Repair / Fix / Renovation / Other`) but frontend sent new values (`Repair / Maintenance / New Install / Replacement`). Replaced constraint live + in `migration.sql`
- **Messaging fix (commit `ef9273e`)**: `MessagingModal` was being passed `userProfile.id` (PG UUID) when Firestore rules check `request.auth.uid` (Firebase UID). Created `assigned_tradesperson_firebase_uid` + `homeowner_firebase_uid` projections in API JOIN queries and re-wired `CustomerDashboard.tsx` + `TradespersonDashboard.tsx` to pass `firebaseUser.uid` and the counterparty's Firebase UID
- Resynced Postgres password three times after Console-side rotations broke Cloud Run; rotation now locked to my 3-command sequence (see memory)

**Custom domain rescue (2026-05-20)**
- Discovered `app.tradeson.io` was mapped to `tradeson-app` in the **`frankly-data`** project (stale build from 2026-03-16), not the live `tradeson-491518` service
- Swapped both `app.tradeson.io` and `www.tradeson.io` mappings to `tradeson-491518/tradeson-app`; new certs issued; bundle hashes now match `*.run.app`

**Theme work (2026-05-19)**
- Added opt-in "nude" palette behind `?theme=nude` URL param / `localStorage.setItem('theme','nude')`. Default look unchanged. Defined in `src/index.css` `[data-theme="nude"]` block; bootstrap runs in `src/main.tsx` before React mounts

### Decisions
- **Don't rotate Postgres password via GCP Console** — always use the 3-command secret-sync sequence (memory file: `postgres_password_rotation.md`)
- **`frankly-data` is an orphan project** — all deploys go to `tradeson-491518`; consider deleting frankly-data after a week of clean operation
- **No auto Cloud Build trigger exists** — deploys are manual `gcloud builds submit`; Husky pre-push hook gates builds on TypeScript + Vite success
- **Kept my naming over Kevin's** for the messaging fix (we collided on the same bug in parallel) because API SELECT aliases were already deployed with my version; functional parity, naming was cosmetic
- **Nude theme stays opt-in** — Larry tried it and confirmed default should stay

### Next steps
- Kevin to test full Compare Quotes → Schedule → Day-of Messaging flow on `app.tradeson.io` (now serving latest); confirm messages persist between him and a homeowner test account
- Skylar to review the cyber liability application draft before submission (gaps documented in §7)
- Wire FCM token storage on login (`users/{uid}.fcmToken` in Firestore) — server-side fan-out is ready but no tokens are being stored
- Decide whether to delete `frankly-data` GCP project once a week passes without incident
- Optional: implement the "inline accept" UX (single-quote jobs show price + Accept button on the card, no modal) — spec drafted in chat

---

## 2026-03-29 -- Larry -- Database Architecture & Schema Documentation

### Decisions Locked (All 6)
1. **Cloud SQL (PostgreSQL)** for transactional data + **BigQuery** for analytics (Phase 1D only)
2. **Firebase Auth** + Cloud SQL (PostgreSQL) — NOT Firestore, NOT Supabase
3. **Multi-role users** — one `users` record per email, `user_roles` junction table, active role is session-scoped via JWT custom claims
4. **Normalized schema** — base `users` table + role-detail profile tables (homeowner, tradesperson, realtor, property_manager)
5. **Flat brokerages** — `brokerages` entity with FK on `realtor_profiles`, no complex org tree until Phase 2+
6. **Compliance retention** — PostgreSQL for active records, BigQuery archive in Phase 1D. Identity/license 7yr, insurance 5yr, audit 7yr

### What Was Done
- Created `docs/DATABASE_SCHEMA.md` — full database documentation with:
  - 22 tables covering all 49 PRD screens
  - Mermaid ERD with all entities, relationships, and cardinality
  - Detailed field definitions (types, constraints, descriptions) for every column
  - Screen-to-table mapping (S-01 through S-49)
  - Index strategy for all critical queries
  - Data retention policy
  - BigQuery Phase 1D streaming plan
- Updated `CLAUDE.md` Tech Stack section with locked architecture decisions
- Removed references to Firestore/Supabase from tech stack

### Key Schema Areas
- Identity & Auth: `users`, `user_roles`
- Role Profiles: `homeowner_profiles`, `tradesperson_profiles`, `realtor_profiles`, `property_manager_profiles`
- Brokerage: `brokerages`
- Properties: `properties`
- Job Lifecycle: `jobs`, `job_photos`, `job_status_history`, `quotes`, `scope_changes`
- Scheduling: `appointments`, `time_slot_proposals`, `availability_templates`, `availability_exceptions`
- Payments: `payment_methods`, `transactions`, `invoices`
- Compliance: `compliance_records` (never soft-deleted)
- Support: `support_tickets`, `support_messages`
- Audit: `audit_log` (append-only, no updates, no deletes)

### Next Steps
- Kevin: Review `docs/DATABASE_SCHEMA.md` and flag any concerns
- Larry: Set up Cloud SQL instance in GCP project `frankly-data`
- Larry: Create SQL migration files from schema doc
- Larry: Wire up Firebase Auth → Cloud SQL user creation flow

---

## 2026-03-29 -- Larry -- Project Setup and Chat History Integration
- Added CHAT_HISTORY.md to project root for portable session logging between partners
- Updated CLAUDE.md to incorporate chat history workflow into dev process
- Both Larry and Kevin should log sessions here so each partner's Claude instance has full project context
- Next steps: Kevin to pull latest and begin logging his sessions
