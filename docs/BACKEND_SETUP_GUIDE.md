# TradesOn Backend Setup Guide

> Reference doc for the team. Updated April 9, 2026.

---

## What Was Built

### Infrastructure (GCP Project: `tradeson-491518`)

| Resource | Type | Details |
|---|---|---|
| **Cloud SQL** | PostgreSQL 16 | Instance: `tradeson-db`, IP: `34.58.3.14`, DB: `tradeson_app` |
| **Cloud Run (API)** | Node.js/Express | Service: `tradeson-api`, URL: `https://tradeson-api-63629008205.us-central1.run.app` |
| **Cloud Run (Web)** | React/Vite/nginx | Service: `tradeson-app`, URL: `https://tradeson-app-63629008205.us-central1.run.app` |
| **BigQuery** | Analytics | Dataset: `tradeson_analytics` (us-central1) |
| **Cloud Storage** | File uploads | Bucket: `tradeson-uploads-491518` |
| **Firebase Auth** | Email/Password + Google | Project: `tradeson-491518` |
| **Firebase Messaging** | FCM push notifications | Sender ID: `63629008205` |
| **Firestore** | Real-time chat + tracking | Location: `nam5` (US) |

### Database Schema (26 Tables)

Run `api/src/schema/migration.sql` to recreate. Tables are organized as:

**Users & Profiles (8 tables):**
- `users` — central identity, linked to Firebase via `firebase_uid`
- `user_addresses` — primary address per user
- `user_notification_preferences` — SMS/email/push prefs
- `homeowner_profiles` — homeowner-specific fields (S-06)
- `property_manager_profiles` — PM fields (S-04)
- `managed_properties` — PM portfolio locations
- `realtor_profiles` — realtor fields (S-05)
- `realtor_clients` — client email invitations

**Tradesperson (4 tables):**
- `tradesperson_profiles` — shared for licensed + unlicensed (S-07/S-08)
- `service_areas` — zip codes served
- `compliance_documents` — license uploads + verification status
- `payout_accounts` — Stripe Connect configuration

**Job Lifecycle (5 tables):**
- `jobs` — job postings with full status tracking
- `job_photos` — intake/before/after/completion photos
- `quotes` — tradesperson bids with pricing + overage rate
- `appointments` — scheduling with time slots
- `appointment_checklist` — pre-service items

**Payments & Invoicing (3 tables):**
- `payments` — Stripe payment intents + platform fee tracking
- `invoices` — job invoices
- `invoice_line_items` — line-item breakdown

**Communication (3 tables):**
- `conversations` — metadata in PG (participants, job link)
- `notifications` — push/email/SMS delivery tracking
- `device_tokens` — FCM token registry

**Other (3 tables):**
- `scope_changes` — on-site price adjustments
- `reviews` — star ratings + comments
- `audit_log` — immutable action log

---

## API Endpoints

Base URL: `https://tradeson-api-63629008205.us-central1.run.app`

All endpoints (except `/health`) require a Firebase ID token in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check (no auth) |
| POST | `/api/v1/users` | Create user on first Firebase login |
| GET | `/api/v1/users/me` | Get current user + role profile + address + prefs |
| PUT | `/api/v1/users/me` | Update basic user fields |
| POST | `/api/v1/onboarding/homeowner` | Save homeowner profile |
| POST | `/api/v1/onboarding/property-manager` | Save PM profile + managed properties |
| POST | `/api/v1/onboarding/realtor` | Save realtor profile + client emails |
| POST | `/api/v1/onboarding/licensed-trade` | Save licensed trade profile + compliance docs |
| POST | `/api/v1/onboarding/non-licensed-trade` | Save unlicensed trade profile |
| POST | `/api/v1/jobs` | Create a new job |
| GET | `/api/v1/jobs` | List jobs (filtered by role) |
| GET | `/api/v1/jobs/:id` | Get job with photos + quotes |
| POST | `/api/v1/quotes/:jobId/quotes` | Submit a quote (sends FCM to customer) |
| POST | `/api/v1/quotes/:id/accept` | Accept quote (sends FCM "Bid Accepted!" to tradesperson) |

---

## Frontend Integration Files

These files were created and are ready to use:

### `src/services/firebase.ts`
Firebase client SDK initialization. Exports `auth`, `db` (Firestore), `analytics`, and `initMessaging()`.

### `src/services/api.ts`
API client wrapper. Automatically injects Firebase JWT into every request. Usage:

