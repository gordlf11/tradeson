# TradesOn Database Schema Documentation

**Version**: 1.0
**Last Updated**: 2026-03-29
**Status**: Draft for Engineering Review
**Stack**: Firebase Auth + Cloud SQL (PostgreSQL 15) + BigQuery (Phase 1D)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Schema Definitions](#3-schema-definitions)
   - [Identity & Auth](#31-identity--auth)
   - [Role-Specific Profiles](#32-role-specific-profiles)
   - [Brokerage Management](#33-brokerage-management)
   - [Properties](#34-properties)
   - [Job Lifecycle](#35-job-lifecycle)
   - [Scheduling](#36-scheduling)
   - [Payments & Billing](#37-payments--billing)
   - [Compliance & Verification](#38-compliance--verification)
   - [Support](#39-support)
   - [Audit & Analytics](#310-audit--analytics)
4. [Indexes](#4-indexes)
5. [Data Retention Policy](#5-data-retention-policy)
6. [BigQuery Analytics Mirror (Phase 1D)](#6-bigquery-analytics-mirror)
7. [Screen-to-Table Mapping](#7-screen-to-table-mapping)

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Firebase Auth   │────▶│  Cloud SQL (Postgres) │────▶│    BigQuery      │
│                 │     │  Transactional Store   │     │  Analytics Mirror │
│  - Email/Pass   │     │  - Users & Roles       │     │  (Phase 1D)      │
│  - OAuth        │     │  - Jobs & Quotes       │     │  - Dashboards    │
│  - JWT + Claims │     │  - Payments            │     │  - Funnel Metrics│
│  - Biometric*   │     │  - Compliance          │     │  - Audit Archive │
└─────────────────┘     │  - Audit Log           │     └─────────────────┘
                        └──────────────────────┘
                                  │
                        ┌─────────┴──────────┐
                        │  Cloud Storage      │
                        │  - Document uploads │
                        │  - Job photos       │
                        │  - Invoices (PDF)   │
                        └─────────────────────┘
```

### Key Principles
- **Firebase Auth** owns authentication; `firebase_uid` is the bridge to PostgreSQL
- **Cloud SQL (PostgreSQL)** is the single source of truth for all transactional data
- **BigQuery** is Phase 1D — analytics only, populated via Pub/Sub or Datastream
- **Normalized schema**: base `users` table + role-detail tables (no nullable role columns)
- **Multi-role**: one user can hold multiple roles; each role has its own subscription
- **Active role**: session-scoped via JWT custom claims, NOT persisted in DB
- **Soft deletes**: `deleted_at` on entities that support deactivation (NOT compliance/audit)
- **snake_case** for all table and column names
- **UUIDs** for all primary keys

---

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    %% ===== IDENTITY & AUTH =====
    users {
        uuid id PK
        text firebase_uid UK
        text email UK
        text display_name
        text phone
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        text role
        text status
        text stripe_sub_id
        timestamptz subscribed_at
        timestamptz expires_at
        timestamptz created_at
    }

    %% ===== ROLE PROFILES =====
    homeowner_profiles {
        uuid user_id PK_FK
        text preferred_contact_method
        jsonb saved_addresses
    }

    tradesperson_profiles {
        uuid user_id PK_FK
        text business_name
        boolean is_licensed
        integer service_radius_miles
        text_arr categories
        text stripe_account_id
        jsonb availability
        numeric average_rating
        integer completed_jobs_count
    }

    realtor_profiles {
        uuid user_id PK_FK
        uuid brokerage_id FK
        text license_number
        text license_state
        text service_state
        text service_city
        integer service_radius_miles
    }

    property_manager_profiles {
        uuid user_id PK_FK
        text company_name
        text company_address
        text company_email
        text company_phone
        text poc_name
        text poc_email
        text poc_phone
        text property_count_tier
        text_arr service_preferences
        text plan_type
    }

    %% ===== BROKERAGE =====
    brokerages {
        uuid id PK
        text name
        text license_number
        text license_state
        text address
        uuid admin_user_id FK
        text stripe_customer_id
        integer seats_purchased
        integer seats_used
        text plan_type
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    %% ===== PROPERTIES =====
    properties {
        uuid id PK
        uuid owner_id FK
        text owner_type
        text address_line1
        text address_line2
        text city
        text state
        text zip_code
        point location
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    %% ===== JOBS =====
    jobs {
        uuid id PK
        uuid customer_id FK
        uuid property_id FK
        text title
        text description
        text category
        text room
        text severity
        text status
        text ai_summary
        numrange budget_range
        jsonb ai_analysis
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }

    job_photos {
        uuid id PK
        uuid job_id FK
        text photo_url
        text photo_type
        text caption
        integer sort_order
        timestamptz created_at
    }

    job_status_history {
        uuid id PK
        uuid job_id FK
        text from_status
        text to_status
        uuid changed_by FK
        text reason
        timestamptz created_at
    }

    %% ===== QUOTES =====
    quotes {
        uuid id PK
        uuid job_id FK
        uuid tradesperson_id FK
        numeric amount
        text message
        integer estimated_hours
        text status
        text service_guarantee
        timestamptz created_at
        timestamptz updated_at
    }

    scope_changes {
        uuid id PK
        uuid job_id FK
        uuid tradesperson_id FK
        text description
        numeric additional_amount
        text status
        jsonb photos
        timestamptz created_at
        timestamptz resolved_at
    }

    %% ===== SCHEDULING =====
    appointments {
        uuid id PK
        uuid job_id FK
        uuid tradesperson_id FK
        uuid customer_id FK
        timestamptz scheduled_start
        timestamptz scheduled_end
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    time_slot_proposals {
        uuid id PK
        uuid appointment_id FK
        uuid proposed_by FK
        timestamptz slot_start
        timestamptz slot_end
        boolean selected
        timestamptz created_at
    }

    availability_templates {
        uuid id PK
        uuid tradesperson_id FK
        integer day_of_week
        time start_time
        time end_time
        boolean is_active
    }

    availability_exceptions {
        uuid id PK
        uuid tradesperson_id FK
        date exception_date
        boolean is_unavailable
        time start_time
        time end_time
        text reason
    }

    %% ===== PAYMENTS =====
    payment_methods {
        uuid id PK
        uuid user_id FK
        text stripe_payment_method_id
        text type
        text last_four
        text brand
        boolean is_default
        timestamptz created_at
    }

    transactions {
        uuid id PK
        uuid job_id FK
        uuid payer_id FK
        uuid payee_id FK
        numeric amount
        numeric platform_fee
        numeric net_amount
        text stripe_payment_intent_id
        text status
        text type
        timestamptz captured_at
        timestamptz created_at
    }

    invoices {
        uuid id PK
        uuid job_id FK
        uuid customer_id FK
        uuid tradesperson_id FK
        text invoice_number
        numeric subtotal
        numeric platform_fee
        numeric total
        jsonb line_items
        text pdf_url
        text status
        timestamptz sent_at
        timestamptz paid_at
        timestamptz created_at
    }

    %% ===== COMPLIANCE =====
    compliance_records {
        uuid id PK
        uuid user_id FK
        text type
        text status
        text document_url
        uuid verified_by FK
        timestamptz verified_at
        timestamptz expires_at
        text rejection_reason
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    %% ===== SUPPORT =====
    support_tickets {
        uuid id PK
        uuid user_id FK
        text category
        text subject
        text description
        text status
        text priority
        uuid assigned_admin_id FK
        timestamptz resolved_at
        timestamptz created_at
        timestamptz updated_at
    }

    support_messages {
        uuid id PK
        uuid ticket_id FK
        uuid sender_id FK
        text body
        text_arr attachment_urls
        timestamptz created_at
    }

    %% ===== REVIEWS =====
    reviews {
        uuid id PK
        uuid job_id FK
        uuid reviewer_id FK
        uuid reviewee_id FK
        integer rating
        text comment
        timestamptz created_at
    }

    %% ===== NOTIFICATIONS =====
    notifications {
        uuid id PK
        uuid user_id FK
        text type
        text title
        text body
        jsonb data
        boolean is_read
        timestamptz read_at
        timestamptz created_at
    }

    %% ===== AUDIT =====
    audit_log {
        uuid id PK
        uuid actor_id FK
        text entity_type
        uuid entity_id
        text action
        jsonb old_state
        jsonb new_state
        inet ip_address
        text user_agent
        timestamptz created_at
    }

    %% ===== RELATIONSHIPS =====
    users ||--o{ user_roles : "has roles"
    users ||--o| homeowner_profiles : "homeowner detail"
    users ||--o| tradesperson_profiles : "tradesperson detail"
    users ||--o| realtor_profiles : "realtor detail"
    users ||--o| property_manager_profiles : "pm detail"
    users ||--o{ properties : "owns"
    users ||--o{ payment_methods : "has"
    users ||--o{ compliance_records : "submits"
    users ||--o{ support_tickets : "creates"
    users ||--o{ notifications : "receives"
    users ||--o{ reviews : "writes"

    brokerages ||--o{ realtor_profiles : "manages"
    brokerages ||--o| users : "admin"

    properties ||--o{ jobs : "location"
    users ||--o{ jobs : "creates"
    jobs ||--o{ job_photos : "has"
    jobs ||--o{ job_status_history : "tracks"
    jobs ||--o{ quotes : "receives"
    jobs ||--o{ scope_changes : "may have"
    jobs ||--o| appointments : "scheduled"
    jobs ||--o{ transactions : "payments"
    jobs ||--o| invoices : "billed"
    jobs ||--o{ reviews : "reviewed"

    users ||--o{ quotes : "submits"
    appointments ||--o{ time_slot_proposals : "has slots"
    users ||--o{ availability_templates : "sets"
    users ||--o{ availability_exceptions : "sets"

    support_tickets ||--o{ support_messages : "has"

    users ||--o{ audit_log : "performs"
```

---

## 3. Schema Definitions

### 3.1 Identity & Auth

#### `users`
Base identity table. One record per person, shared across all roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Internal user ID |
| `firebase_uid` | TEXT | UNIQUE, NOT NULL | Firebase Auth UID — bridge to auth layer |
| `email` | TEXT | UNIQUE, NOT NULL | Canonical email |
| `display_name` | TEXT | | Full name |
| `phone` | TEXT | | Phone number (E.164 format) |
| `avatar_url` | TEXT | | Profile photo URL (Cloud Storage) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | | Soft delete |

#### `user_roles`
Junction table for multi-role support. Each role has its own subscription status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users(id), NOT NULL | |
| `role` | TEXT | NOT NULL, CHECK IN ('homeowner', 'realtor', 'property_manager', 'tradesperson') | |
| `status` | TEXT | DEFAULT 'active', CHECK IN ('active', 'suspended', 'cancelled') | |
| `stripe_sub_id` | TEXT | | Stripe subscription ID for this role |
| `subscribed_at` | TIMESTAMPTZ | | When subscription started |
| `expires_at` | TIMESTAMPTZ | | When subscription expires |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| | | UNIQUE (user_id, role) | One record per role per user |

**Role switching flow:**
```
Login → Firebase Auth → API checks user_roles →
  if 1 role: auto-set active_role in JWT claim →
  if N roles: role selector UI → user picks → set active_role in JWT claim →
  Frontend renders role-specific shell
```

---

### 3.2 Role-Specific Profiles

#### `homeowner_profiles`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → users(id) | |
| `preferred_contact_method` | TEXT | CHECK IN ('email', 'phone', 'sms') | |
| `saved_addresses` | JSONB | DEFAULT '[]' | Array of saved home addresses |

#### `tradesperson_profiles`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → users(id) | |
| `business_name` | TEXT | | Optional business name |
| `is_licensed` | BOOLEAN | DEFAULT FALSE | Licensed vs non-licensed trade |
| `service_radius_miles` | INTEGER | DEFAULT 25 | Max distance willing to travel |
| `categories` | TEXT[] | | Trade categories: plumbing, electrical, hvac, carpentry, etc. |
| `stripe_account_id` | TEXT | | Stripe Connect Express account for payouts |
| `availability` | JSONB | | Weekly schedule template (legacy — prefer availability_templates) |
| `average_rating` | NUMERIC(3,2) | | Cached average from reviews |
| `completed_jobs_count` | INTEGER | DEFAULT 0 | Cached count |
| `bio` | TEXT | | Profile description |
| `years_experience` | INTEGER | | |

**Categories enum values:**
`electric`, `plumbing`, `general_contracting`, `renovation`, `hvac`, `roofing`, `landscaping`, `cleaning`, `painting`, `flooring`, `carpentry`, `masonry`, `general_handyman`, `furniture_assembly`, `moving`, `pressure_washing`, `window_cleaning`, `gutter_cleaning`

#### `realtor_profiles`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → users(id) | |
| `brokerage_id` | UUID | FK → brokerages(id) | NULL if independent |
| `license_number` | TEXT | | NAR/MLS license |
| `license_state` | TEXT | | State of licensure |
| `service_state` | TEXT | | Primary service state |
| `service_city` | TEXT | | Primary service city |
| `service_radius_miles` | INTEGER | DEFAULT 25 | |

#### `property_manager_profiles`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → users(id) | |
| `company_name` | TEXT | | |
| `company_address` | TEXT | | |
| `company_email` | TEXT | | |
| `company_phone` | TEXT | | |
| `poc_name` | TEXT | | Point of contact |
| `poc_email` | TEXT | | |
| `poc_phone` | TEXT | | |
| `property_count_tier` | TEXT | CHECK IN ('1-5', '6-20', '20+') | |
| `service_preferences` | TEXT[] | | Preferred trade categories |
| `plan_type` | TEXT | CHECK IN ('per_job', 'pro') | Pricing model |

---

### 3.3 Brokerage Management

#### `brokerages`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `name` | TEXT | NOT NULL | Brokerage company name |
| `license_number` | TEXT | | Brokerage license |
| `license_state` | TEXT | | |
| `address` | TEXT | | Physical address |
| `admin_user_id` | UUID | FK → users(id) | Brokerage owner/admin |
| `stripe_customer_id` | TEXT | | Billing account |
| `seats_purchased` | INTEGER | DEFAULT 0 | Licensed seat count |
| `seats_used` | INTEGER | DEFAULT 0 | Active realtors count |
| `plan_type` | TEXT | CHECK IN ('seat_based', 'usage_based') | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | | Soft delete |

**Screens served:** S-09 through S-16

---

### 3.4 Properties

#### `properties`
Addresses/locations for homeowners and property managers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `owner_id` | UUID | FK → users(id), NOT NULL | |
| `owner_type` | TEXT | CHECK IN ('homeowner', 'property_manager') | Polymorphic owner |
| `address_line1` | TEXT | NOT NULL | |
| `address_line2` | TEXT | | |
| `city` | TEXT | NOT NULL | |
| `state` | TEXT | NOT NULL | |
| `zip_code` | TEXT | NOT NULL | |
| `location` | POINT | | PostGIS lat/lng for distance queries |
| `metadata` | JSONB | | Unit count, property type, etc. |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | | |

---

### 3.5 Job Lifecycle

#### `jobs`
Core job entity — tracks full lifecycle from creation to close.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `customer_id` | UUID | FK → users(id), NOT NULL | Job creator |
| `property_id` | UUID | FK → properties(id) | Where the work is |
| `title` | TEXT | NOT NULL | AI-generated or user-provided |
| `description` | TEXT | | User's issue description |
| `category` | TEXT | NOT NULL | Trade category |
| `room` | TEXT | | Room/location within property |
| `severity` | TEXT | CHECK IN ('low', 'medium', 'high', 'critical') | |
| `status` | TEXT | DEFAULT 'draft', CHECK IN ('draft', 'open', 'quoted', 'scheduled', 'en_route', 'in_progress', 'completed', 'closed', 'cancelled', 'expired') | |
| `ai_summary` | TEXT | | AI-generated summary |
| `budget_range_low` | NUMERIC(10,2) | | Estimated low |
| `budget_range_high` | NUMERIC(10,2) | | Estimated high |
| `ai_analysis` | JSONB | | Full AI analysis payload (severity score, confidence, flags) |
| `accepted_quote_id` | UUID | FK → quotes(id) | Selected quote |
| `assigned_tradesperson_id` | UUID | FK → users(id) | Assigned after quote accepted |
| `expires_at` | TIMESTAMPTZ | | Job board expiration (default: created_at + 72h) |
| `completed_at` | TIMESTAMPTZ | | When work was marked complete |
| `closed_at` | TIMESTAMPTZ | | When customer approved completion |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Status flow:**
```
draft → open → quoted → scheduled → en_route → in_progress → completed → closed
                                                                    ↗
draft → open → expired                              (scope_change) ─┘
draft → open → cancelled
```

#### `job_photos`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), NOT NULL | |
| `photo_url` | TEXT | NOT NULL | Cloud Storage URL |
| `photo_type` | TEXT | CHECK IN ('initial', 'inspection', 'in_progress', 'completion', 'scope_change') | |
| `caption` | TEXT | | |
| `sort_order` | INTEGER | DEFAULT 0 | Display order |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `job_status_history`
Immutable log of all status transitions for a job.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), NOT NULL | |
| `from_status` | TEXT | | Previous status (NULL for creation) |
| `to_status` | TEXT | NOT NULL | New status |
| `changed_by` | UUID | FK → users(id) | Who triggered the change |
| `reason` | TEXT | | Optional reason (cancellation, expiration) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `quotes`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), NOT NULL | |
| `tradesperson_id` | UUID | FK → users(id), NOT NULL | |
| `amount` | NUMERIC(10,2) | NOT NULL | Quoted price |
| `message` | TEXT | | Cover message |
| `estimated_hours` | INTEGER | | Estimated completion time |
| `service_guarantee` | TEXT | | Guarantee statement |
| `status` | TEXT | DEFAULT 'pending', CHECK IN ('pending', 'accepted', 'declined', 'withdrawn', 'expired') | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `scope_changes`
Additional work requests during job execution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), NOT NULL | |
| `tradesperson_id` | UUID | FK → users(id), NOT NULL | |
| `description` | TEXT | NOT NULL | What additional work is needed |
| `additional_amount` | NUMERIC(10,2) | NOT NULL | Added cost |
| `status` | TEXT | DEFAULT 'pending', CHECK IN ('pending', 'accepted', 'declined') | |
| `photos` | JSONB | DEFAULT '[]' | Array of photo URLs |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `resolved_at` | TIMESTAMPTZ | | When customer accepted/declined |

---

### 3.6 Scheduling

#### `appointments`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), UNIQUE, NOT NULL | One appointment per job |
| `tradesperson_id` | UUID | FK → users(id), NOT NULL | |
| `customer_id` | UUID | FK → users(id), NOT NULL | |
| `scheduled_start` | TIMESTAMPTZ | NOT NULL | Confirmed start time |
| `scheduled_end` | TIMESTAMPTZ | | Estimated end |
| `status` | TEXT | DEFAULT 'proposed', CHECK IN ('proposed', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `time_slot_proposals`
Customer proposes 2-3 slots; tradesperson selects one.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `appointment_id` | UUID | FK → appointments(id), NOT NULL | |
| `proposed_by` | UUID | FK → users(id), NOT NULL | |
| `slot_start` | TIMESTAMPTZ | NOT NULL | |
| `slot_end` | TIMESTAMPTZ | NOT NULL | |
| `selected` | BOOLEAN | DEFAULT FALSE | TRUE = this slot was chosen |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `availability_templates`
Recurring weekly availability for tradespeople.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tradesperson_id` | UUID | FK → users(id), NOT NULL | |
| `day_of_week` | INTEGER | CHECK (0-6), NOT NULL | 0=Sunday, 6=Saturday |
| `start_time` | TIME | NOT NULL | e.g., 06:00 |
| `end_time` | TIME | NOT NULL | e.g., 18:00 |
| `is_active` | BOOLEAN | DEFAULT TRUE | |

#### `availability_exceptions`
One-off overrides (days off, modified hours).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tradesperson_id` | UUID | FK → users(id), NOT NULL | |
| `exception_date` | DATE | NOT NULL | |
| `is_unavailable` | BOOLEAN | DEFAULT TRUE | TRUE = day off |
| `start_time` | TIME | | Custom start (if not fully unavailable) |
| `end_time` | TIME | | Custom end |
| `reason` | TEXT | | |

---

### 3.7 Payments & Billing

#### `payment_methods`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users(id), NOT NULL | |
| `stripe_payment_method_id` | TEXT | NOT NULL | Stripe PM ID |
| `type` | TEXT | | card, bank_account, etc. |
| `last_four` | TEXT | | Last 4 digits |
| `brand` | TEXT | | visa, mastercard, etc. |
| `is_default` | BOOLEAN | DEFAULT FALSE | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `transactions`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), NOT NULL | |
| `payer_id` | UUID | FK → users(id), NOT NULL | Customer |
| `payee_id` | UUID | FK → users(id), NOT NULL | Tradesperson |
| `amount` | NUMERIC(10,2) | NOT NULL | Total charge |
| `platform_fee` | NUMERIC(10,2) | NOT NULL | Platform's cut |
| `net_amount` | NUMERIC(10,2) | NOT NULL | Tradesperson payout |
| `stripe_payment_intent_id` | TEXT | | Stripe PI ID |
| `stripe_transfer_id` | TEXT | | Stripe Transfer to Connect account |
| `status` | TEXT | DEFAULT 'pending', CHECK IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'disputed') | |
| `type` | TEXT | CHECK IN ('payment', 'refund', 'payout') | |
| `captured_at` | TIMESTAMPTZ | | When payment was captured |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `invoices`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), NOT NULL | |
| `customer_id` | UUID | FK → users(id), NOT NULL | |
| `tradesperson_id` | UUID | FK → users(id), NOT NULL | |
| `invoice_number` | TEXT | UNIQUE, NOT NULL | Sequential: INV-YYYYMM-XXXX |
| `subtotal` | NUMERIC(10,2) | NOT NULL | Labor + materials |
| `platform_fee` | NUMERIC(10,2) | NOT NULL | |
| `total` | NUMERIC(10,2) | NOT NULL | Customer pays this |
| `line_items` | JSONB | NOT NULL | [{description, quantity, unit_price, total}] |
| `pdf_url` | TEXT | | Cloud Storage URL for generated PDF |
| `status` | TEXT | DEFAULT 'draft', CHECK IN ('draft', 'sent', 'approved', 'paid', 'disputed', 'voided') | |
| `sent_at` | TIMESTAMPTZ | | |
| `paid_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

### 3.8 Compliance & Verification

#### `compliance_records`
**Never soft-deleted.** Active compliance data lives in Cloud SQL; archived to BigQuery in Phase 1D.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users(id), NOT NULL | |
| `type` | TEXT | NOT NULL, CHECK IN ('identity', 'license', 'insurance', 'background_check') | |
| `status` | TEXT | DEFAULT 'pending', CHECK IN ('pending', 'approved', 'rejected', 'expired') | |
| `document_url` | TEXT | | Cloud Storage signed URL |
| `document_name` | TEXT | | Original filename |
| `verified_by` | UUID | FK → users(id) | Admin who reviewed |
| `verified_at` | TIMESTAMPTZ | | |
| `expires_at` | TIMESTAMPTZ | | License/insurance expiration |
| `rejection_reason` | TEXT | | |
| `admin_notes` | TEXT | | Internal notes |
| `metadata` | JSONB | | License number, state, coverage limits, etc. |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

### 3.9 Support

#### `support_tickets`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users(id), NOT NULL | Ticket creator |
| `category` | TEXT | NOT NULL | Issue category |
| `subject` | TEXT | NOT NULL | |
| `description` | TEXT | | |
| `status` | TEXT | DEFAULT 'open', CHECK IN ('open', 'in_progress', 'resolved', 'closed') | |
| `priority` | TEXT | DEFAULT 'normal', CHECK IN ('low', 'normal', 'high', 'urgent') | |
| `assigned_admin_id` | UUID | FK → users(id) | |
| `resolved_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `support_messages`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `ticket_id` | UUID | FK → support_tickets(id), NOT NULL | |
| `sender_id` | UUID | FK → users(id), NOT NULL | |
| `body` | TEXT | NOT NULL | |
| `attachment_urls` | TEXT[] | | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

### 3.10 Audit & Analytics

#### `reviews`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `job_id` | UUID | FK → jobs(id), NOT NULL | |
| `reviewer_id` | UUID | FK → users(id), NOT NULL | Who left the review |
| `reviewee_id` | UUID | FK → users(id), NOT NULL | Who was reviewed |
| `rating` | INTEGER | CHECK (1-5), NOT NULL | |
| `comment` | TEXT | | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| | | UNIQUE (job_id, reviewer_id) | One review per party per job |

#### `notifications`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users(id), NOT NULL | |
| `type` | TEXT | NOT NULL | e.g., 'new_quote', 'job_accepted', 'payment_captured' |
| `title` | TEXT | NOT NULL | |
| `body` | TEXT | | |
| `data` | JSONB | | Payload (job_id, quote_id, etc.) |
| `is_read` | BOOLEAN | DEFAULT FALSE | |
| `read_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `audit_log`
**Append-only. No updates. No deletes. Ever.**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `actor_id` | UUID | FK → users(id) | Who performed the action (NULL for system) |
| `entity_type` | TEXT | NOT NULL | Table name: 'job', 'user', 'compliance_record', etc. |
| `entity_id` | UUID | NOT NULL | ID of the affected record |
| `action` | TEXT | NOT NULL | 'create', 'update', 'delete', 'approve', 'reject', 'suspend', etc. |
| `old_state` | JSONB | | Previous state snapshot |
| `new_state` | JSONB | | New state snapshot |
| `ip_address` | INET | | Request IP |
| `user_agent` | TEXT | | Browser/client info |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 4. Indexes

```sql
-- Users
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

-- User Roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Jobs
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_assigned_tradesperson ON jobs(assigned_tradesperson_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_expires_at ON jobs(expires_at) WHERE status = 'open';

-- Quotes
CREATE INDEX idx_quotes_job_id ON quotes(job_id);
CREATE INDEX idx_quotes_tradesperson_id ON quotes(tradesperson_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Appointments
CREATE INDEX idx_appointments_job_id ON appointments(job_id);
CREATE INDEX idx_appointments_tradesperson ON appointments(tradesperson_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_start);

-- Transactions
CREATE INDEX idx_transactions_job_id ON transactions(job_id);
CREATE INDEX idx_transactions_payer ON transactions(payer_id);
CREATE INDEX idx_transactions_payee ON transactions(payee_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id);

-- Compliance
CREATE INDEX idx_compliance_user_id ON compliance_records(user_id);
CREATE INDEX idx_compliance_status ON compliance_records(status);
CREATE INDEX idx_compliance_expires ON compliance_records(expires_at) WHERE status = 'approved';

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Audit
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Properties
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_zip ON properties(zip_code);

-- Support
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- Reviews
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_reviews_job ON reviews(job_id);
```

---

## 5. Data Retention Policy

| Record Type | Retention | Rationale |
|-------------|-----------|-----------|
| Identity verification | 7 years | Payment/KYC compliance |
| License records | 7 years | Contractor liability |
| Insurance documents | 5 years | Claims window |
| Audit logs | 7 years | SOC 2 / legal discovery |
| Payment records | 7 years | IRS / Stripe requirement |
| Job records | Indefinite | Business data |
| User accounts | Until deletion request + 30 day grace | CCPA/GDPR |
| Support tickets | 3 years | Customer service SLA |

---

## 6. BigQuery Analytics Mirror (Phase 1D)

When dashboards are built in Phase 1D, stream these tables to BigQuery via Cloud Datastream:

| Cloud SQL Table | BigQuery Dataset | Purpose |
|-----------------|-----------------|---------|
| `audit_log` | `tradeson_analytics.audit_log` | Immutable audit archive, 7-year queries |
| `jobs` | `tradeson_analytics.jobs` | Job volume, category, severity trends |
| `quotes` | `tradeson_analytics.quotes` | Quoting behavior, acceptance rates |
| `transactions` | `tradeson_analytics.transactions` | Revenue, GMV, platform fee analysis |
| `users` + `user_roles` | `tradeson_analytics.users_denormalized` | MAU, role distribution, activation funnels |
| `compliance_records` | `tradeson_analytics.compliance` | Verification throughput, rejection rates |
| `reviews` | `tradeson_analytics.reviews` | Service quality metrics |

**Admin Portal screens served (Phase 1D):**
- S-21: Core Metrics Dashboard (users, MAU, active jobs, revenue)
- S-22: Funnel Tracking (acquisition funnels)
- S-23: Behavioral Metrics (supply/demand heat maps)

---

## 7. Screen-to-Table Mapping

Maps every PRD screen to the database tables it reads from or writes to.

| Screen | Name | Primary Tables | Operations |
|--------|------|---------------|------------|
| S-01 | Login | `users` | Read (Firebase Auth handles actual login) |
| S-02 | Account Creation | `users`, `user_roles` | Write |
| S-03 | User Type Selection | `user_roles` | Write |
| S-04 | Property Manager Onboarding | `property_manager_profiles`, `properties` | Write |
| S-05 | Realtor Onboarding | `realtor_profiles`, `brokerages` | Write, Read |
| S-06 | Homeowner Onboarding | `homeowner_profiles`, `properties`, `payment_methods` | Write |
| S-07 | Licensed Trade Onboarding | `tradesperson_profiles`, `compliance_records`, `availability_templates` | Write |
| S-08 | Non-Licensed Trade Onboarding | `tradesperson_profiles`, `compliance_records`, `availability_templates` | Write |
| S-09 | Brokerage Setup | `brokerages` | Write |
| S-10 | Admin Permissions | `user_roles`, `brokerages` | Read, Write |
| S-11 | Plan Selection | `brokerages` | Write |
| S-12 | Billing Configuration | `brokerages`, `payment_methods` | Write |
| S-13 | Review & Confirm | `brokerages` | Read |
| S-14 | User Management | `realtor_profiles`, `brokerages`, `users` | Read, Write |
| S-15 | Brokerage Admin Dashboard | `brokerages`, `realtor_profiles`, `jobs` | Read |
| S-16 | Brokerage Billing | `brokerages`, `transactions`, `invoices` | Read |
| S-17 | Compliance Review | `compliance_records`, `users`, `tradesperson_profiles` | Read, Write |
| S-18 | Account Monitoring | `users`, `user_roles`, `compliance_records`, `reviews` | Read |
| S-19 | Admin Resolutions | `users`, `user_roles`, `audit_log` | Read, Write |
| S-20 | Audit Log | `audit_log` | Read |
| S-21 | Core Metrics Dashboard | BigQuery (Phase 1D) | Read |
| S-22 | Funnel Tracking | BigQuery (Phase 1D) | Read |
| S-23 | Behavioral Metrics | BigQuery (Phase 1D) | Read |
| S-24 | Tradesperson Dashboard | `jobs`, `quotes`, `transactions`, `tradesperson_profiles`, `availability_templates` | Read |
| S-25 | Realtor Dashboard | `jobs`, `quotes`, `transactions`, `realtor_profiles` | Read |
| S-26 | Job Input Form | `jobs`, `job_photos`, `properties` | Write |
| S-27 | AI Analysis View | `jobs` | Read, Write (AI updates) |
| S-28 | User Confirmation | `jobs` | Read, Write |
| S-29 | Job Board (Tradesperson) | `jobs`, `job_photos`, `properties` | Read |
| S-30 | Job Detail & Drilldown | `jobs`, `job_photos`, `quotes` | Read |
| S-31 | Quote Submission | `quotes` | Write |
| S-32 | Quote Review (Customer) | `quotes`, `tradesperson_profiles`, `reviews` | Read, Write |
| S-33 | Availability Manager | `availability_templates`, `availability_exceptions` | Read, Write |
| S-34 | Time Slot Selection | `appointments`, `time_slot_proposals`, `availability_templates` | Read, Write |
| S-35 | Pre-Job Checklist | `jobs`, `appointments` | Read |
| S-36 | Day-Of Route View | `appointments`, `properties`, `jobs` | Read |
| S-37 | Live Tracking (Customer) | `appointments`, `jobs` | Read (polling) |
| S-38 | Onsite Adjustment Panel | `scope_changes`, `job_photos` | Write |
| S-39 | Scope Change Approval | `scope_changes` | Read, Write |
| S-40 | Completion Submission | `jobs`, `job_photos`, `job_status_history` | Write |
| S-41 | Completion Documentation | `jobs`, `job_photos` | Read |
| S-42 | Invoice Line Items | `invoices`, `scope_changes` | Read, Write |
| S-43 | PDF Invoice Preview | `invoices` | Read |
| S-44 | Customer Invoice Approval | `invoices`, `transactions` | Read, Write |
| S-45 | Customer Payment Method | `payment_methods` | Read, Write |
| S-46 | Tradesperson Payout Setup | `tradesperson_profiles` (stripe_account_id) | Read, Write |
| S-47 | Job Cancellation | `jobs`, `job_status_history`, `transactions` | Write |
| S-48 | Support Contact Form | `support_tickets` | Write |
| S-49 | Support Ticket Tracker | `support_tickets`, `support_messages` | Read, Write |

---

## Summary

| Metric | Count |
|--------|-------|
| Total tables | 22 |
| Identity & auth | 2 (users, user_roles) |
| Role profiles | 4 (homeowner, tradesperson, realtor, property_manager) |
| Brokerage | 1 |
| Properties | 1 |
| Job lifecycle | 4 (jobs, job_photos, job_status_history, quotes) |
| Scope changes | 1 |
| Scheduling | 4 (appointments, time_slot_proposals, availability_templates, availability_exceptions) |
| Payments | 3 (payment_methods, transactions, invoices) |
| Compliance | 1 |
| Support | 2 (support_tickets, support_messages) |
| Reviews | 1 |
| Notifications | 1 |
| Audit | 1 |
| PRD screens mapped | 49/49 |
