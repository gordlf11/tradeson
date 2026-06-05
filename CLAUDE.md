# 🤖 Claude Development Assistant Configuration

---

## 🔴 LARRY — ACTION REQUIRED (read this first every session)

> Originally listed 2026-06-01 by Kevin. **Status updated 2026-06-02 by Larry** (see CHAT_HISTORY.md for the full session).

| # | Priority | Item | Status (2026-06-02) |
|---|---|---|---|
| 1 | 🔴 CRITICAL | **Wire data layer** — JobBoard, dashboards, quote submit/accept, JobCreation | ✅ **Mostly done** — pages call `api.*`; the `mock`/`FALLBACK` refs are the demo/error fallback by design, not "still on mock". Verify quote submit/accept paths end-to-end. |
| 2 | 🔴 CRITICAL | **FCM notifications** — push on new quote, accepted bid, new message, schedule change, compliance decision | ✅ **DONE (2026-06-04).** All five events wired. quote/accept/job/`compliance.decided` (admin.ts) deliver on the fixed UID contract; `message.sent` via `functions/message-push`. **Schedule change unblocked:** `appointments` route now persists slots and emits `schedule.confirmed` / `schedule.changed`. Kevin: wire `Scheduling.tsx` → `api.createAppointment()`. |
| 3 | 🟠 HIGH | **Firebase Storage security rules** | 🟡 **Rules written + registered** (`firebase/storage.rules`). ⛔ Blocked: Firebase Storage not initialized — click **Get Started** in console, then `firebase deploy --only storage`. |
| 4 | 🟠 HIGH | **Postgres indexes** | ✅ **DONE & LIVE** — in `runMigrations()`, confirmed `Migrations: performance indexes OK` in prod. |
| 5 | 🟠 HIGH | **Payment history** — `GET /api/v1/payments/me` | 🟡 Backend route exists; remaining work is the **CustomerDashboard display** (Kevin). |
| 6 | 🟠 HIGH | **Item 6** — flagged-account cron + deploy | ✅ **DONE** — built, deployed, scheduler live & verified. **Kevin:** enable `charge.dispute.created` in Stripe webhook events. |
| 7 | 🟡 MEDIUM | **BigQuery pipelines** | 🔲 Open (Larry — console). |
| 8 | 🟡 MEDIUM | **Firestore query pagination** (`limit(20)` + Load More) | 🔲 Open (frontend). |

**Larry's open queue:** ~~scheduling persistence~~ ✅ shipped 2026-06-04 → enable Firebase Storage (console — no default bucket exists yet, click **Get Started** then `firebase deploy --only storage`) → #7 BigQuery.
**Kevin's queue:** wire `Scheduling.tsx` → `api.createAppointment()` (route is live) → enable `charge.dispute.created` in Stripe → confirm iOS scroll fix on device → #5 payment-history display → #8 pagination.

> **Verified done 2026-06-04 (were stale on this list):** Stripe migration (`stripe_migration.sql` is byte-identical to `runMigrations()` — auto-applied on boot, no psql needed); messages Firestore collection-group index (already live in `tradeson-491518`); `compliance.decided` push (already wired in `admin.ts`).

> **Note:** AI Job Analysis (Vertex AI / Gemini) has been **removed as a feature**. Do not implement it. Remove any Vertex AI wiring you encounter.
> **Deploy note (2026-06-02):** API auto-deploys on `git push origin master:production` (the `tradesonapi` trigger glob was fixed from `api/***`→`api/**`). The Console "Edit & deploy new revision" button does NOT pick up new code — never use it.

---

## Welcome to the TradesOn Platform

This file configures your Claude instance to work on the **TradesOn** platform — a two-sided marketplace connecting homeowners, realtors, and property managers with verified tradespeople for home repairs and maintenance.

## 🚀 Session Start Questions

When you read this file, please ask the developer:

1. **Role Confirmation**: Are you Kevin or Larry? (This determines task assignments)
2. **Development Phase**: Which phase are we currently working on? (Pre-Launch, 1A, 1B, 1C, 1D, QA, or Phase 2)
3. **Environment Access**: Do you have access to:
   - [ ] GCP Project (frankly-data)
   - [ ] GitHub repository (https://github.com/gordlf11/tradeson.git)
   - [ ] Stripe test account
   - [ ] Firebase project
   - [ ] Figma designs
4. **MCP Setup**: Have you installed the required MCPs?
   - [ ] Figma MCP (for design access)
   - [ ] Firebase MCP (for database operations)
5. **Today's Focus**: What specific screens or features are we implementing today?

## 📋 Project Overview

**TradesOn** is a two-sided marketplace platform that:
- Connects homeowners, realtors, and property managers with verified tradespeople
- Uses AI to analyze job requests and estimate costs
- Handles end-to-end job lifecycle: intake → quote → schedule → execute → payment
- Ensures compliance through identity verification and license checking

### Tech Stack (Locked 2026-03-29)
- **Frontend**: Next.js 14+ (Web), FlutterFlow (iOS)
- **Backend**: Node.js with Express
- **Database**: Cloud SQL (PostgreSQL 15) — transactional store
- **Analytics**: BigQuery — analytics mirror (Phase 1D, streamed via Pub/Sub or Datastream)
- **AI**: Google Vertex AI with ADK
- **Payments**: Stripe Connect Express
- **Cloud**: Google Cloud Platform (Cloud Run, Cloud Functions)
- **Auth**: Firebase Auth (JWT + custom claims for active role)
- **File Storage**: Google Cloud Storage

### Architecture Decisions (Locked 2026-03-29)
1. **Cloud SQL (PostgreSQL)** for all transactional data. BigQuery for analytics only (Phase 1D).
2. **Firebase Auth** for authentication. NOT Firestore. NOT Supabase.
3. **Multi-role users**: one `users` record per email, `user_roles` junction table, role-scoped sessions via JWT custom claims.
4. **Normalized schema**: base `users` table + role-detail profile tables (homeowner, tradesperson, realtor, property_manager).
5. **Flat brokerages**: `brokerages` entity with FK on `realtor_profiles`. No complex org tree until Phase 2+.
6. **Compliance retention**: PostgreSQL for active records, BigQuery archive Phase 1D. Identity/license 7yr, insurance 5yr, audit 7yr.

See `docs/DATABASE_SCHEMA.md` for full schema documentation and ERD.

## 🎯 Current Development Phases

### PRE-LAUNCH: Environment Setup ✅
- GCP project setup with Cloud Run, Vertex AI, Cloud Functions
- Payment Processor account (Stripe) in test mode
- Repository structure defined

### PHASE 1A - Foundation (Current Focus)
**Database Schema** (Larry's responsibility):
```typescript
// Core tables needed:
- users (multi-role: homeowner, realtor, property_manager, tradesperson)
- jobs (status, category, severity, location, photos)
- quotes (price, message, ETA, status)
- compliance (licenses, insurance, identity_verification)
- payments (stripe_customer_id, stripe_account_id, transactions)
- audit_log (all system actions, immutable)
```

**Onboarding Screens** (Kevin's responsibility):
- S-03: User type selection
- S-04: Property Manager onboarding
- S-05: Realtor onboarding
- S-06: Homeowner onboarding
- S-07/S-08: Tradesperson onboarding (licensed/non-licensed)

**Authentication** (Larry's responsibility):
- S-01: Login page
- S-02: Account creation + email verification
- JWT session management

**Payment Setup** (Kevin's responsibility):
- S-45: Customer payment method (Stripe Elements)
- S-46: Tradesperson payout (Stripe Connect Express)
- Identity verification integration

### PHASE 1B - AI & Job Board
- Job intake with AI analysis
- Job board with filtering
- Quote submission and comparison

### PHASE 1C - Scheduling & Execution
- Calendar management
- Live tracking
- Payment processing

### PHASE 1D - Dashboards & Admin
- Role-specific dashboards
- Admin portal
- Analytics

## 🛠 Development Guidelines

### File Structure
```
/tradeson
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── auth/              # Auth pages
│   ├── onboarding/        # Onboarding flows
│   ├── dashboard/         # Role-specific dashboards
│   ├── jobs/              # Job management
│   └── admin/             # Admin portal
├── components/            # Reusable components
├── lib/                   # Utilities and helpers
│   ├── stripe/           # Stripe integration
│   ├── firebase/         # Firebase config
│   └── vertex-ai/        # AI agents
├── public/               # Static assets
└── docs/                 # Documentation
```

### Database Conventions
- Use snake_case for table and column names
- Include created_at, updated_at timestamps on all tables
- Implement soft deletes with deleted_at field
- Use UUIDs for primary keys
- Add proper indexes for query optimization

### API Conventions
- RESTful endpoints: `/api/v1/resource`
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return consistent error responses
- Implement rate limiting
- Add request validation middleware

### Security Requirements
- Implement Row Level Security (RLS)
- Validate all user inputs
- Sanitize data before storage
- Use environment variables for secrets
- Implement proper CORS policies
- Add audit logging for sensitive operations

## 📊 Screen Reference Guide

The platform consists of 49 screens organized by user role:

### Authentication & Onboarding (S-01 to S-08)
- Login, registration, role selection
- Role-specific onboarding forms
- Document upload for verification

### Brokerage Management (S-09 to S-16)
- Brokerage profile setup
- Agent management
- Referral tracking

### Admin Portal (S-17 to S-23)
- Compliance review
- Account monitoring
- Metrics dashboard

### Tradesperson Dashboard (S-24)
- Job management
- Earnings tracking
- Availability calendar

### Realtor Dashboard (S-25)
- Client management
- Job history
- Commission tracking

### Job Creation (S-26 to S-28)
- Issue input with photos
- AI analysis results
- Summary confirmation

### Job Board (S-29 to S-32)
- Browse available jobs
- Submit quotes
- Compare quotes

### Scheduling (S-33 to S-36)
- Availability management
- Time slot selection
- Route planning

### Execution (S-37 to S-41)
- Live tracking
- Scope adjustments
- Completion docs

### Invoicing (S-42 to S-44)
- Line items
- PDF generation
- Payment approval

### Payments (S-45 to S-47)
- Payment methods
- Payout setup
- Cancellations

### Support (S-48 to S-49)
- Contact form
- Ticket tracking

## 🔄 Git Workflow

### Branch Strategy
```bash
master                  # Main integration branch (default)
├── production         # Production deployments (auto-deploys to Cloud Run)
├── feature/1a-*       # Phase 1A features
├── feature/1b-*       # Phase 1B features
└── hotfix/*           # Emergency fixes
```

### Production Deployment (Cloud Run via Cloud Build)

**Live Production URL**: https://tradeson-app-63629008205.us-central1.run.app

The project uses **Google Cloud Build** with an automated trigger to deploy to **Cloud Run** whenever code is pushed to the `production` branch. The build is fully automated — no manual steps needed in GCP.

**Deployment Flow:**
```
feature branch → PR to master → merge → push master to production → auto-deploys to Cloud Run
```

**Quick Deploy (one command):**
```bash
# Make sure you're up to date, then deploy
git pull origin master && git push origin master:production
```

**Step-by-step deploy:**
```bash
# 1. Ensure your local branch is up to date
git fetch origin
git pull origin master

# 2. Verify the build passes locally before deploying
npm run build

# 3. Push to production (this triggers the deploy)
git push origin master:production

# 4. Monitor the build
#    → GCP Console > Cloud Build > History
#    → Or check: https://console.cloud.google.com/cloud-build/builds?project=frankly-data
```

**How the pipeline works:**
1. Push to `production` branch triggers Cloud Build (`tradesonproduction` trigger)
2. `cloudbuild.yaml` orchestrates: Docker build → push to Container Registry → deploy to Cloud Run
3. `Dockerfile` runs a multi-stage build: Node 20 compiles the Vite/React app, nginx serves it on port 8080
4. Cloud Run serves the app at the production URL above

**Before you deploy — pre-flight checklist:**
- [ ] Run `npm run build` locally — if TypeScript fails, the Cloud Build will also fail
- [ ] Test your changes in the browser (`npm run dev`)
- [ ] Ensure your code is committed and pushed to `master`
- [ ] Coordinate with your partner if deploying shared changes

**Infrastructure details:**
| Setting | Value |
|---|---|
| GCP Project | `frankly-data` (project ID: `tradeson-491518`) |
| Trigger Name | `tradesonproduction` |
| Region | `us-central1` (Iowa) |
| Cloud Run Service | `tradeson-app` |
| Service Account | `63629008205-compute@developer.gserviceaccount.com` |
| Build Config | `cloudbuild.yaml` (auto-detected) |
| Repository | `gordlf11/tradeson` (GitHub App, 1st gen) |
| Access | Public (`--allow-unauthenticated`) |
| Memory | 512Mi |
| Port | 8080 |

**Troubleshooting failed builds:**
1. Check Cloud Build logs: GCP Console > Cloud Build > History > click the failed build
2. Most common failure: **TypeScript errors** — always run `npm run build` locally first
3. If the build passes locally but fails in Cloud Build, check for files missing from git (not committed)
4. To skip a build on a trivial push, include `[skip ci]` in the commit message

**Notes for Claude:** When a developer asks to "deploy to production", "push to prod", or "go live":
1. Pull latest from `origin/master`
2. Run `npm run build` to verify TypeScript compiles
3. If there are errors, fix them before pushing
4. Push to production: `git push origin <current-branch>:production`
5. Keep `master` in sync: `git push origin <current-branch>:master`
6. Confirm the build started in Cloud Build

### Commit Convention
```
[PHASE-SCREEN] Brief description

- Detailed point 1
- Detailed point 2

Refs: #ticket-number
```

Example:
```
[1A-S03] Add user type selection screen

- Implement role routing logic
- Add animations for card selection
- Connect to onboarding flows

Refs: #12
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change

## Phase & Screen
- Phase: 1A
- Screen(s): S-03, S-04

## Testing
- [ ] Manual testing completed
- [ ] Unit tests added/updated
- [ ] E2E tests passing

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## 🚦 Development Status Tracker

### Decision Gates (Must Complete)
- [ ] Requirements Document approval
- [ ] Tech stack finalization (Scenario A-F)
- [ ] AI model selection
- [ ] Identity verification vendor (Stripe Identity vs Persona)
- [ ] Platform fee % and payment processor type

### Current Sprint Tasks
Track your daily progress in `/docs/DEVELOPMENT_TRACKER.md`

## 🔗 Important Links

- **GitHub Repository**: https://github.com/gordlf11/tradeson.git
- **PRD Document**: `/TradesOn - Product Requirements Document.pdf`
- **Figma Designs**: [Request access from team]
- **GCP Console**: https://console.cloud.google.com/home/dashboard?project=frankly-data
- **Stripe Dashboard**: https://dashboard.stripe.com/test
- **Firebase Console**: https://console.firebase.google.com

## 💬 Communication Protocol

### Daily Standups
Answer these questions in GitHub Discussions:
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

### Code Reviews
- All PRs require one approval
- Response time: within 4 hours during work hours
- Use GitHub comments for discussions

### Emergency Escalation
1. Slack: #tradeson-dev
2. Phone: [Exchange numbers privately]
3. Email: [Exchange emails privately]

## 🎓 Getting Started Checklist

When starting development:

```bash
# 1. Clone the repository
git clone https://github.com/gordlf11/tradeson.git
cd tradeson

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Initialize Firebase
firebase init

# 5. Set up Stripe CLI
stripe login

# 6. Run development server
npm run dev

# 7. Check current phase tasks
cat docs/DEVELOPMENT_TRACKER.md
```

## 📝 Notes for Claude

When assisting with this project:

1. **Always ask which phase and screen** the developer is working on
2. **Reference the PRD** for detailed requirements
3. **Follow the established conventions** for code style and structure
4. **Consider the multi-role nature** of the platform (4 user types)
5. **Ensure proper security** for payment and compliance features
6. **Track progress** in the development tracker
7. **Test across all user roles** before marking complete
8. **Document any deviations** from the original plan
9. **Read CHAT_HISTORY.md at session start** to understand what the other developer has done
10. **Log the session to CHAT_HISTORY.md at session end** -- this is how both partners stay in sync

## 📓 Chat History Workflow

This project uses `CHAT_HISTORY.md` as a **shared session log** between Larry and Kevin (and their respective Claude instances).

### Why This Matters
Two developers working async with separate Claude sessions will lose context without a shared log. CHAT_HISTORY.md is the bridge -- it lives in the repo, gets pushed/pulled with the code, and gives each Claude full context on what the other developer has done.

### Rules
1. **Start of session**: Read `CHAT_HISTORY.md` before doing anything else
2. **End of session**: Append a dated entry summarizing what was done, decisions made, and next steps
3. **Format**: `## YYYY-MM-DD -- [Developer Name] -- [Session Title]` followed by bullet points
4. **New entries go at the top** (reverse chronological)
5. **Include the developer's name** (Larry or Kevin) so Claude knows who did what
6. **Commit CHAT_HISTORY.md with your code changes** -- it should always be part of the push
7. **Pull before starting** to get your partner's latest session notes

## 🤝 Collaboration Rules

1. **No direct commits to main** - always use feature branches
2. **Update DEVELOPMENT_TRACKER.md** after completing each task
3. **Comment your code** for complex business logic
4. **Write tests** for critical paths (payments, auth, compliance)
5. **Document API changes** in `/docs/API.md`
6. **Share blockers immediately** - don't wait for standups

---

## 🟢 LARRY — Priority List (ALL ITEMS SHIPPED)
> Last updated: 2026-06-01. **Items 1–9 are all complete.** Code is committed; Firestore rules + indexes are deployed (`firebase deploy`, 2026-06-01); the auto-release scheduler is live and verified end-to-end (`HTTP 200`). The single follow-up is deploying the new `tradeson-api` revision for item 6 and creating its nightly Cloud Scheduler job (commands below). Full detail preserved in the COMPLETED table; the old per-item TODO write-ups were removed since they no longer describe open work.

---

### ✅ COMPLETED ITEMS (shipped — do not re-implement)

| Item | What was done | Who |
|---|---|---|
| Tradesperson onboarding transaction wrapper | `onboarding.ts` wrapped in `BEGIN/ROLLBACK`, `document_url` made nullable | Larry |
| Admin dashboard backend routes | All 5 routes live in `admin.ts`; schema migrations ran | Larry |
| Payment history route `GET /api/v1/payments/me` | Live in `payments.ts` | Larry |
| FCM end-to-end | Pub/Sub publisher in Cloud Run, `fcm-fanout` Cloud Function deployed, FCM token stored on login, foreground `onMessage` handler wired | Larry + Kevin |
| Reviews migrated to Postgres | `reviews.ts` route live; `messagingService.submitReview()` now calls API not Firestore | Larry + Kevin |
| Admin custom claim | `scripts/setAdminClaim.mjs` run; admin can sign in to `/dashboard/admin` | Larry |
| Payout on job completion | Pre-auth jobs: captured via `confirm-complete`. Legacy jobs: `stripe.transfers.create()` fires in PATCH status handler. Both paths covered. | Kevin |
| `GET /api/v1/jobs` dashboard filters | `acceptedTradespersonId` + `customerId` query params added — TradespersonDashboard and CustomerDashboard now fetch real data | Kevin |
| `/join` referral route + referral code wiring | `JoinRedirect` in `App.tsx` saves `?ref=CODE`; `AuthContext.signup()` passes `referred_by_code` to `api.createUser()` | Kevin |
| Auto-release endpoint | `POST /api/v1/internal/release-expired-holds` live in `internal.ts` | Kevin |
| **1.** `onboarding_completed` column | Column in `migration.sql`; persisted in `PUT /users/me`; set `TRUE` in all 5 `onboarding.ts` flows. Schema confirmed live in prod (no missing-column errors in logs). | Larry |
| **2+5.** `support_tickets` Firestore rule | Final UID-based `create` rule in `firestore.rules`; **deployed 2026-06-01**. | Larry |
| **3.** `DELETE /api/v1/users/me` | Soft-deletes + archives to `deleted_accounts`; `requireAuth` enforces `deleted_at IS NULL`. | Larry |
| **4.** Job query auth gap | `403 Forbidden` when `customerId`/`acceptedTradespersonId` ≠ caller and not admin (`jobs.ts`). | Larry |
| **6.** Nightly flagged-account auto-population | `POST /internal/populate-flagged-accounts` (expired docs + poor 30-day ratings, idempotent); `charge.dispute.created` webhook inserts `dispute` flags. **Needs: deploy `tradeson-api` + create nightly scheduler.** | Larry |
| **7.** Referral code backend | `POST /api/v1/users` resolves `referred_by_code` → `referred_by_realtor_id` (`users.ts`). | Larry |
| **8.** Auto-release Cloud Scheduler | `release-expired-payment-holds` cron live (`*/30`), `INTERNAL_SECRET` via Secret Manager, verified end-to-end (`HTTP 200`). | Larry |
| **9.** Server-side `tracking/{jobId}` creation | Seeded on quote accept; `OnMyWayControls` uses `updateDoc`; `tracking` rule tightened to `create: if false`; **deployed 2026-06-01**. | Larry + Kevin |

---

### 📌 Only remaining follow-up — item 6 deploy

The item-6 code is committed but not yet deployed. After `tradeson-api` is redeployed, create the nightly cron (reusing the same `INTERNAL_SECRET` Secret Manager value the release job uses):

```bash
export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3   # gcloud needs Python 3.10–3.14
gcloud scheduler jobs create http populate-flagged-accounts \
  --location=us-central1 --project=tradeson-491518 \
  --schedule="0 8 * * *" --time-zone=UTC --http-method=POST \
  --uri="https://tradeson-api-63629008205.us-central1.run.app/api/v1/internal/populate-flagged-accounts" \
  --headers="x-internal-secret=$(gcloud secrets versions access latest --secret=tradeson-internal-secret --project=tradeson-491518)"
```

Also add `charge.dispute.created` to the Stripe webhook endpoint's enabled events (Stripe Dashboard → Developers → Webhooks).

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
│   │   ├── Demo.tsx        # Demo mode activator — sets demoMode flag + redirects to /login
│   │   └── (all other screens)
│   ├── components/         # Reusable components
│   │   ├── ui/             # Button, Card, Badge, Input, etc.
│   │   ├── TopNav.tsx      # Role-aware top navigation bar
│   │   ├── MessagingModal.tsx  # Real-time chat (Firebase)
│   │   ├── DemoNavigator.tsx   # Floating 25-screen nav bar (demo mode only)
│   │   ├── StripeCheckoutWrapper.tsx  # Stripe PaymentElement + SetupIntent card form
│   │   └── Logo.tsx        # TradesOn logo (uses public/logo.png)
│   ├── services/
│   │   ├── firebase.ts     # Firebase app init (auth, db, analytics, FCM)
│   │   ├── messagingService.ts  # Firestore messaging helpers
│   │   ├── api.ts          # API service layer
│   │   └── mockData.ts     # Synthetic data (pre-Firestore wiring)
│   ├── App.tsx             # Router + BottomNav + role routing + DemoNavigator
│   └── index.css           # Global CSS variables and base styles
├── public/
│   ├── logo.png            # TradesOn brand mark (orange wrench+check)
│   └── firebase-messaging-sw.js  # FCM service worker for background push
├── scripts/
│   └── seedFirestore.mjs   # Seeds all Firestore collections (run once)
├── nginx.conf              # Cache headers: no-cache on index.html, immutable on JS/CSS, 30d on images
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
- [x] **Admin custom claim** — set `admin: true` on admin Firebase Auth user via Admin SDK; `scripts/setAdminClaim.mjs` run; admin can sign in to `/dashboard/admin` · *Larry*

#### Data Layer — Replace Mock Data with Cloud Run API (`api.ts`)
**Source of truth is Postgres. All jobs/quotes/user reads go through `src/services/api.ts`. Do NOT add Firestore collections for these.**
- [x] **JobBoard (`JobBoardEnhanced.tsx`)** — calls `api.listJobs()`; FALLBACK_JOBS is demo/error fallback only · *Larry*
- [x] **CustomerDashboard** — calls `api.listJobs({ customerId })` · *Larry*
- [x] **TradespersonDashboard** — calls `api.listJobs({ acceptedTradespersonId })` · *Larry*
- [x] **Quote submission** — `QuoteSubmissionModal` calls `api.submitQuote()` · *Larry*
- [x] **Quote acceptance** — calls `api.acceptQuote()` · *Larry*
- [x] **Job creation** — `JobCreation.tsx` calls `api.createJob()` · *Larry*
- [x] **Admin dashboard** — admin API routes live in `admin.ts` · *Larry*
- [x] **Reviews** — `reviews.ts` route live; `messagingService.submitReview()` now calls API not Firestore · *Larry + Kevin*
- [x] **Run Firestore seed script** — seeded to `tradeson-491518` for messaging/review/audit collections · *Larry*

#### Real-Time UX via FCM (Critical — replaces Firestore listeners for non-messaging events)
- [x] **FCM service worker** — `firebase-messaging-sw.js` created in `public/`; registers Firebase Messaging for background push · *Kevin*
- [x] **Store FCM token on login** — saved to `users/{uid}.fcmToken` in Firestore on auth state change · *Larry*
- [x] **Cloud Run → Pub/Sub event emission** — Pub/Sub publisher in Cloud Run; `quote.submitted`, `quote.accepted`, `job.status_changed`, etc. · *Larry*
- [x] **FCM fan-out Cloud Function** — `fcm-fanout` Cloud Function deployed; Pub/Sub subscriber reads FCM tokens and sends push · *Larry*
- [x] **Client foreground message handler** — `onMessage` listener wired; triggers data refresh + in-app toast · *Kevin*
- [x] **Send notification on new quote** — FCM UID contract fixed; push delivers · *Larry*
- [x] **Send notification on job accepted** — FCM UID contract fixed; push delivers · *Larry*
- [x] **Send notification on new message** — `functions/message-push` Firestore-triggered function deployed · *Larry*
- [ ] **Send notification on schedule confirmed/changed** — blocked: scheduling not persisted yet (Larry needs appointments route) · *Larry*
- [ ] **Send notification on compliance decision** — open · *Larry*

---

### 🟠 HIGH PRIORITY — Required for a Trustworthy Launch

#### File Uploads (Firebase Storage)
- [x] **Job photos** — wired via `uploadFile()` in `JobCreation.tsx` · *Kevin*
- [x] **Insurance certificate** — wired with progress bar in `InsuranceUpload.tsx` · *Kevin*
- [x] **Government ID** — wired in tradesperson onboarding · *Kevin*
- [x] **Profile photo** — wired in `ProfileSettings.tsx` · *Kevin*
- [~] **Firebase Storage security rules** — rules written in `firebase/storage.rules`; ⛔ blocked: Firebase Storage not initialized in console. Larry: click "Get Started" in Firebase Console → Storage, then `firebase deploy --only storage` · *Larry*

#### Firestore Indexes (deployed — used by messaging today, pre-provisioned for jobs/quotes if ever needed)
**Note:** After the PG-vs-Firestore split, jobs/quotes queries don't actually run in Firestore. These indexes are kept so admin/analytics consumers can query Firestore mirrors without index errors if we ever enable the Firestore→BQ export.
- [x] **jobs (status, tradeId, createdAt desc)** · *Larry*
- [x] **jobs (customerId, status, createdAt desc)** · *Larry*
- [x] **jobs (acceptedTradespersonId, status, createdAt desc)** · *Larry*
- [x] **quotes (jobId, totalPrice asc)** · *Larry*
- [x] **quotes (tradespersonId, createdAt desc)** · *Larry*
- [x] **threads (participants array-contains, lastMessageAt desc)** — used by `messagingService.getUserThreads` · *Larry*
- [x] **reviews (tradespersonId, createdAt desc)** · *Larry*
- [~] **messages COLLECTION_GROUP (recipientUID asc, readAt asc)** — required for `subscribeToUnreadCount` + `markThreadRead`; committed to `firebase/firestore.indexes.json` but **needs `firebase deploy --only firestore:indexes` to take effect** · *Kevin (2026-05-27)*

#### Postgres (Cloud SQL) Indexes
- [x] **jobs** — `(status, trade_id, created_at desc)`, `(customer_id, status, created_at desc)`, `(accepted_tradesperson_id, status, created_at desc)` — live in `runMigrations()` · *Larry*
- [x] **quotes** — `(job_id, total_price asc)`, `(tradesperson_id, created_at desc)` · *Larry*
- [x] **reviews** — `(tradesperson_id, created_at desc)` · *Larry*

#### Payment Flow Completion
- [x] **Stripe webhook handler** — `account.updated`, `transfer.created` · *Kevin* (subscription events removed — no longer needed)
- [x] **Stripe Connect onboarding** — Express account creation, onboarding link, payout setup in all tradesperson onboarding flows · *Kevin*
- [x] **Per-job payment routes** — `direct-charge` (job poster pays) + `platform-payout` (transfer to tradesperson minus 10% fee) · *Kevin*
- [x] **Platform fee** — `PLATFORM_FEE_PERCENT=0.10` (10%), enforced in `/stripe/platform-payout` and `/stripe/direct-charge` · *Kevin*
- [x] **Stripe SetupIntent + PaymentElement** — `POST /api/v1/stripe/create-setup-intent` route added; `StripeCheckoutWrapper.tsx` rewritten from `EmbeddedCheckout` (deleted) to `Elements` + `PaymentElement`; collects card for future per-job charges; graceful DB-unavailable fallback · *Kevin*
- [x] **Payout trigger** — pre-auth jobs captured via `confirm-complete`; legacy jobs use `stripe.transfers.create()` in PATCH status handler · *Kevin*
- [x] **Payment history** — wired via `api.listMyPayments()`; shows category, date, amount, Invoice link · *Kevin*
- [ ] **Run Stripe migration** — `psql $DATABASE_URL -f api/src/schema/stripe_migration.sql` adds `stripe_customer_id` to users (needed for Connect flow) · *Larry*
- [x] **No Stripe products needed** — subscriptions removed; job payments use dynamic `amount_cents` · *Kevin*

#### Error Handling & Resilience
- [x] **Error boundaries** — `<ErrorBoundary>` wrapping `<JobBoard>`, `<CustomerDashboard>`, `<TradespersonDashboard>`, `<AdminDashboard>` in `App.tsx` · *Kevin*
- [x] **Fallback mock data** — `FALLBACK_JOBS` constants in `JobBoardEnhanced.tsx`, `CustomerDashboard.tsx`, `TradespersonDashboard.tsx`; shown instantly in demo mode + on API failure · *Kevin*
- [x] **Loading skeletons** — shimmer skeleton cards in JobBoard, CustomerDashboard, TradespersonDashboard · *Kevin*
- [x] **Empty states** — `EmptyState` component with icon/title/body on all list pages · *Kevin*
- [x] **Network failure handling** — `ErrorState` component with "Try again" retry button on all data fetches · *Kevin*

#### Demo Mode & Presenter Experience
- [x] **Demo mode system** — `localStorage.setItem('demoMode', 'true')` gates mock Firebase user in `AuthContext`, bypasses `RequireAuth`, renders `DemoNavigator` · *Kevin*
- [x] **`/demo` route** — `Demo.tsx` sets demoMode flag + `localStorage.userRole = 'homeowner'`, then `window.location.replace('/login')` · *Kevin*
- [x] **DemoNavigator component** — fixed floating bar (z-index 9999) with 25-screen list across 6 sections; prev/next nav; role switching via `setRole()` + navigate; Exit clears all localStorage flags · *Kevin*
- [x] **"View Demo" button on Login page** — calls `navigate('/demo')` to activate demo mode · *Kevin*
- [x] **Non-blocking onboarding** — `HomeownerOnboarding`, `PropertyManagerOnboarding`, `RealtorOnboarding` wrap API calls in inner try/catch; users always navigate forward even if Cloud SQL is unavailable · *Kevin*
- [x] **nginx cache fix** — `index.html` served with `no-cache, no-store, must-revalidate`; `.js`/`.css` use `immutable`; images use `30d max-age` (non-immutable); prevents stale-bundle issues after deploys · *Kevin*

---

### 🟡 IMPORTANT — Needed Before 10K Users

#### AI Integration
> **Removed as a feature** — Vertex AI / Gemini job analysis will not be built. Do not implement.

#### BigQuery Analytics (future — backwards-compatible, no app changes required)
- [ ] **Enable Firestore → BigQuery Extension** — install `firebase/firestore-bigquery-export` on `threads` + `messages` collections; no code change · *Larry*
- [ ] **Enable Datastream PG → BigQuery** — configure Datastream source on Cloud SQL instance `tradeson-491518`; CDC to BQ dataset · *Larry*
- [ ] **Admin dashboards read from BQ** — migrate AdminDashboard queries to BQ once pipelines are populated (until then, aggressive-cache the API) · *Larry*

#### Performance & Bundle Size
- [x] **Route-level code splitting** — all pages lazy-loaded via `React.lazy()` + `<Suspense>` in `App.tsx` · *Kevin*
- [x] **Reduce bundle size** — 334KB → 69KB gzipped (main bundle) via code splitting · *Kevin*
- [x] **Image optimization** — `public/logo.png` compressed; `loading="lazy"` on photo thumbnails · *Kevin*
- [x] **Firestore query pagination** — `limit(20)` + "Load More" on JobBoard and TradespersonDashboard · *Kevin*

#### Mobile Polish
- [x] **Safe area insets** — `env(safe-area-inset-*)` on bottom nav and page padding · *Kevin*
- [x] **Keyboard pushes content up** — `scroll-padding-bottom` + `scrollIntoView` on focus in `index.css` · *Kevin*
- [x] **Touch targets** — `min-height: 44px; min-width: 44px` on all buttons/links in `index.css` · *Kevin*
- [x] **No horizontal scroll** — `overflow-x: clip` on `html, body` (clip preserves Leaflet scroll; hidden does not) · *Kevin + Larry*
- [x] **Pull-to-refresh** — `overscroll-behavior-y: contain` on body; Load More buttons on JobBoard + dashboard · *Kevin*

---

### 🟢 LAUNCH ENHANCEMENTS — Nice-to-Have Before Full Rollout

#### User Experience
- [x] **Forgot password flow** — `ForgotPassword.tsx` wired with `sendPasswordResetEmail`; routed at `/forgot-password` · *Kevin*
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
| Critical — Firestore Rules | 7 | 7 | 0 |
| Critical — Data Layer (→ api.ts) | 9 | 2 | 7 |
| Critical — FCM Real-Time UX | 10 | 5 | 5 |
| High — File Uploads | 5 | 0 | 5 |
| High — Firestore Indexes | 8 | 7 | 1 |
| High — Postgres Indexes | 3 | 0 | 3 |
| High — Payments | 9 | 7 | 2 |
| High — Error Handling | 5 | 2 | 3 |
| High — Demo Mode & Presenter | 6 | 6 | 0 |
| Important — AI | 3 | 0 | 3 |
| Important — BigQuery | 3 | 0 | 3 |
| Important — Performance | 4 | 0 | 4 |
| Important — Mobile | 5 | 0 | 5 |
| Launch Enhancements | 14 | 0 | 14 |
| **TOTAL** | **97** | **42** | **55** |

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
- PayBright BNPL integration (removed — replaced by Stripe in 1E)

### ✅ PHASE 1D — Dashboards & Admin (COMPLETE)
- Customer Dashboard: Accepted Jobs → Pending → New Quotes → Payment History
- Tradesperson Dashboard: earnings, active jobs, compliance alerts → insurance upload
- Admin Dashboard: Compliance Review, Account Monitoring (flag/notify buttons), Admin Resolutions, Audit Log, Platform Metrics
- TopNav: role-aware with logo, user dropdown (Profile, Dashboard, Sign Out)
- BottomNav: role-specific tabs (3-tab for all roles)

### ✅ PHASE 1E — Payments, Demo Mode & Resilience (COMPLETE)
- Stripe fully replaces PayBright: `direct-charge` + Connect Express payouts, 10% platform fee
- `StripeCheckoutWrapper` rebuilt with `Elements` + `PaymentElement` + `SetupIntent` (collects card; charges happen per-job)
- `create-setup-intent` Cloud Run route with graceful DB-unavailable fallback
- "Skip for now" Button on all customer/realtor/PM onboarding payment steps
- Non-blocking onboarding: all roles navigate forward even if Cloud SQL is unavailable
- Demo mode system: `/demo` route, `DemoNavigator` (25 screens, 6 sections), demoMode localStorage flag
- Fallback mock data in JobBoard, CustomerDashboard, TradespersonDashboard (instant in demo + on API error)
- `<ErrorBoundary>` wrapped around all dashboard + JobBoard routes in `App.tsx`
- FCM service worker (`public/firebase-messaging-sw.js`) registered
- nginx cache headers fixed: `index.html` no-cache, hashed bundles immutable, images 30d

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

5. ~~**Vertex AI Job Analysis**~~ — **Removed as a feature.**

6. **BigQuery pipelines** (Larry — can be enabled any time without app changes)
   - Firestore→BQ Extension on `threads` + `messages`
   - Datastream PG→BQ on Cloud SQL instance

---

## 🗄️ Firestore Collections (Schema)

**Architecture note:** Firestore is **not** the source of truth for jobs/quotes/users/compliance/reviews — those live in Postgres via the Cloud Run API. Several collections below exist only because the seed script pre-populated them for dev convenience or because they're future mirror targets for the Firestore→BQ export. Security rules lock non-messaging collections to admin-only writes.

| Collection | Source of truth? | Used by client? | Key Fields |
|---|---|---|---|
| `threads` | ✅ Firestore | ✅ `messagingService.ts` | `id, jobId, jobTitle, participants[], participantNames{}, lastMessage, lastMessageAt, jobStatus, createdAt` |
| `messages` | ✅ Firestore | ✅ `messagingService.ts` | subcollection of `threads/{threadId}/messages` — `senderId, senderName, text, createdAt, recipientUID, readAt` |
| `reviews` | ✅ Postgres | ❌ (API-only) | Firestore copy locked admin-only; client uses `api.submitReview()` |
| `tracking` | ✅ Firestore | ✅ `JobTrackingMap.tsx`, `OnMyWayControls` | `jobId, tradespersonUID, posterUID, participants[], lat, lng, status, enRouteAt, arrivedAt, updatedAt` |
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
- **Demo mode is localStorage-gated** — `localStorage.getItem('demoMode') === 'true'` is checked in `AuthContext` (injects fake Firebase user + profile), `RequireAuth` (bypasses auth check), `App.tsx` (renders `<DemoNavigator>`), and each dashboard screen (skips API call, loads `FALLBACK_*` constants immediately). Activate via `/demo` route or the "View Demo" button on Login. Exit via DemoNavigator Exit button (clears `demoMode`, `userRole`, `hasOnboarded`).
- **nginx cache strategy** — `index.html` is `no-cache` so browsers always fetch fresh after a deploy. Hashed `.js`/`.css` bundles use `immutable` (safe because filename changes on content change). Images use `30d` without `immutable` (filename doesn't change). This prevents the "stale app" problem where users see old JS after a deploy.
- **Stripe card collection uses SetupIntent + PaymentElement** — the old `EmbeddedCheckout`/`create-checkout-session` subscription flow is fully removed. Card details are collected via `StripeCheckoutWrapper` (SetupIntent) during onboarding; actual charges happen per-job via `direct-charge`. "Skip for now" is a `<Button variant="ghost">` that sets `paymentDeferred: true` and continues onboarding.

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

# Demo mode — flip through all 25 screens without an account:
#   Navigate to http://localhost:5173/demo
#   OR click "View Demo — Flip through all screens" on the Login page
#   Use the DemoNavigator bar (bottom of screen) to jump between screens
#   Exit button clears demo mode and returns to Login

# Login shortcut for testing with a real account:
# 1. Any Firebase-registered email + password → lands on role selection
# 2. Toggle to "Admin Login" → sign in as admin user (requires admin Firebase account)
```

---

## 🧪 Testing — `/test-feedback` skill

User-testing feedback gets handled through the `/test-feedback` slash command (defined in `.claude/skills/test-feedback/SKILL.md`). It uses Playwright MCP (configured in `.mcp.json`) to drive a headless Chromium against `localhost:5173` and produces a structured plan file the team approves before any source change lands.

**One-time setup (per workstation):**
1. `cp .env.test.example .env.test` and fill in passwords for the three test users.
2. Start the dev server: `npm run dev`.
3. Run `/test-feedback "<some piece of feedback>"`. On first run, Claude Code prompts to enable the Playwright MCP server (approve once). The skill then bootstraps the test users by signing them up through the real onboarding flow.

**Test users (filter these out of all analytics):**
- `homeowner@tradeson.test`
- `tradesperson@tradeson.test`
- `pm@tradeson.test`

**Analytics filter — required wherever we read user activity:**
- Firebase Analytics / GA4: exclude `user_email LIKE '%@tradeson.test'` in any dashboard or BigQuery export.
- Postgres-derived metrics: same WHERE clause on `users.email`.
- BigQuery (when wired): same — apply at the view layer so it's enforced once.
- *Recommended next change:* in `AuthContext.login`, call `setUserProperties(analytics, { is_test_account: 'true' })` when the email ends with `@tradeson.test`. One-line addition; closes the loop in Firebase Analytics user properties.

**Plan files (`tests/feedback-runs/<date>-<slug>/plan.md`):**
- Markdown with `status: draft | approved | implemented` frontmatter.
- The plan file is the audit trail — it IS committed to git.
- Screenshots and the bootstrap fingerprint are gitignored.
- Approval is human-only: edit `status:` to `approved`, then re-invoke `/test-feedback <plan-path>`.

**Don't:**
- Don't run `/test-feedback` against the production URL — Playwright will pollute real analytics. Always against `localhost:5173`.
- Don't reuse the `/demo` localStorage flow for test stories. Demo mode bypasses `RequireAuth` and the API; you'd be testing the mocks, not the app.

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
