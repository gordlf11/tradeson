# TradesOn — Backend Demo Runbook (for client calls)

Shows data flowing into the right store as a user exercises the app. Duration: ~7 min of demo + 2 min wrap. Works best with three browser windows visible at once.

## Architecture one-liner (for the client's opening)

> "TradesOn uses Postgres for the transactional stuff — users, jobs, quotes, bookings — and Firebase/Firestore for the real-time messaging layer. We'll watch data land in both as we go."

## Setup (5 min before the call)

1. **Window A (app)** — https://tradeson-app-63629008205.us-central1.run.app. Signed out. Incognito if you've tested there before.
2. **Window B (Postgres)** — https://console.cloud.google.com/sql/instances/tradeson-db/studio?project=tradeson-491518. Authenticate to Cloud SQL Studio. Paste the queries below into separate tabs so you can switch with one click.
3. **Window C (Firestore)** — https://console.firebase.google.com/project/tradeson-491518/firestore/data. Start on the `threads` collection view. Leave it open.
4. Have a **second incognito window** ready for the tradesperson identity.

## Queries to pre-load in Cloud SQL Studio (Window B)

Save each as a tab. They're all safe read-only.

```sql
-- Tab "users" — watch new signups appear
SELECT id, email, full_name, role, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

```sql
-- Tab "jobs" — watch new jobs and status changes
SELECT id, title, category, status, homeowner_user_id,
       assigned_tradesperson_id, created_at, updated_at
FROM jobs
ORDER BY created_at DESC
LIMIT 5;
```

```sql
-- Tab "quotes" — watch quote submissions and acceptances
SELECT id, job_id, tradesperson_user_id, price, status,
       created_at, accepted_at
FROM quotes
ORDER BY created_at DESC
LIMIT 5;
```

```sql
-- Tab "overview" — quick headline counts
SELECT
  (SELECT count(*) FROM users)  AS users,
  (SELECT count(*) FROM jobs)   AS jobs,
  (SELECT count(*) FROM quotes) AS quotes;
```

## Script (~7 min of demo)

### 0. Opening (30s)
Run the **overview** query once. Read the counts aloud. "These are the real counts right now — we'll watch them grow as I demo."

### 1. Customer signup (1 min)

In **Window A**, go to `/signup`. Create an account: a fresh email (`demo-customer-<timestamp>@yourdomain.com` works with plus-addressing).

Narrate: *"Signup writes to Firebase Auth for the identity and to Postgres for the profile, in one flow."*

Flip to **Window B** → `users` tab → click Run. **New row appears.** Point at the `email`, `role`, `created_at` fields.

### 2. Complete onboarding + create a job (2 min)

Back in Window A: complete the 5 onboarding steps, then land on `/job-creation` and complete all 5 steps. Use a title the client will remember — something on-brand like "Demo — Kitchen faucet repair for Acme Corp HQ."

On the final step, click **Post Job**. Watch the step 6 success screen.

Flip to **Window B** → `jobs` tab → Run. **The job is there**, status `open`.

Narrate: *"That's a transactional write — every field is indexed, queryable by our analytics pipeline, and backed up daily by Cloud SQL."*

### 3. Tradesperson signs up and sees the job (1 min)

Switch to your **second incognito window**. Sign up as a Licensed Tradesperson, pick Plumbing as primary trade, and navigate to `/job-board`.

The job you just posted is in the list. Point at it.

Narrate: *"No mock data — this is the same Postgres row we just saw, now rendered for a different user with different access rules."*

### 4. Submit a quote (1 min)

Tap the job → fill the quote modal: price `275`, hours `2`, overage `85`, a quick message. Click **Submit Quote**.

Flip to **Window B** → `quotes` tab → Run. **Quote row appears.** Highlight `job_id`, `tradesperson_user_id`, `price`, `status = pending`.

Narrate: *"When that quote landed in Postgres, our API also emitted an FCM push notification to the customer's device — we'll see that surfaced in the next step."*

### 5. Customer accepts the quote (1 min)

Back to **Window A** (customer). Refresh `/dashboard`. Pending job now shows `1 quote`. Click through → **Accept**.

Flip to **Window B** → `jobs` tab → Run. **Status changed** from `open` to `scheduled`, and `assigned_tradesperson_id` is now set.

Run the `quotes` tab again. **Quote status changed** from `pending` to `accepted`, `accepted_at` is populated.

Narrate: *"Single action, two atomic updates — the job is assigned and the quote is locked. Any competing quotes would get auto-rejected by the same transaction."*

### 6. Messaging lands in Firestore (1 min)

From the accepted job in Window A, open the messaging icon. Send a message ("Heading over Thursday at 9am — see you then!").

Flip to **Window C (Firestore)**. You should see a new document in `threads` keyed `job-<uuid>__<uid1>_<uid2>`. Click in. Show the `participants` array, `lastMessage`, `lastMessageAt`. Open the `messages` subcollection. **Your message is there** with `senderId`, `text`, `createdAt`.

Narrate: *"Messages go to Firestore instead of Postgres. It's optimized for sub-second real-time — when the tradesperson replies in a moment, the customer's window will update without a page refresh."*

Switch to the tradesperson window. Open the thread. The message is there. Reply. Watch the customer window update live.

### 7. Close with the overview (30s)

Flip to **Window B** → `overview` tab → Run. Show the delta versus what you ran at step 0.

Say: *"Everything you just saw — signup, job, quote, accept, message — is in a database you can audit. Postgres for the contract-of-record data, Firestore for the live collaboration. No mocks, no localStorage tricks. This is what the client will be using."*

## Common questions from clients + answers

- **"What if the database goes down?"** — Cloud SQL has automated daily backups to Cloud Storage. Point-in-time recovery is available if we enable it. Cloud Run API has multiple instances with auto-failover.
- **"How do we see reports?"** — BigQuery pipeline is designed but not yet wired. Once enabled (one-day effort), every Postgres change streams to BigQuery via Datastream CDC, and messaging activity streams via the Firestore-to-BigQuery extension. Your analytics team gets SQL access.
- **"How many users can this handle?"** — Cloud SQL db-f1-micro (current tier) is a dev instance. Production tier bumps to db-custom-2-7680 handles ~10K active users comfortably. Cloud Run scales to 20 instances automatically.
- **"Is my data safe?"** — Firestore rules lock down everything except messaging to admin-only on the client side; clients can't write jobs or quotes through the browser. Every Postgres write goes through our authenticated Cloud Run API with audit logging.

## Troubleshooting during the demo

- **"Failed to post job" banner** — likely API auth issue. Sign out, clear IndexedDB (`indexedDB.deleteDatabase('firebaseLocalStorageDb')`), sign in again.
- **Cloud SQL Studio "connection expired"** — reauth. Happens ~once an hour. Have the tab pre-opened and reconnected before the call.
- **Firestore console shows no `threads` doc** — the thread is created the first time a message is sent. If you open the modal without sending, nothing to see.
