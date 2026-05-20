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
