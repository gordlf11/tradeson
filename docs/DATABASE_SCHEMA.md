# TradesOn Database Schema

> PostgreSQL schema aligned to all onboarding screens (S-03 through S-08) and the full PRD.
> All tables use snake_case, UUIDs as primary keys, soft deletes, and audit timestamps.

---

## Entity Relationship Overview

```
users ──┬── homeowner_profiles
        ├── property_manager_profiles ── managed_properties
        ├── realtor_profiles ──────────── realtor_clients
        ├── tradesperson_profiles ──────── trade_categories
        │                          └───── service_areas
        └── user_notification_preferences

users ── user_addresses (primary address)

tradesperson_profiles ── compliance_documents
                     └── payout_accounts

jobs ── quotes ── payments ── invoices
     └── job_photos

audit_log (immutable, all system actions)
```

---

## Core Tables

### `users`

Central identity table for all roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| email | TEXT | UNIQUE, NOT NULL | Login email (from auth) |
| phone_number | VARCHAR(20) | NOT NULL | Primary contact number |
| full_name | TEXT | NOT NULL | Legal full name |
| password_hash | TEXT | NOT NULL | Bcrypt / Argon2 hash |
| role | TEXT | NOT NULL, CHECK (role IN ('homeowner','property_manager','realtor','licensed_tradesperson','unlicensed_tradesperson')) | User role selected at signup |
| profile_photo_url | TEXT | NULLABLE | GCS URL; required for tradespeople |
| is_verified | BOOLEAN | DEFAULT FALSE | Email / identity verified |
| is_active | BOOLEAN | DEFAULT TRUE | Soft-active flag |
| marketing_opt_in | BOOLEAN | DEFAULT FALSE | Marketing communications consent |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last update |
| deleted_at | TIMESTAMPTZ | NULLABLE | Soft delete timestamp |

**Indexes:** `idx_users_email`, `idx_users_role`, `idx_users_deleted_at`

---

### `user_addresses`

Primary account address (shared across all roles).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary key |
| user_id | UUID | FK → users.id, NOT NULL | Owner |
| address_line_1 | TEXT | NOT NULL | Street address |
| city | TEXT | NOT NULL | City |
| state | VARCHAR(2) | NOT NULL | State abbreviation |
| zip_code | VARCHAR(10) | NOT NULL | Zip / Postcode |
| latitude | DECIMAL(9,6) | NULLABLE | GPS lat (populated via geocoding) |
| longitude | DECIMAL(9,6) | NULLABLE | GPS lng |
| service_radius_miles | INTEGER | NULLABLE | User's stated service / travel radius |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `idx_user_addresses_user_id`

---

### `user_notification_preferences`

Stored per user; maps to the Preferences step in all onboarding forms.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary key |
| user_id | UUID | FK → users.id, UNIQUE | One row per user |
| notify_sms | BOOLEAN | DEFAULT TRUE | SMS job/quote alerts |
| notify_email | BOOLEAN | DEFAULT TRUE | Email job/quote alerts |
| notify_push | BOOLEAN | DEFAULT FALSE | Push notification alerts |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

## Role Profile Tables

### `homeowner_profiles`

Extended fields collected during Homeowner onboarding (S-06).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, UNIQUE | One profile per user |
| property_address | TEXT | NULLABLE | Property address (may differ from account) |
| property_city | TEXT | NULLABLE | |
| property_state | VARCHAR(2) | NULLABLE | |
| property_zip | VARCHAR(10) | NULLABLE | |
| property_type | TEXT | NULLABLE, CHECK (property_type IN ('house','apartment','condo','townhouse')) | Type of property |
| service_interests | TEXT[] | DEFAULT '{}' | e.g. ['Plumbing','HVAC','Cleaning'] |
| payment_method_deferred | BOOLEAN | DEFAULT TRUE | True until Stripe card added |
| stripe_customer_id | TEXT | NULLABLE | Stripe customer ID |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

### `property_manager_profiles`

