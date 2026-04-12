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
   - PayBright sandbox credentials in `.env`
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
- **Real-time messaging**: Firebase Firestore (`onSnapshot`)
- **Auth**: Firebase Auth (wired in `src/services/firebase.ts` — login/signup currently mocked in UI)
- **Database**: Firebase Firestore (project: `tradeson-491518`)
- **File Storage**: Firebase Storage (photos, insurance docs, government IDs)
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **AI**: Google Vertex AI / Gemini Flash (mocked in UI — not yet wired)
- **Payments**: PayBright (BNPL, primary) + Stripe Connect Express (card processing)
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

## 🚀 Scale Target: 10,000+ Users — Launch Readiness Tracker

This section tracks every item required to take TradesOn from demo to a production platform capable of handling 10,000+ users. Each item has an owner, priority, and status. Claude should reference this list at the start of every session and update statuses as items are completed.

**Status key:** `[ ]` Not started · `[~]` In progress · `[x]` Complete

---

### 🔴 CRITICAL — Blockers (App cannot safely launch without these)

#### Authentication & Session Management
- [ ] **Wire Firebase Auth login** — replace `localStorage` mock with `signInWithEmailAndPassword` · *Larry*
- [ ] **Wire Firebase Auth signup** — replace mock with `createUserWithEmailAndPassword` + write user doc to Firestore · *Larry*
- [ ] **On login, load Firestore user profile** — derive role, name, and settings from `users/{uid}` not `localStorage` · *Larry*
- [ ] **Auth guard on all protected routes** — `onAuthStateChanged` listener; redirect unauthenticated users to `/login` · *Larry*
- [ ] **Persist session across page refresh** — Firebase Auth handles this via `setPersistence(browserLocalPersistence)` · *Larry*
- [ ] **Remove debug tools from Login page** — delete the "Debug:" line and "Reset User State" button before launch · *Kevin*

#### Firestore Security Rules
- [ ] **Users collection** — users can only read/write their own `users/{uid}` document · *Larry*
- [ ] **Jobs collection** — customers read/write their own jobs; tradespeople read all `status=open` jobs; no public write · *Larry*
- [ ] **Quotes collection** — tradespeople write their own quotes; job owner reads all quotes on their job · *Larry*
- [ ] **Messages collection** — only thread participants can read/write messages in `messaging_threads/{threadId}/messages` · *Larry*
- [ ] **Reviews collection** — authenticated users write; all authenticated users read · *Larry*
- [ ] **Compliance / Audit / Flagged** — admin-only read/write via Firebase custom claims · *Larry*
- [ ] **Admin custom claim** — set `role: 'admin'` on the admin Firebase Auth user via Admin SDK; verify claim server-side · *Larry*

#### Data Layer — Replace Mock Data with Firestore
- [ ] **JobBoard** — replace `mockJobs` array with `getDocs(query(collection(db, 'jobs'), where('status', '==', 'open')))` · *Larry*
- [ ] **CustomerDashboard** — load jobs where `customerId == currentUser.uid` · *Larry*
- [ ] **TradespersonDashboard** — load accepted/active jobs where `acceptedTradespersonId == currentUser.uid` · *Larry*
- [ ] **Quote submission** — write new quote doc to `quotes` collection on submit · *Larry*
- [ ] **Quote acceptance** — update job `status`, `acceptedQuoteId`, `acceptedTradespersonId` in Firestore on accept · *Larry*
- [ ] **Job creation** — write full job doc to Firestore on form completion · *Larry*
- [ ] **Admin dashboard** — load compliance, flagged accounts, audit log from Firestore (not mock arrays) · *Larry*
- [ ] **Reviews** — write review doc on completion; load tradesperson reviews from `reviews` collection · *Larry*
- [ ] **Run Firestore seed script** — `node scripts/seedFirestore.mjs` against production Firestore to pre-populate data · *Larry*

---

### 🟠 HIGH PRIORITY — Required for a Trustworthy Launch

#### File Uploads (Firebase Storage)
- [ ] **Job photos** — wire photo picker in JobCreation step 1 to upload to `gs://tradeson/jobs/{jobId}/photos/` · *Kevin*
- [ ] **Insurance certificate** — wire file upload in InsuranceUpload page to `gs://tradeson/compliance/{userId}/insurance/` · *Kevin*
- [ ] **Government ID** — wire file upload in tradesperson onboarding to `gs://tradeson/compliance/{userId}/govid/` · *Kevin*
- [ ] **Profile photo** — wire camera button in ProfileSettings to upload to `gs://tradeson/users/{userId}/avatar/` · *Kevin*
- [ ] **Firebase Storage security rules** — users can only write to their own path; compliance docs readable by admins only · *Larry*

#### Firestore Indexes (queries will fail in production without these)
- [ ] **jobs index** — `(status ASC, tradeId ASC, createdAt DESC)` · *Larry*
- [ ] **jobs index** — `(customerId ASC, status ASC, createdAt DESC)` · *Larry*
- [ ] **quotes index** — `(jobId ASC, totalPrice ASC)` · *Larry*
- [ ] **messaging_threads index** — `(customerId ASC, updatedAt DESC)` · *Larry*
- [ ] **messaging_threads index** — `(tradespersonId ASC, updatedAt DESC)` · *Larry*
- [ ] **reviews index** — `(tradespersonId ASC, createdAt DESC)` · *Larry*

#### Payment Flow Completion
- [ ] **PayBright webhook endpoint** — receive payment confirmation and update job `paymentStatus` in Firestore · *Larry*
- [ ] **Stripe Connect onboarding** — complete tradesperson Stripe Express account creation flow (currently PayBright-only UI) · *Kevin/Larry*
- [ ] **Payout trigger** — on job completion + payment confirmed, initiate tradesperson payout via Stripe Connect · *Larry*
- [ ] **Payment history** — load real transaction records into CustomerDashboard Payment History section · *Larry*
- [ ] **Platform fee calculation** — enforce platform fee % in payment logic (not just displayed in UI) · *Larry*

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

