# 🤖 Claude Development Assistant Configuration

## Welcome to the TradesOn Platform

This file configures your Claude instance to work on the **TradesOn** platform — a two-sided marketplace connecting homeowners, realtors, and property managers with verified tradespeople for home repairs and maintenance.

## 🚀 Session Start Questions

When you read this file, please ask the developer:

1. **Role Confirmation**: Are you Kevin or Larry?
   - Kevin → frontend, onboarding, UI/UX, payments
   - Larry → backend, auth wiring, Firestore integration, API
2. **Today's Focus**: What specific screen, feature, or infrastructure item are we working on?
3. **Environment Access** (confirm as needed):
   - GCP Project: `frankly-data` (project ID: `tradeson-491518`)
   - GitHub: https://github.com/gordlf11/tradeson.git
   - Firebase Console: https://console.firebase.google.com (project: `tradeson-491518`)
   - Stripe test keys in `.env` (set — see `.env.example` for full list)
   - Figma designs: [Request access from team]

---

## 📋 Project Overview

**TradesOn** is a two-sided marketplace that:
- Connects homeowners, realtors, and property managers with verified tradespeople
- Handles end-to-end job lifecycle: intake → quote → schedule → execute → payment
- Uses AI (Vertex AI / Gemini) to analyze job requests and estimate costs
- Enforces compliance via identity verification, license checks, and insurance validation

### Actual Tech Stack (as built)
- **Frontend**: React 18 + TypeScript + Vite (NOT Next.js)
- **Styling**: Inline CSS with CSS custom properties (`var(--primary)`, etc.) — no Tailwind, no CSS modules
- **Routing**: React Router v6 (`BrowserRouter`, `Routes`, `Route`)
- **Icons**: Lucide React
- **Auth**: Firebase Auth (wired in `src/services/firebase.ts`, `src/contexts/AuthContext.tsx`)
- **Transactional DB**: **Cloud SQL (Postgres)** — source of truth for users, jobs, quotes, bookings, compliance, reviews, payments. Accessed via `src/services/api.ts` → Cloud Run API (`api/` dir).
- **Real-time DB**: **Firestore** — scoped to messaging threads + messages. Reserved for future live collaboration (tracking, typing indicators). Project: `tradeson-491518`.
- **Real-time UX glue**: **FCM push notifications** — deliver the "feels real-time" UX for bids, acceptance, scheduling, messages. Triggered by Cloud Run after PG writes via Pub/Sub.
- **Analytics**: **BigQuery** — PG → BQ via Datastream (CDC); Firestore → BQ via the Firestore-to-BigQuery Firebase Extension.
- **File Storage**: Firebase Storage (photos, insurance docs, government IDs)
- **AI**: Google Vertex AI / Gemini Flash (mocked in UI — not yet wired)
- **Payments**: Stripe (per-job payments via direct charge) + Stripe Connect Express (tradesperson payouts). **No subscriptions — platform takes 10% fee per completed job.**
- **Cloud**: GCP Cloud Run (production) + Cloud Build (CI/CD)
- **Container**: Docker multi-stage build → nginx serves on port 8080

### File Structure (actual)
```
/tradeson
├── src/
│   ├── pages/              # All screen components (one file per screen)
│   ├── components/         # Reusable components
│   │   ├── ui/             # Button, Card, Badge, Input, etc.
│   │   ├── TopNav.tsx      # Role-aware top navigation bar
│   │   ├── MessagingModal.tsx  # Real-time chat (Firebase)
│   │   └── Logo.tsx        # TradesOn logo (uses public/logo.png)
│   ├── services/
│   │   ├── firebase.ts     # Firebase app init (auth, db, analytics, FCM)
│   │   ├── messagingService.ts  # Firestore messaging helpers
│   │   ├── api.ts          # API service layer
│   │   └── mockData.ts     # Synthetic data (pre-Firestore wiring)
│   ├── App.tsx             # Router + BottomNav + role routing
│   └── index.css           # Global CSS variables and base styles
├── public/
│   └── logo.png            # TradesOn brand mark (orange wrench+check)
├── scripts/
│   └── seedFirestore.mjs   # Seeds all Firestore collections (run once)
├── Dockerfile              # Multi-stage build: Node 20 + nginx
├── cloudbuild.yaml         # GCP Cloud Build pipeline config
└── CLAUDE.md               # This file
```