Extended fields for Property Manager onboarding (S-04).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, UNIQUE | |
| company_name | TEXT | NOT NULL | Management company name |
| job_title | TEXT | NOT NULL | e.g. Operations Manager |
| business_email | TEXT | NOT NULL | Business contact email |
| property_count_range | TEXT | NULLABLE | '1-5', '6-20', '21-50', '50+' |
| property_types | TEXT[] | DEFAULT '{}' | e.g. ['Residential','Commercial'] |
| preferred_service_types | TEXT[] | DEFAULT '{}' | Preferred trade categories |
| urgency_types | TEXT[] | DEFAULT '{}' | e.g. ['Emergency','Routine','Turnover'] |
| plan_type | TEXT | NULLABLE | 'per-job' or 'pro' |
| stripe_customer_id | TEXT | NULLABLE | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

### `managed_properties`

Portfolio locations for Property Managers; supports multi-property management.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| property_manager_profile_id | UUID | FK → property_manager_profiles.id | Owner |
| address_line_1 | TEXT | NOT NULL | |
| city | TEXT | NOT NULL | |
| state | VARCHAR(2) | NOT NULL | |
| zip_code | VARCHAR(10) | NOT NULL | |
| property_type | TEXT | NULLABLE | Residential, Commercial, etc. |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | NULLABLE | Soft delete |

**Indexes:** `idx_managed_properties_pm_id`

---

### `realtor_profiles`

Extended fields for Realtor onboarding (S-05).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, UNIQUE | |
| brokerage_name | TEXT | NOT NULL | Employing brokerage |
| license_number | TEXT | NOT NULL | Real estate license number |
| service_radius_miles | INTEGER | NULLABLE | Client coverage radius |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

### `realtor_clients`

Client email invitations sent via the Realtor client portal.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| realtor_profile_id | UUID | FK → realtor_profiles.id | Inviting realtor |
| client_email | TEXT | NOT NULL | Invited client email |
| invited_at | TIMESTAMPTZ | DEFAULT now() | |
| accepted_at | TIMESTAMPTZ | NULLABLE | When client completed signup |
| client_user_id | UUID | FK → users.id, NULLABLE | Populated on acceptance |

**Indexes:** `idx_realtor_clients_realtor_id`, `idx_realtor_clients_email`

---

### `tradesperson_profiles`

Shared base profile for Licensed (S-07) and Unlicensed (S-08) tradespeople.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, UNIQUE | |
| business_name | TEXT | NULLABLE | Operating business name |
| is_licensed | BOOLEAN | NOT NULL | True for licensed tradespeople |
| service_address | TEXT | NULLABLE | Base address for job matching |
| service_city | TEXT | NULLABLE | |
| service_state | VARCHAR(2) | NULLABLE | |
| service_zip | VARCHAR(10) | NULLABLE | |
| service_radius_miles | INTEGER | NULLABLE | Miles from base address |
| primary_trades | TEXT[] | DEFAULT '{}' | e.g. ['Plumbing','Electrical'] |
| subcategories | TEXT[] | DEFAULT '{}' | e.g. ['Drain Cleaning','Leak Repair'] |
| additional_services | TEXT | NULLABLE | Free-text description |
| business_entity_type | TEXT | NULLABLE | 'Sole Proprietor','LLC','S-Corp',etc. |
| id_verified | BOOLEAN | DEFAULT FALSE | Government ID uploaded & verified |
| id_document_url | TEXT | NULLABLE | GCS URL for ID document |
| has_insurance | BOOLEAN | NULLABLE | Self-declared insurance status |
| insurance_doc_url | TEXT | NULLABLE | GCS URL for insurance certificate |
| stripe_account_id | TEXT | NULLABLE | Stripe Connect account ID |
| payout_enabled | BOOLEAN | DEFAULT FALSE | Stripe payouts enabled |
| rating | DECIMAL(3,2) | NULLABLE | Aggregate star rating |
| jobs_completed | INTEGER | DEFAULT 0 | Total completed jobs |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `idx_tradesperson_user_id`, `idx_tradesperson_service_zip`, `idx_tradesperson_primary_trades`