#### Push Notifications (FCM)
- [ ] **FCM service worker** — register `firebase-messaging-sw.js` in `public/` for background push support · *Kevin*
- [ ] **Store FCM token** — on login, save user's FCM token to `users/{uid}.fcmToken` · *Larry*
- [ ] **Send notification on new quote** — trigger FCM message to job owner when a tradesperson submits a quote · *Larry*
- [ ] **Send notification on job accepted** — trigger FCM to tradesperson when their quote is accepted · *Larry*
- [ ] **Send notification on new message** — trigger FCM when a message arrives and recipient is not in the thread · *Larry*
- [ ] **Send notification on compliance decision** — trigger FCM to tradesperson on approval/rejection/more-docs · *Larry*

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

| Category | Total Items | Complete | Remaining |
|---|---|---|---|
| Critical — Auth & Security | 13 | 0 | 13 |
| Critical — Data Layer | 9 | 0 | 9 |
| High — File Uploads | 5 | 0 | 5 |
| High — Firestore Indexes | 6 | 0 | 6 |
| High — Payments | 5 | 0 | 5 |
| High — Error Handling | 4 | 0 | 4 |
| Important — AI | 3 | 0 | 3 |
| Important — Notifications | 6 | 0 | 6 |
| Important — Performance | 4 | 0 | 4 |
| Important — Mobile | 5 | 0 | 5 |
| Launch Enhancements | 14 | 0 | 14 |
| **TOTAL** | **74** | **0** | **74** |

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

### 🔲 NEXT PRIORITY — Auth & Data Wiring (Pre-Launch Critical)
These items are the gap between demo and production-ready:

1. **Real Firebase Auth** (Larry)
   - Wire `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` in Login + Signup
   - On login, load user Firestore profile to get actual role (not `localStorage`)
   - Auth guard: redirect unauthenticated users to `/login` via `onAuthStateChanged`

2. **Firestore Rules** (Larry)
   - Users can only read/write their own documents
   - Tradespersons can read open jobs; customers can read their own jobs
   - Admins have elevated access via custom claims

3. **Firestore Data Wiring** (Larry)
   - Replace `mockData.ts` arrays with real Firestore `getDocs` / `onSnapshot` calls
   - Run seed script: `node scripts/seedFirestore.mjs` (needs service account key)
   - Priority screens: JobBoard, CustomerDashboard, TradespersonDashboard

4. **Firestore Composite Indexes** (Larry)
   - `jobs` collection: `(tradeId ASC, status ASC, createdAt DESC)`
   - `quotes` collection: `(jobId ASC, totalPrice ASC)`
   - `messaging_threads` collection: `(customerId ASC, updatedAt DESC)`

5. **Firebase Storage** (Kevin)
   - Wire photo upload in Job Creation (currently no-op)
   - Wire insurance doc upload in InsuranceUpload page
   - Wire government ID upload in tradesperson onboarding

6. **Vertex AI Job Analysis** (Larry)
   - Replace mocked AI summary in JobCreation step 3 with real Gemini Flash call
   - Input: job title + description + category + severity
   - Output: summary, estimated cost range, estimated hours

---

## 🗄️ Firestore Collections (Schema)

All collections seeded via `scripts/seedFirestore.mjs`. Schema below:

| Collection | Key Fields |
|---|---|
| `users` | `id, fullName, email, role, phone, serviceRadius, isVerified, isActive, createdAt` |
| `jobs` | `id, customerId, title, category, tradeId, severity, status, address, quotesCount, createdAt` |
| `quotes` | `id, jobId, tradespersonId, totalPrice, estimatedHours, message, status, createdAt` |
| `compliance_submissions` | `id, tradespersonId, licenseNumber, hasGovId, hasLicenseDoc, hasInsuranceDoc, status, adminNote` |
| `flagged_accounts` | `id, userId, flagType, severity, flagReason, resolved, flaggedAt` |
| `audit_log` | `id, adminEmail, actionType, targetUserId, reason, timestamp` |
| `messaging_threads` | `id, jobId, customerId, tradespersonId, lastMessage, lastMessageAt` |
| `messages` | subcollection of `messaging_threads/{threadId}/messages` |
| `reviews` | `id, jobId, reviewerId, tradespersonId, rating, body, createdAt` |
| `platform_metrics` | `id, period, users, jobs, revenue, activationRate` |

**To seed Firestore:**
```bash
npm install firebase-admin
# Download service account key: Firebase Console → Project Settings → Service Accounts → Generate new private key
# Save as: scripts/serviceAccountKey.json  (DO NOT commit this file)
node scripts/seedFirestore.mjs
```

---

## 🔑 Key Design Decisions (Do Not Revert)

- **PayBright is the primary payment method** — Stripe is secondary (card fallback). Never show Stripe branding during onboarding.
- **No star ratings on quote cards** — display `# reviews` as a clickable link instead. Stars only appear in the tradesperson's own profile preview.
- **Service radius is a slider (5–50 mi)**, not buttons, on all onboarding location pages.
- **Accepted job button stays green** (`var(--success)`) even after navigating away. Use `style` prop override on Button component.
- **Admin does not use BottomNav** — excluded via `hideNavPaths` in `App.tsx`.
- **Logo uses `public/logo.png`** (real brand mark) — do not regenerate SVG paths.
- **Messaging uses Firebase with local fallback** — if Firebase throws, messages are stored in local state only (demo mode).
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
