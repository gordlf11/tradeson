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