---

### `service_areas`

Zip codes a tradesperson explicitly covers (beyond the radius).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| tradesperson_profile_id | UUID | FK → tradesperson_profiles.id | Owner |
| zip_code | VARCHAR(10) | NOT NULL | Served zip / postcode |

**Indexes:** `idx_service_areas_profile_id`, `idx_service_areas_zip`

---

### `compliance_documents`

License documents for licensed tradespeople.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| tradesperson_profile_id | UUID | FK → tradesperson_profiles.id | |
| license_type | TEXT | NOT NULL | e.g. 'Electrician','Plumber' |
| license_number | TEXT | NOT NULL | License number |
| expiration_date | DATE | NOT NULL | License expiry |
| document_url | TEXT | NOT NULL | GCS URL for license document |
| verification_status | TEXT | DEFAULT 'pending', CHECK (verification_status IN ('pending','approved','rejected')) | Admin review state |
| verified_at | TIMESTAMPTZ | NULLABLE | When admin approved |
| verified_by | UUID | FK → users.id, NULLABLE | Admin user who reviewed |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

### `payout_accounts`

Stripe Connect payout configuration.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, UNIQUE | |
| stripe_account_id | TEXT | NOT NULL | Stripe Connect account ID |
| business_entity_type | TEXT | NOT NULL | Entity type for 1099 |
| payouts_enabled | BOOLEAN | DEFAULT FALSE | Stripe payouts enabled flag |
| bank_last4 | VARCHAR(4) | NULLABLE | Last 4 of connected bank |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

## Job Lifecycle Tables

### `jobs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| homeowner_user_id | UUID | FK → users.id | Job requester |
| assigned_tradesperson_id | UUID | FK → users.id, NULLABLE | Winning tradesperson |
| title | TEXT | NOT NULL | Short job title |
| description | TEXT | NOT NULL | Full problem description |
| category | TEXT | NOT NULL | e.g. 'Plumbing' |
| severity | TEXT | CHECK (severity IN ('low','medium','high','emergency')) | |
| status | TEXT | DEFAULT 'open', CHECK (status IN ('open','quoted','scheduled','in_progress','completed','cancelled')) | |
| address | TEXT | NOT NULL | Service location address |
| city | TEXT | NOT NULL | |
| state | VARCHAR(2) | NOT NULL | |
| zip_code | VARCHAR(10) | NOT NULL | |
| ai_estimated_cost_min | DECIMAL(10,2) | NULLABLE | AI cost estimate lower bound |
| ai_estimated_cost_max | DECIMAL(10,2) | NULLABLE | AI cost estimate upper bound |
| ai_analysis | JSONB | NULLABLE | Full AI analysis payload |
| scheduled_at | TIMESTAMPTZ | NULLABLE | Agreed appointment time |
| completed_at | TIMESTAMPTZ | NULLABLE | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | NULLABLE | |

---

### `quotes`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id | |
| tradesperson_user_id | UUID | FK → users.id | Quoting tradesperson |
| price | DECIMAL(10,2) | NOT NULL | Quoted price |
| message | TEXT | NULLABLE | Tradesperson pitch |
| eta_days | INTEGER | NULLABLE | Estimated start in days |
| status | TEXT | DEFAULT 'pending', CHECK (status IN ('pending','accepted','rejected','withdrawn')) | |
| accepted_at | TIMESTAMPTZ | NULLABLE | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

### `payments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id | |
| quote_id | UUID | FK → quotes.id | |
| payer_user_id | UUID | FK → users.id | Who paid |
| payee_user_id | UUID | FK → users.id | Who received |
| amount | DECIMAL(10,2) | NOT NULL | Gross amount |
| platform_fee | DECIMAL(10,2) | NOT NULL | TradesOn commission |
| net_payout | DECIMAL(10,2) | NOT NULL | Amount to tradesperson |
| stripe_payment_intent_id | TEXT | NULLABLE | |
| stripe_transfer_id | TEXT | NULLABLE | |
| status | TEXT | DEFAULT 'pending', CHECK (status IN ('pending','processing','completed','failed','refunded')) | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