---

## 🏗️ Architecture — Where Data Lives and How Real-Time Works

**TradesOn splits data across three stores, each chosen for cost, latency, and consistency fit. Do not migrate data between them without updating this section first.**

### Split

| Store | What lives here | Why |
|---|---|---|
| **Cloud SQL (Postgres)** | Users, jobs, quotes, bookings, compliance, reviews, payments, audit log | Transactional, relational, strong consistency. Predictable cost curve. Accessed via Cloud Run API (`api/` dir). |
| **Firestore** | Messaging threads + messages only (today). Reserved for future live-tracking / typing indicators. | Sub-second collaboration where `onSnapshot` pays off. Expensive for broadcast reads so we keep the surface small. |
| **BigQuery** | Analytics, admin dashboards, funnel metrics, retention | Read-heavy analytics decoupled from the hot path. Fed by Datastream (PG) and the Firestore→BQ Extension (messaging). |

### Real-time UX mechanism

**The real-time "feel" for bids, acceptance, scheduling, and status updates is delivered by FCM push notifications, not by Firestore listeners.**

Flow for a new quote:
1. Tradesperson submits → `POST /api/v1/quotes` → Cloud Run → writes to Postgres
2. Cloud Run publishes `quote.submitted` to Pub/Sub
3. Cloud Function consumes → FCM push to customer's devices
4. Customer's app refreshes the job detail via `GET /api/v1/jobs/:id/quotes`

Total perceived latency: ~300–600ms. No Firestore listener cost that scales with active user count.

**The only place we use live Firestore listeners is in-thread messaging** (`messagingService.subscribeToMessages`), because typing/delivery latency matters there. Everywhere else is "push-triggered refresh."

### Rules of thumb

- **New transactional data → Postgres via `api.ts`.** If you're tempted to write a new Firestore collection for a job-lifecycle event, stop and add a route to the Cloud Run API instead.
- **New real-time feature → FCM first.** Only reach for a Firestore `onSnapshot` if you genuinely need sub-second bidirectional updates (like messaging or live location).
- **No dual-writes.** Writing the same entity to both PG and Firestore creates consistency bugs and 2× cost. One source of truth per entity, always.
- **Design every Cloud Run write to emit a Pub/Sub event** (or be ready to). That event is what downstream consumers (FCM, BigQuery sync, future workflows) hook into. This is the cheapest way to stay BigQuery-ready without building the pipeline yet.

### BigQuery — documented, not yet wired

The pipeline isn't deployed yet, but the architecture is forward-compatible so it can be enabled without app changes:

- **Firestore → BigQuery**: enable the official [Firestore-to-BigQuery Extension](https://extensions.dev/extensions/firebase/firestore-bigquery-export) on the `threads` + `messages` collections. Zero code change.
- **Postgres → BigQuery**: enable [Datastream](https://cloud.google.com/datastream/docs) with the `tradeson-491518` Cloud SQL instance as source. Streams CDC to BigQuery with ~seconds of lag. Configure once; app-level changes are unnecessary because all writes already go through Cloud Run.
- **Cloud Run emits Pub/Sub events on every write** (TODO: wire this in each route). Even before BigQuery is enabled, this keeps the architecture ready — consumers can attach later without retrofitting routes.

Admin dashboards eventually query BigQuery (or a cached Postgres rollup), not Firestore or PG directly. Until BQ is wired, admin pages read from the Cloud Run API with aggressive caching.

---

## 🚀 Scale Target: 10,000+ Users — Launch Readiness Tracker

This section tracks every item required to take TradesOn from demo to a production platform capable of handling 10,000+ users. Each item has an owner, priority, and status. Claude should reference this list at the start of every session and update statuses as items are completed.

**Status key:** `[ ]` Not started · `[~]` In progress · `[x]` Complete

---

### 🔴 CRITICAL — Blockers (App cannot safely launch without these)

#### Authentication & Session Management
- [x] **Wire Firebase Auth login** — real `signInWithEmailAndPassword` in `Login.tsx` via `AuthContext.login` · *Larry*
- [x] **Wire Firebase Auth signup** — real `createUserWithEmailAndPassword` in `Signup.tsx` + PG user row via `api.createUser` · *Larry*
- [x] **On login, load user profile** — `AuthContext` calls `api.getMe()` (Postgres) on auth state change · *Larry*
- [x] **Auth guard on all protected routes** — `RequireAuth` wrapper in `App.tsx` on all `/dashboard/*`, `/onboarding/*`, `/job-*`, `/settings`, etc. · *Larry*
- [x] **Persist session across page refresh** — Firebase Auth default persistence (`browserLocalPersistence`) handles this · *Larry*
- [x] **Remove debug tools from Login page** — deleted the "Debug:" line and "Reset User State" button · *Kevin*

#### Firestore Security Rules (scope: messaging + admin-only collections)
- [x] **threads + messages** — only thread participants can read/write; deployed · *Larry*
- [x] **reviews** — authenticated users create their own; admin updates/deletes; deployed · *Larry*
- [x] **audit_log** — authenticated users create; admin reads; deployed · *Larry*
- [x] **jobs / quotes / compliance / flagged / platform_metrics** — locked to admin-only (clients reach these via Cloud Run API, not Firestore) · *Larry*
- [x] **Legacy collections locked down** — `messaging_threads`, `conversations` (pre-architecture-split residue) admin-only · *Larry*
- [x] **Default deny** on unknown paths · *Larry*
- [ ] **Admin custom claim** — set `admin: true` on admin Firebase Auth user via Admin SDK; rules already check `request.auth.token.admin == true` · *Larry*

#### Data Layer — Replace Mock Data with Cloud Run API (`api.ts`)
**Source of truth is Postgres. All jobs/quotes/user reads go through `src/services/api.ts`. Do NOT add Firestore collections for these.**
- [ ] **JobBoard (`JobBoardEnhanced.tsx`)** — replace `mockJobs` with `api.listJobs({ status: 'open' })`; tradespersons filter by their trade categories client-side · *Larry*
- [ ] **CustomerDashboard** — replace mock with `api.listJobs({ customerId: currentUser.uid })` · *Larry*
- [ ] **TradespersonDashboard** — replace mock with `api.listJobs({ acceptedTradespersonId: currentUser.uid })` · *Larry*
- [ ] **Quote submission** — wire `QuoteSubmissionModal` to `api.submitQuote(jobId, data)` · *Larry*
- [ ] **Quote acceptance** — wire accept action to `api.acceptQuote(quoteId)` · *Larry*
- [ ] **Job creation** — wire `JobCreation.tsx` submit to `api.createJob(formData)` · *Larry*
- [ ] **Admin dashboard** — add admin-only API routes (or BigQuery-backed) for compliance, flagged, audit, metrics; replace mock arrays · *Larry*
- [ ] **Reviews** — migrate `submitReview()` from Firestore to a new `api.submitReview()` route; load via `api.listReviews(tradespersonId)` · *Larry*
- [x] **Run Firestore seed script** — seeded to `tradeson-491518` for messaging/review/audit collections · *Larry*

#### Real-Time UX via FCM (Critical — replaces Firestore listeners for non-messaging events)
- [ ] **FCM service worker** — register `firebase-messaging-sw.js` in `public/` for background push · *Kevin*
- [ ] **Store FCM token on login** — save to `users/{uid}.fcmToken` in Firestore (only client-writable field on users collection) · *Larry*
- [ ] **Cloud Run → Pub/Sub event emission** — every PG write in `api/` publishes `quote.submitted`, `quote.accepted`, `job.status_changed`, etc. · *Larry*
- [ ] **FCM fan-out Cloud Function** — Pub/Sub subscriber that reads user FCM tokens and sends push messages · *Larry*
- [ ] **Client foreground message handler** — `onMessage` listener in `AuthContext` or top-level hook; triggers data refresh + in-app toast · *Kevin*
- [ ] **Send notification on new quote** — customer gets push when tradesperson submits quote · *Larry*
- [ ] **Send notification on job accepted** — tradesperson gets push when their quote is accepted · *Larry*
- [ ] **Send notification on new message** — recipient gets push when they're not in the thread · *Larry*
- [ ] **Send notification on schedule confirmed/changed** · *Larry*
- [ ] **Send notification on compliance decision** — tradesperson gets push on approval/rejection · *Larry*

---

### 🟠 HIGH PRIORITY — Required for a Trustworthy Launch

#### File Uploads (Firebase Storage)
- [ ] **Job photos** — wire photo picker in JobCreation step 1 to upload to `gs://tradeson/jobs/{jobId}/photos/` · *Kevin*
- [ ] **Insurance certificate** — wire file upload in InsuranceUpload page to `gs://tradeson/compliance/{userId}/insurance/` · *Kevin*
- [ ] **Government ID** — wire file upload in tradesperson onboarding to `gs://tradeson/compliance/{userId}/govid/` · *Kevin*
- [ ] **Profile photo** — wire camera button in ProfileSettings to upload to `gs://tradeson/users/{userId}/avatar/` · *Kevin*
- [ ] **Firebase Storage security rules** — users can only write to their own path; compliance docs readable by admins only · *Larry*

#### Firestore Indexes (deployed — used by messaging today, pre-provisioned for jobs/quotes if ever needed)
**Note:** After the PG-vs-Firestore split, jobs/quotes queries don't actually run in Firestore. These indexes are kept so admin/analytics consumers can query Firestore mirrors without index errors if we ever enable the Firestore→BQ export.
- [x] **jobs (status, tradeId, createdAt desc)** · *Larry*
- [x] **jobs (customerId, status, createdAt desc)** · *Larry*
- [x] **jobs (acceptedTradespersonId, status, createdAt desc)** · *Larry*
- [x] **quotes (jobId, totalPrice asc)** · *Larry*
- [x] **quotes (tradespersonId, createdAt desc)** · *Larry*
- [x] **threads (participants array-contains, lastMessageAt desc)** — used by `messagingService.getUserThreads` · *Larry*
- [x] **reviews (tradespersonId, createdAt desc)** · *Larry*

#### Postgres (Cloud SQL) Indexes — TODO
- [ ] **jobs** — `(status, trade_id, created_at desc)`, `(customer_id, status, created_at desc)`, `(accepted_tradesperson_id, status, created_at desc)` · *Larry*
- [ ] **quotes** — `(job_id, total_price asc)`, `(tradesperson_id, created_at desc)` · *Larry*
- [ ] **reviews** — `(tradesperson_id, created_at desc)` · *Larry*

#### Payment Flow Completion
- [x] **Stripe webhook handler** — `account.updated`, `transfer.created` · *Kevin* (subscription events removed — no longer needed)
- [x] **Stripe Connect onboarding** — Express account creation, onboarding link, payout setup in all tradesperson onboarding flows · *Kevin*
- [x] **Per-job payment routes** — `direct-charge` (job poster pays) + `platform-payout` (transfer to tradesperson minus 10% fee) · *Kevin*
- [x] **Platform fee** — `PLATFORM_FEE_PERCENT=0.10` (10%), enforced in `/stripe/platform-payout` and `/stripe/direct-charge` · *Kevin*
- [ ] **Payout trigger** — wire `/api/v1/stripe/platform-payout` call on job completion · *Larry*
- [ ] **Payment history** — load real transaction records into CustomerDashboard Payment History section · *Larry*
- [ ] **Run Stripe migration** — `psql $DATABASE_URL -f api/src/schema/stripe_migration.sql` adds `stripe_customer_id` to users (needed for Connect flow) · *Larry*
- [x] **No Stripe products needed** — subscriptions removed; job payments use dynamic `amount_cents` · *Kevin*

#### Error Handling & Resilience
- [ ] **Error boundaries** — wrap `<JobBoard>`, `<CustomerDashboard>`, `<TradespersonDashboard>`, `<AdminDashboard>` in `<ErrorBoundary>` · *Kevin*
- [ ] **Loading skeletons** — add skeleton/spinner states for all Firestore data fetches (currently instant mock renders) · *Kevin*
- [ ] **Empty states** — confirm all lists handle zero results gracefully (job board, dashboard, reviews) · *Kevin*
- [ ] **Network failure handling** — show user-friendly message if Firestore read fails; retry logic for sends · *Kevin*

---

### 🟡 IMPORTANT — Needed Before 10K Users

#### AI Integration (Vertex AI / Gemini)
- [ ] **Job analysis endpoint** — Cloud Function or Cloud Run endpoint: POST `{title, description, category, severity}` → `{summary, estimatedCost, estimatedHours}` · *Larry*
- [ ] **Wire AI summary in JobCreation** — call endpoint in step 3; show real Gemini output instead of hardcoded mock · *Kevin/Larry*
- [ ] **AI cost guardrails** — cache analysis per job (don't re-call on page refresh); store result in Firestore · *Larry*

#### BigQuery Analytics (future — backwards-compatible, no app changes required)
- [ ] **Enable Firestore → BigQuery Extension** — install `firebase/firestore-bigquery-export` on `threads` + `messages` collections; no code change · *Larry*
- [ ] **Enable Datastream PG → BigQuery** — configure Datastream source on Cloud SQL instance `tradeson-491518`; CDC to BQ dataset · *Larry*
- [ ] **Admin dashboards read from BQ** — migrate AdminDashboard queries to BQ once pipelines are populated (until then, aggressive-cache the API) · *Larry*

#### Performance & Bundle Size
- [ ] **Route-level code splitting** — wrap all page imports in `React.lazy()` + `<Suspense>` in `App.tsx` · *Kevin*
- [ ] **Reduce bundle size** — currently 875KB (gzipped: 235KB); target <400KB gzipped with lazy loading · *Kevin*
- [ ] **Image optimization** — compress `public/logo.png`; use `loading="lazy"` on job photo thumbnails · *Kevin*
- [ ] **Firestore query pagination** — add `limit(20)` + "Load More" to JobBoard and dashboard lists · *Larry*

#### Mobile Polish
- [ ] **Safe area insets** — audit all screens for `env(safe-area-inset-*)` on iOS notch/home indicator · *Kevin*
- [ ] **Keyboard pushes content up** — ensure chat input and form fields scroll above keyboard on mobile · *Kevin*
- [ ] **Touch targets** — all tap targets minimum 44×44px (audit small icon buttons) · *Kevin*
- [ ] **No horizontal scroll** — test every screen in 375px viewport (iPhone SE) · *Kevin*
- [ ] **Pull-to-refresh** — add on JobBoard and dashboard lists · *Kevin*

---

### 🟢 LAUNCH ENHANCEMENTS — Nice-to-Have Before Full Rollout

#### User Experience
- [ ] **Forgot password flow** — wire Firebase `sendPasswordResetEmail` (link exists in Login page, currently goes to `/forgot-password` 404) · *Kevin/Larry*
- [ ] **Email verification** — send verification email on signup; block full access until verified · *Larry*
- [ ] **Onboarding progress persistence** — save onboarding state to Firestore so users can resume if they close the app mid-flow · *Kevin/Larry*
- [ ] **Review moderation** — admin can flag/hide reviews from the admin dashboard · *Kevin/Larry*
- [ ] **In-app notification bell** — show unread count for quotes, messages, compliance updates · *Kevin*

#### Tradesperson Experience
- [ ] **Earnings page** — real payout history from Stripe Connect; monthly earnings chart · *Kevin/Larry*
- [ ] **Availability calendar sync** — persist selected time slots to Firestore; customer sees available windows · *Larry*
- [ ] **License expiry alerts** — auto-flag tradesperson account 30 days before license/insurance expiry · *Larry*

#### Platform Operations
- [ ] **Rate limiting on Cloud Run** — configure Cloud Armor or nginx rate limiting (prevent abuse at scale) · *Larry*
- [ ] **Monitoring & alerting** — Cloud Monitoring dashboard; alert on Cloud Run error rate >1% or p99 latency >2s · *Larry*
- [ ] **Backup strategy** — enable Firestore automated daily backups to Cloud Storage · *Larry*
- [ ] **GDPR / Privacy** — "Delete my account" in PrivacySettings must actually delete user data from Firestore + Auth · *Larry*
- [ ] **Analytics events** — fire GA4 / Firebase Analytics events for key funnel steps (signup, first job, quote accepted) · *Kevin*

#### Infrastructure Scaling
- [ ] **Cloud Run min instances = 1** — prevents cold start latency for first user of the day · *Larry*
- [ ] **Cloud Run max instances = 20** — cap to control runaway cost at unexpected traffic spike · *Larry*
- [ ] **Firebase Blaze plan** — confirm project is on Blaze (pay-as-you-go); Spark plan will hit limits at ~300 active users · *Larry*
- [ ] **CDN for static assets** — serve `logo.png` and other static files via Firebase Hosting or Cloud CDN · *Kevin/Larry*

---

### 📊 Progress Summary

| Category | Total | Complete | Remaining |
|---|---|---|---|
| Critical — Auth & Session | 6 | 6 | 0 |
| Critical — Firestore Rules | 7 | 6 | 1 |
| Critical — Data Layer (→ api.ts) | 9 | 1 | 8 |
| Critical — FCM Real-Time UX | 10 | 0 | 10 |
| High — File Uploads | 5 | 0 | 5 |
| High — Firestore Indexes | 7 | 7 | 0 |
| High — Postgres Indexes | 3 | 0 | 3 |
| High — Payments | 5 | 3 | 2 |
| High — Error Handling | 4 | 0 | 4 |
| Important — AI | 3 | 0 | 3 |
| Important — BigQuery | 3 | 0 | 3 |
| Important — Performance | 4 | 0 | 4 |
| Important — Mobile | 5 | 0 | 5 |
| Launch Enhancements | 14 | 0 | 14 |
| **TOTAL** | **85** | **20** | **65** |

> When Claude completes an item, update `[ ]` → `[x]` and update the Progress Summary counts.
> When an item is in progress, update `[ ]` → `[~]`.

---

## 🎯 Phase Completion Status

### ✅ PHASE 1A — Foundation (COMPLETE)
- Login page with user/admin toggle
- Account creation (Signup)
- Role selection screen
- All 5 onboarding flows: Homeowner, Property Manager, Realtor, Licensed Tradesperson, Unlicensed Tradesperson
- Settings sub-pages: Profile, Location, Payment, Privacy
- Insurance Upload page
- Firebase project configured (`src/services/firebase.ts`)
- Backend infrastructure: Cloud SQL schema, API routes, Firebase integration

### ✅ PHASE 1B — Job Board & Quotes (COMPLETE)
- Job Creation (5-step form with AI summary mock, photo upload, severity, trade category)
- Job Board (`JobBoardEnhanced.tsx`) — dual view: customer sees their jobs, tradesperson sees open jobs
- Quote submission modal (tradesperson)
- Quote comparison + acceptance modal (customer)
- 7 trade categories: Plumbing, Electrical, HVAC, General Repairs, Cleaning, Landscaping, Snow Removal
- Category filtering, distance filter, sort options

### ✅ PHASE 1C — Scheduling, Messaging & Execution (COMPLETE)
- Scheduling page: 30-min slots 8 AM–5 PM, unlimited selection
- Job Execution page with checklist and status tracking
- Job Completion + review submission
- Messaging modal: real-time Firebase chat with local fallback
- PayBright BNPL integration (sandbox)

### ✅ PHASE 1D — Dashboards & Admin (COMPLETE)
- Customer Dashboard: Accepted Jobs → Pending → New Quotes → Payment History
- Tradesperson Dashboard: earnings, active jobs, compliance alerts → insurance upload
- Admin Dashboard: Compliance Review, Account Monitoring (flag/notify buttons), Admin Resolutions, Audit Log, Platform Metrics
- TopNav: role-aware with logo, user dropdown (Profile, Dashboard, Sign Out)
- BottomNav: role-specific tabs (3-tab for all roles)

### 🔲 NEXT PRIORITY — Data Layer Wiring (Pre-Launch Critical)
**Auth is done. Firestore rules + indexes + seed are done. The remaining gap to production is wiring the transactional data layer through `api.ts` and standing up FCM.**

1. **Data Layer to Cloud Run API** (Larry)
   - Replace `mockData.ts` arrays with `api.listJobs()`, `api.getJob()`, etc.
   - Priority screens (in order): JobCreation, JobBoardEnhanced, CustomerDashboard, TradespersonDashboard, QuoteSubmissionModal, QuoteAcceptance, Reviews
   - Verify each route round-trip in dev against Cloud Run

2. **Admin custom claim** (Larry)
   - Run an Admin SDK script to set `admin: true` on the admin Firebase Auth user
   - Verify rules allow admin writes to `audit_log`, reads from `reviews`, etc.

3. **FCM — real-time UX** (Kevin + Larry)
   - Service worker registration (Kevin)
   - FCM token stored on `users/{uid}.fcmToken` at login (Larry, one Firestore-backed field)
   - Cloud Run emits Pub/Sub events on writes (Larry)
   - Cloud Function fans out events to FCM (Larry)
   - Client `onMessage` handler in AuthContext (Kevin)

4. **Firebase Storage** (Kevin)
   - Wire photo upload in Job Creation (currently no-op)
   - Wire insurance doc upload in InsuranceUpload page
   - Wire government ID upload in tradesperson onboarding

5. **Vertex AI Job Analysis** (Larry)
   - Replace mocked AI summary in JobCreation step 3 with real Gemini Flash call
   - Input: job title + description + category + severity
   - Output: summary, estimated cost range, estimated hours

6. **BigQuery pipelines** (Larry — can be enabled any time without app changes)
   - Firestore→BQ Extension on `threads` + `messages`
   - Datastream PG→BQ on Cloud SQL instance

---

## 🗄️ Firestore Collections (Schema)

**Architecture note:** Firestore is **not** the source of truth for jobs/quotes/users/compliance/reviews — those live in Postgres via the Cloud Run API. Several collections below exist only because the seed script pre-populated them for dev convenience or because they're future mirror targets for the Firestore→BQ export. Security rules lock non-messaging collections to admin-only writes.

| Collection | Source of truth? | Used by client? | Key Fields |
|---|---|---|---|
| `threads` | ✅ Firestore | ✅ `messagingService.ts` | `id, jobId, jobTitle, participants[], participantNames{}, lastMessage, lastMessageAt, jobStatus, createdAt` |
| `messages` | ✅ Firestore | ✅ `messagingService.ts` | subcollection of `threads/{threadId}/messages` — `senderId, senderName, text, createdAt, read` |
| `reviews` | 🟡 Firestore (migrating to PG) | ✅ `messagingService.submitReview` | `id, jobId, reviewerId, tradespersonId, rating, body, createdAt` |
| `audit_log` | ✅ Firestore | ✅ `messagingService.logAdminAction` | `id, adminEmail, actionType, targetUserId, reason, timestamp` |
| `users` | ❌ Postgres | FCM token only | `id, fcmToken` (transactional fields live in PG `users` table) |
| `jobs` | ❌ Postgres | Unused from client | Seed/Firestore→BQ mirror only |
| `quotes` | ❌ Postgres | Unused from client | Seed/Firestore→BQ mirror only |
| `compliance_submissions` | ❌ Postgres | Unused from client | Admin-only; future BQ mirror |
| `flagged_accounts` | ❌ Postgres | Unused from client | Admin-only |
| `platform_metrics` | ❌ BigQuery (future) | Admin read | Admin-only |

**To seed Firestore:**
```bash
npm install firebase-admin
# Download service account key: Firebase Console → Project Settings → Service Accounts → Generate new private key
# Save as: scripts/serviceAccountKey.json  (DO NOT commit this file)
node scripts/seedFirestore.mjs
```

---

## 🔑 Key Design Decisions (Do Not Revert)

- **Stripe is the sole payment processor** — PayBright fully removed. Subscriptions fully removed. Model is per-job payments only: `direct-charge` charges the job poster, platform takes 10% (`PLATFORM_FEE_PERCENT=0.10`), Connect Express transfers the remainder to the tradesperson.
- **No star ratings on quote cards** — display `# reviews` as a clickable link instead. Stars only appear in the tradesperson's own profile preview.
- **Service radius is a slider (5–50 mi)**, not buttons, on all onboarding location pages.
- **Accepted job button stays green** (`var(--success)`) even after navigating away. Use `style` prop override on Button component.
- **Admin does not use BottomNav** — excluded via `hideNavPaths` in `App.tsx`.
- **Logo uses `public/logo.png`** (real brand mark) — do not regenerate SVG paths.
- **Messaging uses Firestore with local fallback** — the `threads/` collection + participants-array schema is the contract (see `messagingService.ts`). The legacy `messaging_threads/` collection (customer/tradesperson columns) is locked down and unused. If Firestore throws, messages fall back to local state (demo mode).
- **Jobs/quotes/reviews go through `api.ts`, not Firestore.** Firestore is reserved for messaging + future real-time-critical features only. See the Architecture section at the top of this file.
- **Full services list**: Plumbing, Electrical, HVAC, General Repairs, Cleaning, Landscaping, Snow Removal — use this exact list everywhere services appear.

---

## 🏗️ Production Deployment

**Live URL**: https://tradeson-app-63629008205.us-central1.run.app

**Deploy flow** (push master to production branch — Cloud Build handles the rest):
```bash
# Standard deploy
git pull origin master
npm run build          # must pass TypeScript — Cloud Build will fail if this fails
git push origin master:production

# One-liner
git pull origin master && git push origin master:production
```

**Infrastructure:**
| Setting | Value |
|---|---|
| GCP Project | `frankly-data` (project ID: `tradeson-491518`) |
| Cloud Build Trigger | `tradesonproduction` |
| Region | `us-central1` |
| Cloud Run Service | `tradeson-app` |
| Memory | 512Mi |
| Port | 8080 |
| Access | Public (no auth) |

**Troubleshooting:**
- Build fails → almost always TypeScript errors. Run `npm run build` locally first.
- Build passes locally but fails in Cloud Build → check for uncommitted files.
- To skip CI on a trivial push → add `[skip ci]` to commit message.

---

## 💻 Local Development

```bash
git clone https://github.com/gordlf11/tradeson.git
cd tradeson
npm install
npm run dev       # http://localhost:5173

# Login shortcut for testing:
# 1. Any email + any password → lands on role selection
# 2. Toggle to "Admin Login" → lands on admin dashboard directly
# 3. "Reset User State" button on login page clears localStorage
```

---

## 📝 Commit Convention

```
[PHASE] Brief description

- Detail 1
- Detail 2
```

Examples from this project:
```
[1C-1D] UX polish — sliders, services expansion, quote review count, accepted state
[1D] Admin UX — section titles, flag/notify buttons, resolution alignment + Firestore seed
[UI] Fix login logo, messaging modal, insurance alert, scheduling slots
```

---

## 🔗 Quick Links

| Resource | URL |
|---|---|
| Production App | https://tradeson-app-63629008205.us-central1.run.app |
| GitHub Repo | https://github.com/gordlf11/tradeson.git |
| GCP Console | https://console.cloud.google.com/home/dashboard?project=frankly-data |
| Cloud Build History | https://console.cloud.google.com/cloud-build/builds?project=frankly-data |
| Firebase Console | https://console.firebase.google.com/project/tradeson-491518 |
| Stripe Dashboard | https://dashboard.stripe.com/test |

---

## 🤝 Collaboration

- **Kevin** → all frontend / UI / screens / components
- **Larry** → Firebase auth wiring, Firestore rules, data layer, backend API, Vertex AI
- Always pull latest master before starting work
- Run `npm run build` before pushing — TypeScript errors block the production deploy
- Coordinate before pushing to `production` branch