```typescript
import api from '../services/api';

// Create user after Firebase signup
await api.createUser({ full_name: 'John Doe', phone_number: '312-555-0100', role: 'homeowner' });

// Get current user profile
const user = await api.getMe();

// Save onboarding data (replaces localStorage)
await api.onboardHomeowner({ property_type: 'house', service_interests: ['Plumbing'] });

// Create a job
await api.createJob({ title: 'Leaking faucet', category: 'plumbing', ... });

// List jobs
const { jobs } = await api.listJobs({ status: 'open' });

// Submit a quote
await api.submitQuote(jobId, { price: 250, estimated_hours: 2, hourly_overage_rate: 75, message: '...' });

// Accept a quote (triggers instant FCM push)
await api.acceptQuote(quoteId);
```

### `firebase/firestore.rules`
Security rules for Firestore. Conversations are restricted to participants. Tracking is write-restricted to assigned tradesperson.

---

## Auth Flow

```
1. User signs up/logs in via Firebase Auth (client SDK)
2. Firebase issues ID token (JWT)
3. Frontend includes token: Authorization: Bearer <token>
4. API middleware verifies token via Firebase Admin SDK
5. API looks up user by firebase_uid in PostgreSQL
6. If no user row exists → frontend calls POST /api/v1/users to create one
```

---

## What's Left to Do (Frontend Integration)

### Priority 1: Auth Context
- Create `src/contexts/AuthContext.tsx` — React context wrapping Firebase auth state
- Replace `localStorage.getItem('userRole')` in `App.tsx` with auth context
- Replace mock login in `Login.tsx` with `firebase.auth().signInWithEmailAndPassword()`
- Replace mock signup in `Signup.tsx` with `firebase.auth().createUserWithEmailAndPassword()` + `POST /api/v1/users`

### Priority 2: Onboarding Pages
Replace `localStorage.setItem(...)` calls with API calls in:
- `HomeownerOnboarding.tsx` → `api.onboardHomeowner(data)`
- `PropertyManagerOnboarding.tsx` → `api.onboardPropertyManager(data)`
- `RealtorOnboarding.tsx` → `api.onboardRealtor(data)`
- `LicensedTradespersonOnboarding.tsx` → `api.onboardLicensedTrade(data)`
- `UnlicensedTradespersonOnboarding.tsx` → `api.onboardUnlicensedTrade(data)`

### Priority 3: Job Board + Dashboards
Replace mock data with API calls in:
- `JobCreation.tsx` → `api.createJob(data)`
- `JobBoardEnhanced.tsx` → `api.listJobs()` + `api.submitQuote()`
- `TradespersonDashboard.tsx` → `api.listJobs()` + `api.getMe()`
- `CustomerDashboard.tsx` → `api.listJobs()` + `api.getMe()`

### Priority 4: Real-Time Features
- Wire FCM token registration on login → `POST device_tokens`
- Wire Firestore listeners for in-app chat
- Wire Firestore listeners for live job tracking

### Priority 5: Payments (Phase E)
- Stripe Connect for tradesperson payouts
- Stripe PaymentIntents for customer charges
- Stripe webhooks via Cloud Function

---

## Local Development

```bash
# Frontend
cd tradeson
npm install
npm run dev                    # http://localhost:5173

# API (local)
cd api
npm install
export DATABASE_URL="postgresql://postgres:tradeson-mvp-2026@34.58.3.14:5432/tradeson_app"
npm run dev                    # http://localhost:8080

# Set frontend to use local API
# Create .env.local:
VITE_API_URL=http://localhost:8080
```

---

## Key Files

| File | Purpose |
|---|---|
| `api/src/schema/migration.sql` | Full database DDL (26 tables) |
| `api/src/index.ts` | Express app entry point |
| `api/src/middleware/auth.ts` | Firebase JWT validation |
| `api/src/routes/users.ts` | User CRUD |
| `api/src/routes/onboarding.ts` | All 5 role onboarding endpoints |
| `api/src/routes/jobs.ts` | Job CRUD with role-based filtering |
| `api/src/routes/quotes.ts` | Quote submission + acceptance with FCM |
| `api/Dockerfile` | API container build |
| `api/cloudbuild.yaml` | Cloud Build → Cloud Run deploy |
| `src/services/firebase.ts` | Frontend Firebase SDK config |
| `src/services/api.ts` | Frontend API client with JWT auth |
| `docs/DATABASE_SCHEMA.md` | Original schema design doc |
| `firebase/firestore.rules` | Firestore security rules |