### `invoices`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id | |
| payment_id | UUID | FK → payments.id | |
| line_items | JSONB | NOT NULL | Array of {description, qty, unit_price} |
| subtotal | DECIMAL(10,2) | NOT NULL | |
| tax | DECIMAL(10,2) | DEFAULT 0 | |
| total | DECIMAL(10,2) | NOT NULL | |
| pdf_url | TEXT | NULLABLE | GCS URL for generated PDF |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## Supporting Tables

### `job_photos`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id | |
| uploaded_by | UUID | FK → users.id | |
| photo_url | TEXT | NOT NULL | GCS URL |
| photo_type | TEXT | CHECK (photo_type IN ('intake','before','after','completion')) | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

### `audit_log`

Immutable record of all significant system actions. No updates or deletes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| actor_user_id | UUID | FK → users.id, NULLABLE | Who triggered (null = system) |
| action | TEXT | NOT NULL | e.g. 'job.created', 'quote.accepted' |
| resource_type | TEXT | NOT NULL | e.g. 'jobs', 'quotes', 'payments' |
| resource_id | UUID | NOT NULL | ID of affected row |
| metadata | JSONB | NULLABLE | Additional context |
| ip_address | INET | NULLABLE | |
| created_at | TIMESTAMPTZ | DEFAULT now() | Immutable — never update |

---

## Screen-to-Table Mapping

| Screen | Tables Written |
|---|---|
| S-01 Login | `users` (read) |
| S-02 Signup | `users` |
| S-03 Role Selection | `users.role` |
| S-04 Property Manager | `property_manager_profiles`, `managed_properties`, `user_addresses`, `user_notification_preferences` |
| S-05 Realtor | `realtor_profiles`, `user_addresses`, `user_notification_preferences` |
| S-06 Homeowner | `homeowner_profiles`, `user_addresses`, `user_notification_preferences` |
| S-07 Licensed Tradesperson | `tradesperson_profiles`, `service_areas`, `compliance_documents`, `payout_accounts`, `user_addresses`, `user_notification_preferences` |
| S-08 Unlicensed Tradesperson | `tradesperson_profiles`, `service_areas`, `payout_accounts`, `user_addresses`, `user_notification_preferences` |
| S-26–28 Job Creation | `jobs`, `job_photos` |
| S-29–32 Job Board / Quotes | `jobs`, `quotes` |
| S-33–36 Scheduling | `jobs.scheduled_at` |
| S-37–41 Execution | `jobs.status`, `job_photos` |
| S-42–44 Invoicing | `invoices`, `payments` |
| S-45–47 Payments | `payments`, `homeowner_profiles.stripe_customer_id`, `payout_accounts` |
| S-48–49 Support | `audit_log` |

---

## Index Strategy

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Address / geo lookups
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);

-- Job matching
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_zip ON jobs(zip_code);
CREATE INDEX idx_jobs_category ON jobs(category);

-- Tradesperson geo matching
CREATE INDEX idx_tradesperson_service_zip ON tradesperson_profiles(service_zip);
CREATE INDEX idx_service_areas_zip ON service_areas(zip_code);

-- Quote lookups
CREATE INDEX idx_quotes_job_id ON quotes(job_id);
CREATE INDEX idx_quotes_tradesperson ON quotes(tradesperson_user_id);

-- Audit
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
```

---

## Data Retention Policy

| Table | Retention | Notes |
|---|---|---|
| users | Indefinite | Soft delete only; anonymize PII after 7 years |
| audit_log | 7 years | Immutable — no deletes |
| jobs | 5 years post-completion | |
| payments / invoices | 7 years | Tax / legal requirement |
| compliance_documents | 7 years | Regulatory compliance |
| job_photos | 2 years | Compress after 6 months |
| realtor_clients | Until user deletion | |

---

*Schema version: 1.1.0 — Aligned to onboarding screens S-03 through S-08 (March 2026)*
