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
